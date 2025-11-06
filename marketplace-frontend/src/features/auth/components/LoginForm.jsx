import { useState } from 'react';
import api from '../../../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { storageService } from '../../../services/localStorageService';

const LoginForm = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const navigate = useNavigate(); // React Router navigation hook

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		// Basic client-side validation
		if (!email || !password) {
			setError('All fields are required.');
			return;
		}

		try {
			const response = await api.post('/users/login', {
				Email: email,
				Password: password,
			});
			console.log('This is the response', response);

			setSuccess(response.data.message || 'Login successful!');
			storageService.set('token', response.data.token);
			setEmail('');
			setPassword('');
			navigate('/');
		} catch (err) {
			console.log('error object', err);
			setError(err.response?.data?.message || 'Login failed. Please try again.');
		}
	};

	return (
		<div className='bg-white-100 flex items-center justify-center min-h-screen'>
			<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
				<h4 className='text-2xl font-bold mb-6 text-center text-gray-800'>Login</h4>
				{error && <p style={{ color: 'red' }}>{error}</p>}
				{success && <p style={{ color: 'green' }}>{success}</p>}
				<form className='space-y-4' onSubmit={handleSubmit} noValidate>
					<div>
						<label className='block text-sm font-medium text-gray-700' htmlFor='email'>
							Email
						</label>
						<input
							type='email'
							id='email'
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='Enter your email'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>

					<div className='relative'>
						<label className='block text-sm font-medium text-gray-700' htmlFor='password'>
							Password
						</label>
						<input
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
							type='password'
							id='password'
							placeholder='Enter password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>{' '}
						<button type='button' className='absolute right-3 top-8 text-gray-500 text-sm'>
							Show
						</button>
					</div>

					<button
						className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md'
						type='submit'
					>
						Login
					</button>
				</form>
				<p className='text-sm text-center text-muted mt-4'>
					<Link className='text-blue-600 hover:underline font-semibold' to='/forgot-password'>
						Forgot Password?
					</Link>
				</p>
				<p className='text-sm text-center text-muted mt-4'>
					Want to join us?{' '}
					<Link className='text-blue-600 hover:underline font-semibold' to='/signup'>
						Register here
					</Link>
				</p>
			</div>
		</div>
	);
};
export default LoginForm;
