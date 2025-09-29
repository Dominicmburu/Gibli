import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import banner1 from '../../assets/banner1.jpg';
import banner2 from '../../assets/banner2.jpg';
import banner3 from '../../assets/banner3.jpg';
import banner4 from '../../assets/banner4.jpg';
const images = [banner1, banner2, banner3, banner4];

export default function HeroCarousel() {
	const [current, setCurrent] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
		}, 5000); // auto-slide every 5s

		return () => clearInterval(timer);
	}, []);

	return (
		<section className='relative w-full h-[80vh] overflow-hidden'>
			{images.map((img, index) => (
				<motion.img
					key={index}
					src={img}
					alt={`Slide ${index}`}
					initial={{ opacity: 0 }}
					animate={{ opacity: current === index ? 1 : 0 }}
					transition={{ duration: 0.8 }}
					className='absolute top-0 left-0 w-full h-full object-cover'
				/>
			))}

			{/* Overlay content */}
			<div className='absolute inset-0 bg-black/40 flex items-center justify-center text-center px-4'>
				<motion.div
					key={current}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7 }}
					className='text-white max-w-2xl'
				>
					<h1 className='text-3xl md:text-5xl font-bold mb-4'>Welcome to Our Store</h1>
					<p className='text-lg md:text-xl mb-6'>Discover the best products from all over Europe</p>
					{/* <button className='px-6 py-3 bg-green-700 hover:bg-green-800 rounded-2xl shadow-md'>
						Shop Now
					</button> */}
				</motion.div>
			</div>

			{/* Indicators */}
			<div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2'>
				{images.map((_, idx) => (
					<button
						key={idx}
						onClick={() => setCurrent(idx)}
						className={`w-3 h-3 rounded-full transition-colors duration-300 ${
							idx === current ? 'bg-white' : 'bg-gray-400'
						}`}
					></button>
				))}
			</div>
		</section>
	);
}
