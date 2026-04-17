import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import banner1 from '../../assets/banner1.jpg';
import banner2 from '../../assets/banner2.jpg';
import banner3 from '../../assets/banner3.jpg';
import banner4 from '../../assets/banner4.jpg';

const slides = [
	{
		image: banner1,
		title: 'Discover European Excellence',
		subtitle: 'Premium products from trusted sellers across Europe',
		cta: 'Shop Now',
	},
	{
		image: banner2,
		title: 'Quality You Can Trust',
		subtitle: 'Verified sellers, authentic products, secure payments',
		cta: 'Explore',
	},
	{
		image: banner3,
		title: 'New Arrivals Weekly',
		subtitle: 'Fresh collections added every week from top brands',
		cta: 'See What\'s New',
	},
	{
		image: banner4,
		title: 'Free Shipping Available',
		subtitle: 'On selected items across the European Union',
		cta: 'Learn More',
	},
];

export default function HeroCarousel() {
	const [current, setCurrent] = useState(0);
	const [direction, setDirection] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setDirection(1);
			setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
		}, 6000);

		return () => clearInterval(timer);
	}, []);

	const goToSlide = (index) => {
		setDirection(index > current ? 1 : -1);
		setCurrent(index);
	};

	const goToPrev = () => {
		setDirection(-1);
		setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
	};

	const goToNext = () => {
		setDirection(1);
		setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
	};

	const slideVariants = {
		enter: (direction) => ({
			x: direction > 0 ? 1000 : -1000,
			opacity: 0,
		}),
		center: {
			zIndex: 1,
			x: 0,
			opacity: 1,
		},
		exit: (direction) => ({
			zIndex: 0,
			x: direction < 0 ? 1000 : -1000,
			opacity: 0,
		}),
	};

	return (
		<section className='relative w-full h-[50vh] sm:h-[55vh] lg:h-[60vh] rounded-2xl overflow-hidden shadow-2xl'>
			{/* Background Images with Animation */}
			<AnimatePresence initial={false} custom={direction}>
				<motion.div
					key={current}
					custom={direction}
					variants={slideVariants}
					initial='enter'
					animate='center'
					exit='exit'
					transition={{
						x: { type: 'spring', stiffness: 300, damping: 30 },
						opacity: { duration: 0.4 },
					}}
					className='absolute inset-0'
				>
					<img
						src={slides[current].image}
						alt={slides[current].title}
						className='w-full h-full object-cover'
					/>
				</motion.div>
			</AnimatePresence>

			{/* Gradient Overlay - EU Blue gradient */}
			<div className='absolute inset-0 bg-gradient-to-r from-primary-900/80 via-primary-800/60 to-transparent' />
			<div className='absolute inset-0 bg-gradient-to-t from-primary-900/50 via-transparent to-transparent' />

			{/* Content */}
			<div className='absolute inset-0 flex items-center'>
				<div className='max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 w-full'>
					<AnimatePresence mode='wait'>
						<motion.div
							key={current}
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -30 }}
							transition={{ duration: 0.5 }}
							className='max-w-xl'
						>
							{/* Badge */}
							<motion.div
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.2 }}
								className='inline-flex items-center gap-2 bg-secondary-500/90 text-primary-900 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-4 shadow-lg'
							>
								<Sparkles size={14} />
								European Marketplace
							</motion.div>

							{/* Title */}
							<h1 className='text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight'>
								{slides[current].title}
							</h1>

							{/* Subtitle */}
							<p className='text-base sm:text-lg lg:text-xl text-gray-200 mb-6 sm:mb-8 leading-relaxed'>
								{slides[current].subtitle}
							</p>

							{/* CTA Button */}
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className='bg-secondary-500 hover:bg-secondary-400 text-primary-900 font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-lg transition-all duration-300 text-sm sm:text-base'
							>
								{slides[current].cta}
							</motion.button>
						</motion.div>
					</AnimatePresence>
				</div>
			</div>

			{/* Navigation Arrows */}
			<button
				onClick={goToPrev}
				className='absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-300 group'
				aria-label='Previous slide'
			>
				<ChevronLeft size={24} className='group-hover:-translate-x-0.5 transition-transform' />
			</button>
			<button
				onClick={goToNext}
				className='absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-300 group'
				aria-label='Next slide'
			>
				<ChevronRight size={24} className='group-hover:translate-x-0.5 transition-transform' />
			</button>

			{/* Slide Indicators */}
			<div className='absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3'>
				{slides.map((_, idx) => (
					<button
						key={idx}
						onClick={() => goToSlide(idx)}
						className={`transition-all duration-300 rounded-full ${
							idx === current
								? 'w-8 sm:w-10 h-2.5 sm:h-3 bg-secondary-500'
								: 'w-2.5 sm:w-3 h-2.5 sm:h-3 bg-white/50 hover:bg-white/70'
						}`}
						aria-label={`Go to slide ${idx + 1}`}
					/>
				))}
			</div>

			{/* Decorative Elements */}
			<div className='absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-secondary-500/10 to-transparent pointer-events-none' />
		</section>
	);
}
