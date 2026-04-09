import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import { RotateCcw, Loader2, Image, Clock, CheckCircle, XCircle, Zap, Search, ChevronRight } from 'lucide-react';

function daysSince(dateStr) {
	if (!dateStr) return 0;
	return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function hoursUntilAutoApprove(dateStr) {
	if (!dateStr) return 72;
	const elapsed = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
	return Math.max(0, 72 - elapsed);
}

function ageLabel(dateStr) {
	if (!dateStr) return '';
	const days = daysSince(dateStr);
	if (days === 0) return 'Submitted today';
	if (days === 1) return '1 day ago';
	return `${days} days ago`;
}

// Colored urgency badge for pending returns (seller has 3 days = 72h)
function UrgencyBadge({ dateStr }) {
	const hours = hoursUntilAutoApprove(dateStr);
	let label, cls;
	if (hours <= 0) {
		label = 'Overdue'; cls = 'bg-red-600 text-white';
	} else if (hours < 24) {
		const h = Math.floor(hours);
		const m = Math.floor((hours - h) * 60);
		label = m > 0 ? `${h}h ${m}m left` : `${h}h left`;
		cls = 'bg-red-100 text-red-800';
	} else if (hours < 48) {
		label = '1 day left';
		cls = 'bg-orange-100 text-orange-800';
	} else {
		const days = Math.min(3, Math.ceil(hours / 24));
		label = `${days} days left`;
		cls = 'bg-green-100 text-green-800';
	}
	return (
		<span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg ${cls}`}>
			<Clock size={11} /> {label}
		</span>
	);
}

const statusConfig = {
	Pending:  { label: 'Awaiting response', bg: 'bg-amber-100',  color: 'text-amber-900',  border: 'border-amber-200'  },
	Approved: { label: 'Return approved',   bg: 'bg-green-100',  color: 'text-green-900',  border: 'border-green-200'  },
	Refunded: { label: 'Refunded',          bg: 'bg-purple-100', color: 'text-purple-900', border: 'border-purple-200' },
	Rejected: { label: 'Rejected',          bg: 'bg-red-100',    color: 'text-red-900',    border: 'border-red-200'    },
};

const FILTER_TABS = [
	{ value: 'all',      label: 'All'      },
	{ value: 'Pending',  label: 'Pending'  },
	{ value: 'Approved', label: 'Approved' },
	{ value: 'Refunded', label: 'Refunded' },
	{ value: 'Rejected', label: 'Rejected' },
];

const SORT_OPTIONS = [
	{ value: 'urgency', label: 'Most urgent' },
	{ value: 'newest',  label: 'Newest first' },
	{ value: 'oldest',  label: 'Oldest first' },
	{ value: 'highest', label: 'Highest value' },
];

const SellerReturns = () => {
	const navigate = useNavigate();
	const [returns, setReturns] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filterStatus, setFilterStatus] = useState('all');
	const [search, setSearch] = useState('');
	const [sortBy, setSortBy] = useState('urgency');

	useEffect(() => {
		const fetchReturns = async () => {
			try {
				const res = await api.get('/returns/seller');
				setReturns(res.data?.data || []);
			} catch (err) {
				console.error('Failed to load returns:', err);
				if (err.response?.status === 401 || err.response?.status === 403) {
					navigate('/login');
					return;
				}
				setError('Failed to load return requests.');
			} finally {
				setLoading(false);
			}
		};
		fetchReturns();
	}, [navigate]);

	const pendingCount  = returns.filter((r) => r.ReturnStatus === 'Pending').length;
	const approvedCount = returns.filter((r) => r.ReturnStatus === 'Approved').length;
	const resolvedCount = returns.filter((r) => r.ReturnStatus === 'Refunded' || r.ReturnStatus === 'Rejected').length;

	const countFor = (status) => returns.filter((r) => r.ReturnStatus === status).length;

	const displayed = useMemo(() => {
		let list = filterStatus === 'all' ? returns : returns.filter((r) => r.ReturnStatus === filterStatus);

		const q = search.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(r) =>
					(r.BuyerName || '').toLowerCase().includes(q) ||
					r.OrderId.toLowerCase().startsWith(q) ||
					(r.FirstReturnItemName || '').toLowerCase().includes(q)
			);
		}

		return [...list].sort((a, b) => {
			if (sortBy === 'newest')  return new Date(b.ReturnCreatedAt) - new Date(a.ReturnCreatedAt);
			if (sortBy === 'oldest')  return new Date(a.ReturnCreatedAt) - new Date(b.ReturnCreatedAt);
			if (sortBy === 'highest') return Number(b.TotalAmount) - Number(a.TotalAmount);
			// urgency: pending-oldest-first, then resolved newest-first
			const aPending = a.ReturnStatus === 'Pending' ? 0 : 1;
			const bPending = b.ReturnStatus === 'Pending' ? 0 : 1;
			if (aPending !== bPending) return aPending - bPending;
			return new Date(a.ReturnCreatedAt) - new Date(b.ReturnCreatedAt);
		});
	}, [returns, filterStatus, search, sortBy]);

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-6 overflow-y-auto'>

					{/* Header */}
					<div className='flex items-center gap-3 mb-4'>
						<div className='w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center'>
							<RotateCcw size={20} className='text-amber-600' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>Returns</h1>
							<p className='text-sm text-gray-500'>{returns.length} return{returns.length !== 1 ? 's' : ''} total</p>
						</div>
					</div>

					{/* Summary stats */}
					{returns.length > 0 && (
						<div className='flex flex-wrap gap-3 mb-5'>
							{pendingCount > 0 && (
								<div className='flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200'>
									<Clock size={13} /> {pendingCount} awaiting your response
								</div>
							)}
							{approvedCount > 0 && (
								<div className='flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-800 border border-green-200'>
									<CheckCircle size={13} /> {approvedCount} approved
								</div>
							)}
							{resolvedCount > 0 && (
								<div className='flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 border border-gray-200'>
									<XCircle size={13} /> {resolvedCount} resolved
								</div>
							)}
						</div>
					)}

					{/* Search + Sort */}
					<div className='flex flex-col sm:flex-row gap-3 mb-4'>
						<div className='relative flex-1'>
							<Search size={15} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none' />
							<input
								type='text'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder='Search by buyer, order ID, or product…'
								className='w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-300'
							/>
						</div>
						<div className='flex items-center gap-2'>
							<span className='text-xs text-gray-500 font-medium whitespace-nowrap'>Sort:</span>
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
								className='px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-300'
							>
								{SORT_OPTIONS.map((o) => (
									<option key={o.value} value={o.value}>{o.label}</option>
								))}
							</select>
						</div>
					</div>

					{/* Filter tabs */}
					<div className='flex flex-wrap gap-2 mb-6'>
						{FILTER_TABS.map((f) => (
							<button
								key={f.value}
								onClick={() => setFilterStatus(f.value)}
								className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
									filterStatus === f.value
										? 'bg-primary-500 text-white'
										: 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
								}`}
							>
								{f.label} ({f.value === 'all' ? returns.length : countFor(f.value)})
							</button>
						))}
					</div>

					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-primary-500' />
						</div>
					) : error ? (
						<p className='text-red-500'>{error}</p>
					) : displayed.length === 0 ? (
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
							<RotateCcw size={48} className='mx-auto text-gray-300 mb-4' />
							<h3 className='text-lg font-semibold text-gray-700 mb-2'>
								{returns.length === 0 ? 'No returns yet' : 'No returns match this filter'}
							</h3>
							<p className='text-gray-500 text-sm'>
								{returns.length === 0
									? 'Return requests from buyers will appear here.'
									: 'Try adjusting the filter or search.'}
							</p>
						</div>
					) : (
						<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
							{displayed.map((ret) => {
								const cfg = statusConfig[ret.ReturnStatus] || statusConfig.Pending;
								const isAutoApproved = ret.ResolutionType === 'auto_approved';
								const reasonPreview = ret.Reason
									? ret.Reason.length > 90 ? ret.Reason.slice(0, 90) + '…' : ret.Reason
									: null;
								const itemLabel = ret.ReturnItemCount > 0
									? ret.ReturnItemCount === 1
										? ret.FirstReturnItemName || '1 item'
										: `${ret.ReturnItemCount} items`
									: null;

								return (
									<div
										key={ret.ReturnRequestId}
										className='bg-white shadow-sm rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow flex flex-col'
									>
										{/* Header */}
										<div className='flex items-start justify-between mb-3 gap-2'>
											<div>
												<h3 className='font-semibold text-gray-900 text-sm'>
													Order #{ret.OrderId.slice(0, 8)}
												</h3>
												<p className='text-xs text-gray-400 mt-0.5'>{ageLabel(ret.ReturnCreatedAt)}</p>
											</div>
											<div className='flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end'>
												{isAutoApproved && (
													<span className='flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200'>
														<Zap size={9} /> Auto
													</span>
												)}
												<span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
													{cfg.label}
												</span>
											</div>
										</div>

										{/* Details */}
										<div className='space-y-1 text-sm mb-3 flex-1'>
											<p className='text-gray-500'>
												Buyer: <span className='font-medium text-gray-900'>{ret.BuyerName}</span>
											</p>
											<p className='text-gray-500'>
												Total: <span className='font-bold text-primary-600'>&euro;{Number(ret.TotalAmount).toFixed(2)}</span>
											</p>
											{itemLabel && (
												<p className='text-xs text-gray-500'>
													Returning: <span className='font-medium text-gray-700'>{itemLabel}</span>
												</p>
											)}
											{reasonPreview && (
												<p className='text-xs text-gray-500 italic leading-relaxed'>"{reasonPreview}"</p>
											)}
										</div>

										{/* Media count */}
										{ret.MediaCount > 0 && (
											<div className='flex items-center gap-2 mb-3'>
												<span className='flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-1'>
													<Image size={11} /> {ret.MediaCount} file{ret.MediaCount !== 1 ? 's' : ''}
												</span>
											</div>
										)}

										{/* Urgency badge for pending, approved note for approved */}
										{ret.ReturnStatus === 'Pending' && (
											<div className='mb-3'>
												<UrgencyBadge dateStr={ret.ReturnCreatedAt} />
											</div>
										)}
										{ret.ReturnStatus === 'Approved' && (
											<div className='mb-3'>
												<span className='flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-100 text-green-800'>
													<CheckCircle size={11} /> Awaiting receipt confirmation
												</span>
											</div>
										)}

										{/* View Details button */}
										<button
											onClick={() => navigate(`/my-returns/${ret.ReturnRequestId}`)}
											className='mt-auto w-full flex items-center justify-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600 border border-primary-200 hover:border-primary-300 py-2 rounded-lg transition-colors'
										>
											View Details <ChevronRight size={15} />
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

export default SellerReturns;
