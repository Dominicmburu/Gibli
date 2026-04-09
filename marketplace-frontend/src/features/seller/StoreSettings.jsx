import { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import SnoozeStore from './SnoozeStore';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const StoreSettings = () => {
	const [storeInfo, setStoreInfo] = useState(null);
	const [businessName, setBusinessName] = useState('');
	const [returnAddress, setReturnAddress] = useState('');
	const [saving, setSaving] = useState(false);
	const [loadingInfo, setLoadingInfo] = useState(true);

	useEffect(() => {
		const fetchInfo = async () => {
			try {
				const res = await api.get('/uploads/store-info');
				const data = res.data?.data;
				setStoreInfo(data);
				setBusinessName(data?.BusinessName || '');
				setReturnAddress(data?.ReturnAddress || '');
			} catch (err) {
				console.error('Failed to load store info:', err);
			} finally {
				setLoadingInfo(false);
			}
		};
		fetchInfo();
	}, []);

	const handleSaveProfile = async () => {
		if (!businessName.trim()) { toast.error('Business name is required.'); return; }
		setSaving(true);
		try {
			await api.patch('/uploads/store-info', { businessName: businessName.trim(), returnAddress: returnAddress.trim() });
			toast.success('Store profile saved.');
		} catch (err) {
			toast.error(err.response?.data?.error || 'Failed to save store profile.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />

				<div className='flex-1 p-6 overflow-y-auto'>
					<motion.main
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3 }}
						className='space-y-6'
					>
						{/* Page header */}
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>Store Settings</h1>
							<p className='text-sm text-gray-500'>
								Manage your store visibility, settings, and configurations.
							</p>
						</div>

						{/* Store Profile */}
						<section className='max-w-2xl bg-white rounded-2xl p-5 shadow-sm border border-gray-100'>
							<h3 className='text-lg font-semibold text-gray-800 mb-1'>Store Profile</h3>
							<p className='text-sm text-gray-500 mb-4'>
								Your store name and return address. The return address is shown to buyers when they need to send items back.
							</p>
							{loadingInfo ? (
								<div className='flex items-center gap-2 text-gray-400 text-sm'>
									<Loader2 size={16} className='animate-spin' /> Loading...
								</div>
							) : (
								<div className='space-y-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Store / Business Name <span className='text-red-500'>*</span>
										</label>
										<input
											type='text'
											value={businessName}
											onChange={(e) => setBusinessName(e.target.value)}
											placeholder='e.g. My Awesome Shop'
											className='w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400'
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>Return Address</label>
										<p className='text-xs text-gray-400 mb-1'>Full postal address where buyers should return items. Shown in approval instructions.</p>
										<textarea
											value={returnAddress}
											onChange={(e) => setReturnAddress(e.target.value)}
											placeholder={'e.g. 123 Main Street\nDublin, D01 AB12\nIreland'}
											rows={4}
											className='w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none'
										/>
									</div>
									<button
										onClick={handleSaveProfile}
										disabled={saving}
										className='flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50'
									>
										{saving && <Loader2 size={14} className='animate-spin' />}
										{saving ? 'Saving...' : 'Save Profile'}
									</button>
								</div>
							)}
						</section>

						{/* Snooze Store section */}
						<section className='max-w-2xl'>
							<SnoozeStore />
						</section>

						<section className='max-w-2xl bg-white rounded-2xl p-5 shadow-sm border border-gray-100'>
							<h3 className='text-lg font-semibold text-gray-800'>Permanently Close Store</h3>
							<p className='text-sm text-gray-500 mt-2 mb-4'>
								(Danger Zone) This action will delete your seller account permanently. If you wish to later
								restore your store after deletion, you will have to undergo the registration and
								verification steps.
							</p>
							<button
								className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm'
							>
								STOP SELLING
							</button>
						</section>
					</motion.main>
				</div>
			</div>
		</>
	);
};

export default StoreSettings;
