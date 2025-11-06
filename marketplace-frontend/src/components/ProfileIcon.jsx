import { UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const ProfileIcon = () => {
	const navigate = useNavigate();

	// const handleClick = () => {
	// 	navigate('/profile');
	// };

	return (
		<button
			onClick={handleClick}
			className='text-gray-500 hover:text-baseGreen transition-colors'
			aria-label='Go to Cart'
		>
			<UserCog size={30} />
		</button>
	);
};
export default ProfileIcon;
