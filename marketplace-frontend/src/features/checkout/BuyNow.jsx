import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Truck, Zap, X, MapPin, ChevronDown, Plus, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../utils/useAuth';
import PaymentMethodSelector from './PaymentMethodSelector';

const BuyNow = ({ product }) => {
	const { isLoggedIn, userInfo } = useAuth();
	const isOwnProduct = product?.SellerId && userInfo?.role === 'Seller' && userInfo?.id === product.SellerId;

	const [showModal, setShowModal]         = useState(false);
	const [step, setStep]                   = useState('details'); // 'details' | 'payment'
	const [loading, setLoading]             = useState(false);
	const [shippingType, setShippingType]   = useState('standard');
	const [quantity, setQuantity]           = useState(1);
	const [addresses, setAddresses]         = useState([]);
	const [selectedAddressId, setSelectedAddressId] = useState(null);
	const [addressLoading, setAddressLoading] = useState(false);
	const [pendingDraft, setPendingDraft]   = useState(null); // { draftId, totalAmount }
	const navigate = useNavigate();

	useEffect(() => {
		if (showModal) fetchAddresses();
	}, [showModal]);

	const fetchAddresses = async () => {
		setAddressLoading(true);
		try {
			const res  = await api.get('/shipping/addresses/me');
			const data = res.data || [];
			setAddresses(data);
			const def  = data.find((a) => a.IsDefault === 1 || a.IsDefault === true);
			setSelectedAddressId(def ? def.ShippingId : data[0]?.ShippingId ?? null);
		} catch {
			setAddresses([]);
		} finally {
			setAddressLoading(false);
		}
	};

	const selectedAddress = addresses.find((a) => a.ShippingId === selectedAddressId) || null;

	const handleBuyNowClick = () => {
		if (!isLoggedIn) {
			toast.error('Please log in to continue with your purchase.');
			navigate('/login');
			return;
		}
		setStep('details');
		setPendingDraft(null);
		setShowModal(true);
	};

	// Step 1: create draft, move to payment selection
	const handleProceedToPayment = async () => {
		if (!selectedAddress) {
			toast.error('Please select a shipping address.');
			return;
		}

		setLoading(true);
		try {
			const response = await api.post('/checkout/buy-now', {
				productId:    product.ProductId,
				quantity,
				shippingType,
				shippingId:   selectedAddressId,
			});

			setPendingDraft({
				draftId:     response.data.draftId,
				totalAmount: response.data.totalAmount,
			});
			setStep('payment');
		} catch (err) {
			const code    = err.response?.data?.code;
			const message = err.response?.data?.message;
			if (code === 'NO_ADDRESS') {
				toast.error('Please add a shipping address first.');
				setShowModal(false);
				navigate('/address-book');
			} else if (code === 'INCOMPLETE_ADDRESS') {
				toast.error('Please complete your shipping address.');
				setShowModal(false);
				navigate('/address-book');
			} else {
				toast.error(message || 'Failed to process your request. Please try again.');
			}
		} finally {
			setLoading(false);
		}
	};

	const handleCloseModal = () => {
		if (loading) return;
		setShowModal(false);
		setShippingType('standard');
		setQuantity(1);
		setAddresses([]);
		setSelectedAddressId(null);
		setPendingDraft(null);
		setStep('details');
	};

	const calculateTotal = () => {
		const basePrice = product.Price * quantity;
		const shipFee   = shippingType === 'express'
			? product.ExpressShippingPrice
			: product.ShippingPrice;
		return (basePrice + shipFee).toFixed(2);
	};

	const maxQuantity = Math.min(product.InStock, 10);

	return (
		<>
			<button
				onClick={handleBuyNowClick}
				disabled={product.InStock < 1 || isOwnProduct}
				title={isOwnProduct ? 'You cannot purchase your own products' : ''}
				className='w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-6 rounded-lg transition-colors shadow-md text-sm sm:text-base'
			>
				{isOwnProduct ? 'Your Product' : product.InStock < 1 ? 'Out of Stock' : 'Buy Now'}
			</button>

			{/* ── Step 1: Details modal ── */}
			{showModal && step === 'details' && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
					<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={handleCloseModal} />

					<div className='relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5'>
						<button
							onClick={handleCloseModal}
							disabled={loading}
							className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50'
						>
							<X size={24} />
						</button>

						{/* Header */}
						<div>
							<h2 className='text-xl font-bold text-gray-900'>Complete Your Purchase</h2>
							<p className='text-sm text-gray-600 mt-1'>Select your shipping preference</p>
						</div>

						{/* Product summary */}
						<div className='flex items-center gap-4 p-3 bg-gray-50 rounded-lg'>
							{product.ProductImages?.[0]?.ImageUrl && (
								<img
									src={product.ProductImages[0].ImageUrl}
									alt={product.ProductName}
									className='w-16 h-16 object-cover rounded-lg'
								/>
							)}
							<div className='flex-1 min-w-0'>
								<p className='font-medium text-gray-900 truncate'>{product.ProductName}</p>
								<p className='text-primary-500 font-bold'>€{product.Price?.toFixed(2)}</p>
							</div>
						</div>

						{/* Shipping address */}
						<div>
							<label className='text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2'>
								<MapPin size={16} className='text-primary-500' />
								Ship To
							</label>

							{addressLoading ? (
								<div className='p-3 bg-gray-50 rounded-lg flex items-center justify-center'>
									<Loader2 size={20} className='animate-spin text-gray-400' />
								</div>
							) : addresses.length === 0 ? (
								<div className='p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center'>
									<p className='text-sm text-yellow-800 mb-2'>No shipping address found</p>
									<button
										onClick={() => { setShowModal(false); navigate('/address-book'); }}
										className='text-sm bg-yellow-600 text-white px-4 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors font-medium'
									>
										Add Address
									</button>
								</div>
							) : (
								<div className='space-y-2'>
									<div className='relative'>
										<select
											value={selectedAddressId || ''}
											onChange={(e) => setSelectedAddressId(e.target.value)}
											className='w-full appearance-none border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white'
										>
											{addresses.map((addr) => (
												<option key={addr.ShippingId} value={addr.ShippingId}>
													{addr.FullName} - {addr.AddressLine1}, {addr.PostalCode} {addr.City}, {addr.Country}
													{(addr.IsDefault === 1 || addr.IsDefault === true) ? ' (Default)' : ''}
												</option>
											))}
										</select>
										<ChevronDown size={16} className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none' />
									</div>

									{selectedAddress && (
										<div className='p-3 bg-primary-50 rounded-lg border border-primary-200 text-sm'>
											<p className='font-semibold text-gray-900'>{selectedAddress.FullName}</p>
											<p className='text-gray-700'>{selectedAddress.AddressLine1}</p>
											<p className='text-gray-700'>{selectedAddress.PostalCode} {selectedAddress.City}</p>
											<p className='text-gray-700'>{selectedAddress.Country}</p>
										</div>
									)}

									<button
										onClick={() => { setShowModal(false); navigate('/address-book'); }}
										className='text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1'
									>
										<Plus size={12} />
										Add new address
									</button>
								</div>
							)}
						</div>

						{/* Quantity */}
						<div>
							<label className='block text-sm font-semibold text-gray-700 mb-2'>Quantity</label>
							<div className='flex items-center gap-3'>
								<button
									onClick={() => setQuantity(Math.max(1, quantity - 1))}
									disabled={quantity <= 1 || loading}
									className='w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
								>
									-
								</button>
								<span className='w-12 text-center font-semibold text-gray-900'>{quantity}</span>
								<button
									onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
									disabled={quantity >= maxQuantity || loading}
									className='w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
								>
									+
								</button>
								<span className='text-sm text-gray-500'>({product.InStock} available)</span>
							</div>
						</div>

						{/* Shipping method */}
						<div>
							<label className='block text-sm font-semibold text-gray-700 mb-3'>Shipping Method</label>
							<div className='space-y-2'>
								<label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
									shippingType === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
								}`}>
									<input type='radio' name='shipping' value='standard'
										checked={shippingType === 'standard'}
										onChange={() => setShippingType('standard')}
										disabled={loading} className='hidden'
									/>
									<div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${shippingType === 'standard' ? 'border-blue-500' : 'border-gray-300'}`}>
										{shippingType === 'standard' && <div className='w-3 h-3 rounded-full bg-blue-500' />}
									</div>
									<Truck size={20} className='text-blue-600' />
									<div className='flex-1'>
										<p className='font-medium text-gray-900'>Standard Shipping</p>
										<p className='text-xs text-gray-500'>5–7 business days</p>
									</div>
									<span className='font-bold text-gray-900'>€{product.ShippingPrice?.toFixed(2)}</span>
								</label>

								<label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
									shippingType === 'express' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
								}`}>
									<input type='radio' name='shipping' value='express'
										checked={shippingType === 'express'}
										onChange={() => setShippingType('express')}
										disabled={loading} className='hidden'
									/>
									<div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${shippingType === 'express' ? 'border-purple-500' : 'border-gray-300'}`}>
										{shippingType === 'express' && <div className='w-3 h-3 rounded-full bg-purple-500' />}
									</div>
									<Zap size={20} className='text-purple-600' />
									<div className='flex-1'>
										<p className='font-medium text-gray-900'>Express Shipping</p>
										<p className='text-xs text-gray-500'>1–2 business days</p>
									</div>
									<span className='font-bold text-gray-900'>€{product.ExpressShippingPrice?.toFixed(2)}</span>
								</label>
							</div>
						</div>

						{/* Total */}
						<div className='pt-4 border-t border-gray-200'>
							<div className='flex justify-between items-center'>
								<span className='text-gray-600'>Order total</span>
								<span className='text-2xl font-bold text-primary-500'>€{calculateTotal()}</span>
							</div>
							<p className='text-xs text-gray-400 mt-1 text-right'>Processing fee added at next step</p>
						</div>

						{/* Proceed button */}
						<button
							onClick={handleProceedToPayment}
							disabled={loading || !selectedAddress || addressLoading}
							className='w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2'
						>
							{loading ? (
								<><Loader2 size={20} className='animate-spin' /> Processing...</>
							) : (
								'Choose Payment Method →'
							)}
						</button>
					</div>
				</div>
			)}

			{/* ── Step 2: Payment method selector ── */}
			{showModal && step === 'payment' && pendingDraft && (
				<>
					{/* Back button overlay — taps outside the selector go back to details */}
					<div className='fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 pointer-events-none'>
						<button
							onClick={() => setStep('details')}
							className='pointer-events-auto absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-1.5 bg-white text-gray-700 hover:text-gray-900 shadow-md rounded-lg px-3 py-2 text-sm font-medium z-50 transition-colors'
						>
							<ArrowLeft size={16} />
							Back
						</button>
					</div>

					<PaymentMethodSelector
						isOpen={true}
						onClose={handleCloseModal}
						subtotal={pendingDraft.totalAmount}
						draftId={pendingDraft.draftId}
						onSuccess={handleCloseModal}
					/>
				</>
			)}
		</>
	);
};

export default BuyNow;
