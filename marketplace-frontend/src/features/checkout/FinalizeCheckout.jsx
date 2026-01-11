import { useEffect, useState } from 'react';
import { MapPin, Store, Edit2, ShoppingBag, Truck, Zap, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const FinalizeCheckout = () => {
	const [defaultAddress, setDefaultAddress] = useState(null);
	const [cartItems, setCartItems] = useState([]);
	const [shippingSelections, setShippingSelections] = useState({});
	const [loading, setLoading] = useState(false);
	const [pageLoading, setPageLoading] = useState(true);
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
				setPageLoading(true);
				const res = await api.get('/cart/items');
				if (Array.isArray(res.data)) {
					setCartItems(res.data);
					const initialShipping = {};
					res.data.forEach((item) => {
						initialShipping[item.ProductId] = 'standard';
					});
					setShippingSelections(initialShipping);
				}
			} catch (err) {
				console.error('Error fetching cart items:', err);
				toast.error('Failed to load cart items');
			} finally {
				setPageLoading(false);
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
			toast.error('Your default address seems incomplete. Please fill all fields to ensure accuracy in delivery');
			return;
		}

		if (cartItems.length === 0) {
			toast.error('Your cart is empty.');
			return;
		}

		setLoading(true);
		try {
			console.log('Inside Try block');
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
		} catch (err) {
			console.log(err);
			console.error('Checkout error:', err);
			toast.error(err.response?.data?.message || 'Checkout failed. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	// Page Loading State
	if (pageLoading) {
		return (
			<div className='min-h-screen flex flex-col'>
				<NavBar />
				<div className='flex-1 flex items-center justify-center'>
					<div className='text-center'>
						<Loader2 size={48} className='animate-spin text-green-600 mx-auto mb-4' />
						<p className='text-gray-600 text-sm sm:text-base'>Loading checkout details...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen flex flex-col bg-gray-50'>
			<NavBar />

			<main className='flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 pb-32 sm:pb-36 lg:pb-40'>
				{/* Page Header */}
				<div className='mb-4 sm:mb-6'>
					<h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3'>
						<CheckCircle className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-green-600' />
						Finalize Checkout
					</h1>
					<p className='text-sm sm:text-base text-gray-600 mt-2'>
						Review your order details before proceeding to payment
					</p>
				</div>

				<div className='space-y-4 sm:space-y-6'>
					{/* Section 1: Shipping Address */}
					<div className='bg-white shadow-sm rounded-lg p-4 sm:p-6'>
						<div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4'>
							<h2 className='text-base sm:text-lg font-semibold text-gray-900'>Shipping Address</h2>
							<button
								className='flex items-center gap-1.5 text-green-600 hover:text-green-700 font-medium text-sm sm:text-base transition-colors self-start sm:self-auto'
								aria-label='Edit Address'
								onClick={handleEditAddress}
							>
								<Edit2 size={16} />
								Edit Address
							</button>
						</div>

						{defaultAddress ? (
							<div className='bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2'>
								<p className='text-sm sm:text-base text-gray-900 font-semibold'>
									{defaultAddress.FullName}
								</p>
								<p className='text-sm sm:text-base text-gray-700'>
									{defaultAddress.AddressLine1}
									{defaultAddress.AddressLine2 && `, ${defaultAddress.AddressLine2}`}
								</p>
								<p className='text-sm sm:text-base text-gray-700'>
									{defaultAddress.City}, {defaultAddress.PostalCode}
								</p>
								<p className='text-sm sm:text-base text-gray-700'>{defaultAddress.Country}</p>
								<p className='text-sm sm:text-base text-gray-700 pt-2 border-t border-gray-200'>
									<span className='font-medium'>Phone:</span> {defaultAddress.PhoneNumber}
								</p>
							</div>
						) : (
							<div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center'>
								<p className='text-sm sm:text-base text-yellow-800 mb-3'>
									No default address found. Please add one to continue.
								</p>
								<button
									onClick={handleEditAddress}
									className='bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base font-medium'
								>
									Add Address
								</button>
							</div>
						)}
					</div>

					{/* Section 2: Order Summary */}
					<div className='bg-white shadow-sm rounded-lg p-4 sm:p-6'>
						<h2 className='text-base sm:text-lg font-semibold text-gray-900 mb-4'>Order Summary</h2>

						{cartItems.length === 0 ? (
							<div className='text-center py-8'>
								<ShoppingBag size={48} className='mx-auto text-gray-300 mb-3' />
								<p className='text-sm sm:text-base text-gray-500'>Your cart is empty.</p>
							</div>
						) : (
							<div className='space-y-4 sm:space-y-6'>
								{cartItems.map((item) => {
									const deliveryFee =
										shippingSelections[item.ProductId] === 'express'
											? item.ExpressShippingPrice
											: item.ShippingPrice;
									const subtotal = item.Price * item.Quantity + deliveryFee;

									return (
										<div
											key={item.ProductId}
											className='border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4'
										>
											{/* Seller Info */}
											<div className='flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600'>
												<div className='flex items-center gap-1.5'>
													<Store size={16} className='text-green-600 flex-shrink-0' />
													<span className='font-medium text-gray-900'>{item.SellerName}</span>
												</div>
												<div className='flex items-center gap-1.5'>
													<MapPin size={14} className='flex-shrink-0' />
													<span>{item.SellerCountry}</span>
												</div>
											</div>

											{/* Product Info - Mobile Layout */}
											<div className='sm:hidden space-y-3'>
												<div className='flex gap-3'>
													<img
														src={item.ProductImageUrl}
														alt={item.ProductName}
														className='w-20 h-20 rounded-lg object-cover flex-shrink-0'
													/>
													<div className='flex-1 min-w-0'>
														<p className='font-medium text-sm text-gray-900 line-clamp-2 mb-1'>
															{item.ProductName}
														</p>
														<p className='text-xs text-gray-600'>
															{item.Quantity} × €{item.Price.toFixed(2)}
														</p>
													</div>
												</div>

												{/* Shipping Options - Mobile */}
												<div className='bg-gray-50 rounded-lg p-3 space-y-2'>
													<p className='text-xs font-semibold text-gray-700 mb-2'>
														Select Shipping:
													</p>
													<label className='flex items-start gap-2 cursor-pointer'>
														<input
															type='radio'
															name={`shipping-mobile-${item.ProductId}`}
															value='standard'
															checked={shippingSelections[item.ProductId] === 'standard'}
															onChange={() =>
																handleShippingChange(item.ProductId, 'standard')
															}
															className='mt-0.5 flex-shrink-0'
														/>
														<div className='flex items-center justify-between flex-1'>
															<div className='flex items-center gap-1.5'>
																<Truck size={14} className='text-blue-600' />
																<span className='text-xs text-gray-700'>Standard</span>
															</div>
															<span className='text-xs font-semibold text-gray-900'>
																€{item.ShippingPrice}
															</span>
														</div>
													</label>
													<label className='flex items-start gap-2 cursor-pointer'>
														<input
															type='radio'
															name={`shipping-mobile-${item.ProductId}`}
															value='express'
															checked={shippingSelections[item.ProductId] === 'express'}
															onChange={() =>
																handleShippingChange(item.ProductId, 'express')
															}
															className='mt-0.5 flex-shrink-0'
														/>
														<div className='flex items-center justify-between flex-1'>
															<div className='flex items-center gap-1.5'>
																<Zap size={14} className='text-purple-600' />
																<span className='text-xs text-gray-700'>Express</span>
															</div>
															<span className='text-xs font-semibold text-gray-900'>
																€{item.ExpressShippingPrice}
															</span>
														</div>
													</label>
												</div>

												{/* Subtotal - Mobile */}
												<div className='pt-2 border-t border-gray-200'>
													<div className='flex justify-between items-center'>
														<span className='text-sm text-gray-600'>Subtotal:</span>
														<span className='text-base font-bold text-green-600'>
															€{subtotal.toFixed(2)}
														</span>
													</div>
												</div>
											</div>

											{/* Product Info - Desktop Layout */}
											<div className='hidden sm:flex items-start gap-4'>
												<img
													src={item.ProductImageUrl}
													alt={item.ProductName}
													className='w-24 h-24 md:w-28 md:h-28 rounded-lg object-cover flex-shrink-0'
												/>

												<div className='flex-1 min-w-0'>
													<p className='font-medium text-base text-gray-900 mb-2'>
														{item.ProductName}
													</p>
													<p className='text-sm text-gray-600 mb-4'>
														Quantity: {item.Quantity} × €{item.Price.toFixed(2)}
													</p>

													{/* Shipping Options - Desktop */}
													<div className='space-y-2'>
														<p className='text-sm font-semibold text-gray-700'>
															Select Shipping:
														</p>
														<div className='flex gap-3'>
															<label className='flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1'>
																<input
																	type='radio'
																	name={`shipping-desktop-${item.ProductId}`}
																	value='standard'
																	checked={
																		shippingSelections[item.ProductId] ===
																		'standard'
																	}
																	onChange={() =>
																		handleShippingChange(item.ProductId, 'standard')
																	}
																/>
																<Truck size={18} className='text-blue-600' />
																<div className='flex-1'>
																	<span className='text-sm text-gray-700 block'>
																		Standard
																	</span>
																	<span className='text-xs text-gray-500'>
																		€{item.ShippingPrice}
																	</span>
																</div>
															</label>

															<label className='flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1'>
																<input
																	type='radio'
																	name={`shipping-desktop-${item.ProductId}`}
																	value='express'
																	checked={
																		shippingSelections[item.ProductId] === 'express'
																	}
																	onChange={() =>
																		handleShippingChange(item.ProductId, 'express')
																	}
																/>
																<Zap size={18} className='text-purple-600' />
																<div className='flex-1'>
																	<span className='text-sm text-gray-700 block'>
																		Express
																	</span>
																	<span className='text-xs text-gray-500'>
																		€{item.ExpressShippingPrice}
																	</span>
																</div>
															</label>
														</div>
													</div>
												</div>

												{/* Subtotal - Desktop */}
												<div className='text-right min-w-[100px]'>
													<p className='text-xs text-gray-600 mb-1'>Subtotal</p>
													<p className='text-xl font-bold text-green-600'>
														€{subtotal.toFixed(2)}
													</p>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</main>

			{/* Sticky Total + Checkout Button - ALL SCREEN SIZES */}
			{cartItems.length > 0 && (
				<div className='fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40'>
					<div className='max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4'>
						<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4'>
							{/* Total */}
							<div>
								<p className='text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1'>Order Total</p>
								<h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-green-600'>
									€{computeTotal().toFixed(2)}
								</h2>
							</div>

							{/* Checkout Button */}
							<button
								onClick={proceedToCheckout}
								disabled={loading || !defaultAddress}
								className='w-full sm:w-auto bg-green-600 text-white px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-3.5 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-semibold flex items-center justify-center gap-2'
							>
								{loading ? (
									<>
										<Loader2 size={18} className='animate-spin' />
										Processing...
									</>
								) : (
									'Pay & Place Order'
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			<Footer />
		</div>
	);
};

export default FinalizeCheckout;
