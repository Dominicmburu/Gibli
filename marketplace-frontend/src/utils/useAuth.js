import { useState, useEffect } from 'react';
import api from '../api/axios';

/**
 * Custom hook for authentication state.
 * Calls GET /users/me (reads the HttpOnly cookie server-side) so the token
 * never touches JavaScript. Listens for 'auth-changed' window events so any
 * component can trigger a re-fetch without a page reload.
 */
export const useAuth = () => {
	const [auth, setAuth] = useState({
		isLoggedIn: false,
		tokenExpired: false,
		userInfo: null,
		hasSelectedRole: true, // default true prevents modal flash while resolving
		loading: true,
	});

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const res = await api.get('/users/me');
				const u = res.data.user;
				setAuth({
					isLoggedIn: true,
					tokenExpired: false,
					loading: false,
					userInfo: {
						id: u.id,
						name: u.username || u.name || 'User',
						email: u.email || null,
						role: u.role || null,
					},
					// ?? true handles tokens issued before the HasSelectedRole migration
					hasSelectedRole: u.hasSelectedRole ?? true,
				});
			} catch {
				setAuth({ isLoggedIn: false, tokenExpired: false, userInfo: null, hasSelectedRole: true, loading: false });
			}
		};

		fetchUser();

		// Re-fetch whenever auth state changes (login, logout, onboarding)
		window.addEventListener('auth-changed', fetchUser);
		return () => window.removeEventListener('auth-changed', fetchUser);
	}, []);

	const logout = async () => {
		try { await api.post('/users/logout'); } catch { /* ignore */ }
		setAuth({ isLoggedIn: false, tokenExpired: false, userInfo: null, hasSelectedRole: true, loading: false });
	};

	return { ...auth, logout };
};
