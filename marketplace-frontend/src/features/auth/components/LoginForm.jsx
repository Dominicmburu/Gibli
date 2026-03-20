import { useState } from 'react';
import api from '../../../api/axios';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const LoginForm = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [verificationError, setVerificationError] = useState(false);
	const [userEmail, setUserEmail] = useState('');
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
				// Cookie is set by the server — notify useAuth to re-fetch /users/me
			window.dispatchEvent(new Event('auth-changed'));
			setSuccess(response.data.message || 'Login successful!');
			setEmail('');
			setPassword('');
			navigate('/');
		} catch (err) {
			setError(err.response?.data?.message || 'Login failed. Please try again.');
			//Login component's error handling that directs
			if (err.response?.status === 403) {
				toast.error(
					<div>
						Email not verified.{' '}
						<Link to='/resend-verification' className='underline font-bold'>
							Resend verification email
						</Link>
					</div>
				);
			}
			if (err.response?.status === 403 && err.response?.data?.message?.includes('verify your email')) {
				setVerificationError(true);
				// setUserEmail(email); // Store the email they tried to login with == disabled now because not necessary
			}
		}
	};

	return (
		<div className='bg-white-100 flex items-center justify-center min-h-screen'>
			<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
				<h4 className='text-2xl font-bold mb-6 text-center text-gray-800'>Login</h4>
				{error && <p className='text-red-600'>{error}</p>}
				{success && <p className='text-primary-500'>{success}</p>}

				<form className='space-y-4' onSubmit={handleSubmit} noValidate>
					<div>
						<label htmlFor='email' className='block text-sm font-medium text-gray-700'>
							Email
						</label>
						<input
							type='email'
							id='email'
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500'
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
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500'
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
						className='w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md'
					>
						Login
					</button>
					{verificationError && (
						<div className='mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl'>
							<div className='flex items-start'>
								<svg
									className='w-5 h-5 text-amber-500 mt-0.5 mr-3'
									fill='currentColor'
									viewBox='0 0 20 20'
								>
									<path
										fillRule='evenodd'
										d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
										clipRule='evenodd'
									/>
								</svg>
								<div className='flex-1'>
									<h3 className='text-sm font-semibold text-amber-800'>Email Not Verified</h3>
									<p className='text-sm text-amber-700 mt-1'>
										Check your inbox for the verification link. <br />
										Didn't get it?
									</p>
									<button
										onClick={
											() => navigate('/resend-verification')
											// navigate('/resend-verification', { state: { email: userEmail } })
										}
										className='mt-2 text-sm font-semibold text-amber-600 hover:text-amber-800 underline'
									>
										Resend verification email →
									</button>
								</div>
							</div>
						</div>
					)}
				</form>

				<p className='text-sm text-center mt-4'>
					<Link to='/forgot-password' className='text-primary-500 hover:underline font-semibold'>
						Forgot Password?
					</Link>
				</p>

				<p className='text-sm text-center mt-4'>
					Want to join us?{' '}
					<Link to='/signup' className='text-primary-500 hover:underline font-semibold'>
						Register here
					</Link>
				</p>
			</div>
		</div>
	);
};

export default LoginForm;
