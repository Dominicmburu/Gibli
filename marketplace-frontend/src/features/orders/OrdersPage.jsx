import { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import api from '../../api/axios';

const OrdersPage = () => {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchOrders = async () => {
			try {
				const response = await api.post('/orders/placed');
				setOrders(response.data.data || []);
			} catch (err) {
				console.error('Error fetching buyer orders:', err);
				setError('Failed to load your orders. Please try again later.');
			} finally {
				setLoading(false);
			}
		};
		fetchOrders();
	}, []);

	if (loading) return <div className='text-center mt-10'>Loading your orders...</div>;
	if (error) return <div className='text-center text-red-500 mt-10'>{error}</div>;

	return (
		<>
			<NavBar />
			<div className='min-h-screen bg-gray-50 p-6'>
				<h2 className='text-2xl font-semibold mb-6'>My Orders</h2>

				{orders.length === 0 ? (
					<p className='text-gray-500'>You haven’t placed any orders yet.</p>
				) : (
					<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
						{orders.map((order) => (
							<div
								key={order.OrderId}
								className='bg-white shadow rounded-2xl p-4 hover:shadow-lg transition-shadow'
							>
								<h3 className='font-semibold text-lg mb-2'>Order #{order.OrderId.slice(0, 8)}</h3>
								<p className='text-sm text-gray-500 mb-1'>
									Status: <span className='font-medium'>{order.DeliveryStatus}</span>
								</p>
								<p className='text-sm text-gray-500 mb-1'>
									Seller: <span className='font-medium'>{order.SellerName}</span>
								</p>
								<p className='text-sm text-gray-500 mb-1'>
									Total: <span className='font-medium'>€ {order.TotalAmount}</span>
								</p>
								<p className='text-xs text-gray-400 mb-2'>
									Placed on: {new Date(order.OrderDate).toLocaleString()}
								</p>

								{/* Items */}
								<div className='border-t pt-2 mt-2'>
									<p className='text-sm font-medium mb-1'>Items:</p>
									<ul className='space-y-1 max-h-32 overflow-y-auto text-sm'>
										{order.OrderItems.map((item) => (
											<li key={item.OrderItemId} className='flex justify-between'>
												<span>{item.ProductName}</span>
												<span>x{item.Quantity}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<Footer />
		</>
	);
};

export default OrdersPage;
