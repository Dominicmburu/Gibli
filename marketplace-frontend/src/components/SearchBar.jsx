import { Search } from 'lucide-react';
// components/SearchBar.jsx
const SearchBar = ({ placeholder }) => {
	return (
		<div className='relative'>
			<input
				type='text'
				placeholder={placeholder}
				className='border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-baseGreen w-full'
			/>
			<button className='absolute right-2 top-2 text-gray-500 hover:text-baseGreen'>
				<Search size={20} />
			</button>
		</div>
	);
};

export default SearchBar;
