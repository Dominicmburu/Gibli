// import { Search } from 'lucide-react';
// // components/SearchBar.jsx
// const SearchBar = ({ placeholder }) => {
// 	return (
// 		<div className='relative'>
// 			<input
// 				type='text'
// 				placeholder={placeholder}
// 				className='border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-baseGreen w-full'
// 			/>
// 			<button className='absolute right-2 top-2 text-gray-500 hover:text-baseGreen'>
// 				<Search size={20} />
// 			</button>
// 		</div>
// 	);
// };

// export default SearchBar;
// components/SearchBar.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const SearchBar = ({ placeholder = 'Search products...' }) => {
	const [searchTerm, setSearchTerm] = useState('');
	const navigate = useNavigate();

	const handleSubmit = (e) => {
		e.preventDefault();

		if (searchTerm.trim().length >= 2) {
			navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
		}
	};

	return (
		<form onSubmit={handleSubmit} className='relative'>
			<input
				type='text'
				placeholder={placeholder}
				value={searchTerm}
				onChange={(e) => setSearchTerm(e.target.value)}
				className='border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-baseGreen w-full'
			/>
			<button type='submit' className='absolute right-2 top-2 text-gray-500 hover:text-baseGreen'>
				<Search size={20} />
			</button>
		</form>
	);
};

export default SearchBar;
