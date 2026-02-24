import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Euro, Loader2, TrendingUp, Filter, X, Percent, ChevronRight } from 'lucide-react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';

const SellerRevenue = () => {
	const navigate = useNavigate();
	const [orders, setOrders]                 = useState([]);
	const [loading, setLoading]               = useState(true);
	const [error, setError]                   = useState(null);
	const [commissionRate, setCommissionRate] = useState(0.05);
	const [planName, setPlanName]             = useState('Free Plan');

	// Filters
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo]     = useState('');

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [ordersRes, subRes] = await Promise.allSettled([
					api.post('/orders/received'),
					api.get('/subscriptions/my-subscription'),
				]);

				if (ordersRes.status === 'fulfilled') {
					const all = ordersRes.value.data?.data || [];
					const formatted = all.map((o) => ({
						...o,
						OrderItems: typeof o.OrderItems === 'string' ? JSON.parse(o.OrderItems || '[]') : o.OrderItems || [],
					}));
					setOrders(formatted.filter((o) => o.DeliveryStatus === 'Sold'));
				}

				if (subRes.status === 'fulfilled' && subRes.value.data) {
					const sub = subRes.value.data;
					setCommissionRate(Number(sub.CommissionRate) || 0.05);
					setPlanName(sub.PlanName || 'Free Plan');
				}
			} catch (err) {
				console.error('Error fetching revenue:', err);
				setError('Failed to load revenue data. Please try again.');
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	const filtered = useMemo(() => {
		return orders.filter((order) => {
			const soldDate = new Date(order.UpdatedAt || order.OrderDate);
			if (dateFrom && soldDate < new Date(dateFrom)) return false;
			if (dateTo && soldDate > new Date(new Date(dateTo).setHours(23, 59, 59))) return false;
			return true;
		});
	}, [orders, dateFrom, dateTo]);

	const totalGross = filtered.reduce((sum, o) => sum + Number(o.TotalAmount || 0), 0);
	const totalCommission = totalGross * commissionRate;
	const totalNet = totalGross - totalCommission;

	const clearFilters = () => {
		setDateFrom('');
		setDateTo('');
	};

	const hasFilters = dateFrom || dateTo;

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-6 overflow-y-auto'>
					{/* Header */}
					<div className='flex items-center gap-3 mb-6'>
						<div className='w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center'>
							<TrendingUp size={20} className='text-green-600' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>Revenue</h1>
							<p className='text-sm text-gray-500'>Earnings from confirmed sales (14-day refund window passed)</p>
						</div>
					</div>

					{/* Summary Cards */}
					<div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
							<div className='flex items-center gap-2 mb-2'>
								<Euro size={16} className='text-green-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Gross Revenue</p>
							</div>
							<p className='text-3xl font-bold text-gray-900'>&euro;{totalGross.toFixed(2)}</p>
						</div>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
							<div className='flex items-center gap-2 mb-2'>
								<Percent size={16} className='text-purple-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Commission ({(commissionRate * 100).toFixed(0)}%)</p>
							</div>
							<p className='text-3xl font-bold text-purple-600'>-&euro;{totalCommission.toFixed(2)}</p>
						</div>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
							<div className='flex items-center gap-2 mb-2'>
								<TrendingUp size={16} className='text-blue-500' />
								<p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Net Revenue</p>
							</div>
							<p className='text-3xl font-bold text-blue-600'>&euro;{totalNet.toFixed(2)}</p>
						</div>
					</div>

					{/* Filters */}
					<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6'>
						<div className='flex flex-wrap gap-3 items-end'>
							<div className='flex items-center gap-2 text-sm text-gray-500'>
								<Filter size={15} />
								<span className='font-medium'>Filter by date</span>
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

					{/* Orders list */}
					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-primary-500' />
						</div>
					) : error ? (
						<p className='text-red-500'>{error}</p>
					) : filtered.length === 0 ? (
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
							<Euro size={48} className='mx-auto text-gray-300 mb-4' />
							<h3 className='text-lg font-semibold text-gray-700 mb-2'>
								{orders.length === 0 ? 'No revenue yet' : 'No results match your filters'}
							</h3>
							<p className='text-gray-500 text-sm'>
								{orders.length === 0
									? 'Revenue will appear here once orders pass the 14-day refund window.'
									: 'Try adjusting your date range.'}
							</p>
						</div>
					) : (
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
							<table className='w-full text-sm'>
								<thead>
									<tr className='border-b border-gray-100 bg-gray-50'>
										<th className='text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Order</th>
										<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Sold On</th>
										<th className='text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Items</th>
										<th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Gross</th>
										<th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Commission ({(commissionRate * 100).toFixed(0)}%)</th>
										<th className='text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Net</th>
										<th className='px-4 py-3'></th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-50'>
									{filtered.map((order) => {
										const gross = Number(order.TotalAmount || 0);
										const commission = gross * commissionRate;
										const net = gross - commission;
										const itemsCount = order.OrderItems.reduce((s, i) => s + (i.Quantity || 0), 0);
										const soldAt = order.UpdatedAt || order.OrderDate;

										return (
											<tr key={order.OrderId} className='hover:bg-gray-50 transition-colors'>
												<td className='px-5 py-3 font-medium text-gray-900'>
													#{order.OrderId.slice(0, 8)}
												</td>
												<td className='px-4 py-3 text-gray-500 whitespace-nowrap'>
													{new Date(soldAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
								{/* Totals row */}
								<tfoot>
									<tr className='border-t-2 border-gray-200 bg-gray-50'>
										<td colSpan={3} className='px-5 py-3 text-sm font-semibold text-gray-700'>
											Total ({filtered.length} order{filtered.length !== 1 ? 's' : ''})
										</td>
										<td className='px-4 py-3 text-right font-bold text-gray-900'>&euro;{totalGross.toFixed(2)}</td>
										<td className='px-4 py-3 text-right font-bold text-purple-600'>-&euro;{totalCommission.toFixed(2)}</td>
										<td className='px-5 py-3 text-right font-bold text-green-600'>&euro;{totalNet.toFixed(2)}</td>
										<td />
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

export default SellerRevenue;
