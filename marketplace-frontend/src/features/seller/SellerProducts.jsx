import { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import { Loader2, Edit, Trash, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';

const SellerProducts = () => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [updating, setUpdating] = useState(false);

	// Fetch products
	useEffect(() => {
		const fetchMyProducts = async () => {
			try {
				const response = await api.get('products/myproducts');
				setProducts(response.data || []);
			} catch (err) {
				console.error('Error fetching products:', err);
				setError('Failed to load products');
			} finally {
				setLoading(false);
			}
		};
		fetchMyProducts();
	}, []);

	// Delete product
	const handleDelete = async (id) => {
		if (!window.confirm('Are you sure you want to delete this product?')) return;
		try {
			await api.delete(`/uploads/delete/product/${id}`);
			setProducts((prev) => prev.filter((p) => p.ProductId !== id));
		} catch (error) {
			console.error('Delete failed:', error);
			alert('Could not delete product. Try again later.');
		}
	};

	// Handle form input in modal
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setSelectedProduct((prev) => ({ ...prev, [name]: value }));
	};

	// Update product
	const handleUpdate = async (e) => {
		e.preventDefault();
		if (!selectedProduct) return;

		setUpdating(true);
		try {
			const { ProductId, ...updateData } = selectedProduct;
			const response = await api.patch(`/uploads/update/product/${ProductId}`, updateData);

			setProducts((prev) => prev.map((p) => (p.ProductId === ProductId ? response.data : p)));
			setSelectedProduct(null);
		} catch (err) {
			console.error('Update failed:', err);
			alert('Failed to update product. Try again later.');
		} finally {
			setUpdating(false);
		}
	};

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />

				<div className='flex-1 p-6 overflow-y-auto'>
					<h2 className='text-2xl font-semibold mb-6 text-gray-800'>My Products</h2>

					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-gray-500' />
						</div>
					) : error ? (
						<p className='text-red-500'>{error}</p>
					) : products.length === 0 ? (
						<p className='text-gray-500 text-center'>You have no products listed yet.</p>
					) : (
						<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
							{products.map((product) => (
								<motion.div
									key={product.ProductId}
									className='bg-white rounded-2xl shadow p-4 flex flex-col justify-between hover:shadow-lg transition'
									whileHover={{ scale: 1.02 }}
								>
									<img
										src={product.ImageUrl || '/placeholder.png'}
										alt={product.ProductName}
										className='h-40 w-full object-cover rounded-lg mb-3'
									/>
									<h3 className='text-lg font-medium'>{product.ProductName}</h3>
									<p className='text-sm text-gray-600 line-clamp-2'>{product.Description}</p>
									<p className='font-semibold mt-2 text-green-700'>€ {product.Price}</p>

									<div className='flex justify-between mt-4'>
										<button
											className='flex items-center gap-1 text-blue-600 hover:text-blue-800'
											onClick={() => setSelectedProduct(product)}
										>
											<Edit size={18} /> Edit
										</button>
										<button
											className='flex items-center gap-1 text-red-600 hover:text-red-800'
											onClick={() => handleDelete(product.ProductId)}
										>
											<Trash size={18} /> Delete
										</button>
									</div>
								</motion.div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Edit Modal */}
			<AnimatePresence>
				{selectedProduct && (
					<motion.div
						className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<motion.div
							className='bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative'
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.8, opacity: 0 }}
						>
							<button
								onClick={() => setSelectedProduct(null)}
								className='absolute top-3 right-3 text-gray-500 hover:text-gray-700'
							>
								<X size={20} />
							</button>
							<h3 className='text-xl font-semibold mb-4 text-gray-800'>Edit Product</h3>

							<form onSubmit={handleUpdate} className='space-y-3'>
								<input
									name='ProductName'
									value={selectedProduct.ProductName || ''}
									onChange={handleInputChange}
									className='w-full border p-2 rounded-lg'
									placeholder='Product Name'
								/>
								<textarea
									name='Description'
									value={selectedProduct.Description || ''}
									onChange={handleInputChange}
									className='w-full border p-2 rounded-lg'
									placeholder='Description'
								/>
								<input
									name='Price'
									value={selectedProduct.Price || ''}
									onChange={handleInputChange}
									className='w-full border p-2 rounded-lg'
									type='number'
									placeholder='Price'
								/>

								<button
									type='submit'
									disabled={updating}
									className='w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 transition'
								>
									{updating ? 'Updating...' : 'Save Changes'}
								</button>
							</form>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};

export default SellerProducts;
