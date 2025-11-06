import { useState } from 'react';
import api from '../../../api/axios';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/NavBar';
import toast from 'react-hot-toast';

const SellerRegistration = () => {
	const [businessNumber, setBusinessNumber] = useState('');
	const [businessName, setBusinessName] = useState('');
	const [country, setCountry] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();

	const getStoredToken = () =>
		localStorage.getItem('token') ||
		localStorage.getItem('accessToken') ||
		localStorage.getItem('authToken') ||
		null;

	const clearStoredToken = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('accessToken');
		localStorage.removeItem('authToken');
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		if (!businessNumber || !businessName || !country) {
			setError('All fields are required.');
			toast.error('All fields are required.');
			return;
		}

		const token = getStoredToken();
		if (!token) {
			setError('You must be logged in to register as a seller. Redirecting to login...');
			toast.error('You must be logged in to register as a seller. Redirecting to login...');
			navigate('/login');
			return;
		}

		try {
			setLoading(true);

			const response = await api.post(
				'/users/register-seller',
				{
					BusinessNumber: businessNumber,
					BusinessName: businessName,
					Country: country,
				},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			// Step 1: Show success message
			setSuccess(response.data?.message || 'Seller registration successful!');
			toast.success(response.data?.message || 'Seller registration successful!');

			// Step 2: Clear stale token
			clearStoredToken();

			// Step 3: Communicate re-login
			setTimeout(() => {
				toast.success('Registration successful! Please log in again to access your seller account.');

				// Step 4: Redirect to login page
				navigate('/login');
			}, 1500);
			toast.success('Registration successful! Please log in again to access your seller account.');

			// Reset form
			setBusinessNumber('');
			setBusinessName('');
			setCountry('');
		} catch (err) {
			console.error('Seller registration error:', err);
			setError(err.response?.data?.message || 'Seller registration failed. Please try again.');
			toast.error(err.response?.data?.message || 'Seller registration failed. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<NavBar />
			<div className='bg-gray-50 flex items-center justify-center min-h-screen px-4'>
				<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
					<h4 className='text-2xl font-bold mb-6 text-center text-gray-800'>Become a Seller</h4>

					{error && <p className='text-red-600 mb-3'>{error}</p>}
					{success && <p className='text-green-600 mb-3'>{success}</p>}

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
								className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600'
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
								className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600'
							/>
						</div>

						<div>
							<label className='block text-sm font-medium text-gray-700' htmlFor='country'>
								Country
							</label>
							<input
								id='country'
								type='text'
								placeholder='Country Business/Store is Located In'
								value={country}
								onChange={(e) => setCountry(e.target.value)}
								required
								className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600'
							/>
						</div>

						<button
							type='submit'
							disabled={loading}
							className='w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2 px-4 rounded-xl shadow-md'
						>
							{loading ? 'Registering Seller...' : 'Register Seller Account'}
						</button>
					</form>
				</div>
			</div>
		</>
	);
};

export default SellerRegistration;
