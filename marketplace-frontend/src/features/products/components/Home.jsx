import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Footer from '../../../components/Footer';
import Navbar from '../../../components/NavBar';
import ProductCard from './ProductCard';
import ProductList from './ProductList';
import HeroCarousel from '../../hero/HeroCarousel';
import CategorySideBar from '../../filters/categories/CategorySideBar';

const Home = () => {
	return (
		<>
			<Navbar />
			{/* <HeroCarousel /> */}
			{/* <div className='mt-20'>
				<ProductList />
			</div> */}
			{/* <Footer /> */}

			<div className='flex mt-10 px-10 gap-8'>
				{/* Sidebar (fixed width) */}
				{/* <div className='w-64'> */}
				<div className='w-64 h-screen sticky top-0 overflow-y-auto'>
					<CategorySideBar />
				</div>

				{/* Product List (takes remaining space) */}
				<div className='flex-1'>
					<HeroCarousel />

					<ProductList />
				</div>
			</div>
			<Footer />
		</>
	);
};
export default Home;
