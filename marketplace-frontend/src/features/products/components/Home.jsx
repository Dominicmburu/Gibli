import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Footer from '../../../components/Footer';
import Navbar from '../../../components/NavBar';
import ProductList from './ProductList';
import HeroCarousel from '../../hero/HeroCarousel';
import CategorySideBar from '../../filters/categories/CategorySideBar';

const Home = () => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	return (
		<div className='min-h-screen flex flex-col'>
			<Navbar />

			{/* Mobile/Tablet: Floating Filter Button (hidden on desktop) */}
			<button
				onClick={toggleSidebar}
				className='lg:hidden fixed bottom-6 right-4 sm:right-6 z-50 bg-baseGreen hover:bg-green-700 text-black p-3 sm:p-4 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2'
				aria-label='Toggle filters'
			>
				<Menu size={20} className='sm:w-6 sm:h-6' />
				<span className='font-medium text-sm sm:text-base'>Categories</span>
			</button>

			{/* Mobile/Tablet: Overlay */}
			{isSidebarOpen && (
				<div
					className='fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden'
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
            bg-white shadow-2xl lg:shadow-none
            transition-transform duration-300 ease-in-out
            overflow-y-auto
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
				>
					{/* Mobile/Tablet: Close Button Header */}
					<div className='lg:hidden flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10'>
						<h2 className='text-base sm:text-lg font-bold text-gray-800'>Categories</h2>
						<button
							onClick={toggleSidebar}
							className='p-2 hover:bg-gray-100 rounded-full transition-colors'
							aria-label='Close filters'
						>
							<X size={20} className='sm:w-6 sm:h-6' />
						</button>
					</div>

					{/* Sidebar Content */}
					<div className='lg:pt-0'>
						<CategorySideBar />
					</div>
				</aside>

				{/* Main Content Area - Responsive spacing */}
				<main className='flex-1 mt-4 sm:mt-6 lg:mt-10 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10'>
					{/* Hero Carousel */}
					<div className='mb-4 sm:mb-6 lg:mb-8'>
						<HeroCarousel />
					</div>

					{/* Product List */}
					<ProductList />
				</main>
			</div>

			<Footer />
		</div>
	);
};

export default Home;
