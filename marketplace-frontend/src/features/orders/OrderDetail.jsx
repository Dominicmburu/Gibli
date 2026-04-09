import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
	Package, Clock, Truck, CheckCircle, XCircle, ArrowLeft,
	MapPin, User, Phone, Store, CreditCard, Calendar, Loader2, AlertTriangle, Star,
	RotateCcw, Upload, X, MessageCircle,
} from 'lucide-react';
import ChatModal from '../chat/ChatModal';

const statusConfig = {
	Processing: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Processing', buyerDesc: 'Your order is waiting for the seller to confirm' },
	Confirmed: { icon: CheckCircle, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', label: 'Confirmed', buyerDesc: 'The seller has accepted your order' },
	Shipped: { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Shipped', buyerDesc: 'Your order is on its way' },
	Delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered', buyerDesc: 'Your order has been delivered' },
	Sold: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Sold', buyerDesc: 'Your delivered order is now closed as sold' },
	Cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Cancelled', buyerDesc: 'This order has been cancelled' },
	Rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected', buyerDesc: 'The seller has rejected this order. Your stock has been restored.' },
	ReturnRequested: { icon: RotateCcw, color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Return requested', buyerDesc: 'Your return request is being reviewed by the seller' },
	ReturnApproved: { icon: CheckCircle, color: 'text-green-800', bg: 'bg-green-50', border: 'border-green-200', label: 'Return approved', buyerDesc: 'The seller approved your return — see instructions below' },
	Refunded: { icon: CheckCircle, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Refunded', buyerDesc: 'Your refund has been processed' },
};

const statusSteps = ['Processing', 'Confirmed', 'Shipped', 'Delivered'];
const MAX_REVIEW_IMAGES = 3;
const MAX_REVIEW_VIDEOS = 1;

const OrderDetail = () => {
	const { orderId } = useParams();
	const navigate = useNavigate();
	const [order, setOrder] = useState(null);
	const [loading, setLoading] = useState(true);
	const [cancelling, setCancelling] = useState(false);
	const [showCancelConfirm, setShowCancelConfirm] = useState(false);
	const [reviewEligibility, setReviewEligibility] = useState([]);
	const [reviewModalOpen, setReviewModalOpen] = useState(false);
	const [activeReviewItem, setActiveReviewItem] = useState(null);
	const [ratingForm, setRatingForm] = useState({ rating: 5, comment: '', files: [], existingMedia: [], removeMedia: [] });
	const [submittingReview, setSubmittingReview] = useState(false);
	const [selectedFilePreviews, setSelectedFilePreviews] = useState([]);
	const [showReturnModal, setShowReturnModal] = useState(false);
	const [returnReason, setReturnReason] = useState('');
	const [returnFiles, setReturnFiles] = useState([]);
	const [returnFilePreviews, setReturnFilePreviews] = useState([]);
	const [submittingReturn, setSubmittingReturn] = useState(false);
	const [returnSelectedItems, setReturnSelectedItems] = useState({}); // { orderItemId: quantity }
	const [buyerTrackingNumber, setBuyerTrackingNumber] = useState('');
	const [buyerTrackingUrl, setBuyerTrackingUrl] = useState('');
	const [submittingTracking, setSubmittingTracking] = useState(false);
	const [orderChatOpen, setOrderChatOpen] = useState(false);

	useEffect(() => {
		const fetchOrder = async () => {
			try {
				const response = await api.get(`/orders/${orderId}`);
				setOrder(response.data.data);
				if (['Delivered', 'Sold'].includes(response.data.data?.DeliveryStatus)) {
					const eligibilityResponse = await api.get(`/reviews/eligibility/order/${orderId}`);
					setReviewEligibility(eligibilityResponse.data?.data || []);
				}
			} catch (err) {
				console.error('Error fetching order:', err);
				if (err.response?.status === 401 || err.response?.status === 403) {
					navigate('/login');
					return;
				}
				toast.error('Failed to load order details.');
				navigate('/orders');
			} finally {
				setLoading(false);
			}
		};
		fetchOrder();
	}, [orderId, navigate]);

	useEffect(() => {
		const previews = ratingForm.files.map((file) => ({
			name: file.name,
			type: file.type,
			url: URL.createObjectURL(file),
		}));
		setSelectedFilePreviews(previews);

		return () => {
			previews.forEach((preview) => URL.revokeObjectURL(preview.url));
		};
	}, [ratingForm.files]);

	const reloadOrder = async () => {
		const response = await api.get(`/orders/${orderId}`);
		setOrder(response.data.data);
	};

	useEffect(() => {
		const previews = returnFiles.map((file) => ({
			name: file.name,
			type: file.type,
			url: URL.createObjectURL(file),
		}));
		setReturnFilePreviews(previews);
		return () => { previews.forEach((p) => URL.revokeObjectURL(p.url)); };
	}, [returnFiles]);

	const handleReturnFileSelect = (event) => {
		const picked = Array.from(event.target.files || []);
		if (picked.length === 0) return;
		let rejected = false;
		setReturnFiles((prev) => {
			const imgCount = prev.filter((f) => f.type?.startsWith('image/')).length;
			const vidCount = prev.filter((f) => f.type?.startsWith('video/')).length;
			let ic = imgCount; let vc = vidCount;
			const accepted = [];
			for (const file of picked) {
				if (file.type?.startsWith('image/') && ic < 3) { accepted.push(file); ic++; }
				else if (file.type?.startsWith('video/') && vc < 1) { accepted.push(file); vc++; }
				else rejected = true;
			}
			return [...prev, ...accepted];
		});
		if (rejected) toast.error('Max 3 images and 1 video.');
		event.target.value = '';
	};

	const removeReturnFile = (index) => setReturnFiles((prev) => prev.filter((_, i) => i !== index));

	const toggleReturnItem = (item) => {
		setReturnSelectedItems((prev) => {
			if (prev[item.OrderItemId]) {
				const next = { ...prev };
				delete next[item.OrderItemId];
				return next;
			}
			return { ...prev, [item.OrderItemId]: 1 };
		});
	};

	const setReturnItemQty = (orderItemId, qty) => {
		setReturnSelectedItems((prev) => ({ ...prev, [orderItemId]: Math.max(1, qty) }));
	};

	const handleSubmitReturn = async () => {
		const selectedCount = Object.keys(returnSelectedItems).length;
		if (selectedCount === 0) { toast.error('Please select at least one item to return.'); return; }
		setSubmittingReturn(true);
		try {
			const formData = new FormData();
			formData.append('reason', returnReason.trim());
			returnFiles.forEach((file) => formData.append('media', file));
			// Build returnItems array from selected items
			const returnItemsPayload = Object.entries(returnSelectedItems).map(([orderItemId, returnQuantity]) => {
				const item = order.OrderItems.find((i) => i.OrderItemId === orderItemId);
				return {
					orderItemId,
					productId: item?.ProductId || '',
					productName: item?.ProductName || '',
					productImageUrl: item?.ProductImageUrl || null,
					returnQuantity,
					unitPrice: item?.UnitPrice || 0,
				};
			});
			formData.append('returnItems', JSON.stringify(returnItemsPayload));
			await api.post(`/returns/orders/${orderId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
			toast.success('Return request submitted.');
			setShowReturnModal(false);
			setReturnReason('');
			setReturnFiles([]);
			setReturnSelectedItems({});
			await reloadOrder();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to submit return request.');
		} finally {
			setSubmittingReturn(false);
		}
	};

	const handleSubmitTracking = async () => {
		if (!buyerTrackingNumber.trim()) { toast.error('Tracking number is required.'); return; }
		if (!buyerTrackingUrl.trim()) { toast.error('Tracking URL is required.'); return; }
		setSubmittingTracking(true);
		try {
			const rrId = order.ReturnRequest?.ReturnRequestId;
			await api.patch(`/returns/${rrId}/buyer-tracking`, {
				buyerTrackingNumber: buyerTrackingNumber.trim(),
				buyerTrackingUrl: buyerTrackingUrl.trim(),
			});
			toast.success('Tracking info submitted. The seller has been notified.');
			setBuyerTrackingNumber('');
			setBuyerTrackingUrl('');
			await reloadOrder();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to submit tracking information.');
		} finally {
			setSubmittingTracking(false);
		}
	};

	const handleCancelOrder = async () => {
		setCancelling(true);
		try {
			await api.post(`/orders/${orderId}/cancel`);
			toast.success('Order cancelled successfully.');
			setOrder((prev) => ({ ...prev, DeliveryStatus: 'Cancelled' }));
			setShowCancelConfirm(false);
		} catch (err) {
			console.error('Cancel order error:', err);
			toast.error(err.response?.data?.message || 'Failed to cancel order.');
		} finally {
			setCancelling(false);
		}
	};

	if (loading) {
		return (
			<>
				<NavBar />
				<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
					<div className='flex flex-col items-center gap-3'>
						<Loader2 size={32} className='animate-spin text-primary-500' />
						<p className='text-gray-500'>Loading order details...</p>
					</div>
				</div>
				<Footer />
			</>
		);
	}

	if (!order) return null;

	const getDisplayStatus = (o) => {
		if (o.RefundStatus === 'Refunded') return 'Refunded';
		if (o.RefundStatus === 'ReturnApproved') return 'ReturnApproved';
		if (o.RefundStatus === 'ReturnRequested') return 'ReturnRequested';
		return o.DeliveryStatus;
	};
	const statusInfo = statusConfig[getDisplayStatus(order)] || statusConfig.Processing;
	const StatusIcon = statusInfo.icon;
	const isTerminal = order.DeliveryStatus === 'Cancelled' || order.DeliveryStatus === 'Rejected';
	const canCancel = order.DeliveryStatus === 'Processing';

	const subtotal = order.OrderItems.reduce((sum, item) => sum + item.UnitPrice * item.Quantity, 0);
	const shippingTotal = order.OrderItems.reduce((sum, item) => sum + (item.ShippingPrice || 0), 0);
	const currentStepIndex = isTerminal ? -1 : statusSteps.indexOf(order.DeliveryStatus);
	const canRateFromOrder = ['Delivered', 'Sold'].includes(order.DeliveryStatus);
	const deliveredAnchor = order.DeliveredAt || order.UpdatedAt;
	const returnWindowEndMs = deliveredAnchor ? new Date(deliveredAnchor).getTime() + 14 * 24 * 60 * 60 * 1000 : 0;
	const returnWindowDaysLeft = Math.floor((returnWindowEndMs - Date.now()) / (1000 * 60 * 60 * 24));

	const getEligibilityForItem = (orderItemId) => reviewEligibility.find((item) => item.OrderItemId === orderItemId);

	const returnStepInfo = () => {
		const rr = order.ReturnRequest;
		if (!rr) return null;
		const resType = rr.ResolutionType;
		const rrStatus = rr.Status;
		const refunded = order.RefundStatus === 'Refunded';
		if (rrStatus === 'Rejected') return { steps: ['Requested', 'Rejected'], currentStep: 1, rejected: true };
		if (resType === 'physical_return' || !resType) {
			const steps = ['Requested', 'Approved', 'Shipped', 'Refunded'];
			let cur = 0;
			if (refunded) cur = 3;
			else if (rrStatus === 'Approved') cur = rr.BuyerTrackingNumber ? 2 : 1;
			return { steps, currentStep: cur, rejected: false };
		}
		if (resType === 'exchange') {
			const steps = ['Requested', 'Approved', 'Exchange Complete'];
			let cur = 0;
			if (refunded) cur = 2;
			else if (rrStatus === 'Approved') cur = 1;
			return { steps, currentStep: cur, rejected: false };
		}
		// refund_without_return / auto_approved
		const steps = ['Requested', 'Approved', 'Refunded'];
		let cur = 0;
		if (refunded) cur = 2;
		else if (rrStatus === 'Approved') cur = 1;
		return { steps, currentStep: cur, rejected: false };
	};

	const openReviewModal = (item, existingReview = null) => {
		setActiveReviewItem(item);
		setRatingForm({
			rating: existingReview?.Rating || 5,
			comment: existingReview?.Comment || '',
			files: [],
			existingMedia: Array.isArray(existingReview?.Media) ? existingReview.Media : [],
			removeMedia: [],
		});
		setReviewModalOpen(true);
	};

	const removeExistingMedia = (mediaId) => {
		setRatingForm((prev) => ({
			...prev,
			existingMedia: prev.existingMedia.filter((media) => media.MediaId !== mediaId),
			removeMedia: [...new Set([...prev.removeMedia, mediaId])],
		}));
	};

	const removeNewFileByName = (name) => {
		setRatingForm((prev) => ({
			...prev,
			files: prev.files.filter((file) => file.name !== name),
		}));
	};

	const handleSelectReviewMedia = (event) => {
		const pickedFiles = Array.from(event.target.files || []);
		if (pickedFiles.length === 0) return;

		let rejected = false;
		setRatingForm((prev) => {
			const existingImages =
				prev.existingMedia.filter((media) => media.MediaType === 'image').length
				+ prev.files.filter((file) => file.type?.startsWith('image/')).length;
			const existingVideos =
				prev.existingMedia.filter((media) => media.MediaType === 'video').length
				+ prev.files.filter((file) => file.type?.startsWith('video/')).length;

			let imageCount = existingImages;
			let videoCount = existingVideos;
			const acceptedFiles = [];

			for (const file of pickedFiles) {
				const isImage = file.type?.startsWith('image/');
				const isVideo = file.type?.startsWith('video/');
				if (isImage) {
					if (imageCount < MAX_REVIEW_IMAGES) {
						acceptedFiles.push(file);
						imageCount += 1;
					} else {
						rejected = true;
					}
				} else if (isVideo) {
					if (videoCount < MAX_REVIEW_VIDEOS) {
						acceptedFiles.push(file);
						videoCount += 1;
					} else {
						rejected = true;
					}
				} else {
					rejected = true;
				}
			}

			return {
				...prev,
				files: [...prev.files, ...acceptedFiles],
			};
		});

		if (rejected) {
			toast.error(`You can upload up to ${MAX_REVIEW_IMAGES} images and ${MAX_REVIEW_VIDEOS} video.`);
		}
		event.target.value = '';
	};

	const handleSubmitReview = async () => {
		if (!activeReviewItem) return;
		try {
			setSubmittingReview(true);
			const eligibility = getEligibilityForItem(activeReviewItem.OrderItemId);
			const formData = new FormData();
			formData.append('productId', activeReviewItem.ProductId);
			formData.append('orderId', order.OrderId);
			formData.append('orderItemId', activeReviewItem.OrderItemId);
			formData.append('rating', ratingForm.rating.toString());
			formData.append('comment', ratingForm.comment || '');
			formData.append('productName', activeReviewItem.ProductName || '');
			ratingForm.files.forEach((file) => formData.append('media', file));

			if (eligibility?.ReviewId) {
				if (ratingForm.removeMedia.length > 0) {
					formData.append('removeMedia', JSON.stringify(ratingForm.removeMedia));
				}
				await api.patch(`/reviews/${eligibility.ReviewId}`, formData, {
					headers: { 'Content-Type': 'multipart/form-data' },
				});
				toast.success('Review updated.');
			} else {
				await api.post('/reviews', formData, {
					headers: { 'Content-Type': 'multipart/form-data' },
				});
				toast.success('Review submitted.');
			}
			const eligibilityResponse = await api.get(`/reviews/eligibility/order/${orderId}`);
			setReviewEligibility(eligibilityResponse.data?.data || []);
			setReviewModalOpen(false);
		} catch (error) {
			console.error('Failed to submit review:', error);
			toast.error(error?.response?.data?.message || 'Unable to submit review right now.');
		} finally {
			setSubmittingReview(false);
		}
	};

	return (
		<>
			<NavBar />
			<div className='min-h-screen bg-gray-50'>
				<div className='max-w-4xl mx-auto px-4 sm:px-6 py-8'>
					{/* Back button */}
					<button
						onClick={() => navigate('/orders')}
						className='flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors'
					>
						<ArrowLeft size={16} />
						Back to Orders
					</button>

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
						{canCancel && (
							<button
								onClick={() => setShowCancelConfirm(true)}
								className='text-sm font-medium text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors'
							>
								Cancel Order
							</button>
						)}
					</div>

					{/* ROW 1: Order Status */}
					<div className={`rounded-2xl border ${statusInfo.border} ${statusInfo.bg} p-5 sm:p-6 mb-4`}>
						<div className='flex items-center gap-3 mb-4'>
							<div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusInfo.bg} border ${statusInfo.border}`}>
								<StatusIcon size={20} className={statusInfo.color} />
							</div>
							<div>
								<h2 className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</h2>
								<p className='text-sm text-gray-600'>{statusInfo.buyerDesc}</p>
							</div>
						</div>

						{order.ReturnRequest ? (() => {
							const info = returnStepInfo();
							if (!info) return null;
							const { steps, currentStep, rejected } = info;
							return (
								<div className='flex items-center gap-1 mt-4'>
									{steps.map((step, idx) => {
										const isCompleted = idx < currentStep;
										const isCurrent = idx === currentStep;
										const isError = rejected && idx === steps.length - 1;
										return (
											<div key={step} className='flex-1 flex items-center gap-1'>
												<div className='flex-1'>
													<div className={`h-2 rounded-full transition-all ${isError ? 'bg-red-400' : (isCompleted || isCurrent) ? 'bg-primary-500' : 'bg-gray-200'}`} />
													<p className={`text-xs mt-1.5 ${isError ? 'font-semibold text-red-600' : isCurrent ? 'font-semibold text-primary-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>{step}</p>
												</div>
											</div>
										);
									})}
								</div>
							);
						})() : (
							!isTerminal && (
								<div className='flex items-center gap-1 mt-4'>
									{statusSteps.map((step, index) => {
										const isCompleted = index <= currentStepIndex;
										const isCurrent = index === currentStepIndex;
										return (
											<div key={step} className='flex-1 flex items-center gap-1'>
												<div className='flex-1'>
													<div className={`h-2 rounded-full transition-all ${isCompleted ? 'bg-primary-500' : 'bg-gray-200'}`} />
													<p className={`text-xs mt-1.5 ${isCurrent ? 'font-semibold text-primary-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
														{step}
													</p>
												</div>
											</div>
										);
									})}
								</div>
							)
						)}

						{canRateFromOrder && reviewEligibility.some(e => e.CanReview && !e.ReviewedThisOrder) && (
							<div className='mt-4 pt-4 border-t border-gray-200'>
								<p className='text-sm text-gray-700'>
									Your order is {order.DeliveryStatus.toLowerCase()}. You can rate each item within 15 days.
								</p>
							</div>
						)}
					</div>

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
										Track your package &rarr;
									</a>
								)}
							</div>
						</div>
					)}

					{/* Return Details — shown when a return is active */}
					{order.ReturnRequest && (
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4'>
							<div className='flex items-center gap-2 mb-3'>
								<RotateCcw size={18} className='text-amber-600' />
								<h3 className='font-semibold text-gray-900'>Return / Refund</h3>
							</div>
							<p className='text-sm text-gray-600 mb-1'>
								<span className='font-medium'>Your reason: </span>{order.ReturnRequest.Reason}
							</p>
							{order.ReturnRequest.Status === 'Pending' && (
								<p className='text-xs text-amber-700 mt-2'>The seller has 3 days to respond. If no response, your return will be auto-approved.</p>
							)}
							{order.ReturnRequest.SellerInstructions && (
								<div className='mt-3 bg-green-50 rounded-xl border border-green-200 p-3'>
									<p className='text-xs font-semibold text-green-800 mb-1'>Seller return instructions</p>
									<p className='text-sm text-green-900 whitespace-pre-wrap'>{order.ReturnRequest.SellerInstructions}</p>
								</div>
							)}
							{order.ReturnRequest.SellerRejectionReason && (
								<div className='mt-3 bg-red-50 rounded-xl border border-red-200 p-3'>
									<p className='text-xs font-semibold text-red-800 mb-1'>Rejection reason</p>
									<p className='text-sm text-red-800 whitespace-pre-wrap'>{order.ReturnRequest.SellerRejectionReason}</p>
								</div>
							)}
							{order.ReturnRequest.BuyerTrackingNumber && (
								<div className='mt-3 bg-blue-50 rounded-xl border border-blue-200 p-3'>
									<p className='text-xs font-semibold text-blue-800 mb-1'>Your shipment tracking</p>
									<p className='text-sm text-blue-900 font-mono'>{order.ReturnRequest.BuyerTrackingNumber}</p>
									{order.ReturnRequest.BuyerTrackingUrl && (
										<a href={order.ReturnRequest.BuyerTrackingUrl} target='_blank' rel='noopener noreferrer' className='text-xs text-blue-600 hover:text-blue-700 underline mt-1 block'>
											Track your shipment &rarr;
										</a>
									)}
								</div>
							)}
							{order.RefundStatus === 'Refunded' && (
								<div className='mt-3 bg-purple-50 rounded-xl border border-purple-200 p-3'>
									<p className='text-sm text-purple-700 font-medium'>Your refund has been processed. Funds typically appear within 5–10 business days.</p>
								</div>
							)}
							{order.RefundStatus === 'PartialRefunded' && (
								<div className='mt-3 bg-blue-50 rounded-xl border border-blue-200 p-3'>
									<p className='text-xs font-semibold text-blue-800 mb-1'>Partial refund agreed</p>
									<p className='text-sm text-blue-800'>
										A partial refund of <strong>€{Number(order.ReturnRequest?.PartialRefundAmount || 0).toFixed(2)}</strong> has been processed.
										You keep the item.
									</p>
									{order.ReturnRequest?.SellerInstructions && (
										<p className='text-xs text-blue-600 mt-1 italic'>"{order.ReturnRequest.SellerInstructions}"</p>
									)}
									<p className='text-xs text-blue-500 mt-1'>Funds typically appear within 5–10 business days.</p>
								</div>
							)}
						</div>
					)}

					{/* Buyer tracking form — physical return approved, no tracking submitted yet */}
					{order.IsBuyer && order.ReturnRequest?.Status === 'Approved' &&
					 order.ReturnRequest?.ResolutionType === 'physical_return' &&
					 !order.ReturnRequest?.BuyerTrackingNumber && (
						<div className='bg-blue-50 rounded-2xl border border-blue-200 p-5 sm:p-6 mb-4'>
							<div className='flex items-center gap-2 mb-2'>
								<Truck size={18} className='text-blue-600' />
								<h3 className='font-semibold text-gray-900'>Ship the item back</h3>
							</div>
							<p className='text-sm text-gray-600 mb-4'>
								Follow the seller's instructions above. Once you have shipped the item, enter your tracking details here. The seller will confirm receipt and issue your refund.
							</p>
							<div className='space-y-3'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Tracking Number <span className='text-red-500'>*</span></label>
									<input
										type='text'
										value={buyerTrackingNumber}
										onChange={(e) => setBuyerTrackingNumber(e.target.value)}
										placeholder='e.g. JD014600006653200001'
										className='w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400'
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Tracking URL <span className='text-red-500'>*</span></label>
									<input
										type='url'
										value={buyerTrackingUrl}
										onChange={(e) => setBuyerTrackingUrl(e.target.value)}
										placeholder='https://track.carrier.com/...'
										className='w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400'
									/>
								</div>
								<button
									onClick={handleSubmitTracking}
									disabled={submittingTracking || !buyerTrackingNumber.trim() || !buyerTrackingUrl.trim()}
									className='w-full py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
								>
									{submittingTracking ? (
										<><Loader2 size={14} className='animate-spin' /> Submitting...</>
									) : (
										'I have shipped the item'
									)}
								</button>
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

					{/* ROW 2: Shipping Address */}
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

					{/* ROW 3: Seller Info */}
					<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4'>
						<div className='flex items-center gap-2 mb-3'>
							<Store size={18} className='text-primary-500' />
							<h3 className='font-semibold text-gray-900'>Seller</h3>
						</div>
						<div className='flex items-center justify-between'>
							<div>
								<p className='text-sm font-medium text-gray-900'>{order.SellerName}</p>
								<p className='text-xs text-gray-500'>{order.SellerCountry}</p>
							</div>
							{order.IsBuyer && (
								<button
									onClick={() => setOrderChatOpen(true)}
									className='flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium rounded-xl transition-colors'
								>
									<MessageCircle size={14} />
									Chat Seller
								</button>
							)}
						</div>
					</div>

					{/* Order Chat Modal */}
					{orderChatOpen && (
						<ChatModal
							isOpen={orderChatOpen}
							onClose={() => setOrderChatOpen(false)}
							sellerId={order.SellerId}
							contextType='order'
							contextId={order.OrderId}
							contextData={{
								orderId: order.OrderId,
								total: order.TotalAmount,
								date: order.OrderDate,
								status: order.DeliveryStatus,
							}}
							sellerName={order.SellerName}
						/>
					)}

					{/* ROW 4: Order Items */}
					<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4'>
						<div className='flex items-center gap-2 mb-4'>
							<Package size={18} className='text-primary-500' />
							<h3 className='font-semibold text-gray-900'>
								Items ({order.OrderItems.length})
							</h3>
						</div>
						<div className='divide-y divide-gray-100'>
							{order.OrderItems.map((item) => {
								const eligibility = getEligibilityForItem(item.OrderItemId);
								const canReviewItem = !!eligibility?.CanReview;
								const hasReview = !!eligibility?.ReviewId;
								return (
									<div key={item.OrderItemId} className='flex items-center gap-4 py-4 first:pt-0 last:pb-0'>
										<button type='button' onClick={() => navigate(`/product/${item.ProductId}`)} className='w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 hover:opacity-80 transition-opacity'>
											{item.ProductImageUrl ? (
												<img src={item.ProductImageUrl} alt={item.ProductName} className='w-full h-full object-cover' />
											) : (
												<div className='w-full h-full flex items-center justify-center'>
													<Package size={20} className='text-gray-300' />
												</div>
											)}
										</button>
										<div className='flex-1 min-w-0'>
											<button type='button' onClick={() => navigate(`/product/${item.ProductId}`)} className='text-sm font-medium text-gray-900 hover:text-primary-600 hover:underline truncate text-left'>{item.ProductName}</button>
											<p className='text-xs text-gray-500 mt-0.5'>Qty: {item.Quantity} &times; &euro;{Number(item.UnitPrice).toFixed(2)}</p>
											<p className='text-xs text-gray-400 mt-0.5'>
												Shipping: {item.ShippingType} (&euro;{Number(item.ShippingPrice).toFixed(2)})
											</p>
											{canRateFromOrder && (
												<div className='mt-2'>
													{!!eligibility?.ReviewedThisOrder ? null : (
													hasReview && canReviewItem ? (
														<button type='button' onClick={() => openReviewModal(item, eligibility)} className='text-xs font-medium text-primary-600 hover:text-primary-700 underline'>
															Edit your review
														</button>
													) : canReviewItem ? (
														<button type='button' onClick={() => openReviewModal(item)} className='text-xs font-medium text-primary-600 hover:text-primary-700 underline'>
															Rate this product
														</button>
													) : !hasReview ? (
														<p className='text-xs text-gray-400'>Review window closed for this item.</p>
													) : null
				)}
												</div>
											)}
										</div>
										<p className='text-sm font-bold text-gray-900 flex-shrink-0'>
											&euro;{Number(item.ItemTotal).toFixed(2)}
										</p>
									</div>
								);
							})}
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

					{/* Request a return — buyer only, after delivery, no active return */}
					{order.IsBuyer && ['Delivered', 'Sold'].includes(order.DeliveryStatus) &&
					 !['ReturnRequested', 'ReturnApproved', 'Refunded'].includes(order.RefundStatus) && (
						returnWindowDaysLeft > 0 ? (
							<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4 flex items-center justify-between gap-4'>
								<div>
									<p className='text-sm font-medium text-gray-700'>Return window</p>
									<p className='text-xs text-gray-500'>{returnWindowDaysLeft} day{returnWindowDaysLeft !== 1 ? 's' : ''} remaining</p>
								</div>
								<button
									onClick={() => setShowReturnModal(true)}
									className='text-sm font-medium text-amber-700 border border-amber-200 hover:bg-amber-50 px-4 py-2 rounded-lg transition-colors whitespace-nowrap'
								>
									Request a return
								</button>
							</div>
						) : (
							<p className='text-sm text-gray-400 mb-4'>The 14-day return window has closed.</p>
						)
					)}
				</div>
			</div>

			{/* Cancel Confirmation Modal */}

			{/* Cancel Confirmation Modal */}
			{showCancelConfirm && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
					<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={() => !cancelling && setShowCancelConfirm(false)} />
					<div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center'>
						<div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
							<AlertTriangle size={24} className='text-red-500' />
						</div>
						<h3 className='text-lg font-bold text-gray-900 mb-2'>Cancel Order?</h3>
						<p className='text-sm text-gray-500 mb-6'>This will cancel your order and restore the stock. This action cannot be undone.</p>
						<div className='flex gap-3'>
							<button onClick={() => setShowCancelConfirm(false)} disabled={cancelling} className='flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'>Keep Order</button>
							<button onClick={handleCancelOrder} disabled={cancelling} className='flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50'>
								{cancelling ? (<><Loader2 size={16} className='animate-spin' />Cancelling...</>) : 'Cancel Order'}
							</button>
						</div>
					</div>
				</div>
			)}

			{reviewModalOpen && activeReviewItem && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
					<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={() => !submittingReview && setReviewModalOpen(false)} />
					<div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6'>
						<h3 className='text-lg font-bold text-gray-900 mb-1'>{getEligibilityForItem(activeReviewItem.OrderItemId)?.ReviewId ? 'Update review' : 'Rate product'}</h3>
						<p className='text-sm text-gray-500 mb-4'>{activeReviewItem.ProductName}</p>
						<div className='space-y-4'>
							<div>
								<p className='text-sm font-medium text-gray-700 mb-2'>Rating</p>
								<div className='flex items-center gap-2'>
									{[1, 2, 3, 4, 5].map((star) => (
										<button key={star} type='button' onClick={() => setRatingForm((prev) => ({ ...prev, rating: star }))} className='p-1'>
											<Star size={20} className={star <= ratingForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
										</button>
									))}
								</div>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>Comment</label>
								<textarea rows={4} value={ratingForm.comment} onChange={(event) => setRatingForm((prev) => ({ ...prev, comment: event.target.value }))} placeholder='Share your experience with this product' className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm' />
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>Images/Videos (max {MAX_REVIEW_IMAGES} images, {MAX_REVIEW_VIDEOS} video)</label>
								<input type='file' multiple accept='image/*,video/*' onChange={handleSelectReviewMedia} className='block w-full text-sm text-gray-600' />
							</div>
							{(ratingForm.existingMedia.length > 0 || selectedFilePreviews.length > 0) && (
								<div>
									<p className='text-sm font-medium text-gray-700 mb-2'>Media preview</p>
									<div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
										{ratingForm.existingMedia.map((media) => (
											<div key={media.MediaId} className='relative group'>
												{media.MediaType === 'video' ? <video src={media.MediaUrl} controls className='w-full h-24 object-cover rounded-lg border border-gray-200' /> : <img src={media.MediaUrl} alt='Existing review media' className='w-full h-24 object-cover rounded-lg border border-gray-200' />}
												<button type='button' onClick={() => removeExistingMedia(media.MediaId)} className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors'>×</button>
											</div>
										))}
										{selectedFilePreviews.map((preview) => (
											<div key={preview.url} className='relative group'>
												{preview.type.startsWith('video/') ? <video src={preview.url} controls className='w-full h-24 object-cover rounded-lg border border-gray-200' /> : <img src={preview.url} alt={preview.name} className='w-full h-24 object-cover rounded-lg border border-gray-200' />}
												<button type='button' onClick={() => removeNewFileByName(preview.name)} className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors'>×</button>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
						<div className='flex justify-end gap-3 mt-6'>
							<button type='button' onClick={() => setReviewModalOpen(false)} disabled={submittingReview} className='px-4 py-2 border border-gray-300 rounded-lg text-sm'>Cancel</button>
							<button type='button' onClick={handleSubmitReview} disabled={submittingReview} className='px-4 py-2 bg-primary-500 text-white rounded-lg text-sm flex items-center gap-2'>
								{submittingReview && <Loader2 size={14} className='animate-spin' />}
								{submittingReview ? 'Saving...' : 'Submit review'}
							</button>
						</div>
					</div>
				</div>
			)}
			{/* Return Request Modal */}
			{showReturnModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
					<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={() => !submittingReturn && setShowReturnModal(false)} />
					<div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6'>
						<div className='flex items-center justify-between mb-4'>
							<h3 className='text-lg font-bold text-gray-900'>Request a return</h3>
							<button onClick={() => !submittingReturn && setShowReturnModal(false)} className='text-gray-400 hover:text-gray-600'><X size={20} /></button>
						</div>
						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>Items to return <span className='text-red-500'>*</span></label>
								<div className='space-y-2 max-h-48 overflow-y-auto pr-1'>
									{order.OrderItems.map((item) => {
										const checked = !!returnSelectedItems[item.OrderItemId];
										const qty = returnSelectedItems[item.OrderItemId] || 1;
										return (
											<div key={item.OrderItemId} onClick={() => toggleReturnItem(item)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-200'}`}>
												<input type='checkbox' checked={checked} onChange={() => toggleReturnItem(item)} onClick={(e) => e.stopPropagation()} className='accent-amber-500 w-4 h-4 flex-shrink-0' />
												{item.ProductImageUrl && <img src={item.ProductImageUrl} alt={item.ProductName} className='w-10 h-10 object-cover rounded-lg flex-shrink-0' />}
												<div className='flex-1 min-w-0'>
													<p className='text-sm font-medium text-gray-900 truncate'>{item.ProductName}</p>
													<p className='text-xs text-gray-500'>&euro;{Number(item.UnitPrice).toFixed(2)} each</p>
												</div>
												{checked && item.Quantity > 1 && (
													<div className='flex items-center gap-1 flex-shrink-0' onClick={(e) => e.stopPropagation()}>
														<button type='button' onClick={() => setReturnItemQty(item.OrderItemId, qty - 1)} disabled={qty <= 1} className='w-6 h-6 rounded-full border border-gray-300 text-gray-600 text-sm font-bold flex items-center justify-center hover:bg-gray-100 disabled:opacity-40'>-</button>
														<span className='text-sm font-medium w-4 text-center'>{qty}</span>
														<button type='button' onClick={() => setReturnItemQty(item.OrderItemId, qty + 1)} disabled={qty >= item.Quantity} className='w-6 h-6 rounded-full border border-gray-300 text-gray-600 text-sm font-bold flex items-center justify-center hover:bg-gray-100 disabled:opacity-40'>+</button>
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>Reason <span className='text-xs text-gray-400 font-normal'>(optional)</span></label>
								<textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder='Describe the issue (e.g. damaged, wrong item, not as described)...' rows={4} className='w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none' />
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>Evidence photos/video</label>
								<p className='text-xs text-gray-500 mb-2'>Optional. Max 3 images + 1 video.</p>
								<label className='flex items-center gap-2 cursor-pointer text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200 hover:bg-primary-50 px-4 py-2 rounded-lg w-fit transition-colors'>
									<Upload size={14} />
									Add photos/videos
									<input type='file' multiple accept='image/*,video/*' className='hidden' onChange={handleReturnFileSelect} />
								</label>
								{returnFilePreviews.length > 0 && (
									<div className='flex flex-wrap gap-2 mt-3'>
										{returnFilePreviews.map((p, i) => (
											<div key={i} className='relative'>
												{p.type.startsWith('video/') ? <video src={p.url} className='w-20 h-20 rounded-lg object-cover border border-gray-200' /> : <img src={p.url} alt='' className='w-20 h-20 rounded-lg object-cover border border-gray-200' />}
												<button type='button' onClick={() => removeReturnFile(i)} className='absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600'><X size={10} /></button>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						<div className='flex gap-3 mt-6'>
							<button onClick={() => !submittingReturn && setShowReturnModal(false)} disabled={submittingReturn} className='flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50'>Cancel</button>
							<button onClick={handleSubmitReturn} disabled={submittingReturn || Object.keys(returnSelectedItems).length === 0} className='flex-1 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50'>
								{submittingReturn ? 'Submitting...' : 'Submit return request'}
							</button>
						</div>
					</div>
				</div>
			)}
			<Footer />
		</>
	);
};

export default OrderDetail;
