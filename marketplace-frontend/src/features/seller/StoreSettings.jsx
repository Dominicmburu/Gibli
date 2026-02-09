import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import SnoozeStore from './SnoozeStore';
import { motion } from 'framer-motion';

const StoreSettings = () => {
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
