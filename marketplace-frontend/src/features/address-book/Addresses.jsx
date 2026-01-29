import { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';
import Footer from '../../components/Footer';
import { MapPin, Plus, Edit2, Trash2, X, User, Phone, Home, Building, Globe, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Addresses = () => {
	const [addresses, setAddresses] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [formData, setFormData] = useState({
		FullName: '',
		PhoneNumber: '',
		AddressLine1: '',
		AddressLine2: '',
		City: '',
		StateOrProvince: '',
		PostalCode: '',
		Country: '',
		IsDefault: 0,
	});
	const [editId, setEditId] = useState(null);
	const [errors, setErrors] = useState({});

	// ✅ Fetch addresses
	useEffect(() => {
		const fetchAddresses = async () => {
			try {
				const res = await api.get('/shipping/addresses/me');
				setAddresses(res.data || []);
				console.log('Found Addressses', addresses);
			} catch (err) {
				console.error('Failed to fetch addresses:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchAddresses();
	}, []);

	// Handle Delete
	const handleDelete = async (id) => {
		if (!confirm('Are you sure you want to delete this address?')) return;
		try {
			await api.delete(`/shipping/delete-address/${id}`);
			setAddresses((prev) => prev.filter((addr) => addr.ShippingId !== id));
			toast.success('Address deleted successfully');
		} catch (err) {
			console.error('Delete failed:', err);
			toast.error('Failed to delete address');
		}
	};

	// ✅ Handle Edit (open modal pre-filled with only editable fields)
	const handleEdit = (address) => {
		setEditId(address.ShippingId);
		setFormData({
			FullName: address.FullName || '',
			PhoneNumber: address.PhoneNumber || '',
			AddressLine1: address.AddressLine1 || '',
			AddressLine2: address.AddressLine2 || '',
			City: address.City || '',
			StateOrProvince: address.StateOrProvince || '',
			PostalCode: address.PostalCode || '',
			Country: address.Country || '',
			IsDefault: address.IsDefault || 0,
		});
		setShowModal(true);
	};

	// Handle Set Default
	const handleSetDefault = async (id, currentState) => {
		// Check if already default
		const isCurrentlyDefault = currentState === 1 || currentState === true;
		if (isCurrentlyDefault) return; // Already default, do nothing

		try {
			await api.patch(`/shipping/set-as-default/${id}`);
			setAddresses((prev) =>
				prev.map((addr) =>
					addr.ShippingId === id
						? { ...addr, IsDefault: 1 }
						: { ...addr, IsDefault: 0 }
				)
			);
			toast.success('Default address updated');
		} catch (err) {
			console.error('Set default failed:', err);
			toast.error('Failed to update default address');
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		const { FullName, PhoneNumber, AddressLine1, City, Country } = formData;
		// ✅ Client-side validation
		const newErrors = {};
		if (!FullName) newErrors.FullName = 'Full name is required';
		if (!PhoneNumber) newErrors.PhoneNumber = 'Phone number is required';
		if (!AddressLine1) newErrors.AddressLine1 = 'Address Line 1 is required';
		if (!City) newErrors.City = 'City is required';
		if (!Country) newErrors.Country = 'Country is required';

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}
		try {
			if (editId) {
				await api.patch(`/shipping/edit-address/${editId}`, formData);
				toast.success('Address updated successfully');
			} else {
				await api.post('/shipping/add-shipping', formData);
				toast.success('Address added successfully');
			}

			const res = await api.get('/shipping/addresses/me');
			setAddresses(res.data || []);

			// Reset state after submit
			setShowModal(false);
			setEditId(null);
			setErrors({});
			setFormData({
				FullName: '',
				PhoneNumber: '',
				AddressLine1: '',
				AddressLine2: '',
				City: '',
				StateOrProvince: '',
				PostalCode: '',
				Country: '',
				IsDefault: 0,
			});
		} catch (err) {
			console.error('Failed to save address:', err);
			toast.error('Failed to save address. Please try again.');
		}
	};

	return (
		<div className='min-h-screen bg-gray-50 flex flex-col'>
			<NavBar />

			<main className='flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8'>
				{/* Page Header */}
				<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8'>
					<div>
						<h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3'>
							<MapPin className='w-6 h-6 sm:w-7 sm:h-7 text-green-600' />
							My Addresses
						</h1>
						<p className='text-sm sm:text-base text-gray-600 mt-1'>
							Manage your shipping addresses
						</p>
					</div>

					<button
						onClick={() => {
							setEditId(null);
							setFormData({
								FullName: '',
								PhoneNumber: '',
								AddressLine1: '',
								AddressLine2: '',
								City: '',
								StateOrProvince: '',
								PostalCode: '',
								Country: '',
								IsDefault: 0,
							});
							setErrors({});
							setShowModal(true);
						}}
						className='w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-sm'
					>
						<Plus size={20} />
						Add New Address
					</button>
				</div>

				{/* Content */}
				{loading ? (
					<div className='flex items-center justify-center py-16'>
						<div className='text-center'>
							<Loader2 size={40} className='animate-spin text-green-600 mx-auto mb-3' />
							<p className='text-gray-600'>Loading addresses...</p>
						</div>
					</div>
				) : addresses.length === 0 ? (
					<div className='bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center'>
						<div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
							<MapPin size={32} className='text-gray-400' />
						</div>
						<h3 className='text-lg font-semibold text-gray-900 mb-2'>No addresses saved</h3>
						<p className='text-gray-600 mb-6'>Add a shipping address to get started with your orders.</p>
						<button
							onClick={() => {
								setEditId(null);
								setFormData({
									FullName: '',
									PhoneNumber: '',
									AddressLine1: '',
									AddressLine2: '',
									City: '',
									StateOrProvince: '',
									PostalCode: '',
									Country: '',
									IsDefault: 0,
								});
								setErrors({});
								setShowModal(true);
							}}
							className='bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium inline-flex items-center gap-2'
						>
							<Plus size={20} />
							Add Your First Address
						</button>
					</div>
				) : (
					<div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
						{addresses.map((addr) => (
							<motion.div
								key={addr.ShippingId}
								className={`bg-white p-5 rounded-xl shadow-sm border-2 transition-all ${
									addr.IsDefault === 1 || addr.IsDefault === true
										? 'border-green-500 ring-1 ring-green-100'
										: 'border-gray-200 hover:border-gray-300'
								}`}
								whileHover={{ y: -2 }}
								transition={{ duration: 0.2 }}
							>
								{/* Default Badge */}
								{(addr.IsDefault === 1 || addr.IsDefault === true) && (
									<div className='flex items-center gap-1.5 mb-3'>
										<span className='inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full'>
											<CheckCircle size={12} />
											Default Address
										</span>
									</div>
								)}

								{/* Name & Phone */}
								<div className='mb-3'>
									<h2 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
										<User size={16} className='text-gray-400' />
										{addr.FullName}
									</h2>
									<p className='text-sm text-gray-600 flex items-center gap-2 mt-1'>
										<Phone size={14} className='text-gray-400' />
										{addr.PhoneNumber}
									</p>
								</div>

								{/* Address */}
								<div className='text-sm text-gray-600 space-y-1 mb-4 pl-6'>
									<p>{addr.AddressLine1}</p>
									{addr.AddressLine2 && <p>{addr.AddressLine2}</p>}
									<p>
										{addr.City}
										{addr.StateOrProvince && `, ${addr.StateOrProvince}`}
										{addr.PostalCode && ` ${addr.PostalCode}`}
									</p>
									<p className='font-medium text-gray-700'>{addr.Country}</p>
								</div>

								{/* Set as Default Radio */}
								<div className='flex items-center gap-2 mb-4'>
									<input
										type='radio'
										id={`default-${addr.ShippingId}`}
										name='defaultAddress'
										checked={addr.IsDefault === 1 || addr.IsDefault === true}
										onChange={() => handleSetDefault(addr.ShippingId, addr.IsDefault)}
										className='w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500'
									/>
									<label
										htmlFor={`default-${addr.ShippingId}`}
										className='text-sm text-gray-700 cursor-pointer'
									>
										Set as default
									</label>
								</div>

								{/* Actions */}
								<div className='flex items-center gap-3 pt-4 border-t border-gray-100'>
									<button
										onClick={() => handleEdit(addr)}
										className='text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors'
									>
										<Edit2 size={14} />
										Edit
									</button>
									<button
										onClick={() => handleDelete(addr.ShippingId)}
										className='text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors'
									>
										<Trash2 size={14} />
										Delete
									</button>
								</div>
							</motion.div>
						))}
					</div>
				)}
			</main>

			{/* Add/Edit Modal */}
			<AnimatePresence>
				{showModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
						onClick={() => setShowModal(false)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							className='bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto'
							onClick={(e) => e.stopPropagation()}
						>
							{/* Modal Header */}
							<div className='flex items-center justify-between p-5 border-b border-gray-200'>
								<div className='flex items-center gap-3'>
									<div className='w-10 h-10 bg-green-100 rounded-full flex items-center justify-center'>
										<MapPin size={20} className='text-green-600' />
									</div>
									<div>
										<h2 className='text-lg font-bold text-gray-900'>
											{editId ? 'Edit Address' : 'Add New Address'}
										</h2>
										<p className='text-sm text-gray-500'>
											{editId ? 'Update your shipping details' : 'Enter your shipping details'}
										</p>
									</div>
								</div>
								<button
									onClick={() => setShowModal(false)}
									className='text-gray-400 hover:text-gray-600 transition-colors p-1'
								>
									<X size={24} />
								</button>
							</div>

							{/* Modal Body */}
							<form onSubmit={handleSubmit} className='p-5 space-y-5'>
								{/* Personal Information */}
								<div className='space-y-4'>
									<h3 className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
										<User size={16} className='text-green-600' />
										Personal Information
									</h3>

									<div className='grid sm:grid-cols-2 gap-4'>
										{/* Full Name */}
										<div className='sm:col-span-2'>
											<label className='block text-sm font-medium text-gray-700 mb-1.5'>
												Full Name <span className='text-red-500'>*</span>
											</label>
											<input
												type='text'
												placeholder='John Doe'
												value={formData.FullName}
												onChange={(e) => {
													setFormData({ ...formData, FullName: e.target.value });
													setErrors({ ...errors, FullName: '' });
												}}
												className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
													errors.FullName ? 'border-red-500 bg-red-50' : 'border-gray-300'
												}`}
											/>
											{errors.FullName && (
												<p className='text-xs text-red-500 mt-1'>{errors.FullName}</p>
											)}
										</div>

										{/* Phone Number */}
										<div className='sm:col-span-2'>
											<label className='block text-sm font-medium text-gray-700 mb-1.5'>
												Phone Number <span className='text-red-500'>*</span>
											</label>
											<div className='relative'>
												<Phone size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
												<input
													type='tel'
													placeholder='+1 234 567 8900'
													value={formData.PhoneNumber}
													onChange={(e) => {
														setFormData({ ...formData, PhoneNumber: e.target.value });
														setErrors({ ...errors, PhoneNumber: '' });
													}}
													className={`w-full border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
														errors.PhoneNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
													}`}
												/>
											</div>
											{errors.PhoneNumber && (
												<p className='text-xs text-red-500 mt-1'>{errors.PhoneNumber}</p>
											)}
										</div>
									</div>
								</div>

								{/* Address Details */}
								<div className='space-y-4'>
									<h3 className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
										<Home size={16} className='text-green-600' />
										Address Details
									</h3>

									{/* Address Line 1 */}
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1.5'>
											Street Address <span className='text-red-500'>*</span>
										</label>
										<input
											type='text'
											placeholder='123 Main Street'
											value={formData.AddressLine1}
											onChange={(e) => {
												setFormData({ ...formData, AddressLine1: e.target.value });
												setErrors({ ...errors, AddressLine1: '' });
											}}
											className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
												errors.AddressLine1 ? 'border-red-500 bg-red-50' : 'border-gray-300'
											}`}
										/>
										{errors.AddressLine1 && (
											<p className='text-xs text-red-500 mt-1'>{errors.AddressLine1}</p>
										)}
									</div>

									{/* Address Line 2 */}
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1.5'>
											Apartment, Suite, etc. <span className='text-gray-400'>(Optional)</span>
										</label>
										<input
											type='text'
											placeholder='Apt 4B, Floor 2'
											value={formData.AddressLine2}
											onChange={(e) => setFormData({ ...formData, AddressLine2: e.target.value })}
											className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all'
										/>
									</div>

									<div className='grid sm:grid-cols-2 gap-4'>
										{/* City */}
										<div>
											<label className='block text-sm font-medium text-gray-700 mb-1.5'>
												City <span className='text-red-500'>*</span>
											</label>
											<input
												type='text'
												placeholder='New York'
												value={formData.City}
												onChange={(e) => {
													setFormData({ ...formData, City: e.target.value });
													setErrors({ ...errors, City: '' });
												}}
												className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
													errors.City ? 'border-red-500 bg-red-50' : 'border-gray-300'
												}`}
											/>
											{errors.City && (
												<p className='text-xs text-red-500 mt-1'>{errors.City}</p>
											)}
										</div>

										{/* State/Province */}
										<div>
											<label className='block text-sm font-medium text-gray-700 mb-1.5'>
												State / Province <span className='text-gray-400'>(Optional)</span>
											</label>
											<input
												type='text'
												placeholder='NY'
												value={formData.StateOrProvince}
												onChange={(e) => setFormData({ ...formData, StateOrProvince: e.target.value })}
												className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all'
											/>
										</div>

										{/* Postal Code */}
										<div>
											<label className='block text-sm font-medium text-gray-700 mb-1.5'>
												Postal Code <span className='text-gray-400'>(Optional)</span>
											</label>
											<input
												type='text'
												placeholder='10001'
												value={formData.PostalCode}
												onChange={(e) => setFormData({ ...formData, PostalCode: e.target.value })}
												className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all'
											/>
										</div>

										{/* Country */}
										<div>
											<label className='block text-sm font-medium text-gray-700 mb-1.5'>
												Country <span className='text-red-500'>*</span>
											</label>
											<div className='relative'>
												<Globe size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
												<input
													type='text'
													placeholder='United States'
													value={formData.Country}
													onChange={(e) => {
														setFormData({ ...formData, Country: e.target.value });
														setErrors({ ...errors, Country: '' });
													}}
													className={`w-full border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${
														errors.Country ? 'border-red-500 bg-red-50' : 'border-gray-300'
													}`}
												/>
											</div>
											{errors.Country && (
												<p className='text-xs text-red-500 mt-1'>{errors.Country}</p>
											)}
										</div>
									</div>
								</div>

								{/* Set as Default Checkbox */}
								<div className='flex items-center gap-3 p-4 bg-gray-50 rounded-lg'>
									<input
										type='checkbox'
										id='setDefault'
										checked={formData.IsDefault === 1}
										onChange={(e) => setFormData({ ...formData, IsDefault: e.target.checked ? 1 : 0 })}
										className='w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500'
									/>
									<label htmlFor='setDefault' className='text-sm text-gray-700 cursor-pointer'>
										Set as my default shipping address
									</label>
								</div>

								{/* Action Buttons */}
								<div className='flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200'>
									<button
										type='button'
										onClick={() => setShowModal(false)}
										className='w-full sm:w-auto px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors'
									>
										Cancel
									</button>
									<button
										type='submit'
										className='w-full sm:w-auto px-6 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium transition-colors flex items-center justify-center gap-2'
									>
										{editId ? (
											<>
												<CheckCircle size={18} />
												Update Address
											</>
										) : (
											<>
												<Plus size={18} />
												Save Address
											</>
										)}
									</button>
								</div>
							</form>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
			<Footer />
		</div>
	);
};

export default Addresses;
