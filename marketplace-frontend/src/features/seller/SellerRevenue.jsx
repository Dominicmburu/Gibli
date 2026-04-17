import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Euro, Loader2, TrendingUp, Filter, X, Percent, ChevronRight,
	Wallet, CheckCircle, Clock, RotateCcw, AlertCircle, Ban,
} from 'lucide-react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';

const TABS = [
	{ id: 'revenue', label: 'Revenue' },
	{ id: 'payouts', label: 'Payouts' },
	{ id: 'returns', label: 'Sales Returns' },
];

const STATUS_OPTIONS = [
	{ value: 'all',     label: 'All'     },
	{ value: 'Pending', label: 'Pending' },
	{ value: 'Paid',    label: 'Paid'    },
];

const SellerRevenue = () => {
	const navigate = useNavigate();

	const [activeTab, setActiveTab]           = useState('revenue');
	const [soldOrders, setSoldOrders]         = useState([]);
	const [payouts, setPayouts]               = useState([]);
	const [returns, setReturns]               = useState([]);
	const [loading, setLoading]               = useState(true);
	const [error, setError]                   = useState(null);
	const [commissionRate, setCommissionRate] = useState(0.05);

	// Shared date filters
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo]     = useState('');

	// Payouts-only filter
	const [statusFilter, setStatusFilter] = useState('all');

	// Returns-only filter
	const [returnStatusFilter, setReturnStatusFilter] = useState('all');

	useEffect(() => {
		const fetchAll = async () => {
			try {
				const [ordersRes, subRes, payoutsRes, returnsRes] = await Promise.allSettled([
					api.post('/orders/received'),
					api.get('/subscriptions/my-subscription'),
					api.get('/orders/payouts'),
					api.get('/returns/seller'),
				]);

				if (ordersRes.status === 'fulfilled') {
					const all = ordersRes.value.data?.data || [];
					const formatted = all.map((o) => ({
						...o,
						OrderItems: typeof o.OrderItems === 'string' ? JSON.parse(o.OrderItems || '[]') : o.OrderItems || [],
					}));
					setSoldOrders(formatted.filter((o) => o.DeliveryStatus === 'Sold'));
				}

				if (subRes.status === 'fulfilled' && subRes.value.data) {
					setCommissionRate(Number(subRes.value.data.CommissionRate) || 0.05);
				}

				if (payoutsRes.status === 'fulfilled') {
					setPayouts(payoutsRes.value.data?.data || []);
				}

				if (returnsRes.status === 'fulfilled') {
					setReturns(returnsRes.value.data?.data || []);
				}
			} catch (err) {
				console.error('Error fetching revenue:', err);
				setError('Failed to load data. Please try again.');
			} finally {
				setLoading(false);
			}
		};
		fetchAll();
	}, []);

	// ── Revenue tab data ───────────────────────────────────────────────
	const filteredRevenue = useMemo(() => {
		return soldOrders.filter((o) => {
			const d = new Date(o.UpdatedAt || o.OrderDate);
			if (dateFrom && d < new Date(dateFrom)) return false;
			if (dateTo   && d > new Date(new Date(dateTo).setHours(23, 59, 59))) return false;
			return true;
		});
	}, [soldOrders, dateFrom, dateTo]);

	const totalGross      = filteredRevenue.reduce((s, o) => s + Number(o.TotalAmount || 0), 0);
	const totalCommission = totalGross * commissionRate;
	const totalNet        = totalGross - totalCommission;

	// ── Payouts tab data ───────────────────────────────────────────────
	const filteredPayouts = useMemo(() => {
		return payouts.filter((p) => {
			if (statusFilter !== 'all' && p.Status !== statusFilter) return false;
			const d = new Date(p.CreatedAt);
			if (dateFrom && d < new Date(dateFrom)) return false;
			if (dateTo   && d > new Date(new Date(dateTo).setHours(23, 59, 59))) return false;
			return true;
		});
	}, [payouts, statusFilter, dateFrom, dateTo]);

	const totalPending     = payouts.filter((p) => p.Status === 'Pending').reduce((s, p) => s + Number(p.Amount), 0);
	const totalPaid        = payouts.filter((p) => p.Status === 'Paid').reduce((s, p) => s + Number(p.Amount), 0);
	const filteredPayTotal = filteredPayouts.reduce((s, p) => s + Number(p.Amount), 0);

	// ── Returns tab data ──────────────────────────────────────────────
	const RETURN_STATUS_OPTIONS = [
		{ value: 'all',      label: 'All'      },
		{ value: 'Pending',  label: 'Pending'  },
		{ value: 'Approved', label: 'Approved' },
		{ value: 'Rejected', label: 'Rejected' },
		{ value: 'Refunded', label: 'Refunded' },
	];

	const filteredReturns = useMemo(() => {
		return returns.filter((r) => {
			if (returnStatusFilter !== 'all' && r.ReturnStatus !== returnStatusFilter) return false;
			const d = new Date(r.CreatedAt);
			if (dateFrom && d < new Date(dateFrom)) return false;
			if (dateTo   && d > new Date(new Date(dateTo).setHours(23, 59, 59))) return false;
			return true;
		});
	}, [returns, returnStatusFilter, dateFrom, dateTo]);

	const totalRefunded = returns
		.filter((r) => r.ReturnStatus === 'Refunded' || r.ReturnStatus === 'Approved')
		.reduce((s, r) => s + Number(r.RefundAmount || 0), 0);
	const pendingReturnsCount   = returns.filter((r) => r.ReturnStatus === 'Pending').length;
	const approvedReturnsCount  = returns.filter((r) => r.ReturnStatus === 'Approved' || r.ReturnStatus === 'Refunded').length;

	// ── Shared ────────────────────────────────────────────────────────
	const hasFilters = dateFrom || dateTo
		|| (activeTab === 'payouts' && statusFilter !== 'all')
		|| (activeTab === 'returns' && returnStatusFilter !== 'all');
	const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setReturnStatusFilter('all'); };

	const handleTabChange = (tab) => {
		setActiveTab(tab);
		setDateFrom('');
		setDateTo('');
		setStatusFilter('all');
		setReturnStatusFilter('all');
	};

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-4 sm:p-6 overflow-y-auto'>

					{/* Header */}
					<div className='flex items-center gap-3 mb-6'>
						<div className='w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center'>
							<TrendingUp size={20} className='text-green-600' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>Revenue</h1>
							<p className='text-sm text-gray-500'>Earnings and payout status for your orders</p>
						</div>
					</div>

					{/* Summary cards — always visible */}
					<div className='grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6'>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<Euro size={15} className='text-green-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Gross Revenue</p>
							</div>
							<p className='text-2xl font-bold text-gray-900'>&euro;{soldOrders.reduce((s, o) => s + Number(o.TotalAmount || 0), 0).toFixed(2)}</p>
							<p className='text-xs text-gray-400 mt-0.5'>{soldOrders.length} sold order{soldOrders.length !== 1 ? 's' : ''}</p>
						</div>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<Percent size={15} className='text-purple-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Net Revenue</p>
							</div>
							<p className='text-2xl font-bold text-purple-600'>
								&euro;{(soldOrders.reduce((s, o) => s + Number(o.TotalAmount || 0), 0) * (1 - commissionRate)).toFixed(2)}
							</p>
							<p className='text-xs text-gray-400 mt-0.5'>After {(commissionRate * 100).toFixed(0)}% commission</p>
						</div>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<Clock size={15} className='text-amber-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Pending Payout</p>
							</div>
							<p className='text-2xl font-bold text-amber-600'>&euro;{totalPending.toFixed(2)}</p>
							<p className='text-xs text-gray-400 mt-0.5'>{payouts.filter(p => p.Status === 'Pending').length} awaiting transfer</p>
						</div>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<CheckCircle size={15} className='text-green-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Total Paid</p>
							</div>
							<p className='text-2xl font-bold text-green-600'>&euro;{totalPaid.toFixed(2)}</p>
							<p className='text-xs text-gray-400 mt-0.5'>{payouts.filter(p => p.Status === 'Paid').length} settled</p>
						</div>
					</div>

					{/* Tabs */}
					<div className='flex gap-0.5 bg-gray-100 p-1 rounded-xl w-fit mb-6'>
						{TABS.map((t) => (
							<button
								key={t.id}
								onClick={() => handleTabChange(t.id)}
								className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
									activeTab === t.id
										? 'bg-white text-gray-900 shadow-sm'
										: 'text-gray-500 hover:text-gray-700'
								}`}
							>
								{t.label}
							</button>
						))}
					</div>

					{/* Filters */}
					<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6'>
						<div className='flex flex-wrap gap-3 items-end'>
							<div className='flex items-center gap-2 text-sm text-gray-500'>
								<Filter size={15} />
								<span className='font-medium'>Filter by date</span>
							</div>

							{/* Payouts status filter */}
							{activeTab === 'payouts' && (
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
							)}

							{/* Returns status filter */}
							{activeTab === 'returns' && (
								<div className='flex flex-wrap bg-gray-100 rounded-xl p-1 gap-0.5'>
									{RETURN_STATUS_OPTIONS.map((opt) => (
										<button
											key={opt.value}
											onClick={() => setReturnStatusFilter(opt.value)}
											className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
												returnStatusFilter === opt.value
													? 'bg-white text-gray-900 shadow-sm'
													: 'text-gray-500 hover:text-gray-700'
											}`}
										>
											{opt.label}
											{opt.value !== 'all' && (
												<span className='ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600'>
													{returns.filter(r => r.ReturnStatus === opt.value).length}
												</span>
											)}
										</button>
									))}
								</div>
							)}

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

					{/* Content */}
					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-primary-500' />
						</div>
					) : error ? (
						<p className='text-red-500'>{error}</p>
					) : activeTab === 'revenue' ? (
						/* ── Revenue table ────────────────────────────────────────── */
						filteredRevenue.length === 0 ? (
							<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
								<Euro size={48} className='mx-auto text-gray-300 mb-4' />
								<h3 className='text-lg font-semibold text-gray-700 mb-2'>
									{soldOrders.length === 0 ? 'No revenue yet' : 'No results match your filters'}
								</h3>
								<p className='text-gray-500 text-sm'>
									{soldOrders.length === 0
										? 'Revenue is confirmed once an order passes the 14-day refund window.'
										: 'Try adjusting your date range.'}
								</p>
							</div>
						) : (
							<div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto'>
								<table className='w-full text-sm'>
									<thead>
										<tr className='border-b border-gray-100 bg-gray-50'>
											<th className='text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Order</th>
											<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Sold On</th>
											<th className='text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Items</th>
											<th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Gross</th>
											<th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>
												Commission ({(commissionRate * 100).toFixed(0)}%)
											</th>
											<th className='text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Net</th>
											<th className='px-4 py-3'></th>
										</tr>
									</thead>
									<tbody className='divide-y divide-gray-50'>
										{filteredRevenue.map((order) => {
											const gross      = Number(order.TotalAmount || 0);
											const commission = gross * commissionRate;
											const net        = gross - commission;
											const itemsCount = order.OrderItems.reduce((s, i) => s + (i.Quantity || 0), 0);
											return (
												<tr key={order.OrderId} className='hover:bg-gray-50 transition-colors'>
													<td className='px-5 py-3 font-medium text-gray-900'>#{order.OrderId.slice(0, 8)}</td>
													<td className='px-4 py-3 text-gray-500 whitespace-nowrap'>
														{new Date(order.UpdatedAt || order.OrderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
													</td>
													<td className='px-4 py-3 text-center text-gray-700'>{itemsCount}</td>
													<td className='px-4 py-3 text-right text-gray-700'>&euro;{gross.toFixed(2)}</td>
													<td className='px-4 py-3 text-right text-purple-600'>-&euro;{commission.toFixed(2)}</td>
													<td className='px-5 py-3 text-right font-semibold text-green-600'>&euro;{net.toFixed(2)}</td>
													<td className='px-4 py-3'>
														<button
															onClick={() => navigate(`/my-orders/${order.OrderId}`)}
															className='flex items-center gap-0.5 text-primary-500 hover:text-primary-600 text-xs font-medium'
														>
															View <ChevronRight size={13} />
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
									<tfoot>
										<tr className='border-t-2 border-gray-200 bg-gray-50'>
											<td colSpan={3} className='px-5 py-3 text-sm font-semibold text-gray-700'>
												Total ({filteredRevenue.length} order{filteredRevenue.length !== 1 ? 's' : ''})
											</td>
											<td className='px-4 py-3 text-right font-bold text-gray-900'>&euro;{totalGross.toFixed(2)}</td>
											<td className='px-4 py-3 text-right font-bold text-purple-600'>-&euro;{totalCommission.toFixed(2)}</td>
											<td className='px-5 py-3 text-right font-bold text-green-600'>&euro;{totalNet.toFixed(2)}</td>
											<td />
										</tr>
									</tfoot>
								</table>
							</div>
						)
					) : (
						/* ── Returns table ───────────────────────────────────────── */
						activeTab === 'returns' ? (
							<>
								{/* Returns summary cards */}
								<div className='grid grid-cols-3 gap-3 mb-6'>
									<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4'>
										<div className='flex items-center gap-2 mb-2'>
											<AlertCircle size={15} className='text-amber-500' />
											<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Pending</p>
										</div>
										<p className='text-2xl font-bold text-amber-600'>{pendingReturnsCount}</p>
										<p className='text-xs text-gray-400 mt-0.5'>awaiting decision</p>
									</div>
									<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4'>
										<div className='flex items-center gap-2 mb-2'>
											<CheckCircle size={15} className='text-green-500' />
											<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Approved</p>
										</div>
										<p className='text-2xl font-bold text-green-600'>{approvedReturnsCount}</p>
										<p className='text-xs text-gray-400 mt-0.5'>approved / refunded</p>
									</div>
									<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4'>
										<div className='flex items-center gap-2 mb-2'>
											<Euro size={15} className='text-red-400' />
											<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Total Refunded</p>
										</div>
										<p className='text-2xl font-bold text-red-500'>&euro;{totalRefunded.toFixed(2)}</p>
										<p className='text-xs text-gray-400 mt-0.5'>from {approvedReturnsCount} return{approvedReturnsCount !== 1 ? 's' : ''}</p>
									</div>
								</div>

								{filteredReturns.length === 0 ? (
									<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
										<RotateCcw size={48} className='mx-auto text-gray-300 mb-4' />
										<h3 className='text-lg font-semibold text-gray-700 mb-2'>
											{returns.length === 0 ? 'No return requests' : 'No results match your filters'}
										</h3>
										<p className='text-gray-500 text-sm'>
											{returns.length === 0
												? 'Return requests from buyers will appear here.'
												: 'Try adjusting your filters.'}
										</p>
									</div>
								) : (
									<div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto'>
										<table className='w-full text-sm'>
											<thead>
												<tr className='border-b border-gray-100 bg-gray-50'>
													<th className='text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Order</th>
													<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Buyer</th>
													<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Requested</th>
													<th className='text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Status</th>
													<th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Refund Amount</th>
													<th className='px-4 py-3'></th>
												</tr>
											</thead>
											<tbody className='divide-y divide-gray-50'>
												{filteredReturns.map((ret) => {
													const statusConfig = {
														Pending:  { label: 'Pending',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: <Clock size={11} /> },
														Approved: { label: 'Approved', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: <CheckCircle size={11} /> },
														Rejected: { label: 'Rejected', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: <Ban size={11} /> },
														Refunded: { label: 'Refunded', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: <CheckCircle size={11} /> },
													}[ret.ReturnStatus] || { label: ret.ReturnStatus, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: null };

													return (
														<tr key={ret.ReturnRequestId} className='hover:bg-gray-50 transition-colors'>
															<td className='px-5 py-3 font-medium text-gray-900'>#{(ret.OrderId || '').slice(0, 8)}</td>
															<td className='px-4 py-3 text-gray-600 text-sm'>{ret.BuyerName || ret.BuyerEmail || '—'}</td>
															<td className='px-4 py-3 text-gray-500 whitespace-nowrap'>
																{new Date(ret.CreatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
															</td>
															<td className='px-4 py-3 text-center'>
																<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
																	{statusConfig.icon}
																	{statusConfig.label}
																</span>
															</td>
															<td className='px-4 py-3 text-right font-semibold text-red-500'>
																{ret.RefundAmount ? `−€${Number(ret.RefundAmount).toFixed(2)}` : '—'}
															</td>
															<td className='px-4 py-3'>
																<button
																	onClick={() => navigate(`/my-orders/${ret.OrderId}`)}
																	className='flex items-center gap-0.5 text-primary-500 hover:text-primary-600 text-xs font-medium'
																>
																	View <ChevronRight size={13} />
																</button>
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</>
						) : (
						/* ── Payouts table ────────────────────────────────────────── */
						filteredPayouts.length === 0 ? (
							<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
								<Wallet size={48} className='mx-auto text-gray-300 mb-4' />
								<h3 className='text-lg font-semibold text-gray-700 mb-2'>
									{payouts.length === 0 ? 'No payouts yet' : 'No results match your filters'}
								</h3>
								<p className='text-gray-500 text-sm'>
									{payouts.length === 0
										? 'Payouts are created automatically when an order is marked as Delivered.'
										: 'Try adjusting your filters.'}
								</p>
							</div>
						) : (
							<div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto'>
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
										{filteredPayouts.map((payout) => (
											<tr key={payout.PayoutId} className='hover:bg-gray-50 transition-colors'>
												<td className='px-5 py-3 font-medium text-gray-900'>#{payout.OrderId?.slice(0, 8)}</td>
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
												Total ({filteredPayouts.length} payout{filteredPayouts.length !== 1 ? 's' : ''})
											</td>
											<td className='px-4 py-3 text-right font-bold text-gray-900'>
												&euro;{filteredPayTotal.toFixed(2)}
											</td>
											<td colSpan={2} />
										</tr>
									</tfoot>
								</table>
							</div>
						)
					)
					)}
				</div>
			</div>
		</>
	);
};

export default SellerRevenue;
