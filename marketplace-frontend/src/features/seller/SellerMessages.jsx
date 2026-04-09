import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, Paperclip, Package, ShoppingBag, Loader2, X, Search, ChevronLeft, ExternalLink } from 'lucide-react';
import NavBar from '../../components/NavBar';
import SellerSidebar from './SellerSidebar';
import api from '../../api/axios';
import { useAuth } from '../../utils/useAuth';

const POLL_INTERVAL = 5000;
const MAX_MEDIA_FILES = 4;

function ContextTag({ conv, onNavigate }) {
	const type = conv?.ContextType;
	const raw = conv?.ContextData;
	const data = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;

	if (!data) return null;

	if (type === 'product') {
		return (
			<button
				type='button'
				onClick={onNavigate}
				className='w-full flex items-center gap-2 px-4 py-2 bg-primary-50 border-b border-primary-100 hover:bg-primary-100 transition-colors text-left group'
			>
				{data.image && <img src={data.image} alt={data.name} className='w-8 h-8 rounded-md object-cover flex-shrink-0' />}
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
				onClick={onNavigate}
				className='w-full flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100 hover:bg-blue-100 transition-colors text-left group'
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

function MessageBubble({ msg, myId }) {
	const isMine = String(msg.SenderId).toLowerCase() === String(myId).toLowerCase();
	return (
		<div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
			<div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
				isMine
					? 'bg-primary-500 text-white rounded-br-sm'
					: 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
			}`}>
				{msg.MediaUrls?.length > 0 && (
					<div className={`mb-1.5 grid gap-1 ${msg.MediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
						{msg.MediaUrls.map((m, i) => (
							m.type === 'video' ? (
								<video key={i} src={m.url} className='rounded-lg max-h-48 w-full object-cover' controls />
							) : (
								<a key={i} href={m.url} target='_blank' rel='noopener noreferrer'>
									<img src={m.url} alt='' className='rounded-lg max-h-48 w-full object-cover hover:opacity-90 transition-opacity' />
								</a>
							)
						))}
					</div>
				)}
				{msg.Content && <p className='text-sm leading-relaxed whitespace-pre-wrap break-words'>{msg.Content}</p>}
				<p className={`text-[10px] mt-0.5 text-right ${isMine ? 'text-primary-200' : 'text-gray-400'}`}>
					{new Date(msg.SentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
				</p>
			</div>
		</div>
	);
}

export default function SellerMessages() {
	const { userInfo } = useAuth();
	const navigate = useNavigate();
	const myId = userInfo?.id;

	const handleContextNavigate = (conv) => {
		if (!conv) return;
		const type = conv.ContextType;
		const id   = conv.ContextId;
		if (!type || !id) return;
		if (type === 'product') navigate(`/product/${id}`);
		else if (type === 'order') navigate(`/my-orders/${id}`);
	};

	const [conversations, setConversations] = useState([]);
	const [loadingConvs, setLoadingConvs] = useState(true);
	const [selectedConv, setSelectedConv] = useState(null);
	const [messages, setMessages] = useState([]);
	const [loadingMsgs, setLoadingMsgs] = useState(false);
	const [text, setText] = useState('');
	const [mediaFiles, setMediaFiles] = useState([]);
	const [mediaPreviews, setMediaPreviews] = useState([]);
	const [sending, setSending] = useState(false);
	const [search, setSearch] = useState('');
	const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

	const bottomRef = useRef(null);
	const pollRef = useRef(null);
	const fileInputRef = useRef(null);

	const scrollToBottom = useCallback(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, []);

	// Load conversations
	const fetchConversations = useCallback(async () => {
		try {
			const res = await api.get('/messages/conversations?role=Seller');
			setConversations(res.data.data || []);
		} catch (err) {
			console.error('Failed to fetch conversations:', err);
		}
	}, []);

	useEffect(() => {
		fetchConversations().finally(() => setLoadingConvs(false));
		const interval = setInterval(fetchConversations, POLL_INTERVAL);
		return () => clearInterval(interval);
	}, [fetchConversations]);

	// Load messages for selected conversation
	const fetchMessages = useCallback(async (convId) => {
		if (!convId) return;
		setLoadingMsgs(true);
		try {
			const res = await api.get(`/messages/conversations/${convId}`);
			const msgs = (res.data.data || []).map((m) => ({
				...m,
				MediaUrls: m.MediaUrls || [],
			}));
			setMessages(msgs);
		} catch (err) {
			console.error('Failed to fetch messages:', err);
		} finally {
			setLoadingMsgs(false);
		}
	}, []);

	useEffect(() => {
		if (!selectedConv) return;
		fetchMessages(selectedConv.ConversationId).then(() => setTimeout(scrollToBottom, 50));

		clearInterval(pollRef.current);
		pollRef.current = setInterval(() => fetchMessages(selectedConv.ConversationId), POLL_INTERVAL);
		return () => clearInterval(pollRef.current);
	}, [selectedConv?.ConversationId, fetchMessages]);

	// Media previews
	useEffect(() => {
		const previews = mediaFiles.map((f) => ({
			url: URL.createObjectURL(f),
			type: f.type.startsWith('video/') ? 'video' : 'image',
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
			if (f.type.startsWith('image/') && imgs < 3) { accepted.push(f); imgs++; }
			else if (f.type.startsWith('video/') && vids < 1) { accepted.push(f); vids++; }
		}
		setMediaFiles((prev) => [...prev, ...accepted]);
		e.target.value = '';
	};

	const handleSend = async () => {
		if (!text.trim() && mediaFiles.length === 0) return;
		if (!selectedConv) return;
		setSending(true);
		try {
			const formData = new FormData();
			if (text.trim()) formData.append('content', text.trim());
			mediaFiles.forEach((f) => formData.append('media', f));
			const res = await api.post(`/messages/conversations/${selectedConv.ConversationId}`, formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			setMessages((prev) => [...prev, { ...res.data.data, MediaUrls: res.data.data.MediaUrls || [] }]);
			setText('');
			setMediaFiles([]);
			setTimeout(scrollToBottom, 50);
			fetchConversations();
		} catch (err) {
			console.error('Send error:', err);
		} finally {
			setSending(false);
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
	};

	const selectConversation = (conv) => {
		setSelectedConv(conv);
		setMobileView('chat');
	};

	const filteredConvs = conversations.filter((c) =>
		!search || (c.BuyerName || '').toLowerCase().includes(search.toLowerCase())
	);

	const formatTime = (dt) => {
		if (!dt) return '';
		const d = new Date(dt);
		const now = new Date();
		const isToday = d.toDateString() === now.toDateString();
		if (isToday) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	};

	return (
		<>
			<NavBar />
			<div className='flex bg-gray-50 min-h-screen'>
				<SellerSidebar />

				{/* On mobile the bottom tab bar is 56px, NavBar is ~64px */}
				<div className='flex-1 flex overflow-hidden' style={{ height: 'calc(100vh - 64px)' }}>

					{/* Left: Conversation List */}
					<div className={`w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
						{/* Header */}
						<div className='px-4 pt-4 pb-3 border-b border-gray-100 bg-white'>
							<h2 className='text-lg font-bold text-gray-900 mb-3'>Messages</h2>
							<div className='relative'>
								<Search size={15} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
								<input
									type='text'
									placeholder='Search buyers…'
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className='w-full pl-8 pr-3 py-2 text-sm bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300'
								/>
							</div>
						</div>

						{/* List */}
						<div className='flex-1 overflow-y-auto divide-y divide-gray-50 pb-16 md:pb-0'>
							{loadingConvs ? (
								<div className='flex items-center justify-center py-12'>
									<Loader2 size={24} className='animate-spin text-primary-400' />
								</div>
							) : filteredConvs.length === 0 ? (
								<div className='flex flex-col items-center justify-center py-16 px-6 text-center'>
									<MessageCircle size={40} className='text-gray-300 mb-3' />
									<p className='text-sm font-medium text-gray-600'>No messages yet</p>
									<p className='text-xs text-gray-400 mt-1'>Buyers will contact you from product pages</p>
								</div>
							) : (
								filteredConvs.map((conv) => {
									const isSelected = selectedConv?.ConversationId === conv.ConversationId;
									const unread = conv.UnreadCount > 0;
									const contextData = conv.ContextData ? (typeof conv.ContextData === 'string' ? JSON.parse(conv.ContextData) : conv.ContextData) : null;

									return (
										<button
											key={conv.ConversationId}
											onClick={() => selectConversation(conv)}
											className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${isSelected ? 'bg-primary-50 hover:bg-primary-50' : ''}`}
										>
											{/* Avatar */}
											<div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary-500' : 'bg-gray-200'}`}>
												<span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
													{(conv.BuyerName || 'B')[0].toUpperCase()}
												</span>
											</div>

											<div className='flex-1 min-w-0'>
												<div className='flex items-center justify-between mb-0.5'>
													<p className={`text-sm truncate ${unread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
														{conv.BuyerName || 'Buyer'}
													</p>
													<p className='text-[10px] text-gray-400 flex-shrink-0 ml-2'>
														{formatTime(conv.LastMessageSentAt)}
													</p>
												</div>

												{/* Context preview */}
												{contextData && (
													<p className='text-[10px] text-primary-500 font-medium truncate mb-0.5'>
														{conv.ContextType === 'product' ? `📦 ${contextData.name}` : `🛒 Order #${contextData.orderId?.slice(0, 8)}`}
													</p>
												)}

												<div className='flex items-center justify-between'>
													<p className={`text-xs truncate ${unread ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
														{conv.LastMessageContent || 'No messages yet'}
													</p>
													{unread && (
														<span className='flex-shrink-0 ml-2 bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center'>
															{conv.UnreadCount > 99 ? '99+' : conv.UnreadCount}
														</span>
													)}
												</div>
											</div>
										</button>
									);
								})
							)}
						</div>
					</div>

					{/* Right: Chat area */}
					<div className={`flex-1 flex flex-col bg-gray-50 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
						{!selectedConv ? (
							<div className='flex-1 flex flex-col items-center justify-center text-center px-6'>
								<div className='w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4'>
									<MessageCircle size={32} className='text-primary-500' />
								</div>
								<p className='font-semibold text-gray-700 text-lg'>Select a conversation</p>
								<p className='text-sm text-gray-400 mt-1'>Choose a buyer to view their messages</p>
							</div>
						) : (
							<>
								{/* Chat header */}
								<div className='flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm'>
									<button
										onClick={() => setMobileView('list')}
										className='md:hidden p-1.5 text-gray-500 hover:text-gray-700 rounded-lg'
									>
										<ChevronLeft size={20} />
									</button>
									<div className='w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0'>
										<span className='text-primary-700 text-sm font-bold'>
											{(selectedConv.BuyerName || 'B')[0].toUpperCase()}
										</span>
									</div>
									<div className='flex-1 min-w-0'>
										<p className='font-semibold text-gray-900 text-sm'>{selectedConv.BuyerName}</p>
										<p className='text-xs text-gray-400'>Buyer</p>
									</div>
								</div>

								{/* Context tag */}
								<ContextTag conv={selectedConv} onNavigate={() => handleContextNavigate(selectedConv)} />

								{/* Messages */}
								<div className='flex-1 overflow-y-auto px-3 py-3 bg-gray-50 pb-20 md:pb-3'>
									{loadingMsgs ? (
										<div className='flex items-center justify-center h-full'>
											<Loader2 size={24} className='animate-spin text-primary-400' />
										</div>
									) : messages.length === 0 ? (
										<div className='flex flex-col items-center justify-center h-full text-center px-6'>
											<p className='text-sm font-medium text-gray-600'>No messages yet</p>
											<p className='text-xs text-gray-400 mt-1'>Start the conversation below</p>
										</div>
									) : (
										<>
											{messages.map((msg) => (
												<MessageBubble key={msg.MessageId} msg={msg} myId={myId} />
											))}
											<div ref={bottomRef} />
										</>
									)}
								</div>

								{/* Media preview */}
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
													onClick={() => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i))}
													className='absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white'
												>
													<X size={8} />
												</button>
											</div>
										))}
									</div>
								)}

								{/* Input */}
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
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
