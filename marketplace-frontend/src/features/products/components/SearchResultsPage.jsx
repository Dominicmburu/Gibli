// pages/SearchResultsPage.jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2, Menu, X } from 'lucide-react';

import api from '../../../api/axios';
import { useTranslation } from 'react-i18next';

import NavBar from '../../../components/NavBar';
import CategorySideBar from '../../filters/categories/CategorySideBar';
import ProductCard from '../../products/components/ProductCard';
import Footer from '../../../components/Footer';

const SearchResultsPage = () => {
	const [searchParams] = useSearchParams();
	const query = searchParams.get('q') || '';
	const { t } = useTranslation();

	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [results, setResults] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	useEffect(() => {
		if (!query || query.trim().length < 2) {
			setResults([]);
			return;
		}

		const performSearch = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const response = await api.get(`/products/search?q=${encodeURIComponent(query)}`);

				const data = response.data.results || [];
				setResults(data);
			} catch (err) {
				if (err.response?.status === 400) {
					setError(err.response.data.error);
				} else {
					setError('Failed to load search results.');
				}
			} finally {
				setIsLoading(false);
			}
		};

		performSearch();
	}, [query]);

	return (
		<div className='min-h-screen flex flex-col'>
			<NavBar />

			{/* Mobile/Tablet: Floating Filter Button (hidden on desktop) */}
			<button
				onClick={toggleSidebar}
				className='lg:hidden fixed bottom-6 right-4 sm:right-6 z-50 bg-secondary-500 hover:bg-secondary-600 text-black p-3 sm:p-4 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2'
				aria-label='Toggle filters'
			>
				<Menu size={20} className='sm:w-6 sm:h-6' />
				<span className='font-medium text-sm sm:text-base'>{t('categories.title')}</span>
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
						<h2 className='text-base sm:text-lg font-bold text-gray-800'>{t('categories.title')}</h2>
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
					<div className='pb-8 sm:pb-10 lg:pb-12'>
						{/* Page Title - Responsive */}
						<div className='mb-4 sm:mb-6'>
							<h1 className='text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-2'>
								{t('search.results')}: <span className='text-primary-500'>"{query}"</span>
							</h1>
							{!isLoading && results.length > 0 && (
								<p className='text-sm sm:text-base text-gray-600'>
									{t('search.resultsFound', { count: results.length })}
								</p>
							)}
						</div>

						{/* Loading State */}
						{isLoading && (
							<div className='flex flex-col justify-center items-center py-16 sm:py-20'>
								<Loader2 size={40} className='sm:w-12 sm:h-12 animate-spin text-primary-500 mb-4' />
								<p className='text-sm sm:text-base text-gray-600'>{t('search.loading')}</p>
							</div>
						)}

						{/* Error State */}
						{error && (
							<div className='bg-red-50 border border-red-200 text-red-700 p-4 sm:p-5 rounded-lg max-w-2xl mx-auto'>
								<p className='text-sm sm:text-base font-medium'>{error}</p>
							</div>
						)}

						{/* No Query State */}
						{!isLoading && !query && (
							<div className='text-center py-16 sm:py-20'>
								<Search size={48} className='sm:w-16 sm:h-16 mx-auto text-gray-300 mb-4' />
								<p className='text-gray-500 text-base sm:text-lg'>{t('search.emptyPrompt')}</p>
							</div>
						)}

						{/* No Results State */}
						{!isLoading && query && results.length === 0 && !error && (
							<div className='text-center py-16 sm:py-20'>
								<Search size={48} className='sm:w-16 sm:h-16 mx-auto text-gray-300 mb-4' />
								<p className='text-gray-600 text-base sm:text-lg font-medium mb-2'>
									{t('search.noResults')} "{query}"
								</p>
								<p className='text-gray-400 text-sm sm:text-base'>
									{t('search.tryDifferent')}
								</p>
							</div>
						)}

						{/* Results Grid - Fully Responsive */}
						{!isLoading && results.length > 0 && (
							<div className='grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6'>
								{results.map((product) => (
									<ProductCard key={product.ProductId} {...product} />
								))}
							</div>
						)}
					</div>
				</main>
			</div>

			<Footer />
		</div>
	);
};

export default SearchResultsPage;
