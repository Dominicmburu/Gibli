import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { useParams } from 'react-router-dom';
import NavBar from '../../../components/NavBar';
import AddToCart from '../../cart/components/AddToCart';
import BuyNow from '../../checkout/BuyNow';
import Footer from '../../../components/Footer';
import Suggestions from './Suggestions';
import AddToWishList from '../../wishlist/components/AddToWishlist';

import { Truck, Zap, Package, ArrowLeft } from 'lucide-react';

const ProductDetails = () => {
	const [productDetails, setProductDetails] = useState(null);
	const [selectedImage, setSelectedImage] = useState(null);
	const [loading, setLoading] = useState(true);
	const { id } = useParams();

	useEffect(() => {
		const fetchProductDetails = async () => {
			try {
				setLoading(true); // Start loading
				const response = await api.get(`/products/product/details/${id}`);
				setProductDetails(response.data);
				setSelectedImage(response.data.ProductImages?.[0]?.ImageUrl); // default to first image
			} catch (error) {
				console.error('Error fetching product details:', error);
			} finally {
				setLoading(false); // Stop loading
			}
		};

		fetchProductDetails();
	}, [id]);

	console.log('These are the details we found', productDetails);

	// Show loading state
	if (loading || !productDetails) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-green-600 mx-auto'></div>
					<p className='mt-4 text-gray-600 text-sm sm:text-base'>Loading product details...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen flex flex-col bg-gray-50'>
			<NavBar />

			{/* Back Button - Mobile & Tablet */}
			<div className='lg:hidden px-4 py-3 bg-white border-b'>
				<button
					onClick={() => window.history.back()}
					className='flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors'
				>
					<ArrowLeft size={20} />
					<span className='text-sm font-medium'>Back to products</span>
				</button>
			</div>

			{/* Main Content */}
			<div className='flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
				<div className='bg-white rounded-lg shadow-md overflow-hidden'>
					<div className='flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8'>
						{/* LEFT SIDE - Product Images (Mobile: Top, Desktop: Right) */}
						<div className='w-full lg:w-1/2 order-1 lg:order-2'>
							<div className='sticky top-20'>
								{/* Main Image - Responsive height */}
								<div className='relative mb-3 sm:mb-4'>
									<img
										src={selectedImage}
										alt='Selected product'
										className='w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] object-cover rounded-lg shadow-lg'
									/>
								</div>

								{/* Thumbnails - Horizontal scroll on mobile, grid on larger screens */}
								<div className='flex lg:grid lg:grid-cols-4 gap-2 sm:gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide'>
									{productDetails.ProductImages?.map((img, idx) => (
										<img
											key={img.ImageId}
											src={img.ImageUrl}
											alt={`Thumbnail ${idx + 1}`}
											className={`
                        flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 lg:w-full lg:h-20 xl:h-24
                        object-cover rounded-lg cursor-pointer border-2 transition-all
                        ${
							selectedImage === img.ImageUrl
								? 'border-green-600 scale-105 shadow-md'
								: 'border-gray-200 hover:border-green-400'
						}
                      `}
											onClick={() => setSelectedImage(img.ImageUrl)}
										/>
									))}
								</div>
							</div>
						</div>

						{/* RIGHT SIDE - Product Info (Mobile: Bottom, Desktop: Left) */}
						<div className='w-full lg:w-1/2 order-2 lg:order-1 space-y-4 sm:space-y-6'>
							<div className='relative'>
								<AddToWishList ProductId={productDetails.ProductId} />

								{/* Product Name - Responsive text */}
								<h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 pr-12 sm:pr-16 leading-tight'>
									{productDetails.ProductName}
								</h1>
							</div>

							{/* Price Section - Responsive layout */}
							<div className='bg-green-50 p-4 sm:p-6 rounded-lg border-2 border-green-200'>
								<p className='text-3xl sm:text-4xl lg:text-5xl text-green-600 font-bold'>
									€{productDetails.Price?.toFixed(2)}
								</p>

								{/* Stock Status - Responsive badge */}
								<div className='mt-3 sm:mt-4 flex items-center gap-2'>
									<Package className='w-5 h-5 text-gray-600' />
									<span className='text-sm sm:text-base text-gray-700'>
										<span className='font-semibold text-green-600'>{productDetails.InStock}</span>{' '}
										units in stock
									</span>
								</div>
							</div>

							{/* Description - Responsive text */}
							<div>
								<h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-2'>Description</h3>
								<p className='text-sm sm:text-base text-gray-600 leading-relaxed'>
									{productDetails.Description}
								</p>
							</div>

							{/* Shipping Info - Responsive cards */}
							<div className='space-y-3'>
								<h3 className='text-base sm:text-lg font-semibold text-gray-900'>Shipping Options</h3>
								<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
									<div className='flex items-center gap-3 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200'>
										<Truck className='w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0' />
										<div>
											<p className='text-xs sm:text-sm font-semibold text-gray-900'>Standard</p>
											<p className='text-sm sm:text-base font-bold text-blue-600'>
												€{productDetails.ShippingPrice}
											</p>
										</div>
									</div>

									<div className='flex items-center gap-3 p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200'>
										<Zap className='w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0' />
										<div>
											<p className='text-xs sm:text-sm font-semibold text-gray-900'>Express</p>
											<p className='text-sm sm:text-base font-bold text-purple-600'>
												€{productDetails.ExpressShippingPrice}
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Seller Info - Responsive layout */}
							<div className='p-4 sm:p-5 bg-gray-50 rounded-lg border border-gray-200'>
								<h3 className='text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3'>
									Seller Information
								</h3>
								<div className='space-y-1.5 sm:space-y-2'>
									<p className='text-sm sm:text-base'>
										<span className='text-gray-600'>Business:</span>{' '}
										<span className='font-semibold text-green-600'>
											{productDetails.BusinessName}
										</span>
									</p>
									<p className='text-sm sm:text-base'>
										<span className='text-gray-600'>Location:</span>{' '}
										<span className='font-semibold text-green-600'>{productDetails.Country}</span>
									</p>
								</div>
							</div>

							{/* Action Buttons - Responsive sizing and stacking */}
							<div className='space-y-3 sm:space-y-4 pt-2 sm:pt-4 border-t'>
								<BuyNow product={productDetails} />
								<AddToCart ProductId={productDetails.ProductId} />
							</div>
						</div>
					</div>
				</div>
			</div>

			<Suggestions />
			<Footer />
		</div>
	);
};

