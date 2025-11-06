import { Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
	return (
		<footer className='bg-[#6b5200] text-white py-10 mt-10'>
			<div className='max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8'>
				{/* --- Brand / About --- */}
				<div>
					<h2 className='text-2xl font-bold mb-3'>Marketplace</h2>
					<p className='text-sm text-gray-200 leading-relaxed'>
						Your trusted destination for discovering and selling quality products. We connect buyers and
						sellers with ease and transparency.
					</p>
				</div>

				{/* --- Quick Links --- */}
				<div>
					<h3 className='text-lg font-semibold mb-3'>Quick Links</h3>
					<ul className='space-y-2 text-sm'>
						<li>
							<Link to='/' className='hover:underline'>
								Home
							</Link>
						</li>
						<li>
							<Link to='/products' className='hover:underline'>
								Products
							</Link>
						</li>
						<li>
							<Link to='/about' className='hover:underline'>
								About Us
							</Link>
						</li>
						<li>
							<Link to='/contact' className='hover:underline'>
								Contact
							</Link>
						</li>
					</ul>
				</div>

				{/* --- Contact & Socials --- */}
				<div>
					<h3 className='text-lg font-semibold mb-3'>Get in Touch</h3>
					<ul className='text-sm space-y-2'>
						<li className='flex items-center gap-2'>
							<Mail size={16} />
							<span>support@marketplace.com</span>
						</li>
						<li className='flex items-center gap-2'>
							<Phone size={16} />
							<span>+254 700 123 456</span>
						</li>
					</ul>

					<div className='flex space-x-4 mt-4'>
						<a href='#' className='hover:text-gray-200'>
							<Facebook size={20} />
						</a>
						<a href='#' className='hover:text-gray-200'>
							<Twitter size={20} />
						</a>
						<a href='#' className='hover:text-gray-200'>
							<Instagram size={20} />
						</a>
					</div>
				</div>
			</div>

			{/* --- Divider & Copyright --- */}
			<div className='border-t border-green-900 mt-10 pt-4 text-center text-sm text-gray-200'>
				<p>&copy; {new Date().getFullYear()} Marketplace. All rights reserved. | Designed with ❤️ by DEV.ANS</p>
			</div>
		</footer>
	);
};

export default Footer;
