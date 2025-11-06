import { useState } from 'react';
import api from '../../../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
	const [email, setEmail] = useState('');

	const navigate = useNavigate(); // React Router navigation hook

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Basic client-side validation
		if (!email) {
			console.log('Empty email');
			toast.error('Your Email is required');
			return;
		}

		try {
			const response = await api.post('/users/forgot-password', {
				Email: email,
			});
			console.log('This is the response', response);
			toast.success(response.data.message || 'you will receive a reset link.');

			setEmail('');
			// navigate('/');
		} catch (err) {
			console.log('This is the error object', err);
			if (err.response?.data?.errors) {
				return toast.error(err.response?.data?.errors[0]);
			}
			toast.error(err.response?.data?.message || 'Reset failed. Please try again.');
		}
	};

	return (
		<div className='bg-white-100 flex items-center justify-center min-h-screen'>
			<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
				<h4 className='text-2xl font-bold mb-6 text-center text-gray-800'>Forgot Password</h4>

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

					<button
						className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md'
						type='submit'
					>
						Send Reset Link
					</button>
				</form>
				<p className='text-sm text-center text-muted mt-4'>
					<Link className='text-blue-600 hover:underline font-semibold' to='/login'>
						Back To Login
					</Link>
				</p>
			</div>
		</div>
	);
};
export default ForgotPassword;
