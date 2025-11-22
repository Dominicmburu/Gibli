import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function ResendVerification() {
	const [email, setEmail] = useState('');

	const handleResend = async (e) => {
		e.preventDefault();
		try {
			await api.post(`${import.meta.env.VITE_API_BASE_URL}/users/resend-verification`, { Email: email });
			toast.success('Verification email resent successfully!');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Error resending verification');
		}
	};

	return (
		<div className='flex flex-col items-center justify-center min-h-screen'>
			<form onSubmit={handleResend} className='space-y-4'>
				<input
					type='email'
					placeholder='Enter your email'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className='border p-2 rounded w-64'
				/>
				<button type='submit' className='bg-blue-600 text-white p-2 rounded'>
					Resend Verification
				</button>
			</form>
		</div>
	);
}
