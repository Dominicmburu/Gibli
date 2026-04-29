import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [auth, setAuth] = useState({
		isLoggedIn:      false,
		tokenExpired:    false,
		userInfo:        null,
		hasSelectedRole: true, // default true prevents modal flash while resolving
		loading:         true,
	});

	const fetchUser = useCallback(async () => {
		try {
			const res = await api.get('/users/me');
			const u   = res.data.user;
			setAuth({
				isLoggedIn:      true,
				tokenExpired:    false,
				loading:         false,
				userInfo: {
					id:    u.id,
					name:  u.username || u.name || 'User',
					email: u.email  || null,
					role:  u.role   || null,
				},
				// ?? true handles tokens issued before the HasSelectedRole migration
				hasSelectedRole: u.hasSelectedRole ?? true,
			});
		} catch {
			setAuth({ isLoggedIn: false, tokenExpired: false, userInfo: null, hasSelectedRole: true, loading: false });
		}
	}, []);

	useEffect(() => {
		fetchUser();
		window.addEventListener('auth-changed', fetchUser);
		return () => window.removeEventListener('auth-changed', fetchUser);
	}, [fetchUser]);

	const logout = async () => {
		try { await api.post('/users/logout'); } catch { /* ignore */ }
		setAuth({ isLoggedIn: false, tokenExpired: false, userInfo: null, hasSelectedRole: true, loading: false });
		window.dispatchEvent(new Event('auth-changed'));
	};

	return (
		<AuthContext.Provider value={{ ...auth, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export default AuthContext;
