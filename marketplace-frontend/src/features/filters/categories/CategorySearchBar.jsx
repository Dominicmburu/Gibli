import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CategorySearchBar = ({ categories, onCategorySelect, placeholder = 'Search categories' }) => {
	const { t } = useTranslation();
	const [searchTerm, setSearchTerm] = useState('');
	const [filteredCategories, setFilteredCategories] = useState([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const searchRef = useRef(null);

	// Filter categories based on search term
	useEffect(() => {
		if (searchTerm.trim() === '') {
			setFilteredCategories([]);
			setShowDropdown(false);
			return;
		}

		const filtered = categories.filter((cat) =>
			(cat.DisplayName || cat.CategoryName).toLowerCase().includes(searchTerm.toLowerCase())
		);

		setFilteredCategories(filtered);
		setShowDropdown(true);
	}, [searchTerm, categories]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (searchRef.current && !searchRef.current.contains(event.target)) {
				setShowDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleCategoryClick = (category) => {
		onCategorySelect(category.CategoryId);
		setSearchTerm('');
		setShowDropdown(false);
	};

	const handleClear = () => {
		setSearchTerm('');
		setFilteredCategories([]);
		setShowDropdown(false);
	};

	return (
		<div ref={searchRef} className='relative w-full p-3 border-b border-gray-300'>
			{/* Search Input */}
			<div className='relative'>
				<div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
					<Search className='w-4 h-4 text-gray-400' />
				</div>
				<input
					type='text'
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder={placeholder}
					className='w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
				/>
				{searchTerm && (
					<button
						onClick={handleClear}
						className='absolute inset-y-0 right-0 flex items-center pr-3 hover:text-gray-700'
					>
						<X className='w-4 h-4 text-gray-400' />
					</button>
				)}
			</div>

			{/* Dropdown Results */}
			{showDropdown && (
				<div className='absolute left-3 right-3 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto'>
					{filteredCategories.length > 0 ? (
						<ul>
							{filteredCategories.map((cat) => (
								<li
									key={cat.CategoryId}
									onClick={() => handleCategoryClick(cat)}
									className='px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0'
								>
									<div className='flex items-center justify-between'>
										<span className='font-medium'>{cat.DisplayName || cat.CategoryName}</span>
										<span className='text-xs text-gray-400'>{t('categories.categoryLabel')}</span>
									</div>
								</li>
							))}
						</ul>
					) : (
						<div className='px-4 py-3 text-sm text-gray-500 text-center'>
							{t('categories.searchNoResults', { term: searchTerm })}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default CategorySearchBar;
