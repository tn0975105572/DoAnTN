import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    MessageCircle, X, Search, MoreHorizontal, Edit3,
    ArrowLeft, Phone, Video, Send, Image, Smile
} from 'lucide-react';
import io from 'socket.io-client';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import ProfileAvatarLink from '../profile/ProfileAvatarLink';
import './ChatWidget.css';

const avatarFallback = (seed) => `https://i.pravatar.cc/150?u=${encodeURIComponent(seed || 'user')}`;

const formatTime = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

function ChatListView({
    conversations,
    loadingConvs,
    isAuthenticated,
    onSelectChat,
    onClose,
    onRefresh,
    searchQuery,
    onSearchChange,
}) {
    const [activeTab, setActiveTab] = useState('all');
    const tabs = [
        { key: 'all', label: 'Tất cả' },
        { key: 'unread', label: 'Chưa đọc' },
        { key: 'groups', label: 'Nhóm' },
    ];

    const filteredByTab = conversations.filter((c) => {
        if (activeTab === 'unread') return (c.unread || 0) > 0;
        if (activeTab === 'groups') return c.type === 'group';
        return true;
    });

    const filtered = searchQuery.trim()
        ? filteredByTab.filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
        : filteredByTab;

    return (
        <>
            <div className="cw-header">
                <div className="cw-header-left">
                    <h2>Đoạn chat</h2>
                </div>
                <div className="cw-header-actions">
                    <button className="cw-icon-btn" aria-label="Refresh" onClick={onRefresh}>
                        <MoreHorizontal size={16} />
                    </button>
                    <button className="cw-icon-btn" aria-label="Open full page" onClick={() => window.location.assign('/messages')}>
                        <Edit3 size={15} />
                    </button>
                    <button className="cw-icon-btn" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="cw-search">
                <Search size={15} />
                <input
                    type="text"
                    placeholder="Tìm kiếm đoạn chat"
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                />
            </div>

            <div className="cw-tabs">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`cw-tab ${activeTab === t.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="cw-list">
                {!isAuthenticated ? (
                    <div className="cw-empty">
                        <MessageCircle size={40} />
                        <p>Bạn cần đăng nhập để sử dụng chat</p>
                    </div>
                ) : loadingConvs ? (
                    <div className="cw-empty">
                        <p>Đang tải cuộc trò chuyện...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="cw-empty">
                        <MessageCircle size={40} />
                        <p>Không tìm thấy cuộc trò chuyện</p>
                    </div>
                ) : (
                    filtered.map(conv => (
                        <button key={conv.id} className="cw-chat-item" onClick={() => onSelectChat(conv)}>
                            <ProfileAvatarLink userId={conv.type === 'private' ? conv.id : null}>
                                <img className="cw-chat-avatar" src={conv.avatar} alt={conv.name} />
                            </ProfileAvatarLink>
                            <div className="cw-chat-info">
                                <div className="cw-chat-name">{conv.name}</div>
                                <div className="cw-chat-last">{conv.lastMsg || 'Chưa có tin nhắn'}</div>
                            </div>
                            <div className="cw-chat-right">
                                <span className="cw-chat-time">{formatTime(conv.lastAt)}</span>
                                {conv.unread > 0 && <span className="cw-chat-badge">{conv.unread}</span>}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </>
    );
}

function ChatDetailView({
    chat,
    messages,
    loadingMsgs,
    inputText,
    onInputChange,
    onSend,
    onBack,
    onKeyDown,
    onPickFile,
}) {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages]);

    return (
        <>
            <div className="cd-header">
                <button className="cd-back-btn" onClick={onBack}><ArrowLeft size={18} /></button>
                <ProfileAvatarLink userId={chat.type === 'private' ? chat.id : null}>
                    <img className="cd-header-avatar" src={chat.avatar} alt={chat.name} />
                </ProfileAvatarLink>
                <div className="cd-header-info">
                    <div className="cd-header-name">{chat.name}</div>
                    <div className="cd-header-status">{chat.online ? 'Online' : 'Offline'}</div>
                </div>
                <div className="cd-header-actions">
                    <button className="cd-header-btn"><Phone size={14} /></button>
                    <button className="cd-header-btn"><Video size={14} /></button>
                    <button className="cd-header-btn"><MoreHorizontal size={14} /></button>
                </div>
            </div>

            <div className="cd-messages">
                {loadingMsgs && <div style={{ padding: 12, color: '#777' }}>Đang tải tin nhắn...</div>}
                {messages.map(msg => (
                    <div key={msg.id} className={`cd-msg-row ${msg.sender === 'me' ? 'mine' : 'theirs'}`}>
                        <div>
                            {msg.image && <img className="cd-msg-image" src={msg.image} alt="" />}
                            <div className="cd-msg-bubble">{msg.text || (msg.image ? 'Đã gửi tệp đính kèm' : '')}</div>
                            <div className="cd-msg-time">{msg.time}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="cd-input-bar">
                <button className="cd-input-icon" onClick={onPickFile}><Image size={18} /></button>
                <button className="cd-input-icon"><Smile size={18} /></button>
                <input
                    type="text"
                    className="cd-input-text"
                    placeholder="Nhập tin nhắn..."
                    value={inputText}
                    onChange={e => onInputChange(e.target.value)}
                    onKeyDown={onKeyDown}
                />
                <button className="cd-send-btn" onClick={onSend}>
                    <Send size={16} />
                </button>
            </div>
        </>
    );
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loadingConvs, setLoadingConvs] = useState(false);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [error, setError] = useState('');

    const socketRef = useRef(null);
    const selectedChatRef = useRef(null);
    const fileInputRef = useRef(null);
    const previousUserIdRef = useRef('');

    const { userId: myUserId, token } = useAuthSession();
    const isAuthenticated = !!myUserId && !!token;

    const backendOrigin = useMemo(() => {
        try { return new URL(API_BASE_URL).origin; } catch { return 'http://localhost:3000'; }
    }, []);
    const socketUrl = useMemo(() => backendOrigin, [backendOrigin]);

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

    useEffect(() => {
        const previousUserId = previousUserIdRef.current;
        const hasUserSwitched = previousUserId && previousUserId !== myUserId;

        if (!myUserId || hasUserSwitched) {
            setSelectedChat(null);
            setConversations([]);
            setChatMessages([]);
            setInputText('');
            setError('');
        }

        previousUserIdRef.current = myUserId;
    }, [myUserId]);

    const normalizeUploadsUrl = useCallback((raw, uploadsSubPath = '') => {
        if (!raw) return '';
        if (typeof raw === 'string' && !raw.startsWith('http://') && !raw.startsWith('https://')) {
            const sub = uploadsSubPath ? `/${uploadsSubPath.replace(/^\/+|\/+$/g, '')}` : '';
            return `${backendOrigin}/uploads${sub}/${raw}`;
        }
        try {
            const url = new URL(raw);
            if (url.pathname.startsWith('/uploads/')) return `${backendOrigin}${url.pathname}`;
            return raw;
        } catch {
            return raw;
        }
    }, [backendOrigin]);

    const apiFetch = useCallback(async (path, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };
        const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
        return data;
    }, [token]);

    const loadConversations = useCallback(async () => {
        if (!myUserId) {
            setConversations([]);
            return;
        }
        setLoadingConvs(true);
        setError('');
        try {
            const res = await apiFetch(`/tinnhan/conversations/${myUserId}`);
            const rows = res?.data || [];
            const mapped = rows.map((c) => ({
                id: c.conversation_id,
                type: c.conversation_type,
                name: c.conversation_name || 'Unknown',
                avatar: normalizeUploadsUrl(c.conversation_avatar) || avatarFallback(c.conversation_id),
                lastMsg: c.last_message || '',
                lastAt: c.last_message_time ? new Date(c.last_message_time) : null,
                unread: c.unread_count || 0,
                online: false,
            }));
            setConversations(mapped);

            const current = selectedChatRef.current;
            if (current) {
                const synced = mapped.find(c => c.type === current.type && String(c.id) === String(current.id));
                if (synced) setSelectedChat(synced);
            }
        } catch (e) {
            console.error('Load widget conversations failed', e);
            setError('Không thể tải đoạn chat.');
            setConversations([]);
        } finally {
            setLoadingConvs(false);
        }
    }, [apiFetch, myUserId, normalizeUploadsUrl]);

    const loadMessages = useCallback(async (conv) => {
        if (!conv || !myUserId) return;
        setLoadingMsgs(true);
        setError('');
        try {
            if (conv.type === 'group') {
                setChatMessages([{ id: 'sys', sender: 'system', text: 'Group chat (đang phát triển)', time: '' }]);
                return;
            }
            const res = await apiFetch(`/tinnhan/private/${myUserId}/${conv.id}?limit=50&offset=0`);
            const rows = res?.data || [];
            const msgs = rows.slice().reverse().map((m) => ({
                id: m.ID_TinNhan,
                sender: m.ID_NguoiGui === myUserId ? 'me' : 'them',
                text: m.noi_dung || '',
                time: formatTime(m.thoi_gian_gui),
                image: m.file_dinh_kem ? normalizeUploadsUrl(m.file_dinh_kem, 'messages') : '',
            }));
            setChatMessages(msgs.length ? msgs : [{ id: 'start', sender: 'system', text: 'Bắt đầu cuộc trò chuyện! 👋', time: '' }]);
        } catch (e) {
            console.error('Load widget messages failed', e);
            setError('Không thể tải tin nhắn.');
            setChatMessages([{ id: 'start', sender: 'system', text: 'Không thể tải tin nhắn.', time: '' }]);
        } finally {
            setLoadingMsgs(false);
        }
    }, [apiFetch, myUserId, normalizeUploadsUrl]);

    const handleSelectChat = useCallback((conv) => {
        setSelectedChat(conv);
        setConversations(prev => prev.map(c => (String(c.id) === String(conv.id) && c.type === conv.type ? { ...c, unread: 0 } : c)));
        loadMessages(conv);

        if (socketRef.current?.connected && conv.type === 'private') {
            socketRef.current.emit('join_chat', { userId: myUserId, chatType: 'private', chatId: conv.id });
            socketRef.current.emit('mark_read', { userId: myUserId, chatType: 'private', chatId: conv.id });
        }
    }, [loadMessages, myUserId]);

    const handleBack = useCallback(() => {
        setSelectedChat(null);
        setChatMessages([]);
        setInputText('');
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setSelectedChat(null);
        setSearchQuery('');
        setInputText('');
        setChatMessages([]);
    }, []);

    const handleSend = useCallback(() => {
        const text = inputText.trim();
        if (!text) return;
        if (!selectedChat || selectedChat.type !== 'private' || !myUserId) return;

        const newMsg = {
            id: `temp_${Date.now()}`,
            text,
            sender: 'me',
            time: formatTime(new Date()),
        };
        setChatMessages(prev => [...prev, newMsg]);
        setInputText('');

        setConversations(prev => {
            const idx = prev.findIndex(c => c.type === 'private' && String(c.id) === String(selectedChat.id));
            if (idx === -1) return prev;
            const updated = { ...prev[idx], lastMsg: text, lastAt: new Date() };
            const next = [...prev];
            next.splice(idx, 1);
            return [updated, ...next];
        });

        const payload = {
            ID_NguoiNhan: selectedChat.id,
            noi_dung: text,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
        };

        if (socketRef.current?.connected) {
            socketRef.current.emit('send_message', payload);
        } else {
            apiFetch('/tinnhan/send', {
                method: 'POST',
                body: JSON.stringify(payload),
            }).catch((e) => {
                console.error('Widget send message HTTP failed', e);
                setError('Gửi tin nhắn thất bại.');
            });
        }
    }, [apiFetch, inputText, myUserId, selectedChat]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handlePickFile = useCallback(() => {
        if (!selectedChat || selectedChat.type !== 'private') return;
        fileInputRef.current?.click();
    }, [selectedChat]);

    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !selectedChat || selectedChat.type !== 'private' || !myUserId) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('ID_NguoiGui', myUserId);
            formData.append('ID_NguoiNhan', selectedChat.id);
            formData.append('noi_dung', '');
            formData.append('loai_tin_nhan', 'text');

            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await fetch(`${API_BASE_URL}/tinnhan/upload-and-send`, {
                method: 'POST',
                headers,
                body: formData,
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);

            setConversations(prev => {
                const idx = prev.findIndex(c => c.type === 'private' && String(c.id) === String(selectedChat.id));
                if (idx === -1) return prev;
                const updated = { ...prev[idx], lastMsg: 'Đã gửi tệp đính kèm', lastAt: new Date() };
                const next = [...prev];
                next.splice(idx, 1);
                return [updated, ...next];
            });

            const serverMessage = data?.data?.message;
            if (serverMessage) {
                const img = serverMessage.file_dinh_kem ? normalizeUploadsUrl(serverMessage.file_dinh_kem, 'messages') : '';
                const msg = {
                    id: serverMessage.ID_TinNhan,
                    sender: serverMessage.ID_NguoiGui === myUserId ? 'me' : 'them',
                    text: serverMessage.noi_dung || '',
                    time: formatTime(serverMessage.thoi_gian_gui),
                    image: img,
                };
                setChatMessages(prev => (prev.some(x => x.id === msg.id) ? prev : [...prev, msg]));
            } else {
                loadMessages(selectedChat);
            }
        } catch (err) {
            console.error('Widget upload/send failed', err);
            setError('Không thể gửi tệp đính kèm.');
        }
    }, [loadMessages, myUserId, normalizeUploadsUrl, selectedChat, token]);

    useEffect(() => {
        if (isOpen && isAuthenticated) loadConversations();
    }, [isOpen, isAuthenticated, loadConversations]);

    useEffect(() => {
        if (!isAuthenticated) return;

        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        const s = io(socketUrl, {
            transports: ['websocket'],
            auth: { token },
        });
        socketRef.current = s;

        s.on('connect', () => {
            s.emit('user_login', { userId: myUserId });
            const active = selectedChatRef.current;
            if (active?.type === 'private') {
                s.emit('join_chat', { userId: myUserId, chatType: 'private', chatId: active.id });
            }
        });

        s.on('friend_status_change', (data) => {
            const friendId = data?.userId;
            const status = data?.status;
            if (!friendId) return;
            setConversations(prev => prev.map(c => (
                c.type === 'private' && String(c.id) === String(friendId)
                    ? { ...c, online: status === 'online' }
                    : c
            )));
        });

        s.on('new_message', (payload) => {
            if (!payload || payload.type !== 'private') return;
            const m = payload.message;
            if (!m) return;

            const otherId = m.ID_NguoiGui === myUserId ? m.ID_NguoiNhan : m.ID_NguoiGui;
            const messageTime = formatTime(m.thoi_gian_gui);
            const imageUrl = m.file_dinh_kem ? normalizeUploadsUrl(m.file_dinh_kem, 'messages') : '';
            const messageText = m.noi_dung || (imageUrl ? 'Đã gửi tệp đính kèm' : '');

            const active = selectedChatRef.current;
            const isCurrentChat = active?.type === 'private' && String(active.id) === String(otherId);

            setConversations(prev => {
                const idx = prev.findIndex(c => c.type === 'private' && String(c.id) === String(otherId));
                const base = idx !== -1 ? prev[idx] : null;
                const nameFromPayload = m.ID_NguoiGui === myUserId
                    ? (base?.name || 'Người dùng')
                    : (m.ten_nguoi_gui || base?.name || 'Người dùng');
                const avatarFromPayload = m.ID_NguoiGui === myUserId
                    ? (base?.avatar || '')
                    : (m.anh_nguoi_gui || base?.avatar || '');

                const nextUnread = isCurrentChat
                    ? 0
                    : (base?.unread || 0) + (m.ID_NguoiGui === myUserId ? 0 : 1);

                const updated = {
                    id: otherId,
                    type: 'private',
                    name: nameFromPayload,
                    avatar: avatarFromPayload ? normalizeUploadsUrl(avatarFromPayload) : (base?.avatar || avatarFallback(otherId)),
                    lastMsg: messageText,
                    lastAt: m.thoi_gian_gui ? new Date(m.thoi_gian_gui) : new Date(),
                    unread: nextUnread,
                    online: base?.online || false,
                };

                if (idx === -1) return [updated, ...prev];

                const next = [...prev];
                next.splice(idx, 1);
                return [updated, ...next];
            });

            if (isCurrentChat) {
                const msg = {
                    id: m.ID_TinNhan,
                    sender: m.ID_NguoiGui === myUserId ? 'me' : 'them',
                    text: m.noi_dung || '',
                    time: messageTime,
                    image: imageUrl,
                };

                setChatMessages(prev => {
                    if (m.ID_NguoiGui === myUserId) {
                        const tempIdx = prev.findIndex(x => x.sender === 'me' && String(x.id).startsWith('temp_') && x.text === msg.text);
                        if (tempIdx !== -1) {
                            const updated = [...prev];
                            updated[tempIdx] = msg;
                            return updated;
                        }
                    }
                    if (prev.some(x => x.id === msg.id)) return prev;
                    return [...prev, msg];
                });

                s.emit('mark_read', { userId: myUserId, chatType: 'private', chatId: otherId });
            }
        });

        s.on('connect_error', (e) => {
            console.error('Widget socket connect error', e?.message || e);
        });

        return () => {
            s.disconnect();
        };
    }, [isAuthenticated, myUserId, normalizeUploadsUrl, socketUrl, token]);

    return (
        <>
            <button className="chat-fab" onClick={() => setIsOpen(!isOpen)} aria-label="Tin nhắn">
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
                {!isOpen && totalUnread > 0 && <span className="chat-fab-badge">{totalUnread}</span>}
            </button>

            {isOpen && (
                <div className="chat-widget">
                    {error && (
                        <div style={{ padding: '10px 12px', fontSize: 12, color: '#991b1b', background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                            {error}
                        </div>
                    )}

                    {selectedChat ? (
                        <ChatDetailView
                            chat={selectedChat}
                            messages={chatMessages}
                            loadingMsgs={loadingMsgs}
                            inputText={inputText}
                            onInputChange={setInputText}
                            onSend={handleSend}
                            onBack={handleBack}
                            onKeyDown={handleKeyDown}
                            onPickFile={handlePickFile}
                        />
                    ) : (
                        <ChatListView
                            conversations={conversations}
                            loadingConvs={loadingConvs}
                            isAuthenticated={isAuthenticated}
                            onSelectChat={handleSelectChat}
                            onClose={handleClose}
                            onRefresh={loadConversations}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                        />
                    )}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </>
    );
}
