// components/NavBar.jsx
import { useEffect, useState } from 'react';
import { Menu, Store, X, Search, Heart, ArrowRight } from 'lucide-react';
import SearchBar from './SearchBar';
import AuthButton from '../features/auth/components/AuthButton';
import CartIcon from './CartIcon';
import DropdownNav from './DropdownNav';
import { getUserRole } from '../utils/userRole';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import toast from 'react-hot-toast';
import api from '../api/axios';

const NavBar = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [role, setRole] = useState(null);
	const [scrolled, setScrolled] = useState(false);
	const [pendingSetup, setPendingSetup] = useState(null); // { planName } or null
	const { isLoggedIn, tokenExpired } = useAuth();
	const navigate = useNavigate();

	const toggleMenu = () => setIsOpen(!isOpen);
	const toggleSearch = () => setIsSearchOpen(!isSearchOpen);

	useEffect(() => {
		const r = getUserRole();
		setRole(r);

		// Check if user paid for a plan but hasn't registered as a seller yet.
		// Only relevant for non-sellers who are logged in.
		if (isLoggedIn && !tokenExpired && r !== 'Seller') {
			api.get('/subscriptions/pending-seller-setup')
				.then(res => {
					if (res.data?.pendingSetup) {
						setPendingSetup({ planName: res.data.subscription?.PlanName });
					}
				})
				.catch(() => {}); // banner is non-critical, fail silently
		}
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
		setIsOpen(false); // Close mobile menu after navigation
	};

	const handleWishlistClick = () => {
		if (!isLoggedIn || tokenExpired) {
			toast.error('Please log in to view your wishlist');
			navigate('/login');
			return;
		}
		navigate('/wishlist');
	};

	return (
		<nav className={`bg-white sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-lg shadow-gray-200/50' : 'shadow-sm'}`}>
			{/* Top accent bar */}
			<div className='h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-400'></div>

			{/* Pending seller setup banner */}
			{pendingSetup && (
				<div className='bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 flex-wrap'>
					<p className='text-sm text-amber-800'>
						<span className='font-semibold'>Almost there!</span> You subscribed to{' '}
						<span className='font-semibold'>{pendingSetup.planName}</span> but haven't created your seller account yet.
					</p>
					<button
						onClick={() => navigate('/seller/register')}
						className='flex items-center gap-1.5 text-sm font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition flex-shrink-0'
					>
						Complete Setup <ArrowRight size={14} />
					</button>
				</div>
			)}

			<div className='max-w-7xl mx-auto px-3 sm:px-4 lg:px-8'>
				<div className='flex justify-between h-16 sm:h-18 items-center gap-2 sm:gap-4'>
					{/* Logo */}
					<Link to='/' className='hover:opacity-80 transition-opacity flex-shrink-0 group'>
						<div className='text-xl sm:text-2xl lg:text-3xl font-bold'>
							<span className='text-primary-600 group-hover:text-primary-700 transition-colors'>Gib</span>
							<span className='text-secondary-500 group-hover:text-secondary-600 transition-colors'>Li</span>
						</div>
					</Link>

					{/* Desktop: My Store Link (hidden on mobile/tablet) */}
					<div className='hidden lg:flex items-center'>
						{role === 'Seller' && (
							<button
								onClick={handleClick}
								className='flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-700 transition-all'
							>
								<Store className='w-4 h-4' />
								<span className='text-sm font-medium'>My Store</span>
							</button>
						)}
					</div>

					{/* Desktop: Search Bar (hidden on mobile/tablet) */}
					<div className='hidden md:flex flex-1 max-w-lg mx-4 lg:mx-8'>
						<SearchBar placeholder='Search for products...' />
					</div>

					{/* Desktop: User Actions (hidden on mobile/tablet) */}
					<div className='hidden md:flex items-center gap-2 lg:gap-3'>
						{/* Wishlist Icon */}
						<button
							onClick={handleWishlistClick}
							className='relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors group'
							aria-label='View wishlist'
						>
							<Heart size={22} className='text-gray-600 group-hover:text-red-500 transition-colors' />
						</button>

						{/* Cart Icon */}
						<CartIcon />

						{/* Profile Dropdown */}
						<DropdownNav />
					</div>

					{/* Desktop: Auth Button (hidden on mobile) */}
					<div className='hidden md:block flex-shrink-0'>
						<AuthButton />
					</div>

					{/* Mobile/Tablet: Right side icons */}
					<div className='flex md:hidden items-center gap-1 sm:gap-2'>
						{/* Search Icon for Mobile/Tablet */}
						<button
							onClick={toggleSearch}
							className={`p-2.5 rounded-xl transition-all ${isSearchOpen ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'}`}
							aria-label='Toggle search'
						>
							<Search size={20} />
						</button>

						{/* Wishlist Icon Mobile */}
						<button
							onClick={handleWishlistClick}
							className='p-2.5 rounded-xl hover:bg-gray-100 transition-colors'
							aria-label='View wishlist'
						>
							<Heart size={20} className='text-gray-600' />
						</button>

						{/* Cart Icon */}
						<div className='flex-shrink-0'>
							<CartIcon />
						</div>

						{/* Hamburger Menu Button */}
						<button
							onClick={toggleMenu}
							className={`p-2.5 rounded-xl transition-all ${isOpen ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-600'}`}
							aria-label='Toggle menu'
						>
							{isOpen ? <X size={22} /> : <Menu size={22} />}
						</button>
					</div>
				</div>

				{/* Mobile/Tablet: Search Bar Dropdown */}
				{isSearchOpen && (
					<div className='md:hidden py-3 border-t border-gray-100 animate-slideDown'>
						<SearchBar placeholder='Search for products...' />
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
							Home
						</Link>

						{/* Wishlist Link */}
						<button
							onClick={() => {
								handleWishlistClick();
								setIsOpen(false);
							}}
							className='flex items-center gap-3 py-3 px-4 w-full text-left hover:bg-gray-50 rounded-xl transition-colors text-gray-700 font-medium'
						>
							<Heart size={18} className='text-red-500' />
							My Wishlist
						</button>

						{/* My Store Link for Sellers (Mobile only) */}
						{role === 'Seller' && (
							<button
								onClick={handleClick}
								className='flex items-center gap-3 py-3 px-4 w-full text-left bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl transition-colors font-medium'
							>
								<Store className='w-5 h-5' />
								My Store
							</button>
						)}

						{/* Divider */}
						<div className='h-px bg-gray-100 my-2'></div>

						{/* Dropdown Nav (Mobile) */}
						<div className='py-2'>
							<DropdownNav />
						</div>

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
