import { useNavigate } from 'react-router-dom';
import ProductDetails from './ProductDetails';
import AddToCart from '../../cart/components/AddToCart';
import { CreditCard, ShoppingBag } from 'lucide-react';
import AddToWishList from '../../wishlist/components/AddToWishlist';

const ProductCard = (props) => {
	const { ProductId, ProductName, Description, Price, InStock, ImageUrl, BusinessName, Country } = props;
	const navigate = useNavigate();
	const handleClick = (id) => {
		//save the scroll position here so we go back to it
		sessionStorage.setItem('scrollPosition', window.scrollY);
		navigate(`/product/${id}`);
	};
	return (
		<article className='bg-surface rounded-lg shadow-sm border border-border overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer'>
			{/* <div onClick={() => handleClick(ProductId)}>
				<img
					className='w-full h-48 object-cover'
					src={ImageUrl}
					alt={`products ${ProductName} picture`}
					loading='lazy'
				/> */}
			<div onClick={() => handleClick(ProductId)}>
				<div className='relative'>
					<img
						className='w-full h-48 object-cover'
						src={ImageUrl}
						alt={`${ProductName} picture`}
						loading='lazy'
					/>
					{/* <AddToWishList ProductId={ProductId} /> */}
				</div>
				<div className='p-4 flex flex-col flex-grow'>
					<h2 className='text-primary font-semibold text-lg truncate'>{ProductName}</h2>
					<p className='text-secondary text-sm flex-grow mt-1 truncate'>{Description}</p>
					<p className='mt-2 font-semibold text-primary'>€ {Price}</p>
					{/* <p className='display-stock'> {InStock}</p> */}
					<p className='mt-2 text-xs text-muted'>
						Seller: {BusinessName} | {Country}
					</p>
				</div>
			</div>
			{/* <ShoppingBag /> <CreditCard /> */}
			<AddToCart ProductId={ProductId} />
			{/* <AddToWishList ProductId={ProductId} /> */}
		</article>
	);
};
export default ProductCard;
