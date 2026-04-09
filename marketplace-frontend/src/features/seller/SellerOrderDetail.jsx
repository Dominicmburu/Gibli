import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
	Package, Clock, Truck, CheckCircle, XCircle, ArrowLeft,
	MapPin, User, Phone, CreditCard, Calendar, Loader2, Mail,
	ThumbsUp, ThumbsDown, Send, PackageCheck, BadgeCheck, Lock, AlertTriangle,
	RotateCcw,
} from 'lucide-react';

const statusConfig = {
	Processing: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Processing', desc: 'This order is waiting for your response' },
	Confirmed: { icon: ThumbsUp, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', label: 'Confirmed', desc: 'You have accepted this order' },
	Shipped: { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Shipped', desc: 'This order has been shipped' },
	Delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered', desc: 'This order has been delivered — 14-day refund window is active' },
	Sold: { icon: BadgeCheck, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Sold', desc: 'Sale confirmed — 14-day refund window has passed' },
	ReturnRequested: { icon: RotateCcw, color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Return requested', desc: 'The buyer requested a return or refund — review below' },
	ReturnApproved: { icon: CheckCircle, color: 'text-green-800', bg: 'bg-green-50', border: 'border-green-200', label: 'Return approved', desc: 'You approved the return — complete the refund when ready' },
	Cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Cancelled', desc: 'This order was cancelled by the buyer' },
	Rejected: { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected', desc: 'You rejected this order. Stock has been restored.' },
};

const statusSteps = [
	{ key: 'Processing', label: 'Processing', barColor: 'bg-primary-500' },
	{ key: 'Confirmed', label: 'Confirmed', barColor: 'bg-primary-500' },
	{ key: 'Shipped', label: 'Shipped', barColor: 'bg-primary-500' },
	{ key: 'Delivered', label: 'Delivered', barColor: 'bg-primary-500' },
	{ key: 'Sold', label: 'Sold', barColor: 'bg-purple-500' },
];

function daysSince(dateStr) {
	if (!dateStr) return 0;
	return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

const SellerOrderDetail = () => {
	const { orderId } = useParams();
	const navigate = useNavigate();
	const [order, setOrder] = useState(null);
	const [loading, setLoading] = useState(true);
	const [updatingStatus, setUpdatingStatus] = useState(false);
	const [rejectionModal, setRejectionModal] = useState({ open: false, reason: '' });
	const [trackingModal, setTrackingModal] = useState({ open: false, trackingNumber: '', trackingUrl: '' });
	const [returnApproveModal, setReturnApproveModal] = useState({
		open: false,
		instructions: '',
		resolutionType: 'physical_return',
	});
	const [returnRejectModal, setReturnRejectModal] = useState({ open: false, reason: '' });
	const [resolvingReturn, setResolvingReturn] = useState(false);
	const [markingRefunded, setMarkingRefunded] = useState(false);

	const reloadOrder = async () => {
		const response = await api.get(`/orders/${orderId}`);
		setOrder(response.data.data);
	};

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

	const handleUpdateStatus = async (newStatus, reason = null, trackingNumber = null, trackingUrl = null) => {
		setUpdatingStatus(true);
		try {
			await api.patch(`/orders/${orderId}/status`, {
				status: newStatus,
				...(reason && { reason }),
				...(trackingNumber && { trackingNumber, trackingUrl: trackingUrl || null }),
			});
			await reloadOrder();
			const labels = {
				Confirmed: 'accepted',
				Rejected: 'rejected',
				Shipped: 'marked as shipped',
				Delivered: 'marked as delivered',
				Sold: 'marked as sold',
			};
			toast.success(`Order ${labels[newStatus] || 'updated'}`);
		} catch (err) {
			console.error('Status update failed:', err);
			toast.error(err.response?.data?.message || 'Failed to update status');
		} finally {
			setUpdatingStatus(false);
		}
	};

	const openRejectionModal = () => setRejectionModal({ open: true, reason: '' });
	const closeRejectionModal = () => { if (!updatingStatus) setRejectionModal({ open: false, reason: '' }); };
	const confirmRejection = async () => {
		if (!rejectionModal.reason.trim()) { toast.error('Please provide a reason for rejection.'); return; }
		await handleUpdateStatus('Rejected', rejectionModal.reason.trim());
		setRejectionModal({ open: false, reason: '' });
	};

	const openTrackingModal = () => setTrackingModal({ open: true, trackingNumber: '', trackingUrl: '' });
	const closeTrackingModal = () => { if (!updatingStatus) setTrackingModal({ open: false, trackingNumber: '', trackingUrl: '' }); };
	const confirmShipping = async () => {
		if (!trackingModal.trackingNumber.trim()) { toast.error('Please enter a tracking number.'); return; }
		if (!trackingModal.trackingUrl.trim()) { toast.error('Please enter a tracking URL.'); return; }
		await handleUpdateStatus('Shipped', null, trackingModal.trackingNumber.trim(), trackingModal.trackingUrl.trim());
		setTrackingModal({ open: false, trackingNumber: '', trackingUrl: '' });
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

	const getDisplayStatus = (o) => {
		if (o.RefundStatus === 'ReturnRequested') return 'ReturnRequested';
		if (o.RefundStatus === 'ReturnApproved') return 'ReturnApproved';
		return o.DeliveryStatus;
	};
	const statusInfo = statusConfig[getDisplayStatus(order)] || statusConfig.Processing;
	const StatusIcon = statusInfo.icon;
	const isCancelled = order.DeliveryStatus === 'Cancelled';
	const isRejected = order.DeliveryStatus === 'Rejected';
	const isTerminal = isCancelled || isRejected;

	const subtotal = order.OrderItems.reduce((sum, item) => sum + item.UnitPrice * item.Quantity, 0);
	const shippingTotal = order.OrderItems.reduce((sum, item) => sum + (item.ShippingPrice || 0), 0);

	const stepperKey = order.DeliveryStatus === 'Sold' ? 'Delivered' : order.DeliveryStatus;
	const currentStepIndex = isTerminal ? -1 : statusSteps.findIndex((s) => s.key === stepperKey);

	// 14-day sold gate — anchor on first delivery time when available
	const deliveredAnchor = order.DeliveredAt || order.UpdatedAt;
	const daysDelivered = order.DeliveryStatus === 'Delivered' ? daysSince(deliveredAnchor) : 0;
	const daysRemaining = Math.max(0, 14 - daysDelivered);
	const canMarkSold = order.DeliveryStatus === 'Delivered' && daysDelivered >= 14 && !['ReturnRequested', 'ReturnApproved'].includes(order.RefundStatus);
	const ret = order.ReturnRequest;

	const submitReturnApprove = async () => {
		const instr = returnApproveModal.instructions.trim();
		if (instr.length < 15) {
			toast.error('Add clear return instructions for the buyer (at least 15 characters).');
			return;
		}
		if (!ret?.ReturnRequestId) return;
		setResolvingReturn(true);
		try {
			await api.patch(`/returns/${ret.ReturnRequestId}`, {
				decision: 'approve',
				sellerInstructions: instr,
				resolutionType: returnApproveModal.resolutionType,
			});
			toast.success('Return approved. The buyer will see your instructions.');
			setReturnApproveModal({ open: false, instructions: '', resolutionType: 'physical_return' });
			await reloadOrder();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to approve return.');
		} finally {
			setResolvingReturn(false);
		}
	};

	const submitReturnReject = async () => {
		const reason = returnRejectModal.reason.trim();
		if (reason.length < 10) {
			toast.error('Explain why you are rejecting (at least 10 characters).');
			return;
		}
		if (!ret?.ReturnRequestId) return;
		setResolvingReturn(true);
		try {
			await api.patch(`/returns/${ret.ReturnRequestId}`, { decision: 'reject', sellerRejectionReason: reason });
			toast.success('Return request rejected.');
			setReturnRejectModal({ open: false, reason: '' });
			await reloadOrder();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to reject return.');
		} finally {
			setResolvingReturn(false);
		}
	};

	const submitMarkRefunded = async () => {
		if (!ret?.ReturnRequestId) return;
		setMarkingRefunded(true);
		try {
			await api.post(`/returns/${ret.ReturnRequestId}/mark-refunded`);
			toast.success('Order marked as refunded.');
			await reloadOrder();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not update refund status.');
		} finally {
			setMarkingRefunded(false);
		}
	};

	const renderActions = () => {
		if (isTerminal || order.DeliveryStatus === 'Sold' || ['ReturnRequested', 'ReturnApproved'].includes(order.RefundStatus)) return null;

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
							onClick={openRejectionModal}
							disabled={updatingStatus}
							className='flex-1 flex items-center justify-center gap-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 py-2.5 rounded-lg transition-colors disabled:opacity-50'
						>
							<ThumbsDown size={16} /> Reject Order
						</button>
					</div>
				)}

				{order.DeliveryStatus === 'Confirmed' && (
					<button
						onClick={openTrackingModal}
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

				{order.DeliveryStatus === 'Delivered' && (
					<div className='space-y-2'>
						<button
							onClick={() => canMarkSold && handleUpdateStatus('Sold')}
							disabled={!canMarkSold || updatingStatus}
							className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-lg transition-colors ${
								canMarkSold
									? 'text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50'
									: 'text-gray-400 bg-gray-100 cursor-not-allowed'
							}`}
						>
							{canMarkSold ? (
								<><BadgeCheck size={16} /> Mark as Sold</>
							) : (
								<><Lock size={16} /> Mark as Sold — available in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</>
							)}
						</button>
						{!canMarkSold && (
							<p className='text-xs text-gray-400 text-center'>
								The 14-day refund window ends on{' '}
								{new Date(new Date(deliveredAnchor).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
							</p>
						)}
					</div>
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
							<div className='flex flex-wrap items-center gap-2 self-start'>
								<div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
									<StatusIcon size={16} />
									{statusInfo.label}
								</div>
								{order.RefundStatus === 'ReturnRequested' && (
									<div className='flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200'>
										<RotateCcw size={14} />
										Return requested — open below
									</div>
								)}
							</div>
						</div>

						{/* Status progress */}
						<div className={`rounded-2xl border ${statusInfo.border} ${statusInfo.bg} p-5 sm:p-6 mb-4`}>
							<div className='flex items-center gap-3 mb-5'>
								<div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusInfo.bg} border ${statusInfo.border}`}>
									<StatusIcon size={20} className={statusInfo.color} />
								</div>
								<div>
									<h2 className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</h2>
									<p className='text-sm text-gray-600'>{statusInfo.desc}</p>
								</div>
							</div>

							{!isTerminal && (
								<div className='flex items-start gap-1'>
									{statusSteps.map((step, index) => {
										const isCompleted = index <= currentStepIndex;
										const isCurrent = index === currentStepIndex;
										const isSoldStep = step.key === 'Sold';
										const barColor = isSoldStep && isCompleted ? 'bg-purple-500' : isCompleted ? 'bg-primary-500' : 'bg-gray-200';
										const labelColor = isCurrent && isSoldStep
											? 'font-semibold text-purple-600'
											: isCurrent
											? 'font-semibold text-primary-600'
											: isCompleted && isSoldStep
											? 'text-purple-500'
											: isCompleted
											? 'text-gray-600'
											: 'text-gray-400';

										return (
											<div key={step.key} className='flex-1'>
												<div className={`h-2 rounded-full transition-all ${barColor}`} />
												<p className={`text-xs mt-1.5 text-center ${labelColor}`}>
													{step.label}
												</p>
											</div>
										);
									})}
								</div>
							)}

							{/* Delivered: show refund window countdown inside the status card */}
							{order.DeliveryStatus === 'Delivered' && (
								<div className='mt-4 pt-4 border-t border-green-200'>
									{canMarkSold ? (
										<p className='text-xs text-green-700 font-medium'>
											✓ Refund window has passed — you can now mark this order as Sold.
										</p>
									) : (
										<p className='text-xs text-green-700'>
											Refund window: <span className='font-semibold'>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</span> (ends {new Date(new Date(deliveredAnchor).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
										</p>
									)}
								</div>
							)}
						</div>

						{/* Status Actions */}
						{renderActions()}

						{/* Return / refund request (seller) — above tracking so it is always easy to find */}
						{order.IsSeller && ret && (
							<div
								className={`rounded-2xl border p-5 sm:p-6 mb-4 text-left ${
									ret.Status === 'Pending'
										? 'bg-amber-50 border-amber-200'
										: ret.Status === 'Approved'
											? 'bg-green-50 border-green-200'
											: 'bg-red-50 border-red-200'
								}`}
							>
								<div className='flex flex-wrap items-center gap-2 mb-3'>
									<RotateCcw size={20} className='text-amber-700' />
									<h3 className='font-semibold text-gray-900'>Return / refund request</h3>
									<span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-gray-200'>
										{order.RefundStatus === 'Refunded' ? 'Refunded' : ret.Status}
									</span>
								</div>
								<div className='text-left w-full mb-3'>
									<p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Buyer reason</p>
									<p className='text-sm text-gray-800 whitespace-pre-wrap'>{ret.Reason}</p>
								</div>
								{Array.isArray(ret.Media) && ret.Media.length > 0 && (
									<div className='flex flex-wrap gap-2 mb-4 justify-start'>
										{ret.Media.map((m) =>
											m.MediaType === 'video' ? (
												<video key={m.MediaId} src={m.MediaUrl} controls className='w-28 h-28 rounded-lg object-cover border border-gray-200' />
											) : (
												<img key={m.MediaId} src={m.MediaUrl} alt='' className='w-28 h-28 rounded-lg object-cover border border-gray-200' />
											)
										)}
									</div>
								)}
								{ret.Status === 'Pending' && (
									<div className='flex flex-wrap gap-2 pt-2 border-t border-amber-200'>
										<button
											type='button'
											onClick={() => setReturnApproveModal({ open: true, instructions: '', resolutionType: 'physical_return' })}
											disabled={resolvingReturn}
											className='flex-1 min-w-[140px] py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50'
										>
											Approve return
										</button>
										<button
											type='button'
											onClick={() => setReturnRejectModal({ open: true, reason: '' })}
											disabled={resolvingReturn}
											className='flex-1 min-w-[140px] py-2.5 text-sm font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-xl disabled:opacity-50'
										>
											Reject
										</button>
									</div>
								)}
							{ret.Status === 'Approved' && ret.ResolutionType && (
								<p className='text-sm text-gray-800 mb-2 text-left'>
									<span className='font-medium'>Resolution: </span>
									{ret.ResolutionType === 'refund_keep_product'
										? 'Refund / replacement — buyer keeps the product'
										: 'Physical return'}
								</p>
							)}
							{ret.Status === 'Approved' && ret.SellerInstructions && (
								<div className='mt-2 text-sm text-green-900 text-left'>
									<p className='text-xs font-semibold uppercase text-green-800 mb-1'>Your instructions to the buyer</p>
									<p className='whitespace-pre-wrap'>{ret.SellerInstructions}</p>
								</div>
							)}
								{ret.Status === 'Rejected' && ret.SellerRejectionReason && (
									<div className='text-sm text-red-800 mt-2 text-left'>
										<p className='text-xs font-semibold text-red-800 mb-1'>Your rejection note</p>
										<p className='whitespace-pre-wrap'>{ret.SellerRejectionReason}</p>
									</div>
								)}
								{ret.Status === 'Approved' && order.RefundStatus !== 'Refunded' && (
									<button
										type='button'
										onClick={submitMarkRefunded}
										disabled={markingRefunded}
										className='mt-4 w-full py-2.5 text-sm font-medium text-purple-800 bg-purple-100 border border-purple-200 hover:bg-purple-200 rounded-xl disabled:opacity-50'
									>
										{markingRefunded
										? 'Updating…'
										: ret.ResolutionType === 'refund_keep_product'
											? 'Confirm refund / remedy completed'
											: 'Mark return & refund completed'}
									</button>
								)}
							</div>
						)}

						{/* Tracking Info — shown when tracking number is available */}
					{order.TrackingNumber && (
						<div className='bg-blue-50 rounded-2xl border border-blue-200 p-5 sm:p-6 mb-4'>
							<div className='flex items-center gap-2 mb-3'>
								<Truck size={18} className='text-blue-600' />
								<h3 className='font-semibold text-gray-900'>Tracking Information</h3>
							</div>
							<div className='space-y-1.5'>
								<p className='text-sm text-gray-600'>
									Tracking Number:{' '}
									<span className='font-semibold text-gray-900 font-mono'>{order.TrackingNumber}</span>
								</p>
								{order.TrackingUrl && (
									<a
										href={order.TrackingUrl}
										target='_blank'
										rel='noopener noreferrer'
										className='text-sm text-blue-600 hover:text-blue-700 font-medium underline'
									>
										Track package &rarr;
									</a>
								)}
							</div>
						</div>
					)}

					{/* Rejection Reason — shown when order was rejected */}
					{order.DeliveryStatus === 'Rejected' && order.RejectionReason && (
						<div className='bg-red-50 rounded-2xl border border-red-200 p-5 sm:p-6 mb-4'>
							<div className='flex items-center gap-2 mb-2'>
								<XCircle size={18} className='text-red-500' />
								<h3 className='font-semibold text-red-800'>Rejection Reason</h3>
							</div>
							<p className='text-sm text-red-700'>{order.RejectionReason}</p>
						</div>
					)}

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
			{/* Rejection Modal */}
			{rejectionModal.open && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
					<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={closeRejectionModal} />
					<div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4'>
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0'>
								<AlertTriangle size={20} className='text-red-600' />
							</div>
							<div>
								<h3 className='font-bold text-gray-900'>Reject Order</h3>
								<p className='text-sm text-gray-500'>Please provide a reason for the buyer</p>
							</div>
						</div>
						<textarea
							value={rejectionModal.reason}
							onChange={(e) => setRejectionModal((prev) => ({ ...prev, reason: e.target.value }))}
							placeholder='e.g. Item is out of stock, unable to fulfil this order...'
							rows={3}
							disabled={updatingStatus}
							className='w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50'
						/>
						<div className='flex gap-3'>
							<button
								onClick={closeRejectionModal}
								disabled={updatingStatus}
								className='flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
							>
								Cancel
							</button>
							<button
								onClick={confirmRejection}
								disabled={updatingStatus || !rejectionModal.reason.trim()}
								className='flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50'
							>
								{updatingStatus ? <><Loader2 size={16} className='animate-spin' /> Rejecting...</> : 'Confirm Rejection'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Tracking Modal */}
			{trackingModal.open && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
					<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={closeTrackingModal} />
					<div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4'>
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0'>
								<Truck size={20} className='text-blue-600' />
							</div>
							<div>
								<h3 className='font-bold text-gray-900'>Add Tracking Information</h3>
								<p className='text-sm text-gray-500'>Required before marking as shipped</p>
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
									disabled={updatingStatus}
									className='w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Tracking URL <span className='text-red-500'>*</span>
								</label>
								<input
									type='url'
									value={trackingModal.trackingUrl}
									onChange={(e) => setTrackingModal((prev) => ({ ...prev, trackingUrl: e.target.value }))}
									placeholder='https://www.ups.com/track?tracknum=...'
									disabled={updatingStatus}
									className='w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50'
								/>
							</div>
						</div>
						<div className='flex gap-3'>
							<button
								onClick={closeTrackingModal}
								disabled={updatingStatus}
								className='flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
							>
								Cancel
							</button>
							<button
								onClick={confirmShipping}
								disabled={updatingStatus || !trackingModal.trackingNumber.trim() || !trackingModal.trackingUrl.trim()}
								className='flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50'
							>
								{updatingStatus ? <><Loader2 size={16} className='animate-spin' /> Shipping...</> : <><Send size={16} /> Confirm & Ship</>}
							</button>
						</div>
					</div>
				</div>
			)}

			{returnApproveModal.open && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
					<div
						className='absolute inset-0 bg-black/50 backdrop-blur-sm'
						onClick={() => !resolvingReturn && setReturnApproveModal({ open: false, instructions: '', resolutionType: 'physical_return' })}
					/>
					<div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto'>
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center'>
								<CheckCircle size={20} className='text-green-600' />
							</div>
							<div>
								<h3 className='font-bold text-gray-900'>Approve return / refund</h3>
								<p className='text-sm text-gray-500'>Choose how you will resolve this, then add clear instructions for the buyer.</p>
							</div>
						</div>
						<div className='space-y-2 text-left'>
							<p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Resolution type</p>
							<label className={`flex gap-3 p-3 rounded-xl border cursor-pointer ${returnApproveModal.resolutionType === 'physical_return' ? 'border-green-400 bg-green-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
								<input
									type='radio'
									name='resolutionType'
									checked={returnApproveModal.resolutionType === 'physical_return'}
									onChange={() => setReturnApproveModal((prev) => ({ ...prev, resolutionType: 'physical_return' }))}
									className='mt-1'
								/>
								<div>
									<p className='text-sm font-semibold text-gray-900'>Physical return</p>
									<p className='text-xs text-gray-600 mt-0.5'>Buyer ships the item back. Explain address, carrier, and refund timing after you receive it.</p>
								</div>
							</label>
							<label className={`flex gap-3 p-3 rounded-xl border cursor-pointer ${returnApproveModal.resolutionType === 'refund_keep_product' ? 'border-green-400 bg-green-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
								<input
									type='radio'
									name='resolutionType'
									checked={returnApproveModal.resolutionType === 'refund_keep_product'}
									onChange={() => setReturnApproveModal((prev) => ({ ...prev, resolutionType: 'refund_keep_product' }))}
									className='mt-1'
								/>
								<div>
									<p className='text-sm font-semibold text-gray-900'>Refund / replacement — buyer keeps the product</p>
									<p className='text-xs text-gray-600 mt-0.5'>Refund the payment and/or send a better or replacement item. The buyer keeps what they have. Explain timelines and next steps.</p>
								</div>
							</label>
						</div>
						<textarea
							rows={5}
							value={returnApproveModal.instructions}
							onChange={(e) => setReturnApproveModal((prev) => ({ ...prev, instructions: e.target.value }))}
							placeholder={
								returnApproveModal.resolutionType === 'physical_return'
									? 'e.g. Please ship to [address] with tracked mail. We refund within 5 business days of receipt.'
									: 'e.g. We will refund €X to your original payment within 3 days and ship a replacement by [date] / upgraded model details…'
							}
							disabled={resolvingReturn}
							className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50'
						/>
						<div className='flex gap-3'>
							<button
								type='button'
								onClick={() => setReturnApproveModal({ open: false, instructions: '', resolutionType: 'physical_return' })}
								disabled={resolvingReturn}
								className='flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50'
							>
								Cancel
							</button>
							<button
								type='button'
								onClick={submitReturnApprove}
								disabled={resolvingReturn}
								className='flex-1 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50'
							>
								{resolvingReturn ? 'Saving…' : 'Send to buyer'}
							</button>
						</div>
					</div>
				</div>
			)}

			{returnRejectModal.open && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
					<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={() => !resolvingReturn && setReturnRejectModal({ open: false, reason: '' })} />
					<div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4'>
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center'>
								<ThumbsDown size={20} className='text-red-600' />
							</div>
							<div>
								<h3 className='font-bold text-gray-900'>Reject return request</h3>
								<p className='text-sm text-gray-500'>Explain why the evidence or claim is not sufficient.</p>
							</div>
						</div>
						<textarea
							rows={4}
							value={returnRejectModal.reason}
							onChange={(e) => setReturnRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
							placeholder='e.g. Photos do not show the damage described…'
							disabled={resolvingReturn}
							className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50'
						/>
						<div className='flex gap-3'>
							<button
								type='button'
								onClick={() => setReturnRejectModal({ open: false, reason: '' })}
								disabled={resolvingReturn}
								className='flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50'
							>
								Cancel
							</button>
							<button
								type='button'
								onClick={submitReturnReject}
								disabled={resolvingReturn}
								className='flex-1 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50'
							>
								{resolvingReturn ? 'Saving…' : 'Reject request'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default SellerOrderDetail;
