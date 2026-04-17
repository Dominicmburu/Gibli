import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import api from '../../../api/axios';

const GateLogin = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		if (!email || !password) {
			setError('Please enter your email and password.');
			return;
		}

		setLoading(true);
		try {
			await api.post('/users/login', {
				Email: email,
				Password: password,
			});
			// Cookie is set by server — notify useAuth to re-fetch /users/me
			window.dispatchEvent(new Event('auth-changed'));
		} catch (err) {
			setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className='fixed inset-0 z-[9999] flex flex-col items-center justify-center px-4'
			style={{ background: 'linear-gradient(135deg, #001f63 0%, #003399 50%, #002d87 100%)' }}
		>
			{/* EU Stars decoration */}
			<div className='absolute top-0 left-0 right-0 flex justify-center pt-8 select-none pointer-events-none'>
				<span className='text-5xl tracking-[0.5em]' style={{ color: '#FFCC00' }}>★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★</span>
			</div>

			{/* Card */}
			<div className='w-full max-w-sm bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20'>
				{/* Logo */}
				<div className='text-center mb-8'>
					<div className='text-4xl font-bold mb-1'>
						<span className='text-white'>Gib</span>
						<span style={{ color: '#FFCC00' }}>Li</span>
					</div>
					<p className='text-white/60 text-sm mt-2'>Sign in to continue</p>
				</div>

				{/* Error */}
				{error && (
					<div className='mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm text-center'>
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className='space-y-4' noValidate>
					{/* Email */}
					<div className='relative'>
						<Mail size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40' />
						<input
							type='email'
							placeholder='Email address'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoComplete='email'
							className='w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-white/50 focus:bg-white/15 transition'
						/>
					</div>

					{/* Password */}
					<div className='relative'>
						<Lock size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40' />
						<input
							type={showPassword ? 'text' : 'password'}
							placeholder='Password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							autoComplete='current-password'
							className='w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:border-white/50 focus:bg-white/15 transition'
						/>
						<button
							type='button'
							onClick={() => setShowPassword((p) => !p)}
							className='absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition'
							aria-label={showPassword ? 'Hide password' : 'Show password'}
						>
							{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
						</button>
					</div>

					{/* Submit */}
					<button
						type='submit'
						disabled={loading}
						className='w-full font-semibold py-3 rounded-xl text-sm transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed'
						style={{ background: '#FFCC00', color: '#001f63' }}
					>
						{loading ? 'Signing in…' : 'Sign In'}
					</button>
				</form>
			</div>

			{/* Bottom label */}
			<p className='text-white/30 text-xs mt-8 text-center'>
				Gibli · EU Digital Commerce Platform
			</p>
		</div>
	);
};

export default GateLogin;
