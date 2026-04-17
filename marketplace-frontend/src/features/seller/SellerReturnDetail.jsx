import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
	ArrowLeft, RotateCcw, Loader2, Clock, CheckCircle, XCircle,
	Package, User, ThumbsUp, ThumbsDown, BadgeCheck, Image, Zap,
	Truck, RefreshCcw, DollarSign, SplitSquareHorizontal, Upload,
	Link as LinkIcon,
} from 'lucide-react';

function hoursUntilAutoApprove(dateStr) {
	if (!dateStr) return 72;
	const elapsed = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
	return Math.max(0, 72 - elapsed);
}

function UrgencyBadge({ dateStr, large = false }) {
	const hours = hoursUntilAutoApprove(dateStr);
	let label, cls;
	if (hours <= 0) {
		label = 'Overdue — auto-approving shortly'; cls = 'bg-red-600 text-white';
	} else if (hours < 24) {
		const h = Math.floor(hours);
		const m = Math.floor((hours - h) * 60);
		label = `${h}h ${m}m left to respond`; cls = 'bg-red-100 text-red-800';
	} else if (hours < 48) {
		label = '1 day left to respond'; cls = 'bg-orange-100 text-orange-800';
	} else {
		label = `${Math.min(3, Math.ceil(hours / 24))} days left to respond`; cls = 'bg-green-100 text-green-800';
	}
	return (
		<span className={`inline-flex items-center gap-1.5 font-semibold rounded-lg ${large ? 'text-sm px-3 py-2' : 'text-xs px-2.5 py-1'} ${cls}`}>
			<Clock size={large ? 14 : 11} /> {label}
		</span>
	);
}

const statusConfig = {
	Pending:         { label: 'Awaiting response',       bg: 'bg-amber-50',  color: 'text-amber-900',  border: 'border-amber-200',  icon: Clock                 },
	Approved:        { label: 'Approved — action needed', bg: 'bg-green-50',  color: 'text-green-900',  border: 'border-green-200',  icon: CheckCircle           },
	Refunded:        { label: 'Completed',                bg: 'bg-purple-50', color: 'text-purple-900', border: 'border-purple-200', icon: BadgeCheck            },
	Rejected:        { label: 'Rejected',                 bg: 'bg-red-50',    color: 'text-red-900',    border: 'border-red-200',    icon: XCircle               },
	PartialRefunded: { label: 'Partial refund — complete',bg: 'bg-blue-50',   color: 'text-blue-900',   border: 'border-blue-200',   icon: SplitSquareHorizontal },
};

const RESOLUTION_OPTIONS = [
	{
		value: 'physical_return',
		icon: Truck,
		title: 'Request item back',
		desc: 'Buyer ships the item back. You transfer the money manually, then upload proof.',
	},
	{
		value: 'refund_without_return',
		icon: RefreshCcw,
		title: 'Full refund — buyer keeps item',
		desc: 'Transfer the full order amount to the buyer manually, then upload proof of transfer.',
	},
	{
		value: 'partial_refund',
		icon: SplitSquareHorizontal,
		title: 'Partial refund — buyer keeps item',
		desc: 'Transfer an agreed partial amount to the buyer manually, then upload proof.',
	},
	{
		value: 'exchange',
		icon: RefreshCcw,
		title: 'Exchange / Replacement',
		desc: 'Ship a replacement item to the buyer. No money involved — tracked via shipping flow.',
	},
];

