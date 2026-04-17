import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
	LayoutDashboard, Package, ShoppingCart, BarChart2, Settings,
	Store, Menu, X, Plus, CreditCard, RotateCcw, MessageCircle, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../utils/useAuth';
import api from '../../api/axios';
import SnoozeStore from './SnoozeStore';
import toast from 'react-hot-toast';

const SellerSidebar = () => {
	const [isOpen, setIsOpen] = useState(true);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [businessName, setBusinessName] = useState('');
	const [newOrdersCount, setNewOrdersCount] = useState(0);
	const [pendingReturnsCount, setPendingReturnsCount] = useState(0);
	const [restockCount, setRestockCount] = useState(0);
	const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
	const prevCounts = useRef({ orders: 0, returns: 0, restock: 0, messages: 0 });
	const initialLoad = useRef(true);
	const location = useLocation();
	const { userInfo } = useAuth();
	const userId = userInfo?.id;

	const notify = (message, icon = '🔔') => {
		toast(message, {
			icon,
			duration: 6000,
			style: { background: '#1e293b', color: '#f8fafc', fontWeight: '500' },
		});
	};

	const allMenuItems = [
		{ name: 'Dashboard',     icon: <LayoutDashboard className='w-5 h-5' />, path: '/seller-dashboard',   tour: 'sidebar-dashboard'    },
		{ name: 'Add Product',   icon: <Plus className='w-5 h-5' />,            path: '/new-product',         tour: 'sidebar-add-product'  },
		{ name: 'My Products',   icon: <Package className='w-5 h-5' />,         path: '/my-products',         tour: 'sidebar-my-products'  },
		{ name: 'Needs Restock', icon: <BarChart2 className='w-5 h-5' />,       path: '/restock',             tour: 'sidebar-needs-restock'},
		{ name: 'Orders',        icon: <ShoppingCart className='w-5 h-5' />,    path: '/my-orders',           tour: 'sidebar-orders'       },
		{ name: 'Returns',       icon: <RotateCcw className='w-5 h-5' />,       path: '/my-returns',          tour: 'sidebar-returns'      },
		{ name: 'Messages',      icon: <MessageCircle className='w-5 h-5' />,   path: '/seller-messages',     tour: 'sidebar-messages'     },
		{ name: 'Revenue',       icon: <TrendingUp className='w-5 h-5' />,      path: '/my-revenue',          tour: 'sidebar-revenue'      },
		{ name: 'Subscription',  icon: <CreditCard className='w-5 h-5' />,      path: '/seller-subscription', tour: 'sidebar-subscription' },
		{ name: 'Store Settings',icon: <Settings className='w-5 h-5' />,        path: '/store-settings',      tour: 'sidebar-store-settings'},
	];

	// Fetch store name
	useEffect(() => {
		if (!userId) return;
		api.get('store/store-details')
			.then((r) => setBusinessName(r.data?.[0]?.BusinessName || ''))
			.catch(() => {});
	}, [userId]);

	// Fetch new orders count every 60s
	useEffect(() => {
		if (!userId) return;
		const fetchOrders = async () => {
			try {
				const r = await api.get('/orders/new-count');
				const count = r.data?.count || 0;
				if (!initialLoad.current && count > prevCounts.current.orders) {
					const diff = count - prevCounts.current.orders;
					notify(`You have ${diff} new order${diff > 1 ? 's' : ''} waiting!`, '🛒');
				}
				prevCounts.current.orders = count;
				setNewOrdersCount(count);
			} catch {}
		};
		fetchOrders();
		const id = setInterval(fetchOrders, 60000);
		return () => clearInterval(id);
	}, [userId]);

	// Fetch unread messages every 30s
	useEffect(() => {
		if (!userId) return;
		const fetchMessages = async () => {
			try {
				const r = await api.get('/messages/unread-count?role=Seller');
				const count = r.data?.count || 0;
				if (!initialLoad.current && count > prevCounts.current.messages) {
					const diff = count - prevCounts.current.messages;
					notify(`You have ${diff} new message${diff > 1 ? 's' : ''}!`, '💬');
				}
				prevCounts.current.messages = count;
				setUnreadMessagesCount(count);
			} catch {}
		};
		fetchMessages();
		const id = setInterval(fetchMessages, 30000);
		return () => clearInterval(id);
	}, [userId]);

	// Fetch returns + restock every 60s
	useEffect(() => {
		if (!userId) return;
		const fetchReturnsAndRestock = async () => {
			try {
				const [rr, rs] = await Promise.all([api.get('/returns/seller'), api.get('/uploads/restock-count')]);
				const returns = (rr.data?.data || []).filter((r) => r.ReturnStatus === 'Pending').length;
				const restock = rs.data?.count || 0;
				if (!initialLoad.current) {
					if (returns > prevCounts.current.returns) {
						const diff = returns - prevCounts.current.returns;
						notify(`${diff} new return request${diff > 1 ? 's' : ''} pending review.`, '↩️');
					}
					if (restock > prevCounts.current.restock) {
						const diff = restock - prevCounts.current.restock;
						notify(`${diff} product${diff > 1 ? 's' : ''} need${diff === 1 ? 's' : ''} restocking!`, '📦');
					}
				}
				prevCounts.current.returns = returns;
				prevCounts.current.restock = restock;
				setPendingReturnsCount(returns);
				setRestockCount(restock);
			} catch {}
		};
		fetchReturnsAndRestock();
		const id = setInterval(fetchReturnsAndRestock, 60000);
		return () => clearInterval(id);
	}, [userId]);

	// Check subscription expiry once on mount
	useEffect(() => {
		if (!userId) return;
		const checkSub = async () => {
			try {
				const r = await api.get('/store/subscription-status');
				const sub = r.data;
				if (!sub || sub.Status !== 'active' || !sub.CurrentPeriodEnd) return;
				const daysLeft = Math.ceil((new Date(sub.CurrentPeriodEnd) - Date.now()) / 86400000);
				if (daysLeft <= 3 && daysLeft > 0) {
					notify(`Your subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}!`, '⚠️');
				} else if (daysLeft <= 0) {
					notify('Your subscription has expired. Renew to keep your reduced commission.', '🔴');
				}
			} catch {}
		};
		const t = setTimeout(checkSub, 3500);
		return () => clearTimeout(t);
	}, [userId]);

	// Mark initial load done after first round of fetches (500ms grace)
	useEffect(() => {
		if (!userId) return;
		const t = setTimeout(() => { initialLoad.current = false; }, 3000);
		return () => clearTimeout(t);
	}, [userId]);

	const isActive = (path) => location.pathname === path;

	const getBadge = (name) => {
		if (name === 'Orders'        && newOrdersCount > 0)       return { count: newOrdersCount,       color: 'bg-red-500'     };
		if (name === 'Returns'       && pendingReturnsCount > 0)  return { count: pendingReturnsCount,  color: 'bg-amber-500'   };
		if (name === 'Needs Restock' && restockCount > 0)         return { count: restockCount,         color: 'bg-yellow-500'  };
		if (name === 'Messages'      && unreadMessagesCount > 0)  return { count: unreadMessagesCount,  color: 'bg-primary-500' };
		return null;
	};

	/* ── Desktop sidebar content ─────────────────────────────────────── */
	const sidebarContent = (
		<div className={`flex flex-col h-full bg-white shadow-lg transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
			{/* Header */}
			<div className='flex items-center justify-between p-4 border-b'>
				<div className='flex items-center gap-2 min-w-0'>
					<Store className='w-6 h-6 text-primary-600 flex-shrink-0' />
					{isOpen && <span className='text-base font-semibold text-primary-600 truncate'>{businessName}</span>}
				</div>
				<button
					className='text-gray-400 hover:text-primary-600 flex-shrink-0'
					onClick={() => setIsOpen(!isOpen)}
				>
					{isOpen ? <X size={18} /> : <Menu size={18} />}
				</button>
			</div>

			{/* Nav */}
			<nav className='flex-1 mt-3 space-y-0.5 px-2 overflow-y-auto'>
				{allMenuItems.map((item) => {
					const badge = getBadge(item.name);
					return (
						<Link
							key={item.name}
							to={item.path}
							data-tour={item.tour || undefined}
							onClick={() => setDrawerOpen(false)}
							className={`flex items-center w-full px-3 py-2.5 rounded-lg transition-colors ${
								isActive(item.path)
									? 'bg-primary-100 text-primary-600 font-medium'
									: 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'
							}`}
						>
							<span className='flex-shrink-0 relative'>
								{item.icon}
								{/* Small dot badge when collapsed */}
								{!isOpen && badge && (
									<span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${badge.color}`} />
								)}
							</span>
							{isOpen && <span className='ml-3 flex-1 text-sm text-left'>{item.name}</span>}
							{isOpen && badge && (
								<span className={`flex-shrink-0 ${badge.color} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight`}>
									{badge.count > 99 ? '99+' : badge.count}
								</span>
							)}
						</Link>
					);
				})}
			</nav>
		</div>
	);

	/* ── Mobile floating sidebar button (bottom-left FAB) ───────────── */
	const totalBadgeCount = newOrdersCount + pendingReturnsCount + restockCount + unreadMessagesCount;

	const mobileFab = (
		<button
			onClick={() => setDrawerOpen(true)}
			className='fixed bottom-6 left-6 z-50 md:hidden bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg flex items-center justify-center transition-colors'
			aria-label='Open seller menu'
			style={{ width: '60px', height: '60px' }}
		>
			<Menu size={22} />
			{totalBadgeCount > 0 && (
				<span className='absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight'>
					{totalBadgeCount > 99 ? '99+' : totalBadgeCount}
				</span>
			)}
		</button>
	);

	/* ── Mobile full-menu drawer ───────────────────────────────────── */
	const mobileDrawer = drawerOpen && (
		<div className='fixed inset-0 z-50 flex md:hidden'>
			<div className='w-72 bg-white h-full shadow-2xl flex flex-col'>
				{/* Drawer header */}
				<div className='flex items-center justify-between px-4 py-4 border-b'>
					<div className='flex items-center gap-2'>
						<Store className='w-6 h-6 text-primary-600' />
						<span className='font-semibold text-primary-600 truncate max-w-[180px]'>{businessName}</span>
					</div>
					<button onClick={() => setDrawerOpen(false)} className='p-1.5 text-gray-400 hover:text-gray-600 rounded-lg'>
						<X size={20} />
					</button>
				</div>

				{/* Nav items */}
				<nav className='flex-1 mt-2 space-y-0.5 px-2 overflow-y-auto pb-4'>
					{allMenuItems.map((item) => {
						const badge = getBadge(item.name);
						return (
							<Link
								key={item.name}
								to={item.path}
								onClick={() => setDrawerOpen(false)}
								className={`flex items-center w-full px-3 py-3 rounded-xl transition-colors ${
									isActive(item.path)
										? 'bg-primary-100 text-primary-600 font-medium'
										: 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
								}`}
							>
								<span className='flex-shrink-0'>{item.icon}</span>
								<span className='ml-3 flex-1 text-sm'>{item.name}</span>
								{badge && (
									<span className={`flex-shrink-0 ${badge.color} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight`}>
										{badge.count > 99 ? '99+' : badge.count}
									</span>
								)}
							</Link>
						);
					})}
				</nav>
			</div>
			{/* Backdrop */}
			<div className='flex-1 bg-black/40' onClick={() => setDrawerOpen(false)} />
		</div>
	);

	return (
		<>
			{/* Desktop sidebar */}
			<div className='hidden md:flex sticky top-0 h-screen flex-shrink-0'>{sidebarContent}</div>

			{/* Mobile floating button (bottom-left) */}
			{mobileFab}

			{/* Mobile full-menu drawer */}
			{mobileDrawer}
		</>
	);
};

export default SellerSidebar;
