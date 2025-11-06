import { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../utils/useAuth';

const SnoozeStore = () => {
	const [isVerified, setIsVerified] = useState(false);
	const [loading, setLoading] = useState(false);
	const { userInfo, isLoggedIn, tokenExpired } = useAuth();

	// Wait until auth is ready
	useEffect(() => {
		if (!isLoggedIn || tokenExpired || !userInfo?.id) return;

		const fetchSeller = async () => {
			try {
				const res = await api.get(`/seller/${userInfo.id}`);
				setIsVerified(res.data?.IsVerified === 1);
			} catch (error) {
				console.error('Error fetching seller info:', error);
				toast.error('Failed to fetch store status.');
			}
		};

		fetchSeller();
	}, [userInfo, isLoggedIn, tokenExpired]);

	const toggleSnooze = async () => {
		if (!userInfo?.id) return;

		setLoading(true);
		try {
			const res = await api.patch(`/uploads/snooze/${userInfo.id}`);
			setIsVerified((prev) => !prev);
			toast.success(res.data.message || 'Store status updated successfully!');
		} catch (error) {
			console.error('Error toggling store:', error);
			toast.error('Could not update store status.');
		} finally {
			setLoading(false);
		}
	};

	// While waiting for userInfo or token
	if (!userInfo || !isLoggedIn) {
		return (
			<div className='bg-white p-5 rounded-2xl shadow-sm border text-center text-gray-500'>
				Loading store info...
			</div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className='flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border'
		>
			<div>
				<h3 className='text-lg font-semibold text-gray-800'>Snooze Store</h3>
				<p className='text-sm text-gray-500'>Toggle to temporarily pause your store visibility.</p>
			</div>

			<Switch
				checked={isVerified}
				onChange={toggleSnooze}
				className={`${
					isVerified ? 'bg-green-600' : 'bg-gray-300'
				} relative inline-flex h-6 w-12 items-center rounded-full transition`}
				disabled={loading}
			>
				<span
					className={`${
						isVerified ? 'translate-x-6' : 'translate-x-1'
					} inline-block h-4 w-4 transform rounded-full bg-white transition`}
				/>
			</Switch>
		</motion.div>
	);
};

export default SnoozeStore;
