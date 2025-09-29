import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/NavBar';

const BecomeSeller = () => {
	const navigate = useNavigate();
	const handleCreateAccountClick = () => {
		navigate('/seller/register'); // Navigate to the SellerRegistration form
	};
	return (
		<>
			<NavBar />
			<div className='bg-gray-50 min-h-screen flex flex-col'>
				{/* Hero Section */}
				<section className='flex flex-col lg:flex-row items-center justify-between max-w-6xl mx-auto py-16 px-6 lg:px-12'>
					{/* Left Text Content */}
					<div className='lg:w-1/2 space-y-6'>
						<h1 className='text-4xl lg:text-5xl font-bold text-gray-900'>
							How to start selling on <span className='text-green-700'>OurPlatform</span>:
							<br />
							Become a Seller
						</h1>
						<p className='text-gray-600 text-lg'>
							Are you a registered business in Europe? We are here to give you reach to more customers all
							over Europe today. Take the first step and register your seller account with us.
						</p>
						<button
							onClick={handleCreateAccountClick}
							className='bg-amber-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-full shadow-lg transition'
						>
							Create Seller Account.
						</button>
						<p className='text-sm text-gray-500'>*We Charge 5% of every sale as platform fees</p>
					</div>

					{/* Right Image Card */}
					<div className='lg:w-1/2 mt-10 lg:mt-0 flex justify-center'>
						<div className='bg-white p-6 rounded-2xl shadow-md max-w-md'>
							<span className='bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full'>
								New Seller Policy or Guidelines
							</span>
							<h2 className='mt-4 text-xl font-bold text-gray-800'>
								A very catchy tagline for aspiring sellers to read.
							</h2>
							<p className='text-gray-600 mt-2 text-sm'>
								Placeholder for some announce ment that sellers need to know, or our policy or anything
								important that aspiring sellers need to know.
							</p>
							<button className='mt-4 bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition'>
								Learn more
							</button>
						</div>
					</div>
				</section>

				{/* Info Cards Section */}
				<section className='bg-white py-12 px-6 lg:px-12'>
					<div className='grid md:grid-cols-2 gap-6 max-w-5xl mx-auto'>
						<div className='p-6 border rounded-xl hover:shadow-lg transition cursor-pointer'>
							<h3 className='font-semibold text-gray-800'>📘 Read the beginner’s guide to selling</h3>
						</div>
						<div className='p-6 border rounded-xl hover:shadow-lg transition cursor-pointer'>
							<h3 className='font-semibold text-gray-800'>
								📢 Things to know before you create a seller account
							</h3>
						</div>
					</div>
				</section>
			</div>
		</>
	);
};

export default BecomeSeller;