const SellerReturnDetail = () => {
	const { returnRequestId } = useParams();
	const navigate = useNavigate();
	const [ret, setRet] = useState(null);
	const [loading, setLoading] = useState(true);
	const [approveModal, setApproveModal] = useState(false);
	const [rejectModal, setRejectModal] = useState(false);
	const [resolutionType, setResolutionType] = useState('physical_return');
	const [instructions, setInstructions] = useState('');
	const [storeReturnAddress, setStoreReturnAddress] = useState('');
	const [rejectionReason, setRejectionReason] = useState('');
	const [submitting, setSubmitting] = useState(false);

	// Partial refund fields
	const [partialAmount, setPartialAmount] = useState('');
	const [partialNote, setPartialNote] = useState('');

	// Proof upload
	const [proofFile, setProofFile] = useState(null);
	const [uploadingProof, setUploadingProof] = useState(false);
	const proofInputRef = useRef(null);

	// Exchange tracking
	const [exchangeTracking, setExchangeTracking] = useState('');
	const [exchangeTrackingUrl, setExchangeTrackingUrl] = useState('');
	const [savingTracking, setSavingTracking] = useState(false);
	const [markingShipped, setMarkingShipped] = useState(false);
	const [markingDelivered, setMarkingDelivered] = useState(false);

	// Commission refund
	const [commissionModal, setCommissionModal] = useState(false);
	const [commissionNote, setCommissionNote] = useState('');
	const [submittingCommission, setSubmittingCommission] = useState(false);
	const [commissionRequestSent, setCommissionRequestSent] = useState(false);

	const buildTemplate = (retData, returnAddr) => {
		const biz = retData?.SellerBusinessName || '[Business Name]';
		const addr = returnAddr || '[Your Address\nCity, Postcode, Country]';
		const orderId = retData?.OrderId ? `#${retData.OrderId.slice(0, 8)}` : '';
		return `Please send the item(s) to:\n${biz}\n${addr}\n\nUse tracked/signed-for shipping and keep your receipt.\nReference order ${orderId} on the parcel.`;
	};

	useEffect(() => {
		api.get('/uploads/store-info').then((res) => {
			setStoreReturnAddress(res.data?.data?.ReturnAddress || '');
		}).catch(() => {});
	}, []);

	const loadDetail = async () => {
		try {
			const res = await api.get(`/returns/${returnRequestId}/detail`);
			const data = res.data?.data;
			setRet(data);
			// Pre-fill exchange tracking if already set
			if (data?.ExchangeTrackingNumber) setExchangeTracking(data.ExchangeTrackingNumber);
			if (data?.ExchangeTrackingUrl) setExchangeTrackingUrl(data.ExchangeTrackingUrl);
		} catch (err) {
			console.error('Failed to load return detail:', err);
			if (err.response?.status === 401 || err.response?.status === 403) navigate('/login');
			else { toast.error('Failed to load return details.'); navigate('/my-returns'); }
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadDetail(); }, [returnRequestId]);

	// ── Approve ──────────────────────────────────────────────────────────
	const handleApprove = async () => {
		const isPhysical = resolutionType === 'physical_return';
		const isPartial  = resolutionType === 'partial_refund';

		if (isPhysical && instructions.trim().length < 15) {
			toast.error('Please provide return instructions (at least 15 characters).');
			return;
		}
		if (isPartial) {
			const amt = parseFloat(partialAmount);
			if (!amt || amt <= 0) { toast.error('Please enter a valid refund amount.'); return; }
			if (amt > Number(ret?.TotalAmount || 0)) {
				toast.error(`Amount cannot exceed the order total of €${Number(ret?.TotalAmount || 0).toFixed(2)}.`);
				return;
			}
		}

		setSubmitting(true);
		try {
			let instrText = instructions.trim();
			if (!instrText && resolutionType === 'refund_without_return') {
				instrText = 'You do not need to return the item. The seller will transfer the refund to you directly.';
			}
			if (!instrText && resolutionType === 'exchange') {
				instrText = 'A replacement item will be shipped to you. No need to return the original.';
			}
			if (!instrText && isPartial) {
				instrText = `The seller will transfer €${parseFloat(partialAmount).toFixed(2)} to you directly. You may keep the item.`;
			}

			await api.patch(`/returns/${returnRequestId}`, {
				decision: 'approve',
				sellerInstructions: instrText,
				resolutionType,
				partialRefundAmount: isPartial ? parseFloat(partialAmount) : undefined,
			});

			toast.success('Return approved. Buyer has been notified.');
			setApproveModal(false);
			await loadDetail();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to approve return.');
		} finally {
			setSubmitting(false);
		}
	};

	// ── Reject ──────────────────────────────────────────────────────────
	const handleReject = async () => {
		if (rejectionReason.trim().length < 10) {
			toast.error('Please explain your rejection reason (at least 10 characters).');
			return;
		}
		setSubmitting(true);
		try {
			await api.patch(`/returns/${returnRequestId}`, {
				decision: 'reject',
				sellerRejectionReason: rejectionReason.trim(),
			});
			toast.success('Return rejected. Buyer has been notified.');
			setRejectModal(false);
			await loadDetail();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to reject return.');
		} finally {
			setSubmitting(false);
		}
	};

	// ── Upload proof of bank transfer ────────────────────────────────────
	const handleUploadProof = async () => {
		if (!proofFile) { toast.error('Please select an image file as proof of transfer.'); return; }
		setUploadingProof(true);
		try {
			const formData = new FormData();
			formData.append('proof', proofFile);
			await api.post(`/returns/${returnRequestId}/upload-proof`, formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			toast.success('Proof uploaded. Return is complete — order is now Sold.');
			setProofFile(null);
			await loadDetail();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to upload proof.');
		} finally {
			setUploadingProof(false);
		}
	};

	// ── Exchange tracking ────────────────────────────────────────────────
	const handleSaveTracking = async () => {
		if (!exchangeTracking.trim()) { toast.error('Please enter a tracking number.'); return; }
		setSavingTracking(true);
		try {
			await api.patch(`/returns/${returnRequestId}/exchange-tracking`, {
				trackingNumber: exchangeTracking.trim(),
				trackingUrl: exchangeTrackingUrl.trim() || undefined,
			});
			toast.success('Tracking information saved.');
			await loadDetail();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to save tracking.');
		} finally {
			setSavingTracking(false);
		}
	};

	const handleMarkExchangeShipped = async () => {
		setMarkingShipped(true);
		try {
			await api.post(`/returns/${returnRequestId}/exchange-shipped`);
			toast.success('Replacement marked as shipped.');
			await loadDetail();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to mark as shipped.');
		} finally {
			setMarkingShipped(false);
		}
	};

	const handleMarkExchangeDelivered = async () => {
		setMarkingDelivered(true);
		try {
			await api.post(`/returns/${returnRequestId}/exchange-delivered`);
			toast.success('Replacement delivered. Order is now Sold.');
			await loadDetail();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to mark as delivered.');
		} finally {
			setMarkingDelivered(false);
		}
	};

	// ── Commission refund ────────────────────────────────────────────────
	const handleCommissionRefundRequest = async () => {
		const amount = Number(ret.CommissionAmount || 0);
		if (!amount || amount <= 0) { toast.error('No commission amount found for this order.'); return; }
		setSubmittingCommission(true);
		try {
			await api.post(`/orders/${ret.OrderId}/commission-refund`, {
				commissionAmount: amount,
				sellerNote: commissionNote.trim() || null,
				returnRequestId,
			});
			toast.success('Commission refund request sent to admin.');
			setCommissionModal(false);
			setCommissionRequestSent(true);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to submit request.');
		} finally {
			setSubmittingCommission(false);
		}
	};

	// ── Loading / not found ──────────────────────────────────────────────
	if (loading) {
		return (
			<>
				<NavBar />
				<div className='flex min-h-screen bg-gray-50'>
					<SellerSidebar />
					<div className='flex-1 flex items-center justify-center'>
						<Loader2 className='animate-spin w-8 h-8 text-primary-500' />
					</div>
				</div>
			</>
		);
	}
	if (!ret) return null;

	const cfg = statusConfig[ret.Status] || statusConfig.Pending;
	const StatusIcon = cfg.icon;
	const isAutoApproved = ret.ResolutionType === 'auto_approved';

	const isPhysicalApproved     = ret.ResolutionType === 'physical_return'      && ret.Status === 'Approved';
	const isFullRefundApproved   = ret.ResolutionType === 'refund_without_return' && ret.Status === 'Approved';
	const isPartialApproved      = ret.ResolutionType === 'partial_refund'        && ret.Status === 'Approved';
	const isExchangeApproved     = ret.ResolutionType === 'exchange'              && ret.Status === 'Approved';

	const partialRefundAmount = ret.PartialRefundAmount
		? Number(ret.PartialRefundAmount)
		: ret.Items?.length > 0
			? ret.Items.reduce((s, i) => s + Number(i.ItemRefundAmount || 0), 0)
			: Number(ret.TotalAmount || 0);

	const submittedDate = ret.CreatedAt
		? new Date(ret.CreatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
		: '—';

	// Commission refund is only available for physical_return and refund_without_return
	const canRequestCommission = ['physical_return', 'refund_without_return'].includes(ret.ResolutionType);
	const showCommissionBlock  = canRequestCommission
		&& ['Refunded', 'PartialRefunded', 'Rejected'].includes(ret.Status)
		&& !commissionRequestSent;

	return (
		<>
			<NavBar />

			{/* ── Commission Refund Modal ── */}
			{commissionModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl'>
						<div className='flex items-center gap-3 mb-5'>
							<div className='w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0'>
								<DollarSign size={18} className='text-amber-600' />
							</div>
							<div>
								<h2 className='text-lg font-bold text-gray-900'>Request Commission Refund</h2>
								<p className='text-sm text-gray-500'>Ask admin to return the commission on this returned order.</p>
							</div>
						</div>
						<div className='mb-4'>
							<label className='block text-sm font-medium text-gray-700 mb-1'>Commission amount to refund (€)</label>
							<div className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-900 font-semibold'>
								€{Number(ret.CommissionAmount || 0).toFixed(2)}
							</div>
							<p className='text-xs text-gray-400 mt-1'>
								{ret.CommissionRate != null
									? `${(Number(ret.CommissionRate) * 100).toFixed(1)}% commission on €${Number(ret.TotalAmount || 0).toFixed(2)} order total`
									: `Order total: €${Number(ret.TotalAmount || 0).toFixed(2)}`}
							</p>
						</div>
						<div className='mb-5'>
							<label className='block text-sm font-medium text-gray-700 mb-1'>Note to admin <span className='text-gray-400'>(optional)</span></label>
							<textarea
								rows={3} value={commissionNote}
								onChange={(e) => setCommissionNote(e.target.value)}
								placeholder='Explain why you are requesting the commission back...'
								className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400'
							/>
						</div>
						<div className='flex gap-3'>
							<button onClick={() => setCommissionModal(false)} className='flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors'>Cancel</button>
							<button onClick={handleCommissionRefundRequest} disabled={submittingCommission} className='flex-1 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-50'>
								{submittingCommission ? 'Submitting…' : 'Send Request'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Approve Modal ── */}
			{approveModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto'>
						<div className='flex items-center gap-3 mb-5'>
							<div className='w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0'>
								<ThumbsUp size={18} className='text-green-600' />
							</div>
							<div>
								<h2 className='text-lg font-bold text-gray-900'>Approve Return</h2>
								<p className='text-sm text-gray-500'>Choose how you want to handle this return.</p>
							</div>
						</div>

						<div className='space-y-2 mb-4'>
							{RESOLUTION_OPTIONS.map((opt) => {
								const Icon = opt.icon;
								const selected = resolutionType === opt.value;
								return (
									<button
										key={opt.value}
										type='button'
										onClick={() => {
											setResolutionType(opt.value);
											setInstructions(opt.value === 'physical_return' ? buildTemplate(ret, storeReturnAddress) : '');
										}}
										className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${selected ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-200'}`}
									>
										<div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'bg-green-100' : 'bg-gray-100'}`}>
											<Icon size={16} className={selected ? 'text-green-700' : 'text-gray-500'} />
										</div>
										<div>
											<p className={`text-sm font-semibold ${selected ? 'text-green-900' : 'text-gray-800'}`}>{opt.title}</p>
											<p className='text-xs text-gray-500 mt-0.5'>{opt.desc}</p>
										</div>
									</button>
								);
							})}
						</div>

						{/* Physical return — instructions */}
						{resolutionType === 'physical_return' && (
							<div className='mb-4'>
								<label className='block text-sm font-medium text-gray-700 mb-1'>Return instructions <span className='text-red-500'>*</span></label>
								<textarea
									value={instructions}
									onChange={(e) => setInstructions(e.target.value)}
									rows={4}
									className='w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none'
								/>
								<p className='text-xs text-gray-400 mt-1'>{instructions.length} chars (15 min)</p>
							</div>
						)}

						{/* Full refund — note (optional) */}
						{resolutionType === 'refund_without_return' && (
							<div className='mb-4'>
								<div className='bg-blue-50 rounded-xl border border-blue-200 px-3 py-2.5 text-sm text-blue-800 mb-3'>
									You will need to transfer <strong>€{Number(ret?.TotalAmount || 0).toFixed(2)}</strong> to the buyer manually and upload proof.
								</div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>Message to buyer <span className='text-gray-400'>(optional)</span></label>
								<textarea
									value={instructions}
									onChange={(e) => setInstructions(e.target.value)}
									rows={2}
									placeholder='e.g. We are sorry for the inconvenience. Your full refund will be transferred within 2 business days.'
									className='w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none'
								/>
							</div>
						)}

						{/* Partial refund — amount + note */}
						{resolutionType === 'partial_refund' && (
							<div className='space-y-3 mb-4'>
								<div className='bg-blue-50 rounded-xl border border-blue-200 px-3 py-2.5 text-sm text-blue-800'>
									Order total: <strong>€{Number(ret?.TotalAmount || 0).toFixed(2)}</strong>. You will transfer the agreed partial amount manually and upload proof.
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Refund amount (€) <span className='text-red-500'>*</span></label>
									<input
										type='number' min='0.01' step='0.01' max={Number(ret?.TotalAmount || 0)}
										value={partialAmount}
										onChange={(e) => setPartialAmount(e.target.value)}
										placeholder={`e.g. ${(Number(ret?.TotalAmount || 0) / 2).toFixed(2)}`}
										className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Note to buyer <span className='text-gray-400'>(optional)</span></label>
									<textarea
										rows={2} value={partialNote}
										onChange={(e) => setPartialNote(e.target.value)}
										placeholder='e.g. As agreed, we are refunding €X while you keep the item.'
										className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400'
									/>
								</div>
								<p className='text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2'>
									Note: Commission refund requests are not available for partial refunds.
								</p>
							</div>
						)}

						{/* Exchange — optional message */}
						{resolutionType === 'exchange' && (
							<div className='mb-4'>
								<div className='bg-purple-50 rounded-xl border border-purple-200 px-3 py-2.5 text-sm text-purple-800 mb-3'>
									After approving, you will enter the replacement tracking number and mark it shipped, then delivered.
								</div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>Message to buyer <span className='text-gray-400'>(optional)</span></label>
								<textarea
									value={instructions}
									onChange={(e) => setInstructions(e.target.value)}
									rows={2}
									placeholder='e.g. We are sending you a replacement. No need to return the original item.'
									className='w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none'
								/>
							</div>
						)}

						<div className='flex gap-3'>
							<button
								onClick={() => { setApproveModal(false); setInstructions(''); setResolutionType('physical_return'); setPartialAmount(''); setPartialNote(''); }}
								className='flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50'
							>
								Cancel
							</button>
							<button
								onClick={handleApprove}
								disabled={
									submitting ||
									(resolutionType === 'physical_return' && instructions.trim().length < 15) ||
									(resolutionType === 'partial_refund' && (!partialAmount || parseFloat(partialAmount) <= 0))
								}
								className={`flex-1 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 transition-colors ${
									resolutionType === 'partial_refund'        ? 'bg-blue-600 hover:bg-blue-700'
									: resolutionType === 'exchange'             ? 'bg-purple-500 hover:bg-purple-600'
									: 'bg-green-500 hover:bg-green-600'
								}`}
							>
								{submitting ? 'Processing…'
									: resolutionType === 'partial_refund'        ? 'Confirm Partial Refund'
									: resolutionType === 'refund_without_return' ? 'Approve Full Refund'
									: resolutionType === 'exchange'              ? 'Confirm Exchange'
									:                                              'Approve Return'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Reject Modal ── */}
			{rejectModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl'>
						<div className='flex items-center gap-3 mb-4'>
							<div className='w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0'>
								<ThumbsDown size={18} className='text-red-600' />
							</div>
							<div>
								<h2 className='text-lg font-bold text-gray-900'>Reject Return</h2>
								<p className='text-sm text-gray-500'>The buyer will be notified with your reason.</p>
							</div>
						</div>
						<textarea
							value={rejectionReason}
							onChange={(e) => setRejectionReason(e.target.value)}
							placeholder='e.g. The item shows signs of use beyond normal wear, this is not covered by our return policy…'
							rows={4}
							className='w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none'
						/>
						<div className='flex gap-3 mt-4'>
							<button onClick={() => setRejectModal(false)} className='flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50'>Cancel</button>
							<button
								onClick={handleReject}
								disabled={submitting || rejectionReason.trim().length < 10}
								className='flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors'
							>
								{submitting ? 'Rejecting…' : 'Confirm Rejection'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ── Main Page ── */}
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-2 sm:p-6 overflow-y-auto'>
					<div className='max-w-2xl mx-auto'>

						<button
							onClick={() => navigate('/my-returns')}
							className='flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors'
						>
							<ArrowLeft size={16} /> Back to Returns
						</button>

						{/* Status header */}
						<div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 mb-4`}>
							<div className='flex items-start justify-between gap-3 mb-3'>
								<div className='flex items-center gap-3'>
									<div className={`w-10 h-10 rounded-full flex items-center justify-center border ${cfg.border} ${cfg.bg}`}>
										<StatusIcon size={20} className={cfg.color} />
									</div>
									<div>
										<div className='flex items-center gap-2 flex-wrap'>
											<h2 className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</h2>
											{isAutoApproved && (
												<span className='flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200'>
													<Zap size={9} /> Auto-approved
												</span>
											)}
										</div>
										<p className='text-sm text-gray-600'>
											Order #{ret.OrderId?.slice(0, 8)} · Buyer: <span className='font-medium'>{ret.BuyerName}</span>
										</p>
									</div>
								</div>
							</div>
							<p className='text-xs text-gray-500'>Submitted: {submittedDate}</p>
							{ret.Status === 'Pending' && (
								<div className='mt-3'><UrgencyBadge dateStr={ret.CreatedAt} large /></div>
							)}
						</div>

						{/* Buyer's reason */}
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4'>
							<h3 className='font-semibold text-gray-900 mb-2 flex items-center gap-2'>
								<RotateCcw size={16} className='text-amber-600' /> Buyer's Reason
							</h3>
							<p className='text-sm text-gray-700 leading-relaxed'>{ret.Reason || '—'}</p>
						</div>

						{/* Items being returned */}
						{ret.Items?.length > 0 && (
							<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4'>
								<h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
									<Package size={16} className='text-primary-500' /> Items to Return
								</h3>
								<div className='divide-y divide-gray-100'>
									{ret.Items.map((item) => (
										<div key={item.ReturnItemId} className='flex items-center gap-3 py-3 first:pt-0 last:pb-0'>
											<div className='w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0'>
												{item.ProductImageUrl
													? <img src={item.ProductImageUrl} alt={item.ProductName} className='w-full h-full object-cover' />
													: <div className='w-full h-full flex items-center justify-center'><Package size={16} className='text-gray-300' /></div>}
											</div>
											<div className='flex-1 min-w-0'>
												<p className='text-sm font-medium text-gray-900 truncate'>{item.ProductName}</p>
												<p className='text-xs text-gray-500'>Qty: {item.ReturnQuantity} × €{Number(item.UnitPrice).toFixed(2)}</p>
											</div>
											<p className='text-sm font-bold text-gray-900 flex-shrink-0'>€{Number(item.ItemRefundAmount).toFixed(2)}</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Media evidence */}
						{ret.Media?.length > 0 && (
							<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4'>
								<h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
									<Image size={16} className='text-primary-500' /> Evidence ({ret.Media.length} file{ret.Media.length !== 1 ? 's' : ''})
								</h3>
								<div className='flex flex-wrap gap-3'>
									{ret.Media.map((m) => (
										<div key={m.MediaId} className='w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200'>
											{m.MediaType === 'video'
												? <video src={m.MediaUrl} className='w-full h-full object-cover' controls />
												: <a href={m.MediaUrl} target='_blank' rel='noopener noreferrer'><img src={m.MediaUrl} alt='Evidence' className='w-full h-full object-cover hover:opacity-90 transition-opacity' /></a>}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Seller's instructions (after approval) */}
						{ret.SellerInstructions && (
							<div className='bg-green-50 rounded-2xl border border-green-200 p-5 mb-4'>
								<h3 className='font-semibold text-green-900 mb-2'>Your instructions to buyer</h3>
								<p className='text-sm text-green-900 whitespace-pre-wrap'>{ret.SellerInstructions}</p>
							</div>
						)}
						{ret.SellerRejectionReason && (
							<div className='bg-red-50 rounded-2xl border border-red-200 p-5 mb-4'>
								<h3 className='font-semibold text-red-900 mb-2'>Your rejection reason</h3>
								<p className='text-sm text-red-800 whitespace-pre-wrap'>{ret.SellerRejectionReason}</p>
							</div>
						)}

						{/* ════════════════════════════════════════════════════════
						    FLOW 1: Physical return — buyer tracks item back to seller
						    ════════════════════════════════════════════════════════ */}
						{isPhysicalApproved && (
							<div className='space-y-4 mb-4'>
								{/* Step 1: Buyer tracking */}
								<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
									<h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
										<Truck size={16} className='text-blue-500' />
										Step 1 — Buyer Return Shipment
									</h3>
									{ret.BuyerTrackingNumber ? (
										<div className='bg-blue-50 rounded-xl border border-blue-200 p-3'>
											<p className='text-xs font-semibold text-blue-700 mb-1'>Tracking Number</p>
											<p className='text-sm font-mono text-blue-900'>{ret.BuyerTrackingNumber}</p>
											{ret.BuyerTrackingUrl && (
												<a href={ret.BuyerTrackingUrl} target='_blank' rel='noopener noreferrer' className='text-xs text-blue-600 hover:text-blue-700 underline mt-1 block flex items-center gap-1'>
													<LinkIcon size={11} /> Track shipment →
												</a>
											)}
										</div>
									) : (
										<p className='text-sm text-gray-400 italic'>Waiting for buyer to submit their return shipment tracking…</p>
									)}
								</div>

								{/* Step 2: Upload proof of transfer */}
								<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
									<h3 className='font-semibold text-gray-900 mb-1 flex items-center gap-2'>
										<Upload size={16} className='text-green-600' />
										Step 2 — Transfer Money &amp; Upload Proof
									</h3>
									<p className='text-xs text-gray-500 mb-3'>
										Once you receive the item, transfer <strong>€{partialRefundAmount.toFixed(2)}</strong> to the buyer via bank transfer, then upload a screenshot or receipt as proof.
									</p>
									<input ref={proofInputRef} type='file' accept='image/*' className='hidden' onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
									<div
										onClick={() => proofInputRef.current?.click()}
										className='border-2 border-dashed border-gray-300 hover:border-green-400 rounded-xl p-6 text-center cursor-pointer transition-colors mb-3'
									>
										{proofFile ? (
											<p className='text-sm font-medium text-gray-700'>{proofFile.name}</p>
										) : (
											<>
												<Upload size={24} className='mx-auto text-gray-400 mb-2' />
												<p className='text-sm text-gray-500'>Click to upload proof of transfer</p>
												<p className='text-xs text-gray-400 mt-1'>JPG, PNG, PDF</p>
											</>
										)}
									</div>
									<button
										onClick={handleUploadProof}
										disabled={!proofFile || uploadingProof}
										className='w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors disabled:opacity-50'
									>
										{uploadingProof ? <><Loader2 size={16} className='animate-spin' /> Uploading…</> : <><BadgeCheck size={16} /> Upload Proof &amp; Complete Return</>}
									</button>
								</div>
							</div>
						)}

						{/* ════════════════════════════════════════════════════════
						    FLOW 2: Full refund — buyer keeps item
						    ════════════════════════════════════════════════════════ */}
						{isFullRefundApproved && (
							<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4'>
								<h3 className='font-semibold text-gray-900 mb-1 flex items-center gap-2'>
									<Upload size={16} className='text-green-600' />
									Transfer Money &amp; Upload Proof
								</h3>
								<p className='text-xs text-gray-500 mb-3'>
									Transfer <strong>€{Number(ret.TotalAmount || 0).toFixed(2)}</strong> to the buyer via bank transfer, then upload a screenshot or receipt as proof of transfer to complete this return.
								</p>
								<input ref={proofInputRef} type='file' accept='image/*' className='hidden' onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
								<div
									onClick={() => proofInputRef.current?.click()}
									className='border-2 border-dashed border-gray-300 hover:border-green-400 rounded-xl p-6 text-center cursor-pointer transition-colors mb-3'
								>
									{proofFile ? (
										<p className='text-sm font-medium text-gray-700'>{proofFile.name}</p>
									) : (
										<>
											<Upload size={24} className='mx-auto text-gray-400 mb-2' />
											<p className='text-sm text-gray-500'>Click to upload proof of transfer</p>
											<p className='text-xs text-gray-400 mt-1'>JPG, PNG, PDF</p>
										</>
									)}
								</div>
								<button
									onClick={handleUploadProof}
									disabled={!proofFile || uploadingProof}
									className='w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors disabled:opacity-50'
								>
									{uploadingProof ? <><Loader2 size={16} className='animate-spin' /> Uploading…</> : <><BadgeCheck size={16} /> Upload Proof &amp; Complete Return</>}
								</button>
							</div>
						)}

						{/* ════════════════════════════════════════════════════════
						    FLOW 3: Partial refund — buyer keeps item
						    ════════════════════════════════════════════════════════ */}
						{isPartialApproved && (
							<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4'>
								<h3 className='font-semibold text-gray-900 mb-1 flex items-center gap-2'>
									<Upload size={16} className='text-blue-600' />
									Transfer Partial Amount &amp; Upload Proof
								</h3>
								<p className='text-xs text-gray-500 mb-3'>
									Transfer <strong>€{Number(ret.PartialRefundAmount || 0).toFixed(2)}</strong> to the buyer via bank transfer, then upload a screenshot or receipt as proof to complete this return.
								</p>
								<input ref={proofInputRef} type='file' accept='image/*' className='hidden' onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
								<div
									onClick={() => proofInputRef.current?.click()}
									className='border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer transition-colors mb-3'
								>
									{proofFile ? (
										<p className='text-sm font-medium text-gray-700'>{proofFile.name}</p>
									) : (
										<>
											<Upload size={24} className='mx-auto text-gray-400 mb-2' />
											<p className='text-sm text-gray-500'>Click to upload proof of transfer</p>
											<p className='text-xs text-gray-400 mt-1'>JPG, PNG, PDF</p>
										</>
									)}
								</div>
								<button
									onClick={handleUploadProof}
									disabled={!proofFile || uploadingProof}
									className='w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50'
								>
									{uploadingProof ? <><Loader2 size={16} className='animate-spin' /> Uploading…</> : <><BadgeCheck size={16} /> Upload Proof &amp; Complete Return</>}
								</button>
							</div>
						)}

						{/* ════════════════════════════════════════════════════════
						    FLOW 4: Exchange — enter tracking, ship, deliver
						    ════════════════════════════════════════════════════════ */}
						{isExchangeApproved && (
							<div className='space-y-4 mb-4'>
								{/* Tracking form */}
								<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
									<h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
										<Truck size={16} className='text-purple-500' />
										Step 1 — Enter Replacement Tracking
									</h3>
									<div className='space-y-3'>
										<div>
											<label className='block text-xs font-medium text-gray-700 mb-1'>Tracking Number <span className='text-red-500'>*</span></label>
											<input
												type='text'
												value={exchangeTracking}
												onChange={(e) => setExchangeTracking(e.target.value)}
												placeholder='e.g. 1Z999AA10123456784'
												disabled={!!ret.ExchangeShippedAt}
												className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50'
											/>
										</div>
										<div>
											<label className='block text-xs font-medium text-gray-700 mb-1'>Tracking URL <span className='text-gray-400'>(optional)</span></label>
											<input
												type='url'
												value={exchangeTrackingUrl}
												onChange={(e) => setExchangeTrackingUrl(e.target.value)}
												placeholder='https://track.carrier.com/...'
												disabled={!!ret.ExchangeShippedAt}
												className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50'
											/>
										</div>
										{!ret.ExchangeShippedAt && (
											<button
												onClick={handleSaveTracking}
												disabled={savingTracking || !exchangeTracking.trim()}
												className='w-full py-2.5 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-xl transition-colors disabled:opacity-50'
											>
												{savingTracking ? 'Saving…' : 'Save Tracking'}
											</button>
										)}
									</div>
								</div>

								{/* Mark shipped */}
								<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
									<h3 className='font-semibold text-gray-900 mb-2 flex items-center gap-2'>
										<Package size={16} className='text-blue-500' />
										Step 2 — Mark as Shipped
									</h3>
									{ret.ExchangeShippedAt ? (
										<div className='flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2'>
											<CheckCircle size={15} /> Shipped on {new Date(ret.ExchangeShippedAt).toLocaleDateString('en-GB')}
										</div>
									) : (
										<button
											onClick={handleMarkExchangeShipped}
											disabled={markingShipped || !ret.ExchangeTrackingNumber}
											className='w-full py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50'
										>
											{markingShipped ? <><Loader2 size={14} className='animate-spin inline mr-1' />Marking…</> : 'Mark Replacement Shipped'}
										</button>
									)}
								</div>

								{/* Mark delivered */}
								<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
									<h3 className='font-semibold text-gray-900 mb-2 flex items-center gap-2'>
										<BadgeCheck size={16} className='text-green-600' />
										Step 3 — Mark as Delivered
									</h3>
									{ret.ExchangeDeliveredAt ? (
										<div className='flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2'>
											<CheckCircle size={15} /> Delivered on {new Date(ret.ExchangeDeliveredAt).toLocaleDateString('en-GB')}
										</div>
									) : (
										<button
											onClick={handleMarkExchangeDelivered}
											disabled={markingDelivered || !ret.ExchangeShippedAt}
											className='w-full py-2.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors disabled:opacity-50'
										>
											{markingDelivered ? <><Loader2 size={14} className='animate-spin inline mr-1' />Marking…</> : 'Mark Replacement Delivered (Closes Order as Sold)'}
										</button>
									)}
									{!ret.ExchangeShippedAt && (
										<p className='text-xs text-gray-400 mt-2 text-center'>Mark the replacement as shipped first.</p>
									)}
								</div>
							</div>
						)}

						{/* ════════════ Completed states ════════════ */}
						{ret.Status === 'Refunded' && ret.ResolutionType !== 'exchange' && (
							<div className='bg-purple-50 rounded-2xl border border-purple-200 p-5 mb-4 text-center'>
								<BadgeCheck size={32} className='mx-auto text-purple-600 mb-2' />
								<p className='font-semibold text-purple-900'>Return complete</p>
								<p className='text-sm text-purple-700'>
									{ret.ResolutionType === 'physical_return'
										? `€${partialRefundAmount.toFixed(2)} transferred to buyer. Order is Sold.`
										: `€${Number(ret.TotalAmount || 0).toFixed(2)} transferred to buyer. Order is Sold.`}
								</p>
								{ret.ProofUrl && (
									<a href={ret.ProofUrl} target='_blank' rel='noopener noreferrer' className='text-xs text-purple-600 hover:text-purple-700 underline mt-2 block'>
										View proof of transfer →
									</a>
								)}
							</div>
						)}
						{ret.Status === 'Refunded' && ret.ResolutionType === 'exchange' && (
							<div className='bg-green-50 rounded-2xl border border-green-200 p-5 mb-4 text-center'>
								<BadgeCheck size={32} className='mx-auto text-green-600 mb-2' />
								<p className='font-semibold text-green-900'>Exchange complete</p>
								<p className='text-sm text-green-700'>Replacement delivered. Order is now Sold.</p>
							</div>
						)}
						{ret.Status === 'PartialRefunded' && (
							<div className='bg-blue-50 rounded-2xl border border-blue-200 p-5 mb-4 text-center'>
								<SplitSquareHorizontal size={32} className='mx-auto text-blue-600 mb-2' />
								<p className='font-semibold text-blue-900'>Partial refund complete</p>
								<p className='text-sm text-blue-700'>
									€{Number(ret.PartialRefundAmount || 0).toFixed(2)} transferred to buyer. Buyer kept the item. Order is Sold.
								</p>
								{ret.ProofUrl && (
									<a href={ret.ProofUrl} target='_blank' rel='noopener noreferrer' className='text-xs text-blue-600 hover:text-blue-700 underline mt-2 block'>
										View proof of transfer →
									</a>
								)}
							</div>
						)}

						{/* ════════════ Commission refund request ════════════ */}
						{showCommissionBlock && (
							<div className='bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-4'>
								<div className='flex items-start gap-3'>
									<div className='w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0'>
										<DollarSign size={14} className='text-amber-700' />
									</div>
									<div className='flex-1'>
										<p className='text-sm font-semibold text-amber-900'>Commission refund available</p>
										<p className='text-xs text-amber-700 mt-0.5'>
											Since this order was returned, you can ask admin to refund the commission that was charged.
										</p>
										<button
											onClick={() => setCommissionModal(true)}
											className='mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800 underline'
										>
											Request commission refund →
										</button>
									</div>
								</div>
							</div>
						)}
						{commissionRequestSent && (
							<div className='bg-green-50 rounded-2xl border border-green-200 p-4 mb-4 text-center'>
								<CheckCircle size={20} className='mx-auto text-green-600 mb-1' />
								<p className='text-sm font-semibold text-green-900'>Commission refund request sent</p>
								<p className='text-xs text-green-700'>The admin will review and process your request.</p>
							</div>
						)}

						{/* ════════════ Pending actions ════════════ */}
						{ret.Status === 'Pending' && (
							<div className='flex gap-3'>
								<button
									onClick={() => { setInstructions(buildTemplate(ret, storeReturnAddress)); setResolutionType('physical_return'); setApproveModal(true); }}
									className='flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors'
								>
									<ThumbsUp size={16} /> Approve Return
								</button>
								<button
									onClick={() => setRejectModal(true)}
									className='flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors'
								>
									<ThumbsDown size={16} /> Reject
								</button>
							</div>
						)}

						{/* Buyer info */}
						<div className='mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3'>
							<div className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0'>
								<User size={14} className='text-gray-500' />
							</div>
							<div>
								<p className='text-sm font-medium text-gray-900'>{ret.BuyerName}</p>
								<p className='text-xs text-gray-500'>{ret.BuyerEmail}</p>
							</div>
						</div>

					</div>
				</div>
			</div>
		</>
	);
};

export default SellerReturnDetail;
