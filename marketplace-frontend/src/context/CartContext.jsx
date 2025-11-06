// src/context/CartContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

/**
 * CartProvider responsibilities:
 * - keep cartItems in state
 * - expose totalCount and CRUD helpers
 * - optimistic updates with rollback
 * - single fetch on mount + manual refresh
 */

const CartContext = createContext();

export const useCart = () => {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error('useCart must be used within CartProvider');
	return ctx;
};

export const CartProvider = ({ children }) => {
	const [cartItems, setCartItems] = useState([]); // each item shape matches API
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// fetch current cart (source-of-truth from server)
	const fetchCart = useCallback(async (signal) => {
		setLoading(true);
		setError(null);
		try {
			const res = await api.get('/cart/items', { signal });
			if (!isMountedRef.current) return;
			setCartItems(Array.isArray(res.data) ? res.data : []);
		} catch (err) {
			if (err.name === 'CanceledError' || err.name === 'AbortError') return;
			console.error('fetchCart error', err);
			setError('Failed to load cart');
		} finally {
			if (isMountedRef.current) setLoading(false);
		}
	}, []);

	// initial load
	useEffect(() => {
		const controller = new AbortController();
		fetchCart(controller.signal);
		return () => controller.abort();
	}, [fetchCart]);

	// derived value: total count (sum of quantities)
	const totalCount = useMemo(() => {
		return cartItems.reduce((sum, it) => sum + (Number(it.Quantity) || 0), 0);
	}, [cartItems]);

	// helper: replace item in state
	const replaceItemInState = useCallback((productId, updater) => {
		setCartItems((prev) => {
			const idx = prev.findIndex((i) => i.ProductId === productId || i.CartItemId === productId);
			if (idx === -1) return prev;
			const copy = [...prev];
			copy[idx] = { ...copy[idx], ...updater(copy[idx]) };
			return copy;
		});
	}, []);

	// Add item (optimistic)
	const addToCart = useCallback(
		async ({ ProductId, Quantity = 1, ...meta }) => {
			// If there is an existing cart item for same ProductId, increment locally
			const existing = cartItems.find((i) => i.ProductId === ProductId);
			if (existing) {
				// optimistic local increment
				replaceItemInState(ProductId, (it) => ({ Quantity: (Number(it.Quantity) || 0) + Quantity }));
				try {
					await api.post('/cart/add', { productId: ProductId, quantity: Quantity });
					// server responds; optionally refetch or assume success
				} catch (err) {
					// rollback
					replaceItemInState(ProductId, (it) => ({
						Quantity: Math.max(1, (Number(it.Quantity) || 0) - Quantity),
					}));
					toast.error('Failed to add to cart');
					throw err;
				}
				return;
			}

			// optimistic create: push temporary item (no CartItemId yet)
			const tempId = `temp-${Date.now()}`;
			const optimisticItem = {
				CartItemId: tempId,
				ProductId,
				Quantity,
				Price: meta.Price ?? 0,
				ProductName: meta.ProductName ?? '',
				ProductImageUrl: meta.ProductImageUrl ?? '',
				// other fields as needed
			};
			setCartItems((prev) => [optimisticItem, ...prev]);

			try {
				const res = await api.post('/cart/add', { productId: ProductId, quantity: Quantity });
				// replace temporary item with server item
				const serverItem = res.data?.cartItem; // ideally server returns created cart item
				if (serverItem) {
					setCartItems((prev) => prev.map((it) => (it.CartItemId === tempId ? serverItem : it)));
				} else {
					// fallback: refetch
					await fetchCart();
				}
			} catch (err) {
				// rollback optimistic add
				setCartItems((prev) => prev.filter((it) => it.CartItemId !== tempId));
				toast.error('Failed to add to cart');
				throw err;
			}
		},
		[cartItems, replaceItemInState, fetchCart]
	);

	// Remove item (optimistic)
	const removeFromCart = useCallback(
		async (cartItemIdOrProductId) => {
			// find current item
			const item = cartItems.find(
				(i) => i.CartItemId === cartItemIdOrProductId || i.ProductId === cartItemIdOrProductId
			);
			if (!item) {
				// nothing to remove
				return;
			}
			// optimistic remove
			setCartItems((prev) => prev.filter((i) => i.CartItemId !== item.CartItemId));
			try {
				// call backend to delete by CartItemId or product id endpoint; prefer CartItemId
				await api.delete(`/cart/remove/${item.CartItemId}`);
			} catch (err) {
				// rollback: re-add item
				setCartItems((prev) => [item, ...prev]);
				toast.error('Failed to remove item from cart');
				throw err;
			}
		},
		[cartItems]
	);

	// Update quantity (optimistic)
	const updateQuantity = useCallback(
		async (cartItemId, newQuantity) => {
			const item = cartItems.find((i) => i.CartItemId === cartItemId);
			if (!item) return;
			const prevQuantity = Number(item.Quantity) || 0;
			// optimistic update
			setCartItems((prev) =>
				prev.map((it) => (it.CartItemId === cartItemId ? { ...it, Quantity: newQuantity } : it))
			);
			try {
				await api.put(`/cart/update/${cartItemId}`, { Quantity: newQuantity });
			} catch (err) {
				// rollback
				setCartItems((prev) =>
					prev.map((it) => (it.CartItemId === cartItemId ? { ...it, Quantity: prevQuantity } : it))
				);
				toast.error('Failed to update quantity');
				throw err;
			}
		},
		[cartItems]
	);

	// clear cart
	const clearCart = useCallback(async () => {
		const prev = cartItems;
		setCartItems([]);
		try {
			await api.delete('/cart/clear');
		} catch (err) {
			setCartItems(prev);
			toast.error('Failed to clear cart');
			throw err;
		}
	}, [cartItems]);

	// refresh helper (public)
	const refresh = useCallback(async () => {
		const controller = new AbortController();
		await fetchCart(controller.signal);
	}, [fetchCart]);

	// provider value memoized for minimal rerenders
	const value = useMemo(
		() => ({
			cartItems,
			totalCount,
			loading,
			error,
			fetchCart,
			addToCart,
			removeFromCart,
			updateQuantity,
			clearCart,
			refresh,
		}),
		[
			cartItems,
			totalCount,
			loading,
			error,
			fetchCart,
			addToCart,
			removeFromCart,
			updateQuantity,
			clearCart,
			refresh,
		]
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
