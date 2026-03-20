import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
	Clock, Truck, CheckCircle, XCircle, ShoppingBag,
	Loader2, ChevronRight, ThumbsUp, ThumbsDown, Send, PackageCheck, BadgeCheck, Lock, Info,
} from 'lucide-react';

function daysSince(dateStr) {
	if (!dateStr) return 0;
	return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function hoursUntilExpiry(dateStr) {
	if (!dateStr) return 24;
	// Clamp elapsed to >= 0 to guard against timezone offset between DB server and browser
	const elapsed = Math.max(0, (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
	return Math.max(0, 24 - elapsed);
}

function formatCountdown(hours) {
	if (hours <= 0) return 'Expiring now';
	const h = Math.floor(hours);
	const m = Math.floor((hours - h) * 60);
	if (h === 0) return `${m}m left`;
	if (m === 0) return `${h}h left`;
	return `${h}h ${m}m left`;
}

const statusConfig = {
	Processing: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Processing' },
	Confirmed: { icon: ThumbsUp, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', label: 'Confirmed' },
	Shipped: { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Shipped' },
	Delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered' },
	Sold: { icon: BadgeCheck, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Sold' },
	Cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Cancelled' },
	Rejected: { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' },
};

const SellerOrders = () => {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [updatingOrder, setUpdatingOrder] = useState(null);
	const [filterStatus, setFilterStatus] = useState('all');
	const [rejectionModal, setRejectionModal] = useState({ open: false, orderId: null, reason: '' });
	const [trackingModal, setTrackingModal] = useState({ open: false, orderId: null, trackingNumber: '', trackingUrl: '' });
	const navigate = useNavigate();

	useEffect(() => {
		const fetchOrders = async () => {
			try {
				const response = await api.post('/orders/received');
				setOrders(response.data.data || []);
			} catch (err) {
				console.error('Error fetching seller orders:', err);
				setError('Failed to load orders. Please try again later.');
			} finally {
				setLoading(false);
			}
		};
		fetchOrders();
	}, []);

	const handleUpdateStatus = async (orderId, newStatus, reason = null, trackingNumber = null, trackingUrl = null) => {
		setUpdatingOrder(orderId);
		try {
			await api.patch(`/orders/${orderId}/status`, {
				status: newStatus,
				...(reason && { reason }),
				...(trackingNumber && { trackingNumber }),
				...(trackingUrl && { trackingUrl }),
			});
			setOrders((prev) =>
				prev.map((o) =>
					o.OrderId === orderId
						? { ...o, DeliveryStatus: newStatus, UpdatedAt: newStatus === 'Delivered' ? new Date().toISOString() : o.UpdatedAt }
						: o
				)
			);
			const labels = { Confirmed: 'accepted', Rejected: 'rejected', Shipped: 'marked as shipped', Delivered: 'marked as delivered', Sold: 'marked as sold' };
			toast.success(`Order ${labels[newStatus] || 'updated'}`);
		} catch (err) {
			console.error('Status update failed:', err);
			toast.error(err.response?.data?.message || 'Failed to update status');
		} finally {
			setUpdatingOrder(null);
		}
	};

	const getStatusInfo = (status) => statusConfig[status] || statusConfig.Processing;

	const filteredOrders = orders.filter((o) => filterStatus === 'all' || o.DeliveryStatus === filterStatus);

	const getActions = (order) => {
		const isUpdating = updatingOrder === order.OrderId;

		switch (order.DeliveryStatus) {
			case 'Processing': {
				const hoursLeft = hoursUntilExpiry(order.OrderDate);
				const isUrgent = hoursLeft < 6;
				return (
					<div className='mt-3 space-y-2'>
						{/* 48hr expiry indicator */}
						<div className={`text-xs px-2.5 py-1.5 rounded-lg space-y-0.5 ${
							isUrgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
						}`}>
							<div className='flex items-center gap-1.5 font-semibold'>
								<Clock size={12} className='flex-shrink-0' />
								{formatCountdown(hoursLeft)} to respond
							</div>
						</div>
						<div className='flex gap-2'>
							<button
								onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.OrderId, 'Confirmed'); }}
								disabled={isUpdating}
								className='flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-green-600 border border-green-200 hover:bg-green-50 py-2 rounded-lg transition-colors disabled:opacity-50'
							>
								<ThumbsUp size={13} /> Accept
							</button>
							<button
								onClick={(e) => { e.stopPropagation(); setRejectionModal({ open: true, orderId: order.OrderId, reason: '' }); }}
								disabled={isUpdating}
								className='flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 py-2 rounded-lg transition-colors disabled:opacity-50'
							>
								<ThumbsDown size={13} /> Reject
							</button>
						</div>
					</div>
				);
			}
			case 'Confirmed':
				return (
					<button
						onClick={(e) => { e.stopPropagation(); setTrackingModal({ open: true, orderId: order.OrderId, trackingNumber: '', trackingUrl: '' }); }}
						disabled={isUpdating}
						className='w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 py-2 rounded-lg transition-colors disabled:opacity-50'
					>
						<Send size={13} /> Mark as Shipped
					</button>
				);
			case 'Shipped':
				return (
					<button
						onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.OrderId, 'Delivered'); }}
						disabled={isUpdating}
						className='w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-green-600 border border-green-200 hover:bg-green-50 py-2 rounded-lg transition-colors disabled:opacity-50'
					>
						<PackageCheck size={13} /> Mark as Delivered
					</button>
				);
			case 'Delivered': {
				const days = daysSince(order.UpdatedAt);
				const canSell = days >= 14;
				const remaining = Math.max(0, 14 - days);
				return (
					<div className='mt-3 space-y-1'>
						<button
							onClick={(e) => { e.stopPropagation(); if (canSell) handleUpdateStatus(order.OrderId, 'Sold'); }}
							disabled={!canSell || isUpdating}
							className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-colors ${
								canSell
									? 'text-purple-600 border border-purple-200 hover:bg-purple-50 disabled:opacity-50'
									: 'text-gray-400 bg-gray-100 cursor-not-allowed'
							}`}
						>
							{canSell ? (
								<><BadgeCheck size={13} /> Mark as Sold</>
							) : (
								<><Lock size={13} /> Sold in {remaining}d</>
							)}
						</button>
						{!canSell && (
							<p className='text-center text-xs text-gray-400'>{remaining} day{remaining !== 1 ? 's' : ''} left in refund window</p>
						)}
					</div>
				);
			}
			default:
				return null;
		}
	};

	const closeRejectionModal = () => setRejectionModal({ open: false, orderId: null, reason: '' });

	const confirmRejection = () => {
		if (!rejectionModal.reason.trim()) return;
		handleUpdateStatus(rejectionModal.orderId, 'Rejected', rejectionModal.reason.trim());
		closeRejectionModal();
	};

	const closeTrackingModal = () => setTrackingModal({ open: false, orderId: null, trackingNumber: '', trackingUrl: '' });

	const confirmShipping = () => {
		if (!trackingModal.trackingNumber.trim() || !trackingModal.trackingUrl.trim()) return;
		handleUpdateStatus(trackingModal.orderId, 'Shipped', null, trackingModal.trackingNumber.trim(), trackingModal.trackingUrl.trim());
		closeTrackingModal();
	};

	return (
		<>
			<NavBar />
			{/* Rejection Reason Modal */}
			{rejectionModal.open && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl'>
						<div className='flex items-center gap-3 mb-4'>
							<div className='w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0'>
								<ThumbsDown size={18} className='text-red-600' />
							</div>
							<div>
								<h2 className='text-lg font-bold text-gray-900'>Reject Order</h2>
								<p className='text-sm text-gray-500'>The buyer will be notified with your reason.</p>
							</div>
						</div>
						<textarea
							value={rejectionModal.reason}
							onChange={(e) => setRejectionModal((prev) => ({ ...prev, reason: e.target.value }))}
							placeholder='e.g. Item is out of stock, unable to fulfil at this time...'
							rows={4}
							className='w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none'
						/>
						<div className='flex gap-3 mt-4'>
							<button
								onClick={closeRejectionModal}
								className='flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors'
							>
								Cancel
							</button>
							<button
								onClick={confirmRejection}
								disabled={!rejectionModal.reason.trim()}
								className='flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
							>
								Confirm Rejection
							</button>
						</div>
					</div>
				</div>
			)}
			{/* Tracking Info Modal */}
			{trackingModal.open && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl'>
						<div className='flex items-center gap-3 mb-4'>
							<div className='w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0'>
								<Truck size={18} className='text-blue-600' />
							</div>
							<div>
								<h2 className='text-lg font-bold text-gray-900'>Shipping Details</h2>
								<p className='text-sm text-gray-500'>Add tracking info before marking as shipped.</p>
							</div>
						</div>
						<div className='space-y-3'>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Tracking Number <span className='text-red-500'>*</span>
								</label>
								<input
									type='text'
									value={trackingModal.trackingNumber}
									onChange={(e) => setTrackingModal((prev) => ({ ...prev, trackingNumber: e.target.value }))}
									placeholder='e.g. 1Z999AA10123456784'
									className='w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Tracking Link <span className='text-red-500'>*</span>
								</label>
								<input
									type='url'
									value={trackingModal.trackingUrl}
									onChange={(e) => setTrackingModal((prev) => ({ ...prev, trackingUrl: e.target.value }))}
									placeholder='https://track.carrier.com/...'
									className='w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400'
								/>
							</div>
						</div>
						<div className='flex gap-3 mt-4'>
							<button
								onClick={closeTrackingModal}
								className='flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors'
							>
								Cancel
							</button>
							<button
								onClick={confirmShipping}
								disabled={!trackingModal.trackingNumber.trim() || !trackingModal.trackingUrl.trim()}
								className='flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
							>
								Confirm &amp; Ship
							</button>
						</div>
					</div>
				</div>
			)}
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-6 overflow-y-auto'>
					{/* Header */}
					<div className='flex items-center gap-3 mb-6'>
						<div className='w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center'>
							<ShoppingBag size={20} className='text-primary-600' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>Orders Received</h1>
							<p className='text-sm text-gray-500'>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
						</div>
					</div>

					{/* Status filter tabs */}
					<div className='flex flex-wrap gap-2 mb-6'>
						{[
							{ value: 'all', label: 'All' },
							{ value: 'Processing', label: 'Processing' },
							{ value: 'Confirmed', label: 'Confirmed' },
							{ value: 'Shipped', label: 'Shipped' },
							{ value: 'Delivered', label: 'Delivered' },
							{ value: 'Sold', label: 'Sold' },
							{ value: 'Rejected', label: 'Rejected' },
							{ value: 'Cancelled', label: 'Cancelled' },
						].map((f) => {
							const count = f.value === 'all' ? orders.length : orders.filter((o) => o.DeliveryStatus === f.value).length;
							return (
								<button
									key={f.value}
									onClick={() => setFilterStatus(f.value)}
									className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
										filterStatus === f.value
											? 'bg-primary-500 text-white'
											: 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
									}`}
								>
									{f.label} ({count})
								</button>
							);
						})}
					</div>

					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-primary-500' />
						</div>
					) : error ? (
						<p className='text-red-500'>{error}</p>
					) : filteredOrders.length === 0 ? (
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
							<ShoppingBag size={48} className='mx-auto text-gray-300 mb-4' />
							<h3 className='text-lg font-semibold text-gray-700 mb-2'>
								{orders.length === 0 ? 'No orders yet' : 'No orders match this filter'}
							</h3>
							<p className='text-gray-500'>
								{orders.length === 0
									? 'When buyers purchase your products, orders will appear here.'
									: 'Try selecting a different status filter.'}
							</p>
						</div>
					) : (
						<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
							{filteredOrders.map((order) => {
								const statusInfo = getStatusInfo(order.DeliveryStatus);
								const StatusIcon = statusInfo.icon;

								return (
									<div
										key={order.OrderId}
										className='bg-white shadow-sm rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow'
									>
										{/* Order ID + Status badge */}
										<div className='flex items-center justify-between mb-3'>
											<h3 className='font-semibold text-gray-900'>Order #{order.OrderId.slice(0, 8)}</h3>
											<div className='flex items-center gap-1.5'>
												<div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
													<StatusIcon size={12} />
													{statusInfo.label}
												</div>
												{order.DeliveryStatus === 'Processing' && (
													<div className='relative group'>
														<Info size={14} className='text-amber-500 cursor-help' />
														<div className='absolute right-0 top-5 w-56 bg-gray-800 text-white text-xs rounded-lg p-2.5 hidden group-hover:block z-10 shadow-lg leading-relaxed'>
															Orders not confirmed or rejected within <strong>24 hours</strong> are automatically cancelled and the buyer is notified.
														</div>
													</div>
												)}
											</div>
										</div>

										{/* Order info */}
										<div className='space-y-1.5 text-sm'>
											<p className='text-gray-500'>
												Buyer: <span className='font-medium text-gray-900'>{order.BuyerName}</span>
											</p>
											<p className='text-gray-500'>
												Total: <span className='font-bold text-primary-600'>&euro;{Number(order.TotalAmount).toFixed(2)}</span>
											</p>
											<p className='text-xs text-gray-400'>
												{new Date(order.OrderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
											</p>
										</div>

										{/* Items list */}
										<div className='border-t border-gray-100 pt-3 mt-3'>
											<p className='text-sm font-medium text-gray-700 mb-1.5'>Items:</p>
											<ul className='space-y-1 max-h-32 overflow-y-auto text-sm'>
												{order.OrderItems.map((item) => (
													<li key={item.OrderItemId} className='flex justify-between text-gray-600'>
														<span className='truncate mr-2'>{item.ProductName}</span>
														<span className='flex-shrink-0 text-gray-400'>x{item.Quantity}</span>
													</li>
												))}
											</ul>
										</div>

										{/* Status Actions */}
										{getActions(order)}

										{/* View Details button */}
										<button
											onClick={() => navigate(`/my-orders/${order.OrderId}`)}
											className='mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600 border border-primary-200 hover:border-primary-300 py-2 rounded-lg transition-colors'
										>
											View Details
											<ChevronRight size={16} />
										</button>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default SellerOrders;
