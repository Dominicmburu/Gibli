import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../api/axios';
import NavBar from '../../../components/NavBar';
import CategorySideBar from './CategorySideBar';
import ProductCard from '../../products/components/ProductCard';
import Footer from '../../../components/Footer';

const CategoryPage = () => {
	const { id } = useParams(); // categoryId from route
	const [products, setProducts] = useState([]);
	const [subcategories, setSubcategories] = useState([]);
	const [categoryName, setCategoryName] = useState('');

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [productRes, subRes, categoryRes] = await Promise.all([
					api.get(`/products/category/${id}`),
					api.get(`/categories/all-sub-categories/${id}`),
					api.get(`/categories/category-details/${id}`),
				]);

				setProducts(productRes.data);
				setSubcategories(subRes.data);
				setCategoryName(categoryRes.data.CategoryName);
			} catch (err) {
				console.error('Error loading category data:', err);
			}
		};
		fetchData();
	}, [id]);

	return (
		<>
			<NavBar />
			<div className='flex mt-10 px-10 gap-8'>
				{/* Sidebar */}
				<div className='w-64 h-screen sticky top-0 overflow-y-auto'>
					<CategorySideBar />
				</div>

				{/* Product Section */}
				<div className='flex-1'>
					<div className='p-4 flex-1 overflow-y-auto'>
						<h1 className='text-xl font-semibold mb-4'>Category: {categoryName}</h1>

						{/* Subcategory Tags */}
						<div className='flex flex-wrap gap-2 mb-6'>
							{subcategories.map((sub) => (
								<button
									key={sub.SubCategoryId}
									className='px-3 py-1 text-sm rounded-full bg-gray-200 hover:bg-green-600 hover:text-white transition'
								>
									{sub.SubCategoryName}
								</button>
							))}
						</div>

						{/* Product Grid using ProductCard */}
						<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-6'>
							{products.map((product) => (
								<ProductCard key={product.ProductId} {...product} />
							))}
						</div>
					</div>
				</div>
			</div>
			<Footer />
		</>
	);
};

export default CategoryPage;
