import { useState } from 'react';
import api from '../../../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { storageService } from '../../../services/localStorageService';

const LoginForm = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		if (!email || !password) {
			setError('All fields are required.');
			return;
		}

		try {
			const response = await api.post('/users/login', {
				Email: email,
				Password: password,
			});
			storageService.set('token', response.data.token);
			setSuccess(response.data.message || 'Login successful!');
			setEmail('');
			setPassword('');
			navigate('/');
		} catch (err) {
			setError(err.response?.data?.message || 'Login failed. Please try again.');
		}
	};

	return (
		<div className='bg-white-100 flex items-center justify-center min-h-screen'>
			<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
				<h4 className='text-2xl font-bold mb-6 text-center text-gray-800'>Login</h4>
				{error && <p className='text-red-600'>{error}</p>}
				{success && <p className='text-green-600'>{success}</p>}

				<form className='space-y-4' onSubmit={handleSubmit} noValidate>
					<div>
						<label htmlFor='email' className='block text-sm font-medium text-gray-700'>
							Email
						</label>
						<input
							type='email'
							id='email'
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='Enter your email'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>

					<div className='relative'>
						<label htmlFor='password' className='block text-sm font-medium text-gray-700'>
							Password
						</label>
						<input
							type={showPassword ? 'text' : 'password'}
							id='password'
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='Enter password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
						<button
							type='button'
							onClick={() => setShowPassword((prev) => !prev)}
							className='absolute right-3 top-8 text-gray-500 text-sm'
						>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</div>

					<button
						type='submit'
						className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md'
					>
						Login
					</button>
				</form>

				<p className='text-sm text-center mt-4'>
					<Link to='/forgot-password' className='text-blue-600 hover:underline font-semibold'>
						Forgot Password?
					</Link>
				</p>

				<p className='text-sm text-center mt-4'>
					Want to join us?{' '}
					<Link to='/signup' className='text-blue-600 hover:underline font-semibold'>
						Register here
					</Link>
				</p>
			</div>
		</div>
	);
};

export default LoginForm;
