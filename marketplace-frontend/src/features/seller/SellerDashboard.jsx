import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Package, ShoppingBag, Euro, CheckCircle, TrendingUp } from 'lucide-react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import { useAuth } from '../../utils/useAuth';
import api from '../../api/axios';

const SellerDashboard = () => {
	const { userInfo, isLoggedIn, tokenExpired } = useAuth();
	const navigate = useNavigate();

	const [stats, setStats] = useState({
		totalProducts: 0,
		totalSales: 0,
		totalRevenue: 0,
		isVerified: 0,
	});
	const [recentProducts, setRecentProducts] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchDashboardData = async () => {
			if (!isLoggedIn || tokenExpired || !userInfo?.id) return;

			try {
				// Fetch independently so one failure doesn't zero out all stats
				const [productsRes, storeRes, ordersRes] = await Promise.allSettled([
					api.get('/products/myproducts'),
					api.get('/store/store-details'),
					api.post('/orders/received'),
				]);

				const products = productsRes.status === 'fulfilled' ? productsRes.value.data || [] : [];
				const storeData = storeRes.status === 'fulfilled' ? storeRes.value.data?.[0] : null;
				const orders = ordersRes.status === 'fulfilled' ? ordersRes.value.data?.data || [] : [];

				const formattedOrders = orders.map((o) => ({
					...o,
					OrderItems: typeof o.OrderItems === 'string' ? JSON.parse(o.OrderItems || '[]') : o.OrderItems || [],
				}));

				// Calculate real stats from orders (exclude cancelled)
				const activeOrders = formattedOrders.filter((o) => o.DeliveryStatus !== 'Cancelled');
				const totalSales = activeOrders.reduce(
					(sum, o) => sum + o.OrderItems.reduce((s, item) => s + (item.Quantity || 0), 0),
					0
				);
				const totalRevenue = activeOrders.reduce((sum, o) => sum + Number(o.TotalAmount || 0), 0);

				setStats({
					totalProducts: products.length,
					totalSales,
					totalRevenue,
					isVerified: storeData?.IsVerified || 0,
				});

				setRecentProducts(products.slice(0, 3));
			} catch (error) {
				console.error('Failed to fetch dashboard data:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [userInfo, isLoggedIn, tokenExpired]);

	return (
		<>
			<NavBar />
			<div className='flex bg-gray-50 min-h-screen'>
				<SellerSidebar />

				<div className='flex-1 p-6 overflow-y-auto'>
					<h2 className='text-2xl font-bold mb-6 text-gray-900'>
						{userInfo?.name ? `${userInfo.name}'s Dashboard` : 'Seller Dashboard'}
					</h2>

					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-primary-500' />
						</div>
					) : (
						<>
							{/* Store Overview */}
							<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
								<div className='bg-white shadow-sm border border-gray-100 rounded-2xl p-5 flex items-center gap-4'>
									<div className='w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center'>
										<Package className='text-primary-500 w-5 h-5' />
									</div>
									<div>
										<p className='text-gray-500 text-xs font-medium uppercase tracking-wide'>Products</p>
										<p className='text-2xl font-bold text-gray-900'>{stats.totalProducts}</p>
									</div>
								</div>
								<div className='bg-white shadow-sm border border-gray-100 rounded-2xl p-5 flex items-center gap-4'>
									<div className='w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center'>
										<ShoppingBag className='text-blue-500 w-5 h-5' />
									</div>
									<div>
										<p className='text-gray-500 text-xs font-medium uppercase tracking-wide'>Items Sold</p>
										<p className='text-2xl font-bold text-gray-900'>{stats.totalSales}</p>
									</div>
								</div>
								<div className='bg-white shadow-sm border border-gray-100 rounded-2xl p-5 flex items-center gap-4'>
									<div className='w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center'>
										<Euro className='text-green-500 w-5 h-5' />
									</div>
									<div>
										<p className='text-gray-500 text-xs font-medium uppercase tracking-wide'>Revenue</p>
										<p className='text-2xl font-bold text-gray-900'>&euro;{stats.totalRevenue.toFixed(2)}</p>
									</div>
								</div>
								<div className='bg-white shadow-sm border border-gray-100 rounded-2xl p-5 flex items-center gap-4'>
									<div className='w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center'>
										<CheckCircle className={`w-5 h-5 ${stats.isVerified ? 'text-amber-500' : 'text-green-500'}`} />
									</div>
									<div>
										<p className='text-gray-500 text-xs font-medium uppercase tracking-wide'>Store Status</p>
										<p className={`text-2xl font-bold ${stats.isVerified ? 'text-amber-500' : 'text-green-600'}`}>
											{stats.isVerified ? 'Snoozed' : 'Active'}
										</p>
									</div>
								</div>
							</div>

							{/* Recent Products */}
							<div>
								<div className='flex items-center justify-between mb-4'>
									<h3 className='text-lg font-bold text-gray-900'>Recent Products</h3>
									{recentProducts.length > 0 && (
										<button
											onClick={() => navigate('/my-products')}
											className='text-sm text-primary-500 hover:text-primary-600 font-medium'
										>
											View All
										</button>
									)}
								</div>

								{recentProducts.length === 0 ? (
									<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center'>
										<Package size={40} className='mx-auto text-gray-300 mb-3' />
										<p className='text-gray-500 text-sm mb-4'>
											No products yet. Add your first product to get started.
										</p>
										<button
											onClick={() => navigate('/new-product')}
											className='bg-primary-500 hover:bg-primary-600 text-white font-medium px-5 py-2 rounded-lg transition-colors text-sm'
										>
											Add Product
										</button>
									</div>
								) : (
									<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
										{recentProducts.map((p) => (
											<div
												key={p.ProductId}
												className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition'
											>
												<div className='h-40 bg-gray-100'>
													{p.ImageUrl ? (
														<img
															src={p.ImageUrl}
															alt={p.ProductName}
															className='w-full h-full object-cover'
														/>
													) : (
														<div className='w-full h-full flex items-center justify-center'>
															<Package size={32} className='text-gray-300' />
														</div>
													)}
												</div>
												<div className='p-4'>
													<h4 className='font-medium text-gray-900 truncate'>{p.ProductName}</h4>
													<p className='text-sm text-gray-500 line-clamp-1 mt-0.5'>{p.Description}</p>
													<div className='flex items-center justify-between mt-3'>
														<p className='font-bold text-primary-600'>&euro;{Number(p.Price).toFixed(2)}</p>
														<span className='text-xs text-gray-400'>{p.InStock} in stock</span>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</>
	);
};

export default SellerDashboard;
