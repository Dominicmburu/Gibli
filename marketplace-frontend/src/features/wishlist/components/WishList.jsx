import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, Store, MapPin, Loader2 } from 'lucide-react';
import api from '../../../api/axios';
import NavBar from '../../../components/NavBar';
import Footer from '../../../components/Footer';
import AddToCart from '../../cart/components/AddToCart';
import toast from 'react-hot-toast';
import { useAuth } from '../../../utils/useAuth';

const WishList = () => {
	const navigate = useNavigate();
	const { isLoggedIn, loading: authLoading } = useAuth();
	const [wishItems, setWishItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Fetch wishlist items on mount
	useEffect(() => {
		if (authLoading) return;
		if (!isLoggedIn) {
			navigate('/login');
			return;
		}

		const fetchWishItems = async () => {
			try {
				const res = await api.get('/wishlist/items');
				setWishItems(res.data || []);
			} catch (err) {
				console.error('Error fetching wishlist items:', err);
				setError('Unable to load wishlist. Please log in.');
			} finally {
				setLoading(false);
			}
		};
		fetchWishItems();
	}, [isLoggedIn, authLoading, navigate]);

	// Remove single item
	const removeItem = async (itemId) => {
		try {
			await api.delete(`/wishlist/remove/${itemId}`);
			setWishItems((prev) => prev.filter((i) => i.WishListItemId !== itemId));
			toast.success('Removed from wishlist');
		} catch (err) {
			console.error('Error removing wishlist item:', err);
			toast.error('Failed to remove item');
		}
	};

	// Clear entire wishlist
	const clearWishList = async () => {
		if (!window.confirm('Are you sure you want to clear your entire wishlist?')) return;
		try {
			await api.delete('/wishlist/clear');
			setWishItems([]);
			toast.success('Wishlist cleared');
		} catch (err) {
			console.error('Error clearing wishlist:', err);
			toast.error('Failed to clear wishlist');
		}
	};

	// Loading State
	if (loading) {
		return (
			<div className='min-h-screen flex flex-col bg-gray-50'>
				<NavBar />
				<div className='flex-1 flex items-center justify-center'>
					<div className='text-center'>
						<Loader2 size={48} className='animate-spin text-primary-500 mx-auto mb-4' />
						<p className='text-gray-600 text-sm sm:text-base'>Loading your wishlist...</p>
					</div>
				</div>
			</div>
		);
	}

	// Error State
	if (error) {
		return (
			<div className='min-h-screen flex flex-col bg-gray-50'>
				<NavBar />
				<div className='flex-1 flex items-center justify-center px-4'>
					<div className='text-center'>
						<p className='text-red-600 text-base sm:text-lg mb-4'>{error}</p>
						<button
							onClick={() => navigate('/login')}
							className='bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors'
						>
							Go to Login
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen flex flex-col bg-gray-50'>
			<NavBar />

			<main className='flex-1 max-w-6xl mx-auto w-full px-2 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-12'>
				{/* Page Header */}
				<div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6'>
					<div className='flex items-center justify-between'>
						<h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3'>
							<Heart className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-red-500' fill='currentColor' />
							My Wishlist
						</h1>
						{wishItems.length > 0 && (
							<div className='flex items-center gap-3'>
								<span className='text-sm sm:text-base text-gray-600'>
									{wishItems.length} item{wishItems.length !== 1 ? 's' : ''}
								</span>
								<button
									onClick={clearWishList}
									className='hidden sm:flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium'
								>
									<Trash2 size={16} />
									Clear All
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Empty Wishlist State */}
				{wishItems.length === 0 ? (
					<div className='bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center'>
						<Heart size={64} className='mx-auto text-gray-300 mb-4' />
						<h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-2'>Your wishlist is empty</h2>
						<p className='text-sm sm:text-base text-gray-600 mb-6'>Save products you love by clicking the heart icon!</p>
						<button
							onClick={() => navigate('/')}
							className='bg-primary-500 text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg hover:bg-primary-600 transition-colors text-sm sm:text-base font-medium'
						>
							Discover Products
						</button>
					</div>
				) : (
					<>
						{/* Mobile Clear All Button */}
						<div className='sm:hidden mb-3'>
							<button
								onClick={clearWishList}
								className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg transition-colors text-sm font-medium'
							>
								<Trash2 size={16} />
								Clear All Items
							</button>
						</div>

						{/* Wishlist Items */}
						<div className='space-y-3 sm:space-y-4'>
							<AnimatePresence>
								{wishItems.map((item) => (
									<motion.div
										key={item.WishListItemId || item.ProductId}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, x: -100 }}
										className='bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow'
									>
										{/* Mobile Layout (< 640px) */}
										<div className='sm:hidden p-4 space-y-3'>
											{/* Product Image & Name */}
											<div className='flex gap-3'>
												<img
													src={item.ProductImageUrl || '/placeholder.jpg'}
													alt={item.ProductName || 'Product Image'}
													className='w-20 h-20 object-cover rounded flex-shrink-0 cursor-pointer'
													onClick={() => navigate(`/product/${item.ProductId}`)}
												/>
												<div className='flex-1 min-w-0'>
													<h3
														className='font-semibold text-sm line-clamp-2 mb-1 cursor-pointer hover:text-primary-600'
														onClick={() => navigate(`/product/${item.ProductId}`)}
													>
														{item.ProductName}
													</h3>
													<p className='text-lg font-bold text-primary-600'>€{Number(item.Price).toFixed(2)}</p>
												</div>
											</div>

											{/* Seller Info */}
											{(item.SellerName || item.SellerCountry) && (
												<div className='flex flex-col gap-1 text-xs text-gray-600 bg-gray-50 p-2 rounded'>
													{item.SellerName && (
														<div className='flex items-center gap-1.5'>
															<Store size={14} className='text-gray-500 flex-shrink-0' />
															<span className='font-medium truncate'>{item.SellerName}</span>
														</div>
													)}
													{item.SellerCountry && (
														<div className='flex items-center gap-1.5'>
															<MapPin size={14} className='text-gray-500 flex-shrink-0' />
															<span className='truncate'>{item.SellerCountry}</span>
														</div>
													)}
												</div>
											)}

											{/* Actions */}
											<div className='flex items-center gap-2'>
												<div className='flex-1'>
													<AddToCart ProductId={item.ProductId} />
												</div>
												<button
													onClick={() => removeItem(item.WishListItemId)}
													className='p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
													aria-label='Remove from wishlist'
												>
													<Trash2 size={18} />
												</button>
											</div>
										</div>

										{/* Tablet & Desktop Layout (>= 640px) */}
										<div className='hidden sm:flex items-center p-4 md:p-6 gap-4 lg:gap-6'>
											{/* Product Image */}
											<img
												src={item.ProductImageUrl || '/placeholder.jpg'}
												alt={item.ProductName || 'Product Image'}
												className='w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-cover rounded flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity'
												onClick={() => navigate(`/product/${item.ProductId}`)}
											/>

											{/* Product Info */}
											<div className='flex-1 min-w-0'>
												<h3
													className='font-semibold text-base md:text-lg mb-2 line-clamp-2 cursor-pointer hover:text-primary-600 transition-colors'
													onClick={() => navigate(`/product/${item.ProductId}`)}
												>
													{item.ProductName}
												</h3>
												<p className='text-xl md:text-2xl font-bold text-primary-600 mb-3'>
													€{Number(item.Price).toFixed(2)}
												</p>

												{/* Seller Info */}
												{(item.SellerName || item.SellerCountry) && (
													<div className='flex flex-wrap gap-3 md:gap-4 text-sm text-gray-600'>
														{item.SellerName && (
															<div className='flex items-center gap-1.5'>
																<Store size={16} className='text-gray-500' />
																<span className='font-medium'>{item.SellerName}</span>
															</div>
														)}
														{item.SellerCountry && (
															<div className='flex items-center gap-1.5'>
																<MapPin size={16} className='text-gray-500' />
																<span>{item.SellerCountry}</span>
															</div>
														)}
													</div>
												)}
											</div>

											{/* Add to Cart */}
											<div className='w-40 lg:w-48'>
												<AddToCart ProductId={item.ProductId} />
											</div>

											{/* Remove Button */}
											<button
												onClick={() => removeItem(item.WishListItemId)}
												className='text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg flex items-center gap-1 text-sm font-medium transition-colors'
												aria-label='Remove from wishlist'
											>
												<Trash2 size={18} />
												<span className='hidden lg:inline'>Remove</span>
											</button>
										</div>
									</motion.div>
								))}
							</AnimatePresence>
						</div>
					</>
				)}
			</main>

			<Footer />
		</div>
	);
};

export default WishList;
