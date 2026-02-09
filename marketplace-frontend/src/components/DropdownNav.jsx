import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, User } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const DropdownNav = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [tokenExpired, setTokenExpired] = useState(false);
	const [userInfo, setUserInfo] = useState(null);
	const navigate = useNavigate();

	const menuItems = [
		{ label: 'Wishlist', path: '/wishlist' },
		{ label: 'Address Book', path: '/address-book' },
		{ label: 'Orders', path: '/orders' },
		{ label: 'Become Seller', path: '/become-seller' },
	];

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) {
			setIsLoggedIn(false);
			setTokenExpired(false);
			setUserInfo(null);
			return;
		}

		try {
			const decoded = jwtDecode(token);
			const expired = decoded.exp * 1000 < Date.now();

			setTokenExpired(expired);
			setIsLoggedIn(!expired);

			if (!expired) {
				// pull from token:
				setUserInfo({
					name: decoded.name || decoded.username || 'User',
					email: decoded.email || null,
					role: decoded.role || null,
				});
			}
		} catch (err) {
			console.error('Invalid token', err);
			setIsLoggedIn(false);
			setTokenExpired(true);
			setUserInfo(null);
			localStorage.removeItem('token'); // optional cleanup
		}
	}, []);

	const handleClick = (path) => {
		if (!isLoggedIn || tokenExpired) {
			toast.error('Session expired. Please log in again.');
			navigate('/login');
			return;
		}
		navigate(path);
	};

	return (
		<div className='relative' onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
			{/* Main Nav Button */}
			<button className='flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-primary-600 transition-all'>
				<div className='w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center'>
					<User size={18} className='text-primary-600' />
				</div>
				<span className='text-sm font-medium hidden lg:inline'>
					{isLoggedIn && userInfo ? `Hi, ${userInfo.name}` : 'Account'}
				</span>
				<ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</button>

			{/* Dropdown List */}
			<div
				className={`absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-20 transition-all duration-200 overflow-hidden ${
					isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
				}`}
			>
				{/* User Info Header */}
				{isLoggedIn && userInfo && (
					<div className='px-4 py-3 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-100'>
						<p className='text-sm font-semibold text-primary-700'>{userInfo.name}</p>
						{userInfo.email && <p className='text-xs text-primary-500 truncate'>{userInfo.email}</p>}
					</div>
				)}
				<ul className='py-2'>
					{menuItems
						.filter((item) => {
							// Only show "Become Seller" if the user's role is "Buyer"
							if (item.label === 'Become Seller' && userInfo?.role !== 'Buyer') {
								return false;
							}
							return true;
						})
						.map((item) => (
							<li key={item.path}>
								<button
									onClick={() => handleClick(item.path)}
									className='w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 cursor-pointer transition-colors'
								>
									{item.label}
								</button>
							</li>
						))}
				</ul>
			</div>
		</div>
	);
};

export default DropdownNav;
