import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Package, ShoppingBag, Euro, CheckCircle, CreditCard, TrendingUp } from 'lucide-react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import SellerTour from './SellerTour';
import { useAuth } from '../../utils/useAuth';
import api from '../../api/axios';

function getTimeRemaining(endDateStr) {
	if (!endDateStr) return null;
	const diffMs = new Date(endDateStr) - new Date();
	if (diffMs <= 0) return 'Expired';
	const days  = Math.floor(diffMs / 86400000);
	const hours = Math.floor((diffMs % 86400000) / 3600000);
	if (days >= 30) {
		const months = Math.floor(days / 30);
		const remDays = days % 30;
		return `${months}mo ${remDays > 0 ? `${remDays}d` : ''} remaining`;
	}
	if (days >= 1) return `${days}d ${hours}h remaining`;
	return `${hours}h remaining`;
}

const SellerDashboard = () => {
	const { userInfo, isLoggedIn, tokenExpired } = useAuth();
	const navigate = useNavigate();

	const [stats, setStats] = useState({
		totalProducts: 0,
		totalSold: 0,
		totalRevenue: 0,
		isVerified: 0,
	});
	const [recentProducts, setRecentProducts] = useState([]);
	const [subscription, setSubscription]     = useState(null);
	const [loading, setLoading]               = useState(true);
	const [showTour, setShowTour]             = useState(false);

	useEffect(() => {
		const fetchDashboardData = async () => {
			if (!isLoggedIn || tokenExpired || !userInfo?.id) return;

			try {
				const [productsRes, storeRes, ordersRes, subRes] = await Promise.allSettled([
					api.get('/products/myproducts'),
					api.get('/store/store-details'),
					api.post('/orders/received'),
					api.get('/subscriptions/my-subscription'),
				]);

				const products  = productsRes.status === 'fulfilled' ? productsRes.value.data || [] : [];
				const storeData = storeRes.status === 'fulfilled' ? storeRes.value.data?.[0] : null;
				const orders    = ordersRes.status === 'fulfilled' ? ordersRes.value.data?.data || [] : [];
				const subData   = subRes.status === 'fulfilled' ? subRes.value.data : null;
				setSubscription(subData);

				const formattedOrders = orders.map((o) => ({
					...o,
					OrderItems: typeof o.OrderItems === 'string' ? JSON.parse(o.OrderItems || '[]') : o.OrderItems || [],
				}));

				const completedOrders = formattedOrders.filter((o) => ['Delivered', 'Sold'].includes(o.DeliveryStatus));
				const totalSold    = completedOrders.reduce((sum, o) => sum + o.OrderItems.reduce((s, item) => s + (item.Quantity || 0), 0), 0);
				const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.TotalAmount || 0), 0);

				setStats({
					totalProducts: products.length,
					totalSold,
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

	// Auto-start tour after data loads if not yet seen
	useEffect(() => {
		if (!loading && !localStorage.getItem('sellerTourComplete')) {
			const t = setTimeout(() => setShowTour(true), 400);
			return () => clearTimeout(t);
		}
	}, [loading]);

	const statCards = [
		{
			label: 'Products',
			tourId: 'stat-products',
			value: stats.totalProducts,
			icon: <Package className='text-primary-500 w-5 h-5' />,
			iconBg: 'bg-primary-50',
			onClick: () => navigate('/my-products'),
			clickable: true,
		},
		{
			label: 'Items Sold',
			tourId: 'stat-items-sold',
			value: stats.totalSold,
			icon: <ShoppingBag className='text-blue-500 w-5 h-5' />,
			iconBg: 'bg-blue-50',
			onClick: () => navigate('/my-sales'),
			clickable: true,
		},
		{
			label: 'Revenue',
			tourId: 'stat-revenue',
			value: `€${stats.totalRevenue.toFixed(2)}`,
			icon: <TrendingUp className='text-green-500 w-5 h-5' />,
			iconBg: 'bg-green-50',
			onClick: () => navigate('/my-revenue'),
			clickable: true,
		},
		{
			label: 'Store Status',
			tourId: 'stat-store-status',
			value: stats.isVerified ? 'Snoozed' : 'Active',
			valueClass: stats.isVerified ? 'text-amber-500' : 'text-green-600',
			icon: <CheckCircle className={`w-5 h-5 ${stats.isVerified ? 'text-amber-500' : 'text-green-500'}`} />,
			iconBg: 'bg-amber-50',
			clickable: true,
			onClick: () => navigate('/store-settings'),
		},
		{
			label: 'Subscription',
			tourId: 'stat-subscription',
			value: subscription && subscription.PlanCode !== 'free'
				? (getTimeRemaining(subscription.CurrentPeriodEnd) || subscription.PlanName)
				: 'Default · 5% commission',
			valueClass: 'text-purple-600',
			icon: <CreditCard className='text-purple-500 w-5 h-5' />,
			iconBg: 'bg-purple-50',
			clickable: true,
			onClick: () => navigate('/seller-subscription'),
		},
	];

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
							<div className='grid gap-4 grid-cols-2 xl:grid-cols-5 mb-8'>
								{statCards.map((card) => (
									<div
										key={card.label}
										data-tour={card.tourId}
										onClick={card.clickable ? card.onClick : undefined}
										className={`bg-white shadow-sm border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 transition-all ${
											card.clickable
												? 'cursor-pointer hover:shadow-md hover:border-primary-200 group'
												: ''
										}`}
									>
										<div className='flex items-center justify-between'>
											<div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center`}>
												{card.icon}
											</div>
											{card.clickable && (
												<span className='text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm'>→</span>
											)}
										</div>
										<div>
											<p className='text-gray-500 text-xs font-medium uppercase tracking-wide mb-1'>
												{card.label}
											</p>
											<p className={`text-xl font-bold leading-tight ${card.valueClass || 'text-gray-900'}`}>
												{card.value}
											</p>
											{card.subtext && (
												<p className='text-xs text-gray-400 mt-0.5'>{card.subtext}</p>
											)}
										</div>
									</div>
								))}
							</div>

							{/* Recent Products */}
							<div data-tour='recent-products'>
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

{/* Guided tour */}
			{showTour && <SellerTour onFinish={() => setShowTour(false)} />}

			{/* Help button — restarts tour */}
			{!showTour && (
				<button
					onClick={() => {
						localStorage.removeItem('sellerTourComplete');
						setShowTour(true);
					}}
					title='Take the guided tour'
					aria-label='Replay guided tour'
					className='fixed bottom-6 right-6 z-50 w-11 h-11 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center font-bold text-lg transition-all'
				>
					?
				</button>
			)}
		</>
	);
};

export default SellerDashboard;
