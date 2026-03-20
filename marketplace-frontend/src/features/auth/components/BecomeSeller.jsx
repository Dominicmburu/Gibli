import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/NavBar';
import { Check, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../../utils/useAuth';
import api from '../../../api/axios';

const PLANS = [
	{
		id: 1,
		name: 'Free Plan',
		price: '€0',
		billing: 'forever',
		commission: '5%',
		commissionLabel: 'commission per sale',
		highlight: false,
		features: ['No monthly fee', 'Sell unlimited products', 'Basic seller dashboard', 'Standard support'],
		badge: null,
		isPaid: false,
	},
	{
		id: 2,
		name: 'Standard Annual',
		price: '€100',
		billing: 'per year',
		commission: '3%',
		commissionLabel: 'commission per sale',
		highlight: false,
		features: ['Save on every sale vs. free', 'Reduced 3% commission', 'Full seller dashboard', 'Priority support'],
		badge: 'Best Value',
		isPaid: true,
	},
	{
		id: 3,
		name: 'Monthly Pro',
		price: '€10',
		billing: 'per month',
		commission: '3%',
		commissionLabel: 'commission per sale',
		highlight: true,
		features: ['No annual commitment', 'Reduced 3% commission', 'Full seller dashboard', 'Cancel anytime'],
		badge: 'Most Flexible',
		isPaid: true,
	},
	{
		id: 4,
		name: 'Premium Annual',
		price: '€6,000',
		billing: 'per year',
		commission: '0%',
		commissionLabel: 'commission — keep 100% of sales',
		highlight: false,
		features: ['Zero commission on all sales', 'Maximum profit per transaction', 'Dedicated support', 'VIP seller status'],
		badge: 'Zero Commission',
		isPaid: true,
	},
];

const BecomeSeller = () => {
	const navigate = useNavigate();
	const { isLoggedIn, tokenExpired } = useAuth();

	const [pendingSetup, setPendingSetup] = useState(null); // true when registered but not yet paid
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		if (isLoggedIn && !tokenExpired) {
			api.get('/subscriptions/pending-seller-setup')
				.then(res => {
					setPendingSetup(res.data?.pendingSetup === true ? true : false);
				})
				.catch(() => setPendingSetup(false))
				.finally(() => setChecking(false));
		} else {
			setChecking(false);
			setPendingSetup(false);
		}
	}, [isLoggedIn, tokenExpired]);

	const handleChoose = (plan) => {
		if (isLoggedIn && !tokenExpired) {
			// Logged in but not yet registered as a seller — go to details form first
			navigate('/seller/register');
		} else {
			// Not logged in: show plan info pages so user can browse
			if (!plan.isPaid) {
				navigate('/signup');
			} else {
				navigate(`/subscription/${plan.id}`);
			}
		}
	};

	// ── Right column content ──
	const renderRightColumn = () => {
		if (checking) {
			return (
				<div className='lg:w-1/2 flex items-center justify-center py-16'>
					<Loader2 className='animate-spin text-gray-400' size={32} />
				</div>
			);
		}

		// Registered seller but hasn't completed plan payment yet
		if (pendingSetup) {
			return (
				<div className='lg:w-1/2'>
					<div className='bg-white rounded-2xl border-2 border-primary-400 ring-2 ring-primary-100 shadow-lg p-8'>
						{/* Icon */}
						<div className='w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-5'>
							<CheckCircle size={30} className='text-green-500' />
						</div>

						{/* Heading */}
						<h2 className='text-2xl font-extrabold text-gray-900 mb-2'>
							Details saved!
						</h2>
						<p className='text-gray-500 mb-5'>
							Your seller account has been created. The final step is to choose your subscription plan and complete payment.
						</p>

						{/* What's ready */}
						<ul className='space-y-2 mb-7'>
							{[
								'Your business details are registered',
								'Your account is ready — just select a plan',
								'Start listing products as soon as payment is done',
							].map((item) => (
								<li key={item} className='flex items-start gap-2 text-sm text-gray-600'>
									<Check size={15} className='text-green-500 flex-shrink-0 mt-0.5' />
									{item}
								</li>
							))}
						</ul>

						{/* CTA */}
						<button
							onClick={() => navigate('/onboarding/seller-plans')}
							className='w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 rounded-xl transition text-base'
						>
							Complete Payment
							<ArrowRight size={18} />
						</button>

						<p className='text-xs text-gray-400 text-center mt-4'>
							You can also continue on the free plan — no payment required for the default 5% commission rate.
						</p>
					</div>
				</div>
			);
		}

		// Default: show plan cards (for browsing / not-yet-registered users)
		return (
			<div className='lg:w-1/2 space-y-4'>
				<h2 className='text-xl font-bold text-gray-900'>Choose Your Plan</h2>
				<p className='text-sm text-gray-500 mb-4'>
					You will select your plan after entering your business details. Preview the options below.
				</p>

				{PLANS.map((plan) => (
					<div
						key={plan.id}
						className={`relative bg-white rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
							plan.highlight
								? 'border-primary-400 ring-2 ring-primary-200'
								: 'border-gray-100'
						}`}
					>
						{plan.badge && (
							<span className='absolute -top-2.5 left-5 bg-primary-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full'>
								{plan.badge}
							</span>
						)}

						<div className='flex items-start justify-between gap-4'>
							<div className='flex-1'>
								<h3 className='font-bold text-gray-900 text-lg'>{plan.name}</h3>
								<div className='flex items-baseline gap-1 mt-1'>
									<span className='text-2xl font-extrabold text-gray-900'>{plan.price}</span>
									<span className='text-gray-400 text-sm'>{plan.billing}</span>
								</div>
								<p className='text-sm mt-1'>
									<span className='font-semibold text-purple-600'>{plan.commission}</span>{' '}
									<span className='text-gray-500'>{plan.commissionLabel}</span>
								</p>

								<ul className='mt-3 space-y-1'>
									{plan.features.map((f) => (
										<li key={f} className='flex items-center gap-2 text-sm text-gray-600'>
											<Check size={14} className='text-green-500 flex-shrink-0' />
											{f}
										</li>
									))}
								</ul>
							</div>

							<button
								onClick={() => handleChoose(plan)}
								className='flex-shrink-0 mt-1 bg-primary-50 hover:bg-primary-100 text-primary-600 font-semibold text-sm px-4 py-2 rounded-xl transition'
							>
								Get Started
							</button>
						</div>
					</div>
				))}
			</div>
		);
	};

	return (
		<>
			<NavBar />
			<div className='bg-gray-50 min-h-screen flex flex-col'>
				{/* Hero Section */}
				<section className='flex flex-col lg:flex-row items-start justify-between max-w-7xl mx-auto py-16 px-6 lg:px-12 gap-12'>
					{/* Left Text Content */}
					<div className='lg:w-1/2 space-y-6 lg:sticky lg:top-20'>
						<h1 className='text-4xl lg:text-5xl font-bold text-gray-900'>
							How to start selling on <span className='text-primary-500'>GibLi</span>:
							<br />
							Become a Seller
						</h1>
						<p className='text-gray-600 text-lg'>
							Are you a registered business in Europe? We are here to give you reach to more customers all
							over Europe today. Take the first step and register your seller account with us.
						</p>

						{/* Step guide — Step 1: details, Step 2: plan, Step 3: payment */}
						<div className='space-y-3'>
							<div className='flex items-start gap-3'>
								<span className={`w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${pendingSetup ? 'bg-green-500' : 'bg-primary-500'}`}>
									{pendingSetup ? <Check size={14} /> : '1'}
								</span>
								<p className='text-gray-700'>
									<span className='font-semibold'>Enter your business details</span> — register your VAT number, business name, and country.
								</p>
							</div>
							<div className='flex items-start gap-3'>
								<span className={`w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${pendingSetup ? 'bg-primary-500 ring-2 ring-primary-300' : 'bg-primary-500'}`}>
									{pendingSetup ? '2' : '2'}
								</span>
								<p className={`text-gray-700 ${pendingSetup ? 'font-semibold text-primary-700' : ''}`}>
									<span className='font-semibold'>Choose your subscription plan</span> — pick the commission structure that fits your business.
								</p>
							</div>
							<div className='flex items-start gap-3'>
								<span className={`w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${pendingSetup ? 'bg-primary-500 ring-2 ring-primary-300' : 'bg-primary-500'}`}>
									3
								</span>
								<p className={`text-gray-700 ${pendingSetup ? 'font-semibold text-primary-700' : ''}`}>
									<span className='font-semibold'>Complete payment</span> — paid plans redirect you to Stripe to complete checkout securely. This is the final step.
								</p>
							</div>
						</div>
					</div>

					{/* Right column */}
					{renderRightColumn()}
				</section>

				{/* Info Cards Section */}
				<section className='bg-white py-12 px-6 lg:px-12'>
					<div className='grid md:grid-cols-2 gap-6 max-w-5xl mx-auto'>
						<div className='p-6 border rounded-xl hover:shadow-lg transition cursor-pointer'>
							<h3 className='font-semibold text-gray-800'>Read the beginner's guide to selling</h3>
						</div>
						<div className='p-6 border rounded-xl hover:shadow-lg transition cursor-pointer'>
							<h3 className='font-semibold text-gray-800'>
								Things to know before you create a seller account
							</h3>
						</div>
					</div>
				</section>
			</div>
		</>
	);
};

export default BecomeSeller;
