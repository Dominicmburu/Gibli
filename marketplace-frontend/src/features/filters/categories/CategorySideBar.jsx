import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../api/axios';
import CategorySearchBar from './CategorySearchBar';

const CategorySideBar = () => {
	const [categories, setCategories] = useState([]);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [activeCategory, setActiveCategory] = useState(null);
	const navigate = useNavigate();
	const location = useLocation();

	// Fetch categories
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
		return () => {
			mounted = false;
		};
	}, []);

	// Sync activeCategory after categories load or when pathname changes
	useEffect(() => {
		if (!categories.length) return;

		const match = location.pathname.match(/\/category\/([^/]+)/);
		if (match) {
			setActiveCategory(String(match[1]));
			return;
		}

		setActiveCategory(null);
	}, [location.pathname, categories]);

	const handleCategoryClick = (CategoryId) => {
		const catIdStr = String(CategoryId);
		const match = location.pathname.match(/\/category\/([^/]+)/);
		const current = match ? String(match[1]) : null;

		if (current === catIdStr) {
			setActiveCategory(catIdStr);
			return;
		}

		setActiveCategory(catIdStr);
		navigate(`/category/${catIdStr}`);
	};

	return (
		<div
			className={`transition-all duration-300 bg-gray-100 border-r border-gray-300 h-screen overflow-y-auto ${
				isCollapsed ? 'w-16' : 'w-64'
			}`}
		>
			{/* Header */}
			<div className='flex items-center justify-between p-3 border-b border-gray-300'>
				{!isCollapsed && <h2 className='font-bold text-gray-700'>Available Categories</h2>}
			</div>

			{/* Search Bar - Only show when not collapsed */}
			{!isCollapsed && (
				<CategorySearchBar
					categories={categories}
					onCategorySelect={handleCategoryClick}
					placeholder='Search categories'
				/>
			)}

			{/* Categories List */}
			<ul className='mt-2'>
				{categories.map((cat) => {
					const catId = String(cat.CategoryId);
					const isActive = activeCategory !== null && catId === activeCategory;

					return (
						<li
							key={catId}
							onClick={() => handleCategoryClick(catId)}
							role='button'
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') handleCategoryClick(catId);
							}}
							aria-current={isActive ? 'true' : undefined}
							className={`cursor-pointer flex items-center gap-2 p-3 transition-colors ${
								isActive
									? 'bg-orange-100 text-orange-600 border-l-4 border-orange-500 font-semibold'
									: 'text-gray-700 hover:bg-gray-200'
							}`}
						>
							{isCollapsed ? (
								<span className='text-sm font-medium truncate' title={cat.CategoryName}>
									{cat.CategoryName?.charAt(0)}
								</span>
							) : (
								<span className='text-sm font-medium'>{cat.CategoryName}</span>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
};

export default CategorySideBar;
