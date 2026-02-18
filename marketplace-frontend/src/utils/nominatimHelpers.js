const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

// Map our form field keys to Nominatim response address keys
const FIELD_RESPONSE_KEYS = {
	StreetName: ['road', 'pedestrian', 'street', 'path'],
	HouseNumber: ['house_number'],
	PostalCode: ['postcode'],
	City: ['city', 'town', 'village', 'municipality', 'county'],
	StateOrProvince: ['state', 'region'],
	Country: ['country'],
};

/**
 * Build a Nominatim search URL from the current form data.
 * Uses structured search when 2+ params are available, otherwise free-form.
 */
export function buildNominatimUrl(formData) {
	const params = new URLSearchParams({
		format: 'json',
		addressdetails: '1',
		limit: '6',
	});

	// Build structured fields
	const streetParts = [formData.HouseNumber, formData.StreetName].filter(Boolean).join(' ').trim();
	const structured = {
		street: streetParts || undefined,
		city: formData.City || undefined,
		postalcode: formData.PostalCode || undefined,
		country: formData.Country || undefined,
	};

	const filledStructured = Object.entries(structured).filter(([, v]) => v && v.length >= 1);

	if (filledStructured.length >= 2) {
		// Structured search — more precise when we have multiple fields
		for (const [key, val] of filledStructured) {
			params.set(key, val);
		}
	} else {
		// Free-form search — concatenate all available data
		const parts = [streetParts, formData.PostalCode, formData.City, formData.Country].filter(Boolean);
		if (parts.length === 0) return null;
		const query = parts.join(' ').trim();
		if (query.length < 2) return null;
		params.set('q', query);
	}

	return `${NOMINATIM_BASE}?${params.toString()}`;
}

/**
 * Parse a Nominatim place result into our form field format.
 */
export function parseAddress(place) {
	const addr = place.address || {};

	const road = addr.road || addr.pedestrian || addr.street || addr.path || '';
	const houseNumber = addr.house_number || '';
	const postcode = addr.postcode || '';
	const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
	const state = addr.state || addr.region || '';
	const country = addr.country || '';

	return { road, houseNumber, postcode, city, state, country };
}

/**
 * Extract the relevant value for a specific field from a Nominatim result.
 */
export function extractFieldValue(place, fieldKey) {
	const addr = place.address || {};
	const keys = FIELD_RESPONSE_KEYS[fieldKey];
	if (!keys) return '';

	for (const key of keys) {
		if (addr[key]) return addr[key];
	}
	return '';
}

/**
 * Deduplicate suggestions for a specific field.
 * Returns array of { value, place, primary, secondary }.
 */
export function deduplicateSuggestions(results, fieldKey) {
	if (!results || results.length === 0) return [];

	const seen = new Set();
	const deduplicated = [];

	for (const place of results) {
		const value = extractFieldValue(place, fieldKey);
		if (!value) continue;

		const normalized = value.toLowerCase().trim();
		if (seen.has(normalized)) continue;
		seen.add(normalized);

		const { primary, secondary } = formatSuggestionDisplay(place, fieldKey);
		deduplicated.push({ value, place, primary, secondary });
	}

	return deduplicated;
}

/**
 * Format suggestion display text based on the field type.
 * Returns { primary, secondary } for display in the dropdown.
 */
export function formatSuggestionDisplay(place, fieldKey) {
	const parsed = parseAddress(place);

	switch (fieldKey) {
		case 'StreetName': {
			const primary = parsed.road || place.display_name?.split(',')[0] || '';
			return { primary, secondary: '' };
		}
		case 'PostalCode': {
			const primary = parsed.postcode;
			const parts = [parsed.city, parsed.country].filter(Boolean);
			return { primary, secondary: parts.join(', ') };
		}
		case 'City': {
			const primary = parsed.city;
			const parts = [parsed.state, parsed.country].filter(Boolean);
			return { primary, secondary: parts.join(', ') };
		}
		case 'Country': {
			const primary = parsed.country;
			const parts = [parsed.postcode, parsed.city].filter(Boolean);
			return { primary, secondary: parts.join(' ') };
		}
		default: {
			return { primary: place.display_name || '', secondary: '' };
		}
	}
}
