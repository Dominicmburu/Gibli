import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart2, Settings, Store, Menu, X, Plus, CreditCard } from 'lucide-react';
import { useAuth } from '../../utils/useAuth';
import api from '../../api/axios';
import SnoozeStore from './SnoozeStore';

const SellerSidebar = () => {
	const [isOpen, setIsOpen] = useState(true); // For collapse/expand
	const [mobileOpen, setMobileOpen] = useState(false); // For mobile drawer
	const [businessName, setBusinessName] = useState();
	const [newOrdersCount, setNewOrdersCount] = useState(0);
	const location = useLocation();
	const { userInfo } = useAuth();
	const userId = userInfo?.id;

	const menuItems = [
		{ name: 'Dashboard',     icon: <LayoutDashboard className='w-5 h-5' />, path: '/seller-dashboard',   tour: 'sidebar-dashboard'   },
		{ name: 'Add Product',   icon: <Plus className='w-5 h-5' />,            path: '/new-product',         tour: 'sidebar-add-product' },
		{ name: 'My Products',   icon: <Package className='w-5 h-5' />,         path: '/my-products',         tour: 'sidebar-my-products' },
		{ name: 'Needs Restock', icon: <BarChart2 className='w-5 h-5' />,       path: '/restock',             tour: 'sidebar-needs-restock'   },
		{ name: 'Orders',        icon: <ShoppingCart className='w-5 h-5' />,    path: '/my-orders',           tour: 'sidebar-orders'          },
		// { name: 'Analytics', icon: <BarChart2 className='w-5 h-5' />, path: '/my-analytics' },
		{ name: 'Subscription',  icon: <CreditCard className='w-5 h-5' />,      path: '/seller-subscription', tour: 'sidebar-subscription'    },
		{ name: 'Store Settings',icon: <Settings className='w-5 h-5' />,        path: '/store-settings',      tour: 'sidebar-store-settings'  },
	];

	// Fetch store details when userId is available
	useEffect(() => {
		if (!userId) return;

		const fetchStoreDetails = async () => {
			try {
				const response = await api.get(`store/store-details`);
				setBusinessName(response.data[0].BusinessName);
			} catch (error) {
				console.error('Error fetching store details:', error);
			}
		};

		fetchStoreDetails();
	}, [userId]);

	// Fetch new (Processing) order count and refresh every 60 seconds
	useEffect(() => {
		if (!userId) return;

		const fetchNewOrdersCount = async () => {
			try {
				const res = await api.get('/orders/new-count');
				setNewOrdersCount(res.data?.count || 0);
			} catch {
				// Non-critical — silently ignore
			}
		};

		fetchNewOrdersCount();
		const interval = setInterval(fetchNewOrdersCount, 60000);
		return () => clearInterval(interval);
	}, [userId]);

	const isActive = (path) => location.pathname === path;

	const sidebarContent = (
		<div
			className={`flex flex-col h-full bg-white shadow-lg transition-all duration-300 ${
				isOpen ? 'w-64' : 'w-20'
			}`}
		>
			{/* Logo */}
			<div className='flex items-center justify-between p-4 border-b'>
				<div className='flex items-center space-x-2'>
					<Store className='w-6 h-6 text-primary-600' />
					{isOpen && <span className='text-lg font-semibold text-primary-600'>{businessName} </span>}
				</div>

				<button
					className='hidden md:block text-gray-600 hover:text-primary-600'
					onClick={() => setIsOpen(!isOpen)}
				>
					{isOpen ? <X size={20} /> : <Menu size={20} />}
				</button>
			</div>

			{/* Menu */}
			<nav className='flex-1 mt-4 space-y-0.5 px-2'>
				{menuItems.map((item) => (
					<Link
						key={item.name}
						to={item.path}
						data-tour={item.tour || undefined}
						className={`flex items-center w-full px-3 py-2.5 rounded-lg transition-colors ${
							isActive(item.path)
								? 'bg-primary-100 text-primary-600 font-medium'
								: 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'
						}`}
					>
						<span className='flex-shrink-0'>{item.icon}</span>
						{isOpen && <span className='ml-3 flex-1 text-sm text-left'>{item.name}</span>}
						{isOpen && item.name === 'Orders' && newOrdersCount > 0 && (
							<span className='flex-shrink-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight'>
								{newOrdersCount > 99 ? '99+' : newOrdersCount}
							</span>
						)}
					</Link>
				))}
			</nav>

			{/* Footer */}
			{/* <div className='p-4 border-t'>
				<button className='w-full text-left flex items-center space-x-2 text-gray-600 hover:text-red-700'>
					<X className='w-5 h-5' />
					{isOpen && <span>Logout</span>}
				</button>
			</div> */}
		</div>
	);

	return (
		<>
			{/* Mobile header */}
			<div className='md:hidden flex items-center justify-between p-4 bg-white shadow'>
				<div className='flex items-center space-x-2'>
					<Store className='w-6 h-6 text-primary-600' />
					<span className='font-semibold text-primary-600'>{businessName}</span>
				</div>
				<button onClick={() => setMobileOpen(true)} className='text-gray-600 hover:text-primary-600'>
					<Menu size={24} />
				</button>
			</div>

			{/* Sidebar for desktop/tablet */}
			<div className='hidden md:flex sticky top-0 h-screen'>{sidebarContent}</div>

			{/* Mobile drawer */}
			{mobileOpen && (
				<div className='fixed inset-0 z-50 flex'>
					<div className='bg-white w-64 h-full shadow-lg'>{sidebarContent}</div>
					<div onClick={() => setMobileOpen(false)} className='flex-1 bg-black bg-opacity-30'></div>
				</div>
			)}
		</>
	);
};

export default SellerSidebar;
