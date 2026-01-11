import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import NavBar from '../../../components/NavBar';
import Footer from '../../../components/Footer';
import { MapPin, Store, Minus, Plus, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../../context/CartContext';

const Cart = () => {
	const navigate = useNavigate();
	const [cartItems, setCartItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const { refreshCart } = useCart();

	console.log(cartItems);

	// Check for token presence on mount
	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) {
			console.log('found no token');
			navigate('/login');
			return;
		}

		const fetchCartItems = async () => {
			try {
				const res = await api.get('/cart/items');
				setCartItems(res.data || []);
			} catch (err) {
				console.error('Error fetching cart items:', err);
				setError('Unable to load cart. Please log in.');
				navigate('/login');
			} finally {
				setLoading(false);
			}
		};

		fetchCartItems();
	}, [navigate]);

	// Update item quantity
	const updateQuantity = async (cartItemId, change) => {
		setCartItems((prev) =>
			prev.map((item) =>
				item.CartItemId === cartItemId ? { ...item, Quantity: Math.max(1, item.Quantity + change) } : item
			)
		);

		try {
			const item = cartItems.find((i) => i.CartItemId === cartItemId);
			if (!item) return;

			const newQty = Math.max(1, item.Quantity + change);
			await api.put(`/cart/update/${cartItemId}`, { Quantity: newQty });
		} catch (err) {
			console.error('Failed to update quantity:', err);
			toast.error('Failed to update quantity');
		}
	};

	// Remove single item
	const removeItem = async (cartItemId) => {
		try {
			await api.delete(`/cart/remove/${cartItemId}`);
			refreshCart();
			setCartItems((prev) => prev.filter((i) => i.CartItemId !== cartItemId));
			toast.success('Item removed from cart');
		} catch (err) {
			console.error('Error removing item:', err);
			toast.error('Failed to remove item');
		}
	};

	// Clear entire cart
	const clearCart = async () => {
		if (!window.confirm('Are you sure you want to clear your entire cart?')) return;

		try {
			await api.delete('/cart/clear');
			refreshCart();
			setCartItems([]);
			toast.success('Cart cleared');
		} catch (err) {
			console.error('Error clearing cart:', err);
			toast.error('Failed to clear cart');
		}
	};

	// Proceed to checkout
	const proceedToCheckout = async () => {
		try {
			const res = await api.post('/checkout/proceed');
			if (res.data.url) {
				console.log(res);
				// window.location.href = res.data.url; // redirect to checkout
			} else {
				toast.error('Something went wrong. No checkout URL received.');
			}
		} catch (err) {
			console.error('Checkout error:', err);
			toast.error('Checkout failed. Please try again.');
		}
	};

	const finalizeCheckout = async () => {
		navigate('/finalize-checkout');
	};

	const total = cartItems.reduce((sum, item) => sum + item.Quantity * Number(item.Price), 0);

	// Loading State
	if (loading) {
		return (
			<div className='min-h-screen flex flex-col'>
				<NavBar />
				<div className='flex-1 flex items-center justify-center'>
					<div className='text-center'>
						<Loader2 size={48} className='animate-spin text-green-600 mx-auto mb-4' />
						<p className='text-gray-600 text-sm sm:text-base'>Loading your cart...</p>
					</div>
				</div>
			</div>
		);
	}

	// Error State
	if (error) {
		return (
			<div className='min-h-screen flex flex-col'>
				<NavBar />
				<div className='flex-1 flex items-center justify-center px-4'>
					<div className='text-center'>
						<p className='text-red-600 text-base sm:text-lg mb-4'>{error}</p>
						<button
							onClick={() => navigate('/login')}
							className='bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors'
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

			<main className='flex-1 max-w-6xl mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 pb-32 sm:pb-36 lg:pb-40'>
				{/* Page Header - Responsive */}
				<div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6'>
					<div className='flex items-center justify-between'>
						<h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3'>
							<ShoppingCart className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-green-600' />
							Your Cart
						</h1>
						{cartItems.length > 0 && (
							<span className='text-sm sm:text-base text-gray-600'>
								{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
							</span>
						)}
					</div>
				</div>

				{/* Empty Cart State */}
				{cartItems.length === 0 ? (
					<div className='bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center'>
						<ShoppingCart size={64} className='mx-auto text-gray-300 mb-4' />
						<h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-2'>Your cart is empty</h2>
						<p className='text-sm sm:text-base text-gray-600 mb-6'>Add some products to get started!</p>
						<button
							onClick={() => navigate('/')}
							className='bg-green-600 text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium'
						>
							Continue Shopping
						</button>
					</div>
				) : (
					<>
						{/* Cart Items - Responsive Cards */}
						<div className='space-y-3 sm:space-y-4'>
							{cartItems.map((item) => {
								const itemTotal = item.Quantity * Number(item.Price);

								return (
									<div
										key={item.CartItemId}
										className='bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow'
									>
										{/* Mobile Layout (< 640px) */}
										<div className='sm:hidden p-4 space-y-3'>
											{/* Product Image & Name */}
											<div className='flex gap-3'>
												<img
													src={item.ProductImageUrl || '/placeholder.jpg'}
													alt={item.ProductName || 'Product Image'}
													className='w-20 h-20 object-cover rounded flex-shrink-0'
												/>
												<div className='flex-1 min-w-0'>
													<h3 className='font-semibold text-sm line-clamp-2 mb-1'>
														{item.ProductName}
													</h3>
													<p className='text-xs text-gray-600'>€{item.Price} each</p>
												</div>
											</div>

											{/* Seller Info */}
											<div className='flex flex-col gap-1 text-xs text-gray-600 bg-gray-50 p-2 rounded'>
												<div className='flex items-center gap-1.5'>
													<Store size={14} className='text-gray-500 flex-shrink-0' />
													<span className='font-medium truncate'>{item.SellerName}</span>
												</div>
												<div className='flex items-center gap-1.5'>
													<MapPin size={14} className='text-gray-500 flex-shrink-0' />
													<span className='truncate'>{item.SellerCountry}</span>
												</div>
											</div>

											{/* Quantity Controls & Remove */}
											<div className='flex items-center justify-between'>
												<div className='flex items-center gap-2'>
													<button
														onClick={() => updateQuantity(item.CartItemId, -1)}
														disabled={item.Quantity <= 1}
														className='bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded transition-colors'
														aria-label='Decrease quantity'
													>
														<Minus size={16} />
													</button>
													<span className='min-w-[32px] text-center font-semibold text-sm'>
														{item.Quantity}
													</span>
													<button
														onClick={() => updateQuantity(item.CartItemId, 1)}
														className='bg-gray-200 hover:bg-gray-300 p-2 rounded transition-colors'
														aria-label='Increase quantity'
													>
														<Plus size={16} />
													</button>
												</div>

												<button
													onClick={() => removeItem(item.CartItemId)}
													className='text-red-600 hover:text-red-800 p-2 transition-colors'
													aria-label='Remove item'
												>
													<Trash2 size={18} />
												</button>
											</div>

											{/* Subtotal */}
											<div className='pt-2 border-t border-gray-200'>
												<div className='flex justify-between items-center'>
													<span className='text-sm text-gray-600'>Subtotal:</span>
													<span className='text-base font-bold text-green-600'>
														€{itemTotal.toFixed(2)}
													</span>
												</div>
											</div>
										</div>

										{/* Tablet & Desktop Layout (>= 640px) */}
										<div className='hidden sm:flex items-center p-4 md:p-6 gap-4 lg:gap-6'>
											{/* Product Image */}
											<img
												src={item.ProductImageUrl || '/placeholder.jpg'}
												alt={item.ProductName || 'Product Image'}
												className='w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-cover rounded flex-shrink-0'
											/>

											{/* Product Info */}
											<div className='flex-1 min-w-0'>
												<h3 className='font-semibold text-base md:text-lg mb-2 line-clamp-2'>
													{item.ProductName}
												</h3>
												<p className='text-sm text-gray-600 mb-3'>€{item.Price} each</p>

												{/* Seller Info - Horizontal on Desktop */}
												<div className='flex flex-wrap gap-3 md:gap-4 text-sm text-gray-600'>
													<div className='flex items-center gap-1.5'>
														<Store size={16} className='text-gray-500' />
														<span className='font-medium'>{item.SellerName}</span>
													</div>
													<div className='flex items-center gap-1.5'>
														<MapPin size={16} className='text-gray-500' />
														<span>{item.SellerCountry}</span>
													</div>
												</div>
											</div>

											{/* Quantity Controls */}
											<div className='flex flex-col items-center gap-3'>
												<div className='flex items-center gap-2'>
													<button
														onClick={() => updateQuantity(item.CartItemId, -1)}
														disabled={item.Quantity <= 1}
														className='bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded transition-colors'
														aria-label='Decrease quantity'
													>
														<Minus size={18} />
													</button>
													<span className='min-w-[40px] text-center font-semibold'>
														{item.Quantity}
													</span>
													<button
														onClick={() => updateQuantity(item.CartItemId, 1)}
														className='bg-gray-200 hover:bg-gray-300 p-2 rounded transition-colors'
														aria-label='Increase quantity'
													>
														<Plus size={18} />
													</button>
												</div>

												<button
													onClick={() => removeItem(item.CartItemId)}
													className='text-red-600 hover:text-red-800 flex items-center gap-1 text-sm font-medium transition-colors'
													aria-label='Remove item'
												>
													<Trash2 size={16} />
													Remove
												</button>
											</div>

											{/* Subtotal */}
											<div className='text-right min-w-[100px]'>
												<p className='text-xs md:text-sm text-gray-600 mb-1'>Subtotal</p>
												<p className='text-lg md:text-xl font-bold text-green-600'>
													€{itemTotal.toFixed(2)}
												</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</>
				)}
			</main>

			{/* Sticky Cart Summary - ALL SCREEN SIZES */}
			{cartItems.length > 0 && (
				<div className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40'>
					<div className='max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4'>
						<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4'>
							{/* Total Amount */}
							<div>
								<p className='text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1'>Total Amount</p>
								<h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-green-600'>
									€{total.toFixed(2)}
								</h2>
							</div>

							{/* Action Buttons */}
							<div className='flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto'>
								<button
									onClick={clearCart}
									className='w-full sm:w-auto bg-red-600 text-white px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium flex items-center justify-center gap-2'
								>
									<Trash2 size={16} className='sm:w-[18px] sm:h-[18px]' />
									<span>Clear Cart</span>
								</button>

								<button
									onClick={finalizeCheckout}
									className='w-full sm:w-auto bg-green-600 text-white px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium'
								>
									Proceed to Checkout
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			<Footer />
		</div>
	);
};

export default Cart;
