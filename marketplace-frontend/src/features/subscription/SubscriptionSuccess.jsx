import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import NavBar from '../../components/NavBar';
import api from '../../api/axios';

const SubscriptionSuccess = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const [subscription, setSubscription] = useState(null);
	const [isSeller, setIsSeller] = useState(true); // default true to avoid flash of wrong state
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const sessionId = searchParams.get('session_id');

		const activate = async () => {
			try {
				if (sessionId) {
					// Primary path: activate via Stripe session_id — does not depend on webhooks
					const res = await api.post('/subscriptions/activate-session', { sessionId });
					setSubscription(res.data.subscription);
					setIsSeller(res.data.isSeller);
				} else {
					// Fallback: no session_id in URL — just fetch current subscription
					const res = await api.get('/subscriptions/my-subscription');
					setSubscription(res.data);
				}
			} catch (err) {
				console.error('Subscription activation error:', err);
				setError(
					'Your payment was received but we could not confirm the subscription details. Please check your dashboard or contact support.'
				);
			} finally {
				setLoading(false);
			}
		};

		activate();
	}, []);

	const formatDate = (dateStr) => {
		if (!dateStr) return null;
		return new Date(dateStr).toLocaleDateString('en-GB', {
			day: 'numeric', month: 'long', year: 'numeric',
		});
	};

	return (
		<>
			<NavBar />
			<div className='min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16'>
				<div className='bg-white rounded-2xl shadow-md border border-gray-100 max-w-md w-full p-8 text-center'>

					{loading ? (
						<div className='py-8'>
							<Loader2 className='animate-spin text-gray-400 mx-auto mb-4' size={40} />
							<p className='text-gray-500 font-medium'>Confirming your subscription...</p>
							<p className='text-gray-400 text-sm mt-1'>This will only take a moment.</p>
						</div>

					) : error ? (
						<>
							<div className='w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6'>
								<AlertCircle size={44} className='text-yellow-500' />
							</div>
							<h1 className='text-xl font-bold text-gray-900 mb-3'>Payment received</h1>
							<p className='text-gray-500 text-sm mb-6'>{error}</p>
							<button
								onClick={() => navigate('/')}
								className='w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition'
							>
								Go to Home
							</button>
						</>

					) : (
						<>
							{/* Success icon */}
							<div className='w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6'>
								<CheckCircle size={44} className='text-green-500' />
							</div>

							<h1 className='text-2xl font-extrabold text-gray-900 mb-2'>
								Subscription Activated!
							</h1>
							<p className='text-gray-500 mb-6'>
								Your payment was successful and your plan is now active. A confirmation
								email has been sent to you.
							</p>

							{/* Plan details card */}
							{subscription && subscription.PlanCode !== 'free' && (
								<div className='bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6 text-left'>
									<p className='text-sm text-purple-800'>
										<span className='font-semibold'>Plan:</span> {subscription.PlanName}
									</p>
									<p className='text-sm text-purple-800 mt-1'>
										<span className='font-semibold'>Commission:</span>{' '}
										{(Number(subscription.CommissionRate) * 100).toFixed(0)}% per sale
									</p>
									{subscription.CurrentPeriodEnd && (
										<p className='text-sm text-purple-800 mt-1'>
											<span className='font-semibold'>Next renewal:</span>{' '}
											{formatDate(subscription.CurrentPeriodEnd)}
										</p>
									)}
								</div>
							)}

							{/* Next step — determined by real seller status from the API, not JWT */}
							{!isSeller ? (
								<>
									<div className='bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 text-left'>
										<p className='text-sm text-blue-800 font-semibold mb-1'>
											One more step!
										</p>
										<p className='text-sm text-blue-700'>
											Your plan is ready. Now create your seller account to start
											listing products. Your subscription will be applied automatically.
										</p>
									</div>
									<button
										onClick={() => navigate('/seller/register')}
										className='w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition'
									>
										Create Your Seller Account
									</button>
									<p className='text-xs text-gray-400 mt-3'>
										You can also complete this later — a reminder will appear in the top bar when you log in.
									</p>
								</>
							) : (
								<>
									<button
										onClick={() => navigate('/seller-dashboard')}
										className='w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition'
									>
										Go to Dashboard
									</button>
									<button
										onClick={() => navigate('/seller-subscription')}
										className='w-full mt-3 text-gray-500 hover:text-gray-700 text-sm font-medium py-2 transition'
									>
										View subscription details
									</button>
								</>
							)}
						</>
					)}

				</div>
			</div>
		</>
	);
};

export default SubscriptionSuccess;
