const LoginForm = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	function handleSubmit() {}

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
				<input type='text' name='Email' id='Email' placeholder='Email...' />
				<br />
				<br />

				<label htmlFor='Password'>Password</label>
				<input type='password' name='Password' id='Password' placeholder='Password...' />
				<br />
				<br />
			</form>
		</div>
	);
};
export default LoginForm;
