const ProductCard = (props) => {
	const { ProductId, ProductName, Description, Price, InStock, ImageUrl, BusinessName, Country } = props;
	const handleClick = (id) => {
		alert(`product id ${ProductId} was clicked`);
	};
	return (
		<article
			className='bg-surface rounded-lg shadow-sm border border-border overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer'
			onClick={handleClick}
		>
			<img
				className='w-full h-48 object-cover'
				src={ImageUrl}
				alt={`products ${ProductName} picture`}
				loading='lazy'
			/>
			<div className='p-4 flex flex-col flex-grow'>
				<h2 className='text-primary font-semibold text-lg truncate'>{ProductName}</h2>
				<p class='text-secondary text-sm flex-grow mt-1 truncate'>${Description}</p>
				<p className='mt-2 font-semibold text-primary'>€ {Price}</p>
				{/* <p className='display-stock'> {InStock}</p> */}
				<p className='mt-2 text-xs text-muted'>
					Seller: {BusinessName} | {Country}
				</p>
			</div>
		</article>
	);
};
export default ProductCard;
