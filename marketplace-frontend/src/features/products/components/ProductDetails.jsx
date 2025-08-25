import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { useParams } from 'react-router-dom';
import NavBar from '../../../components/Navbar';
import AddToCart from '../../cart/components/AddToCart';

const ProductDetails = () => {
	const [productDetails, setProductDetails] = useState(null);
	const [selectedImage, setSelectedImage] = useState(null);
	const { id } = useParams();

	useEffect(() => {
		const fetchProductDetails = async () => {
			try {
				const response = await api.get(`/products/product/details/${id}`);
				setProductDetails(response.data);
				setSelectedImage(response.data.ProductImages?.[0]?.ImageUrl); // default to first image
			} catch (error) {
				console.error('Error fetching product details:', error);
			}
		};

		fetchProductDetails();
	}, [id]);

	if (!productDetails) return <p>Loading...</p>;

	return (
		<>
			<NavBar />
			<div className='flex flex-col md:flex-row gap-8 p-6 max-w-7xl mx-auto'>
				{/* LEFT SIDE - product info */}
				<div className='flex-1 space-y-4'>
					<h1 className='text-3xl font-bold text-primary'>{productDetails.ProductName}</h1>
					{/* <p className='text-xl text-green-600 font-semibold'>€ {productDetails.Price}</p> */}
					{/* <p className='text-sm text-gray-500'>Stock: {productDetails.InStock}</p> */}
					<p className='text-gray-600'>{productDetails.Description}</p>
					<p className='text-xl text-green-600 font-semibold'>€ {productDetails.Price}</p>
					<p className='text-sm text-gray-500'>Units in stock: {productDetails.InStock}</p>
					<p className='text-sm text-muted'>
						<span className='text-sm text-green-600 font-semibold'>{productDetails.BusinessName}</span> |{' '}
						<span className='text-sm text-green-600 font-semibold'>Country: {productDetails.Country}</span>
					</p>
					<button className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md'>
						Buy Now
					</button>
					<AddToCart />
				</div>

				{/* RIGHT SIDE - product images */}
				<div className='flex flex-row-reverse gap-4 flex-1'>
					{/* Main Image */}
					<div className='flex-1'>
						<img
							src={selectedImage}
							alt='Selected product'
							className='w-full h-auto max-h-[500px] object-cover rounded-lg shadow'
						/>
					</div>

					{/* Thumbnails (vertical) */}
					<div className='flex flex-col gap-3'>
						{productDetails.ProductImages?.map((img, idx) => (
							<img
								key={img.ImageId}
								src={img.ImageUrl}
								alt={`Thumbnail ${idx}`}
								className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${
									selectedImage === img.ImageUrl ? 'border-green-600' : 'border-transparent'
								}`}
								onClick={() => setSelectedImage(img.ImageUrl)}
							/>
						))}
					</div>
				</div>
			</div>
		</>
	);
};

export default ProductDetails;
