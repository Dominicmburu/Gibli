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

	return (
		<>
			<h2>{loading ? 'Fetching Products....' : 'Products'}</h2>
			<section className='grid grid-cols-4 gap-6'>
				{products.map((product) => (
					<ProductCard key={product.ProductName} {...product} />
				))}
			</section>
		</>
	);
};
export default ProductList;
