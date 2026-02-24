import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import SubscriptionDetail from './features/subscription/SubscriptionDetail';
import SubscriptionSuccess from './features/subscription/SubscriptionSuccess';
import SellerSubscription from './features/seller/SellerSubscription';
import SignupForm from './features/auth/components/SignupForm';
import LoginForm from './features/auth/components/LoginForm';
import Home from './features/products/components/Home';
import ProductDetails from './features/products/components/ProductDetails';
import Cart from './features/cart/components/Cart';
import Profile from './features/profile/components/Profile';
import CheckoutSuccess from './features/stripe/CheckoutSuccess';
import WishList from './features/wishlist/components/WishList';
import BecomeSeller from './features/auth/components/BecomeSeller';
import SellerRegistration from './features/auth/components/SellerRegistration';
import ForgotPassword from './features/auth/components/ForgotPassword';
import ResetPassword from './features/auth/components/ResetPassword';
import OrdersPage from './features/orders/OrdersPage';
import OrderDetail from './features/orders/OrderDetail';
import CheckoutFail from './features/stripe/CheckoutFail';
import SellerDashboard from './features/seller/SellerDashboard';
import SellerProducts from './features/seller/SellerProducts';
import SellerOrders from './features/seller/SellerOrders';
import SellerOrderDetail from './features/seller/SellerOrderDetail';
import SellerAnalytics from './features/seller/SellerAnalytics';
import SellerSales from './features/seller/SellerSales';
import SellerRevenue from './features/seller/SellerRevenue';
import StoreSettings from './features/seller/StoreSettings';
import NeedsRestock from './features/seller/NeedsRestock';
import AddProduct from './features/seller/AddProduct';
import CategoryPage from './features/filters/categories/CategoryPage';
import FinalizeCheckout from './features/checkout/FinalizeCheckout';
import Addresses from './features/address-book/Addresses';
import SearchResultsPage from './features/products/components/SearchResultsPage';
import VerifyPage from './features/auth/components/VerifyPage';
import ResendVerification from './features/auth/components/ResendVerification';
import { CartProvider } from './context/CartContext';

function App() {
	return (
		<>
			<CartProvider>
				<Routes>
					{/* AUTH ROUTES */}
					<Route path='/' element={<Home />} />
					<Route path='/signup' element={<SignupForm />} />
					<Route path='/login' element={<LoginForm />} />
					<Route path='/forgot-password' element={<ForgotPassword />} />
					<Route path='/reset-password' element={<ResetPassword />} />
					<Route path='/verify/:token' element={<VerifyPage />} />
					<Route path='/resend-verification' element={<ResendVerification />} />

					{/* BUYING JOURNEY ROUTES */}
					<Route path='/product/:id' element={<ProductDetails />} />
					<Route path='/search' element={<SearchResultsPage />} />
					<Route path='/cart' element={<Cart />} />
					<Route path='/profile' element={<Profile />} />
					<Route path='/wishlist' element={<WishList />} />
					<Route path='/address-book' element={<Addresses />} />

					{/* CHECKOUT ROUTES */}
					<Route path='/finalize-checkout' element={<FinalizeCheckout />} />
					<Route path='/payment/success' element={<CheckoutSuccess />} />
					<Route path='/payment/fail' element={<CheckoutFail />} />
					<Route path='/orders' element={<OrdersPage />} />
					<Route path='/orders/:orderId' element={<OrderDetail />} />

					{/* SELLER ROUTES */}
					<Route path='/become-seller' element={<BecomeSeller />} />
					<Route path='/seller/register' element={<SellerRegistration />} />
					<Route path='/seller-dashboard' element={<SellerDashboard />} />
					<Route path='/my-products' element={<SellerProducts />} />
					<Route path='/my-orders' element={<SellerOrders />} />
					<Route path='/my-orders/:orderId' element={<SellerOrderDetail />} />
					<Route path='/restock' element={<NeedsRestock />} />
					<Route path='/new-product' element={<AddProduct />} />
					<Route path='/store-settings' element={<StoreSettings />} />
					<Route path='/my-sales' element={<SellerSales />} />
					<Route path='/my-revenue' element={<SellerRevenue />} />
					<Route path='/seller-subscription' element={<SellerSubscription />} />

					{/* SUBSCRIPTION ROUTES */}
					<Route path='/subscription/success' element={<SubscriptionSuccess />} />
					<Route path='/subscription/:planId' element={<SubscriptionDetail />} />

					{/* CATEGORY ROUTES */}
					<Route path='/category/:id' element={<CategoryPage />} />
				</Routes>
				<Toaster position='top-center' reverseOrder={false} />
			</CartProvider>
		</>
	);
}

export default App;
