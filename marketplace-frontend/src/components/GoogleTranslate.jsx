import { useEffect } from 'react';
import { Globe } from 'lucide-react';

/**
 * Renders the Google Translate language selector.
 * The Google script + googleTranslateElementInit are defined in index.html.
 * This component just provides the target div and re-triggers init if the
 * script finished loading before this component mounted (SPA navigation).
 */
const GoogleTranslate = () => {
	useEffect(() => {
		// Script already loaded but widget not yet rendered into the div
		if (window.google?.translate?.TranslateElement && !document.querySelector('.goog-te-combo')) {
			window.googleTranslateElementInit?.();
		}
	}, []);

	return (
		<div className='flex items-center gap-1.5'>
			<Globe size={14} className='flex-shrink-0 text-gray-400' />
			<div id='google_translate_element' />
		</div>
	);
};

export default GoogleTranslate;
