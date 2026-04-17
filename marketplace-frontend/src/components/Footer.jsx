import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, CreditCard, Truck, Shield, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
	const { t } = useTranslation();

	return (
		<footer className='bg-gradient-to-b from-primary-800 to-primary-900 text-white mt-auto'>
			{/* Features Bar */}
			<div className='bg-primary-700/50 border-b border-primary-600/30'>
				<div className='max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-6'>
					<div className='grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8'>
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-secondary-400/20 rounded-xl flex items-center justify-center'>
								<Truck size={20} className='text-secondary-400' />
							</div>
							<div>
								<p className='font-semibold text-sm'>{t('footer.shipping.title')}</p>
								<p className='text-xs text-primary-200'>{t('footer.shipping.subtitle')}</p>
							</div>
						</div>
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-secondary-400/20 rounded-xl flex items-center justify-center'>
								<Shield size={20} className='text-secondary-400' />
							</div>
							<div>
								<p className='font-semibold text-sm'>{t('footer.payment.title')}</p>
								<p className='text-xs text-primary-200'>{t('footer.payment.subtitle')}</p>
							</div>
						</div>
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-secondary-400/20 rounded-xl flex items-center justify-center'>
								<CreditCard size={20} className='text-secondary-400' />
							</div>
							<div>
								<p className='font-semibold text-sm'>{t('footer.returns.title')}</p>
								<p className='text-xs text-primary-200'>{t('footer.returns.subtitle')}</p>
							</div>
						</div>
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-secondary-400/20 rounded-xl flex items-center justify-center'>
								<Phone size={20} className='text-secondary-400' />
							</div>
							<div>
								<p className='font-semibold text-sm'>{t('footer.support.title')}</p>
								<p className='text-xs text-primary-200'>{t('footer.support.subtitle')}</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Main Footer Content */}
			<div className='max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-16'>
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12'>
					{/* Brand / About */}
					<div>
						<Link to='/' className='inline-block mb-4'>
							<h2 className='text-2xl lg:text-3xl font-bold'>
								<span className='text-white'>Gib</span>
								<span className='text-secondary-400'>Li</span>
							</h2>
						</Link>
						<p className='text-sm text-primary-200 leading-relaxed mb-6'>
							{t('footer.tagline')}
						</p>
						{/* Social Links */}
						<div className='flex items-center gap-3'>
							<a href='#' className='w-10 h-10 bg-primary-700 hover:bg-secondary-500 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110' aria-label='Facebook'>
								<Facebook size={18} />
							</a>
							<a href='#' className='w-10 h-10 bg-primary-700 hover:bg-secondary-500 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110' aria-label='Twitter'>
								<Twitter size={18} />
							</a>
							<a href='#' className='w-10 h-10 bg-primary-700 hover:bg-secondary-500 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110' aria-label='Instagram'>
								<Instagram size={18} />
							</a>
						</div>
					</div>

					{/* Quick Links */}
					<div>
						<h3 className='text-lg font-bold mb-5 flex items-center gap-2'>
							<div className='w-1 h-5 bg-secondary-400 rounded-full'></div>
							{t('footer.quickLinks')}
						</h3>
						<ul className='space-y-3'>
							{[
								{ to: '/', key: 'home' },
								{ to: '/about', key: 'about' },
								{ to: '/contact', key: 'contact' },
								{ to: '/faq', key: 'faq' },
								{ to: '/shipping', key: 'shipping' },
								{ to: '/returns', key: 'returns' },
							].map((link) => (
								<li key={link.to}>
									<Link to={link.to} className='text-primary-200 hover:text-secondary-400 transition-colors flex items-center gap-2 group text-sm'>
										<ChevronRight size={14} className='opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all' />
										{t(`footer.links.${link.key}`)}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Contact Info */}
					<div>
						<h3 className='text-lg font-bold mb-5 flex items-center gap-2'>
							<div className='w-1 h-5 bg-secondary-400 rounded-full'></div>
							{t('footer.getInTouch')}
						</h3>
						<ul className='space-y-4'>
							<li>
								<a href='mailto:support@gibli.eu' className='flex items-start gap-3 text-primary-200 hover:text-secondary-400 transition-colors group'>
									<div className='w-8 h-8 bg-primary-700 group-hover:bg-secondary-500/20 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors'>
										<Mail size={14} className='group-hover:text-secondary-400' />
									</div>
									<div>
										<p className='text-xs text-primary-300'>{t('footer.emailUs')}</p>
										<p className='text-sm font-medium'>support@gibli.eu</p>
									</div>
								</a>
							</li>
							<li>
								<a href='tel:+254700123456' className='flex items-start gap-3 text-primary-200 hover:text-secondary-400 transition-colors group'>
									<div className='w-8 h-8 bg-primary-700 group-hover:bg-secondary-500/20 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors'>
										<Phone size={14} className='group-hover:text-secondary-400' />
									</div>
									<div>
										<p className='text-xs text-primary-300'>{t('footer.callUs')}</p>
										<p className='text-sm font-medium'>+254 700 123 456</p>
									</div>
								</a>
							</li>
							<li>
								<div className='flex items-start gap-3 text-primary-200'>
									<div className='w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center flex-shrink-0'>
										<MapPin size={14} />
									</div>
									<div>
										<p className='text-xs text-primary-300'>{t('footer.location')}</p>
										<p className='text-sm font-medium'>{t('footer.locationValue')}</p>
									</div>
								</div>
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Bottom Bar */}
			<div className='border-t border-primary-700/50'>
				<div className='max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-3 sm:py-6'>
					<div className='flex flex-col md:flex-row justify-between items-center gap-4'>
						<p className='text-sm text-primary-300'>
							{t('footer.copyright', { year: new Date().getFullYear() })}
						</p>
						<div className='flex items-center gap-6 text-sm text-primary-300'>
							<Link to='/privacy' className='hover:text-secondary-400 transition-colors'>{t('footer.privacyPolicy')}</Link>
							<Link to='/terms' className='hover:text-secondary-400 transition-colors'>{t('footer.termsOfService')}</Link>
						</div>
						<p className='text-xs text-primary-400'>
							{t('footer.designedBy')} <span className='text-secondary-400 font-medium'>DEV.ANS&DEV.D</span>
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
