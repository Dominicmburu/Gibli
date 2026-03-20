import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Lock, Zap } from 'lucide-react';
import NavBar from '../../components/NavBar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../utils/useAuth';

// Static plan detail data — mirrors SubscriptionPlans DB rows
const PLAN_DETAILS = {
	1: {
		planCode: 'free',
		name: 'Free Plan',
		price: 0,
		billing: 'No charge',
		commission: '5%',
		commissionDecimal: 0.05,
		color: 'gray',
		accentBg: 'bg-gray-100',
		accentText: 'text-gray-700',
		badge: null,
		tagline: 'Get started with zero upfront cost.',
		description:
			'The default plan for all sellers. You pay nothing — we simply take a 5% commission on each sale you make. Perfect for new sellers testing the waters.',
		features: [
			'No monthly or annual fees',
			'5% commission on every sale',
			'Access to all product listing tools',
			'Seller dashboard & analytics',
			'Standard customer support',
		],
		example: { sale: 200, commission: 10, net: 190 },
	},
	2: {
		planCode: 'standard_yearly',
		name: 'Standard Annual',
		price: 100,
		billing: '€100 / year',
		commission: '3%',
		commissionDecimal: 0.03,
		color: 'blue',
		accentBg: 'bg-blue-50',
		accentText: 'text-blue-700',
		badge: 'Best Value',
		tagline: 'A smart investment for established sellers.',
		description:
			'Pay once a year and immediately reduce your commission to 3%. If you sell more than €5,000 in a year, this plan pays for itself. Auto-renews annually — cancel anytime before renewal.',
		features: [
			'One-time annual fee of €100',
			'Reduced 3% commission on all sales',
			'Full access to seller dashboard',
			'Priority support',
			'Auto-renews annually (cancel before renewal)',
			'Email reminders 2 weeks, 1 week & 1 day before renewal',
		],
		example: { sale: 200, commission: 6, net: 194 },
	},
	3: {
		planCode: 'monthly',
		name: 'Monthly Pro',
		price: 10,
		billing: '€10 / month',
		commission: '3%',
		commissionDecimal: 0.03,
		color: 'purple',
		accentBg: 'bg-purple-50',
		accentText: 'text-purple-700',
		badge: 'Most Flexible',
		tagline: 'Full benefits with the freedom to cancel anytime.',
		description:
			'Pay €10 each month and enjoy the same reduced 3% commission as the annual plan. No long-term commitment. Perfect if your sales volume varies seasonally.',
		features: [
			'Monthly fee of €10',
			'Reduced 3% commission on all sales',
			'Full access to seller dashboard',
			'Priority support',
			'Cancel anytime — no lock-in',
			'Email reminders 1 week & 1 day before renewal',
		],
		example: { sale: 200, commission: 6, net: 194 },
	},
	4: {
		planCode: 'premium_yearly',
		name: 'Premium Annual',
		price: 6000,
		billing: '€6,000 / year',
		commission: '0%',
		commissionDecimal: 0,
		color: 'amber',
		accentBg: 'bg-amber-50',
		accentText: 'text-amber-700',
		badge: 'Zero Commission',
		tagline: 'Keep 100% of every sale for an entire year.',
		description:
			'The ultimate plan for high-volume sellers. One annual fee of €6,000 and zero commission for 12 months. If you sell more than €120,000 per year, this plan saves you money.',
		features: [
			'One-time annual fee of €6,000',
			'Zero (0%) commission on all sales',
			'Keep 100% of your sale proceeds',
			'Dedicated account support',
			'VIP seller status',
			'Auto-renews annually (cancel before renewal)',
			'Email reminders 2 weeks, 1 week & 1 day before renewal',
		],
		example: { sale: 200, commission: 0, net: 200 },
	},
};

// Helper to format remaining time nicely
function getTimeRemaining(endDateStr) {
	if (!endDateStr) return null;
	const diffMs = new Date(endDateStr) - new Date();
	if (diffMs <= 0) return null;
	const days = Math.floor(diffMs / 86400000);
	if (days >= 30) {
		const months = Math.floor(days / 30);
		const remDays = days % 30;
		return `${months}mo ${remDays}d`;
	}
	const hours = Math.floor((diffMs % 86400000) / 3600000);
	if (days >= 1) return `${days}d ${hours}h`;
	return `${hours}h`;
}

