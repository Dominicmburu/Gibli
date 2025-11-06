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
			<button className='flex items-center gap-1 px-4 py-2 hover:text-green-600 transition'>
				<User size={30} />
				{isLoggedIn && userInfo ? `Hi, ${userInfo.name}` : 'Account'}
				<ChevronDown size={16} />
			</button>

			{/* Dropdown List */}
			<div
				className={`absolute left-0 mt-2 w-48 bg-amber-500 border border-gray-200 rounded-lg shadow-lg z-20 transition-all duration-200 ${
					isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
				}`}
			>
				<ul className='flex flex-col'>
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
									className='w-full text-left block px-4 py-2 hover:bg-gray-100 cursor-pointer'
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
