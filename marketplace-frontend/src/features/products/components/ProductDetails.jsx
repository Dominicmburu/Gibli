import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../../api/axios';
import { useParams } from 'react-router-dom';
import NavBar from '../../../components/NavBar';
import AddToCart from '../../cart/components/AddToCart';
import BuyNow from '../../checkout/BuyNow';
import Footer from '../../../components/Footer';
import Suggestions from './Suggestions';
import AddToWishList from '../../wishlist/components/AddToWishlist';
import { useAuth } from '../../../utils/useAuth';
import toast from 'react-hot-toast';

import { Truck, Zap, Package, ArrowLeft, Share2, X, Copy, Check, Star, ThumbsUp, MessageCircle } from 'lucide-react';
import ChatModal from '../../chat/ChatModal';

/* ─── Share Modal ─────────────────────────────────────────────────────────── */
const ShareModal = ({ isOpen, onClose, product }) => {
	const [copied, setCopied] = useState(false);

	if (!isOpen) return null;

	const shareUrl = window.location.href;
	const productName = product?.ProductName || 'Check out this product';
	const encodedUrl = encodeURIComponent(shareUrl);
	const encodedText = encodeURIComponent(`${productName} — €${product?.Price?.toFixed(2)}\n${shareUrl}`);

	const shareLinks = [
		{
			label: 'Facebook',
			href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
			bg: 'bg-[#1877F2]',
			icon: (
				<svg viewBox='0 0 24 24' fill='white' className='w-6 h-6'>
					<path d='M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z' />
				</svg>
			),
		},
		{
			label: 'WhatsApp',
			href: `https://wa.me/?text=${encodedText}`,
			bg: 'bg-[#25D366]',
			icon: (
				<svg viewBox='0 0 24 24' fill='white' className='w-6 h-6'>
					<path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
				</svg>
			),
		},
		{
			label: 'SMS',
			href: `sms:?body=${encodedText}`,
			bg: 'bg-[#0078D4]',
			icon: (
				<svg viewBox='0 0 24 24' fill='white' className='w-6 h-6'>
					<path d='M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z' />
				</svg>
			),
		},
		{
			label: 'Email',
			href: `mailto:?subject=${encodeURIComponent(productName)}&body=${encodedText}`,
			bg: 'bg-[#EA4335]',
			icon: (
				<svg viewBox='0 0 24 24' fill='white' className='w-6 h-6'>
					<path d='M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z'/>
				</svg>
			),
		},
	];

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// fallback
		}
	};

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'
			onClick={onClose}
		>
			<div
				className='bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden'
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
					<h2 className='text-base font-semibold text-gray-800'>Share</h2>
					<button
						onClick={onClose}
						className='p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors'
					>
						<X size={18} />
					</button>
				</div>

				{/* Product Preview */}
				<div className='flex items-center gap-3 mx-5 my-4 p-3 bg-gray-50 rounded-xl border border-gray-100'>
					{product?.ProductImages?.[0]?.ImageUrl && (
						<img
							src={product.ProductImages[0].ImageUrl}
							alt={product.ProductName}
							className='w-14 h-14 object-cover rounded-lg flex-shrink-0'
						/>
					)}
					<p className='text-xs text-gray-600 line-clamp-3 leading-relaxed'>
						{product?.ProductName}
					</p>
				</div>

				{/* Share Buttons */}
				<div className='flex justify-around items-start px-5 pb-6 pt-2'>
					{shareLinks.map(({ label, href, bg, icon }) => (
						<a
							key={label}
							href={href}
							target='_blank'
							rel='noopener noreferrer'
							className='flex flex-col items-center gap-2 group'
						>
							<div
								className={`w-14 h-14 rounded-full ${bg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}
							>
								{icon}
							</div>
							<span className='text-xs text-gray-600 font-medium'>{label}</span>
						</a>
					))}

					{/* Copy Link */}
					<button onClick={handleCopy} className='flex flex-col items-center gap-2 group'>
						<div
							className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-all duration-200 ${copied ? 'bg-green-500' : 'bg-gray-200'
								}`}
						>
							{copied ? (
								<Check size={22} className='text-white' />
							) : (
								<Copy size={22} className='text-gray-600' />
							)}
						</div>
						<span className='text-xs text-gray-600 font-medium'>
							{copied ? 'Copied!' : 'Copy Link'}
						</span>
					</button>
				</div>
			</div>
		</div>
	);
};

const DEFAULT_REVIEW_SUMMARY = {
	AverageRating: 0,
	TotalReviews: 0,
	WithContentCount: 0,
	WithPhotosCount: 0,
	Star5: 0,
	Star4: 0,
	Star3: 0,
	Star2: 0,
	Star1: 0,
};

const renderStars = (value, size = 16) => (
	<div className='flex items-center gap-1'>
		{[1, 2, 3, 4, 5].map((star) => (
			<Star
				key={star}
				size={size}
				className={star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
			/>
		))}
	</div>
);

/* ─── Main Component ──────────────────────────────────────────────────────── */
const ProductDetails = () => {
	const [productDetails, setProductDetails] = useState(null);
	const [selectedImage, setSelectedImage] = useState(null);
	const [loading, setLoading] = useState(true);
	const [shareOpen, setShareOpen] = useState(false);
	const [reviewsOpen, setReviewsOpen] = useState(false);
	const [reviewSummary, setReviewSummary] = useState(DEFAULT_REVIEW_SUMMARY);
	const [reviews, setReviews] = useState([]);
	const [reviewLoading, setReviewLoading] = useState(false);
	const [reviewFilter, setReviewFilter] = useState('all');
	const [reviewStarFilter, setReviewStarFilter] = useState('');
	const [reviewSort, setReviewSort] = useState('latest');
	const [reviewPage, setReviewPage] = useState(1);
	const [reviewHasMore, setReviewHasMore] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);
	const [sellerReplyDraft, setSellerReplyDraft] = useState({});
	const reviewLoadRef = useRef(null);
	const { id } = useParams();

	const { userInfo, isLoggedIn } = useAuth();
	const currentUserId = userInfo?.id ?? null;
	// Anyone logged in may vote except the seller of this product (that seller can still vote on other sellers' listings).
	const canVoteHelpful =
		isLoggedIn &&
		!!currentUserId &&
		!!productDetails &&
		currentUserId !== productDetails.SellerId;
	const isSeller = !!(productDetails && currentUserId && currentUserId === productDetails.SellerId);
	const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;

	const starCounts = useMemo(
		() => ({
			5: reviewSummary.Star5 || 0,
			4: reviewSummary.Star4 || 0,
			3: reviewSummary.Star3 || 0,
			2: reviewSummary.Star2 || 0,
			1: reviewSummary.Star1 || 0,
		}),
		[reviewSummary]
	);


	useEffect(() => {
		const fetchProductDetails = async () => {
			try {
				setLoading(true);
				const response = await api.get(`/products/product/details/${id}`);
				setProductDetails(response.data);
				setSelectedImage(response.data.ProductImages?.[0]?.ImageUrl);
			} catch (error) {
				console.error('Error fetching product details:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchProductDetails();
	}, [id]);

	const fetchReviews = async ({ reset = false } = {}) => {
		try {
			setReviewLoading(true);
			const nextPage = reset ? 1 : reviewPage;
			const response = await api.get(`/reviews/product/${id}`, {
				params: {
					page: nextPage,
					limit: 10,
					filter: reviewFilter,
					star: reviewStarFilter || undefined,
					sort: reviewSort,
				},
			});
			const payload = response.data?.data;
			if (!payload) return;
			setReviewSummary(payload.summary || DEFAULT_REVIEW_SUMMARY);
			setReviews((prev) => (reset ? payload.reviews || [] : [...prev, ...(payload.reviews || [])]));
			setReviewHasMore(!!payload.pagination?.hasMore);
			setReviewPage(nextPage + 1);
		} catch (error) {
			console.error('Error fetching reviews:', error);
		} finally {
			setReviewLoading(false);
		}
	};

	useEffect(() => {
		fetchReviews({ reset: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, reviewFilter, reviewStarFilter, reviewSort]);

	useEffect(() => {
		if (!reviewsOpen || isMobile || !reviewHasMore) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !reviewLoading) {
					fetchReviews();
				}
			},
			{ threshold: 0.5 }
		);
		if (reviewLoadRef.current) observer.observe(reviewLoadRef.current);
		return () => observer.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [reviewsOpen, isMobile, reviewHasMore, reviewLoading, reviews.length]);

	const toggleHelpful = async (reviewId, isHelpfulByCurrentUser) => {
		if (!isLoggedIn) {
			toast.error('Please login to vote on reviews.');
			return;
		}
		try {
			await api.post(`/reviews/${reviewId}/helpful`, { helpful: !isHelpfulByCurrentUser });
			setReviews((prev) =>
				prev.map((review) =>
					review.ReviewId === reviewId
						? {
							...review,
							IsHelpfulByCurrentUser: !isHelpfulByCurrentUser,
							HelpfulCount: !isHelpfulByCurrentUser ? review.HelpfulCount + 1 : Math.max(0, review.HelpfulCount - 1),
						}
						: review
				)
			);
		} catch (error) {
			console.error('Failed to toggle helpful vote:', error);
			toast.error('Unable to update helpful vote right now.');
		}
	};

	const submitSellerReply = async (reviewId) => {
		const message = (sellerReplyDraft[reviewId] || '').trim();
		if (!message) return;
		try {
			await api.patch(`/reviews/${reviewId}/response`, { response: message });
			setReviews((prev) =>
				prev.map((review) =>
					review.ReviewId === reviewId
						? { ...review, SellerResponse: message, SellerResponseAt: new Date().toISOString() }
						: review
				)
			);
			setSellerReplyDraft((prev) => ({ ...prev, [reviewId]: '' }));
			toast.success('Response saved.');
		} catch (error) {
			console.error('Failed to submit seller response:', error);
			toast.error(error?.response?.data?.message || 'Unable to respond right now.');
		}
	};

	if (loading || !productDetails) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-primary-500 mx-auto'></div>
					<p className='mt-4 text-gray-600 text-sm sm:text-base'>Loading product details...</p>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen flex flex-col bg-gray-50'>
			<NavBar />

			<ShareModal
				isOpen={shareOpen}
				onClose={() => setShareOpen(false)}
				product={productDetails}
			/>

			{chatOpen && productDetails && (
				<ChatModal
					isOpen={chatOpen}
					onClose={() => setChatOpen(false)}
					sellerId={productDetails.SellerId}
					contextType='product'
					contextId={productDetails.ProductId}
					contextData={{
						name: productDetails.ProductName,
						image: productDetails.ProductImages?.[0]?.ImageUrl || null,
						price: productDetails.Price,
					}}
					sellerName={productDetails.BusinessName}
				/>
			)}

			{/* Back Button */}
			<div className='lg:hidden px-4 py-3 bg-white border-b'>
				<button
					onClick={() => window.history.back()}
					className='flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors'
				>
					<ArrowLeft size={20} />
					<span className='text-sm font-medium'>Back to products</span>
				</button>
			</div>

			{/* Main Content */}
			<div className='flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
				<div className='bg-white rounded-lg shadow-md overflow-hidden'>
					<div className='flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8'>

						{/* Images */}
						<div className='w-full lg:w-1/2 order-1 lg:order-2'>
							<div className='sticky top-20'>
								<div className='relative mb-3 sm:mb-4'>
									<img
										src={selectedImage}
										alt='Selected product'
										className='w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] object-cover rounded-lg shadow-lg'
									/>
								</div>
								<div className='flex lg:grid lg:grid-cols-4 gap-2 sm:gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide'>
									{productDetails.ProductImages?.map((img, idx) => (
										<img
											key={img.ImageId}
											src={img.ImageUrl}
											alt={`Thumbnail ${idx + 1}`}
											className={`
                        flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 lg:w-full lg:h-20 xl:h-24
                        object-cover rounded-lg cursor-pointer border-2 transition-all
                        ${selectedImage === img.ImageUrl
													? 'border-primary-500 scale-105 shadow-md'
													: 'border-gray-200 hover:border-primary-400'
												}
                      `}
											onClick={() => setSelectedImage(img.ImageUrl)}
										/>
									))}
								</div>
							</div>
						</div>

						{/* Product Info */}
						<div className='w-full lg:w-1/2 order-2 lg:order-1 space-y-4 sm:space-y-6'>

							{/* ── Title row: name + wish + share all on same line ── */}
							<div className='flex items-start gap-2'>
								{/* Product name fills remaining space */}
								<h1 className='flex-1 text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight'>
									{productDetails.ProductName}
								</h1>

								{/* Wish + Share buttons — same size, same style, same row */}
								<div className='flex items-center gap-2 flex-shrink-0'>
									<AddToWishList ProductId={productDetails.ProductId} />

									<button
										onClick={() => setShareOpen(true)}
										title='Share product'
										className='flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 bg-white border-gray-200 text-gray-500 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50 transition-all duration-200 flex-shrink-0'
									>
										<Share2 size={16} />
									</button>
								</div>
							</div>

							{/* Price */}
							<div className='bg-primary-50 p-4 sm:p-6 rounded-lg border-2 border-primary-200'>
								<p className='text-3xl sm:text-4xl lg:text-5xl text-primary-500 font-bold'>
									€{productDetails.Price?.toFixed(2)}
								</p>
								<div className='mt-3 sm:mt-4 flex items-center gap-2'>
									<Package className='w-5 h-5 text-gray-600' />
									<span className='text-sm sm:text-base text-gray-700'>
										<span className='font-semibold text-primary-500'>{productDetails.InStock}</span>{' '}
										units in stock
									</span>
								</div>
							</div>

							{/* Description */}
							<div>
								<h3 className='text-base sm:text-lg font-semibold text-gray-900 mb-2'>Description</h3>
								<p className='text-sm sm:text-base text-gray-600 leading-relaxed'>
									{productDetails.Description}
								</p>
							</div>

							<div className='border border-gray-200 rounded-lg p-4'>
								<button
									type='button'
									onClick={() => setReviewsOpen((prev) => !prev)}
									className='text-left w-full'
								>
									<div className='flex flex-wrap items-center gap-2'>
										{renderStars(Math.round(Number(reviewSummary.AverageRating || 0)), 15)}
										<span className='font-semibold text-gray-900'>
											{Number(reviewSummary.AverageRating || 0).toFixed(1)}
										</span>
										<span className='text-sm text-gray-600 underline'>
											({reviewSummary.TotalReviews || 0} Customer reviews)
										</span>
									</div>
								</button>
							</div>

							{/* Shipping */}
							<div className='space-y-3'>
								<h3 className='text-base sm:text-lg font-semibold text-gray-900'>Shipping Options</h3>
								<div className='grid grid-cols-2 gap-3'>
									<div className='flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200'>
										<Truck className='w-4 h-4 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0' />
										<div className='min-w-0'>
											<p className='text-xs sm:text-sm font-semibold text-gray-900'>Standard</p>
											<p className='text-sm sm:text-base font-bold text-blue-600'>
												€{productDetails.ShippingPrice}
											</p>
										</div>
									</div>
									<div className='flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200'>
										<Zap className='w-4 h-4 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0' />
										<div className='min-w-0'>
											<p className='text-xs sm:text-sm font-semibold text-gray-900'>Express</p>
											<p className='text-sm sm:text-base font-bold text-purple-600'>
												€{productDetails.ExpressShippingPrice}
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Seller */}
							<div className='p-4 sm:p-5 bg-gray-50 rounded-lg border border-gray-200'>
								<h3 className='text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3'>
									Seller Information
								</h3>
								<div className='space-y-1.5 sm:space-y-2'>
									<p className='text-sm sm:text-base'>
										<span className='text-gray-600'>Business:</span>{' '}
										<span className='font-semibold text-primary-500'>{productDetails.BusinessName}</span>
									</p>
									<p className='text-sm sm:text-base'>
										<span className='text-gray-600'>Location:</span>{' '}
										<span className='font-semibold text-primary-500'>{productDetails.Country}</span>
									</p>
								</div>
								{isLoggedIn && !isSeller && (
									<button
										onClick={() => setChatOpen(true)}
										className='mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl transition-colors'
									>
										<MessageCircle size={16} />
										Chat Seller
									</button>
								)}
							</div>

							{/* CTA Buttons */}
							<div className='space-y-3 sm:space-y-4 pt-2 sm:pt-4 border-t'>
								<BuyNow product={productDetails} />
								<AddToCart ProductId={productDetails.ProductId} SellerId={productDetails.SellerId} />
							</div>
						</div>
					</div>
				</div>

				{(isMobile || reviewsOpen) && (
					<div className='bg-white rounded-lg shadow-md p-4 sm:p-6 lg:p-8 mt-6'>
						<div className='border border-gray-200 rounded-lg p-4'>
							<div className='grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-8 items-start'>
								<div className='text-left md:border-r md:border-gray-200 md:pr-6'>
									<p className='text-5xl font-semibold text-red-500 leading-none'>
										{Number(reviewSummary.AverageRating || 0).toFixed(1)}
										<span className='text-4xl text-gray-500'> / 5</span>
									</p>
									<div className='mt-2'>{renderStars(Math.round(Number(reviewSummary.AverageRating || 0)), 24)}</div>
									<p className='text-sm text-gray-500 mt-2'>({reviewSummary.TotalReviews || 0} Ratings)</p>
								</div>

								<div className='space-y-2'>
									{[5, 4, 3, 2, 1].map((star) => {
										const totalMax = Math.max(starCounts[5], starCounts[4], starCounts[3], starCounts[2], starCounts[1], 1);
										const percentage = (starCounts[star] / totalMax) * 100;
										return (
											<div key={star} className='grid grid-cols-[110px_1fr_42px] items-center gap-3'>
												<div className='flex items-center gap-0.5'>{renderStars(star, 18)}</div>
												<div className='h-3 bg-gray-200 rounded-full overflow-hidden'>
													<div className='h-full bg-red-500 rounded-full' style={{ width: `${percentage}%` }} />
												</div>
												<p className='text-xs text-gray-500 text-right'>{starCounts[star]}</p>
											</div>
										);
									})}
								</div>
							</div>
						</div>

						<div className='flex flex-wrap items-center gap-2 mt-4'>
							<button
								type='button'
								onClick={() => setReviewFilter('all')}
								className={`px-3 py-1.5 rounded-full text-sm border ${reviewFilter === 'all' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-300'}`}
							>
								All Reviews ({reviewSummary.TotalReviews || 0})
							</button>
							<button
								type='button'
								onClick={() => {
									setReviewSort('latest');
									setReviewFilter('latest');
								}}
								className={`px-3 py-1.5 rounded-full text-sm border ${reviewFilter === 'latest' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-300'}`}
							>
								Latest
							</button>
							<button
								type='button'
								onClick={() => setReviewFilter('content')}
								className={`px-3 py-1.5 rounded-full text-sm border ${reviewFilter === 'content' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-300'}`}
							>
								With Content ({reviewSummary.WithContentCount || 0})
							</button>
							<button
								type='button'
								onClick={() => setReviewFilter('photos')}
								className={`px-3 py-1.5 rounded-full text-sm border ${reviewFilter === 'photos' ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-300'}`}
							>
								With Photos ({reviewSummary.WithPhotosCount || 0})
							</button>
							<select
								value={reviewStarFilter}
								onChange={(event) => setReviewStarFilter(event.target.value)}
								className='px-3 py-1.5 rounded-full text-sm border border-gray-300 bg-white'
							>
								<option value=''>All Stars</option>
								<option value='5'>5 Stars ({starCounts[5]})</option>
								<option value='4'>4 Stars ({starCounts[4]})</option>
								<option value='3'>3 Stars ({starCounts[3]})</option>
								<option value='2'>2 Stars ({starCounts[2]})</option>
								<option value='1'>1 Star ({starCounts[1]})</option>
							</select>
						</div>

						<div className='space-y-3 mt-4'>
							{reviews.map((review) => (
								<div key={review.ReviewId} className='bg-white rounded-lg border border-gray-200 p-4'>
									<div className='flex items-start gap-3'>
										<div className='w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600'>
											{(review.Username || 'U').charAt(0).toUpperCase()}
										</div>
										<div className='flex-1 min-w-0 text-left'>
											<p className='font-semibold text-gray-900 text-left'>{review.Username}</p>
											<p className='text-xs text-gray-500 text-left'>
												{review.UpdatedAt
													? <>Updated {new Date(review.UpdatedAt).toLocaleDateString('en-GB')}</>
													: new Date(review.CreatedAt).toLocaleDateString('en-GB')
												} • {productDetails.ProductName}
											</p>
											<div className='mt-1 text-left'>{renderStars(review.Rating, 14)}</div>
										</div>
									</div>

									{review.Comment && (
										<p className='text-sm text-gray-700 mt-3 whitespace-pre-line text-left'>{review.Comment}</p>
									)}

									{Array.isArray(review.Media) && review.Media.length > 0 && (
										<div className='mt-3 flex gap-2 overflow-x-auto pb-1'>
											{review.Media.map((media) =>
												media.MediaType === 'video' ? (
													<video key={media.MediaId} src={media.MediaUrl} controls className='w-28 h-28 rounded-md object-cover flex-shrink-0' />
												) : (
													<img key={media.MediaId} src={media.MediaUrl} alt='Review media' className='w-20 h-20 rounded-md object-cover flex-shrink-0' />
												)
											)}
										</div>
									)}

									<div className='mt-3 flex flex-col items-end gap-1'>
										{canVoteHelpful && (
											<button
												type='button'
												onClick={() => toggleHelpful(review.ReviewId, !!review.IsHelpfulByCurrentUser)}
												className={`text-xs px-2.5 py-1.5 rounded-full border flex items-center gap-1 ${review.IsHelpfulByCurrentUser ? 'bg-primary-50 border-primary-300 text-primary-600' : 'bg-white border-gray-300 text-gray-600'}`}
											>
												<ThumbsUp size={14} />
												Helpful
											</button>
										)}
										<p className='text-xs text-gray-500'>
											{review.HelpfulCount || 0} buyers found this review helpful
										</p>
									</div>

									{review.SellerResponse && (
										<div className='mt-3 bg-gray-50 border border-gray-200 rounded-md p-3 text-left'>
											<p className='text-xs font-semibold text-gray-700 mb-1'>Seller response</p>
											<p className='text-sm text-gray-700'>{review.SellerResponse}</p>
										</div>
									)}

									{isSeller && !review.SellerResponse && (
										<div className='mt-3 flex items-start gap-2'>
											<input
												type='text'
												value={sellerReplyDraft[review.ReviewId] || ''}
												onChange={(event) =>
													setSellerReplyDraft((prev) => ({ ...prev, [review.ReviewId]: event.target.value }))
												}
												placeholder='Respond to this review'
												className='flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm'
											/>
											<button
												type='button'
												onClick={() => submitSellerReply(review.ReviewId)}
												className='px-3 py-2 text-sm rounded-md bg-primary-500 text-white'
											>
												Reply
											</button>
										</div>
									)}
								</div>
							))}

							{reviewLoading && (
								<p className='text-sm text-gray-500 text-center py-2'>Loading reviews...</p>
							)}

							{!isMobile && reviewHasMore && (
								<div ref={reviewLoadRef} className='h-6' />
							)}

							{isMobile && reviewHasMore && (
								<button
									type='button'
									onClick={() => fetchReviews()}
									className='w-full border border-gray-300 rounded-md py-2 text-sm text-gray-700 bg-white'
								>
									Show more reviews
								</button>
							)}
						</div>
					</div>
				)}
			</div>

			<Suggestions />
			<Footer />
		</div>
	);
};

export default ProductDetails;