// src/store/useCartStore.js
import { create } from 'zustand';
import api from '../api/axios';

const useCartStore = create((set, get) => ({
	items: [],
	loading: false,

	fetchCart: async () => {
		set({ loading: true });
		try {
			const res = await api.get('/cart/items');
			set({ items: res.data, loading: false });
		} catch (err) {
			console.error(err);
			set({ loading: false });
		}
	},

	addToCart: async (productId) => {
		const { items } = get();
		try {
			await api.post('/cart/add', { productId });
			set({ items: [...items, { productId }] });
		} catch (err) {
			console.error(err);
		}
	},

	removeFromCart: async (productId) => {
		const { items } = get();
		try {
			await api.delete(`/cart/remove/${productId}`);
			set({ items: items.filter((i) => i.productId !== productId) });
		} catch (err) {
			console.error(err);
		}
	},
}));

export default useCartStore;
