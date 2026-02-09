import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
	Clock, Truck, CheckCircle, XCircle, ShoppingBag,
	Loader2, ChevronRight, ThumbsUp, ThumbsDown, Send, PackageCheck,
} from 'lucide-react';

const statusConfig = {
	Processing: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Processing' },
	Confirmed: { icon: ThumbsUp, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', label: 'Confirmed' },
	Shipped: { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Shipped' },
	Delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered' },
	Cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Cancelled' },
	Rejected: { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' },
};

const SellerOrders = () => {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [updatingOrder, setUpdatingOrder] = useState(null);
	const [filterStatus, setFilterStatus] = useState('all');
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

	const handleUpdateStatus = async (orderId, newStatus) => {
		setUpdatingOrder(orderId);
		try {
			await api.patch(`/orders/${orderId}/status`, { status: newStatus });
			setOrders((prev) =>
				prev.map((o) => (o.OrderId === orderId ? { ...o, DeliveryStatus: newStatus } : o))
			);
			const labels = { Confirmed: 'accepted', Rejected: 'rejected', Shipped: 'marked as shipped', Delivered: 'marked as delivered' };
			toast.success(`Order ${labels[newStatus]}`);
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
			case 'Processing':
				return (
					<div className='flex gap-2 mt-3'>
						<button
							onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.OrderId, 'Confirmed'); }}
							disabled={isUpdating}
							className='flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-green-600 border border-green-200 hover:bg-green-50 py-2 rounded-lg transition-colors disabled:opacity-50'
						>
							<ThumbsUp size={13} /> Accept
						</button>
						<button
							onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.OrderId, 'Rejected'); }}
							disabled={isUpdating}
							className='flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 py-2 rounded-lg transition-colors disabled:opacity-50'
						>
							<ThumbsDown size={13} /> Reject
						</button>
					</div>
				);
			case 'Confirmed':
				return (
					<button
						onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.OrderId, 'Shipped'); }}
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
			default:
				return null;
		}
	};

	return (
		<>
			<NavBar />
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
											<div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
												<StatusIcon size={12} />
												{statusInfo.label}
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
