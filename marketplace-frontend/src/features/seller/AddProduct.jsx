import { useEffect, useState, useRef } from 'react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import { jwtDecode } from 'jwt-decode';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Plus, X, ImagePlus } from 'lucide-react';

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
	const fileInputRef = useRef(null);

	// Fetch all categories on mount
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const res = await api.get('/categories/all-categories');
				setCategories(res.data || []);
			} catch (error) {
				console.error('Error fetching categories:', error);
				setMessage('Failed to load categories.');
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
				setMessage('Failed to load subcategories.');
			}
		};
		fetchSubCategories();
	}, [formData.CategoryId]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	// Add new images to existing ones
	const handleAddImages = (e) => {
		const files = Array.from(e.target.files);
		if (files.length === 0) return;

		const totalImages = images.length + files.length;
		if (totalImages > 4) {
			setMessage('Maximum 4 images allowed.');
			toast.error('Maximum 4 images allowed.');
			return;
		}

		const newImages = [...images, ...files];
		const newPreviewUrls = [...previewUrls, ...files.map((file) => URL.createObjectURL(file))];

		setImages(newImages);
		setPreviewUrls(newPreviewUrls);
		setMessage('');

		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	// Remove a specific image
	const handleRemoveImage = (indexToRemove) => {
		// Revoke the object URL to prevent memory leaks
		URL.revokeObjectURL(previewUrls[indexToRemove]);

		setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
		setPreviewUrls((prev) => prev.filter((_, index) => index !== indexToRemove));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage('');

		if (images.length === 0) {
			setMessage('Please upload at least 1 image.');
			toast.error('Please upload at least 1 image.');
			return;
		}

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

			setMessage(`${response.data.message}`);
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
			// Cleanup preview URLs
			previewUrls.forEach((url) => URL.revokeObjectURL(url));
			setImages([]);
			setPreviewUrls([]);
			setSubCategories([]);
		} catch (error) {
			console.error('Product upload failed:', error);
			setMessage(`${error.response?.data?.error || error.message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-6 overflow-y-auto'>
					<div className='max-w-3xl mx-auto bg-white shadow-sm border border-gray-100 rounded-2xl p-6'>
						<h2 className='text-2xl font-bold text-gray-900 mb-6'>Add a New Product</h2>

					<form onSubmit={handleSubmit} className='space-y-4'>
						{/* Product Name */}
						<input
							type='text'
							name='ProductName'
							value={formData.ProductName}
							onChange={handleChange}
							placeholder='Product Name'
							className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none'
							required
						/>

						{/* Description */}
						<textarea
							name='Description'
							value={formData.Description}
							onChange={handleChange}
							placeholder='Description'
							className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none'
							rows={4}
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
								className='border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none'
								required
							/>
							<input
								type='number'
								name='InStock'
								value={formData.InStock}
								onChange={handleChange}
								placeholder='Stock Quantity'
								className='border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none'
								required
							/>
						</div>

						{/* Category Dropdown */}
						<select
							name='CategoryId'
							value={formData.CategoryId}
							onChange={handleChange}
							className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none'
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
							className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed'
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
								className='border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none'
								required
							/>
							<input
								type='number'
								name='ExpressShippingPrice'
								value={formData.ExpressShippingPrice}
								onChange={handleChange}
								placeholder='Express Shipping (€)'
								className='border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none'
								required
							/>
						</div>

						{/* Image Upload */}
						<div>
							<label className='block mb-2 font-medium text-gray-700'>
								Product Images <span className='text-gray-400 font-normal'>(1-4 images)</span>
							</label>

							{/* Hidden file input */}
							<input
								ref={fileInputRef}
								type='file'
								accept='image/*'
								multiple
								onChange={handleAddImages}
								className='hidden'
							/>

							{/* Image preview grid */}
							<div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
								{/* Existing images */}
								{previewUrls.map((url, index) => (
									<div key={index} className='relative group'>
										<img
											src={url}
											alt={`preview-${index}`}
											className='w-full h-28 object-cover rounded-lg border border-gray-200'
										/>
										{/* Remove button */}
										<button
											type='button'
											onClick={() => handleRemoveImage(index)}
											className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors'
										>
											<X size={14} />
										</button>
									</div>
								))}

								{/* Add image button */}
								{images.length < 4 && (
									<button
										type='button'
										onClick={() => fileInputRef.current?.click()}
										className='w-full h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-primary-500 hover:text-primary-500 hover:bg-primary-50 transition-all cursor-pointer'
									>
										<ImagePlus size={24} />
										<span className='text-xs font-medium'>Add Image</span>
									</button>
								)}
							</div>

							{/* Image count indicator */}
							<p className='text-xs text-gray-500 mt-2'>
								{images.length}/4 images uploaded
							</p>
						</div>

						{/* Status Message */}
						{message && (
							<p className={`text-sm text-center mt-2 ${message.includes('Failed') || message.includes('Maximum') || message.includes('Please') ? 'text-red-600' : 'text-green-600'}`}>
								{message}
							</p>
						)}

						{/* Submit Button */}
						<button
							type='submit'
							disabled={loading || images.length === 0}
							className='w-full bg-primary-500 text-white py-2.5 rounded-lg hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium'
						>
							{loading ? 'Uploading...' : 'Add Product'}
						</button>
					</form>
					</div>
				</div>
			</div>
		</>
	);
};

export default AddProduct;
