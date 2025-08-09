import { useEffect, useState } from 'react';
import api from '../../../api/axios';

const SignupForm = () => {
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();
		console.log(import.meta.env.VITE_API_BASE_URL);
	};

	<div className='form-row'>
		<label htmlFor='name' className='form-label'>
			name
		</label>
		<input type='text' className='form-input' id='name' name='name' />
	</div>;
	return (
		<div className='form-container'>
			<h4>Register</h4>

			<form onSubmit={handleSubmit}>
				<label htmlFor='Email'>Email</label>
				<input
					type='email'
					name='Email'
					id='Email'
					placeholder='Email...'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<br />
				<br />
				<label htmlFor='Username'>Username</label>
				<input
					type='text'
					name='Username'
					id='Username'
					placeholder='Username...'
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>
				<br />
				<br />
				<label htmlFor='Password'>Password</label>
				<input
					type='password'
					name='Password'
					id='Password'
					placeholder='Password...'
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				<br />
				<br />

				<label htmlFor='ConfirmPassword'>ConfirmPassword</label>
				<input
					type='password'
					name='ConfirmPassword'
					id='ConfirmPassword'
					placeholder='ConfirmPassword...'
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
				/>
				<br />
				<br />
				<button type='submit'>Register</button>
			</form>
		</div>
	);
};
export default SignupForm;
