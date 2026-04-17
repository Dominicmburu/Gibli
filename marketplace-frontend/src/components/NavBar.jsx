// components/NavBar.jsx
import { useEffect, useState } from 'react';
import { Menu, Store, X, Search, Heart, ArrowRight } from 'lucide-react';
import SearchBar from './SearchBar';
import AuthButton from '../features/auth/components/AuthButton';
import CartIcon from './CartIcon';
import DropdownNav from './DropdownNav';
import LanguageSelector from './LanguageSelector';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';

const NavBar = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [pendingSetup, setPendingSetup] = useState(null); // null = loading, true = pending, false = complete
	const [wishlistCount, setWishlistCount] = useState(0);
	const { isLoggedIn, tokenExpired, userInfo } = useAuth();
	const role = userInfo?.role || null;
	const navigate = useNavigate();
	const { t } = useTranslation();

	const toggleMenu = () => setIsOpen(!isOpen);
	const toggleSearch = () => setIsSearchOpen(!isSearchOpen);

	useEffect(() => {
		// Only relevant for registered sellers (role === 'Seller').
		if (isLoggedIn && !tokenExpired && role === 'Seller') {
			api.get('/subscriptions/pending-seller-setup')
				.then(res => {
					setPendingSetup(res.data?.pendingSetup === true);
				})
				.catch(() => { setPendingSetup(false); }); // fail silently — default to no banner
		}
	}, [isLoggedIn, tokenExpired, role]);

	// Fetch wishlist count whenever the user logs in
	useEffect(() => {
		if (!isLoggedIn || tokenExpired) {
			setWishlistCount(0);
			return;
		}
		api.get('/wishlist/items')
			.then((res) => setWishlistCount((res.data || []).length))
			.catch(() => setWishlistCount(0));
	}, [isLoggedIn, tokenExpired]);

	// Handle scroll effect
	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 10);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Close mobile menu when resizing to desktop
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 768 && isOpen) {
				setIsOpen(false);
			}
			if (window.innerWidth >= 768 && isSearchOpen) {
				setIsSearchOpen(false);
			}
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [isOpen, isSearchOpen]);

	const handleClick = () => {
		if (!isLoggedIn || tokenExpired) {
			toast.error('Session expired. Please log in again.');
			navigate('/login');
			return;
		}
		navigate('/seller-dashboard');
		setIsOpen(false);
	};

	const handleWishlistClick = () => {
		if (!isLoggedIn || tokenExpired) {
			toast.error('Please log in to view your wishlist');
			navigate('/login');
			return;
		}
		navigate('/wishlist');
	};

	// true = completed seller → show "My Store", hide "Become a Seller" in dropdown
	// false = buyer / incomplete seller → hide "My Store", show "Become a Seller" in dropdown
	// null = seller API loading → show nothing (avoid flash)
	const showMyStore = role === 'Seller' && pendingSetup === false;
	const showBecomeSeller = role !== 'Seller' || pendingSetup === true;

	return (
		<nav className={`bg-white sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-lg shadow-gray-200/50' : 'shadow-sm'}`}>
			{/* Top accent bar */}
			<div className='h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-400'></div>

			{/* Pending seller payment banner */}
			{pendingSetup && (
				<div className='bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 flex-wrap'>
					<p className='text-sm text-amber-800'>
						<span className='font-semibold'>{t('nav.sellerBanner.title')}</span> {t('nav.sellerBanner.message')}
					</p>
					<button
						onClick={() => navigate('/onboarding/seller-plans')}
						className='flex items-center gap-1.5 text-sm font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition flex-shrink-0'
					>
						{t('nav.sellerBanner.cta')} <ArrowRight size={14} />
					</button>
				</div>
			)}

			<div className='max-w-7xl mx-auto px-2 sm:px-4 lg:px-8'>
				<div className='flex justify-between h-16 sm:h-18 items-center gap-2 sm:gap-4'>
					{/* Logo */}
					<Link to='/' className='hover:opacity-80 transition-opacity flex-shrink-0 group'>
						<div className='text-xl sm:text-2xl lg:text-3xl font-bold'>
							<span className='text-primary-600 group-hover:text-primary-700 transition-colors'>Gib</span>
							<span className='text-secondary-500 group-hover:text-secondary-600 transition-colors'>Li</span>
						</div>
					</Link>

					{/* Desktop: My Store (completed sellers only) */}
					<div className='hidden lg:flex items-center'>
						{showMyStore && (
							<button
								onClick={handleClick}
								className='flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-700 transition-all'
							>
								<Store className='w-4 h-4' />
								<span className='text-sm font-medium'>{t('nav.myStore')}</span>
							</button>
						)}
					</div>

					{/* Desktop: Search Bar (hidden on mobile/tablet) */}
					<div className='hidden md:flex flex-1 max-w-lg mx-4 lg:mx-8'>
						<SearchBar placeholder={t('nav.searchPlaceholder')} />
					</div>

					{/* Desktop: User Actions (hidden on mobile/tablet) */}
					<div className='hidden md:flex items-center gap-2 lg:gap-3'>
						{/* Wishlist Icon — red when items exist */}
						<button
							onClick={handleWishlistClick}
							className='relative p-2 rounded-xl hover:bg-gray-100 transition-colors group'
							aria-label='View wishlist'
						>
							<Heart
								size={22}
								fill={wishlistCount > 0 ? 'red' : 'none'}
								stroke={wishlistCount > 0 ? 'red' : 'currentColor'}
								className={wishlistCount > 0 ? 'text-red-500' : 'text-gray-600 group-hover:text-red-500 transition-colors'}
							/>
							{wishlistCount > 0 && (
								<span className='absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none'>
									{wishlistCount > 99 ? '99+' : wishlistCount}
								</span>
							)}
						</button>

						{/* Cart Icon */}
						<CartIcon />

						{/* Language Selector */}
						<LanguageSelector />

						{/* Profile Dropdown — passes showBecomeSeller so the item appears when needed */}
						<DropdownNav showBecomeSeller={showBecomeSeller} />
					</div>

					{/* Desktop: Auth Button (hidden on mobile) */}
					<div className='hidden md:block flex-shrink-0'>
						<AuthButton />
					</div>

					{/* Mobile/Tablet: Right side icons */}
					<div className='flex md:hidden items-center gap-0.5'>
						{/* Search */}
						<button
							onClick={toggleSearch}
							className={`p-2 rounded-lg transition-all ${isSearchOpen ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'}`}
							aria-label='Toggle search'
						>
							<Search size={19} />
						</button>

						{/* Language Selector (replaces wishlist icon on mobile) */}
						<LanguageSelector />

						{/* Cart */}
						<div className='flex-shrink-0'>
							<CartIcon />
						</div>

						{/* Hamburger */}
						<button
							onClick={toggleMenu}
							className={`p-2 rounded-lg transition-all ${isOpen ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'}`}
							aria-label='Toggle menu'
						>
							{isOpen ? <X size={20} /> : <Menu size={20} />}
						</button>
					</div>
				</div>

				{/* Mobile/Tablet: Search Bar Dropdown */}
				{isSearchOpen && (
					<div className='md:hidden py-3 border-t border-gray-100 animate-slideDown'>
						<SearchBar placeholder={t('nav.searchPlaceholder')} />
					</div>
				)}
			</div>

			{/* Mobile Menu Dropdown */}
			{isOpen && (
				<div className='md:hidden border-t border-gray-100 bg-white shadow-xl'>
					<div className='px-4 py-4 space-y-2'>
						{/* Home Link */}
						<Link
							to='/'
							className='flex items-center gap-3 py-3 px-4 hover:bg-gray-50 rounded-xl transition-colors text-gray-700 font-medium'
							onClick={() => setIsOpen(false)}
						>
							{t('nav.home')}
						</Link>

						{/* Wishlist Link */}
						<button
							onClick={() => {
								handleWishlistClick();
								setIsOpen(false);
							}}
							className='flex items-center gap-3 py-3 px-4 w-full text-left hover:bg-gray-50 rounded-xl transition-colors text-gray-700 font-medium'
						>
							<Heart
								size={18}
								fill={wishlistCount > 0 ? 'red' : 'none'}
								stroke={wishlistCount > 0 ? 'red' : 'currentColor'}
								className={wishlistCount > 0 ? 'text-red-500' : 'text-gray-600'}
							/>
							{t('nav.myWishlist')}
							{wishlistCount > 0 && (
								<span className='ml-auto min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1'>
									{wishlistCount > 99 ? '99+' : wishlistCount}
								</span>
							)}
						</button>

						{/* My Store (completed sellers) */}
						{showMyStore && (
							<button
								onClick={handleClick}
								className='flex items-center gap-3 py-3 px-4 w-full text-left bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl transition-colors font-medium'
							>
								<Store className='w-5 h-5' />
								{t('nav.myStore')}
							</button>
						)}

						{/* Divider */}
						<div className='h-px bg-gray-100 my-2'></div>

						{/* User info card (when logged in) */}
						{isLoggedIn && !tokenExpired && userInfo && (
							<div className='flex items-center gap-3 px-4 py-3 bg-primary-50 rounded-xl mb-1'>
								<div className='w-9 h-9 bg-primary-200 rounded-full flex items-center justify-center flex-shrink-0'>
									<span className='text-sm font-bold text-primary-700'>
										{userInfo.name?.charAt(0)?.toUpperCase()}
									</span>
								</div>
								<div className='min-w-0'>
									<p className='text-sm font-semibold text-primary-800 truncate'>{userInfo.name}</p>
									{userInfo.email && (
										<p className='text-xs text-primary-500 truncate'>{userInfo.email}</p>
									)}
								</div>
							</div>
						)}

						{/* Inline nav links — replaces DropdownNav on mobile */}
						{[
							{ label: t('nav.myWishlist'), path: '/wishlist', show: true },
							{ label: t('auth.orders', 'My Orders'), path: '/orders', show: true },
							{ label: t('address.title', 'Address Book'), path: '/address-book', show: true },
							{ label: t('auth.becomeSeller', 'Become a Seller'), path: '/become-seller', show: showBecomeSeller },
						].filter(item => item.show).map(item => (
							<button
								key={item.path}
								onClick={() => {
									if (!isLoggedIn || tokenExpired) {
										toast.error('Session expired. Please log in again.');
										navigate('/login');
									} else {
										navigate(item.path);
									}
									setIsOpen(false);
								}}
								className='flex items-center gap-3 py-3 px-4 w-full text-left hover:bg-gray-50 rounded-xl transition-colors text-gray-700 font-medium'
							>
								{item.label}
							</button>
						))}

						{/* Divider */}
						<div className='h-px bg-gray-100 my-2'></div>

						{/* Auth Button (Mobile) */}
						<div className='pt-2'>
							<AuthButton />
						</div>

					</div>
				</div>
			)}
		</nav>
	);
};

export default NavBar;
