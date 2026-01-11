import { useNavigate } from 'react-router-dom';
import ProductDetails from './ProductDetails';
import AddToCart from '../../cart/components/AddToCart';
import AddToWishList from '../../wishlist/components/AddToWishlist';

import { ShoppingBag } from 'lucide-react';

const ProductCard = (props) => {
	const { ProductId, ProductName, Description, Price, InStock, ImageUrl, BusinessName, Country } = props;

	const handleClick = (id) => {
		// Save the scroll position here so we go back to it
		sessionStorage.setItem('scrollPosition', window.scrollY);
		window.location.href = `/product/${id}`;
	};

	return (
		<article className='bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 h-full'>
			{/* Image Section - Clickable */}
			<div onClick={() => handleClick(ProductId)} className='cursor-pointer group'>
				{/* Image Container - Responsive aspect ratio */}
				<div className='relative w-full aspect-square sm:aspect-[4/3] lg:aspect-square overflow-hidden bg-gray-100'>
					<img
						className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-300'
						src={ImageUrl}
						alt={`${ProductName} picture`}
						loading='lazy'
					/>

					{/* Stock Badge - Responsive positioning */}
					{InStock <= 5 && InStock > 0 && (
						<div className='absolute top-2 right-2 bg-orange-500 text-white text-xs sm:text-sm font-semibold px-2 py-1 rounded-full shadow-md'>
							Only {InStock} left
						</div>
					)}

					{InStock === 0 && (
						<div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
							<span className='text-white text-base sm:text-lg font-bold'>Out of Stock</span>
						</div>
					)}
				</div>

				{/* Product Info - Clickable, Responsive padding */}
				<div className='p-3 sm:p-4 flex flex-col flex-grow'>
					{/* Product Name - Responsive text with proper truncation */}
					<h2 className='text-gray-900 font-semibold text-sm sm:text-base lg:text-lg line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] group-hover:text-green-600 transition-colors'>
						{ProductName}
					</h2>

					{/* Price - Responsive sizing */}
					<p className='mt-2 sm:mt-3 font-bold text-green-600 text-lg sm:text-xl lg:text-2xl'>
						€{Price?.toFixed(2)}
					</p>

					{/* Seller Info - Responsive text size */}
					<p className='mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500 truncate'>
						Seller: <span className='font-medium text-gray-700'>{BusinessName}</span>
					</p>

					{/* Country - Show only on larger screens */}
					{Country && <p className='hidden sm:block mt-1 text-xs text-gray-400'>{Country}</p>}
				</div>
			</div>

			{/* Add to Cart Button - Responsive padding, always at bottom */}
			<div className='p-3 sm:p-4 pt-0 mt-auto'>
				<AddToCart ProductId={ProductId} />
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
