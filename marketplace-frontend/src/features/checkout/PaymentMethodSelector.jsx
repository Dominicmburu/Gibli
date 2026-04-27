import { useState } from 'react';
import { CreditCard, Building2, X, Loader2, ShieldCheck, Info, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

// ── Fee helpers (mirrors backend calcFeeCents) ──────────────────────────────
const STRIPE_RATE  = 0.015;
const STRIPE_FIXED = 0.25;
const SEPA_RATE    = 0.008;
const SEPA_CAP     = 5.00;
const PAYPAL_RATE  = 0.0349;
const PAYPAL_FIXED = 0.49;

function calcFee(subtotal, method) {
	if (method === 'sepa') {
		return Math.min(parseFloat((subtotal * SEPA_RATE).toFixed(2)), SEPA_CAP);
	}
	if (method === 'paypal') {
		return parseFloat((subtotal * PAYPAL_RATE + PAYPAL_FIXED).toFixed(2));
	}
	// card
	return parseFloat(((subtotal + STRIPE_FIXED) / (1 - STRIPE_RATE) - subtotal).toFixed(2));
}

// ── PayPal logo SVG ──────────────────────────────────────────────────────────
const PayPalLogo = () => (
	<svg viewBox='0 0 101 32' className='h-6 w-auto' fill='none' xmlns='http://www.w3.org/2000/svg'>
		<path d='M12.237 2.785H5.687a.872.872 0 0 0-.863.737L2.154 23.85a.524.524 0 0 0 .518.606h3.322a.872.872 0 0 0 .863-.738l.655-4.154a.872.872 0 0 1 .863-.737h2.073c4.314 0 6.804-2.087 7.451-6.222.293-1.81.012-3.23-.832-4.226-.928-1.09-2.573-1.594-4.83-1.594z' fill='#253B80'/>
		<path d='M13.08 8.356c-.217 1.425-.868 2.424-1.943 2.983-.505.263-1.082.394-1.73.394H7.734l-.823 5.22-.023.148a.524.524 0 0 0 .517.606h2.495a.766.766 0 0 0 .757-.647l.031-.163.6-3.808.039-.21a.766.766 0 0 1 .757-.647h.477c3.087 0 5.505-1.254 6.211-4.879.295-1.515.142-2.78-.638-3.671a3.042 3.042 0 0 0-.854-.651c-.206 1.627-.739 2.73-1.2 3.325z' fill='#179BD7'/>
		<path d='M12.237 8.019a5.43 5.43 0 0 0-.668-.1 8.474 8.474 0 0 0-1.347-.1H7.009a.767.767 0 0 0-.757.648L5.19 15.14l-.023.148a.872.872 0 0 1 .863-.737h1.783c.648 0 1.225-.131 1.73-.394 1.075-.56 1.726-1.558 1.943-2.983.46-.595.994-1.698 1.2-3.325a5.134 5.134 0 0 0-.449-.83z' fill='#222D65'/>
		<path d='M38.688 8.002h-6.547a.872.872 0 0 0-.863.737l-2.67 16.928a.524.524 0 0 0 .518.606h3.14a.61.61 0 0 0 .604-.516l.758-4.808a.872.872 0 0 1 .863-.737h2.073c4.314 0 6.804-2.087 7.451-6.222.293-1.81.012-3.23-.832-4.226-.928-1.09-2.573-1.594-4.83-1.594l.335-.168zm.843 6.13c-.358 2.35-2.153 2.35-3.889 2.35h-.987l.693-4.385a.524.524 0 0 1 .518-.443h.452c1.182 0 2.297 0 2.873.674.345.402.45.997.34 1.804z' fill='#253B80'/>
		<path d='M55.89 14.068h-3.146a.524.524 0 0 0-.518.443l-.133.843-.211-.306c-.654-.949-2.113-1.266-3.57-1.266-3.339 0-6.191 2.53-6.747 6.078-.289 1.77.122 3.461 1.124 4.641.92 1.083 2.236 1.534 3.803 1.534 2.693 0 4.188-1.73 4.188-1.73l-.134.838a.524.524 0 0 0 .518.605h2.834a.872.872 0 0 0 .863-.737l1.701-10.774a.524.524 0 0 0-.572-.169zm-4.385 5.876c-.292 1.728-1.665 2.89-3.413 2.89-.877 0-1.58-.282-2.03-.815-.447-.529-.616-1.283-.474-2.121.273-1.714 1.667-2.912 3.39-2.912.858 0 1.557.284 2.015.822.461.542.643 1.3.512 2.136z' fill='#253B80'/>
		<path d='M72.678 14.068h-3.161a.873.873 0 0 0-.72.38l-4.157 6.12-1.762-5.882a.872.872 0 0 0-.837-.618h-3.104a.524.524 0 0 0-.497.695l3.319 9.738-3.12 4.408a.524.524 0 0 0 .428.826h3.158a.871.871 0 0 0 .717-.375l10.02-14.472a.524.524 0 0 0-.284-.82z' fill='#253B80'/>
		<path d='M80.85 8.002h-6.547a.872.872 0 0 0-.863.737L70.77 25.667a.524.524 0 0 0 .518.606h3.38a.61.61 0 0 0 .604-.516l.758-4.808a.872.872 0 0 1 .863-.737h2.073c4.314 0 6.804-2.087 7.451-6.222.293-1.81.012-3.23-.832-4.226-.928-1.09-2.573-1.594-4.83-1.594l.095-.168zm.843 6.13c-.358 2.35-2.153 2.35-3.889 2.35h-.987l.693-4.385a.524.524 0 0 1 .518-.443h.452c1.182 0 2.297 0 2.873.674.345.402.45.997.34 1.804z' fill='#179BD7'/>
		<path d='M98.053 14.068h-3.147a.524.524 0 0 0-.518.443l-.133.843-.21-.306c-.655-.949-2.113-1.266-3.571-1.266-3.339 0-6.191 2.53-6.747 6.078-.288 1.77.122 3.461 1.124 4.641.921 1.083 2.236 1.534 3.804 1.534 2.693 0 4.188-1.73 4.188-1.73l-.135.838a.524.524 0 0 0 .519.605h2.833a.872.872 0 0 0 .863-.737l1.702-10.774a.524.524 0 0 0-.572-.169zm-4.385 5.876c-.291 1.728-1.664 2.89-3.413 2.89-.876 0-1.58-.282-2.03-.815-.446-.529-.615-1.283-.474-2.121.274-1.714 1.668-2.912 3.39-2.912.859 0 1.557.284 2.016.822.46.542.643 1.3.511 2.136z' fill='#179BD7'/>
		<path d='M101.504 8.418l-2.71 17.249a.524.524 0 0 0 .518.606h2.713a.872.872 0 0 0 .863-.738l2.672-16.928a.524.524 0 0 0-.518-.606h-3.02a.524.524 0 0 0-.518.417z' fill='#179BD7'/>
	</svg>
);

// ── SEPA bank icon ───────────────────────────────────────────────────────────
const SepaIcon = () => (
	<div className='flex items-center gap-1'>
		<Building2 size={22} className='text-green-600' />
		<span className='text-xs font-bold text-green-700 tracking-wide'>SEPA</span>
	</div>
);

// ────────────────────────────────────────────────────────────────────────────
// PaymentMethodSelector
// Props:
//   isOpen       – boolean
//   onClose      – () => void
//   subtotal     – number (order total in EUR, without fee)
//   draftId      – string
//   onSuccess    – () => void  (called after successful payment of any kind)
// ────────────────────────────────────────────────────────────────────────────
const PaymentMethodSelector = ({ isOpen, onClose, subtotal, draftId, onSuccess }) => {
	const navigate  = useNavigate();
	const [selected, setSelected]       = useState(null); // 'card' | 'sepa' | 'paypal'
	const [stripeLoading, setStripeLoading] = useState(false);

	if (!isOpen) return null;

	const cardFee   = calcFee(subtotal, 'card');
	const sepaFee   = calcFee(subtotal, 'sepa');
	const paypalFee = calcFee(subtotal, 'paypal');

	// ── Stripe (card or SEPA) ─────────────────────────────────────────────
	const handleStripePay = async (method) => {
		setStripeLoading(true);
		try {
			const res = await api.post('/checkout/create-session', { draftId, paymentMethod: method });
			toast.success('Redirecting to secure payment...');
			window.location.href = res.data.url;
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
			setStripeLoading(false);
		}
	};

	// ── Method card config ────────────────────────────────────────────────
	const methods = [
		{
			id:          'card',
			label:       'Credit / Debit Card',
			description: 'Visa, Mastercard, Amex — secured by Stripe',
			fee:         cardFee,
			feeNote:     '1.5% + €0.25 processing fee',
			total:       subtotal + cardFee,
			icon:        <CreditCard size={22} className='text-blue-600' />,
			border:      'border-blue-200',
			selectedBg:  'bg-blue-50 border-blue-500',
			feeBadge:    'bg-blue-100 text-blue-700',
		},
		{
			id:          'sepa',
			label:       'SEPA Direct Debit',
			description: 'Debit from any European bank account',
			fee:         sepaFee,
			feeNote:     '0.8% processing fee (max €5.00)',
			total:       subtotal + sepaFee,
			icon:        <SepaIcon />,
			border:      'border-green-200',
			selectedBg:  'bg-green-50 border-green-500',
			feeBadge:    'bg-green-100 text-green-700',
		},
		{
			id:          'paypal',
			label:       'PayPal',
			description: 'Pay securely with your PayPal account',
			fee:         paypalFee,
			feeNote:     '3.49% + €0.49 processing fee',
			total:       subtotal + paypalFee,
			icon:        <PayPalLogo />,
			border:      'border-yellow-200',
			selectedBg:  'bg-yellow-50 border-yellow-500',
			feeBadge:    'bg-yellow-100 text-yellow-700',
			comingSoon:  true,
		},
	];

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
			{/* Backdrop */}
			<div
				className='absolute inset-0 bg-black/50 backdrop-blur-sm'
				onClick={() => !stripeLoading && onClose()}
			/>

			{/* Modal */}
			<div className='relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>
				{/* Header */}
				<div className='flex items-center justify-between p-5 border-b border-gray-100'>
					<div>
						<h2 className='text-lg font-bold text-gray-900'>Choose Payment Method</h2>
						<p className='text-sm text-gray-500 mt-0.5'>
							Order total: <span className='font-semibold text-gray-800'>€{subtotal.toFixed(2)}</span>
						</p>
					</div>
					<button
						onClick={onClose}
						disabled={stripeLoading}
						className='text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40'
					>
						<X size={22} />
					</button>
				</div>

				{/* Fee notice banner */}
				<div className='mx-5 mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5'>
					<Info size={16} className='text-amber-600 flex-shrink-0 mt-0.5' />
					<p className='text-xs text-amber-800 leading-relaxed'>
						A small processing fee is applied by the payment provider. The fee varies by method and is shown below.
					</p>
				</div>

				{/* Payment method cards */}
				<div className='p-5 space-y-3'>
					{methods.map((method) => {
						const isSelected = selected === method.id;
						return (
							<div key={method.id}>
								<button
									type='button'
									onClick={() => !method.comingSoon && setSelected(method.id)}
									disabled={stripeLoading || method.comingSoon}
									className={`w-full text-left rounded-xl border-2 p-4 transition-all focus:outline-none ${
										method.comingSoon
											? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
											: isSelected
												? method.selectedBg
												: `border-gray-200 hover:${method.border} hover:bg-gray-50`
									} ${stripeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
								>
									<div className='flex items-start justify-between gap-3'>
										{/* Left: icon + labels */}
										<div className='flex items-center gap-3 flex-1 min-w-0'>
											{/* Radio dot */}
											<div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
												isSelected ? 'border-primary-500' : 'border-gray-300'
											}`}>
												{isSelected && <div className='w-2.5 h-2.5 rounded-full bg-primary-500' />}
											</div>

											<div className='min-w-0'>
												<div className='flex items-center gap-2 flex-wrap'>
													{method.icon}
													<span className='font-semibold text-gray-900 text-sm'>{method.label}</span>
												</div>
												<p className='text-xs text-gray-500 mt-0.5'>{method.description}</p>
											</div>
										</div>

										{/* Right: fee badge or coming soon */}
										<div className='flex-shrink-0 text-right'>
											{method.comingSoon ? (
												<span className='inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500'>
													<Clock size={11} /> Coming Soon
												</span>
											) : (
												<span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${method.feeBadge}`}>
													+€{method.fee.toFixed(2)} fee
												</span>
											)}
										</div>
									</div>

									{/* Expanded: fee breakdown + action */}
									{isSelected && (
										<div className='mt-3 pt-3 border-t border-gray-200 space-y-2'>
											<div className='flex justify-between text-xs text-gray-600'>
												<span>Subtotal</span>
												<span>€{subtotal.toFixed(2)}</span>
											</div>
											<div className='flex justify-between text-xs text-gray-600'>
												<span>{method.feeNote}</span>
												<span>€{method.fee.toFixed(2)}</span>
											</div>
											<div className='flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100'>
												<span>Total charged</span>
												<span>€{method.total.toFixed(2)}</span>
											</div>
										</div>
									)}
								</button>

								{/* Stripe card — pay button */}
								{isSelected && method.id === 'card' && (
									<button
										onClick={() => handleStripePay('card')}
										disabled={stripeLoading}
										className='mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2'
									>
										{stripeLoading ? (
											<><Loader2 size={18} className='animate-spin' /> Processing...</>
										) : (
											<><ShieldCheck size={18} /> Pay €{method.total.toFixed(2)} with Card</>
										)}
									</button>
								)}

								{/* SEPA — pay button */}
								{isSelected && method.id === 'sepa' && (
									<div className='mt-2 space-y-2'>
										<div className='bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 leading-relaxed'>
											<strong>SEPA Direct Debit:</strong> You will be asked to authorise a debit from your bank account on the next screen. Payments typically clear within 1–3 business days.
										</div>
										<button
											onClick={() => handleStripePay('sepa')}
											disabled={stripeLoading}
											className='w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2'
										>
											{stripeLoading ? (
												<><Loader2 size={18} className='animate-spin' /> Processing...</>
											) : (
												<><ShieldCheck size={18} /> Pay €{method.total.toFixed(2)} with SEPA</>
											)}
										</button>
									</div>
								)}

							</div>
						);
					})}
				</div>

				{/* Footer */}
				<div className='px-5 pb-5 flex items-center justify-center gap-2 text-xs text-gray-400'>
					<ShieldCheck size={14} />
					<span>All payments are encrypted and secure</span>
				</div>
			</div>
		</div>
	);
};

export default PaymentMethodSelector;
