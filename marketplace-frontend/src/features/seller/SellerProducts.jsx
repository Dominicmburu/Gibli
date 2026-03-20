import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
	Loader2, Edit, Trash2, X, Search, Package, Filter,
	AlertTriangle, CheckCircle, Euro, Truck, Zap, Box, ImagePlus,
} from 'lucide-react';

const SellerProducts = () => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [stockFilter, setStockFilter] = useState('all'); // all, inStock, lowStock, needsRestock
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [updating, setUpdating] = useState(false);
	const [categories, setCategories] = useState([]);
	const [subCategories, setSubCategories] = useState([]);
	const [productImages, setProductImages] = useState([]);
	const [newImages, setNewImages] = useState([]);
	const [newImagePreviews, setNewImagePreviews] = useState([]);
	const [loadingImages, setLoadingImages] = useState(false);
	const [deletingImage, setDeletingImage] = useState(null);
	const [uploadingImages, setUploadingImages] = useState(false);
	const fileInputRef = useRef(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchProducts = async () => {
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
		fetchProducts();
	}, []);

	// Fetch categories for edit modal
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const res = await api.get('/categories/all-categories');
				setCategories(res.data || []);
			} catch (err) {
				console.error('Error fetching categories:', err);
			}
		};
		fetchCategories();
	}, []);

	// Fetch subcategories when selected product's category changes
	useEffect(() => {
		if (!selectedProduct?.CategoryId) {
			setSubCategories([]);
			return;
		}
		const fetchSubCategories = async () => {
			try {
				const res = await api.get(`/categories/all-sub-categories/${selectedProduct.CategoryId}`);
				setSubCategories(res.data || []);
			} catch (err) {
				console.error('Error fetching subcategories:', err);
			}
		};
		fetchSubCategories();
	}, [selectedProduct?.CategoryId]);

	// Fetch images when a product is selected for editing
	useEffect(() => {
		if (!selectedProduct?.ProductId) {
			setProductImages([]);
			setNewImages([]);
			setNewImagePreviews([]);
			return;
		}
		const fetchImages = async () => {
			setLoadingImages(true);
			try {
				const res = await api.get(`/uploads/product-images/${selectedProduct.ProductId}`);
				setProductImages(res.data.data || []);
			} catch (err) {
				console.error('Error fetching product images:', err);
			} finally {
				setLoadingImages(false);
			}
		};
		fetchImages();
	}, [selectedProduct?.ProductId]);

	const handleDeleteImage = async (imageId) => {
		setDeletingImage(imageId);
		try {
			await api.delete(`/uploads/product-image/${imageId}`);
			setProductImages((prev) => prev.filter((img) => img.ImageId !== imageId));
			toast.success('Image removed');
		} catch (err) {
			console.error('Delete image failed:', err);
			toast.error(err.response?.data?.message || 'Failed to delete image');
		} finally {
			setDeletingImage(null);
		}
	};

	const handleAddNewImages = (e) => {
		const files = Array.from(e.target.files);
		if (files.length === 0) return;

		const totalImages = productImages.length + newImages.length + files.length;
		if (totalImages > 4) {
			toast.error(`Maximum 4 images allowed. You can add ${4 - productImages.length - newImages.length} more.`);
			return;
		}

		setNewImages((prev) => [...prev, ...files]);
		setNewImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);

		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const handleRemoveNewImage = (index) => {
		URL.revokeObjectURL(newImagePreviews[index]);
		setNewImages((prev) => prev.filter((_, i) => i !== index));
		setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
	};

	const handleUploadNewImages = async () => {
		if (newImages.length === 0 || !selectedProduct) return;
		setUploadingImages(true);
		try {
			const formData = new FormData();
			newImages.forEach((img) => formData.append('images', img));

			const res = await api.post(`/uploads/product-images/${selectedProduct.ProductId}`, formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			setProductImages(res.data.data || []);
			newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
			setNewImages([]);
			setNewImagePreviews([]);
			toast.success('Images uploaded');
		} catch (err) {
			console.error('Upload images failed:', err);
			toast.error(err.response?.data?.message || 'Failed to upload images');
		} finally {
			setUploadingImages(false);
		}
	};

	// Filter products
	const filteredProducts = products.filter((p) => {
		const matchesSearch =
			!searchTerm ||
			p.ProductName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			p.Description?.toLowerCase().includes(searchTerm.toLowerCase());

		const threshold = p.LowStockThreshold || 5;
		let matchesStock = true;
		if (stockFilter === 'inStock') matchesStock = p.InStock > threshold;
		if (stockFilter === 'lowStock') matchesStock = p.InStock <= threshold && p.InStock > 0;
		if (stockFilter === 'needsRestock') matchesStock = p.NeedsRestock;

		return matchesSearch && matchesStock;
	});

	const handleDelete = async (id, name) => {
		if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
		try {
			await api.delete(`/uploads/delete/product/${id}`);
			setProducts((prev) => prev.filter((p) => p.ProductId !== id));
			toast.success('Product deleted');
		} catch (error) {
			console.error('Delete failed:', error);
			toast.error('Could not delete product.');
		}
	};

	const handleToggleRestock = async (productId) => {
		try {
			const res = await api.patch(`/uploads/toggle-restock/${productId}`);
			const updated = res.data.data;
			setProducts((prev) =>
				prev.map((p) => (p.ProductId === updated.ProductId ? { ...p, NeedsRestock: updated.NeedsRestock } : p))
			);
			toast.success(updated.NeedsRestock ? 'Marked as needs restock' : 'Restock flag removed');
		} catch (err) {
			console.error('Toggle restock failed:', err);
			toast.error('Failed to update restock flag');
		}
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setSelectedProduct((prev) => ({ ...prev, [name]: value }));
	};

	const closeModal = () => {
		newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
		setNewImages([]);
		setNewImagePreviews([]);
		setProductImages([]);
		setSelectedProduct(null);
	};

	const handleUpdate = async (e) => {
		e.preventDefault();
		if (!selectedProduct) return;
		setUpdating(true);
		try {
			// Upload any new images first
			if (newImages.length > 0) {
				const formData = new FormData();
				newImages.forEach((img) => formData.append('images', img));
				await api.post(`/uploads/product-images/${selectedProduct.ProductId}`, formData, {
					headers: { 'Content-Type': 'multipart/form-data' },
				});
			}

			const res = await api.patch(`/uploads/update/product/${selectedProduct.ProductId}`, {
				ProductName: selectedProduct.ProductName,
				CategoryId: selectedProduct.CategoryId,
				SubCategoryId: selectedProduct.SubCategoryId,
				Price: selectedProduct.Price,
				Description: selectedProduct.Description,
				InStock: selectedProduct.InStock,
				ShippingPrice: selectedProduct.ShippingPrice,
				ExpressShippingPrice: selectedProduct.ExpressShippingPrice,
				LowStockThreshold: selectedProduct.LowStockThreshold,
			});
			const updated = res.data.data;
			if (updated) {
				setProducts((prev) => prev.map((p) => (p.ProductId === updated.ProductId ? updated : p)));
			}
			closeModal();
			toast.success('Product updated');
		} catch (err) {
			console.error('Update failed:', err);
			toast.error('Failed to update product');
		} finally {
			setUpdating(false);
		}
	};

	const stockBadge = (product) => {
		const threshold = product.LowStockThreshold || 5;
		if (product.NeedsRestock) {
			return (
				<span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-600 border border-yellow-200'>
					<AlertTriangle size={10} /> Restock
				</span>
			);
		}
		if (product.InStock <= threshold) {
			return (
				<span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-600 border border-yellow-200'>
					<AlertTriangle size={10} /> Low: {product.InStock}
				</span>
			);
		}
		return (
			<span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200'>
				<CheckCircle size={10} /> {product.InStock}
			</span>
		);
	};

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-6 overflow-y-auto'>
					{/* Header */}
					<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center'>
								<Package size={20} className='text-primary-600' />
							</div>
							<div>
								<h1 className='text-2xl font-bold text-gray-900'>My Products</h1>
								<p className='text-sm text-gray-500'>{products.length} product{products.length !== 1 ? 's' : ''}</p>
							</div>
						</div>
						<button
							onClick={() => navigate('/new-product')}
							className='bg-primary-500 hover:bg-primary-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm'
						>
							+ Add Product
						</button>
					</div>

					{/* Search + Filters */}
					<div className='flex flex-col sm:flex-row gap-3 mb-6'>
						<div className='relative flex-1'>
							<Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
							<input
								type='text'
								placeholder='Search products...'
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className='w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
							/>
						</div>
						<div className='flex items-center gap-2'>
							<Filter size={16} className='text-gray-400' />
							{[
								{ value: 'all', label: 'All' },
								{ value: 'inStock', label: 'In Stock' },
								{ value: 'lowStock', label: 'Low Stock' },
								{ value: 'needsRestock', label: 'Needs Restock' },
							].map((f) => (
								<button
									key={f.value}
									onClick={() => setStockFilter(f.value)}
									className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
										stockFilter === f.value
											? 'bg-primary-500 text-white'
											: 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
									}`}
								>
									{f.label}
								</button>
							))}
						</div>
					</div>

					{/* Product Grid */}
					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-primary-500' />
						</div>
					) : error ? (
						<p className='text-red-500'>{error}</p>
					) : filteredProducts.length === 0 ? (
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
							<Package size={48} className='mx-auto text-gray-300 mb-4' />
							<h3 className='text-lg font-semibold text-gray-700 mb-2'>
								{products.length === 0 ? 'No products yet' : 'No products match your filters'}
							</h3>
							<p className='text-gray-500 mb-4'>
								{products.length === 0
									? 'Start by adding your first product.'
									: 'Try adjusting your search or filters.'}
							</p>
							{products.length === 0 && (
								<button
									onClick={() => navigate('/new-product')}
									className='bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors'
								>
									Add Product
								</button>
							)}
						</div>
					) : (
						<div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
							{filteredProducts.map((product) => (
								<div
									key={product.ProductId}
									className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col'
								>
									{/* Image */}
									<div className='relative h-44 bg-gray-100'>
										{product.ImageUrl ? (
											<img src={product.ImageUrl} alt={product.ProductName} className='w-full h-full object-cover' />
										) : (
											<div className='w-full h-full flex items-center justify-center'>
												<Package size={32} className='text-gray-300' />
											</div>
										)}
										{/* Stock badge overlay */}
										<div className='absolute top-2 right-2'>{stockBadge(product)}</div>
									</div>

									{/* Content */}
									<div className='p-4 flex-1 flex flex-col'>
										<div className='flex items-start justify-between gap-2 mb-1'>
											<h3 className='font-semibold text-gray-900 text-sm line-clamp-1'>{product.ProductName}</h3>
										</div>

										{product.CategoryName && (
											<p className='text-xs text-gray-400 mb-2'>
												{product.CategoryName}
												{product.SubCategoryName ? ` / ${product.SubCategoryName}` : ''}
											</p>
										)}

										<p className='text-xs text-gray-500 line-clamp-2 mb-3'>{product.Description}</p>

										{/* Pricing */}
										<div className='space-y-1 mb-3'>
											<div className='flex items-center justify-between'>
												<span className='flex items-center gap-1 text-xs text-gray-500'>
													<Euro size={12} /> Price
												</span>
												<span className='font-bold text-primary-600 text-sm'>
													&euro;{Number(product.Price).toFixed(2)}
												</span>
											</div>
											<div className='flex items-center justify-between'>
												<span className='flex items-center gap-1 text-xs text-gray-500'>
													<Truck size={12} /> Shipping
												</span>
												<span className='text-xs text-gray-700'>&euro;{Number(product.ShippingPrice).toFixed(2)}</span>
											</div>
											<div className='flex items-center justify-between'>
												<span className='flex items-center gap-1 text-xs text-gray-500'>
													<Zap size={12} /> Express
												</span>
												<span className='text-xs text-gray-700'>&euro;{Number(product.ExpressShippingPrice).toFixed(2)}</span>
											</div>
										</div>

										{/* Stock info */}
										<div className='space-y-1 mb-4 py-2 px-3 rounded-lg bg-gray-50'>
											<div className='flex items-center justify-between text-xs'>
												<span className='flex items-center gap-1 text-gray-500'>
													<Box size={12} /> In Stock
												</span>
												<span className='font-semibold text-gray-900'>{product.InStock} units</span>
											</div>
											<div className='flex items-center justify-between text-xs'>
												<span className='text-gray-400'>Low stock alert</span>
												<span className='text-gray-500'>&le; {product.LowStockThreshold || 5}</span>
											</div>
										</div>

										{/* Actions */}
										<div className='mt-auto flex gap-2'>
											<button
												onClick={() => setSelectedProduct({ ...product })}
												className='flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600 border border-primary-200 hover:border-primary-300 py-2 rounded-lg transition-colors'
											>
												<Edit size={14} /> Edit
											</button>
											<button
												onClick={() => handleToggleRestock(product.ProductId)}
												className={`flex items-center justify-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg transition-colors border ${
													product.NeedsRestock
														? 'text-amber-500 border-amber-200 hover:border-amber-300'
														: 'text-green-600 border-green-200 hover:border-green-300'
												}`}
												title={product.NeedsRestock ? 'Remove restock flag' : 'Mark as needs restock'}
											>
												<AlertTriangle size={14} />
											</button>
											<button
												onClick={() => handleDelete(product.ProductId, product.ProductName)}
												className='flex items-center justify-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 py-2 px-3 rounded-lg transition-colors'
											>
												<Trash2 size={14} />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Edit Modal */}
			{selectedProduct && (
				<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
					<div className='bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative'>
						<div className='sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl'>
							<h3 className='text-lg font-bold text-gray-900'>Edit Product</h3>
							<button
								onClick={closeModal}
								className='text-gray-400 hover:text-gray-600 transition-colors'
							>
								<X size={20} />
							</button>
						</div>

						<form onSubmit={handleUpdate} className='p-6 space-y-4'>
							{/* Product Name */}
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>Product Name</label>
								<input
									name='ProductName'
									value={selectedProduct.ProductName || ''}
									onChange={handleInputChange}
									className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
									required
								/>
							</div>

							{/* Description */}
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-1'>Description</label>
								<textarea
									name='Description'
									value={selectedProduct.Description || ''}
									onChange={handleInputChange}
									rows={3}
									className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
								/>
							</div>

							{/* Category + SubCategory */}
							<div className='grid grid-cols-2 gap-3'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Category</label>
									<select
										name='CategoryId'
										value={selectedProduct.CategoryId || ''}
										onChange={handleInputChange}
										className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
										required
									>
										<option value=''>Select</option>
										{categories.map((cat) => (
											<option key={cat.CategoryId} value={cat.CategoryId}>
												{cat.CategoryName}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Subcategory</label>
									<select
										name='SubCategoryId'
										value={selectedProduct.SubCategoryId || ''}
										onChange={handleInputChange}
										className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
										required
									>
										<option value=''>Select</option>
										{subCategories.map((sub) => (
											<option key={sub.SubCategoryId} value={sub.SubCategoryId}>
												{sub.SubCategoryName}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Pricing row */}
							<div className='grid grid-cols-3 gap-3'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Price (&euro;)</label>
									<input
										name='Price'
										type='number'
										step='0.01'
										min='0'
										value={selectedProduct.Price || ''}
										onChange={handleInputChange}
										className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
										required
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Shipping (&euro;)</label>
									<input
										name='ShippingPrice'
										type='number'
										step='0.01'
										min='0'
										value={selectedProduct.ShippingPrice || ''}
										onChange={handleInputChange}
										className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
										required
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Express (&euro;)</label>
									<input
										name='ExpressShippingPrice'
										type='number'
										step='0.01'
										min='0'
										value={selectedProduct.ExpressShippingPrice || ''}
										onChange={handleInputChange}
										className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
										required
									/>
								</div>
							</div>

							{/* Stock + Low Stock Threshold */}
							<div className='grid grid-cols-2 gap-3'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Stock Quantity</label>
									<input
										name='InStock'
										type='number'
										min='0'
										value={selectedProduct.InStock || ''}
										onChange={handleInputChange}
										className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
										required
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>Low Stock Alert</label>
									<input
										name='LowStockThreshold'
										type='number'
										min='1'
										value={selectedProduct.LowStockThreshold || 5}
										onChange={handleInputChange}
										className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400'
										required
										title='Product will be flagged for restocking when stock drops to this level'
									/>
								</div>
							</div>
							<p className='text-xs text-gray-400 -mt-2'>
								When stock reaches the Low Stock Alert level, the product is automatically flagged for restocking.
							</p>

							{/* Product Images */}
							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Product Images <span className='text-gray-400 font-normal'>({productImages.length + newImages.length}/4)</span>
								</label>

								{loadingImages ? (
									<div className='flex items-center justify-center h-24'>
										<Loader2 size={20} className='animate-spin text-primary-500' />
									</div>
								) : (
									<>
										{/* Hidden file input */}
										<input
											ref={fileInputRef}
											type='file'
											accept='image/*'
											multiple
											onChange={handleAddNewImages}
											className='hidden'
										/>

										<div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
											{/* Existing images from DB */}
											{productImages.map((img) => (
												<div key={img.ImageId} className='relative group'>
													<img
														src={img.ImageUrl}
														alt='Product'
														className='w-full h-24 object-cover rounded-lg border border-gray-200'
													/>
													<button
														type='button'
														onClick={() => handleDeleteImage(img.ImageId)}
														disabled={deletingImage === img.ImageId || productImages.length <= 1}
														className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
														title={productImages.length <= 1 ? 'Must keep at least 1 image' : 'Remove image'}
													>
														{deletingImage === img.ImageId ? (
															<Loader2 size={12} className='animate-spin' />
														) : (
															<X size={14} />
														)}
													</button>
												</div>
											))}

											{/* New images (not yet uploaded) */}
											{newImagePreviews.map((url, index) => (
												<div key={`new-${index}`} className='relative group'>
													<img
														src={url}
														alt={`New ${index + 1}`}
														className='w-full h-24 object-cover rounded-lg border-2 border-dashed border-primary-300'
													/>
													<button
														type='button'
														onClick={() => handleRemoveNewImage(index)}
														className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors'
													>
														<X size={14} />
													</button>
													<span className='absolute bottom-1 left-1 text-[10px] bg-primary-500 text-white px-1.5 py-0.5 rounded'>New</span>
												</div>
											))}

											{/* Add image button */}
											{productImages.length + newImages.length < 4 && (
												<button
													type='button'
													onClick={() => fileInputRef.current?.click()}
													className='w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50 transition-all cursor-pointer'
												>
													<ImagePlus size={20} />
													<span className='text-[10px] font-medium'>Add</span>
												</button>
											)}
										</div>
									</>
								)}
							</div>

							{/* Submit */}
							<button
								type='submit'
								disabled={updating || uploadingImages}
								className='w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
							>
								{updating ? <Loader2 size={16} className='animate-spin' /> : null}
								{updating ? 'Saving...' : 'Save Changes'}
							</button>
						</form>
					</div>
				</div>
			)}
		</>
	);
};

export default SellerProducts;
