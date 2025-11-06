// components/NavBar.jsx
import { useEffect, useState } from 'react';
import { Menu, Store, X } from 'lucide-react'; // icons
import SearchBar from './SearchBar';
import AuthButton from '../features/auth/components/AuthButton';
import CartIcon from './CartIcon';
import Profile from '../features/profile/components/Profile';
import ProfileIcon from './ProfileIcon';
import DropdownNav from './DropdownNav';
import { getUserRole } from '../utils/userRole';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import toast from 'react-hot-toast';

const NavBar = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [role, setRole] = useState(null);
	const { isLoggedIn, tokenExpired } = useAuth();
	const navigate = useNavigate();
	const toggleMenu = () => setIsOpen(!isOpen);
	useEffect(() => {
		setRole(getUserRole());
	}, []);

	const handleClick = () => {
		if (!isLoggedIn || tokenExpired) {
			toast.error('Session expired. Please log in again.');
			navigate('/login');
			return;
		}
		navigate('/seller-dashboard');
	};
	return (
		<nav className='bg-white shadow-md sticky top-0 z-50'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex justify-between h-16 items-center'>
					{/* Logo */}
					<a href='/' className='hover:text-baseGreen'>
						<div className='text-2xl font-bold text-baseGreen'>Marketplace</div>
					</a>

					{/* Desktop Links */}
					<div className='hidden md:flex space-x-6'>
						{/* <a href='/' className='hover:text-baseGreen'>
							Home
						</a> */}
						{/* <a href='/products' className='hover:text-baseGreen'>
							Products
						</a>
						<a href='/about' className='hover:text-baseGreen'>
							About
						</a> */}

						{role === 'Seller' && (
							<button
								onClick={() => handleClick()}
								//to='/seller-dashboard'
								className='flex items-center space-x-1 text-green-700 hover:text-green-900'
							>
								<Store className='w-5 h-5' />
								<span>My Store</span>
							</button>
						)}
					</div>
					<SearchBar placeholder='Search products...' />
					{/* Search + User actions */}
					<div className='hidden md:flex items-center space-x-9'>
						<CartIcon />
						{/* <ProfileIcon /> */}
						<DropdownNav />
						{/* <button className='bg-baseGreen text-white px-4 py-2 rounded-lg'>Login</button> */}
						{/* <AuthButton /> */}
					</div>
					<AuthButton />
					{/* Mobile Menu Button */}
					<div className='md:hidden'>
						<button onClick={toggleMenu}>{isOpen ? <X size={24} /> : <Menu size={24} />}</button>
					</div>
				</div>
			</div>

			{/* Mobile Menu */}
			{isOpen && (
				<div className='md:hidden px-4 pb-3 space-y-2'>
					<a href='/' className='block hover:text-baseGreen'>
						Home
					</a>
					{/* <a href='/products' className='block hover:text-baseGreen'>
						Products
					</a>
					<a href='/about' className='block hover:text-baseGreen'>
						About
					</a>

					<a href='/contact' className='block hover:text-baseGreen'>
						Contact
					</a> */}
					<CartIcon />
					<SearchBar placeholder='Search...' />
					{/* <button className='w-full bg-baseGreen text-white px-4 py-2 rounded-lg'>Login</button> */}

					<AuthButton />
				</div>
			)}
		</nav>
	);
};

export default NavBar;
