import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import NavBar from '../../../components/NavBar';
import Footer from '../../../components/Footer';
import { MapPin, Store, Minus, Plus, Trash2, ShoppingCart, Loader2, ShoppingBag, ArrowRight, AlertTriangle, Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../utils/useAuth';

const Cart = () => {
	const navigate = useNavigate();
	const { isLoggedIn, loading: authLoading } = useAuth();
	const [cartItems, setCartItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reminders, setReminders] = useState({}); // { productId: true/false }
	const [reminderLoading, setReminderLoading] = useState({});
	const { refreshCart } = useCart();

	useEffect(() => {
		if (authLoading) return;
		if (!isLoggedIn) {
			navigate('/login');
			return;
		}

		const fetchCartItems = async () => {
			try {
				const res = await api.get('/cart/items');
				const items = res.data || [];
				setCartItems(items);

				// Check restock reminders for out-of-stock items
				const outOfStock = items.filter((i) => i.InStock <= 0);
				if (outOfStock.length > 0) {
					const checks = await Promise.allSettled(
						outOfStock.map((i) => api.get(`/cart/restock-reminder/${i.ProductId}`))
					);
					const reminderMap = {};
					outOfStock.forEach((item, idx) => {
						if (checks[idx].status === 'fulfilled') {
							reminderMap[item.ProductId] = checks[idx].value.data.hasReminder;
						}
					});
					setReminders(reminderMap);
				}
			} catch (err) {
				console.error('Error fetching cart items:', err);
				setError('Unable to load cart. Please log in.');
				navigate('/login');
			} finally {
				setLoading(false);
			}
		};

		fetchCartItems();
	}, [isLoggedIn, authLoading, navigate]);

	const toggleReminder = useCallback(async (productId) => {
		const hasReminder = reminders[productId];
		setReminderLoading((prev) => ({ ...prev, [productId]: true }));
		try {
			if (hasReminder) {
				await api.delete(`/cart/restock-reminder/${productId}`);
				setReminders((prev) => ({ ...prev, [productId]: false }));
				toast.success('Restock reminder cancelled.');
			} else {
				await api.post(`/cart/restock-reminder/${productId}`);
				setReminders((prev) => ({ ...prev, [productId]: true }));
				toast.success("We'll email you when this is back in stock!");
			}
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to update reminder.');
		} finally {
			setReminderLoading((prev) => ({ ...prev, [productId]: false }));
		}
	}, [reminders]);

	// Update item quantity — validates against available stock
	const updateQuantity = async (cartItemId, change) => {
		const item = cartItems.find((i) => i.CartItemId === cartItemId);
		if (!item) return;

		const newQty = Math.max(1, item.Quantity + change);

		// Block incrementing beyond available stock
		if (newQty > item.InStock) {
			toast.error(
				`Only ${item.InStock} unit${item.InStock !== 1 ? 's' : ''} available for "${item.ProductName}".`
			);
			return;
		}

		// Optimistic update
		setCartItems((prev) =>
			prev.map((i) => (i.CartItemId === cartItemId ? { ...i, Quantity: newQty } : i))
		);

		try {
			await api.put(`/cart/update/${cartItemId}`, { Quantity: newQty });
		} catch (err) {
			console.error('Failed to update quantity:', err);
			// Revert optimistic update
			setCartItems((prev) =>
				prev.map((i) => (i.CartItemId === cartItemId ? { ...i, Quantity: item.Quantity } : i))
			);
			const msg = err.response?.data?.message || 'Failed to update quantity';
			toast.error(msg);
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

	const finalizeCheckout = async () => {
		// Block checkout if any item exceeds available stock
		const overStockItems = cartItems.filter((item) => item.Quantity > item.InStock);
		if (overStockItems.length > 0) {
			toast.error('Some items in your cart exceed available stock. Please reduce the quantity before checking out.');
			return;
		}
		navigate('/finalize-checkout');
	};

	const total = cartItems.reduce((sum, item) => sum + item.Quantity * Number(item.Price), 0);

	// Loading State
	if (loading) {
		return (
			<div className='min-h-screen flex flex-col bg-gray-50'>
				<NavBar />
				<div className='flex-1 flex items-center justify-center'>
					<div className='text-center'>
						<Loader2 size={48} className='animate-spin text-primary-500 mx-auto mb-4' />
						<p className='text-gray-600 text-sm sm:text-base'>Loading your cart...</p>
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

			<main className='flex-1 max-w-6xl mx-auto w-full px-2 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 pb-32 sm:pb-36 lg:pb-40'>
				{/* Page Header */}
				<div className='bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6'>
					<div className='flex items-center justify-between'>
						<h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3'>
							<ShoppingCart className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-500' />
							Your Cart
						</h1>
						{cartItems.length > 0 && (
							<div className='flex items-center gap-3'>
								<span className='text-sm sm:text-base text-gray-600'>
									{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
								</span>
								<button
									onClick={clearCart}
									className='hidden sm:flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium'
								>
									<Trash2 size={16} />
									Clear All
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Empty Cart State */}
				{cartItems.length === 0 ? (
					<div className='bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center'>
						<ShoppingBag size={64} className='mx-auto text-gray-300 mb-4' />
						<h2 className='text-lg sm:text-xl font-semibold text-gray-900 mb-2'>Your cart is empty</h2>
						<p className='text-sm sm:text-base text-gray-600 mb-6'>Add some products to get started!</p>
						<button
							onClick={() => navigate('/')}
							className='bg-primary-500 text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg hover:bg-primary-600 transition-colors text-sm sm:text-base font-medium'
						>
							Continue Shopping
						</button>
					</div>
				) : (
					<>
						{/* Mobile Clear All Button */}
						<div className='sm:hidden mb-3'>
							<button
								onClick={clearCart}
								className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg transition-colors text-sm font-medium'
							>
								<Trash2 size={16} />
								Clear All Items
							</button>
						</div>

						{/* Cart Items */}
						<div className='space-y-3 sm:space-y-4'>
							{cartItems.map((item) => {
								const itemTotal = item.Quantity * Number(item.Price);
								const isOutOfStock = item.InStock <= 0;
								const exceedsStock = item.Quantity > item.InStock;
								const atMaxStock = item.Quantity >= item.InStock;

								return (
									<div
										key={item.CartItemId}
										className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow ${exceedsStock ? 'ring-2 ring-red-200' : ''}`}
									>
										{/* Stock warning banner */}
										{(isOutOfStock || exceedsStock) && (
											<div className={`border-b px-4 py-2.5 flex flex-wrap items-center gap-2 ${isOutOfStock ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
												<AlertTriangle size={15} className={`flex-shrink-0 ${isOutOfStock ? 'text-red-500' : 'text-amber-500'}`} />
												<p className={`text-xs font-medium flex-1 ${isOutOfStock ? 'text-red-700' : 'text-amber-700'}`}>
													{isOutOfStock
														? 'Out of stock.'
														: `Only ${item.InStock} unit${item.InStock !== 1 ? 's' : ''} available — reduce the quantity.`}
												</p>
												{isOutOfStock && (
													<div className='flex items-center gap-2'>
														<button
															onClick={() => toggleReminder(item.ProductId)}
															disabled={reminderLoading[item.ProductId]}
															className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
																reminders[item.ProductId]
																	? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
																	: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
															}`}
														>
															{reminders[item.ProductId] ? <BellOff size={12} /> : <Bell size={12} />}
															{reminderLoading[item.ProductId]
																? '...'
																: reminders[item.ProductId]
																	? 'Cancel reminder'
																	: 'Notify me'}
														</button>
														<button
															onClick={() => removeItem(item.CartItemId)}
															className='flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition-colors'
														>
															<Trash2 size={12} />
															Remove
														</button>
													</div>
												)}
											</div>
										)}

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
													<p className='text-xs text-gray-600'>€{item.Price} each</p>
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

											{/* Quantity Controls & Remove */}
											<div className='flex items-center justify-between'>
												<div className='flex flex-col gap-1'>
													<div className='flex items-center gap-2'>
														<button
															onClick={() => updateQuantity(item.CartItemId, -1)}
															disabled={item.Quantity <= 1}
															className='bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg transition-colors'
															aria-label='Decrease quantity'
														>
															<Minus size={16} />
														</button>
														<span className={`min-w-[32px] text-center font-semibold text-sm ${exceedsStock ? 'text-red-600' : ''}`}>
															{item.Quantity}
														</span>
														<button
															onClick={() => updateQuantity(item.CartItemId, 1)}
															disabled={atMaxStock}
															className='bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg transition-colors'
															aria-label='Increase quantity'
														>
															<Plus size={16} />
														</button>
													</div>
													<p className={`text-xs ${isOutOfStock ? 'text-red-500' : atMaxStock ? 'text-amber-600' : 'text-gray-400'}`}>
														{isOutOfStock ? 'Out of stock' : `${item.InStock} in stock`}
													</p>
												</div>

												<button
													onClick={() => removeItem(item.CartItemId)}
													className='text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors'
													aria-label='Remove item'
												>
													<Trash2 size={18} />
												</button>
											</div>

											{/* Subtotal */}
											<div className='pt-2 border-t border-gray-100'>
												<div className='flex justify-between items-center'>
													<span className='text-sm text-gray-600'>Subtotal:</span>
													<span className='text-lg font-bold text-primary-600'>
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
												<p className='text-sm text-gray-600 mb-3'>€{item.Price} each</p>

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

											{/* Quantity Controls */}
											<div className='flex flex-col items-center gap-2'>
												<div className='flex items-center gap-2'>
													<button
														onClick={() => updateQuantity(item.CartItemId, -1)}
														disabled={item.Quantity <= 1}
														className='bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg transition-colors'
														aria-label='Decrease quantity'
													>
														<Minus size={18} />
													</button>
													<span className={`min-w-[40px] text-center font-semibold ${exceedsStock ? 'text-red-600' : ''}`}>
														{item.Quantity}
													</span>
													<button
														onClick={() => updateQuantity(item.CartItemId, 1)}
														disabled={atMaxStock}
														className='bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg transition-colors'
														aria-label='Increase quantity'
													>
														<Plus size={18} />
													</button>
												</div>

												{/* Stock indicator */}
												<p className={`text-xs ${isOutOfStock ? 'text-red-500 font-medium' : atMaxStock ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
													{isOutOfStock ? 'Out of stock' : atMaxStock ? `Max (${item.InStock})` : `${item.InStock} in stock`}
												</p>

												<button
													onClick={() => removeItem(item.CartItemId)}
													className='text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg flex items-center gap-1 text-sm font-medium transition-colors'
													aria-label='Remove item'
												>
													<Trash2 size={16} />
													<span className='hidden lg:inline'>Remove</span>
												</button>
											</div>

											{/* Subtotal */}
											<div className='text-right min-w-[100px]'>
												<p className='text-xs md:text-sm text-gray-500 mb-1'>Subtotal</p>
												<p className='text-xl md:text-2xl font-bold text-primary-600'>
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

			{/* Sticky Cart Summary */}
			{cartItems.length > 0 && (
				<div className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40'>
					<div className='max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4'>
						<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4'>
							{/* Total Amount */}
							<div>
								<p className='text-xs sm:text-sm text-gray-500 mb-0.5'>Total Amount</p>
								<h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-primary-600'>
									€{total.toFixed(2)}
								</h2>
							</div>

							{/* Action Buttons */}
							<div className='flex gap-2 sm:gap-3 w-full sm:w-auto'>
								<button
									onClick={clearCart}
									className='sm:hidden flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-2'
								>
									<Trash2 size={16} />
									Clear
								</button>

								<button
									onClick={finalizeCheckout}
									className='flex-1 sm:flex-initial bg-primary-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg hover:bg-primary-700 transition-colors text-sm sm:text-base font-medium flex items-center justify-center gap-2'
								>
									Checkout
									<ArrowRight size={18} />
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
