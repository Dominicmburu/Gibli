import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../utils/useAuth';

const DropdownNav = ({ showBecomeSeller = false }) => {
	const [isOpen, setIsOpen] = useState(false);
	const { isLoggedIn, tokenExpired, userInfo } = useAuth();
	const navigate = useNavigate();
	const { t } = useTranslation();

	const menuItems = [
		{ label: t('nav.myWishlist'),      path: '/wishlist' },
		{ label: t('address.title'),        path: '/address-book' },
		{ label: t('auth.orders'),          path: '/orders' },
		{ label: t('auth.becomeSeller'),    path: '/become-seller', sellerOnly: true },
	];

	const handleClick = (path) => {
		if (!isLoggedIn || tokenExpired) {
			toast.error('Session expired. Please log in again.');
			navigate('/login');
			return;
		}
		navigate(path);
		setIsOpen(false);
	};

	return (
		<div className='relative' onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
			{/* Main Nav Button */}
			<button className='flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-primary-600 transition-all'>
				<div className='w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center'>
					<User size={18} className='text-primary-600' />
				</div>
				<span className='text-sm font-medium hidden lg:inline'>
					{isLoggedIn && userInfo ? `Hi, ${userInfo.name}` : t('auth.login.title')}
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
						.filter((item) => !item.sellerOnly || showBecomeSeller)
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
