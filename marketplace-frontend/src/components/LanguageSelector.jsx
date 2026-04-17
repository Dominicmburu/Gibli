import { useEffect, useRef, useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';

const LanguageSelector = () => {
	const { language, changeLanguage } = useLanguage();
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

	// Close on outside click
	useEffect(() => {
		if (!open) return;
		const handle = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		document.addEventListener('mousedown', handle);
		return () => document.removeEventListener('mousedown', handle);
	}, [open]);

	return (
		<div className='relative' ref={ref}>
			<button
				onClick={() => setOpen((o) => !o)}
				className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors'
				title='Change language'
			>
				<Globe size={15} className='text-gray-400 flex-shrink-0' />
				<span className='text-xs font-medium text-gray-600'>{current.code.toUpperCase()}</span>
				<ChevronDown size={12} className='text-gray-400' />
			</button>

			{open && (
				<div className='absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-80 overflow-y-auto'>
					{LANGUAGES.map((lang) => (
						<button
							key={lang.code}
							onClick={() => { changeLanguage(lang.code); setOpen(false); }}
							className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
								language === lang.code
									? 'bg-primary-50 text-primary-600 font-medium'
									: 'text-gray-700 hover:bg-gray-50'
							}`}
						>
							<span className='text-base'>{lang.flag}</span>
							<span className='flex-1 text-left'>{lang.label}</span>
							{language === lang.code && (
								<Check size={13} className='text-primary-500 flex-shrink-0' />
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default LanguageSelector;
