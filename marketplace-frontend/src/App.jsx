import { Route, Routes } from 'react-router-dom';
import './App.css';
import SignupForm from './features/auth/components/SignupForm';
import LoginForm from './features/auth/components/LoginForm';
import Home from './features/products/components/Home';

function App() {
	return (
		<Routes>
			<Route path='/' element={<Home />} />
			<Route path='/signup' element={<SignupForm />} />
			<Route path='/login' element={<LoginForm />} />
		</Routes>
	);
}

export default App;
