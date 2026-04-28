import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Loader2, ShoppingBag, AlertTriangle, HeadphonesIcon } from 'lucide-react';
import NavBar from '../../components/NavBar';
import api from '../../api/axios';

// status values:
//   'activating'  — calling activate-session (Stripe) or capture-paypal-order (PayPal)
//   'done'        — paid, orders created, immediate fulfilment (card / PayPal)
//   'sepa'        — SEPA mandate accepted; funds clear in 1-3 days
//   'support'     — 409: payment received but order creation failed
//   'error'       — unexpected error

const CheckoutSuccess = () => {
	const [searchParams] = useSearchParams();
	const navigate       = useNavigate();

	const sessionId   = searchParams.get('session_id');
	const isPaypal    = searchParams.get('paypal') === 'true';
	const paypalToken = searchParams.get('token');   // PayPal order ID appended by PayPal on return
	const draftId     = searchParams.get('draftId'); // embedded by us in PayPal return_url

	const [status,    setStatus]    = useState('activating');
	const [sessionRef, setSessionRef] = useState(null); // shown in support message

	useEffect(() => {
		// ── PayPal return ─────────────────────────────────────────────────────────
		if (isPaypal) {
			if (!paypalToken || !draftId) {
				// Malformed return URL — shouldn't happen normally
				setStatus('error');
				return;
			}

			api.post('/checkout/capture-paypal-order', { paypalOrderId: paypalToken, draftId })
				.then(() => setStatus('done'))
				.catch((err) => {
					console.error('PayPal capture error:', err);
					setStatus('error');
				});
			return;
		}

		// ── Stripe return ─────────────────────────────────────────────────────────
		if (!sessionId) {
			// No params at all — landed here directly; treat as done
			setStatus('done');
			return;
		}

		api.post('/checkout/activate-session', { sessionId })
			.then((res) => {
				const deliveryStatus = res.data.deliveryStatus;
				if (deliveryStatus === 'AwaitingPayment') {
					setStatus('sepa');
				} else {
					setStatus('done');
				}
			})
			.catch((err) => {
				const code = err.response?.status;
				if (code === 409) {
					setSessionRef(err.response?.data?.sessionId || sessionId);
					setStatus('support');
				} else if (code === 403) {
					// Session belongs to a different account
					setStatus('error');
				} else {
					// Webhook may have already run and returned a non-2xx we don't expect;
					// treat as success rather than alarming the buyer unnecessarily.
					console.error('activate-session error:', err);
					setStatus('done');
				}
			});
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<>
			<NavBar />
			<div className='min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4'>

				{/* ── Loading ────────────────────────────────────────────────────── */}
				{status === 'activating' && (
					<div className='text-center'>
						<Loader2 size={48} className='animate-spin text-primary-500 mx-auto mb-4' />
						<p className='text-gray-600 font-medium'>
							{isPaypal ? 'Capturing your PayPal payment…' : 'Confirming your order…'}
						</p>
					</div>
				)}

				{/* ── Success (card / PayPal) ────────────────────────────────────── */}
				{status === 'done' && (
					<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center'>
						<div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5'>
							<CheckCircle size={36} className='text-green-500' />
						</div>
						<h1 className='text-2xl font-extrabold text-gray-900 mb-2'>Payment Successful!</h1>
						<p className='text-gray-500 mb-8'>
							Your order has been confirmed. You'll receive a confirmation email shortly.
						</p>
						<div className='flex flex-col sm:flex-row gap-3 justify-center'>
							<button
								onClick={() => navigate('/orders')}
								className='flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 px-6 rounded-xl transition'
							>
								<ShoppingBag size={18} />
								View My Orders
							</button>
							<button
								onClick={() => navigate('/')}
								className='bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-xl transition'
							>
								Continue Shopping
							</button>
						</div>
					</div>
				)}

				{/* ── SEPA — awaiting bank transfer ─────────────────────────────── */}
				{status === 'sepa' && (
					<div className='bg-white rounded-2xl shadow-sm border border-blue-100 p-10 max-w-md w-full text-center'>
						<div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5'>
							<Clock size={36} className='text-blue-500' />
						</div>
						<h1 className='text-2xl font-extrabold text-gray-900 mb-2'>Bank Transfer Authorised</h1>
						<p className='text-gray-600 mb-3'>
							Your SEPA Direct Debit mandate has been accepted. The bank transfer typically clears within <strong>1–3 business days</strong>.
						</p>
						<p className='text-sm text-gray-500 mb-8'>
							Your order is reserved and you'll receive an email once the funds clear and your order is confirmed with the seller.
						</p>
						<div className='flex flex-col sm:flex-row gap-3 justify-center'>
							<button
								onClick={() => navigate('/orders')}
								className='flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition'
							>
								<ShoppingBag size={18} />
								View My Orders
							</button>
							<button
								onClick={() => navigate('/')}
								className='bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-xl transition'
							>
								Continue Shopping
							</button>
						</div>
					</div>
				)}

				{/* ── Support needed (409) ───────────────────────────────────────── */}
				{status === 'support' && (
					<div className='bg-white rounded-2xl shadow-sm border border-amber-200 p-10 max-w-md w-full text-center'>
						<div className='w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5'>
							<HeadphonesIcon size={36} className='text-amber-500' />
						</div>
						<h1 className='text-2xl font-extrabold text-gray-900 mb-2'>Payment Received</h1>
						<p className='text-gray-600 mb-3'>
							Your payment went through, but we ran into a problem creating your order.
						</p>
						<p className='text-sm text-gray-500 mb-2'>
							Please contact support and quote your session reference:
						</p>
						<code className='block bg-gray-100 text-gray-800 text-xs rounded-lg px-4 py-2 mb-8 break-all'>
							{sessionRef}
						</code>
						<div className='flex flex-col sm:flex-row gap-3 justify-center'>
							<button
								onClick={() => navigate('/orders')}
								className='flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 px-6 rounded-xl transition'
							>
								<ShoppingBag size={18} />
								View My Orders
							</button>
							<button
								onClick={() => navigate('/')}
								className='bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-xl transition'
							>
								Go to Homepage
							</button>
						</div>
					</div>
				)}

				{/* ── Generic error ──────────────────────────────────────────────── */}
				{status === 'error' && (
					<div className='bg-white rounded-2xl shadow-sm border border-red-100 p-10 max-w-md w-full text-center'>
						<div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5'>
							<AlertTriangle size={36} className='text-red-500' />
						</div>
						<h1 className='text-2xl font-extrabold text-gray-900 mb-2'>Something Went Wrong</h1>
						<p className='text-gray-500 mb-8'>
							We couldn't confirm your payment. If money was deducted, please contact support.
						</p>
						<div className='flex flex-col sm:flex-row gap-3 justify-center'>
							<button
								onClick={() => navigate('/orders')}
								className='flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 px-6 rounded-xl transition'
							>
								<ShoppingBag size={18} />
								View My Orders
							</button>
							<button
								onClick={() => navigate('/')}
								className='bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-xl transition'
							>
								Go to Homepage
							</button>
						</div>
					</div>
				)}

			</div>
		</>
	);
};

export default CheckoutSuccess;
