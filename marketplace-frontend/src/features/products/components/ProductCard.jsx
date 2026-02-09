import { useNavigate } from 'react-router-dom';
import ProductDetails from './ProductDetails';
import AddToCart from '../../cart/components/AddToCart';
import AddToWishList from '../../wishlist/components/AddToWishlist';

import { MapPin } from 'lucide-react';

const ProductCard = (props) => {
	const { ProductId, ProductName, Description, Price, InStock, ImageUrl, BusinessName, Country } = props;

	const handleClick = (id) => {
		// Save the scroll position here so we go back to it
		sessionStorage.setItem('scrollPosition', window.scrollY);
		window.location.href = `/product/${id}`;
	};

	return (
		<article className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-primary-500/10 hover:border-primary-200 transition-all duration-300 h-full group/card'>
			{/* Image Section - Clickable */}
			<div onClick={() => handleClick(ProductId)} className='cursor-pointer group'>
				{/* Image Container - Responsive aspect ratio */}
				<div className='relative w-full aspect-square sm:aspect-[4/3] lg:aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100'>
					<img
						className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
						src={ImageUrl}
						alt={`${ProductName} picture`}
						loading='lazy'
					/>

					{/* Gradient Overlay on Hover */}
					<div className='absolute inset-0 bg-gradient-to-t from-primary-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>

					{/* Top Badges Row */}
					<div className='absolute top-3 left-3 right-3 flex justify-between items-start'>
						{/* Stock Badge */}
						{InStock <= 5 && InStock > 0 && (
							<div className='bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse'>
								Only {InStock} left!
							</div>
						)}

						{/* New Badge - Show for first few products */}
						{InStock > 10 && (
							<div className='bg-gradient-to-r from-secondary-400 to-secondary-500 text-primary-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg'>
								NEW
							</div>
						)}
					</div>

					{/* Wishlist Button */}
					<div
						className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300'
						onClick={(e) => e.stopPropagation()}
					>
						<AddToWishList ProductId={ProductId} />
					</div>

					{/* Out of Stock Overlay */}
					{InStock === 0 && (
						<div className='absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/60 to-gray-900/40 flex items-center justify-center backdrop-blur-[2px]'>
							<div className='bg-white/95 text-gray-800 text-sm sm:text-base font-bold px-6 py-2 rounded-full shadow-xl'>
								Out of Stock
							</div>
						</div>
					)}

					{/* Quick View on Hover */}
					<div className='absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300'>
						<span className='bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg whitespace-nowrap'>
							Quick View
						</span>
					</div>
				</div>

				{/* Product Info - Clickable, Responsive padding */}
				<div className='p-4 sm:p-5 flex flex-col flex-grow'>
					{/* Product Name - Responsive text with proper truncation */}
					<h2 className='text-gray-900 font-semibold text-sm sm:text-base lg:text-lg line-clamp-2 min-h-[2.0rem] sm:min-h-[2.5rem] group-hover:text-primary-600 transition-colors duration-200'>
						{ProductName}
					</h2>

					{/* Price Section */}
					<div className='mt-3 sm:mt-4 flex items-baseline justify-center'>
						<p className='font-bold text-primary-600 text-xl sm:text-2xl'>
							€{Price?.toFixed(2)}
						</p>
					</div>

					{/* Divider */}
					<div className='h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-3'></div>

					{/* Seller Info */}
					<div className='flex items-center text-gray-500'>
						<div className='w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center'>
							<span className='text-xs font-bold text-primary-600'>
								{BusinessName?.charAt(0)?.toUpperCase()}
							</span>
						</div>
						<p className='text-xs sm:text-sm truncate flex-1'>
							<span className='font-medium text-gray-700'>{BusinessName}</span>
						</p>
					</div>

					{/* Country - With icon */}
					{Country && (
						<div className='flex items-center gap-1.5 mt-2 text-gray-400'>
							<MapPin size={12} />
							<p className='text-xs'>{Country}</p>
						</div>
					)}
				</div>
			</div>

			{/* Add to Cart Button - Enhanced styling */}
			<div className='p-4 sm:p-5 pt-0 mt-auto'>
				<div className='transform group-hover/card:scale-[1.02] transition-transform duration-200'>
					<AddToCart ProductId={ProductId} />
				</div>
			</div>
		</article>
	);
};
// const ProductCard = (props) => {
// 	const { ProductId, ProductName, Description, Price, InStock, ImageUrl, BusinessName, Country } = props;
// 	const navigate = useNavigate();
// 	const handleClick = (id) => {
// 		//save the scroll position here so we go back to it
// 		sessionStorage.setItem('scrollPosition', window.scrollY);
// 		navigate(`/product/${id}`);
// 	};
// 	return (
// 		<article className='bg-surface rounded-lg shadow-sm border border-border overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer'>
// 			<div onClick={() => handleClick(ProductId)}>
// 				<div className='relative'>
// 					<img
// 						className='w-full h-48 object-cover'
// 						src={ImageUrl}
// 						alt={`${ProductName} picture`}
// 						loading='lazy'
// 					/>
// 				</div>
// 				<div className='p-4 flex flex-col flex-grow'>
// 					<h2 className='text-primary font-semibold text-lg truncate'>{ProductName}</h2>
// 					<p className='mt-2 font-semibold text-primary'>€ {Price}</p>
// 					<p className='mt-2 text-xs text-muted'>Seller: {BusinessName}</p>
// 					{/* <p className='mt-2 text-xs text-muted'>
// 						Seller: {BusinessName} | {Country}
// 					</p> */}
// 				</div>
// 			</div>

// 			<AddToCart ProductId={ProductId} />
// 		</article>
// 	);
// };
export default ProductCard;
