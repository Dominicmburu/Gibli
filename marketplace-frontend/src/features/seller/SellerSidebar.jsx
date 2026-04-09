import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
	LayoutDashboard, Package, ShoppingCart, BarChart2, Settings,
	Store, Menu, X, Plus, CreditCard, RotateCcw, MessageCircle, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../utils/useAuth';
import api from '../../api/axios';
import SnoozeStore from './SnoozeStore';

const SellerSidebar = () => {
	const [isOpen, setIsOpen] = useState(true);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [businessName, setBusinessName] = useState('');
	const [newOrdersCount, setNewOrdersCount] = useState(0);
	const [pendingReturnsCount, setPendingReturnsCount] = useState(0);
	const [restockCount, setRestockCount] = useState(0);
	const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
	const location = useLocation();
	const { userInfo } = useAuth();
	const userId = userInfo?.id;

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
		const fetch = async () => {
			try { const r = await api.get('/orders/new-count'); setNewOrdersCount(r.data?.count || 0); } catch {}
		};
		fetch();
		const id = setInterval(fetch, 60000);
		return () => clearInterval(id);
	}, [userId]);

	// Fetch unread messages every 30s
	useEffect(() => {
		if (!userId) return;
		const fetch = async () => {
			try { const r = await api.get('/messages/unread-count?role=Seller'); setUnreadMessagesCount(r.data?.count || 0); } catch {}
		};
		fetch();
		const id = setInterval(fetch, 30000);
		return () => clearInterval(id);
	}, [userId]);

	// Fetch returns + restock every 60s
	useEffect(() => {
		if (!userId) return;
		const fetch = async () => {
			try {
				const [rr, rs] = await Promise.all([api.get('/returns/seller'), api.get('/uploads/restock-count')]);
				setPendingReturnsCount((rr.data?.data || []).filter((r) => r.ReturnStatus === 'Pending').length);
				setRestockCount(rs.data?.count || 0);
			} catch {}
		};
		fetch();
		const id = setInterval(fetch, 60000);
		return () => clearInterval(id);
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
			className='fixed bottom-6 left-6 z-50 md:hidden w-13 h-13 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg flex items-center justify-center transition-colors'
			aria-label='Open seller menu'
			style={{ width: '52px', height: '52px' }}
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
