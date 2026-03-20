import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import api from '../../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../utils/useAuth';

const AddToWishList = ({ ProductId }) => {
	const [isInWishlist, setIsInWishlist] = useState(false);
	const { isLoggedIn } = useAuth();

	// Check wishlist status when mounted
	useEffect(() => {
		if (!isLoggedIn) return;

		const checkWishlistStatus = async () => {
			try {
				const res = await api.get('/wishlist/items');
				const found = res.data.some((item) => item.ProductId === ProductId);
				setIsInWishlist(found);
			} catch (err) {
				console.error('Error checking wishlist status:', err);
			}
		};

		checkWishlistStatus();
	}, [ProductId, isLoggedIn]);

	// Toggle wishlist status
	const handleToggle = async () => {
		if (!isLoggedIn) {
			toast.error('Please log in to use wishlist');
			return;
		}

		try {
			if (isInWishlist) {
				await api.delete(`/wishlist/quick-remove/${ProductId}`);
				setIsInWishlist(false);
				toast.success('Removed from wishlist');
			} else {
				await api.post('/wishlist/add-to-wishlist', { ProductId });
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
