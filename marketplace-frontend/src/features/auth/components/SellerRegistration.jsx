import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/NavBar';
import toast from 'react-hot-toast';
import { useAuth } from '../../../utils/useAuth';
import { Globe } from 'lucide-react';
import { EU_UK_COUNTRIES } from '../../../utils/euCountries';

const SellerRegistration = () => {
	const [businessNumber, setBusinessNumber] = useState('');
	const [businessName, setBusinessName] = useState('');
	const [country, setCountry] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();
	const { userInfo, loading: authLoading } = useAuth();

	// If user is already a registered seller, redirect them to plan selection
	useEffect(() => {
		if (!authLoading && userInfo?.role === 'Seller') {
			navigate('/onboarding/seller-plans', { replace: true });
		}
	}, [authLoading, userInfo, navigate]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		if (!businessNumber || !businessName || !country) {
			setError('All fields are required.');
			toast.error('All fields are required.');
			return;
		}

		try {
			setLoading(true);

			const response = await api.post('/users/register-seller', {
				BusinessNumber: businessNumber,
				BusinessName: businessName,
				Country: country,
			});

			toast.success(response.data?.message || 'Seller registration successful!');

			// Cookie is updated server-side with Seller role — notify useAuth
			window.dispatchEvent(new Event('auth-changed'));

			// Details saved — now proceed to plan selection (payment is the last step)
			navigate('/onboarding/seller-plans');
		} catch (err) {
			console.error('Seller registration error:', err);
			const msg = err.response?.data?.message || 'Seller registration failed. Please try again.';
			setError(msg);
			toast.error(msg);
		} finally {
			setLoading(false);
		}
	};

	// Don't render the form while checking auth (avoids flash before redirect)
	if (authLoading || userInfo?.role === 'Seller') return null;

	return (
		<>
			<NavBar />
			<div className='bg-gray-50 flex items-center justify-center min-h-screen px-4'>
				<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
					<h4 className='text-2xl font-bold mb-4 text-center text-gray-800'>Become a Seller</h4>

					{/* European businesses only notice */}
					<div className='bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3'>
						<Globe size={18} className='text-blue-600 flex-shrink-0 mt-0.5' />
						<div>
							<p className='text-sm font-semibold text-blue-900'>European Businesses Only</p>
							<p className='text-sm text-blue-700 mt-0.5'>
								GibLi is currently available exclusively for businesses registered in Europe. A valid VAT number is required to sell on our platform.
							</p>
						</div>
					</div>

					{error && <p className='text-red-600 mb-3 text-sm'>{error}</p>}

					<form className='space-y-4' onSubmit={handleSubmit} noValidate>
						<div>
							<label className='block text-sm font-medium text-gray-700' htmlFor='businessNumber'>
								VAT Id Number
							</label>
							<input
								id='businessNumber'
								type='text'
								placeholder='VAT Id Number'
								value={businessNumber}
								onChange={(e) => setBusinessNumber(e.target.value)}
								required
								className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
							/>
						</div>

						<div>
							<label className='block text-sm font-medium text-gray-700' htmlFor='businessName'>
								Business Name
							</label>
							<input
								id='businessName'
								type='text'
								placeholder='Store/Business Name'
								value={businessName}
								onChange={(e) => setBusinessName(e.target.value)}
								required
								className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
							/>
						</div>

						<div>
							<label className='block text-sm font-medium text-gray-700' htmlFor='country'>
								Country
							</label>
							<select
								id='country'
								value={country}
								onChange={(e) => setCountry(e.target.value)}
								required
								className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white'
							>
								<option value=''>Select country...</option>
								{EU_UK_COUNTRIES.map((c) => (
									<option key={c} value={c}>{c}</option>
								))}
							</select>
						</div>

						<button
							type='submit'
							disabled={loading}
							className='w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md disabled:opacity-60'
						>
							{loading ? 'Saving Details...' : 'Continue to Plan Selection'}
						</button>
					</form>
				</div>
			</div>
		</>
	);
};

export default SellerRegistration;
