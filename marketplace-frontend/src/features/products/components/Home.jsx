import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import Footer from '../../../components/Footer';
import Navbar from '../../../components/Navbar';
import ProductCard from './ProductCard';
import ProductList from './ProductList';

const Home = () => {
	return (
		<div className='product-list-container'>
			<ProductList />
		</div>
	);
};
export default Home;
