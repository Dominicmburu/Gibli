import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CartIcon = () => {
	const navigate = useNavigate();
	const { cartCount } = useCart();

	const handleClick = () => {
		navigate('/cart');
	};

	return (
		<div className='relative'>
			<button
				onClick={handleClick}
				className='text-gray-500 hover:text-baseGreen transition-colors'
				aria-label='Go to Cart'
			>
				<ShoppingCart size={30} />
			</button>

			{cartCount > 0 && (
				<span className='absolute -top-1 -right-1 bg-red-600 text-white text-xs font-semibold rounded-full px-1.5 py-0.5'>
					{cartCount}
				</span>
			)}
		</div>
	);
};

export default CartIcon;
