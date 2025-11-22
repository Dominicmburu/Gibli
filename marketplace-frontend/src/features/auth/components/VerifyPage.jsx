import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function VerifyPage() {
	const { token } = useParams();
	const [message, setMessage] = useState('Verifying...');

	useEffect(() => {
		const verify = async () => {
			try {
				const res = await api.get(`${import.meta.env.VITE_API_BASE_URL}/users/verify-email/${token}`);
				setMessage(res.data || 'Email verified successfully!');
				toast.success('Email verified successfully! You can now log in.');
			} catch (err) {
				toast.error('Verification failed. Link may have expired.');
				setMessage('Invalid or expired verification link.');
			}
		};
		verify();
	}, [token]);

	return (
		<div className='flex flex-col justify-center items-center h-screen'>
			<h2 className='text-2xl font-semibold'>{message}</h2>
		</div>
	);
}
