import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import api from '../../../api/axios';
import SearchBar from '../../../components/SearchBar';

const CategorySideBar = () => {
	const [categories, setCategories] = useState([]);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const navigate = useNavigate();

	// Fetch categories on mount
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const res = await api.get('/categories/all-categories');
				setCategories(res.data);
			} catch (err) {
				console.error('Error fetching categories:', err);
			}
		};
		fetchCategories();
	}, []);
	console.log(categories);
	// Navigate to category page
	const handleCategoryClick = (CategoryId) => {
		navigate(`/category/${CategoryId}`);
	};

	return (
		<div
			className={`transition-all duration-300 bg-gray-100 border-r border-gray-300 h-screen overflow-y-auto ${
				isCollapsed ? 'w-16' : 'w-64'
			}`}
		>
			<SearchBar placeholder='Search categories' />
			{/* Header */}
			<div className='flex items-center justify-between p-3 border-b border-gray-300'>
				{!isCollapsed && <h2 className='font-bold text-gray-700'>Available Categories</h2>}
				{/* <button onClick={() => setIsCollapsed(!isCollapsed)} className='p-2 hover:bg-gray-200 rounded-full'>
					{isCollapsed ? <ChevronRight /> : <ChevronLeft />}
				</button> */}
			</div>

			{/* Category List */}
			<ul className='mt-2'>
				{categories.map((cat) => (
					<li
						key={cat.CategoryId}
						onClick={() => handleCategoryClick(cat.CategoryId)}
						className='cursor-pointer flex items-center gap-2 p-3 hover:bg-gray-200 text-gray-700 transition-colors'
					>
						{isCollapsed ? (
							<span className='text-sm font-medium truncate' title={cat.CategoryName}>
								{cat.CategoryName.charAt(0)}
							</span>
						) : (
							<span className='text-sm font-medium'>{cat.CategoryName}</span>
						)}
					</li>
				))}
			</ul>
		</div>
	);
};

export default CategorySideBar;
