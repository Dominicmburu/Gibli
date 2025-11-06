import { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';
import Footer from '../../components/Footer';

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

	// ✅ Handle Delete
	const handleDelete = async (id) => {
		if (!confirm('Are you sure you want to delete this address?')) return;
		try {
			await api.delete(`/shipping/delete-address/${id}`);
			setAddresses((prev) => prev.filter((addr) => addr.ShippingId !== id));
		} catch (err) {
			console.error('Delete failed:', err);
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

	// ✅ Handle Set Default
	const handleSetDefault = async (id, currentState) => {
		try {
			await api.patch(`/shipping/set-as-default/${id}`, { IsDefault: currentState ? 0 : 1 });
			setAddresses((prev) =>
				prev.map(
					(addr) =>
						addr.ShippingId === id
							? { ...addr, IsDefault: currentState ? 0 : 1 }
							: { ...addr, IsDefault: 0 } // only one default allowed
				)
			);
		} catch (err) {
			console.error('Set default failed:', err);
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
			} else {
				await api.post('/shipping/add-shipping', formData);
			}

			const res = await api.get('/shipping/addresses/me');
			setAddresses(res.data || []);

			//  Reset state after submit
			setShowModal(false);
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
		} catch (err) {
			console.error('Failed to save address:', err);
		}
	};

	return (
		<div className='min-h-screen bg-gray-50'>
			<NavBar />

			<div className='max-w-5xl mx-auto p-6'>
				<div className='flex justify-between items-center mb-6'>
					<h1 className='text-2xl font-semibold text-gray-800'>My Addresses</h1>

					<button
						onClick={() => {
							setEditId(null); // reset edit mode
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
							setShowModal(true);
						}}
						className='bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition'
					>
						Add New Address
					</button>
				</div>

				{loading ? (
					<p>Loading addresses...</p>
				) : addresses.length === 0 ? (
					<p className='text-gray-600'>You have no saved addresses yet.</p>
				) : (
					<div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
						{addresses.map((addr) => (
							<motion.div
								key={addr.ShippingId}
								className={`bg-white p-5 rounded-xl shadow-sm border ${
									addr.IsDefault ? 'border-green-500' : 'border-gray-200'
								}`}
								whileHover={{ scale: 1.02 }}
							>
								<h2 className='text-lg font-semibold text-gray-800'>{addr.FullName}</h2>
								<p className='text-sm text-gray-600'>{addr.PhoneNumber}</p>
								<p className='mt-2 text-sm text-gray-600'>
									{addr.AddressLine1}, {addr.City}, {addr.Country}
								</p>
								{addr.IsDefault === 1 && (
									<span className='inline-block mt-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full'>
										Default
									</span>
								)}

								<div className='flex justify-between items-center mt-4'>
									<div className='flex gap-2'>
										<button
											onClick={() => handleEdit(addr)}
											className='text-blue-600 text-sm hover:underline'
										>
											Edit
										</button>
										<button
											onClick={() => handleDelete(addr.ShippingId)}
											className='text-red-600 text-sm hover:underline'
										>
											Delete
										</button>
									</div>
								</div>

								<div className='mt-4 flex items-center gap-2'>
									<input
										type='radio'
										name='defaultAddress'
										checked={addr.IsDefault === 1}
										onChange={() => handleSetDefault(addr.ShippingId, addr.IsDefault)}
									/>
									<label className='text-sm text-gray-700'>Set as default</label>
								</div>
							</motion.div>
						))}
					</div>
				)}
			</div>

			{/* ✅ Add/Edit Modal */}
			<AnimatePresence>
				{showModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
					>
						<motion.div
							initial={{ scale: 0.9 }}
							animate={{ scale: 1 }}
							exit={{ scale: 0.9 }}
							className='bg-white p-6 rounded-2xl w-full max-w-md shadow-xl'
						>
							<h2 className='text-xl font-semibold mb-4'>
								{editId ? 'Edit Address' : 'Add New Address'}
							</h2>
							<form onSubmit={handleSubmit} className='space-y-3'>
								{Object.keys(formData).map(
									(key) =>
										key !== 'IsDefault' && (
											<div key={key} className='flex flex-col gap-1'>
												<input
													type='text'
													placeholder={key}
													value={formData[key]}
													onChange={(e) => {
														setFormData({ ...formData, [key]: e.target.value });
														setErrors({ ...errors, [key]: '' }); // clear error on change
													}}
													className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none ${
														errors[key]
															? 'border-red-500 focus:ring-red-500'
															: 'focus:ring-green-500'
													}`}
												/>
												{errors[key] && <p className='text-xs text-red-500'>{errors[key]}</p>}
											</div>
										)
								)}

								<div className='flex justify-end gap-3 mt-4'>
									<button
										type='button'
										onClick={() => setShowModal(false)}
										className='px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100'
									>
										Cancel
									</button>
									<button
										type='submit'
										className='px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700'
									>
										{editId ? 'Update' : 'Save'}
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