// const ProductDetails = () => {
// 	const [productDetails, setProductDetails] = useState(null);
// 	const [selectedImage, setSelectedImage] = useState(null);
// 	const { id } = useParams();

// 	console.log('These are the current product details', productDetails);
// 	useEffect(() => {
// 		const fetchProductDetails = async () => {
// 			try {
// 				const response = await api.get(`/products/product/details/${id}`);
// 				setProductDetails(response.data);
// 				setSelectedImage(response.data.ProductImages?.[0]?.ImageUrl); // default to first image
// 			} catch (error) {
// 				console.error('Error fetching product details:', error);
// 			}
// 		};

// 		fetchProductDetails();
// 	}, [id]);

// 	if (!productDetails) return <p>Loading...</p>;

// 	return (
// 		<>
// 			<NavBar />
// 			<div className=' flex flex-col md:flex-row gap-8 p-6 max-w-7xl mx-auto'>
// 				{/* LEFT SIDE - product info */}
// 				<div className=' relative flex-1 space-y-4'>
// 					<AddToWishList ProductId={productDetails.ProductId} />
// 					<h1 className='text-3xl font-bold text-primary'>{productDetails.ProductName}</h1>
// 					{/* <p className='text-xl text-green-600 font-semibold'>€ {productDetails.Price}</p> */}
// 					{/* <p className='text-sm text-gray-500'>Stock: {productDetails.InStock}</p> */}
// 					<p className='text-gray-600'>{productDetails.Description}</p>
// 					<p className='text-xl text-green-600 font-semibold'>Selling at: € {productDetails.Price}</p>
// 					<p>
// 						<span className='text-sm text-gray-500'>Shipping Fee: €{productDetails.ShippingPrice}</span> |{' '}
// 						<span className='text-sm text-gray-500'>
// 							Express Shipping Fee: €{productDetails.ExpressShippingPrice}
// 						</span>
// 					</p>

// 					<p className='text-sm text-muted'>
// 						<span className='text-sm text-green-600 font-semibold'>
// 							Seller: {productDetails.BusinessName}
// 						</span>{' '}
// 						|{' '}
// 						<span className='text-sm text-green-600 font-semibold'>Country: {productDetails.Country}</span>
// 					</p>
// 					<p className='text-sm text-gray-500'>Units in stock: {productDetails.InStock}</p>

// 					<button className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow-md'>
// 						Buy Now
// 					</button>
// 					<AddToCart />
// 					{/* <AddToWishList ProductId={productDetails.ProductId} /> */}
// 				</div>

// 				{/* RIGHT SIDE - product images */}
// 				<div className='flex flex-row-reverse gap-4 flex-1'>
// 					{/* Main Image */}
// 					<div className='flex-1'>
// 						<img
// 							src={selectedImage}
// 							alt='Selected product'
// 							className='w-full h-auto max-h-[500px] object-cover rounded-lg shadow'
// 						/>
// 					</div>

// 					{/* Thumbnails (vertical) */}
// 					<div className='flex flex-col gap-3'>
// 						{productDetails.ProductImages?.map((img, idx) => (
// 							<img
// 								key={img.ImageId}
// 								src={img.ImageUrl}
// 								alt={`Thumbnail ${idx}`}
// 								className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${
// 									selectedImage === img.ImageUrl ? 'border-green-600' : 'border-transparent'
// 								}`}
// 								onClick={() => setSelectedImage(img.ImageUrl)}
// 							/>
// 						))}
// 					</div>
// 				</div>
// 			</div>
// 			<Suggestions />
// 			<Footer />
// 		</>
// 	);
// };

export default ProductDetails;
