// src/pages/seller/StoreSettings.jsx
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import SnoozeStore from './SnoozeStore';
import { motion } from 'framer-motion';

const StoreSettings = () => {
	return (
		<div className='min-h-screen flex bg-gray-50'>
			{/* Sidebar */}
			<SellerSidebar />

			{/* Main content */}
			<div className='flex-1 flex flex-col'>
				{/* Top navigation */}
				<NavBar />

				{/* Page content */}
				<motion.main
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3 }}
					className='p-6 space-y-6'
				>
					{/* Page header */}
					<div>
						<h1 className='text-2xl font-semibold text-gray-800'>Store Settings</h1>
						<p className='text-sm text-gray-500'>
							Manage your store visibility, settings, and configurations.
						</p>
					</div>

					{/* Snooze Store section */}
					<section className='max-w-2xl'>
						<SnoozeStore />
					</section>

					{/* Placeholder for future settings */}
					{/* <section className='max-w-2xl bg-white rounded-2xl p-5 shadow-sm border'>
						<h3 className='text-lg font-semibold text-gray-800'>Payment Settings</h3>
						<p className='text-sm text-gray-500'>
							(Coming soon) Configure your preferred payment options and payout details.
						</p>
					</section> */}
					<section className='max-w-2xl bg-white rounded-2xl p-5 shadow-sm border'>
						<h3 className='text-lg font-semibold text-gray-800'>Permanently Close Store</h3>
						<br />
						<p className='text-sm text-gray-500'>
							(Danger Zone) This action will delete your seller account permanently. If you wish to later
							restore your store after deletion, you will have to undergo the registration and
							verification steps
						</p>
						<br />
						<button
							// onClick={placeholder}
							className='bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700'
						>
							STOP SELLING.
						</button>
					</section>
				</motion.main>
			</div>
		</div>
	);
};

export default StoreSettings;
