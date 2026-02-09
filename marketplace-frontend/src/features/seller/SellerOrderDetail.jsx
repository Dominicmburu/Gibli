import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
	Package, Clock, Truck, CheckCircle, XCircle, ArrowLeft,
	MapPin, User, Phone, CreditCard, Calendar, Loader2, Mail,
	ThumbsUp, ThumbsDown, Send, PackageCheck,
} from 'lucide-react';

const statusConfig = {
	Processing: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Processing', desc: 'This order is waiting for your response' },
	Confirmed: { icon: ThumbsUp, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', label: 'Confirmed', desc: 'You have accepted this order' },
	Shipped: { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Shipped', desc: 'This order has been shipped' },
	Delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered', desc: 'This order has been delivered' },
	Cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Cancelled', desc: 'This order was cancelled by the buyer' },
	Rejected: { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected', desc: 'You rejected this order. Stock has been restored.' },
};

const statusSteps = ['Processing', 'Confirmed', 'Shipped', 'Delivered'];

const SellerOrderDetail = () => {
	const { orderId } = useParams();
	const navigate = useNavigate();
	const [order, setOrder] = useState(null);
	const [loading, setLoading] = useState(true);
	const [updatingStatus, setUpdatingStatus] = useState(false);

	useEffect(() => {
		const fetchOrder = async () => {
			try {
				const response = await api.get(`/orders/${orderId}`);
				setOrder(response.data.data);
			} catch (err) {
				console.error('Error fetching order:', err);
				if (err.response?.status === 401 || err.response?.status === 403) {
					navigate('/login');
					return;
				}
				toast.error('Failed to load order details.');
				navigate('/my-orders');
			} finally {
				setLoading(false);
			}
		};
		fetchOrder();
	}, [orderId, navigate]);

	const handleUpdateStatus = async (newStatus) => {
		setUpdatingStatus(true);
		try {
			await api.patch(`/orders/${orderId}/status`, { status: newStatus });
			setOrder((prev) => ({ ...prev, DeliveryStatus: newStatus }));
			const labels = { Confirmed: 'accepted', Rejected: 'rejected', Shipped: 'marked as shipped', Delivered: 'marked as delivered' };
			toast.success(`Order ${labels[newStatus]}`);
		} catch (err) {
			console.error('Status update failed:', err);
			toast.error(err.response?.data?.message || 'Failed to update status');
		} finally {
			setUpdatingStatus(false);
		}
	};

	if (loading) {
		return (
			<>
				<NavBar />
				<div className='flex min-h-screen bg-gray-50'>
					<SellerSidebar />
					<div className='flex-1 flex items-center justify-center'>
						<div className='flex flex-col items-center gap-3'>
							<Loader2 size={32} className='animate-spin text-primary-500' />
							<p className='text-gray-500'>Loading order details...</p>
						</div>
					</div>
				</div>
			</>
		);
	}

	if (!order) return null;

	const statusInfo = statusConfig[order.DeliveryStatus] || statusConfig.Processing;
	const StatusIcon = statusInfo.icon;
	const isCancelled = order.DeliveryStatus === 'Cancelled';
	const isRejected = order.DeliveryStatus === 'Rejected';
	const isTerminal = isCancelled || isRejected;

	const subtotal = order.OrderItems.reduce((sum, item) => sum + item.UnitPrice * item.Quantity, 0);
	const shippingTotal = order.OrderItems.reduce((sum, item) => sum + (item.ShippingPrice || 0), 0);
	const currentStepIndex = isTerminal ? -1 : statusSteps.indexOf(order.DeliveryStatus);

	// Determine available actions based on status
	const renderActions = () => {
		if (isTerminal || order.DeliveryStatus === 'Delivered') return null;

		return (
			<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4'>
				<h3 className='font-semibold text-gray-900 mb-3'>Update Order Status</h3>
				{order.DeliveryStatus === 'Processing' && (
					<div className='flex gap-3'>
						<button
							onClick={() => handleUpdateStatus('Confirmed')}
							disabled={updatingStatus}
							className='flex-1 flex items-center justify-center gap-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 py-2.5 rounded-lg transition-colors disabled:opacity-50'
						>
							<ThumbsUp size={16} /> Accept Order
						</button>
						<button
							onClick={() => handleUpdateStatus('Rejected')}
							disabled={updatingStatus}
							className='flex-1 flex items-center justify-center gap-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 py-2.5 rounded-lg transition-colors disabled:opacity-50'
						>
							<ThumbsDown size={16} /> Reject Order
						</button>
					</div>
				)}
				{order.DeliveryStatus === 'Confirmed' && (
					<button
						onClick={() => handleUpdateStatus('Shipped')}
						disabled={updatingStatus}
						className='w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 py-2.5 rounded-lg transition-colors disabled:opacity-50'
					>
						<Send size={16} /> Mark as Shipped
					</button>
				)}
				{order.DeliveryStatus === 'Shipped' && (
					<button
						onClick={() => handleUpdateStatus('Delivered')}
						disabled={updatingStatus}
						className='w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 py-2.5 rounded-lg transition-colors disabled:opacity-50'
					>
						<PackageCheck size={16} /> Mark as Delivered
					</button>
				)}
			</div>
		);
	};

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-6 overflow-y-auto'>
					{/* Back button */}
					<button
						onClick={() => navigate('/my-orders')}
						className='flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors'
					>
						<ArrowLeft size={16} />
						Back to Orders
					</button>

					<div className='max-w-3xl'>
						{/* Order Header */}
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
							<div>
								<h1 className='text-2xl font-bold text-gray-900'>
									Order #{order.OrderId.slice(0, 8)}
								</h1>
								<p className='text-sm text-gray-500 mt-1 flex items-center gap-2'>
									<Calendar size={14} />
									Placed on {new Date(order.OrderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at {new Date(order.OrderDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
								</p>
							</div>
							<div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border self-start`}>
								<StatusIcon size={16} />
								{statusInfo.label}
							</div>
						</div>

						{/* ROW 1: Order Status with progress bar */}
						<div className={`rounded-2xl border ${statusInfo.border} ${statusInfo.bg} p-5 sm:p-6 mb-4`}>
							<div className='flex items-center gap-3'>
								<div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusInfo.bg} border ${statusInfo.border}`}>
									<StatusIcon size={20} className={statusInfo.color} />
								</div>
								<div>
									<h2 className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</h2>
									<p className='text-sm text-gray-600'>{statusInfo.desc}</p>
								</div>
							</div>

							{!isTerminal && (
								<div className='flex items-center gap-1 mt-4'>
									{statusSteps.map((step, index) => {
										const isCompleted = index <= currentStepIndex;
										const isCurrent = index === currentStepIndex;
										const labels = { Processing: 'Processing', Confirmed: 'Confirmed', Shipped: 'Shipped', Delivered: 'Delivered' };
										return (
											<div key={step} className='flex-1 flex items-center gap-1'>
												<div className='flex-1'>
													<div className={`h-2 rounded-full transition-all ${isCompleted ? 'bg-primary-500' : 'bg-gray-200'}`} />
													<p className={`text-xs mt-1.5 ${isCurrent ? 'font-semibold text-primary-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
														{labels[step]}
													</p>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						{/* Status Actions */}
						{renderActions()}

						{/* ROW 2: Buyer Info */}
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4'>
							<div className='flex items-center gap-2 mb-3'>
								<User size={18} className='text-primary-500' />
								<h3 className='font-semibold text-gray-900'>Buyer</h3>
							</div>
							<div className='space-y-1.5'>
								<p className='text-sm font-medium text-gray-900'>{order.BuyerName}</p>
								{order.BuyerEmail && (
									<div className='flex items-center gap-2'>
										<Mail size={14} className='text-gray-400' />
										<p className='text-sm text-gray-600'>{order.BuyerEmail}</p>
									</div>
								)}
							</div>
						</div>

						{/* ROW 3: Shipping Address */}
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4'>
							<div className='flex items-center gap-2 mb-4'>
								<MapPin size={18} className='text-primary-500' />
								<h3 className='font-semibold text-gray-900'>Shipping Address</h3>
							</div>
							<div className='space-y-2'>
								<div className='flex items-center gap-2'>
									<User size={14} className='text-gray-400' />
									<p className='text-sm font-medium text-gray-900'>{order.FullName}</p>
								</div>
								{order.PhoneNumber && (
									<div className='flex items-center gap-2'>
										<Phone size={14} className='text-gray-400' />
										<p className='text-sm text-gray-600'>{order.PhoneNumber}</p>
									</div>
								)}
								<div className='pl-5.5 space-y-0.5 ml-0.5'>
									<p className='text-sm text-gray-600'>{order.AddressLine1}</p>
									{order.AddressLine2 && <p className='text-sm text-gray-600'>{order.AddressLine2}</p>}
									<p className='text-sm text-gray-600'>
										{order.PostalCode} {order.City}
										{order.StateOrProvince ? `, ${order.StateOrProvince}` : ''}
									</p>
									<p className='text-sm text-gray-600'>{order.ShippingCountry}</p>
								</div>
							</div>
						</div>

						{/* ROW 4: Order Items */}
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4'>
							<div className='flex items-center gap-2 mb-4'>
								<Package size={18} className='text-primary-500' />
								<h3 className='font-semibold text-gray-900'>
									Items ({order.OrderItems.length})
								</h3>
							</div>
							<div className='divide-y divide-gray-100'>
								{order.OrderItems.map((item) => (
									<div key={item.OrderItemId} className='flex items-center gap-4 py-4 first:pt-0 last:pb-0'>
										<div className='w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0'>
											{item.ProductImageUrl ? (
												<img src={item.ProductImageUrl} alt={item.ProductName} className='w-full h-full object-cover' />
											) : (
												<div className='w-full h-full flex items-center justify-center'>
													<Package size={20} className='text-gray-300' />
												</div>
											)}
										</div>
										<div className='flex-1 min-w-0'>
											<p className='text-sm font-medium text-gray-900 truncate'>{item.ProductName}</p>
											<p className='text-xs text-gray-500 mt-0.5'>Qty: {item.Quantity} &times; &euro;{Number(item.UnitPrice).toFixed(2)}</p>
											<p className='text-xs text-gray-400 mt-0.5'>
												Shipping: {item.ShippingType} (&euro;{Number(item.ShippingPrice).toFixed(2)})
											</p>
										</div>
										<p className='text-sm font-bold text-gray-900 flex-shrink-0'>
											&euro;{Number(item.ItemTotal).toFixed(2)}
										</p>
									</div>
								))}
							</div>
						</div>

						{/* ROW 5: Order Summary */}
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4'>
							<div className='flex items-center gap-2 mb-4'>
								<CreditCard size={18} className='text-primary-500' />
								<h3 className='font-semibold text-gray-900'>Order Summary</h3>
							</div>
							<div className='space-y-2'>
								<div className='flex justify-between text-sm'>
									<span className='text-gray-500'>Subtotal</span>
									<span className='text-gray-900'>&euro;{subtotal.toFixed(2)}</span>
								</div>
								<div className='flex justify-between text-sm'>
									<span className='text-gray-500'>Shipping</span>
									<span className='text-gray-900'>&euro;{shippingTotal.toFixed(2)}</span>
								</div>
								<div className='border-t border-gray-100 pt-3 mt-3'>
									<div className='flex justify-between'>
										<span className='font-semibold text-gray-900'>Total</span>
										<span className='text-xl font-bold text-primary-500'>
											&euro;{Number(order.TotalAmount).toFixed(2)}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Payment Reference */}
						{order.PaymentIntentId && (
							<div className='bg-gray-50 rounded-xl border border-gray-200 p-4 text-center'>
								<p className='text-xs text-gray-400'>Payment Reference</p>
								<p className='text-sm font-mono text-gray-600 mt-0.5'>{order.PaymentIntentId}</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

export default SellerOrderDetail;
