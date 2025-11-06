import React, { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import { jwtDecode } from 'jwt-decode';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const AddProduct = () => {
	const [formData, setFormData] = useState({
		ProductName: '',
		Description: '',
		Price: '',
		InStock: '',
		CategoryId: '',
		SubCategoryId: '',
		ShippingPrice: '',
		ExpressShippingPrice: '',
	});

	const [categories, setCategories] = useState([]);
	const [subCategories, setSubCategories] = useState([]);
	const [images, setImages] = useState([]);
	const [previewUrls, setPreviewUrls] = useState([]);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState('');

	// Fetch all categories on mount
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const res = await api.get('/categories/all-categories');
				setCategories(res.data || []);
			} catch (error) {
				console.error('Error fetching categories:', error);
				setMessage('⚠️ Failed to load categories.');
			}
		};
		fetchCategories();
	}, []);

	// Fetch subcategories when category changes
	useEffect(() => {
		const fetchSubCategories = async () => {
			if (!formData.CategoryId) return;
			try {
				const res = await api.get(`/categories/all-sub-categories/${formData.CategoryId}`);
				setSubCategories(res.data || []);
			} catch (error) {
				console.error('Error fetching subcategories:', error);
				setMessage('⚠️ Failed to load subcategories.');
			}
		};
		fetchSubCategories();
	}, [formData.CategoryId]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleImageChange = (e) => {
		const files = Array.from(e.target.files);
		if (files.length !== 4) {
			setMessage('⚠️ Please upload exactly 4 images.');
			setImages([]);
			setPreviewUrls([]);
			return;
		}
		setImages(files);
		setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
		setMessage('');
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage('');
		setLoading(true);

		try {
			const token = localStorage.getItem('token');
			if (!token) throw new Error('No token found. Please login again.');

			const decoded = jwtDecode(token);
			const UserId = decoded.id;

			const form = new FormData();
			Object.entries(formData).forEach(([key, value]) => form.append(key, value));
			form.append('UserId', UserId);
			images.forEach((img) => form.append('images', img));

			const response = await api.post('uploads/upload/product', form, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			setMessage(`✅ ${response.data.message}`);
			toast.success(response.data.message);
			setFormData({
				ProductName: '',
				Description: '',
				Price: '',
				InStock: '',
				CategoryId: '',
				SubCategoryId: '',
				ShippingPrice: '',
				ExpressShippingPrice: '',
			});
			setImages([]);
			setPreviewUrls([]);
			setSubCategories([]);
		} catch (error) {
			console.error('Product upload failed:', error);
			setMessage(`❌ ${error.response?.data?.error || error.message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='flex'>
			<SellerSidebar />
			<div className='flex-1 bg-gray-50 min-h-screen'>
				<NavBar />
				<div className='max-w-3xl mx-auto p-6 mt-6 bg-white shadow rounded-xl'>
					<h2 className='text-2xl font-semibold text-green-700 mb-4'>Add a New Product</h2>

					<form onSubmit={handleSubmit} className='space-y-4'>
						{/* Product Name */}
						<input
							type='text'
							name='ProductName'
							value={formData.ProductName}
							onChange={handleChange}
							placeholder='Product Name'
							className='w-full border border-gray-300 rounded-lg px-4 py-2'
							required
						/>

						{/* Description */}
						<textarea
							name='Description'
							value={formData.Description}
							onChange={handleChange}
							placeholder='Description'
							className='w-full border border-gray-300 rounded-lg px-4 py-2'
							required
						/>

						{/* Price and Stock */}
						<div className='grid grid-cols-2 gap-4'>
							<input
								type='number'
								name='Price'
								value={formData.Price}
								onChange={handleChange}
								placeholder='Price (€)'
								className='border border-gray-300 rounded-lg px-4 py-2'
								required
							/>
							<input
								type='number'
								name='InStock'
								value={formData.InStock}
								onChange={handleChange}
								placeholder='Stock Quantity'
								className='border border-gray-300 rounded-lg px-4 py-2'
								required
							/>
						</div>

						{/* Category Dropdown */}
						<select
							name='CategoryId'
							value={formData.CategoryId}
							onChange={handleChange}
							className='w-full border border-gray-300 rounded-lg px-4 py-2'
							required
						>
							<option value=''>Select Category</option>
							{categories.map((cat) => (
								<option key={cat.CategoryId} value={cat.CategoryId}>
									{cat.CategoryName}
								</option>
							))}
						</select>

						{/* Subcategory Dropdown */}
						<select
							name='SubCategoryId'
							value={formData.SubCategoryId}
							onChange={handleChange}
							className='w-full border border-gray-300 rounded-lg px-4 py-2'
							required
							disabled={!formData.CategoryId}
						>
							<option value=''>Select Subcategory</option>
							{subCategories.map((sub) => (
								<option key={sub.SubCategoryId} value={sub.SubCategoryId}>
									{sub.SubCategoryName}
								</option>
							))}
						</select>

						{/* Shipping Prices */}
						<div className='grid grid-cols-2 gap-4'>
							<input
								type='number'
								name='ShippingPrice'
								value={formData.ShippingPrice}
								onChange={handleChange}
								placeholder='Standard Shipping (€)'
								className='border border-gray-300 rounded-lg px-4 py-2'
								required
							/>
							<input
								type='number'
								name='ExpressShippingPrice'
								value={formData.ExpressShippingPrice}
								onChange={handleChange}
								placeholder='Express Shipping (€)'
								className='border border-gray-300 rounded-lg px-4 py-2'
								required
							/>
						</div>

						{/* Image Upload */}
						<div>
							<label className='block mb-2 font-medium text-gray-700'>Upload 4 Images</label>
							<input
								type='file'
								accept='image/*'
								multiple
								onChange={handleImageChange}
								className='w-full'
							/>
							{previewUrls.length > 0 && (
								<div className='mt-4 grid grid-cols-4 gap-2'>
									{previewUrls.map((url, index) => (
										<img
											key={index}
											src={url}
											alt={`preview-${index}`}
											className='w-full h-24 object-cover rounded-md border'
										/>
									))}
								</div>
							)}
						</div>

						{/* Status Message */}
						{message && <p className='text-sm text-center text-gray-700 mt-2'>{message}</p>}

						{/* Submit Button */}
						<button
							type='submit'
							disabled={loading}
							className='w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 transition'
						>
							{loading ? 'Uploading...' : 'Add Product'}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default AddProduct;
