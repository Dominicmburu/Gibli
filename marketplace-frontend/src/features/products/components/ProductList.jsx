import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, Sparkles } from 'lucide-react';
import api from '../../../api/axios';
import ProductCard from './ProductCard';

const ProductList = () => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchProducts = async () => {
			try {
				const response = await api.get('/products/all');
				console.log(response.data);
				setProducts(response.data);
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		};
		fetchProducts();
	}, []);

	useEffect(() => {
		if (!loading && products.length > 0) {
			const savedPosition = sessionStorage.getItem('scrollPosition');
			if (savedPosition) {
				console.log('Restoring scroll to:', savedPosition);
				window.scrollTo({
					top: parseInt(savedPosition, 10),
					behavior: 'auto',
				});
				sessionStorage.removeItem('scrollPosition');
			}
		}
	}, [loading, products]);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.4 },
		},
	};

	return (
		<div className='pb-8 sm:pb-10 lg:pb-12'>
			{/* Section Header */}
			<div className='mb-8 sm:mb-10 lg:mb-12'>
				<div className='flex items-center gap-4 mb-4'>
					<div className='w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30'>
						<Package className='w-6 h-6 sm:w-7 sm:h-7 text-white' />
					</div>
					<div>
						<h2 className='text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900'>
							Featured Products
						</h2>
						<p className='text-sm sm:text-base text-gray-500 mt-1'>
							Discover quality products from trusted European sellers
						</p>
					</div>
				</div>
				{/* Decorative line */}
				<div className='flex items-center gap-3'>
					<div className='h-1 w-20 sm:w-32 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full'></div>
					<div className='h-1 w-8 sm:w-12 bg-secondary-400 rounded-full'></div>
					<div className='h-1 w-4 sm:w-6 bg-secondary-300 rounded-full'></div>
				</div>
			</div>

			{/* Loading State */}
			{loading ? (
				<div className='flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100'>
					<div className='relative'>
						<div className='w-16 h-16 border-4 border-primary-200 rounded-full'></div>
						<div className='w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full absolute top-0 left-0 animate-spin'></div>
					</div>
					<p className='mt-6 text-gray-600 font-medium'>Loading amazing products...</p>
					<div className='flex gap-1 mt-3'>
						<span className='w-2 h-2 bg-primary-400 rounded-full animate-bounce' style={{ animationDelay: '0ms' }}></span>
						<span className='w-2 h-2 bg-primary-500 rounded-full animate-bounce' style={{ animationDelay: '150ms' }}></span>
						<span className='w-2 h-2 bg-primary-600 rounded-full animate-bounce' style={{ animationDelay: '300ms' }}></span>
					</div>
				</div>
			) : (
				<>
					{/* Products Count Badge */}
					<div className='flex items-center justify-between mb-6'>
						<div className='flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full'>
							<TrendingUp size={16} />
							<span className='text-sm font-medium'>{products.length} Products Available</span>
						</div>
						<div className='hidden sm:flex items-center gap-2 text-secondary-600'>
							<Sparkles size={16} />
							<span className='text-sm font-medium'>New arrivals daily</span>
						</div>
					</div>

					{/* Product Grid */}
					<motion.section
						variants={containerVariants}
						initial='hidden'
						animate='visible'
						className='grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 xl:gap-8'
					>
						{products.map((product) => (
							<motion.div key={product.ProductId} variants={itemVariants}>
								<ProductCard {...product} />
							</motion.div>
						))}
					</motion.section>
				</>
			)}
		</div>
	);
};

export default ProductList;
