import { useState } from 'react';
import { X, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Footer from '../../../components/Footer';
import Navbar from '../../../components/NavBar';
import ProductList from './ProductList';
import HeroCarousel from '../../hero/HeroCarousel';
import CategorySideBar from '../../filters/categories/CategorySideBar';

const Home = () => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const { t } = useTranslation();

	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	return (
		<div className='min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-primary-50/30 w-full'>
			<Navbar />

			{/* Mobile/Tablet: Floating Filter Button (hidden on desktop) */}
			<button
				onClick={toggleSidebar}
				className='lg:hidden fixed bottom-6 right-4 sm:right-6 z-50 bg-gradient-to-r from-secondary-400 to-secondary-500 hover:from-secondary-500 hover:to-secondary-600 text-primary-900 p-3 sm:p-4 rounded-2xl shadow-xl shadow-secondary-500/30 transition-all duration-300 flex items-center gap-2 hover:scale-105'
				aria-label='Toggle filters'
			>
				<Filter size={20} className='sm:w-5 sm:h-5' />
				<span className='font-semibold text-sm sm:text-base'>{t('home.filterButton')}</span>
			</button>

			{/* Mobile/Tablet: Overlay */}
			{isSidebarOpen && (
				<div
					className='fixed inset-0 bg-primary-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300'
					onClick={toggleSidebar}
					aria-hidden='true'
				/>
			)}

			{/* Main Content Wrapper */}
			<div className='flex flex-1 relative'>
				{/* Sidebar - Responsive behavior for all screen sizes */}
				<aside
					className={`
            fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-auto
            w-72 sm:w-80 lg:w-64 xl:w-72
            bg-white shadow-2xl lg:shadow-xl lg:shadow-gray-200/50
            transition-transform duration-300 ease-in-out
            overflow-y-auto
            lg:border-r lg:border-gray-100
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
				>
					{/* Mobile/Tablet: Close Button Header */}
					<div className='lg:hidden flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10'>
						<h2 className='text-base sm:text-lg font-bold text-gray-800'>{t('home.browseCategories')}</h2>
						<button
							onClick={toggleSidebar}
							className='p-2 hover:bg-gray-100 rounded-xl transition-colors'
							aria-label='Close filters'
						>
							<X size={20} className='sm:w-6 sm:h-6 text-gray-600' />
						</button>
					</div>

					{/* Sidebar Content */}
					<div className='lg:pt-0'>
						<CategorySideBar />
					</div>
				</aside>

				{/* Main Content Area - Enhanced spacing and styling */}
				<main className='flex-1 w-full min-w-0 mt-4 sm:mt-6 lg:mt-8 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12'>
					{/* Hero Carousel Section */}
					<section className='mb-8 sm:mb-10 lg:mb-14'>
						<HeroCarousel />
					</section>

					{/* Decorative Divider */}
					<div className='flex items-center justify-center mb-8 sm:mb-10 lg:mb-12'>
						<div className='h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent'></div>
						<div className='mx-4 flex items-center gap-2'>
							<div className='w-2 h-2 bg-secondary-400 rounded-full'></div>
							<div className='w-3 h-3 bg-primary-500 rounded-full'></div>
							<div className='w-2 h-2 bg-secondary-400 rounded-full'></div>
						</div>
						<div className='h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent'></div>
					</div>

					{/* Product List Section */}
					<section className='pb-8 sm:pb-12 lg:pb-16'>
						<ProductList />
					</section>
				</main>
			</div>

			<Footer />
		</div>
	);
};

export default Home;
