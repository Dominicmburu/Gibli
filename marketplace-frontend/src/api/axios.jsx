import axios from 'axios';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Request Interceptor - Add token to every request
api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Response Interceptor - Handle 401 Unauthorized
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response && error.response.status === 401) {
			console.warn('Unauthorized! Redirecting to login...');
			localStorage.removeItem('token'); // Remove invalid token
			window.location.href = '/login'; // Redirect to login page
		}
		return Promise.reject(error);
	}
);

export default api;
