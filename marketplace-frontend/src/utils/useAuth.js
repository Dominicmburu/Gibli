import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

/**
 * Custom hook to manage and decode JWT tokens.
 * Provides live authentication state for components.
 */
export const useAuth = () => {
	const [auth, setAuth] = useState({
		isLoggedIn: false,
		tokenExpired: false,
		userInfo: null,
	});

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (!token) {
			setAuth({
				isLoggedIn: false,
				tokenExpired: false,
				userInfo: null,
			});
			return;
		}

		try {
			const decoded = jwtDecode(token);
			const expired = decoded.exp * 1000 < Date.now();

			setAuth({
				isLoggedIn: !expired,
				tokenExpired: expired,
				userInfo: expired
					? null
					: {
							id: decoded.id,
							name: decoded.name || decoded.username || 'User',
							email: decoded.email || null,
							role: decoded.role || null,
					  },
			});
		} catch (err) {
			console.error('Invalid token:', err);
			localStorage.removeItem('token');
			setAuth({
				isLoggedIn: false,
				tokenExpired: true,
				userInfo: null,
			});
		}
	}, []);

	// Optional: expose a logout function
	const logout = () => {
		localStorage.removeItem('token');
		setAuth({
			isLoggedIn: false,
			tokenExpired: false,
			userInfo: null,
		});
	};

	return { ...auth, logout };
};
