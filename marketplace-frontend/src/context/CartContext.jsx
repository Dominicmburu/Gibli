import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
	const [cartCount, setCartCount] = useState(0);

	const fetchCartCount = async () => {
		try {
			const res = await api.get('/cart/items');
			if (Array.isArray(res.data)) {
				setCartCount(res.data.length);
			}
		} catch (err) {
			console.error('Error fetching cart count:', err);
		}
	};

	const refreshCart = () => {
		fetchCartCount();
	};

	useEffect(() => {
		fetchCartCount();
	}, []);

	return <CartContext.Provider value={{ cartCount, refreshCart }}>{children}</CartContext.Provider>;
};

export const useCart = () => {
	const context = useContext(CartContext);
	if (!context) {
		throw new Error('useCart must be used within CartProvider');
	}
	return context;
};
