import { createContext, useCallback, useContext, useState } from 'react';
import api from '../api/axios';
import i18n from '../i18n/index.js';

export const LANGUAGES = [
	{ code: 'en', country: 'GB', label: 'English',    flag: '🇬🇧' },
	{ code: 'de', country: 'DE', label: 'Deutsch',    flag: '🇩🇪' },
	{ code: 'fr', country: 'FR', label: 'Français',   flag: '🇫🇷' },
	{ code: 'es', country: 'ES', label: 'Español',    flag: '🇪🇸' },
	{ code: 'it', country: 'IT', label: 'Italiano',   flag: '🇮🇹' },
	{ code: 'nl', country: 'NL', label: 'Nederlands', flag: '🇳🇱' },
	{ code: 'pl', country: 'PL', label: 'Polski',     flag: '🇵🇱' },
	{ code: 'pt', country: 'PT', label: 'Português',  flag: '🇵🇹' },
	{ code: 'ro', country: 'RO', label: 'Română',     flag: '🇷🇴' },
	{ code: 'sv', country: 'SE', label: 'Svenska',    flag: '🇸🇪' },
	{ code: 'da', country: 'DK', label: 'Dansk',      flag: '🇩🇰' },
	{ code: 'fi', country: 'FI', label: 'Suomi',      flag: '🇫🇮' },
	{ code: 'el', country: 'GR', label: 'Ελληνικά',   flag: '🇬🇷' },
	{ code: 'cs', country: 'CZ', label: 'Čeština',    flag: '🇨🇿' },
	{ code: 'hu', country: 'HU', label: 'Magyar',     flag: '🇭🇺' },
];

// In-memory cache: `${lang}|${originalText}` → translatedText
// Survives React re-renders, cleared on page refresh (intentional)
const cache = new Map();

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
	const [language, setLanguage] = useState(
		localStorage.getItem('gibli_lang') || 'en'
	);

	const changeLanguage = useCallback((code) => {
		setLanguage(code);
		localStorage.setItem('gibli_lang', code);
		i18n.changeLanguage(code); // keep i18next in sync for static UI strings
	}, []);

	/**
	 * Translate an array of strings to `lang`.
	 * Uses cache first; only calls the API for strings not yet cached.
	 * Falls back to originals silently on error.
	 *
	 * @param {string[]} texts
	 * @param {string}   lang  — BCP-47 language code, e.g. 'de'
	 * @returns {Promise<string[]>}
	 */
	const translateTexts = useCallback(async (texts, lang) => {
		if (!lang || lang === 'en') return texts;

		const result = new Array(texts.length);
		const toFetch = [];
		const fetchIdx = [];

		for (let i = 0; i < texts.length; i++) {
			const key = `${lang}|${texts[i]}`;
			if (cache.has(key)) {
				result[i] = cache.get(key);
			} else {
				toFetch.push(texts[i]);
				fetchIdx.push(i);
			}
		}

		if (toFetch.length > 0) {
			try {
				const res = await api.post('/translate', { texts: toFetch, targetLang: lang });
				const translated = res.data.translations;
				for (let j = 0; j < fetchIdx.length; j++) {
					result[fetchIdx[j]] = translated[j];
					cache.set(`${lang}|${toFetch[j]}`, translated[j]);
				}
			} catch {
				// Fall back to originals for any uncached text
				for (const i of fetchIdx) result[i] = texts[i];
			}
		}

		return result;
	}, []);

	return (
		<LanguageContext.Provider value={{ language, changeLanguage, translateTexts }}>
			{children}
		</LanguageContext.Provider>
	);
};

export const useLanguage = () => {
	const ctx = useContext(LanguageContext);
	if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
	return ctx;
};
