import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../api/axios';
import NavBar from '../../../components/NavBar';
import CategorySideBar from './CategorySideBar';

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
	console.log(products);
	console.log(subcategories);
	return (
		<>
			<NavBar />
			<div className='flex mt-10 px-10 gap-8'>
				{/* Sidebar (fixed width) */}
				{/* <div className='w-64'> */}
				<div className='w-64 h-screen sticky top-0 overflow-y-auto'>
					<CategorySideBar />
				</div>

				{/* Product List (takes remaining space) */}
				<div className='flex-1'>
					<div className='p-4 flex-1 overflow-y-auto'>
						<h1>Category: {categoryName}</h1>
						{/* Subcategory Tags */}
						<div className='flex flex-wrap gap-2 mb-4'>
							{subcategories.map((sub) => (
								<button
									key={sub.SubCategoryId}
									className='px-3 py-1 text-sm rounded-full bg-gray-200 hover:bg-green-600 hover:text-white transition'
								>
									{sub.SubCategoryName}
								</button>
							))}
						</div>

						{/* Product Grid */}
						<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
							{products.map((p) => (
								<div
									key={p.ProductId}
									className='bg-white p-3 rounded-lg shadow hover:shadow-md transition'
								>
									<img
										src={p.ImageUrl}
										alt={p.ProductName}
										className='w-full h-40 object-cover rounded-md mb-2'
									/>
									<h3 className='font-semibold text-sm'>{p.ProductName}</h3>
									<p className='text-gray-600 text-xs'>{p.Price} </p>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</>
	);
	// return (
	// 	<>

	// 		<NavBar />
	// 		<CategorySideBar />
	// <div className='p-4 flex-1 overflow-y-auto'>
	// 	<h1>Category: {categoryName}</h1>
	// 	{/* Subcategory Tags */}
	// 	<div className='flex flex-wrap gap-2 mb-4'>
	// 		{subcategories.map((sub) => (
	// 			<button
	// 				key={sub.SubCategoryId}
	// 				className='px-3 py-1 text-sm rounded-full bg-gray-200 hover:bg-green-600 hover:text-white transition'
	// 			>
	// 				{sub.SubCategoryName}
	// 			</button>
	// 		))}
	// 	</div>

	// 	{/* Product Grid */}
	// 	<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
	// 		{products.map((p) => (
	// 			<div key={p.ProductId} className='bg-white p-3 rounded-lg shadow hover:shadow-md transition'>
	// 				<img
	// 					src={p.ImageUrl}
	// 					alt={p.ProductName}
	// 					className='w-full h-40 object-cover rounded-md mb-2'
	// 				/>
	// 				<h3 className='font-semibold text-sm'>{p.ProductName}</h3>
	// 				<p className='text-gray-600 text-xs'>{p.Price} </p>
	// 			</div>
	// 		))}
	// 	</div>
	// </div>
	// 	</>
	// );
};

export default CategoryPage;
