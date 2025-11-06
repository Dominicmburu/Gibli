import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios'; // ✅ adjust path if different

const CartIcon = () => {
	const navigate = useNavigate();
	const [cartCount, setCartCount] = useState(0);

	const handleClick = () => {
		navigate('/cart');
	};

	useEffect(() => {
		const fetchCartCount = async () => {
			try {
				const res = await api.get('/cart/items');
				if (Array.isArray(res.data)) {
					setCartCount(res.data.length);
				}
			} catch (err) {
				console.error('Error fetching cart count:', err);
			}
		};

		fetchCartCount();

		// optional: auto-refresh every 30 seconds
		// const interval = setInterval(fetchCartCount, 30000);
		// return () => clearInterval(interval);
	}, []);

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
