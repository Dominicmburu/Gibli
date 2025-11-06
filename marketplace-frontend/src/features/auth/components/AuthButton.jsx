import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../utils/useAuth';

const AuthButton = () => {
	const navigate = useNavigate();
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const { tokenExpired } = useAuth();
	// Check token presence on mount
	useEffect(() => {
		const token = localStorage.getItem('token');
		setIsLoggedIn(!!token);
	}, []);
	// console.log('isLoggedIn', isLoggedIn);
	const handleClick = () => {
		if (isLoggedIn) {
			// Logout: remove token and redirect
			localStorage.removeItem('token');
			setIsLoggedIn(false);
			navigate('/login');
		} else {
			// Login: redirect to login page
			navigate('/login');
		}
	};

	return (
		<button
			onClick={handleClick}
			className='bg-amber-500 text-green px-4 py-2 rounded-lg hover:bg-amber-700 transition'
		>
			{isLoggedIn && !tokenExpired ? 'Logout' : 'Login'}
		</button>
	);
};

export default AuthButton;
