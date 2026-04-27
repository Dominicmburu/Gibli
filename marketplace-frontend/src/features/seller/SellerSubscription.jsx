import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Loader2, CreditCard, CheckCircle, AlertTriangle, Clock,
	TrendingUp, Euro, Percent, Lock, ChevronRight, X, Check,
} from 'lucide-react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// ─── helpers ────────────────────────────────────────────────

function getTimeRemaining(endDateStr) {
	if (!endDateStr) return null;
	const diffMs = new Date(endDateStr) - new Date();
	if (diffMs <= 0) return 'Expired';
	const totalSeconds = Math.floor(diffMs / 1000);
	const days    = Math.floor(totalSeconds / 86400);
	const hours   = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);

	if (days >= 30) {
		const months = Math.floor(days / 30);
		const remDays = days % 30;
		return `${months} month${months !== 1 ? 's' : ''}${remDays > 0 ? `, ${remDays} day${remDays !== 1 ? 's' : ''}` : ''} remaining`;
	}
	if (days >= 1) return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
	if (hours >= 1) return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} min remaining`;
	return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
}

function formatDate(dateStr) {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString('en-GB', {
		day: 'numeric', month: 'long', year: 'numeric',
	});
}

// Static plan catalogue (mirrors DB seed)
const ALL_PLANS = [
	{
		planId: 1, planCode: 'free',
		name: 'Free Plan', price: 0, billing: 'free forever',
		commission: '5%', commissionRate: 0.05,
		description: 'Default plan. No fee, 5% commission per sale.',
		color: 'gray',
	},
	{
		planId: 2, planCode: 'package_1',
		name: 'Package 1', price: 1, billing: '€1 / month',
		commission: 'x%', commissionRate: 0.03,
		description: 'Service 1, Service 2, Service 3, Service 4, Service 5.',
		color: 'blue',
		comingSoon: true,
	},
	{
		planId: 3, planCode: 'package_2',
		name: 'Package 2', price: 2, billing: '€2 / month',
		commission: 'y%', commissionRate: 0,
		description: 'Service 1, Service 2, Service 3, Service 4, Service 5, Service 6.',
		color: 'purple',
		comingSoon: true,
	},
];

const colorVariants = {
	gray:   { bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-200',   btn: 'bg-gray-600 hover:bg-gray-700'   },
	blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   btn: 'bg-blue-600 hover:bg-blue-700'   },
	purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', btn: 'bg-purple-600 hover:bg-purple-700' },
	amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  btn: 'bg-amber-500 hover:bg-amber-600'  },
};

// Status badge component
const StatusBadge = ({ status }) => {
	const map = {
		active:          { label: 'Active',           cls: 'bg-green-100 text-green-700'   },
		cancelling:      { label: 'Cancelling',        cls: 'bg-amber-100 text-amber-700'   },
		pending_trial:   { label: 'Trial (Pending)',   cls: 'bg-blue-100 text-blue-700'     },
		payment_failed:  { label: 'Payment Failed',   cls: 'bg-red-100 text-red-700'       },
		expired:         { label: 'Expired',           cls: 'bg-gray-100 text-gray-500'     },
	};
	const { label, cls } = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
	return (
		<span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
			{label}
		</span>
	);
};

// ─── main component ──────────────────────────────────────────

const SellerSubscription = () => {
	const navigate = useNavigate();

	const [subscription, setSubscription] = useState(undefined); // undefined = loading
	const [history, setHistory]           = useState({ subscriptions: [], payments: [] });
	const [commStats, setCommStats]       = useState(null);
	const [timeLeft, setTimeLeft]         = useState('');
	const [cancelLoading, setCancelLoading] = useState(false);
	const [showCancelModal, setShowCancelModal] = useState(false);
	const [switchTarget, setSwitchTarget] = useState(null); // plan the user is switching TO
	const [switchLoading, setSwitchLoading] = useState(false);

	// ── fetch data ──
	const fetchData = useCallback(async () => {
		try {
			const [subRes, histRes, statsRes] = await Promise.allSettled([
				api.get('/subscriptions/my-subscription'),
				api.get('/subscriptions/history'),
				api.get('/subscriptions/commission-stats'),
			]);

			if (subRes.status === 'fulfilled') setSubscription(subRes.value.data);
			else setSubscription(null);

			if (histRes.status === 'fulfilled') setHistory(histRes.value.data);
			if (statsRes.status === 'fulfilled') setCommStats(statsRes.value.data);
		} catch {
			setSubscription(null);
		}
	}, []);

	useEffect(() => { fetchData(); }, [fetchData]);

	// ── live countdown timer ──
	useEffect(() => {
		if (!subscription?.CurrentPeriodEnd) return;
		const tick = () => setTimeLeft(getTimeRemaining(subscription.CurrentPeriodEnd));
		tick();
		const id = setInterval(tick, 60_000); // update every minute
		return () => clearInterval(id);
	}, [subscription?.CurrentPeriodEnd]);

	// ── cancel subscription ──
	const handleCancel = () => setShowCancelModal(true);

	const confirmCancel = async () => {
		setCancelLoading(true);
		try {
			const res = await api.post('/subscriptions/cancel');
			toast.success(res.data.message || 'Subscription set to cancel at period end.');
			setShowCancelModal(false);
			fetchData();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to cancel subscription.');
		} finally {
			setCancelLoading(false);
		}
	};

	// ── switch plan ──
	const handleSwitchPlan = async (plan) => {
		setSwitchTarget(plan);
	};

	const confirmSwitch = async () => {
		if (!switchTarget) return;
		setSwitchLoading(true);
		try {
			const res = await api.post('/subscriptions/create-checkout', { planId: switchTarget.planId });
			window.location.href = res.data.url;
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to start checkout.');
			setSwitchLoading(false);
			setSwitchTarget(null);
		}
	};

	const currentPlanCode = subscription?.PlanCode ?? 'free';
	const otherPlans = ALL_PLANS.filter((p) => p.planCode !== currentPlanCode);

	// ── render helpers ──
	const renderCurrentPlanCard = () => {
		if (subscription === undefined) {
			return (
				<div className='flex justify-center items-center h-40'>
					<Loader2 className='animate-spin text-gray-400' size={32} />
				</div>
			);
		}

		const planInfo = ALL_PLANS.find((p) => p.planCode === currentPlanCode) || ALL_PLANS[0];
		const colors = colorVariants[planInfo.color];
		const commissionRate = Number(subscription?.CommissionRate ?? 0.05);
		const isFree = currentPlanCode === 'free';

		return (
			<div className={`rounded-2xl border ${colors.border} ${colors.bg} p-6`}>
				<div className='flex items-start justify-between flex-wrap gap-4 mb-4'>
					<div>
						<p className='text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1'>Current Plan</p>
						<h2 className='text-2xl font-extrabold text-gray-900'>
							{subscription?.PlanName ?? 'Free Plan'}
						</h2>
					</div>
					<div className='flex flex-col items-end gap-2'>
						{subscription && <StatusBadge status={subscription.Status || 'active'} />}
						{subscription?.CancelAtPeriodEnd ? (
							<span className='text-xs text-amber-600 font-medium'>
								Cancels on {formatDate(subscription.CurrentPeriodEnd)}
							</span>
						) : null}
					</div>
				</div>

				{/* Commission highlight */}
				<div className='flex items-center gap-3 mb-5'>
					<div className='w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center'>
						<Percent size={22} className='text-purple-500' />
					</div>
					<div>
						<p className='text-3xl font-extrabold text-purple-600'>{(commissionRate * 100).toFixed(0)}%</p>
						<p className='text-xs text-gray-500'>commission per sale</p>
					</div>
				</div>

				{/* Countdown timer */}
				{!isFree && subscription?.CurrentPeriodEnd ? (
					<div className='bg-white rounded-xl border border-gray-100 p-4 mb-5 flex items-center gap-3'>
						<Clock size={20} className='text-primary-500 flex-shrink-0' />
						<div>
							<p className='text-xs text-gray-500 mb-0.5'>Time remaining</p>
							<p className='font-bold text-gray-900 text-sm'>{timeLeft || getTimeRemaining(subscription.CurrentPeriodEnd)}</p>
						</div>
						<div className='ml-auto text-right'>
							<p className='text-xs text-gray-400'>Renews</p>
							<p className='text-xs font-medium text-gray-600'>{formatDate(subscription.CurrentPeriodEnd)}</p>
						</div>
					</div>
				) : isFree ? (
					<p className='text-sm text-gray-500 mb-5'>No expiry — upgrade anytime to reduce your commission rate.</p>
				) : null}

				{/* Cancel button */}
				{!isFree && subscription?.Status === 'active' && !subscription?.CancelAtPeriodEnd && (
					<button
						onClick={handleCancel}
						disabled={cancelLoading}
						className='text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1.5 transition'
					>
						{cancelLoading ? <Loader2 className='animate-spin' size={14} /> : <X size={14} />}
						Cancel subscription
					</button>
				)}
			</div>
		);
	};

	const renderPaymentHistory = () => {
		const payments = history.payments || [];
		if (payments.length === 0) return null;

		return (
			<div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6'>
				<div className='px-5 py-4 border-b border-gray-100'>
					<h3 className='font-bold text-gray-900'>Payment History</h3>
				</div>
				<table className='w-full text-sm'>
					<thead>
						<tr className='bg-gray-50 border-b border-gray-100'>
							<th className='text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase'>Plan</th>
							<th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>Period</th>
							<th className='text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>Amount</th>
							<th className='text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>Status</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-50'>
						{payments.map((p) => (
							<tr key={p.PaymentId} className='hover:bg-gray-50 transition'>
								<td className='px-5 py-3 font-medium text-gray-800'>{p.PlanName}</td>
								<td className='px-4 py-3 text-gray-500 text-xs'>
									{p.BillingPeriodStart ? formatDate(p.BillingPeriodStart) : '—'}
									{p.BillingPeriodEnd ? ` – ${formatDate(p.BillingPeriodEnd)}` : ''}
								</td>
								<td className='px-4 py-3 text-right font-semibold text-gray-900'>
									€{Number(p.Amount).toFixed(2)}
								</td>
								<td className='px-4 py-3 text-center'>
									<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
										p.Status === 'successful' ? 'bg-green-100 text-green-700' :
										p.Status === 'failed'     ? 'bg-red-100 text-red-600' :
										'bg-gray-100 text-gray-500'
									}`}>
										{p.Status}
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	const renderCommissionStats = () => {
		if (!commStats || !commStats.TotalOrders) return null;

		return (
			<div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6'>
				<h3 className='font-bold text-gray-900 mb-4'>Your Commission Summary</h3>
				<div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
					{[
						{ label: 'Total Orders', value: commStats.TotalOrders, icon: <TrendingUp size={16} />, color: 'text-blue-500' },
						{ label: 'Gross Revenue', value: `€${Number(commStats.TotalGross || 0).toFixed(2)}`, icon: <Euro size={16} />, color: 'text-gray-700' },
						{ label: 'Commission Paid', value: `€${Number(commStats.TotalCommission || 0).toFixed(2)}`, icon: <Percent size={16} />, color: 'text-red-500' },
						{ label: 'Net Revenue', value: `€${Number(commStats.TotalNet || 0).toFixed(2)}`, icon: <Euro size={16} />, color: 'text-green-600' },
					].map(({ label, value, icon, color }) => (
						<div key={label} className='bg-gray-50 rounded-xl p-4'>
							<div className={`flex items-center gap-1.5 mb-1 ${color}`}>{icon} <span className='text-xs font-medium text-gray-500 uppercase tracking-wide'>{label}</span></div>
							<p className={`text-xl font-bold ${color}`}>{value}</p>
						</div>
					))}
				</div>
			</div>
		);
	};

	const renderOtherPlans = () => (
		<div className='mt-8'>
			<h3 className='font-bold text-gray-900 mb-1'>Other Available Plans</h3>
			<p className='text-sm text-gray-500 mb-4'>
				{subscription?.PlanCode !== 'free' && subscription?.Status === 'active'
					? 'Switching will start the new plan after your current period ends.'
					: 'Upgrade to reduce your commission rate.'}
			</p>

			<div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-4'>
				{otherPlans.map((plan) => {
					const colors = colorVariants[plan.color];
					const isLocked = subscription?.Status === 'active' && subscription?.PlanCode !== 'free';

					return (
						<div
							key={plan.planCode}
							className={`relative bg-white rounded-2xl border ${
								plan.highlight ? `${colors.border} ring-2 ring-purple-200` : 'border-gray-100'
							} p-5 shadow-sm`}
						>
							{plan.highlight && (
								<span className='absolute -top-2.5 left-4 bg-purple-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full'>
									Popular
								</span>
							)}

							<h4 className='font-bold text-gray-900'>{plan.name}</h4>
							<div className='flex items-baseline gap-1 mt-1 mb-1'>
								<span className='text-xl font-extrabold text-gray-900'>
									{plan.price > 0 ? `€${plan.price.toLocaleString()}` : '€0'}
								</span>
								<span className='text-xs text-gray-400'>{plan.billing.replace(/^€[\d,]+ \/ /, '/ ')}</span>
							</div>
							<p className='text-sm font-semibold text-purple-600 mb-2'>{plan.commission} commission</p>
							<p className='text-xs text-gray-500 mb-4'>{plan.description}</p>

							{plan.planCode === 'free' ? (
								<button
									onClick={() => handleCancel()}
									disabled={cancelLoading}
									className='w-full text-sm text-gray-600 hover:text-gray-800 border border-gray-200 py-2 rounded-xl transition font-medium'
								>
									Downgrade to Free
								</button>
							) : plan.comingSoon ? (
								<div className='w-full text-center py-2 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed'>
									Coming Soon
								</div>
							) : (
								<button
									onClick={() => handleSwitchPlan(plan)}
									className={`w-full text-white text-sm font-semibold py-2 rounded-xl transition flex items-center justify-center gap-2 ${colors.btn}`}
								>
									{isLocked ? <Lock size={14} /> : null}
									{isLocked ? 'Schedule Switch' : `Subscribe`}
									<ChevronRight size={14} />
								</button>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);

	return (
		<>
			<NavBar />
			<div className='flex bg-gray-50 min-h-screen'>
				<SellerSidebar />

				<div className='flex-1 p-2 sm:p-6 overflow-y-auto'>
					{/* Page header */}
					<div className='flex items-center gap-3 mb-6'>
						<div className='w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center'>
							<CreditCard size={20} className='text-purple-600' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>Subscription</h1>
							<p className='text-sm text-gray-500'>Manage your plan and view billing history</p>
						</div>
					</div>

					{/* Payment failed warning */}
					{subscription?.Status === 'payment_failed' && (
						<div className='bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3'>
							<AlertTriangle size={20} className='text-red-500 flex-shrink-0 mt-0.5' />
							<div>
								<p className='font-semibold text-red-800'>Payment failed</p>
								<p className='text-sm text-red-600 mt-0.5'>
									We could not process your last payment. Please update your payment method to avoid losing your reduced commission rate.
								</p>
								<a
									href='https://billing.stripe.com'
									target='_blank'
									rel='noreferrer'
									className='text-sm text-red-700 font-medium underline mt-1 inline-block'
								>
									Update payment method
								</a>
							</div>
						</div>
					)}

					{/* Current plan */}
					<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-0'>
						{renderCurrentPlanCard()}
					</div>

					{/* Payment history */}
					{renderPaymentHistory()}

					{/* Commission stats */}
					{renderCommissionStats()}

					{/* Other plans */}
					{renderOtherPlans()}
				</div>
			</div>

			{/* Cancel confirmation modal */}
			{showCancelModal && (
				<div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4'>
					<div className='bg-white rounded-2xl shadow-xl max-w-md w-full p-6'>
						{/* Header */}
						<div className='flex items-center gap-3 mb-4'>
							<div className='w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0'>
								<AlertTriangle size={20} className='text-red-500' />
							</div>
							<h3 className='text-lg font-bold text-gray-900'>Cancel Subscription?</h3>
						</div>

						{/* What happens */}
						<div className='bg-gray-50 rounded-xl p-4 mb-5 space-y-3'>
							<p className='text-sm font-semibold text-gray-700'>Here's what will happen:</p>
							<ul className='space-y-2'>
								<li className='flex items-start gap-2 text-sm text-gray-600'>
									<Check size={15} className='text-green-500 flex-shrink-0 mt-0.5' />
									<span>Your <strong>{subscription?.PlanName}</strong> stays fully active until{' '}
									<strong>{formatDate(subscription?.CurrentPeriodEnd)}</strong></span>
								</li>
								<li className='flex items-start gap-2 text-sm text-gray-600'>
									<Check size={15} className='text-green-500 flex-shrink-0 mt-0.5' />
									<span>Your reduced commission rate continues until that date</span>
								</li>
								<li className='flex items-start gap-2 text-sm text-gray-600'>
									<X size={15} className='text-red-400 flex-shrink-0 mt-0.5' />
									<span>After that, you'll revert to the <strong>Free Plan</strong> at <strong>5% commission</strong></span>
								</li>
								<li className='flex items-start gap-2 text-sm text-gray-600'>
									<X size={15} className='text-red-400 flex-shrink-0 mt-0.5' />
									<span>No further charges — no refund for the current period</span>
								</li>
							</ul>
						</div>

						<div className='flex gap-3 justify-end'>
							<button
								onClick={() => setShowCancelModal(false)}
								disabled={cancelLoading}
								className='px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition'
							>
								Keep Subscription
							</button>
							<button
								onClick={confirmCancel}
								disabled={cancelLoading}
								className='px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition flex items-center gap-2 disabled:opacity-60'
							>
								{cancelLoading ? <Loader2 className='animate-spin' size={16} /> : <X size={16} />}
								{cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Switch confirmation modal */}
			{switchTarget && (
				<div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4'>
					<div className='bg-white rounded-2xl shadow-xl max-w-md w-full p-6'>
						<h3 className='text-lg font-bold text-gray-900 mb-3'>
							Switch to {switchTarget.name}?
						</h3>

						{subscription?.PlanCode !== 'free' && subscription?.CurrentPeriodEnd ? (
							<p className='text-sm text-gray-600 mb-4'>
								Your current plan will stay active until{' '}
								<strong>{formatDate(subscription.CurrentPeriodEnd)}</strong>.{' '}
								The new <strong>{switchTarget.name}</strong> ({switchTarget.commission} commission) will start billing automatically on that date.
								You will be taken to Stripe to set up payment for the new plan now.
							</p>
						) : (
							<p className='text-sm text-gray-600 mb-4'>
								You will be redirected to Stripe to subscribe to <strong>{switchTarget.name}</strong> ({switchTarget.billing}).
							</p>
						)}

						<div className='flex gap-3 justify-end mt-2'>
							<button
								onClick={() => setSwitchTarget(null)}
								className='px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition'
							>
								Cancel
							</button>
							<button
								onClick={confirmSwitch}
								disabled={switchLoading}
								className='px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition flex items-center gap-2 disabled:opacity-60'
							>
								{switchLoading ? <Loader2 className='animate-spin' size={16} /> : <Check size={16} />}
								{switchLoading ? 'Redirecting...' : 'Confirm & Continue'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default SellerSubscription;
