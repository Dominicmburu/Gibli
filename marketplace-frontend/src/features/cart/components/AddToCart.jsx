import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import toast from 'react-hot-toast';
import { useCart } from '../../../context/CartContext';
import { ShoppingCart } from 'lucide-react';

const AddToCart = ({ ProductId }) => {
	const params = useParams();
	const navigate = useNavigate();
	const { refreshCart } = useCart();
	const id = ProductId || params.id;

	const addItemToCart = async () => {
		const token = localStorage.getItem('token');
		if (!token) {
			toast.error('Please log in to add items to your cart.');
			navigate('/login');
			return;
		}

		try {
			const response = await api.post('/cart/additem', { ProductId: id });
			refreshCart();
			toast.success('Item added to cart!');
		} catch (error) {
			toast.error('Failed to add item to cart. Please try again.');
			console.error('Add to cart error:', error);
		}
	};

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
