import { useNavigate } from 'react-router-dom';
import { Check, Store } from 'lucide-react';
import api from '../../api/axios';

const PLANS = [
	{
		id: 1,
		name: 'Free Plan',
		price: '€0',
		billing: 'forever',
		commission: '5%',
		commissionLabel: 'commission per sale',
		highlight: false,
		badge: null,
		isPaid: false,
		features: [
			'No monthly fee',
			'Sell unlimited products',
			'Basic seller dashboard',
			'Standard support',
		],
	},
	{
		id: 2,
		name: 'Package 1',
		price: '€1',
		billing: 'per month',
		commission: 'x%',
		commissionLabel: 'commission per sale',
		highlight: false,
		badge: 'Coming Soon',
		isPaid: true,
		comingSoon: true,
		features: ['Service 1', 'Service 2', 'Service 3', 'Service 4', 'Service 5'],
	},
	{
		id: 3,
		name: 'Package 2',
		price: '€2',
		billing: 'per month',
		commission: 'y%',
		commissionLabel: 'commission per sale',
		highlight: false,
		badge: 'Coming Soon',
		isPaid: true,
		comingSoon: true,
		features: ['Service 1', 'Service 2', 'Service 3', 'Service 4', 'Service 5', 'Service 6'],
	},
];

const SellerOnboardingPlans = () => {
	const navigate = useNavigate();

	const handleChoose = async (plan) => {
		if (!plan.isPaid) {
			// Mark onboarding complete for free plan, then go to dashboard
			try {
				await api.post('/subscriptions/complete-free-plan');
			} catch (_) {
				// Non-critical — proceed regardless
			}
			navigate('/seller-dashboard');
		} else {
			navigate(`/subscription/${plan.id}`);
		}
	};

	return (
		<div className='min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4'>
			{/* Minimal header */}
			<div className='mb-10 text-center'>
				<div className='flex items-center justify-center gap-2 mb-5'>
					<Store className='w-7 h-7 text-primary-600' />
					<span className='text-xl font-bold text-primary-600'>GibLi</span>
				</div>
				<h1 className='text-3xl font-extrabold text-gray-900'>Choose Your Seller Plan</h1>
				<p className='text-gray-500 mt-2 max-w-md mx-auto text-sm'>
					Pick the plan that fits your business. You can always switch plans later from your
					dashboard.
				</p>
			</div>

			{/* Plan cards — vertical list */}
			<div className='w-full max-w-2xl space-y-4'>
				{PLANS.map((plan) => (
					<div
						key={plan.id}
						className={`relative bg-white rounded-2xl border shadow-sm transition ${
							plan.comingSoon
								? 'border-gray-100 opacity-60'
								: plan.highlight
								? 'border-primary-400 ring-2 ring-primary-100 hover:shadow-md'
								: 'border-gray-100 hover:shadow-md'
						}`}
					>
						{plan.badge && (
							<span className={`absolute -top-3 left-5 text-white text-xs font-semibold px-3 py-0.5 rounded-full ${plan.comingSoon ? 'bg-gray-400' : 'bg-primary-500'}`}>
								{plan.badge}
							</span>
						)}

						<div className='flex items-start justify-between gap-4 p-5 pt-6'>
							{/* Plan info */}
							<div className='flex-1 min-w-0'>
								<h3 className='font-bold text-gray-900 text-lg'>{plan.name}</h3>
								<div className='flex items-baseline gap-1 mt-1'>
									<span className='text-2xl font-extrabold text-gray-900'>{plan.price}</span>
									<span className='text-gray-400 text-sm'>{plan.billing}</span>
								</div>
								<p className='text-sm mt-1'>
									<span className='font-semibold text-purple-600'>{plan.commission}</span>{' '}
									<span className='text-gray-500'>{plan.commissionLabel}</span>
								</p>
								<ul className='mt-3 space-y-1.5'>
									{plan.features.map((f) => (
										<li key={f} className='flex items-center gap-2 text-sm text-gray-600'>
											<Check size={13} className='text-green-500 flex-shrink-0' />
											{f}
										</li>
									))}
								</ul>
							</div>

							{/* CTA */}
							{plan.comingSoon ? (
							<div className='flex-shrink-0 mt-1 text-center'>
								<span className='inline-block bg-gray-100 text-gray-400 text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed'>
									Coming Soon
								</span>
							</div>
						) : (
							<button
								onClick={() => handleChoose(plan)}
								className={`flex-shrink-0 mt-1 font-semibold text-sm px-5 py-2.5 rounded-xl transition ${
									plan.highlight
										? 'bg-primary-500 hover:bg-primary-600 text-white'
										: 'bg-gray-900 hover:bg-gray-700 text-white'
								}`}
							>
								{plan.isPaid ? 'Subscribe' : 'Get Started'}
							</button>
						)}
						</div>
					</div>
				))}
			</div>

			<p className='mt-8 text-xs text-gray-400 text-center max-w-sm'>
				By continuing, you agree to our Terms of Service. Paid plans are billed via Stripe.
			</p>
		</div>
	);
};

export default SellerOnboardingPlans;
