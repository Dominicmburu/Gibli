import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Grid3X3, ChevronRight } from 'lucide-react';
import api from '../../../api/axios';
import CategorySearchBar from './CategorySearchBar';
import { useLanguage } from '../../../context/LanguageContext';
import { useTranslation } from 'react-i18next';

const CategorySideBar = () => {
	const [categories, setCategories] = useState([]);       // raw from API (English)
	const [displayed, setDisplayed] = useState([]);          // translated for current language
	const [activeCategory, setActiveCategory] = useState(null);

	const navigate = useNavigate();
	const location = useLocation();
	const { language, translateTexts } = useLanguage();
	const { t } = useTranslation();

	// Fetch categories once on mount
	useEffect(() => {
		let mounted = true;
		const fetchCategories = async () => {
			try {
				const res = await api.get('/categories/all-categories');
				if (!mounted) return;
				setCategories(res.data || []);
			} catch (err) {
				console.error('Error fetching categories:', err);
			}
		};
		fetchCategories();
		return () => { mounted = false; };
	}, []);

	// Re-translate whenever language or raw categories change
	useEffect(() => {
		if (!categories.length) return;

		let cancelled = false;
		const translate = async () => {
			const names = categories.map((c) => c.CategoryName?.trim() || '');
			const translated = await translateTexts(names, language);
			if (!cancelled) {
				setDisplayed(
					categories.map((c, i) => ({ ...c, DisplayName: translated[i] || c.CategoryName }))
				);
			}
		};
		translate();
		return () => { cancelled = true; };
	}, [categories, language, translateTexts]);

	// Sync activeCategory after categories load or when pathname changes
	useEffect(() => {
		if (!categories.length) return;
		const match = location.pathname.match(/\/category\/([^/]+)/);
		setActiveCategory(match ? String(match[1]) : null);
	}, [location.pathname, categories]);

	const handleCategoryClick = (CategoryId) => {
		const catIdStr = String(CategoryId);
		const match = location.pathname.match(/\/category\/([^/]+)/);
		const current = match ? String(match[1]) : null;
		setActiveCategory(catIdStr);
		if (current !== catIdStr) navigate(`/category/${catIdStr}`);
	};

	const items = displayed.length ? displayed : categories.map((c) => ({ ...c, DisplayName: c.CategoryName }));

	return (
		<div className='h-full bg-white'>
			{/* Header */}
			<div className='p-4 lg:p-5 border-b border-gray-100'>
				<div className='flex items-center gap-3'>
					<div className='w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20'>
						<Grid3X3 className='w-5 h-5 text-white' />
					</div>
					<div>
						<h2 className='font-bold text-gray-900 text-lg'>{t('categories.title')}</h2>
						<p className='text-xs text-gray-500'>{t('categories.browseBy')}</p>
					</div>
				</div>
			</div>

			{/* Search Bar */}
			<div className='p-3 lg:p-4'>
				<CategorySearchBar
					categories={items}
					onCategorySelect={handleCategoryClick}
					placeholder='Search categories...'
				/>
			</div>

			{/* Categories List */}
			<div className='px-2 lg:px-3 pb-6'>
				<ul className='space-y-1'>
					{items.map((cat, index) => {
						const catId = String(cat.CategoryId);
						const isActive = activeCategory !== null && catId === activeCategory;

						return (
							<motion.li
								key={catId}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: index * 0.05 }}
							>
								<button
									onClick={() => handleCategoryClick(catId)}
									className={`text-left w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
										isActive
											? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
											: 'text-gray-700 hover:bg-gray-50'
									}`}
								>
									<span
										className={`text-sm font-medium transition-colors ${
											isActive ? 'text-white' : 'text-gray-700 group-hover:text-primary-600'
										}`}
									>
										{cat.DisplayName?.trim()}
									</span>

									<ChevronRight
										size={16}
										className={`transition-all duration-200 flex-shrink-0 ${
											isActive
												? 'text-white/80'
												: 'text-gray-400 group-hover:text-primary-500'
										}`}
									/>
								</button>
							</motion.li>
						);
					})}
				</ul>
			</div>
		</div>
	);
};

export default CategorySideBar;
