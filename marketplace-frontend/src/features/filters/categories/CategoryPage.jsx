import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import api from '../../../api/axios';
import NavBar from '../../../components/NavBar';
import CategorySideBar from './CategorySideBar';
import ProductCard from '../../products/components/ProductCard';
import Footer from '../../../components/Footer';

const CategoryPage = () => {
	const { id } = useParams(); // categoryId from route
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [products, setProducts] = useState([]);
	const [subcategories, setSubcategories] = useState([]);
	const [categoryName, setCategoryName] = useState('');
	const [loading, setLoading] = useState(true);

	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const [productRes, subRes, categoryRes] = await Promise.all([
					api.get(`/products/category/${id}`),
					api.get(`/categories/all-sub-categories/${id}`),
					api.get(`/categories/category-details/${id}`),
				]);

				setProducts(productRes.data.products);
				setSubcategories(subRes.data);
				setCategoryName(categoryRes.data.CategoryName);
			} catch (err) {
				console.error('Error loading category data:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [id]);

	return (
		<div className='min-h-screen flex flex-col'>
			<NavBar />

			{/* Mobile/Tablet: Floating Filter Button (hidden on desktop) */}
			<button
				onClick={toggleSidebar}
				className='lg:hidden fixed bottom-6 right-4 sm:right-6 z-50 bg-baseGreen hover:bg-green-700 text-black p-3 sm:p-4 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2'
				aria-label='Toggle filters'
			>
				<Menu size={20} className='sm:w-6 sm:h-6' />
				<span className='font-medium text-sm sm:text-base'>Categories</span>
			</button>

			{/* Mobile/Tablet: Overlay */}
			{isSidebarOpen && (
				<div
					className='fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden'
					onClick={toggleSidebar}
					aria-hidden='true'
				/>
			)}

			{/* Main Content Wrapper */}
			<div className='flex flex-1 relative'>
				{/* Sidebar - Responsive behavior for all screen sizes */}
				<aside
					className={`
            fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-auto
            w-72 sm:w-80 lg:w-64 xl:w-72
            bg-white shadow-2xl lg:shadow-none
            transition-transform duration-300 ease-in-out
            overflow-y-auto
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
				>
					{/* Mobile/Tablet: Close Button Header */}
					<div className='lg:hidden flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10'>
						<h2 className='text-base sm:text-lg font-bold text-gray-800'>Categories</h2>
						<button
							onClick={toggleSidebar}
							className='p-2 hover:bg-gray-100 rounded-full transition-colors'
							aria-label='Close filters'
						>
							<X size={20} className='sm:w-6 sm:h-6' />
						</button>
					</div>

					{/* Sidebar Content */}
					<div className='lg:pt-0'>
						<CategorySideBar />
					</div>
				</aside>

				{/* Main Content Area - Responsive spacing */}
				<main className='flex-1 mt-4 sm:mt-6 lg:mt-10 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10'>
					{loading ? (
						<div className='flex items-center justify-center min-h-[400px]'>
							<div className='text-center'>
								<div className='animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-green-600 mx-auto'></div>
								<p className='mt-4 text-gray-600 text-sm sm:text-base'>Loading products...</p>
							</div>
						</div>
					) : (
						<div className='pb-8 sm:pb-10 lg:pb-12'>
							{/* Category Title - Responsive */}
							<h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 sm:mb-6'>
								Category: {categoryName}
							</h1>

							{/* Subcategory Tags - Responsive with horizontal scroll on mobile */}
							{subcategories.length > 0 && (
								<div className='mb-6 sm:mb-8'>
									<h3 className='text-sm sm:text-base font-semibold text-gray-700 mb-3'>
										Filter by subcategory:
									</h3>
									<div className='flex flex-wrap gap-2 sm:gap-3'>
										{subcategories.map((sub) => (
											<button
												key={sub.SubCategoryId}
												className='px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full bg-gray-200 hover:bg-green-600 hover:text-white transition-colors duration-200 whitespace-nowrap'
											>
												{sub.SubCategoryName}
											</button>
										))}
									</div>
								</div>
							)}

							{/* Product Grid - Fully Responsive */}
							<div className='grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6'>
								{products.length > 0 ? (
									products.map((product) => <ProductCard key={product.ProductId} {...product} />)
								) : (
									<div className='col-span-full text-center py-12'>
										<p className='text-gray-500 text-sm sm:text-base'>
											No products found in this category.
										</p>
									</div>
								)}
							</div>
						</div>
					)}
				</main>
			</div>

			<Footer />
		</div>
	);
};

export default CategoryPage;
