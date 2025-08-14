import { useState } from 'react';
import api from '../../../api/axios';
import { Link, useNavigate } from 'react-router-dom';

const SignupForm = () => {
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate(); // React Router navigation hook

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		// Basic client-side validation
		if (!email || !username || !password || !confirmPassword) {
			setError('All fields are required.');
			return;
		}
		if (password !== confirmPassword) {
			setError('Passwords do not match.');
			return;
		}

		try {
			const response = await api.post('/users/register', {
				Email: email,
				Username: username,
				Password: password,
				ConfirmPassword: confirmPassword,
			});
			console.log('This is the response', response);
			setLoading(true);
			setSuccess(response.data.message || 'Registration successful!');
			setEmail('');
			setUsername('');
			setPassword('');
			setConfirmPassword('');
			navigate('/login');
		} catch (err) {
			console.log('error object', err);
			setError(err.response?.data?.message || 'Registration failed. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='form-container'>
			<h4>Register</h4>
			{error && <p style={{ color: 'red' }}>{error}</p>}
			{success && <p style={{ color: 'green' }}>{success}</p>}
			<form onSubmit={handleSubmit} noValidate>
				<label htmlFor='email'>Email</label>
				<input
					type='email'
					id='email'
					placeholder='Enter your email'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>

				<label htmlFor='username'>Username</label>
				<input
					type='text'
					id='username'
					placeholder='Choose a username'
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					required
				/>

				<label htmlFor='password'>Password</label>
				<input
					type='password'
					id='password'
					placeholder='Enter password'
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					minLength={6}
				/>

				<label htmlFor='confirmPassword'>Confirm Password</label>
				<input
					type='password'
					id='confirmPassword'
					placeholder='Confirm password'
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					required
					minLength={6}
				/>

				<button type='submit' disabled={loading}>
					{loading ? 'Registering...' : 'Register'}
				</button>
			</form>
			<p>
				Already have an account? <Link to='/login'>Login here</Link>
			</p>
		</div>
	);
};

export default SignupForm;
