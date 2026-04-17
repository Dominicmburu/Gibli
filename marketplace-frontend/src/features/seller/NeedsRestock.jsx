import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Loader2, Package, AlertTriangle, Box, Euro, CheckCircle } from 'lucide-react';

const NeedsRestock = () => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchRestockProducts = async () => {
			try {
				const res = await api.get('/uploads/needs-restock');
				setProducts(res.data.data || []);
			} catch (err) {
				console.error('Error fetching restock products:', err);
				setError('Failed to load restock products.');
			} finally {
				setLoading(false);
			}
		};
		fetchRestockProducts();
	}, []);

	const handleRemoveFlag = async (productId) => {
		try {
			const res = await api.patch(`/uploads/toggle-restock/${productId}`);
			if (!res.data.data.NeedsRestock) {
				setProducts((prev) => prev.filter((p) => p.ProductId !== productId));
				toast.success('Restock flag removed');
			}
		} catch (err) {
			console.error('Failed to remove restock flag:', err);
			toast.error('Failed to update');
		}
	};

	return (
		<>
			<NavBar />
			<div className='flex min-h-screen bg-gray-50'>
				<SellerSidebar />
				<div className='flex-1 p-2 sm:p-6 overflow-y-auto'>
					{/* Header */}
					<div className='flex items-center gap-3 mb-6'>
						<div className='w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center'>
							<AlertTriangle size={20} className='text-orange-600' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>Needs Restock</h1>
							<p className='text-sm text-gray-500'>
								{products.length} product{products.length !== 1 ? 's' : ''} flagged for restocking
							</p>
						</div>
					</div>

					{loading ? (
						<div className='flex justify-center items-center h-64'>
							<Loader2 className='animate-spin w-8 h-8 text-primary-500' />
						</div>
					) : error ? (
						<p className='text-red-500'>{error}</p>
					) : products.length === 0 ? (
						<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
							<CheckCircle size={48} className='mx-auto text-green-400 mb-4' />
							<h3 className='text-lg font-semibold text-gray-700 mb-2'>All stocked up</h3>
							<p className='text-gray-500 mb-4'>
								No products are flagged for restocking. You can flag products from the My Products page.
							</p>
							<button
								onClick={() => navigate('/my-products')}
								className='text-primary-500 hover:text-primary-600 font-medium text-sm'
							>
								Go to My Products
							</button>
						</div>
					) : (
						<div className='space-y-4'>
							{products.map((product) => (
								<div
									key={product.ProductId}
									className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow'
								>
									<div className='flex items-center gap-4'>
										{/* Image */}
										<div className='w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0'>
											{product.ImageUrl ? (
												<img src={product.ImageUrl} alt={product.ProductName} className='w-full h-full object-cover' />
											) : (
												<div className='w-full h-full flex items-center justify-center'>
													<Package size={20} className='text-gray-300' />
												</div>
											)}
										</div>

										{/* Info */}
										<div className='flex-1 min-w-0'>
											<div className='flex items-center gap-2 mb-1'>
												<h3 className='font-semibold text-gray-900 text-sm truncate'>{product.ProductName}</h3>
												<span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200 flex-shrink-0'>
													<AlertTriangle size={10} /> Restock
												</span>
											</div>
											<p className='text-xs text-gray-400 mb-1'>
												{product.CategoryName}
												{product.SubCategoryName ? ` / ${product.SubCategoryName}` : ''}
											</p>
											<div className='flex items-center gap-4 text-xs'>
												<span className='flex items-center gap-1 text-gray-500'>
													<Box size={12} />
													<span className={`font-semibold ${product.InStock <= 5 ? 'text-red-600' : 'text-gray-900'}`}>
														{product.InStock} in stock
													</span>
												</span>
												<span className='flex items-center gap-1 text-gray-500'>
													<Euro size={12} />
													<span className='font-semibold text-gray-900'>&euro;{Number(product.Price).toFixed(2)}</span>
												</span>
											</div>
										</div>

										{/* Actions */}
										<div className='flex items-center gap-2 flex-shrink-0'>
											<button
												onClick={() => handleRemoveFlag(product.ProductId)}
												className='text-xs font-medium text-green-600 border border-green-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-colors'
											>
												Mark Restocked
											</button>
											<button
												onClick={() => navigate('/my-products')}
												className='text-xs font-medium text-primary-500 border border-primary-200 hover:border-primary-300 px-3 py-1.5 rounded-lg transition-colors'
											>
												Edit Product
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default NeedsRestock;
