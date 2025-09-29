import { useState } from 'react';
import { Link } from 'react-router-dom';

const ResetPassword = () => {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	function handleSubmit() {
		console.log('clicked');
	}
	return (
		<div className='bg-white-100 flex items-center justify-center min-h-screen'>
			<div className='bg-white p-8 rounded-2xl shadow-xl w-full max-w-md'>
				<h4 className='text-2xl font-bold mb-6 text-center text-gray-800'>Reset Password</h4>

				<form className='space-y-4' onSubmit={handleSubmit} noValidate>
					<div className='relative'>
						<label className='block text-sm font-medium text-gray-700' htmlFor='password'>
							Password
						</label>
						<input
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
							type='password'
							id='password'
							placeholder='Enter password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
						/>
						<button type='button' className='absolute right-3 top-8 text-gray-500 text-sm'>
							Show
						</button>
					</div>
					<div className='relative'>
						<label className='block text-sm font-medium text-gray-700' htmlFor='confirmPassword'>
							Confirm Password
						</label>
						<input
							className='mt-1 block w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
							type='password'
							id='confirmPassword'
							placeholder='Confirm password'
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							minLength={6}
						/>
						<button type='button' className='absolute right-3 top-8 text-gray-500 text-sm'>
							Show
						</button>
					</div>

					<button
						className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md'
						type='submit'
					>
						Reset
					</button>
				</form>
			</div>
		</div>
	);
};
export default ResetPassword;
