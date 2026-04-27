import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';

const SearchBar = ({ placeholder = 'Search products...' }) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [searching, setSearching] = useState(false);
	const navigate = useNavigate();
	const { language } = useLanguage();

	const handleSubmit = async (e) => {
		e.preventDefault();
		const trimmed = searchTerm.trim();
		if (!trimmed) return;

		let query = trimmed;

		if (language !== 'en') {
			setSearching(true);
			try {
				const res = await api.post('/translate', { texts: [trimmed], targetLang: 'en' });
				query = res.data.translations?.[0] || trimmed;
			} catch {
				// fall back to original term
			} finally {
				setSearching(false);
			}
		}

		navigate(`/search?q=${encodeURIComponent(query)}`);
	};

	return (
		<form onSubmit={handleSubmit} className='relative'>
			<input
				type='text'
				placeholder={placeholder}
				value={searchTerm}
				onChange={(e) => setSearchTerm(e.target.value)}
				className='border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full'
			/>
			<button type='submit' disabled={searching} className='absolute right-2 top-2 text-gray-500 hover:text-primary-500 disabled:opacity-50'>
				<Search size={20} className={searching ? 'animate-pulse' : ''} />
			</button>
		</form>
	);
};

export default SearchBar;
