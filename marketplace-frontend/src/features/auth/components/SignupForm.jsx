import { useState } from 'react';
import api from '../../../api/axios';
import { Link, useNavigate } from 'react-router-dom';

const SignupForm = () => {
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate(); // React Router navigation hook

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		// Basic client-side validation
		if (!email || !username || !password || !confirmPassword) {
			setError('All fields are required.');
			return;
		}
		if (password !== confirmPassword) {
			setError('Passwords do not match.');
			return;
		}

		try {
			const response = await api.post('/users/register', {
				Email: email,
				Username: username,
				Password: password,
				ConfirmPassword: confirmPassword,
			});
			console.log('This is the response', response);
			setLoading(true);
			setSuccess(response.data.message || 'Registration successful!');
			setEmail('');
			setUsername('');
			setPassword('');
			setConfirmPassword('');
			navigate('/login');
		} catch (err) {
			console.log('error object', err);
			setError(err.response?.data?.message || 'Registration failed. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='bg-white-100 flex items-center justify-center min-h-screen'>
			<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
				<h4 className='text-2xl font-bold mb-6 text-center text-gray-800'>Register</h4>
				{error && <p style={{ color: 'red' }}>{error}</p>}
				{success && <p style={{ color: 'green' }}>{success}</p>}
				<form className='space-y-4' onSubmit={handleSubmit} noValidate>
					<label className='block text-sm font-medium text-gray-700' htmlFor='email'>
						Email
					</label>
					<input
						className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
						type='email'
						id='email'
						placeholder='Enter your email'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>

					<label className='block text-sm font-medium text-gray-700' htmlFor='username'>
						Username
					</label>
					<input
						className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
						type='text'
						id='username'
						placeholder='Choose a username'
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>

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
							minLength={6}
						/>
						<button type='button' className='absolute right-3 top-8 text-gray-500 text-sm'>
							Show
						</button>
					</div>
					<div className='relative'>
						<label className='block text-sm font-medium text-gray-700' htmlFor='confirmPassword'>
							Confirm Password
						</label>
						<input
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
							type='password'
							id='confirmPassword'
							placeholder='Confirm password'
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							minLength={6}
						/>
						<button type='button' className='absolute right-3 top-8 text-gray-500 text-sm'>
							Show
						</button>
					</div>

					<button
						className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md'
						type='submit'
						disabled={loading}
					>
						{loading ? 'Registering...' : 'Register'}
					</button>
				</form>
				<p className='text-sm text-center text-muted mt-4'>
					Already have an account?{' '}
					<Link className='text-blue-600 hover:underline font-semibold' to='/login'>
						Login here
					</Link>
				</p>
			</div>
		</div>
	);
};

export default SignupForm;
