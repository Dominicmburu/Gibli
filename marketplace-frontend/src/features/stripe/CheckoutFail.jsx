import { useNavigate } from 'react-router-dom';
import { XCircle, RotateCcw, ShoppingBag } from 'lucide-react';
import NavBar from '../../components/NavBar';

const CheckoutFail = () => {
	const navigate = useNavigate();

	return (
		<>
			<NavBar />
			<div className='min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4'>
				<div className='bg-white rounded-2xl shadow-sm border border-red-100 p-10 max-w-md w-full text-center'>
					<div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5'>
						<XCircle size={36} className='text-red-500' />
					</div>
					<h1 className='text-2xl font-extrabold text-gray-900 mb-2'>Payment Cancelled</h1>
					<p className='text-gray-500 mb-8'>
						Your payment was not completed and you have not been charged. You can try again or return to your cart.
					</p>
					<div className='flex flex-col sm:flex-row gap-3 justify-center'>
						<button
							onClick={() => navigate(-1)}
							className='flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 px-6 rounded-xl transition'
						>
							<RotateCcw size={18} />
							Try Again
						</button>
						<button
							onClick={() => navigate('/cart')}
							className='flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-xl transition'
						>
							<ShoppingBag size={18} />
							Back to Cart
						</button>
					</div>
				</div>
			</div>
		</>
	);
};

export default CheckoutFail;
