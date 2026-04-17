import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../utils/useAuth';

const AuthButton = () => {
	const { isLoggedIn, logout } = useAuth();
	const { t } = useTranslation();
	const navigate = useNavigate();

	const handleClick = async () => {
		if (isLoggedIn) {
			await logout();
			navigate('/login');
		} else {
			navigate('/login');
		}
	};

	return (
		<button
			onClick={handleClick}
			className='bg-secondary-500 text-primary-800 px-4 py-2 rounded-lg hover:bg-secondary-600 transition'
		>
			{isLoggedIn ? t('auth.logout') : t('auth.login.title')}
		</button>
	);
};

export default AuthButton;
