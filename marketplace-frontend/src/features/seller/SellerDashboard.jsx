import { useEffect, useState } from 'react';
import { Loader2, Package, ShoppingBag, DollarSign, CheckCircle, Euro } from 'lucide-react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
// import SnoozeStore from './SnoozeStore';
import { useAuth } from '../../utils/useAuth';
import api from '../../api/axios';

const SellerDashboard = () => {
	const { userInfo, isLoggedIn, tokenExpired } = useAuth();

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
				// Fetch seller data
				const [productsRes, sellerRes] = await Promise.all([
					api.get(`/products/myproducts`),
					api.get(`/seller/${userInfo.id}`),
				]);
				console.log('productsRes', productsRes);
				setStats({
					totalProducts: productsRes.data?.length || 0,
					totalSales: 125, // can be replaced with actual data later
					totalRevenue: 15230, // placeholder for now
					isVerified: sellerRes.data?.IsVerified || 0,
				});

				setRecentProducts(productsRes.data?.slice(0, 3) || []);
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
					<h2 className='text-2xl font-semibold mb-6 text-gray-800'>
						{userInfo?.name ? `${userInfo.name}'s Dashboard` : 'Seller Dashboard'}
					</h2>

					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-gray-500' />
						</div>
					) : (
						<>
							{/* ---------- Store Overview ---------- */}
							<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10'>
								<div className='bg-white shadow rounded-2xl p-5 flex items-center gap-4'>
									<Package className='text-green-600 w-8 h-8' />
									<div>
										<p className='text-gray-500 text-sm'>Total Products</p>
										<p className='text-xl font-semibold'>{stats.totalProducts}</p>
									</div>
								</div>
								<div className='bg-white shadow rounded-2xl p-5 flex items-center gap-4'>
									<ShoppingBag className='text-blue-600 w-8 h-8' />
									<div>
										<p className='text-gray-500 text-sm'>Total Sales</p>
										<p className='text-xl font-semibold'>{stats.totalSales}</p>
									</div>
								</div>
								<div className='bg-white shadow rounded-2xl p-5 flex items-center gap-4'>
									<Euro className='text-yellow-600 w-8 h-8' />
									<div>
										<p className='text-gray-500 text-sm'>Revenue (Ksh)</p>
										<p className='text-xl font-semibold'>{stats.totalRevenue.toLocaleString()}</p>
									</div>
								</div>
								<div className='bg-white shadow rounded-2xl p-5 flex items-center gap-4'>
									<CheckCircle
										className={`w-8 h-8 ${stats.isVerified ? 'text-green-600' : 'text-gray-400'}`}
									/>
									<div>
										<p className='text-gray-500 text-sm'>Store Status</p>
										<p
											className={`text-xl font-semibold ${
												stats.isVerified ? 'text-gray-500' : 'text-green-700'
											}`}
										>
											{stats.isVerified ? 'Snoozed' : 'Active'}
										</p>
									</div>
								</div>
							</div>

							{/* ---------- Snooze Store Toggle ---------- */}
							{/* <div className='mb-10'>
								<SnoozeStore />
							</div> */}

							{/* ---------- Recent Products Section ---------- */}
							<div>
								<h3 className='text-xl font-semibold text-gray-800 mb-4'>Recent Products</h3>

								{recentProducts.length === 0 ? (
									<p className='text-gray-500 text-sm'>
										No recent products found. Add new products to get started!
									</p>
								) : (
									<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
										{recentProducts.map((p) => (
											<div
												key={p.ProductId}
												className='bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between'
											>
												<img
													src={p.ImageUrl || '/placeholder.png'}
													alt={p.ProductName}
													className='w-full h-40 object-cover rounded-lg mb-3'
												/>
												<h4 className='text-lg font-medium'>{p.ProductName}</h4>
												<p className='text-sm text-gray-500 line-clamp-2'>{p.Description}</p>
												<p className='mt-2 font-semibold text-green-700'>Ksh {p.Price}</p>
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
