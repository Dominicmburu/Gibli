import { useState } from 'react';
import api from '../../../api/axios';
import { Link, useNavigate } from 'react-router-dom';

const SignupForm = () => {
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		if (!email || !username || !password || !confirmPassword) {
			setError('All fields are required.');
			return;
		}
		if (password !== confirmPassword) {
			setError('Passwords do not match.');
			return;
		}

		try {
			setLoading(true);
			const response = await api.post('/users/register', {
				Email: email,
				Username: username,
				Password: password,
				ConfirmPassword: confirmPassword,
			});
			setSuccess(response.data.message || 'Registration successful!');
			setEmail('');
			setUsername('');
			setPassword('');
			setConfirmPassword('');
			navigate('/login');
		} catch (err) {
			setError(err.response?.data?.message || 'Registration failed. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='bg-white-100 flex items-center justify-center min-h-screen'>
			<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
				<h4 className='text-2xl font-bold mb-6 text-center text-gray-800'>Register</h4>
				{error && <p className='text-red-600'>{error}</p>}
				{success && <p className='text-green-600'>{success}</p>}

				<form className='space-y-4' onSubmit={handleSubmit} noValidate>
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

					<label htmlFor='username' className='block text-sm font-medium text-gray-700'>
						Username
					</label>
					<input
						type='text'
						id='username'
						className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500'
						placeholder='Choose a username'
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>

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
							minLength={6}
						/>
						<button
							type='button'
							onClick={() => setShowPassword((prev) => !prev)}
							className='absolute right-3 top-8 text-gray-500 text-sm'
						>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</div>

					<div className='relative'>
						<label htmlFor='confirmPassword' className='block text-sm font-medium text-gray-700'>
							Confirm Password
						</label>
						<input
							type={showConfirmPassword ? 'text' : 'password'}
							id='confirmPassword'
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='Confirm password'
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							minLength={6}
						/>
						<button
							type='button'
							onClick={() => setShowConfirmPassword((prev) => !prev)}
							className='absolute right-3 top-8 text-gray-500 text-sm'
						>
							{showConfirmPassword ? 'Hide' : 'Show'}
						</button>
					</div>

					<button
						type='submit'
						className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md'
						disabled={loading}
					>
						{loading ? 'Registering...' : 'Register'}
					</button>
				</form>

				<p className='text-sm text-center mt-4'>
					Already have an account?{' '}
					<Link to='/login' className='text-blue-600 hover:underline font-semibold'>
						Login here
					</Link>
				</p>
			</div>
		</div>
	);
};

export default SignupForm;
