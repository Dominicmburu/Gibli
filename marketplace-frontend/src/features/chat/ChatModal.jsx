import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Paperclip, Package, ShoppingBag, Loader2, ChevronDown, ExternalLink } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../utils/useAuth';

const POLL_INTERVAL = 5000; // 5s polling
const MAX_IMAGES = 3;
const MAX_VIDEOS = 1;

function ContextTag({ context, onClick }) {
	if (!context) return null;
	const { type, data } = context;

	if (type === 'product') {
		return (
			<button
				type='button'
				onClick={onClick}
				className='w-full flex items-center gap-2 px-3 py-2 bg-primary-50 border-b border-primary-100 hover:bg-primary-100 transition-colors text-left group'
			>
				{data.image && (
					<img src={data.image} alt={data.name} className='w-8 h-8 rounded-md object-cover flex-shrink-0' />
				)}
				<div className='min-w-0 flex-1'>
					<p className='text-[11px] text-primary-500 font-semibold uppercase tracking-wide'>Product</p>
					<p className='text-xs text-gray-800 font-medium truncate'>{data.name}</p>
					{data.price != null && <p className='text-xs text-primary-600 font-bold'>€{Number(data.price).toFixed(2)}</p>}
				</div>
				<ExternalLink size={13} className='text-primary-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
				<Package size={14} className='text-primary-300 flex-shrink-0' />
			</button>
		);
	}

	if (type === 'order') {
		return (
			<button
				type='button'
				onClick={onClick}
				className='w-full flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100 hover:bg-blue-100 transition-colors text-left group'
			>
				<div className='w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0'>
					<ShoppingBag size={14} className='text-blue-600' />
				</div>
				<div className='min-w-0 flex-1'>
					<p className='text-[11px] text-blue-500 font-semibold uppercase tracking-wide'>Order</p>
					<p className='text-xs text-gray-800 font-medium'>#{data.orderId?.slice(0, 8)}</p>
					{data.total != null && <p className='text-xs text-blue-600 font-bold'>€{Number(data.total).toFixed(2)}</p>}
					{data.date && <p className='text-[10px] text-gray-400'>{new Date(data.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
				</div>
				<ExternalLink size={13} className='text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
			</button>
		);
	}

	return null;
}

function MessageBubble({ msg, isMine }) {
	return (
		<div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
			<div
				className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
					isMine
						? 'bg-primary-500 text-white rounded-br-sm'
						: 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
				}`}
			>
				{/* Media */}
				{msg.MediaUrls?.length > 0 && (
					<div className={`mb-1.5 grid gap-1 ${msg.MediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
						{msg.MediaUrls.map((m, i) => (
							m.type === 'video' ? (
								<video
									key={i}
									src={m.url}
									className='rounded-lg max-h-48 w-full object-cover'
									controls
								/>
							) : (
								<a key={i} href={m.url} target='_blank' rel='noopener noreferrer'>
									<img src={m.url} alt='' className='rounded-lg max-h-48 w-full object-cover hover:opacity-90 transition-opacity' />
								</a>
							)
						))}
					</div>
				)}

				{/* Text */}
				{msg.Content && (
					<p className='text-sm leading-relaxed whitespace-pre-wrap break-words'>{msg.Content}</p>
				)}

				{/* Timestamp */}
				<p className={`text-[10px] mt-0.5 text-right ${isMine ? 'text-primary-200' : 'text-gray-400'}`}>
					{new Date(msg.SentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
				</p>
			</div>
		</div>
	);
}

export default function ChatModal({ isOpen, onClose, conversationId: initialConvId, sellerId, buyerId, contextType, contextId, contextData, currentUserId, sellerName, buyerName, isSeller }) {
	const { userInfo } = useAuth();
	const navigate = useNavigate();
	const myId = currentUserId || userInfo?.id;

	const handleContextNavigate = () => {
		const type = conv?.ContextType || contextType;
		const id   = conv?.ContextId   || contextId;
		if (!type || !id) return;
		if (type === 'product') {
			navigate(`/product/${id}`);
		} else if (type === 'order') {
			navigate(isSeller ? `/my-orders/${id}` : `/orders/${id}`);
		}
		onClose();
	};

	const [conv, setConv] = useState(null);
	const [messages, setMessages] = useState([]);
	const [loadingConv, setLoadingConv] = useState(false);
	const [text, setText] = useState('');
	const [mediaFiles, setMediaFiles] = useState([]);
	const [mediaPreviews, setMediaPreviews] = useState([]);
	const [sending, setSending] = useState(false);
	const [showScrollDown, setShowScrollDown] = useState(false);

	const bottomRef = useRef(null);
	const messagesRef = useRef(null);
	const pollRef = useRef(null);
	const fileInputRef = useRef(null);

	// Scroll to bottom
	const scrollToBottom = useCallback((smooth = false) => {
		bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
	}, []);

	// Load or create conversation
	useEffect(() => {
		if (!isOpen) return;
		if (initialConvId) {
			setConv({ ConversationId: initialConvId });
			return;
		}
		if (!sellerId || !contextType || !contextId) return;

		setLoadingConv(true);
		api.post('/messages/conversations', {
			sellerId,
			contextType,
			contextId,
			contextData,
		}).then((res) => {
			setConv(res.data.data);
		}).catch((err) => {
			console.error('Failed to open conversation:', err);
		}).finally(() => setLoadingConv(false));
	}, [isOpen, initialConvId, sellerId, contextType, contextId]);

	// Fetch messages
	const fetchMessages = useCallback(async (convId) => {
		if (!convId) return;
		try {
			const res = await api.get(`/messages/conversations/${convId}`);
			setMessages(res.data.data || []);
		} catch (err) {
			console.error('Failed to fetch messages:', err);
		}
	}, []);

	// Poll for new messages
	useEffect(() => {
		const convId = conv?.ConversationId;
		if (!isOpen || !convId) return;

		fetchMessages(convId).then(() => scrollToBottom());

		pollRef.current = setInterval(() => fetchMessages(convId), POLL_INTERVAL);
		return () => clearInterval(pollRef.current);
	}, [isOpen, conv?.ConversationId, fetchMessages]);

	// Scroll detection
	const handleScroll = () => {
		const el = messagesRef.current;
		if (!el) return;
		const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		setShowScrollDown(distFromBottom > 120);
	};

	// Media previews
	useEffect(() => {
		const previews = mediaFiles.map((f) => ({
			url: URL.createObjectURL(f),
			type: f.type.startsWith('video/') ? 'video' : 'image',
			name: f.name,
		}));
		setMediaPreviews(previews);
		return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
	}, [mediaFiles]);

	const handleFileSelect = (e) => {
		const picked = Array.from(e.target.files || []);
		let imgs = mediaFiles.filter((f) => f.type.startsWith('image/')).length;
		let vids = mediaFiles.filter((f) => f.type.startsWith('video/')).length;
		const accepted = [];
		for (const f of picked) {
			if (f.type.startsWith('image/') && imgs < MAX_IMAGES) { accepted.push(f); imgs++; }
			else if (f.type.startsWith('video/') && vids < MAX_VIDEOS) { accepted.push(f); vids++; }
		}
		setMediaFiles((prev) => [...prev, ...accepted]);
		e.target.value = '';
	};

	const removeMedia = (index) => {
		setMediaFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSend = async () => {
		if (!text.trim() && mediaFiles.length === 0) return;
		const convId = conv?.ConversationId;
		if (!convId) return;

		setSending(true);
		try {
			const formData = new FormData();
			if (text.trim()) formData.append('content', text.trim());
			mediaFiles.forEach((f) => formData.append('media', f));

			const res = await api.post(`/messages/conversations/${convId}`, formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});

			setMessages((prev) => [...prev, res.data.data]);
			setText('');
			setMediaFiles([]);
			setTimeout(() => scrollToBottom(true), 50);
		} catch (err) {
			console.error('Send message error:', err);
		} finally {
			setSending(false);
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	if (!isOpen) return null;

	const convData = conv;
	const context = convData?.ContextData
		? { type: convData.ContextType, data: JSON.parse(convData.ContextData) }
		: contextData
			? { type: contextType, data: contextData }
			: null;

	const otherName = myId === (convData?.BuyerId || buyerId)
		? (convData?.SellerName || sellerName || 'Seller')
		: (convData?.BuyerName || buyerName || 'Buyer');

	return (
		<div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/40'>
			<div className='w-full sm:w-[420px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden'
				style={{ height: '85vh', maxHeight: '680px' }}>

				{/* Header */}
				<div className='flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100'>
					<div className='w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0'>
						<span className='text-primary-700 text-sm font-bold'>{otherName[0]?.toUpperCase()}</span>
					</div>
					<div className='flex-1 min-w-0'>
						<p className='font-semibold text-gray-900 text-sm truncate'>{otherName}</p>
						<p className='text-xs text-gray-400'>Tap to see contact info</p>
					</div>
					<button onClick={onClose} className='p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100'>
						<X size={18} />
					</button>
				</div>

				{/* Context Tag */}
				{context && <ContextTag context={context} onClick={handleContextNavigate} />}

				{/* Messages */}
				<div
					ref={messagesRef}
					onScroll={handleScroll}
					className='flex-1 overflow-y-auto px-3 py-3 bg-gray-50'
					style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3C/svg%3E")' }}
				>
					{loadingConv ? (
						<div className='flex items-center justify-center h-full'>
							<Loader2 size={24} className='animate-spin text-primary-400' />
						</div>
					) : messages.length === 0 ? (
						<div className='flex flex-col items-center justify-center h-full text-center px-6'>
							<div className='w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-3'>
								<Send size={24} className='text-primary-500' />
							</div>
							<p className='text-sm font-medium text-gray-700'>Start the conversation</p>
							<p className='text-xs text-gray-400 mt-1'>Send a message to {otherName}</p>
						</div>
					) : (
						<>
							{messages.map((msg) => (
								<MessageBubble key={msg.MessageId} msg={msg} isMine={String(msg.SenderId).toLowerCase() === String(myId).toLowerCase()} />
							))}
							<div ref={bottomRef} />
						</>
					)}
				</div>

				{/* Scroll to bottom button */}
				{showScrollDown && (
					<button
						onClick={() => scrollToBottom(true)}
						className='absolute bottom-24 right-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-500 hover:bg-gray-50'
					>
						<ChevronDown size={16} />
					</button>
				)}

				{/* Media preview strip */}
				{mediaPreviews.length > 0 && (
					<div className='flex gap-2 px-3 py-2 bg-white border-t border-gray-100 overflow-x-auto'>
						{mediaPreviews.map((p, i) => (
							<div key={i} className='relative flex-shrink-0'>
								{p.type === 'video' ? (
									<video src={p.url} className='w-14 h-14 rounded-lg object-cover bg-gray-200' />
								) : (
									<img src={p.url} alt='' className='w-14 h-14 rounded-lg object-cover' />
								)}
								<button
									onClick={() => removeMedia(i)}
									className='absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] leading-none p-0.5'
								>
									<X size={8} />
								</button>
							</div>
						))}
					</div>
				)}

				{/* Input bar */}
				<div className='flex items-end gap-2 px-3 py-3 bg-white border-t border-gray-100'>
					<input
						type='file'
						ref={fileInputRef}
						onChange={handleFileSelect}
						accept='image/*,video/*'
						multiple
						className='hidden'
					/>
					<button
						onClick={() => fileInputRef.current?.click()}
						className='p-2 text-gray-400 hover:text-primary-500 flex-shrink-0 rounded-xl hover:bg-gray-100 transition-colors'
						title='Attach image or video'
					>
						<Paperclip size={20} />
					</button>

					<textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder='Type a message…'
						rows={1}
						style={{ resize: 'none', maxHeight: '100px', overflowY: 'auto' }}
						className='flex-1 bg-gray-100 rounded-2xl px-4 py-2 text-sm outline-none placeholder-gray-400'
					/>

					<button
						onClick={handleSend}
						disabled={sending || (!text.trim() && mediaFiles.length === 0)}
						className='w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40'
					>
						{sending ? <Loader2 size={16} className='animate-spin' /> : <Send size={16} />}
					</button>
				</div>
			</div>
		</div>
	);
}
