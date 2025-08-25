import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Footer from '../../../components/Footer';
import Navbar from '../../../components/NavBar';
import ProductCard from './ProductCard';
import ProductList from './ProductList';
import HeroCarousel from '../../hero/HeroCarousel';

const Home = () => {
	return (
		<>
			<Navbar />
			<HeroCarousel />
			<div className='mt-20'>
				<ProductList />
			</div>
		</>
	);
};
export default Home;
