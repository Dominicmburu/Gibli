import axios from 'axios';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL,
	withCredentials: true, // send HttpOnly cookie on every request
	headers: {
		'Content-Type': 'application/json',
	},
});

// Response Interceptor - Handle 401 Unauthorized
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			const url = error.config?.url || '';
			// /users/me returning 401 is EXPECTED when logged out — do NOT dispatch
			// or redirect, or we get an infinite loop (useAuth calls /users/me → 401
			// → auth-changed → useAuth calls /users/me → 401 → ...).
			// For all other endpoints, dispatch so useAuth updates its state immediately.
			if (!url.includes('/users/me')) {
				window.dispatchEvent(new Event('auth-changed'));
			}
		}
		return Promise.reject(error);
	}
);

export default api;
