// src/features/wishlist/components/AddToWishList.jsx
import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import api from '../../../api/axios';
import toast from 'react-hot-toast';

const AddToWishList = ({ ProductId }) => {
	const [isInWishlist, setIsInWishlist] = useState(false);
	const token = localStorage.getItem('token'); // ensure the JWT is stored

	// ✅ Check if product is already in wishlist when mounted
	useEffect(() => {
		const checkWishlistStatus = async () => {
			try {
				const res = await api.get(`/wishlist/items`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (!res.ok) return;

				const data = await res.data();
				const found = data.some((item) => item.ProductId === ProductId);
				setIsInWishlist(found);
				console.log(isInWishlist);
			} catch (error) {
				console.error('Failed to check wishlist status:', error);
			}
		};

		if (token) checkWishlistStatus();
	}, [ProductId, token]);

	// ✅ Handle toggling wishlist status
	const handleToggle = async () => {
		if (!token) {
			alert('Please log in to add items to your wishlist.');
			return;
		}

		try {
			//check if the item is already in wishlist
			//so that we can know what happens in the toggle heart functionality.
			// If item is  in wish list, when heart is clicked, remove the red fill from heart icon and consequently remove from wishlist

			if (isInWishlist) {
				try {
					console.log(`Product ${ProductId} is already in wishlist`);

					// Remove from wishlist
					const res = await api.delete(`/wishlist/quick-remove/${ProductId}`);
					console.log('After delete', res);
					setIsInWishlist(false);
					toast.success('Product removed from wishlist');
				} catch (error) {
					console.error(error);
				}
			}
			//else If item is not in wish list, when heart is clicked, make the heart filled with red and consequently add to wishlist
			else {
				// Add to wishlist
				try {
					const res = await api.post(`/wishlist/add-to-wishlist`, { ProductId });
					toast.success('Added to wishlist');
					console.log(`This is the reponse after the post req`, res);
					setIsInWishlist(true);
					console.log(`Item ${ProductId} has been added to wishlist`);
				} catch (error) {
					console.error(error);
				}
			}
		} catch (error) {
			console.error('Error updating wishlist:', error);
		}
	};

	return (
		<button
			onClick={handleToggle}
			className='w-full bg-amber-500 hover:bg-amber-600 btn-accent px-6 py-2 rounded shadow hover:shadow-md transition-all'
		>
			{/* <button
			onClick={handleToggle}
			className='absolute top-3 right-3 p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition'
		> */}
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
