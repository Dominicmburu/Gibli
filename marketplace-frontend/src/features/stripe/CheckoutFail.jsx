import NavBar from '../../components/NavBar';

const CheckoutFail = () => {
	return (
		<>
			<NavBar />
			<div className='bg-white-100 flex items-center justify-center min-h-screen'>
				<h1 className='bg-white-100 '>Payment Failed</h1>
				<p>Something went wrong while processing your payment, Retry</p>
			</div>
		</>
	);
};
export default CheckoutFail;
