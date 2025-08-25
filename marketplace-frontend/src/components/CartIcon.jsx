import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CartIcon = () => {
	const navigate = useNavigate();

	const handleClick = () => {
		navigate('/cart');
	};

	return (
		<button
			onClick={handleClick}
			className='text-gray-500 hover:text-baseGreen transition-colors'
			aria-label='Go to Cart'
		>
			<ShoppingCart size={30} />
		</button>
	);
};

export default CartIcon;
