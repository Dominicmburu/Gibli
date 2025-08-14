document.addEventListener('DOMContentLoaded', async () => {
	const urlParams = new URLSearchParams(window.location.search);
	const productId = urlParams.get('id');

	if (!productId) {
		document.getElementById('product-details').textContent = 'No product ID specified.';
		return;
	}

	try {
		const response = await fetch(`http://localhost:5000/products/product/details/${productId}`);
		const data = await response.json();

		const { ProductName, Description, Price, InStock, BusinessName, Country, Images = [] } = data;

		// Set main image
		const mainImage = document.getElementById('main-image');
		mainImage.src = Images[0] || '';

		// Create thumbnails
		const thumbnailContainer = document.getElementById('thumbnail-container');
		thumbnailContainer.innerHTML = ''; // clear any default

		Images.forEach((imgUrl, index) => {
			const thumb = document.createElement('img');
			thumb.src = imgUrl;
			thumb.className =
				'w-20 h-20 object-cover rounded-md border border-border cursor-pointer transition duration-200 hover:scale-105';
			if (index === 0) thumb.classList.add('ring-2', 'ring-primary');

			thumb.addEventListener('click', () => {
				mainImage.src = imgUrl;

				// Remove active ring from others
				document
					.querySelectorAll('#thumbnail-container img')
					.forEach((img) => img.classList.remove('ring-2', 'ring-primary'));
				thumb.classList.add('ring-2', 'ring-primary');
			});

			thumbnailContainer.appendChild(thumb);
		});

		// Product info
		const infoDiv = document.getElementById('product-info');
		infoDiv.innerHTML = `
			<h2 class="text-2xl font-bold text-primary">${ProductName}</h2>
			<p class="text-gray-700">${Description}</p>
			<p class="text-xl font-semibold mt-2 text-primary">${Price} USD</p>
			<p class="text-sm font-semibold text-${InStock ? 'green-600' : 'red-600'}">
				${InStock ? 'In Stock' : 'Out of Stock'}
			</p>
			<p class="text-xs text-muted">Sold by: ${BusinessName} (${Country})</p>
			<button id="addToCartBtn"
				class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
				Add to Cart
			</button>
		`;

		document.getElementById('addToCartBtn').addEventListener('click', async () => {
			const token = localStorage.getItem('token');
			if (!token) return (window.location.href = '/login.html');

			const cartRes = await fetch('http://localhost:5000/cart/add', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ productId }),
			});

			const result = await cartRes.json();
			alert(result.message || 'Added to cart!');
		});
	} catch (err) {
		console.error('Error fetching product details:', err);
		document.getElementById('product-details').textContent = 'Error loading product.';
	}
});
