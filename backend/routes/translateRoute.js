import express from 'express';
import { createHash } from 'crypto';
import DbHelper from '../db/dbHelper.js';

const translateRouter = express.Router();
const db = new DbHelper();

const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/**
 * POST /translate
 * Body: { texts: string[], targetLang: string }
 * Returns: { translations: string[] }
 *
 * Flow:
 *  1. Hash each source text (SHA-256)
 *  2. Bulk-lookup hashes in TranslationCache (DB)
 *  3. Call Google only for cache misses
 *  4. Persist new translations to DB (fire-and-forget)
 */
translateRouter.post('/', async (req, res) => {
	const { texts, targetLang } = req.body;

	if (!Array.isArray(texts) || texts.length === 0)
		return res.status(400).json({ error: 'texts must be a non-empty array.' });
	if (!targetLang || typeof targetLang !== 'string')
		return res.status(400).json({ error: 'targetLang is required.' });
	if (targetLang === 'en')
		return res.status(200).json({ translations: texts });

	const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
	if (!apiKey) {
		console.error('[TRANSLATE] GOOGLE_TRANSLATE_API_KEY is not set.');
		return res.status(503).json({ error: 'Translation service is not configured.' });
	}

	const hashes = texts.map(sha256);
	const result = new Array(texts.length);

	// --- 1. DB cache lookup ---
	const cachedMap = new Map(); // hash -> translatedText
	try {
		const hashesJson = JSON.stringify(hashes.map((h) => ({ hash: h })));
		const dbResult = await db.executeProcedure('GetCachedTranslations', {
			HashesJson: hashesJson,
			TargetLang: targetLang,
		});
		for (const row of dbResult.recordset) {
			cachedMap.set(row.SourceHash, row.TranslatedText);
		}
	} catch (err) {
		// DB failure is non-fatal — fall through to API for everything
		console.error('[TRANSLATE] DB cache lookup failed:', err.message);
	}

	// --- 2. Separate hits from misses ---
	const toTranslate = [];
	const toTranslateIdx = [];

	for (let i = 0; i < texts.length; i++) {
		if (cachedMap.has(hashes[i])) {
			result[i] = cachedMap.get(hashes[i]);
		} else {
			toTranslate.push(texts[i]);
			toTranslateIdx.push(i);
		}
	}

	if (toTranslate.length === 0)
		return res.status(200).json({ translations: result });

	// --- 3. Call Google API only for misses ---
	try {
		const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ q: toTranslate, target: targetLang, format: 'text' }),
			signal: AbortSignal.timeout(8000),
		});

		if (!response.ok) {
			const errData = await response.json().catch(() => ({}));
			const detail = errData?.error?.message || `HTTP ${response.status}`;
			console.error('[TRANSLATE] Google API error:', detail);
			return res.status(500).json({ error: 'Translation failed.', detail });
		}

		const data = await response.json();
		const newTranslations = data.data.translations.map((t) => t.translatedText);

		// --- 4. Fill result + build save payload ---
		const toSave = [];
		for (let j = 0; j < toTranslateIdx.length; j++) {
			const i = toTranslateIdx[j];
			result[i] = newTranslations[j];
			toSave.push({ hash: hashes[i], sourceText: texts[i], translatedText: newTranslations[j] });
		}

		// --- 5. Persist to DB (fire-and-forget, never blocks response) ---
		db.executeProcedure('SaveTranslations', {
			TranslationsJson: JSON.stringify(toSave),
			TargetLang: targetLang,
		}).catch((err) => console.error('[TRANSLATE] DB cache save failed:', err.message));

		return res.status(200).json({ translations: result });
	} catch (err) {
		console.error('[TRANSLATE] Request error:', err.message);
		return res.status(500).json({ error: 'Translation failed.', detail: err.message });
	}
});

export default translateRouter;
