import { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

const TOUR_STEPS = [
	// ── Round 1: Welcome ──────────────────────────────────────────
	{
		target: null,
		title: 'Welcome to Your Seller Dashboard!',
		description: "Let's take a quick tour of everything available to you. Use the arrows to navigate.",
		position: 'center',
	},
	// ── Round 2: Sidebar navigation ───────────────────────────────
	{
		target: '[data-tour="sidebar-dashboard"]',
		title: 'Dashboard',
		description: 'Your main overview. Come here for a quick summary of your store performance.',
		position: 'right',
	},
	{
		target: '[data-tour="sidebar-add-product"]',
		title: 'Add Product',
		description: 'List a new product for sale. Add photos, set pricing, and manage stock.',
		position: 'right',
	},
	{
		target: '[data-tour="sidebar-my-products"]',
		title: 'My Products',
		description: 'View and manage all your listed products, update prices, stock, and details.',
		position: 'right',
	},
	{
		target: '[data-tour="sidebar-needs-restock"]',
		title: 'Needs Restock',
		description: 'Products that are running low or flagged for restocking appear here so you can act quickly.',
		position: 'right',
	},
	{
		target: '[data-tour="sidebar-orders"]',
		title: 'Orders',
		description: 'Incoming orders from buyers appear here. Confirm, ship, or manage orders.',
		position: 'right',
	},
	{
		target: '[data-tour="sidebar-subscription"]',
		title: 'Subscription',
		description: 'Manage your subscription plan here. Your plan determines your commission rate.',
		position: 'right',
	},
	{
		target: '[data-tour="sidebar-store-settings"]',
		title: 'Store Settings',
		description: 'Update your store details, snooze your store, or manage your business information.',
		position: 'right',
	},
	// ── Round 3: Dashboard stat cards ─────────────────────────────
	{
		target: '[data-tour="stat-products"]',
		title: 'Products',
		description: 'See how many products you have listed. Click to manage your inventory.',
		position: 'bottom',
	},
	{
		target: '[data-tour="stat-items-sold"]',
		title: 'Items Sold',
		description: 'Total items successfully sold after the 14-day refund window has passed.',
		position: 'bottom',
	},
	{
		target: '[data-tour="stat-revenue"]',
		title: 'Revenue',
		description: 'Your total earnings from completed sales. Click for a full revenue breakdown.',
		position: 'bottom',
	},
	{
		target: '[data-tour="stat-store-status"]',
		title: 'Store Status',
		description: 'Shows whether your store is Active or Snoozed. Click to manage store settings.',
		position: 'bottom',
	},
	{
		target: '[data-tour="stat-subscription"]',
		title: 'Subscription',
		description: 'Your current plan and commission rate. Click to view or change your plan.',
		position: 'bottom',
	},
	// ── Round 4: Recent products + finish ─────────────────────────
	{
		target: '[data-tour="recent-products"]',
		title: 'Your Products',
		description: "A quick glance at your most recently listed products. Click 'Add Product' in the sidebar anytime to list a new item.",
		position: 'top',
	},
	{
		target: null,
		title: "You're All Set!",
		description:
			"You've completed the tour. Explore your dashboard freely. Click the ? button anytime to replay this tour.",
		position: 'center',
	},
];

const PADDING = 10;

const SellerTour = ({ onFinish }) => {
	const [step, setStep] = useState(0);
	const [rect, setRect] = useState(null);

	const current = TOUR_STEPS[step];
	const isFirst = step === 0;
	const isLast = step === TOUR_STEPS.length - 1;

	const measureTarget = useCallback(() => {
		if (!current.target) {
			setRect(null);
			return;
		}
		const el = document.querySelector(current.target);
		if (!el) {
			setRect(null);
			return;
		}
		const r = el.getBoundingClientRect();
		setRect({
			top: r.top - PADDING,
			left: r.left - PADDING,
			width: r.width + PADDING * 2,
			height: r.height + PADDING * 2,
		});
		el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}, [step]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		const t = setTimeout(measureTarget, 200);
		return () => clearTimeout(t);
	}, [measureTarget]);

	// Re-measure on window resize
	useEffect(() => {
		window.addEventListener('resize', measureTarget);
		return () => window.removeEventListener('resize', measureTarget);
	}, [measureTarget]);

	const handleNext = () => {
		if (isLast) {
			finish();
		} else {
			setStep((s) => s + 1);
		}
	};

	const handlePrev = () => {
		if (!isFirst) setStep((s) => s - 1);
	};

	const finish = () => {
		localStorage.setItem('sellerTourComplete', '1');
		onFinish();
	};

	// Tooltip placement relative to the highlighted element
	const getTooltipStyle = () => {
		if (!rect || current.position === 'center') {
			return {
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
				zIndex: 10001,
				maxWidth: 340,
			};
		}

		const MARGIN = 14;
		const TOOLTIP_W = 320;
		const TOOLTIP_H = 220; // approximate

		switch (current.position) {
			case 'bottom':
				return {
					position: 'fixed',
					top: Math.min(rect.top + rect.height + MARGIN, window.innerHeight - TOOLTIP_H - 8),
					left: Math.max(8, Math.min(rect.left, window.innerWidth - TOOLTIP_W - 8)),
					zIndex: 10001,
					maxWidth: TOOLTIP_W,
				};
			case 'top':
				return {
					position: 'fixed',
					top: Math.max(8, rect.top - TOOLTIP_H - MARGIN),
					left: Math.max(8, Math.min(rect.left, window.innerWidth - TOOLTIP_W - 8)),
					zIndex: 10001,
					maxWidth: TOOLTIP_W,
				};
			case 'right':
				return {
					position: 'fixed',
					top: Math.max(8, Math.min(rect.top, window.innerHeight - TOOLTIP_H - 8)),
					left: Math.min(rect.left + rect.width + MARGIN, window.innerWidth - TOOLTIP_W - 8),
					zIndex: 10001,
					maxWidth: TOOLTIP_W,
				};
			default:
				return {
					position: 'fixed',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					zIndex: 10001,
					maxWidth: 340,
				};
		}
	};

	return (
		<>
			{/* Overlay with spotlight */}
			<div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
				{rect ? (
					<svg
						style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}
						onClick={(e) => e.stopPropagation()}
					>
						<defs>
							<mask id='tour-mask'>
								{/* Full white = dark overlay everywhere */}
								<rect x='0' y='0' width='100%' height='100%' fill='white' />
								{/* Black rectangle = transparent "spotlight" hole */}
								<rect
									x={rect.left}
									y={rect.top}
									width={rect.width}
									height={rect.height}
									rx='10'
									fill='black'
								/>
							</mask>
						</defs>
						<rect
							x='0'
							y='0'
							width='100%'
							height='100%'
							fill='rgba(0,0,0,0.62)'
							mask='url(#tour-mask)'
						/>
					</svg>
				) : (
					<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)' }} />
				)}
			</div>

			{/* Tooltip card */}
			<div
				style={getTooltipStyle()}
				className='bg-white rounded-2xl shadow-2xl p-6 w-80'
			>
				{/* Step counter + close */}
				<div className='flex items-start justify-between mb-3'>
					<div>
						<p className='text-xs text-gray-400 font-medium mb-0.5'>
							{step + 1} / {TOUR_STEPS.length}
						</p>
						<h3 className='text-base font-bold text-gray-900 leading-snug'>{current.title}</h3>
					</div>
					<button
						onClick={finish}
						className='ml-3 flex-shrink-0 text-gray-300 hover:text-gray-500 transition'
						aria-label='Skip tour'
					>
						<X size={18} />
					</button>
				</div>

				{/* Description */}
				<p className='text-sm text-gray-600 leading-relaxed mb-5'>{current.description}</p>

				{/* Progress dots */}
				<div className='flex gap-1.5 mb-5 flex-wrap'>
					{TOUR_STEPS.map((_, i) => (
						<button
							key={i}
							onClick={() => setStep(i)}
							className={`h-1.5 rounded-full transition-all ${
								i === step ? 'bg-primary-500 w-4' : 'bg-gray-200 w-1.5 hover:bg-gray-300'
							}`}
							aria-label={`Go to step ${i + 1}`}
						/>
					))}
				</div>

				{/* Navigation */}
				<div className='flex items-center justify-between'>
					<button
						onClick={handlePrev}
						disabled={isFirst}
						className='flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-0 transition'
					>
						<ArrowLeft size={14} />
						Back
					</button>
					<button
						onClick={handleNext}
						className='flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition'
					>
						{isLast ? 'Finish' : 'Next'}
						{!isLast && <ArrowRight size={14} />}
					</button>
				</div>
			</div>
		</>
	);
};

export default SellerTour;
