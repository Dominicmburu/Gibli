import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Store, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const RoleSelectionModal = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);

	const handleChoice = async (role) => {
		setLoading(true);
		try {
			await api.post('/users/complete-onboarding');
			// Cookie is updated server-side — notify useAuth to re-fetch /users/me
			window.dispatchEvent(new Event('auth-changed'));

			if (role === 'seller') {
				navigate('/seller/register');
			} else {
				navigate('/');
			}
		} catch (err) {
			console.error('complete-onboarding failed:', err);
			toast.error('Something went wrong. Please try again.');
			setLoading(false);
		}
	};

	return (
		<div className='fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center px-4'>
			<div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8'>
				{/* Header */}
				<div className='text-center mb-8'>
					<h1 className='text-3xl font-extrabold text-gray-900'>Welcome to GibLi!</h1>
					<p className='text-gray-500 mt-2 text-base'>
						How would you like to use the platform?
					</p>
				</div>

				{/* Two choice cards */}
				<div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
					{/* Buyer */}
					<button
						onClick={() => handleChoice('buyer')}
						disabled={loading}
						className='flex flex-col items-center gap-4 border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 rounded-2xl p-8 transition-all group disabled:opacity-60 text-left'
					>
						<div className='w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-primary-100 transition-colors'>
							<ShoppingBag className='w-8 h-8 text-blue-600 group-hover:text-primary-600' />
						</div>
						<div className='text-center'>
							<h2 className='text-xl font-bold text-gray-900'>I want to Shop</h2>
							<p className='text-gray-500 text-sm mt-1'>
								Browse &amp; buy products from sellers
							</p>
						</div>
						<span className='mt-1 w-full text-center bg-blue-600 group-hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm'>
							Continue as Buyer
						</span>
					</button>

					{/* Seller */}
					<button
						onClick={() => handleChoice('seller')}
						disabled={loading}
						className='flex flex-col items-center gap-4 border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-2xl p-8 transition-all group disabled:opacity-60 text-left'
					>
						<div className='w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:bg-green-200 transition-colors'>
							<Store className='w-8 h-8 text-green-600' />
						</div>
						<div className='text-center'>
							<h2 className='text-xl font-bold text-gray-900'>I want to Sell</h2>
							<p className='text-gray-500 text-sm mt-1'>
								List your products &amp; grow your business
							</p>
						</div>
						<span className='mt-1 w-full text-center bg-green-600 group-hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm'>
							Start Selling
						</span>
					</button>
				</div>

				{/* Role switch note */}
				<p className='text-center text-sm text-gray-400 mt-6'>
					Not sure yet? Don&apos;t worry — you can always switch roles later from your <strong className='text-gray-500'>Profile</strong> tab.
				</p>

				{/* Loading spinner */}
				{loading && (
					<div className='flex justify-center mt-4'>
						<Loader2 className='animate-spin text-gray-400' size={24} />
					</div>
				)}
			</div>
		</div>
	);
};

export default RoleSelectionModal;
