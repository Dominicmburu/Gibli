import { useEffect, useState } from 'react';
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

	return (
		<div className='pb-8 sm:pb-10 lg:pb-12'>
			{/* Heading - Responsive sizing */}
			<h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-primary mb-4 sm:mb-6 lg:mb-10'>
				{loading ? 'Fetching Products....' : 'Products'}
			</h2>

			{/* Product Grid - Fully Responsive
          Mobile: 1 column (default)
          Small Mobile: 2 columns (360px+)
          Tablet: 2 columns (640px+)
          Laptop: 3 columns (1024px+)
          Desktop: 4 columns (1280px+)
      */}
			<section className='grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6'>
				{products.map((product) => (
					<ProductCard key={product.ProductId} {...product} />
				))}
			</section>
		</div>
	);
};

export default ProductList;