const colorMap = {
	gray:   { ring: 'ring-gray-200',   btn: 'bg-gray-600 hover:bg-gray-700',   badge: 'bg-gray-100 text-gray-700' },
	blue:   { ring: 'ring-blue-200',   btn: 'bg-blue-600 hover:bg-blue-700',   badge: 'bg-blue-100 text-blue-700' },
	purple: { ring: 'ring-purple-200', btn: 'bg-purple-600 hover:bg-purple-700', badge: 'bg-purple-100 text-purple-700' },
	amber:  { ring: 'ring-amber-200',  btn: 'bg-amber-500 hover:bg-amber-600',  badge: 'bg-amber-100 text-amber-700' },
};

const SubscriptionDetail = () => {
	const { planId } = useParams();
	const navigate = useNavigate();
	const { isLoggedIn, userInfo } = useAuth();

	const [currentSub, setCurrentSub] = useState(undefined); // undefined = loading, null = no sub
	const [loading, setLoading] = useState(false);
	const [checkoutLoading, setCheckoutLoading] = useState(false);

	const plan = PLAN_DETAILS[Number(planId)];

	useEffect(() => {
		const fetchCurrentSub = async () => {
			try {
				if (!isLoggedIn) { setCurrentSub(null); return; }
				const res = await api.get('/subscriptions/my-subscription');
				setCurrentSub(res.data);
			} catch {
				setCurrentSub(null);
			}
		};
		fetchCurrentSub();
	}, [isLoggedIn]);

	if (!plan) {
		return (
			<>
				<NavBar />
				<div className='min-h-screen flex items-center justify-center bg-gray-50'>
					<div className='text-center'>
						<p className='text-gray-500 mb-4'>Plan not found.</p>
						<button onClick={() => navigate(-1)} className='text-primary-500 hover:underline'>
							← Back to plans
						</button>
					</div>
				</div>
			</>
		);
	}

	const colors = colorMap[plan.color];
	const isCurrentPlan = currentSub && currentSub.PlanCode === plan.planCode;
	const hasActivePaidPlan = currentSub && currentSub.PlanCode !== 'free' && currentSub.Status === 'active';
	const isSwitching = hasActivePaidPlan && !isCurrentPlan;

	const handleSubscribe = async () => {
		if (!isLoggedIn) {
			toast.error('Please log in to subscribe.');
			navigate('/login');
			return;
		}
		if (plan.planCode === 'free') return;

		setCheckoutLoading(true);
		try {
			const res = await api.post('/subscriptions/create-checkout', { planId: Number(planId) });
			window.location.href = res.data.url;
		} catch (err) {
			const msg = err.response?.data?.message || 'Failed to start checkout. Please try again.';
			toast.error(msg);
			setCheckoutLoading(false);
		}
	};

	return (
		<>
			<NavBar />
			<div className='bg-gray-50 min-h-screen py-10 px-4'>
				<div className='max-w-3xl mx-auto'>
					{/* Back button */}
					<button
						onClick={() => navigate(-1)}
						className='flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition'
					>
						<ArrowLeft size={16} /> Back to all plans
					</button>

					{/* Plan header card */}
					<div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ring-2 ${colors.ring} p-8 mb-6`}>
						<div className='flex items-start justify-between flex-wrap gap-4'>
							<div>
								{plan.badge && (
									<span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${colors.badge}`}>
										{plan.badge}
									</span>
								)}
								<h1 className='text-3xl font-extrabold text-gray-900'>{plan.name}</h1>
								<p className='text-gray-500 mt-1'>{plan.tagline}</p>
							</div>
							<div className='text-right'>
								<p className='text-4xl font-extrabold text-gray-900'>{plan.price > 0 ? `€${plan.price.toLocaleString()}` : '€0'}</p>
								<p className='text-gray-400 text-sm mt-0.5'>{plan.billing}</p>
								<p className='text-purple-600 font-bold mt-1'>{plan.commission} commission</p>
							</div>
						</div>

						<p className='text-gray-600 mt-5 leading-relaxed'>{plan.description}</p>

						{/* Features */}
						<ul className='mt-6 space-y-2'>
							{plan.features.map((f) => (
								<li key={f} className='flex items-center gap-3 text-gray-700'>
									<span className='w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0'>
										<Check size={12} className='text-green-600' />
									</span>
									{f}
								</li>
							))}
						</ul>
					</div>

					{/* Example calculator */}
					<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6'>
						<h2 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
							<Zap size={18} className='text-yellow-500' /> Example: €{plan.example.sale} sale
						</h2>
						<div className='grid grid-cols-3 gap-4 text-center'>
							<div className='bg-gray-50 rounded-xl p-4'>
								<p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Sale Amount</p>
								<p className='text-2xl font-bold text-gray-900'>€{plan.example.sale}</p>
							</div>
							<div className='bg-red-50 rounded-xl p-4'>
								<p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Commission</p>
								<p className='text-2xl font-bold text-red-500'>-€{plan.example.commission}</p>
							</div>
							<div className='bg-green-50 rounded-xl p-4'>
								<p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>You Receive</p>
								<p className='text-2xl font-bold text-green-600'>€{plan.example.net}</p>
							</div>
						</div>
					</div>

					{/* Subscribe / Status block */}
					<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
						{currentSub === undefined ? (
							<div className='flex justify-center py-4'>
								<Loader2 className='animate-spin text-gray-400' size={28} />
							</div>
						) : isCurrentPlan ? (
							<div className='text-center'>
								<div className='w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3'>
									<Check size={28} className='text-green-600' />
								</div>
								<p className='text-lg font-bold text-gray-900'>You are on this plan</p>
								{currentSub.CurrentPeriodEnd && (
									<p className='text-gray-500 text-sm mt-1'>
										Active for {getTimeRemaining(currentSub.CurrentPeriodEnd)} more
									</p>
								)}
								<button
									onClick={() => navigate('/seller-subscription')}
									className='mt-4 text-primary-500 hover:text-primary-600 text-sm font-medium underline'
								>
									Manage your subscription
								</button>
							</div>
						) : isSwitching ? (
							<div>
								<div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800'>
									<strong>You currently have an active plan.</strong> Subscribing to this plan will
									activate it after your current plan ends on{' '}
									<strong>
										{new Date(currentSub.CurrentPeriodEnd).toLocaleDateString('en-GB', {
											day: 'numeric', month: 'long', year: 'numeric',
										})}
									</strong>
									. Your current commission rate remains unchanged until then.
								</div>
								<button
									onClick={handleSubscribe}
									disabled={checkoutLoading}
									className={`w-full text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 ${colors.btn} disabled:opacity-60`}
								>
									{checkoutLoading ? <Loader2 className='animate-spin' size={18} /> : null}
									{checkoutLoading ? 'Redirecting to Stripe...' : `Schedule Switch to ${plan.name}`}
								</button>
							</div>
						) : plan.planCode === 'free' ? (
							<div className='text-center'>
								{userInfo?.role === 'Seller' ? (
									<>
										<p className='text-gray-600 text-sm mb-4'>
											The Free Plan is your current default — no monthly fee, just 5% commission per sale.
										</p>
										<button
											onClick={() => navigate('/seller-dashboard')}
											className='bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2.5 px-6 rounded-xl transition'
										>
											Go to Dashboard
										</button>
									</>
								) : (
									<p className='text-gray-600 text-sm'>
										The Free plan is your default. No action required — simply{' '}
										<button
											onClick={() => navigate('/seller/register')}
											className='text-primary-500 hover:underline font-medium'
										>
											register your seller account
										</button>{' '}
										to get started.
									</p>
								)}
							</div>
						) : (
							<div>
								{!isLoggedIn && (
									<p className='text-sm text-gray-500 mb-4 text-center'>
										You need to{' '}
										<button onClick={() => navigate('/login')} className='text-primary-500 hover:underline'>
											log in
										</button>{' '}
										or{' '}
										<button onClick={() => navigate('/signup')} className='text-primary-500 hover:underline'>
											create an account
										</button>{' '}
										before subscribing.
									</p>
								)}
								<button
									onClick={handleSubscribe}
									disabled={checkoutLoading}
									className={`w-full text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 ${colors.btn} disabled:opacity-60`}
								>
									{checkoutLoading ? <Loader2 className='animate-spin' size={18} /> : <Lock size={16} />}
									{checkoutLoading ? 'Redirecting to Stripe...' : `Subscribe — ${plan.billing}`}
								</button>
								<p className='text-xs text-gray-400 mt-2 text-center'>
									Secure payment powered by Stripe. Cancel anytime.
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

export default SubscriptionDetail;
