// pages/SearchResultsPage.jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';

import api from '../../../api/axios';

import NavBar from '../../../components/NavBar';
import CategorySideBar from '../../filters/categories/CategorySideBar';
import ProductCard from '../../products/components/ProductCard';
import Footer from '../../../components/Footer';

const SearchResultsPage = () => {
	const [searchParams] = useSearchParams();
	const query = searchParams.get('q') || '';

	const [results, setResults] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

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
		<>
			<NavBar />

			<div className='flex mt-10 px-10 gap-8'>
				{/* Sidebar */}
				<div className='w-64 h-screen sticky top-0 overflow-y-auto'>
					<CategorySideBar />
				</div>

				{/* Results Section */}
				<div className='flex-1 p-4 overflow-y-auto'>
					{/* Page Title */}
					<h1 className='text-xl font-semibold mb-4'>Search results for: "{query}"</h1>
					<h2 className='text-xl font-semibold mb-4 text-gray-900'>
						{results.length > 0
							? `${results.length} result${results.length !== 1 ? 's' : ''} for “${query}”`
							: `No results found for “${searchParams.get('q')}”`}
					</h2>

					{/* Loading */}
					{isLoading && (
						<div className='flex justify-center items-center py-20'>
							<Loader2 size={48} className='animate-spin text-green-600' />
						</div>
					)}

					{/* Error */}
					{error && (
						<div className='bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg max-w-lg'>
							{error}
						</div>
					)}

					{/* No Query */}
					{!isLoading && !query && (
						<div className='text-center py-20'>
							<Search size={64} className='mx-auto text-gray-300 mb-4' />
							<p className='text-gray-500 text-lg'>Search for products above</p>
						</div>
					)}

					{/* No Results */}
					{!isLoading && query && results.length === 0 && (
						<div className='text-center py-20'>
							<p className='text-gray-500 text-lg mb-4'>No results found for "{query}"</p>
							<p className='text-gray-400 text-sm'>Try different keywords or check spelling</p>
						</div>
					)}

					{/* Results Grid */}
					{!isLoading && results.length > 0 && (
						<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-6'>
							{results.map((product) => (
								<ProductCard key={product.ProductId} {...product} />
							))}
						</div>
					)}
				</div>
			</div>

			<Footer />
		</>
	);
};

export default SearchResultsPage;
