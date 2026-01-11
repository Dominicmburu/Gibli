// components/NavBar.jsx
import { useEffect, useState } from 'react';
import { Menu, Store, X, Search } from 'lucide-react';
import SearchBar from './SearchBar';
import AuthButton from '../features/auth/components/AuthButton';
import CartIcon from './CartIcon';
import DropdownNav from './DropdownNav';
import { getUserRole } from '../utils/userRole';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import toast from 'react-hot-toast';

const NavBar = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [role, setRole] = useState(null);
	const { isLoggedIn, tokenExpired } = useAuth();
	const navigate = useNavigate();

	const toggleMenu = () => setIsOpen(!isOpen);
	const toggleSearch = () => setIsSearchOpen(!isSearchOpen);

	useEffect(() => {
		setRole(getUserRole());
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

	return (
		<nav className='bg-white shadow-md sticky top-0 z-50'>
			<div className='max-w-7xl mx-auto px-3 sm:px-4 lg:px-8'>
				<div className='flex justify-between h-14 sm:h-16 items-center gap-2 sm:gap-4'>
					{/* Logo - Responsive sizing */}
					<a href='/' className='hover:text-baseGreen flex-shrink-0'>
						<div className='text-lg sm:text-xl lg:text-2xl font-bold text-baseGreen'>GibLi</div>
					</a>

					{/* Desktop: My Store Link (hidden on mobile/tablet) */}
					<div className='hidden lg:flex items-center'>
						{role === 'Seller' && (
							<button
								onClick={handleClick}
								className='flex items-center space-x-1 text-green-700 hover:text-green-900 transition-colors'
							>
								<Store className='w-5 h-5' />
								<span className='text-sm font-medium'>My Store</span>
							</button>
						)}
					</div>

					{/* Desktop: Search Bar (hidden on mobile/tablet) */}
					<div className='hidden md:flex flex-1 max-w-md mx-4 lg:mx-6'>
						<SearchBar placeholder='Search products...' />
					</div>

					{/* Desktop: User Actions (hidden on mobile/tablet) */}
					<div className='hidden md:flex items-center space-x-3 lg:space-x-6'>
						<CartIcon />
						<DropdownNav />
					</div>

					{/* Desktop: Auth Button (hidden on mobile) */}
					<div className='hidden md:block flex-shrink-0'>
						<AuthButton />
					</div>

					{/* Mobile/Tablet: Right side icons */}
					<div className='flex md:hidden items-center space-x-2 sm:space-x-3'>
						{/* Search Icon for Mobile/Tablet */}
						<button
							onClick={toggleSearch}
							className='p-2 hover:bg-gray-100 rounded-full transition-colors'
							aria-label='Toggle search'
						>
							<Search size={20} className='text-gray-700' />
						</button>

						{/* Cart Icon */}
						<div className='flex-shrink-0'>
							<CartIcon />
						</div>

						{/* Hamburger Menu Button */}
						<button
							onClick={toggleMenu}
							className='p-2 hover:bg-gray-100 rounded-full transition-colors'
							aria-label='Toggle menu'
						>
							{isOpen ? <X size={22} /> : <Menu size={22} />}
						</button>
					</div>
				</div>

				{/* Mobile/Tablet: Search Bar Dropdown */}
				{isSearchOpen && (
					<div className='md:hidden py-3 border-t border-gray-200 animate-slideDown'>
						<SearchBar placeholder='Search products...' />
					</div>
				)}
			</div>

			{/* Mobile Menu Dropdown */}
			{isOpen && (
				<div className='md:hidden px-3 sm:px-4 pb-4 space-y-3 border-t border-gray-200 bg-white shadow-lg'>
					{/* Home Link */}
					<a
						href='/'
						className='block py-2 px-3 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base'
						onClick={() => setIsOpen(false)}
					>
						Home
					</a>

					{/* My Store Link for Sellers (Mobile only) */}
					{role === 'Seller' && (
						<button
							onClick={handleClick}
							className='flex items-center space-x-2 py-2 px-3 w-full text-left text-green-700 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base'
						>
							<Store className='w-5 h-5' />
							<span>My Store</span>
						</button>
					)}

					{/* Dropdown Nav (Mobile) */}
					<div className='py-2 border-t border-gray-200'>
						<DropdownNav />
					</div>

					{/* Auth Button (Mobile) */}
					<div className='pt-2 border-t border-gray-200'>
						<AuthButton />
					</div>
				</div>
			)}
		</nav>
	);
};

export default NavBar;
