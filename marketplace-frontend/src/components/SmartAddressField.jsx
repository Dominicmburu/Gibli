import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';

/**
 * SmartAddressField — A reusable input with suggestion dropdown.
 * Does NOT make API calls. Receives suggestions from the parent hook.
 */
const SmartAddressField = ({
	fieldKey,
	value,
	onChange,
	onFocus,
	onBlur,
	onSelect,
	suggestions = [],
	isLoading = false,
	placeholder = '',
	error,
	icon,
	className = '',
}) => {
	const [showDropdown, setShowDropdown] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const wrapperRef = useRef(null);

	// Show dropdown when suggestions change and there are results
	useEffect(() => {
		if (suggestions.length > 0) {
			setShowDropdown(true);
			setHighlightedIndex(-1);
		} else {
			setShowDropdown(false);
		}
	}, [suggestions]);

	// Close dropdown on click outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
				setShowDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleInputChange = (e) => {
		const newValue = e.target.value;
		if (onChange) onChange(fieldKey, newValue);
	};

	const handleInputFocus = () => {
		if (onFocus) onFocus(fieldKey);
		if (suggestions.length > 0) setShowDropdown(true);
	};

	const handleInputBlur = () => {
		if (onBlur) onBlur(fieldKey);
	};

	const handleSelectSuggestion = (suggestion) => {
		if (onSelect) onSelect(fieldKey, suggestion.place);
		setShowDropdown(false);
	};

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

	const IconComponent = icon || <MapPin size={16} className='text-gray-400' />;

	return (
		<div className='relative' ref={wrapperRef}>
			<div className='relative'>
				<span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10'>
					{IconComponent}
				</span>
				<input
					type='text'
					value={value}
					onChange={handleInputChange}
					onFocus={handleInputFocus}
					onBlur={handleInputBlur}
					onKeyDown={handleKeyDown}
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
					{suggestions.map((suggestion, index) => (
						<button
							key={`${suggestion.value}-${index}`}
							type='button'
							onMouseDown={(e) => {
								// Use mouseDown instead of click to fire before blur
								e.preventDefault();
								handleSelectSuggestion(suggestion);
							}}
							className={`w-full text-left px-4 py-3 text-sm hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-b-0 ${
								index === highlightedIndex ? 'bg-primary-50' : ''
							}`}
						>
							<div className='flex items-start gap-2'>
								<MapPin size={14} className='text-gray-400 mt-0.5 flex-shrink-0' />
								<div className='flex-1 min-w-0'>
									<p className='font-medium text-gray-900 truncate'>
										{suggestion.primary}
									</p>
									{suggestion.secondary && (
										<p className='text-xs text-gray-500 truncate mt-0.5'>
											{suggestion.secondary}
										</p>
									)}
								</div>
							</div>
						</button>
					))}
					{/* Attribution (required by Nominatim) */}
					<div className='px-3 py-1.5 bg-gray-50 text-[10px] text-gray-400 text-center'>
						Powered by OpenStreetMap
					</div>
				</div>
			)}
		</div>
	);
};

export default SmartAddressField;
