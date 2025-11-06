import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import NavBar from '../../../components/NavBar';

const WishList = () => {
	const navigate = useNavigate();
	const [wishItems, setWishItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Fetch wishlist items on mount
	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) {
			console.log('taking you to login');
			navigate('/login');
			return;
		}

		const fetchWishItems = async () => {
			try {
				const res = await api.get('/wishlist/items');
				setWishItems(res.data || []);
				console.log('wishlist items', res.data);
			} catch (err) {
				console.error('Error fetching wishlist items:', err);
				setError('Unable to load wishlist. Please log in.');
			} finally {
				setLoading(false);
			}
		};
		fetchWishItems();
	}, [navigate]);

	// Remove single item
	const removeItem = async (itemId) => {
		try {
			await api.delete(`/wishlist/remove/${itemId}`);
			setWishItems((prev) => prev.filter((i) => i.WishListItemId !== itemId));
		} catch (err) {
			console.error('Error removing wishlist item:', err);
		}
	};

	// Clear entire wishlist
	const clearWishList = async () => {
		try {
			await api.delete('/wishlist/clear');
			setWishItems([]);
		} catch (err) {
			console.error('Error clearing wishlist:', err);
		}
	};

	if (loading) return <p className='p-6'>Loading wishlist...</p>;
	if (error) return <p className='p-6 text-red-600'>{error}</p>;

	return (
		<>
			<NavBar />
			<main className='max-w-5xl mx-auto p-4 mt-20 bg-white rounded shadow'>
				<h1 className='text-2xl font-semibold mb-4'>Your Wishlist</h1>

				{wishItems.length === 0 ? (
					<p className='text-gray-600'>Your wishlist is empty.</p>
				) : (
					<div className='space-y-4'>
						{wishItems.map((item) => (
							<div
								key={item.ProductId}
								className='flex items-center justify-between border p-4 rounded shadow-sm'
							>
								<div className='flex items-center space-x-4'>
									<img
										src={item.ProductImageUrl || '/placeholder.jpg'}
										alt={item.ProductName || 'Product Image'}
										className='w-20 h-20 object-cover rounded'
									/>
									<div>
										<h3 className='font-semibold text-lg'>{item.ProductName}</h3>
									</div>
									<div className='text-capitalize'>
										<p className='text-sm text-gray-600'>Price per unit: € {item.Price}</p>
									</div>
								</div>

								<button
									onClick={() => removeItem(item.WishListItemId)}
									aria-label='Remove item from wishlist'
									className='ml-4 text-red-600 hover:text-red-800'
								>
									Remove
								</button>
							</div>
						))}
					</div>
				)}

				{wishItems.length > 0 && (
					<div className='mt-6 flex justify-end border-t pt-4'>
						<button
							onClick={clearWishList}
							className='bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700'
						>
							Clear Wishlist
						</button>
					</div>
				)}
			</main>
		</>
	);
};

export default WishList;
