import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart2, Settings, Store, Menu, X, Plus } from 'lucide-react';
import { useAuth } from '../../utils/useAuth';
import api from '../../api/axios';
import { jwtDecode } from 'jwt-decode';
import SnoozeStore from './SnoozeStore';

const SellerSidebar = () => {
	const [isOpen, setIsOpen] = useState(true); // For collapse/expand
	const [mobileOpen, setMobileOpen] = useState(false); // For mobile drawer
	const [businessName, setBusinessName] = useState();
	const location = useLocation();
	const [userId, setUserId] = useState();

	const menuItems = [
		{ name: 'Dashboard', icon: <LayoutDashboard className='w-5 h-5' />, path: '/seller-dashboard' },
		{ name: 'Add Product', icon: <Plus className='w-5 h-5' />, path: '/new-product' },
		{ name: 'My Products', icon: <Package className='w-5 h-5' />, path: '/my-products' },
		{ name: 'Needs Restock', icon: <BarChart2 className='w-5 h-5' />, path: '/restock' },
		{ name: 'Orders', icon: <ShoppingCart className='w-5 h-5' />, path: '/my-orders' },
		// { name: 'Analytics', icon: <BarChart2 className='w-5 h-5' />, path: '/my-analytics' },
		{ name: 'Store Settings', icon: <Settings className='w-5 h-5' />, path: '/store-settings' },
	];
	// ✅ Decode token once on mount
	const token = localStorage.getItem('token');
	useEffect(() => {
		if (!token) return;

		try {
			const decoded = jwtDecode(token);
			const expired = decoded.exp * 1000 < Date.now();

			if (!expired) {
				setUserId(decoded.id);
				console.log('✅ Decoded user ID:', decoded.id);
			} else {
				console.warn('Token expired');
				localStorage.removeItem('token');
			}
		} catch (err) {
			console.error('Invalid token:', err);
			localStorage.removeItem('token');
		}
	}, []); // ✅ empty dependency — run once

	// ✅ Fetch store details only when userId is available
	useEffect(() => {
		if (!userId) return;

		const fetchStoreDetails = async () => {
			try {
				const response = await api.get(`store/store-details`);
				// const response = await api.get(`/store-details?UserId=${userId}`);
				console.log('The entire response', response);
				console.log('✅ Store details:', response.data);
				console.log('setBusinessName', response.data[0].BusinessName);
				console.log('setBusinessNumber', response.data[0].BusinessNumber);
				setBusinessName(response.data[0].BusinessName);
			} catch (error) {
				console.error('Error fetching store details:', error);
			}
		};

		fetchStoreDetails();
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
					<Store className='w-6 h-6 text-green-700' />
					{isOpen && <span className='text-lg font-semibold text-green-700'>{businessName} </span>}
				</div>

				<button
					className='hidden md:block text-gray-600 hover:text-green-700'
					onClick={() => setIsOpen(!isOpen)}
				>
					{isOpen ? <X size={20} /> : <Menu size={20} />}
				</button>
			</div>

			{/* Menu */}
			<nav className='flex-1 mt-4 space-y-1'>
				{menuItems.map((item) => (
					<Link
						key={item.name}
						to={item.path}
						className={`flex items-center px-4 py-2 rounded-lg mx-2 transition-colors ${
							isActive(item.path)
								? 'bg-green-100 text-green-700 font-medium'
								: 'text-gray-700 hover:bg-gray-100 hover:text-green-700'
						}`}
					>
						{item.icon}
						{isOpen && <span className='ml-3'>{item.name}</span>}
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
					<Store className='w-6 h-6 text-green-700' />
					<span className='font-semibold text-green-700'>{businessName}</span>
				</div>
				<button onClick={() => setMobileOpen(true)} className='text-gray-600 hover:text-green-700'>
					<Menu size={24} />
				</button>
			</div>

			{/* Sidebar for desktop/tablet */}
			<div className='hidden md:flex h-screen'>{sidebarContent}</div>

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
