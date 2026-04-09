import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
	ArrowLeft, RotateCcw, Loader2, Clock, CheckCircle, XCircle,
	Package, User, ThumbsUp, ThumbsDown, BadgeCheck, Image, Zap, Truck, RefreshCcw, DollarSign, SplitSquareHorizontal,
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
		label = 'Overdue — auto-approving shortly';
		cls = 'bg-red-600 text-white';
	} else if (hours < 24) {
		const h = Math.floor(hours);
		const m = Math.floor((hours - h) * 60);
		label = `${h}h ${m}m left to respond`;
		cls = 'bg-red-100 text-red-800';
	} else if (hours < 48) {
		label = '1 day left to respond';
		cls = 'bg-orange-100 text-orange-800';
	} else {
		const days = Math.min(3, Math.ceil(hours / 24));
		label = `${days} days left to respond`;
		cls = 'bg-green-100 text-green-800';
	}
	return (
		<span className={`inline-flex items-center gap-1.5 font-semibold rounded-lg ${large ? 'text-sm px-3 py-2' : 'text-xs px-2.5 py-1'} ${cls}`}>
			<Clock size={large ? 14 : 11} /> {label}
		</span>
	);
}

const statusConfig = {
	Pending:         { label: 'Awaiting response',   bg: 'bg-amber-50',  color: 'text-amber-900',  border: 'border-amber-200',  icon: Clock                  },
	Approved:        { label: 'Return approved',      bg: 'bg-green-50',  color: 'text-green-900',  border: 'border-green-200',  icon: CheckCircle            },
	Refunded:        { label: 'Refunded',             bg: 'bg-purple-50', color: 'text-purple-900', border: 'border-purple-200', icon: BadgeCheck             },
	Rejected:        { label: 'Rejected',             bg: 'bg-red-50',    color: 'text-red-900',    border: 'border-red-200',    icon: XCircle                },
	PartialRefunded: { label: 'Partial refund agreed',bg: 'bg-blue-50',   color: 'text-blue-900',   border: 'border-blue-200',   icon: SplitSquareHorizontal  },
};

