import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import ProductCard from './ProductCard';
import CategorySideBar from '../../filters/categories/CategorySideBar';

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
		<>
			<h2 className='text-3xl font-bold text-primary mb-10'>{loading ? 'Fetching Products....' : 'Products'}</h2>
			<section className='grid grid-cols-3 gap-6'>
				{products.map((product) => (
					<ProductCard key={product.ProductId} {...product} />
				))}
			</section>
		</>
	);
};
export default ProductList;
