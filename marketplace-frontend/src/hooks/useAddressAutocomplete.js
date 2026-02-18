import { useState, useRef, useCallback } from 'react';
import { buildNominatimUrl, parseAddress, extractFieldValue, deduplicateSuggestions } from '../utils/nominatimHelpers';

/**
 * Custom hook for smart address autocomplete using OpenStreetMap Nominatim.
 * Manages shared Nominatim queries across multiple address fields,
 * with debouncing, rate-limiting, and auto-fill logic.
 */
export function useAddressAutocomplete(formData, setFormData, setErrors) {
	const [results, setResults] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [activeField, setActiveField] = useState(null);

	const debounceRef = useRef(null);
	const lastRequestTimeRef = useRef(0);
	const abortControllerRef = useRef(null);

	/**
	 * Execute a Nominatim search with rate-limiting and abort control.
	 */
	const executeSearch = useCallback(async (searchFormData) => {
		const url = buildNominatimUrl(searchFormData);
		if (!url) {
			setResults([]);
			return;
		}

		// Abort any in-flight request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		abortControllerRef.current = new AbortController();

		// Rate-limit: ensure at least 1000ms between requests
		const now = Date.now();
		const elapsed = now - lastRequestTimeRef.current;
		if (elapsed < 1000) {
			await new Promise((r) => setTimeout(r, 1000 - elapsed));
		}

		setIsLoading(true);
		try {
			const response = await fetch(url, {
				headers: { 'Accept-Language': 'en' },
				signal: abortControllerRef.current.signal,
			});

			if (!response.ok) throw new Error('Search failed');

			lastRequestTimeRef.current = Date.now();
			const data = await response.json();
			setResults(data || []);
		} catch (err) {
			if (err.name !== 'AbortError') {
				console.error('Nominatim search error:', err);
				setResults([]);
			}
		} finally {
			setIsLoading(false);
		}
	}, []);

	/**
	 * Handle a field value change. Updates formData and triggers debounced search.
	 */
	const handleFieldChange = useCallback(
		(fieldKey, value) => {
			// Update formData
			setFormData((prev) => ({ ...prev, [fieldKey]: value }));

			// Clear error for this field
			if (setErrors) {
				setErrors((prev) => ({ ...prev, [fieldKey]: '' }));
			}

			// Clear previous debounce
			if (debounceRef.current) clearTimeout(debounceRef.current);

			// Build the updated form data for the search
			const updatedFormData = { ...formData, [fieldKey]: value };

			// Check if there's enough data to search (at least 2 chars somewhere)
			const hasEnoughData = Object.values(updatedFormData).some((v) => v && v.length >= 2);
			if (!hasEnoughData) {
				setResults([]);
				return;
			}

			// Debounce the search
			debounceRef.current = setTimeout(() => {
				executeSearch(updatedFormData);
			}, 300);
		},
		[formData, setFormData, setErrors, executeSearch]
	);

	/**
	 * Handle field focus. If the field is empty but other fields have data,
	 * immediately trigger a search to show contextual suggestions.
	 */
	const handleFieldFocus = useCallback(
		(fieldKey) => {
			setActiveField(fieldKey);

			const currentValue = formData[fieldKey];
			const otherFieldsHaveData = Object.entries(formData).some(
				([key, val]) => key !== fieldKey && key !== 'FullName' && key !== 'PhoneNumber' && key !== 'IsDefault' && val && val.length >= 2
			);

			// If focused field is empty/short but other fields have data, search immediately
			if ((!currentValue || currentValue.length < 2) && otherFieldsHaveData) {
				if (debounceRef.current) clearTimeout(debounceRef.current);
				executeSearch(formData);
			}
		},
		[formData, executeSearch]
	);

	/**
	 * Handle blur — clear active field.
	 * Note: Don't clear results here so suggestion clicks still work.
	 */
	const handleFieldBlur = useCallback(() => {
		// Use a small delay so click events on suggestions fire first
		setTimeout(() => {
			setActiveField((prev) => {
				// Only clear if no other field has since taken focus
				return prev;
			});
		}, 200);
	}, []);

	/**
	 * Handle suggestion selection. Updates the active field and auto-fills empty fields.
	 */
	const handleSuggestionSelect = useCallback(
		(fieldKey, place) => {
			const parsed = parseAddress(place);

			setFormData((prev) => {
				const updated = { ...prev };

				// Always update the active field with the selected value
				updated[fieldKey] = extractFieldValue(place, fieldKey);

				// Auto-fill empty fields from the result
				if (!prev.StreetName) updated.StreetName = parsed.road;
				if (!prev.HouseNumber) updated.HouseNumber = parsed.houseNumber;
				if (!prev.PostalCode) updated.PostalCode = parsed.postcode;
				if (!prev.City) updated.City = parsed.city;
				if (!prev.StateOrProvince) updated.StateOrProvince = parsed.state;
				if (!prev.Country) updated.Country = parsed.country;

				return updated;
			});

			// Clear all errors for auto-filled fields
			if (setErrors) {
				setErrors({});
			}

			// Clear results after selection
			setResults([]);
			setActiveField(null);
		},
		[setFormData, setErrors]
	);

	/**
	 * Get deduplicated suggestions for a specific field from the shared results.
	 */
	const getSuggestionsForField = useCallback(
		(fieldKey) => {
			if (activeField !== fieldKey) return [];
			return deduplicateSuggestions(results, fieldKey);
		},
		[results, activeField]
	);

	/**
	 * Clear all results and active field (e.g., when modal closes).
	 */
	const reset = useCallback(() => {
		setResults([]);
		setActiveField(null);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (abortControllerRef.current) abortControllerRef.current.abort();
	}, []);

	return {
		handleFieldChange,
		handleFieldFocus,
		handleFieldBlur,
		handleSuggestionSelect,
		getSuggestionsForField,
		isLoading,
		activeField,
		reset,
	};
}
