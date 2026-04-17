/**
 * EU + UK postal code validation patterns.
 * Each entry maps a country name to a regex that validates the postal code format.
 */
const POSTAL_PATTERNS = {
	Austria:        { re: /^\d{4}$/, hint: '4 digits (e.g. 1010)' },
	Belgium:        { re: /^\d{4}$/, hint: '4 digits (e.g. 1000)' },
	Bulgaria:       { re: /^\d{4}$/, hint: '4 digits (e.g. 1000)' },
	Croatia:        { re: /^\d{5}$/, hint: '5 digits (e.g. 10000)' },
	Cyprus:         { re: /^\d{4}$/, hint: '4 digits (e.g. 1010)' },
	'Czech Republic': { re: /^\d{3}\s?\d{2}$/, hint: '5 digits (e.g. 110 00)' },
	Denmark:        { re: /^\d{4}$/, hint: '4 digits (e.g. 1050)' },
	Estonia:        { re: /^\d{5}$/, hint: '5 digits (e.g. 10111)' },
	Finland:        { re: /^\d{5}$/, hint: '5 digits (e.g. 00100)' },
	France:         { re: /^\d{5}$/, hint: '5 digits (e.g. 75001)' },
	Germany:        { re: /^\d{5}$/, hint: '5 digits (e.g. 10115)' },
	Greece:         { re: /^\d{3}\s?\d{2}$/, hint: '5 digits (e.g. 105 63)' },
	Hungary:        { re: /^\d{4}$/, hint: '4 digits (e.g. 1051)' },
	Ireland:        { re: /^[A-Z]\d{2}\s?[A-Z0-9]{4}$/i, hint: 'Eircode (e.g. D01 F5P2)' },
	Italy:          { re: /^\d{5}$/, hint: '5 digits (e.g. 00100)' },
	Latvia:         { re: /^LV-?\d{4}$/i, hint: 'LV-NNNN (e.g. LV-1050)' },
	Lithuania:      { re: /^LT-?\d{5}$/i, hint: 'LT-NNNNN (e.g. LT-01001)' },
	Luxembourg:     { re: /^L-?\d{4}$/i, hint: 'L-NNNN (e.g. L-1111)' },
	Malta:          { re: /^[A-Z]{3}\s?\d{4}$/i, hint: 'AAA NNNN (e.g. VLT 1117)' },
	Netherlands:    { re: /^\d{4}\s?[A-Z]{2}$/i, hint: '4 digits + 2 letters (e.g. 1234 AB)' },
	Poland:         { re: /^\d{2}-?\d{3}$/, hint: 'NN-NNN (e.g. 00-950)' },
	Portugal:       { re: /^\d{4}-?\d{3}$/, hint: 'NNNN-NNN (e.g. 1000-001)' },
	Romania:        { re: /^\d{6}$/, hint: '6 digits (e.g. 010011)' },
	Slovakia:       { re: /^\d{3}\s?\d{2}$/, hint: 'NNN NN (e.g. 811 01)' },
	Slovenia:       { re: /^\d{4}$/, hint: '4 digits (e.g. 1000)' },
	Spain:          { re: /^\d{5}$/, hint: '5 digits (e.g. 28001)' },
	Sweden:         { re: /^\d{3}\s?\d{2}$/, hint: 'NNN NN (e.g. 111 22)' },
	'United Kingdom': { re: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, hint: 'Postcode (e.g. SW1A 1AA)' },
};

/**
 * Validate a postal code for a given country.
 * @param {string} country - Country name from EU_UK_COUNTRIES
 * @param {string} postalCode - The postal code string to validate
 * @returns {{ valid: boolean, hint: string }}
 */
export function validatePostalCode(country, postalCode) {
	const entry = POSTAL_PATTERNS[country];
	if (!entry) return { valid: true, hint: '' }; // unknown country — pass through
	const clean = (postalCode || '').trim();
	const valid = entry.re.test(clean);
	return { valid, hint: entry.hint };
}

/**
 * Get the format hint for a given country without validating.
 * @param {string} country
 * @returns {string}
 */
export function postalHint(country) {
	return POSTAL_PATTERNS[country]?.hint ?? '';
}
