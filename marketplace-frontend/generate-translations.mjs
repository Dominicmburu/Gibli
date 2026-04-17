/**
 * generate-translations.mjs
 *
 * One-time script: reads en/translation.json, calls the backend /translate
 * endpoint for each of the 14 non-English languages, and writes the resulting
 * JSON files to public/locales/{lang}/translation.json.
 *
 * Usage (while the backend is running):
 *   node generate-translations.mjs
 *
 * Optional — point at a different backend:
 *   BACKEND_URL=http://localhost:5000 node generate-translations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TRANSLATE_ENDPOINT = `${BACKEND_URL}/translate`;

const LANGUAGES = ['de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'ro', 'sv', 'da', 'fi', 'el', 'cs', 'hu'];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Flatten { a: { b: 'hello' } } → { 'a.b': 'hello' } */
function flatten(obj, prefix = '') {
	const out = {};
	for (const [k, v] of Object.entries(obj)) {
		const key = prefix ? `${prefix}.${k}` : k;
		if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
			Object.assign(out, flatten(v, key));
		} else if (typeof v === 'string') {
			out[key] = v;
		}
	}
	return out;
}

/** Reverse of flatten */
function unflatten(flat) {
	const out = {};
	for (const [dotKey, value] of Object.entries(flat)) {
		const parts = dotKey.split('.');
		let node = out;
		for (let i = 0; i < parts.length - 1; i++) {
			if (!node[parts[i]]) node[parts[i]] = {};
			node = node[parts[i]];
		}
		node[parts[parts.length - 1]] = value;
	}
	return out;
}

/**
 * Replace {{variable}} placeholders with safe tokens before translation
 * so Google doesn't alter them, then restore after.
 */
function escapePlaceholders(str) {
	const placeholders = [];
	const escaped = str.replace(/\{\{[^}]+\}\}/g, (match) => {
		placeholders.push(match);
		return `__GIBLI${placeholders.length - 1}__`;
	});
	return { escaped, placeholders };
}

function restorePlaceholders(str, placeholders) {
	return str.replace(/__GIBLI(\d+)__/g, (_, i) => placeholders[Number(i)] ?? '');
}

/** Call backend /translate with retry on rate-limit */
async function translateBatch(texts, lang, attempt = 1) {
	const res = await fetch(TRANSLATE_ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ texts, targetLang: lang }),
	});

	if (res.status === 429 && attempt <= 3) {
		const wait = attempt * 2000;
		console.log(`  Rate limited — retrying in ${wait / 1000}s…`);
		await new Promise((r) => setTimeout(r, wait));
		return translateBatch(texts, lang, attempt + 1);
	}

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`HTTP ${res.status}: ${body}`);
	}

	const data = await res.json();
	return data.translations;
}

// ── Main ───────────────────────────────────────────────────────────────────────

const enPath = path.join(__dirname, 'public', 'locales', 'en', 'translation.json');
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const flatEn = flatten(enJson);

const keys = Object.keys(flatEn);
const rawStrings = Object.values(flatEn);

// Escape placeholders in every string
const escapedData = rawStrings.map(escapePlaceholders);
const escapedStrings = escapedData.map((d) => d.escaped);

console.log(`\nTranslating ${keys.length} keys into ${LANGUAGES.length} languages…\n`);

for (const lang of LANGUAGES) {
	process.stdout.write(`[${lang}] translating… `);

	try {
		// Split into chunks of 100 to stay within API limits
		const CHUNK = 100;
		const translated = [];
		for (let i = 0; i < escapedStrings.length; i += CHUNK) {
			const chunk = escapedStrings.slice(i, i + CHUNK);
			const result = await translateBatch(chunk, lang);
			translated.push(...result);
		}

		// Restore placeholders
		const restoredStrings = translated.map((str, i) =>
			restorePlaceholders(str, escapedData[i].placeholders)
		);

		// Rebuild as flat object then unflatten
		const flatTranslated = {};
		keys.forEach((key, i) => {
			flatTranslated[key] = restoredStrings[i];
		});
		const output = unflatten(flatTranslated);

		// Write file
		const dir = path.join(__dirname, 'public', 'locales', lang);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(
			path.join(dir, 'translation.json'),
			JSON.stringify(output, null, 2),
			'utf8'
		);

		console.log('done ✓');
	} catch (err) {
		console.log(`FAILED — ${err.message}`);
	}
}

console.log('\nAll done. Locale files written to public/locales/\n');