const RESOLUTION_OPTIONS = [
	{
		value: 'physical_return',
		icon: Truck,
		title: 'Request item back',
		desc: 'Buyer ships the item to you. You confirm receipt, then the refund is issued.',
	},
	{
		value: 'refund_without_return',
		icon: RefreshCcw,
		title: 'Full refund — buyer keeps item',
		desc: 'Issue the full order refund immediately. No return shipment needed.',
	},
	{
		value: 'partial_refund',
		icon: SplitSquareHorizontal,
		title: 'Partial refund — buyer keeps item',
		desc: 'Agree on a partial amount to refund. Buyer keeps the item, no shipping needed.',
	},
	{
		value: 'exchange',
		icon: RefreshCcw,
		title: 'Exchange / Replacement',
		desc: 'Send the buyer a replacement item instead of a refund.',
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
	const [rejectionReason, setRejectionReason] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [markingRefunded, setMarkingRefunded] = useState(false);
	const [commissionModal, setCommissionModal] = useState(false);
	const [commissionAmount, setCommissionAmount] = useState('');
	const [commissionNote, setCommissionNote] = useState('');
	const [submittingCommission, setSubmittingCommission] = useState(false);
	const [commissionRequestSent, setCommissionRequestSent] = useState(false);

	// Partial refund (used inside the approve modal)
	const [partialAmount, setPartialAmount] = useState('');
	const [partialNote, setPartialNote] = useState('');

	const loadDetail = async () => {
		try {
			const res = await api.get(`/returns/${returnRequestId}/detail`);
			setRet(res.data?.data);
		} catch (err) {
			console.error('Failed to load return detail:', err);
			if (err.response?.status === 401 || err.response?.status === 403) navigate('/login');
			else { toast.error('Failed to load return details.'); navigate('/my-returns'); }
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadDetail(); }, [returnRequestId]);

	const handleApprove = async () => {
		const isPhysical = resolutionType === 'physical_return';
		const isExchange = resolutionType === 'exchange';
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
			if (isPartial) {
				await api.post(`/returns/${returnRequestId}/partial-refund`, {
					amount: parseFloat(partialAmount),
					sellerNote: partialNote.trim() || null,
				});
				toast.success(`Partial refund of €${parseFloat(partialAmount).toFixed(2)} processed. Buyer has been notified.`);
			} else {
				let instrText;
				if (isPhysical) instrText = instructions.trim();
				else if (isExchange) instrText = instructions.trim() || 'A replacement item will be sent to you. No need to return the original.';
				else instrText = 'Refund issued — you do not need to return the item.';

				await api.patch(`/returns/${returnRequestId}`, {
					decision: 'approve',
					sellerInstructions: instrText,
					resolutionType,
				});

				if (resolutionType === 'refund_without_return') {
					await api.post(`/returns/${returnRequestId}/mark-refunded`);
					toast.success('Refund issued immediately. Buyer has been notified.');
				} else {
					toast.success('Return approved. Buyer has been notified with your instructions.');
				}
			}

			setApproveModal(false);
			await loadDetail();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to approve return.');
		} finally {
			setSubmitting(false);
		}
	};

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

	const handleCommissionRefundRequest = async () => {
		const amount = parseFloat(commissionAmount);
		if (!amount || amount <= 0) { toast.error('Please enter a valid commission amount.'); return; }
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

	const handleMarkRefunded = async () => {
		setMarkingRefunded(true);
		try {
			await api.post(`/returns/${returnRequestId}/mark-refunded`);
			toast.success('Refund processed successfully.');
			await loadDetail();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to process refund.');
		} finally {
			setMarkingRefunded(false);
		}
	};

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
	const isPhysicalApproved = ret.ResolutionType === 'physical_return' && ret.Status === 'Approved';
	const isExchangeApproved = ret.ResolutionType === 'exchange' && ret.Status === 'Approved';
	const partialRefundAmount = ret.Items?.length > 0
		? ret.Items.reduce((sum, i) => sum + Number(i.ItemRefundAmount || 0), 0)
		: Number(ret.TotalAmount || 0);

	const submittedDate = ret.CreatedAt
		? new Date(ret.CreatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
		: '—';

	return (
		<>
			<NavBar />

			{/* Commission Refund Request Modal */}
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
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Commission amount to refund (€)
							</label>
							<input
								type='number'
								min='0.01'
								step='0.01'
								value={commissionAmount}
								onChange={(e) => setCommissionAmount(e.target.value)}
								placeholder='e.g. 5.00'
								className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400'
							/>
							<p className='text-xs text-gray-400 mt-1'>Order total: €{Number(ret.TotalAmount || 0).toFixed(2)}</p>
						</div>

						<div className='mb-5'>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Note to admin <span className='text-gray-400'>(optional)</span>
							</label>
							<textarea
								rows={3}
								value={commissionNote}
								onChange={(e) => setCommissionNote(e.target.value)}
								placeholder='Explain why you are requesting the commission back...'
								className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400'
							/>
						</div>

						<div className='flex gap-3'>
							<button
								onClick={() => setCommissionModal(false)}
								className='flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors'
							>
								Cancel
							</button>
							<button
								onClick={handleCommissionRefundRequest}
								disabled={submittingCommission}
								className='flex-1 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-50'
							>
								{submittingCommission ? 'Submitting…' : 'Send Request'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Approve Modal */}
			{approveModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl'>
						<div className='flex items-center gap-3 mb-5'>
							<div className='w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0'>
								<ThumbsUp size={18} className='text-green-600' />
							</div>
							<div>
								<h2 className='text-lg font-bold text-gray-900'>Approve Return</h2>
								<p className='text-sm text-gray-500'>Choose how you want to handle this return.</p>
							</div>
						</div>

						{/* Resolution type choice */}
						<div className='space-y-2 mb-4'>
							{RESOLUTION_OPTIONS.map((opt) => {
								const Icon = opt.icon;
								const selected = resolutionType === opt.value;
								return (
									<button
										key={opt.value}
										type='button'
										onClick={() => { setResolutionType(opt.value); if (opt.value === 'physical_return') setInstructions(buildTemplate(ret, storeReturnAddress)); else setInstructions(''); }}
										className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
											selected
												? 'border-green-400 bg-green-50'
												: 'border-gray-200 hover:border-green-200'
										}`}
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
								<label className='block text-sm font-medium text-gray-700 mb-1'>
									Return instructions <span className='text-red-500'>*</span>
								</label>
								<textarea
									value={instructions}
									onChange={(e) => setInstructions(e.target.value)}
									placeholder='e.g. Please send the item to: [your address]. Use tracked shipping and keep proof of postage.'
									rows={4}
									className='w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none'
								/>
								<p className='text-xs text-gray-400 mt-1'>{instructions.length} chars (15 min)</p>
							</div>
						)}

						{/* Partial refund — amount + note */}
						{resolutionType === 'partial_refund' && (
							<div className='space-y-3 mb-4'>
								<div className='bg-blue-50 rounded-xl border border-blue-200 px-3 py-2 text-sm text-blue-800'>
									Order total: <strong>€{Number(ret?.TotalAmount || 0).toFixed(2)}</strong> · Refund processed immediately via Stripe.
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Refund amount (€) <span className='text-red-500'>*</span>
									</label>
									<input
										type='number'
										min='0.01'
										step='0.01'
										max={Number(ret?.TotalAmount || 0)}
										value={partialAmount}
										onChange={(e) => setPartialAmount(e.target.value)}
										placeholder={`e.g. ${(Number(ret?.TotalAmount || 0) / 2).toFixed(2)}`}
										className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Note to buyer <span className='text-gray-400'>(optional)</span>
									</label>
									<textarea
										rows={2}
										value={partialNote}
										onChange={(e) => setPartialNote(e.target.value)}
										placeholder='e.g. As agreed, we are refunding €X while you keep the item.'
										className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400'
									/>
								</div>
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
									resolutionType === 'partial_refund' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-500 hover:bg-green-600'
								}`}
							>
								{submitting ? 'Processing…'
									: resolutionType === 'partial_refund'   ? 'Confirm Partial Refund'
									: resolutionType === 'refund_without_return' ? 'Refund Now'
									: resolutionType === 'exchange'          ? 'Confirm Exchange'
									:                                          'Approve Return'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reject Modal */}
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

			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-6 overflow-y-auto'>
					<div className='max-w-2xl mx-auto'>

						{/* Back */}
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
										<div className='flex items-center gap-2'>
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

							{/* Urgency badge for pending */}
							{ret.Status === 'Pending' && (
								<div className='mt-3'>
									<UrgencyBadge dateStr={ret.CreatedAt} large />
								</div>
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
												{item.ProductImageUrl ? (
													<img src={item.ProductImageUrl} alt={item.ProductName} className='w-full h-full object-cover' />
												) : (
													<div className='w-full h-full flex items-center justify-center'>
														<Package size={16} className='text-gray-300' />
													</div>
												)}
											</div>
											<div className='flex-1 min-w-0'>
												<p className='text-sm font-medium text-gray-900 truncate'>{item.ProductName}</p>
												<p className='text-xs text-gray-500'>Qty: {item.ReturnQuantity} × €{Number(item.UnitPrice).toFixed(2)}</p>
											</div>
											<p className='text-sm font-bold text-gray-900 flex-shrink-0'>
												€{Number(item.ItemRefundAmount).toFixed(2)}
											</p>
										</div>
									))}
								</div>
								<div className='border-t border-gray-100 pt-3 mt-2 flex justify-between'>
									<span className='text-sm font-semibold text-gray-700'>Refund amount</span>
									<span className='text-sm font-bold text-primary-600'>€{partialRefundAmount.toFixed(2)}</span>
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
											{m.MediaType === 'video' ? (
												<video src={m.MediaUrl} className='w-full h-full object-cover' controls />
											) : (
												<a href={m.MediaUrl} target='_blank' rel='noopener noreferrer'>
													<img src={m.MediaUrl} alt='Evidence' className='w-full h-full object-cover hover:opacity-90 transition-opacity' />
												</a>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Resolved state info */}
						{ret.SellerInstructions && (
							<div className='bg-green-50 rounded-2xl border border-green-200 p-5 mb-4'>
								<h3 className='font-semibold text-green-900 mb-2'>Your return instructions</h3>
								<p className='text-sm text-green-900 whitespace-pre-wrap'>{ret.SellerInstructions}</p>
							</div>
						)}
						{ret.SellerRejectionReason && (
							<div className='bg-red-50 rounded-2xl border border-red-200 p-5 mb-4'>
								<h3 className='font-semibold text-red-900 mb-2'>Your rejection reason</h3>
								<p className='text-sm text-red-800 whitespace-pre-wrap'>{ret.SellerRejectionReason}</p>
							</div>
						)}
						{ret.Status === 'Refunded' && (
							<div className='bg-purple-50 rounded-2xl border border-purple-200 p-5 mb-4 text-center'>
								<BadgeCheck size={32} className='mx-auto text-purple-600 mb-2' />
								<p className='font-semibold text-purple-900'>Refund processed</p>
								<p className='text-sm text-purple-700'>€{partialRefundAmount.toFixed(2)} has been refunded to the buyer.</p>
							</div>
						)}
						{ret.Status === 'PartialRefunded' && (
							<div className='bg-blue-50 rounded-2xl border border-blue-200 p-5 mb-4 text-center'>
								<SplitSquareHorizontal size={32} className='mx-auto text-blue-600 mb-2' />
								<p className='font-semibold text-blue-900'>Partial refund processed</p>
								<p className='text-sm text-blue-700'>
									€{Number(ret.PartialRefundAmount || 0).toFixed(2)} refunded — buyer keeps the item.
								</p>
								{ret.SellerInstructions && (
									<p className='text-xs text-blue-600 mt-2 italic'>"{ret.SellerInstructions}"</p>
								)}
							</div>
						)}

						{/* Commission refund request — available when return is resolved */}
						{['Refunded', 'Rejected', 'PartialRefunded'].includes(ret.Status) && !commissionRequestSent && (
							<div className='bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-4'>
								<div className='flex items-start gap-3'>
									<div className='w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0'>
										<DollarSign size={14} className='text-amber-700' />
									</div>
									<div className='flex-1'>
										<p className='text-sm font-semibold text-amber-900'>Commission refund available</p>
										<p className='text-xs text-amber-700 mt-0.5'>
											You can request the admin to refund the commission charged on this order since it was returned.
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

						{/* Actions */}
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
									<ThumbsDown size={16} /> Reject Return
								</button>
							</div>
						)}

						{/* Physical return — buyer tracking info */}
						{isPhysicalApproved && ret.BuyerTrackingNumber && (
							<div className={'bg-blue-50 rounded-2xl border border-blue-200 p-4 mb-3'}>
								<p className={'text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1'}><Truck size={12} /> Buyer Shipment Tracking</p>
								<p className={'text-sm font-mono text-blue-900'}>{ret.BuyerTrackingNumber}</p>
								{ret.BuyerTrackingUrl && (
									<a href={ret.BuyerTrackingUrl} target={'_blank'} rel={'noopener noreferrer'} className={'text-xs text-blue-600 hover:text-blue-700 underline mt-1 block'}>Track shipment &rarr;</a>
								)}
							</div>
						)}
						{isPhysicalApproved && !ret.BuyerTrackingNumber && (
							<p className={'text-xs text-gray-400 mb-3 text-center'}>Waiting for buyer to submit shipment tracking...</p>
						)}

						{/* Physical return — seller confirms receipt */}
						{isPhysicalApproved && (
							<button
								onClick={handleMarkRefunded}
								disabled={markingRefunded}
								className='w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-xl transition-colors disabled:opacity-50'
							>
								{markingRefunded
									? <><Loader2 size={16} className='animate-spin' /> Processing…</>
									: <><BadgeCheck size={16} /> Confirm Receipt &amp; Issue Refund (€{partialRefundAmount.toFixed(2)})</>}
							</button>
						)}

						{/* Exchange — mark complete */}
						{isExchangeApproved && (
							<button
								onClick={handleMarkRefunded}
								disabled={markingRefunded}
								className={'w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50'}
							>
								{markingRefunded
									? <><Loader2 size={16} className={'animate-spin'} /> Processing…</>
									: <><BadgeCheck size={16} /> Mark Exchange Complete</>}
							</button>
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
