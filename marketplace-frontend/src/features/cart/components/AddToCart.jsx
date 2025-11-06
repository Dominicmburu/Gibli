import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../api/axios';
import toast from 'react-hot-toast';

const AddToCart = ({ ProductId }) => {
	// const { id } = useParams();
	const params = useParams();
	const id = ProductId || params.id;
	// const [message, setMessage] = useState(null);

	const addItemToCart = async () => {
		const token = localStorage.getItem('token');
		if (!token) {
			setMessage('⚠️ Please log in to add items to your cart.');
			toast.error('⚠️ Please log in to add items to your cart.');

			setTimeout(() => setMessage(null), 3000); // clear after 3s
			return;
		}

		try {
			// console.log('Token being sent:', localStorage.getItem('token'));
			console.log('/cart/additem', { ProductId: id });
			const response = await api.post('/cart/additem', { ProductId: id });
			toast.success(' Item added to cart successfully!');
			console.log('Item added:', response.data);
		} catch (error) {
			toast.error(' Failed to add item to cart. Please restart your session by logging in');
			if (error.response) {
				console.error('Error status:', error.response.status);
				console.error('Error data:', error.response.data); // <-- server message
				console.error('Error headers:', error.response.headers);
			} else if (error.request) {
				console.error('No response received:', error.request);
			} else {
				console.error('Axios error:', error.message);
			}
		}
	};

	return (
		<div>
			<button
				onClick={addItemToCart}
				className='w-full bg-amber-500 hover:bg-amber-600 btn-accent px-6 py-2 rounded shadow hover:shadow-md transition-all'
			>
				Add to Cart
			</button>
		</div>
	);
};

export default AddToCart;
