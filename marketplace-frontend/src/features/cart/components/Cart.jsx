import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import NavBar from '../../../components/NavBar';
import { MapPin, Store } from 'lucide-react';
import toast from 'react-hot-toast';

const Cart = () => {
	const navigate = useNavigate();
	const [cartItems, setCartItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

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
		}
	};

	// Remove single item
	const removeItem = async (cartItemId) => {
		try {
			await api.delete(`/cart/remove/${cartItemId}`);
			setCartItems((prev) => prev.filter((i) => i.CartItemId !== cartItemId));
		} catch (err) {
			console.error('Error removing item:', err);
		}
	};

	// Clear entire cart
	const clearCart = async () => {
		try {
			await api.delete('/cart/clear');
			setCartItems([]);
		} catch (err) {
			console.error('Error clearing cart:', err);
		}
	};

	// Proceed to checkout -====
	const proceedToCheckout = async () => {
		try {
			const res = await api.post('/checkout/proceed');
			if (res.data.url) {
				console.log(res);
				//window.location.href = res.data.url; // redirect to checkout
			} else {
				alert('Something went wrong. No checkout URL received.');
			}
		} catch (err) {
			console.error('Checkout error:', err);
			toast.error('Checkout failed. Please try again.');
			alert('Checkout failed. Please try again.');
		}
	};

	const finalizeCheckout = async () => {
		navigate('/finalize-checkout');
	};

	const total = cartItems.reduce((sum, item) => sum + item.Quantity * Number(item.Price), 0);

	if (loading) return <p className='p-6'>Loading cart...</p>;
	if (error) return <p className='p-6 text-red-600'>{error}</p>;

	return (
		<>
			<NavBar />
			<main className='max-w-5xl mx-auto p-4 mt-20 bg-white rounded shadow'>
				<h1 className='text-2xl font-semibold mb-4'>Your Cart</h1>

				{cartItems.length === 0 ? (
					<p className='text-gray-600'>Your cart is empty.</p>
				) : (
					<div className='space-y-4'>
						{cartItems.map((item) => {
							const itemTotal = item.Quantity * Number(item.Price);

							return (
								<div
									key={item.CartItemId}
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
											<p className='text-sm text-gray-600'>Price: € {item.Price} each</p>
											<p className='text-sm font-semibold mt-1'>Subtotal: € {itemTotal}</p>
										</div>
										<div className='self-start flex items-center space-x-6 text-sm text-gray-600 mt-2'>
											<div className='flex items-center space-x-2'>
												<Store size={16} className='text-gray-500' aria-hidden />
												<span className='font-medium'>{item.SellerName}</span>
											</div>

											<div className='flex items-center space-x-2'>
												<MapPin size={16} className='text-gray-500' aria-hidden />
												<span>
													{item.SellerCountry}, {item.SellerCountry}
												</span>
											</div>
										</div>
									</div>

									<div className='flex items-center space-x-2'>
										<button
											onClick={() => updateQuantity(item.CartItemId, -1)}
											aria-label='Decrease quantity'
											className='bg-gray-300 px-2 py-1 rounded text-xl'
										>
											-
										</button>
										<span className='min-w-[30px] text-center'>{item.Quantity}</span>
										<button
											onClick={() => updateQuantity(item.CartItemId, 1)}
											aria-label='Increase quantity'
											className='bg-gray-300 px-2 py-1 rounded text-xl'
										>
											+
										</button>
										<button
											onClick={() => removeItem(item.CartItemId)}
											aria-label='Remove item'
											className='ml-4 text-red-600 hover:text-red-800'
										>
											Remove
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				<div className='mt-6 flex flex-col sm:flex-row justify-between items-center border-t pt-4'>
					<h2 className='text-xl font-bold'>Total: € {total}</h2>
					<div className='mt-4 sm:mt-0 space-x-4'>
						<button
							onClick={clearCart}
							className='bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700'
						>
							Clear Cart
						</button>

						<button
							onClick={finalizeCheckout}
							className='bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700'
						>
							Proceed To Checkout
						</button>
					</div>
				</div>
			</main>
		</>
	);
};

export default Cart;
