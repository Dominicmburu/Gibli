// utility function to decode token
import { jwtDecode } from 'jwt-decode';

export const getUserRole = () => {
	const token =
		localStorage.getItem('token') ||
		localStorage.getItem('accessToken') ||
		localStorage.getItem('authToken') ||
		null;

	if (!token) return null;

	try {
		const decoded = jwtDecode(token);
		return decoded.role || null; // backend includes role in JWT payload
	} catch (err) {
		console.error('Invalid token:', err);
		return null;
	}
};
