import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
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
import CheckoutFail from './features/stripe/CheckoutFail';
import SellerDashboard from './features/seller/SellerDashboard';
import SellerProducts from './features/seller/SellerProducts';
import SellerOrders from './features/seller/SellerOrders';
import SellerAnalytics from './features/seller/SellerAnalytics';
import StoreSettings from './features/seller/StoreSettings';
import NeedsRestock from './features/seller/NeedsRestock';
import AddProduct from './features/seller/AddProduct';
import CategoryPage from './features/filters/categories/CategoryPage';
import FinalizeCheckout from './features/checkout/FinalizeCheckout';
import Addresses from './features/address-book/Addresses';

function App() {
	return (
		<>
			<Routes>
				<Route path='/' element={<Home />} />
				<Route path='/signup' element={<SignupForm />} />
				<Route path='/login' element={<LoginForm />} />
				<Route path='/forgot-password' element={<ForgotPassword />} />
				<Route path='/reset-password' element={<ResetPassword />} />
				<Route path='/product/:id' element={<ProductDetails />} />
				<Route path='/cart' element={<Cart />} />
				<Route path='/profile' element={<Profile />} />
				<Route path='/wishlist' element={<WishList />} />
				<Route path='/address-book' element={<Addresses />} />
				{/* CHECKOUT ROUTES */}
				<Route path='/finalize-checkout' element={<FinalizeCheckout />} />
				<Route path='/payment/success' element={<CheckoutSuccess />} />
				<Route path='/payment/fail' element={<CheckoutFail />} />
				<Route path='/orders' element={<OrdersPage />} />
				{/* SELLER ROUTES */}
				<Route path='/become-seller' element={<BecomeSeller />} />
				<Route path='/seller/register' element={<SellerRegistration />} />
				<Route path='/seller-dashboard' element={<SellerDashboard />} />
				<Route path='/my-products' element={<SellerProducts />} />
				<Route path='/my-orders' element={<SellerOrders />} />
				<Route path='/restock' element={<NeedsRestock />} />
				<Route path='/new-product' element={<AddProduct />} />
				<Route path='/store-settings' element={<StoreSettings />} />
				{/* CATEGORY ROUTES */}
				<Route path='/category/:id' element={<CategoryPage />} />
			</Routes>
			<Toaster position='top-center' reverseOrder={false} />
		</>
	);
}

export default App;
