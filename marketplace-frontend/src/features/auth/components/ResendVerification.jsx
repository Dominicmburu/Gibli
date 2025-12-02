import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

const ResendVerification = () => {
	const [email, setEmail] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Basic client-side validation
		if (!email) {
			toast.error('Email is required');
			return;
		}

		setIsLoading(true);

		try {
			const response = await api.post('/users/resend-verification', {
				Email: email,
			});

			toast.success(response.data.message || `Verification email sent! Check your inbox at ${email}`);

			setEmail('');
		} catch (err) {
			console.error('Resend verification error:', err);

			// Handle specific error cases
			if (err.response?.status === 400) {
				const message = err.response?.data?.message;

				if (message === 'Email already verified') {
					toast.success('Your email is already verified! You can log in now.');
				} else if (message === 'Email not found') {
					// For security, show generic message
					toast.error('If an account exists, a verification email will be sent.');
				} else {
					toast.error(message || 'Unable to resend verification email.');
				}
			} else if (err.response?.data?.errors) {
				toast.error(err.response.data.errors[0]);
			} else {
				toast.error('Something went wrong. Please try again.');
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='bg-white-100 flex items-center justify-center min-h-screen'>
			<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
				<div className='text-center mb-6'>
					<div className='inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4'>
						<svg className='w-8 h-8 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
							/>
						</svg>
					</div>
					<h4 className='text-2xl font-bold text-gray-800'>Resend Verification Email</h4>
					<p className='text-sm text-gray-600 mt-2'>Enter your email to receive a new verification link</p>
				</div>

				<form className='space-y-4' onSubmit={handleSubmit} noValidate>
					<div>
						<label className='block text-sm font-medium text-gray-700' htmlFor='email'>
							Email Address
						</label>
						<input
							type='email'
							id='email'
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='your.email@example.com'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={isLoading}
							required
						/>
					</div>

					<button
						className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors'
						type='submit'
						disabled={isLoading}
					>
						{isLoading ? (
							<span className='flex items-center justify-center'>
								<svg
									className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
									xmlns='http://www.w3.org/2000/svg'
									fill='none'
									viewBox='0 0 24 24'
								>
									<circle
										className='opacity-25'
										cx='12'
										cy='12'
										r='10'
										stroke='currentColor'
										strokeWidth='4'
									></circle>
									<path
										className='opacity-75'
										fill='currentColor'
										d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
									></path>
								</svg>
								Sending...
							</span>
						) : (
							'Send Verification Email'
						)}
					</button>
				</form>

				<div className='mt-6 text-center space-y-2'>
					<p className='text-sm text-gray-600'>
						Already verified?{' '}
						<Link className='text-blue-600 hover:underline font-semibold' to='/login'>
							Log in
						</Link>
					</p>
					<p className='text-sm text-gray-600'>
						Need an account?{' '}
						<Link className='text-blue-600 hover:underline font-semibold' to='/signup'>
							Sign up
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default ResendVerification;
