import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import { Package, Clock, Truck, CheckCircle, XCircle, ChevronRight, ShoppingBag, Loader2 } from 'lucide-react';

const statusConfig = {
	Processing: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Processing' },
	Confirmed: { icon: CheckCircle, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', label: 'Confirmed' },
	Shipped: { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Shipped' },
	Delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Delivered' },
	Cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Cancelled' },
	Rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' },
};

const OrdersPage = () => {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchOrders = async () => {
			try {
				const response = await api.post('/orders/placed');
				setOrders(response.data.data || []);
			} catch (err) {
				console.error('Error fetching buyer orders:', err);
				if (err.response?.status === 401 || err.response?.status === 403) {
					navigate('/login');
					return;
				}
				setError('Failed to load your orders. Please try again later.');
			} finally {
				setLoading(false);
			}
		};
		fetchOrders();
	}, [navigate]);

	const getStatusInfo = (status) => statusConfig[status] || statusConfig.Processing;

	if (loading) {
		return (
			<>
				<NavBar />
				<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
					<div className='flex flex-col items-center gap-3'>
						<Loader2 size={32} className='animate-spin text-primary-500' />
						<p className='text-gray-500'>Loading your orders...</p>
					</div>
				</div>
				<Footer />
			</>
		);
	}

	if (error) {
		return (
			<>
				<NavBar />
				<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
					<p className='text-red-500'>{error}</p>
				</div>
				<Footer />
			</>
		);
	}

	return (
		<>
			<NavBar />
			<div className='min-h-screen bg-gray-50'>
				<div className='max-w-5xl mx-auto px-4 sm:px-6 py-8'>
					{/* Header */}
					<div className='flex items-center gap-3 mb-8'>
						<div className='w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center'>
							<Package size={20} className='text-primary-600' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>My Orders</h1>
							<p className='text-sm text-gray-500'>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
						</div>
					</div>

					{orders.length === 0 ? (
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
							<ShoppingBag size={48} className='mx-auto text-gray-300 mb-4' />
							<h3 className='text-lg font-semibold text-gray-700 mb-2'>No orders yet</h3>
							<p className='text-gray-500 mb-6'>When you place an order, it will appear here.</p>
							<button
								onClick={() => navigate('/')}
								className='bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors'
							>
								Start Shopping
							</button>
						</div>
					) : (
						<div className='space-y-4'>
							{orders.map((order) => {
								const statusInfo = getStatusInfo(order.DeliveryStatus);
								const StatusIcon = statusInfo.icon;
								const firstImage = order.OrderItems?.[0]?.ProductImageUrl;

								return (
									<div
										key={order.OrderId}
										className='bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow'
									>
										<div className='p-5 sm:p-6'>
											{/* Top row: Order ID + Status */}
											<div className='flex items-center justify-between mb-4'>
												<div className='flex items-center gap-3'>
													<p className='text-sm font-medium text-gray-500'>
														Order <span className='text-gray-900 font-semibold'>#{order.OrderId.slice(0, 8)}</span>
													</p>
													<span className='text-gray-300'>|</span>
													<p className='text-sm text-gray-400'>
														{new Date(order.OrderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
													</p>
												</div>
												<div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
													<StatusIcon size={14} />
													{statusInfo.label}
												</div>
											</div>

											{/* Content row */}
											<div className='flex items-center gap-4'>
												{/* Product image thumbnail */}
												<div className='hidden sm:block w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0'>
													{firstImage ? (
														<img src={firstImage} alt='' className='w-full h-full object-cover' />
													) : (
														<div className='w-full h-full flex items-center justify-center'>
															<Package size={24} className='text-gray-300' />
														</div>
													)}
												</div>

												{/* Order info */}
												<div className='flex-1 min-w-0'>
													<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
														<div>
															<p className='text-sm text-gray-600'>
																{order.OrderItems.length} item{order.OrderItems.length !== 1 ? 's' : ''} from{' '}
																<span className='font-medium text-gray-900'>{order.SellerName}</span>
															</p>
															<p className='text-sm text-gray-400 mt-0.5 truncate'>
																{order.OrderItems.map((i) => i.ProductName).join(', ')}
															</p>
														</div>
														<p className='text-lg font-bold text-gray-900 flex-shrink-0'>
															&euro;{Number(order.TotalAmount).toFixed(2)}
														</p>
													</div>
												</div>

												{/* View details button */}
												<button
													onClick={() => navigate(`/orders/${order.OrderId}`)}
													className='flex-shrink-0 flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors'
												>
													<span className='hidden sm:inline'>View Details</span>
													<ChevronRight size={18} />
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
			<Footer />
		</>
	);
};

export default OrdersPage;
