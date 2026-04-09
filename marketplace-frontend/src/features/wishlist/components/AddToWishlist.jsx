import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import api from '../../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../utils/useAuth';

const AddToWishList = ({ ProductId }) => {
	const [isInWishlist, setIsInWishlist] = useState(false);
	const { isLoggedIn } = useAuth();

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
			aria-label='Toggle wishlist'
			className='flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 bg-white border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 flex-shrink-0'
		>
			<Heart
				size={16}
				fill={isInWishlist ? 'red' : 'none'}
				stroke={isInWishlist ? 'red' : 'currentColor'}
				className='transition-transform hover:scale-110 text-gray-500'
			/>
		</button>
	);
};

export default AddToWishList;