import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';

const AddressAutocomplete = ({
	value,
	onChange,
	onAddressSelect,
	placeholder = 'Start typing...',
	error,
	className = '',
}) => {
	const [suggestions, setSuggestions] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const wrapperRef = useRef(null);
	const debounceRef = useRef(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
				setShowDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Debounced search using Nominatim (OpenStreetMap)
	const searchAddress = useCallback(async (query) => {
		if (!query || query.length < 2) {
			setSuggestions([]);
			setShowDropdown(false);
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
				{
					headers: {
						'Accept-Language': 'en',
					},
				}
			);

			if (!response.ok) throw new Error('Search failed');

			const data = await response.json();
			setSuggestions(data);
			setShowDropdown(data.length > 0);
			setHighlightedIndex(-1);
		} catch (err) {
			console.error('Address search error:', err);
			setSuggestions([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Handle input change with debounce
	const handleInputChange = (e) => {
		const newValue = e.target.value;
		if (onChange) {
			onChange(newValue);
		}

		// Clear previous debounce
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		// Debounce the search (300ms)
		debounceRef.current = setTimeout(() => {
			searchAddress(newValue);
		}, 300);
	};

	// Parse Nominatim address into our format
	const parseNominatimAddress = (place) => {
		const address = place.address || {};

		// Build street address
		const houseNumber = address.house_number || '';
		const road = address.road || address.pedestrian || address.street || '';
		const addressLine1 = [houseNumber, road].filter(Boolean).join(' ');

		// Get city (try multiple fields)
		const city = address.city || address.town || address.village || address.municipality || address.county || '';

		// Get state/province
		const state = address.state || address.region || '';

		// Get postal code
		const postalCode = address.postcode || '';

		// Get country
		const country = address.country || '';

		return {
			AddressLine1: addressLine1,
			City: city,
			StateOrProvince: state,
			PostalCode: postalCode,
			Country: country,
			formattedAddress: place.display_name || '',
		};
	};

	// Get the best display name for a suggestion
	const getSuggestionDisplay = (place) => {
		const address = place.address || {};
		const city = address.city || address.town || address.village || address.municipality || '';
		const county = address.county || '';
		const state = address.state || address.region || '';
		const country = address.country || '';

		// Primary: show city/state/county in clear format
		const locationParts = [city, state || county, country].filter(Boolean);
		const primary = locationParts.length > 0 ? locationParts.join(', ') : (place.name || 'Location');

		// Secondary: show county if state was already shown, or postal code for extra context
		const secondaryParts = [];
		if (state && county && county !== city) secondaryParts.push(county);
		if (address.postcode) secondaryParts.push(address.postcode);
		const secondary = secondaryParts.join(' - ');

		return { primary, secondary };
	};

	// Handle suggestion selection
	const handleSelectSuggestion = (place) => {
		const addressData = parseNominatimAddress(place);

		// Update the controlled input value
		if (onChange) {
			onChange(addressData.City || place.display_name);
		}

		// Call the callback with all parsed address fields
		if (onAddressSelect) {
			onAddressSelect(addressData);
		}

		setShowDropdown(false);
		setSuggestions([]);
	};

	// Handle keyboard navigation
	const handleKeyDown = (e) => {
		if (!showDropdown || suggestions.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
				break;
			case 'Enter':
				e.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
					handleSelectSuggestion(suggestions[highlightedIndex]);
				}
				break;
			case 'Escape':
				setShowDropdown(false);
				break;
		}
	};

	// Cleanup debounce on unmount
	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	return (
		<div className='relative' ref={wrapperRef}>
			<div className='relative'>
				<MapPin
					size={16}
					className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10'
				/>
				<input
					type='text'
					value={value}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
					placeholder={placeholder}
					className={`w-full border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
						error ? 'border-red-500 bg-red-50' : 'border-gray-300'
					} ${className}`}
					autoComplete='off'
				/>
				{isLoading ? (
					<Loader2
						size={16}
						className='absolute right-3 top-1/2 -translate-y-1/2 text-primary-500 animate-spin'
					/>
				) : (
					<Search
						size={16}
						className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'
					/>
				)}
			</div>

			{/* Suggestions Dropdown */}
			{showDropdown && suggestions.length > 0 && (
				<div className='absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
					{suggestions.map((place, index) => {
						const { primary, secondary } = getSuggestionDisplay(place);
						return (
							<button
								key={place.place_id}
								type='button'
								onClick={() => handleSelectSuggestion(place)}
								className={`w-full text-left px-4 py-3 text-sm hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-b-0 ${
									index === highlightedIndex ? 'bg-primary-50' : ''
								}`}
							>
								<div className='flex items-start gap-2'>
									<MapPin size={14} className='text-gray-400 mt-0.5 flex-shrink-0' />
									<div className='flex-1 min-w-0'>
										<p className='font-medium text-gray-900 truncate'>
											{primary}
										</p>
										{secondary && (
											<p className='text-xs text-gray-500 truncate mt-0.5'>
												{secondary}
											</p>
										)}
									</div>
								</div>
							</button>
						);
					})}
					{/* Attribution (required by Nominatim) */}
					<div className='px-3 py-2 bg-gray-50 text-xs text-gray-400 text-center'>
						Powered by OpenStreetMap
					</div>
				</div>
			)}
		</div>
	);
};

export default AddressAutocomplete;
