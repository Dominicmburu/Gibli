import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Loader2, Filter, X, ChevronRight, CheckCircle, Clock, Euro } from 'lucide-react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';

const STATUS_OPTIONS = [
	{ value: 'all',     label: 'All'     },
	{ value: 'Pending', label: 'Pending' },
	{ value: 'Paid',    label: 'Paid'    },
];

const SellerPayouts = () => {
	const navigate = useNavigate();
	const [payouts, setPayouts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError]     = useState(null);

	// Filters
	const [statusFilter, setStatusFilter] = useState('Pending');
	const [dateFrom, setDateFrom]         = useState('');
	const [dateTo, setDateTo]             = useState('');

	useEffect(() => {
		api.get('/orders/payouts')
			.then((res) => setPayouts(res.data?.data || []))
			.catch(() => setError('Failed to load payouts. Please try again.'))
			.finally(() => setLoading(false));
	}, []);

	const filtered = useMemo(() => {
		return payouts.filter((p) => {
			if (statusFilter !== 'all' && p.Status !== statusFilter) return false;
			const date = new Date(p.CreatedAt);
			if (dateFrom && date < new Date(dateFrom)) return false;
			if (dateTo   && date > new Date(new Date(dateTo).setHours(23, 59, 59))) return false;
			return true;
		});
	}, [payouts, statusFilter, dateFrom, dateTo]);

	const totalPending = payouts.filter((p) => p.Status === 'Pending').reduce((s, p) => s + Number(p.Amount), 0);
	const totalPaid    = payouts.filter((p) => p.Status === 'Paid'   ).reduce((s, p) => s + Number(p.Amount), 0);
	const filteredTotal = filtered.reduce((s, p) => s + Number(p.Amount), 0);

	const hasFilters = dateFrom || dateTo || statusFilter !== 'Pending';
	const clearFilters = () => { setStatusFilter('Pending'); setDateFrom(''); setDateTo(''); };

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-6 overflow-y-auto'>

					{/* Header */}
					<div className='flex items-center gap-3 mb-6'>
						<div className='w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center'>
							<Wallet size={20} className='text-amber-600' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>Payouts</h1>
							<p className='text-sm text-gray-500'>Track payments owed to your account per delivered order</p>
						</div>
					</div>

					{/* Summary cards */}
					<div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
							<div className='flex items-center gap-2 mb-2'>
								<Clock size={16} className='text-amber-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Pending</p>
							</div>
							<p className='text-3xl font-bold text-amber-600'>&euro;{totalPending.toFixed(2)}</p>
							<p className='text-xs text-gray-400 mt-1'>{payouts.filter(p => p.Status === 'Pending').length} order(s) awaiting transfer</p>
						</div>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
							<div className='flex items-center gap-2 mb-2'>
								<CheckCircle size={16} className='text-green-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Paid</p>
							</div>
							<p className='text-3xl font-bold text-green-600'>&euro;{totalPaid.toFixed(2)}</p>
							<p className='text-xs text-gray-400 mt-1'>{payouts.filter(p => p.Status === 'Paid').length} order(s) settled</p>
						</div>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
							<div className='flex items-center gap-2 mb-2'>
								<Euro size={16} className='text-primary-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Total Earned</p>
							</div>
							<p className='text-3xl font-bold text-gray-900'>&euro;{(totalPending + totalPaid).toFixed(2)}</p>
							<p className='text-xs text-gray-400 mt-1'>{payouts.length} order(s) total</p>
						</div>
					</div>

					{/* Filters */}
					<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6'>
						<div className='flex flex-wrap gap-3 items-end'>
							<div className='flex items-center gap-2 text-sm text-gray-500'>
								<Filter size={15} />
								<span className='font-medium'>Filters</span>
							</div>

							{/* Status tabs */}
							<div className='flex bg-gray-100 rounded-xl p-1 gap-0.5'>
								{STATUS_OPTIONS.map((opt) => (
									<button
										key={opt.value}
										onClick={() => setStatusFilter(opt.value)}
										className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
											statusFilter === opt.value
												? 'bg-white text-gray-900 shadow-sm'
												: 'text-gray-500 hover:text-gray-700'
										}`}
									>
										{opt.label}
										{opt.value !== 'all' && (
											<span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
												opt.value === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
											}`}>
												{payouts.filter(p => p.Status === opt.value).length}
											</span>
										)}
									</button>
								))}
							</div>

							<div>
								<label className='block text-xs text-gray-500 mb-1'>From</label>
								<input
									type='date'
									value={dateFrom}
									onChange={(e) => setDateFrom(e.target.value)}
									className='border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400'
								/>
							</div>
							<div>
								<label className='block text-xs text-gray-500 mb-1'>To</label>
								<input
									type='date'
									value={dateTo}
									onChange={(e) => setDateTo(e.target.value)}
									className='border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400'
								/>
							</div>
							{hasFilters && (
								<button
									onClick={clearFilters}
									className='flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors'
								>
									<X size={15} /> Clear
								</button>
							)}
						</div>
					</div>

					{/* Table */}
					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-primary-500' />
						</div>
					) : error ? (
						<p className='text-red-500'>{error}</p>
					) : filtered.length === 0 ? (
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
							<Wallet size={48} className='mx-auto text-gray-300 mb-4' />
							<h3 className='text-lg font-semibold text-gray-700 mb-2'>
								{payouts.length === 0 ? 'No payouts yet' : 'No results match your filters'}
							</h3>
							<p className='text-gray-500 text-sm'>
								{payouts.length === 0
									? 'Payouts are created automatically when you mark an order as Delivered.'
									: 'Try adjusting your filters.'}
							</p>
						</div>
					) : (
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
							<table className='w-full text-sm'>
								<thead>
									<tr className='border-b border-gray-100 bg-gray-50'>
										<th className='text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Order</th>
										<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Delivered On</th>
										<th className='text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Status</th>
										<th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Amount</th>
										<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Note</th>
										<th className='px-4 py-3'></th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-50'>
									{filtered.map((payout) => (
										<tr key={payout.PayoutId} className='hover:bg-gray-50 transition-colors'>
											<td className='px-5 py-3 font-medium text-gray-900'>
												#{payout.OrderId?.slice(0, 8)}
											</td>
											<td className='px-4 py-3 text-gray-500 whitespace-nowrap'>
												{new Date(payout.CreatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
											</td>
											<td className='px-4 py-3 text-center'>
												{payout.Status === 'Pending' ? (
													<span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200'>
														<Clock size={11} /> Pending
													</span>
												) : (
													<span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200'>
														<CheckCircle size={11} /> Paid
													</span>
												)}
											</td>
											<td className='px-4 py-3 text-right font-bold text-gray-900'>
												&euro;{Number(payout.Amount).toFixed(2)}
											</td>
											<td className='px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate'>
												{payout.AdminNote || '—'}
											</td>
											<td className='px-4 py-3'>
												<button
													onClick={() => navigate(`/my-orders/${payout.OrderId}`)}
													className='flex items-center gap-0.5 text-primary-500 hover:text-primary-600 text-xs font-medium'
												>
													View <ChevronRight size={13} />
												</button>
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className='border-t-2 border-gray-200 bg-gray-50'>
										<td colSpan={3} className='px-5 py-3 text-sm font-semibold text-gray-700'>
											Total ({filtered.length} order{filtered.length !== 1 ? 's' : ''})
										</td>
										<td className='px-4 py-3 text-right font-bold text-gray-900'>
											&euro;{filteredTotal.toFixed(2)}
										</td>
										<td colSpan={2} />
									</tr>
								</tfoot>
							</table>
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default SellerPayouts;
