import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import toast from 'react-hot-toast';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../utils/useAuth';
import { ShoppingCart } from 'lucide-react';

const AddToCart = ({ ProductId, SellerId = null }) => {
	const params = useParams();
	const navigate = useNavigate();
	const { refreshCart } = useCart();
	const { isLoggedIn, userInfo } = useAuth();
	const id = ProductId || params.id;
	const isOwnProduct = SellerId && userInfo?.role === 'Seller' && userInfo?.id === SellerId;

	const addItemToCart = async () => {
		if (!isLoggedIn) {
			toast.error('Please log in to add items to your cart.');
			navigate('/login');
			return;
		}

		try {
			await api.post('/cart/additem', { ProductId: id });
			refreshCart();
			toast.success('Item added to cart!');
		} catch (error) {
			const msg = error.response?.data?.message || 'Failed to add item to cart. Please try again.';
			toast.error(msg);
			console.error('Add to cart error:', error);
		}
	};

	if (isOwnProduct) {
		return (
			<button
				disabled
				className='w-full bg-gray-100 text-gray-400 font-medium px-4 py-2.5 rounded-lg cursor-not-allowed flex items-center justify-center'
				title='You cannot add your own products to cart'
			>
				<ShoppingCart size={16} />
				<span className='hidden sm:inline' style={{ paddingLeft: '4px', fontSize: '14px' }}>Your Product</span>
			</button>
		);
	}

	return (
		<button
			onClick={addItemToCart}
			className='w-full bg-secondary-500 hover:bg-secondary-600 text-primary-900 font-medium px-4 py-2.5 rounded-lg shadow hover:shadow-md transition-all flex items-center justify-center'
		>
			<ShoppingCart size={16} />
			<span className='hidden sm:inline' style={{ paddingLeft: '4px', fontSize: '14px' }}>Add to Cart</span>
		</button>
	);
};

export default AddToCart;
