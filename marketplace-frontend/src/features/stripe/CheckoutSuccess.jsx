import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import api from '../../api/axios';
import NavBar from '../../components/NavBar';
const CheckoutSuccess = () => {
	const [searchParams] = useSearchParams();
	const sessionId = searchParams.get('session_id');

	useEffect(() => {
		if (sessionId) {
			// Call your backend to verify payment/order
			//=============NOTE TO SELF ==========
			//=====REMEMBER TO LISTEN TO THE WEBHOOK IN THE REAL VERSION ======
			api.get(`/orders/verify-payment?session_id=${sessionId}`)
				.then((res) => {
					console.log('Payment verified:', res.data);
				})
				.catch((err) => console.error('Verification error:', err));
		}
	}, [sessionId]);

	return (
		<>
			<NavBar />
			<div className='bg-white-100 flex items-center justify-center min-h-screen'>
				<h1 className='bg-white-100 '>Payment Successful 🎉</h1>
				<p>Your order has been confirmed. Thank you!</p>
			</div>
			<div className='items-center justify-center '>
				<button className='bg-green-100 mr-5'> Continue Shopping</button>
				<button className='bg-amber-100 '> See Orders</button>
			</div>
		</>
	);
};

export default CheckoutSuccess;
