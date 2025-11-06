import { useEffect, useState } from 'react';
import { MapPin, Store, StoreIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

import NavBar from '../../components/NavBar';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const FinalizeCheckout = () => {
	const [defaultAddress, setDefaultAddress] = useState(null);
	const [cartItems, setCartItems] = useState([]);
	const [shippingSelections, setShippingSelections] = useState({}); // { [ProductId]: 'standard' | 'express' }
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	// Fetch default address
	useEffect(() => {
		const fetchDefaultAddress = async () => {
			try {
				const res = await api.get('/shipping/default-address/me');
				if (res.data && res.data.length > 0) {
					setDefaultAddress(res.data[0]);
				}
			} catch (err) {
				console.error('Error fetching address:', err);
				toast.error('Failed to load default address');
			}
		};
		fetchDefaultAddress();
	}, []);

	// Fetch cart items
	useEffect(() => {
		const fetchCartItems = async () => {
			try {
				const res = await api.get('/cart/items');
				if (Array.isArray(res.data)) {
					setCartItems(res.data);
					const initialShipping = {};
					res.data.forEach((item) => {
						initialShipping[item.ProductId] = 'standard'; // default
					});
					setShippingSelections(initialShipping);
				}
			} catch (err) {
				console.error('Error fetching cart items:', err);
				toast.error('Failed to load cart items');
			}
		};
		fetchCartItems();
	}, []);

	// Handle shipping selection per product
	const handleShippingChange = (productId, type) => {
		setShippingSelections((prev) => ({ ...prev, [productId]: type }));
	};
	const handleEditAddress = () => {
		navigate('/address-book');
	};

	// Compute total dynamically
	const computeTotal = () => {
		return cartItems.reduce((acc, item) => {
			const selectedType = shippingSelections[item.ProductId];
			const deliveryFee = selectedType === 'express' ? item.ExpressShippingPrice : item.ShippingPrice;
			return acc + item.Price * item.Quantity + deliveryFee;
		}, 0);
	};

	const proceedToCheckout = async () => {
		console.log(`This is the Cart Items`, cartItems);
		console.log(`This Choosen Shiping Option`, shippingSelections);
		console.log(`This is the default adress`, defaultAddress);

		if (!defaultAddress) {
			toast.error('Please add a default address before checkout.');
			return;
		}
		if (
			!defaultAddress?.AddressLine1 ||
			!defaultAddress?.City ||
			!defaultAddress?.Country ||
			!defaultAddress?.FullName ||
			!defaultAddress?.PhoneNumber
		) {
			toast.error('Your default address seems incomplete. Please Fill all fields to ensure accuracy in delivery');
			return;
		}

		if (cartItems.length === 0) {
			toast.error('Your cart is empty.');
			return;
		}
		setLoading(true);
		try {
			console.log('Inside Try block');
			// Add the checkoutDraft snapshot to be sent
			const payload = {
				cartItems: cartItems,
				shippingOptions: shippingSelections,
				shippingAddress: defaultAddress,
			};
			const response = await api.post('/checkout/draft', payload);

			if (!response.data?.draftId) {
				toast.error(response.data?.message || 'Failed to create checkout draft.');
				return;
			}

			const { draftId } = response.data;

			const sessionResponse = await api.post('/checkout/create-session', { draftId });

			if (sessionResponse.data?.url) {
				toast.success('Redirecting to secure payment...');
				window.location.href = sessionResponse.data.url;
			} else {
				toast.error('Failed to initiate checkout session.');
			}
			//Send the checkoutDraft snapshot to the draft table here before navigating to stripe payment
			// console.log('Payload to be sent as snapshot', payload);
			// const response = await api.post('/checkout/draft', payload);
			// const draftId = response.data?.draftId;

			// if (draftId) {
			// 	const res = await api.post('/checkout/create-session', { draftId });
			// 	if (res.data?.url) {
			// 		toast.success('Redirecting to secure payment...');
			// 		window.location.href = res.data.url; // redirect to Stripe
			// 	} else {
			// 		toast.error('Failed to initiate checkout session.');
			// 	}
			// } else {
			// 	toast.error(response.data?.message || 'Failed to create checkout session draft.');
			// }
		} catch (err) {
			console.log(err);
			console.error('Checkout error:', err);
			toast.error(err.response?.data?.message || 'Checkout failed. Please try again.');
		} finally {
			setLoading(false);
		}
	};
	return (
		<>
			<NavBar />
			<div className='max-w-4xl mx-auto p-4 space-y-6'>
				{/* ======= Section 1: Shipping Address ======= */}
				<div className='bg-white shadow-md rounded-2xl p-4 relative'>
					<h2 className='text-lg font-semibold mb-3 text-gray-700'>Shipping Address</h2>
					{defaultAddress ? (
						<div>
							<p className='text-gray-800 font-medium'>Name: {defaultAddress.FullName}</p>
							<p className='text-gray-600'>
								{defaultAddress.AddressLine1}, {defaultAddress.City}, {defaultAddress.Country}
							</p>
							<p className='text-gray-600'>Phone Number: {defaultAddress.PhoneNumber}</p>
						</div>
					) : (
						<p className='text-gray-500'>No default address found.</p>
					)}
					<button
						className='absolute top-4 right-4 text-baseGreen font-semibold hover:underline'
						aria-label='Edit Address'
						onClick={handleEditAddress}
					>
						Edit Address
					</button>
				</div>

				{/* ======= Section 2: Cart Summary ======= */}
				<div className='bg-white shadow-md rounded-2xl p-4'>
					<h2 className='text-lg font-semibold mb-3 text-gray-700'>Order Summary</h2>
					{cartItems.length === 0 ? (
						<p className='text-gray-500'>Your cart is empty.</p>
					) : (
						<div className='space-y-6'>
							{cartItems.map((item) => {
								const deliveryFee =
									shippingSelections[item.ProductId] === 'express'
										? item.ExpressShippingPrice
										: item.ShippingPrice;
								const subtotal = item.Price * item.Quantity + deliveryFee;

								return (
									<div key={item.ProductId} className='border-b pb-4 last:border-none'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center space-x-2'>
												<Store size={18} className='text-baseGreen' />
												<span className='font-medium text-gray-700'>{item.SellerName}</span>
												<div className='flex items-center text-gray-500 text-sm ml-3'>
													<MapPin size={14} className='mr-1' />
													{item.SellerCountry}
												</div>
											</div>
										</div>

										<div className='flex items-center mt-3 space-x-4'>
											<img
												src={item.ProductImageUrl}
												alt={item.ProductName}
												className='w-20 h-20 rounded-lg object-cover'
											/>
											<div className='flex-1'>
												<p className='font-medium text-gray-700'>{item.ProductName}</p>
												<p className='text-sm text-gray-500'>
													Quantity: {item.Quantity} × €{item.Price.toFixed(2)}
												</p>

												<div className='mt-2 space-y-1'>
													<label className='flex items-center space-x-2'>
														<input
															type='radio'
															name={`shipping-${item.ProductId}`}
															value='standard'
															checked={shippingSelections[item.ProductId] === 'standard'}
															onChange={() =>
																handleShippingChange(item.ProductId, 'standard')
															}
														/>
														<span className='text-sm text-gray-600'>
															Standard Shipping (€{item.ShippingPrice})
														</span>
													</label>
													<label className='flex items-center space-x-2'>
														<input
															type='radio'
															name={`shipping-${item.ProductId}`}
															value='express'
															checked={shippingSelections[item.ProductId] === 'express'}
															onChange={() =>
																handleShippingChange(item.ProductId, 'express')
															}
														/>
														<span className='text-sm text-gray-600'>
															Express Shipping (€{item.ExpressShippingPrice})
														</span>
													</label>
												</div>
											</div>

											<div className='text-right'>
												<p className='font-semibold text-gray-800'>
													Subtotal: €{subtotal.toFixed(2)}
												</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* ======= Section 3: Total + Checkout ======= */}
				<div className='bg-white shadow-md rounded-2xl p-4 flex justify-between items-center'>
					<div className='text-lg font-semibold text-gray-800'>Total: €{computeTotal().toFixed(2)}</div>
					<button
						onClick={proceedToCheckout}
						disabled={loading}
						className='bg-green text-green px-6 py-2 rounded-xl hover:bg-green-700 transition-colors'
					>
						{loading ? 'Processing...' : 'Pay To place order'}
					</button>
				</div>
			</div>
		</>
	);
};

export default FinalizeCheckout;
