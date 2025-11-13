import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import api from '../../../api/axios';
import toast from 'react-hot-toast';

const AddToWishList = ({ ProductId }) => {
	const [isInWishlist, setIsInWishlist] = useState(false);
	const token = localStorage.getItem('token');

	// ✅ Check wishlist status when mounted
	useEffect(() => {
		if (!token) return;

		const checkWishlistStatus = async () => {
			try {
				const res = await api.get('/wishlist/items', {
					headers: { Authorization: `Bearer ${token}` },
				});

				const found = res.data.some((item) => item.ProductId === ProductId);
				setIsInWishlist(found);
			} catch (err) {
				console.error('Error checking wishlist status:', err);
			}
		};

		checkWishlistStatus();
	}, [ProductId, token]);

	// ✅ Toggle wishlist status
	const handleToggle = async () => {
		if (!token) {
			toast.error('Please log in to use wishlist');
			return;
		}

		try {
			if (isInWishlist) {
				await api.delete(`/wishlist/quick-remove/${ProductId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				setIsInWishlist(false);
				toast.success('Removed from wishlist');
			} else {
				await api.post(
					'/wishlist/add-to-wishlist',
					{ ProductId },
					{ headers: { Authorization: `Bearer ${token}` } }
				);
				setIsInWishlist(true);
				toast.success('Added to wishlist');
			}
		} catch (err) {
			console.error('Wishlist toggle failed:', err);
			toast.error('Something went wrong');
		}
	};

	return (
		<button
			onClick={handleToggle}
			className='absolute top-3 right-3 p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition'
			aria-label='Toggle wishlist'
		>
			<Heart
				size={22}
				fill={isInWishlist ? 'red' : 'none'}
				stroke={isInWishlist ? 'red' : 'black'}
				className='transition-transform hover:scale-110'
			/>
		</button>
	);
};

export default AddToWishList;
