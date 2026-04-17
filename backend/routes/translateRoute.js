import express from 'express';

const translateRouter = express.Router();

const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

/**
 * POST /translate
 * Body: { texts: string[], targetLang: string }
 * Returns: { translations: string[] }
 *
 * Proxies Google Cloud Translation API so the key stays server-side.
 * No auth required — translation is a public read operation.
 */
translateRouter.post('/', async (req, res) => {
	const { texts, targetLang } = req.body;

	if (!Array.isArray(texts) || texts.length === 0) {
		return res.status(400).json({ error: 'texts must be a non-empty array.' });
	}
	if (!targetLang || typeof targetLang !== 'string') {
		return res.status(400).json({ error: 'targetLang is required.' });
	}

	// Return originals immediately when target is English
	if (targetLang === 'en') {
		return res.status(200).json({ translations: texts });
	}

	const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
	if (!apiKey) {
		console.error('[TRANSLATE] GOOGLE_TRANSLATE_API_KEY is not set.');
		return res.status(503).json({ error: 'Translation service is not configured.' });
	}

	try {
		const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ q: texts, target: targetLang, format: 'text' }),
			signal: AbortSignal.timeout(8000),
		});

		if (!response.ok) {
			const errData = await response.json().catch(() => ({}));
			const detail = errData?.error?.message || `HTTP ${response.status}`;
			console.error('[TRANSLATE] Google API error:', detail);
			return res.status(500).json({ error: 'Translation failed.', detail });
		}

		const data = await response.json();
		const translations = data.data.translations.map((t) => t.translatedText);
		return res.status(200).json({ translations });
	} catch (err) {
		console.error('[TRANSLATE] Request error:', err.message);
		return res.status(500).json({ error: 'Translation failed.', detail: err.message });
	}
});

export default translateRouter;
