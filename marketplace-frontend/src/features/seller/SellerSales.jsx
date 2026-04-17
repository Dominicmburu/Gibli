import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Loader2, ShoppingBag, Package, Filter, X } from 'lucide-react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';

const SellerSales = () => {
	const navigate = useNavigate();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Filters
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [search, setSearch] = useState('');

	useEffect(() => {
		const fetchOrders = async () => {
			try {
				const res = await api.post('/orders/received');
				const all = res.data?.data || [];
				const formatted = all.map((o) => ({
					...o,
					OrderItems: typeof o.OrderItems === 'string' ? JSON.parse(o.OrderItems || '[]') : o.OrderItems || [],
				}));
				// Only sold orders
				setOrders(formatted.filter((o) => o.DeliveryStatus === 'Sold'));
			} catch (err) {
				console.error('Error fetching sales:', err);
				setError('Failed to load sales data. Please try again.');
			} finally {
				setLoading(false);
			}
		};
		fetchOrders();
	}, []);

	// Flatten: one row per order item
	const allItems = useMemo(() => {
		return orders.flatMap((order) =>
			order.OrderItems.map((item) => ({
				...item,
				orderId: order.OrderId,
				orderDate: order.OrderDate,
				soldAt: order.UpdatedAt || order.OrderDate,
				buyerName: order.BuyerName,
			}))
		);
	}, [orders]);

	const filtered = useMemo(() => {
		return allItems.filter((item) => {
			const soldDate = new Date(item.soldAt);
			if (dateFrom && soldDate < new Date(dateFrom)) return false;
			if (dateTo && soldDate > new Date(new Date(dateTo).setHours(23, 59, 59))) return false;
			if (search && !item.ProductName?.toLowerCase().includes(search.toLowerCase())) return false;
			return true;
		});
	}, [allItems, dateFrom, dateTo, search]);

	const totalQty = filtered.reduce((sum, i) => sum + (i.Quantity || 0), 0);
	const totalRevenue = filtered.reduce((sum, i) => sum + Number(i.ItemTotal || 0), 0);

	const clearFilters = () => {
		setDateFrom('');
		setDateTo('');
		setSearch('');
	};

	const hasFilters = dateFrom || dateTo || search;

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-2 sm:p-6 overflow-y-auto'>
					{/* Header */}
					<div className='flex items-center gap-3 mb-6'>
						<div className='w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center'>
							<BadgeCheck size={20} className='text-purple-600' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>Items Sold</h1>
							<p className='text-sm text-gray-500'>Orders that have passed the 14-day refund window</p>
						</div>
					</div>

					{/* Summary */}
					<div className='grid grid-cols-2 gap-4 mb-6'>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
							<p className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-1'>Total Items Sold</p>
							<p className='text-3xl font-bold text-gray-900'>{totalQty}</p>
						</div>
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
							<p className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-1'>Total Revenue</p>
							<p className='text-3xl font-bold text-green-600'>&euro;{totalRevenue.toFixed(2)}</p>
						</div>
					</div>

					{/* Filters */}
					<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6'>
						<div className='flex flex-wrap gap-3 items-end'>
							<div className='flex items-center gap-2 text-sm text-gray-500'>
								<Filter size={15} />
								<span className='font-medium'>Filters</span>
							</div>
							<div className='flex-1 min-w-40'>
								<label className='block text-xs text-gray-500 mb-1'>Search product</label>
								<input
									type='text'
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder='Product name...'
									className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400'
								/>
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
							<ShoppingBag size={48} className='mx-auto text-gray-300 mb-4' />
							<h3 className='text-lg font-semibold text-gray-700 mb-2'>
								{allItems.length === 0 ? 'No sales yet' : 'No results match your filters'}
							</h3>
							<p className='text-gray-500 text-sm'>
								{allItems.length === 0
									? 'Sales will appear here once orders pass the 14-day refund window.'
									: 'Try adjusting your date range or search term.'}
							</p>
						</div>
					) : (
						<div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
							<table className='w-full text-sm'>
								<thead>
									<tr className='border-b border-gray-100 bg-gray-50'>
										<th className='text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Product</th>
										<th className='text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Qty</th>
										<th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Unit Price</th>
										<th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Item Total</th>
										<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Buyer</th>
										<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Sold On</th>
										<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Order</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-50'>
									{filtered.map((item, idx) => (
										<tr key={`${item.OrderItemId}-${idx}`} className='hover:bg-gray-50 transition-colors'>
											<td className='px-5 py-3'>
												<div className='flex items-center gap-3'>
													{item.ProductImageUrl ? (
														<img
															src={item.ProductImageUrl}
															alt={item.ProductName}
															className='w-9 h-9 rounded-lg object-cover flex-shrink-0'
														/>
													) : (
														<div className='w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0'>
															<Package size={14} className='text-gray-400' />
														</div>
													)}
													<span className='font-medium text-gray-900 truncate max-w-48'>{item.ProductName}</span>
												</div>
											</td>
											<td className='px-4 py-3 text-center text-gray-700 font-medium'>{item.Quantity}</td>
											<td className='px-4 py-3 text-right text-gray-700'>&euro;{Number(item.UnitPrice).toFixed(2)}</td>
											<td className='px-4 py-3 text-right font-semibold text-green-600'>&euro;{Number(item.ItemTotal).toFixed(2)}</td>
											<td className='px-4 py-3 text-gray-600'>{item.buyerName}</td>
											<td className='px-4 py-3 text-gray-500 whitespace-nowrap'>
												{new Date(item.soldAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
											</td>
											<td className='px-4 py-3'>
												<button
													onClick={() => navigate(`/my-orders/${item.orderId}`)}
													className='text-primary-500 hover:text-primary-600 font-medium text-xs'
												>
													#{item.orderId.slice(0, 8)}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default SellerSales;
