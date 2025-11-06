import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ResetPassword = () => {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const location = useLocation();
	const navigate = useNavigate();

	// Extract token from query params
	const queryParams = new URLSearchParams(location.search);
	const token = queryParams.get('token');

	async function handleSubmit(e) {
		e.preventDefault();
		setError('');
		setSuccess('');

		// simple validation
		if (password !== confirmPassword) {
			setError('Passwords do not match');
			toast.error('Passwords dont match');
			return;
		}
		if (!token) {
			setError('Invalid or expired reset link');
			toast.error('Invalid or expired reset link');
			return;
		}

		try {
			setLoading(true);
			const res = await fetch('users/reset-password', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ token, newPassword: password }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.message || 'Something went wrong');
			} else {
				setSuccess('Password reset successful! Redirecting to login...');
				setTimeout(() => navigate('/login'), 2000); // redirect after success
			}
		} catch (err) {
			setError('Server error, please try again later');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className='bg-white-100 flex items-center justify-center min-h-screen'>
			<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
				<h4 className='text-2xl font-bold mb-6 text-center text-gray-800'>Reset Password</h4>

				{error && <p className='text-red-600 text-sm mb-4'>{error}</p>}
				{success && <p className='text-green-600 text-sm mb-4'>{success}</p>}

				<form className='space-y-4' onSubmit={handleSubmit} noValidate>
					<div className='relative'>
						<label className='block text-sm font-medium text-gray-700' htmlFor='password'>
							New Password
						</label>
						<input
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
							type='password'
							id='password'
							placeholder='Enter new password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
						/>
					</div>
					<div className='relative'>
						<label className='block text-sm font-medium text-gray-700' htmlFor='confirmPassword'>
							Confirm Password
						</label>
						<input
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
							type='password'
							id='confirmPassword'
							placeholder='Confirm new password'
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							minLength={6}
						/>
					</div>

					<button
						className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md disabled:opacity-50'
						type='submit'
						disabled={loading}
					>
						{loading ? 'Resetting...' : 'Reset Password'}
					</button>
				</form>
			</div>
		</div>
	);
};

export default ResetPassword;
