import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Search, MoreHorizontal, Edit3, Phone, Video, Info,
    Send, Image, Smile, Mic, ChevronDown,
    MessageCircle, User, Bell, Shield, X, Mail, Users, UserCheck, UserX, FileText, Trash2
} from 'lucide-react';
import io from 'socket.io-client';
import { API_BASE_URL } from '../../constants';
import './Messages.css';

const avatarFallback = (seed) => `https://i.pravatar.cc/150?u=${encodeURIComponent(seed || 'user')}`;

/* ════════ MAIN PAGE ════════ */
export default function Messages() {
    const [selectedChat, setSelectedChat] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [inputText, setInputText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [error, setError] = useState('');

    // ── Inline search dropdown (left panel) ──
    const [searchFocused, setSearchFocused] = useState(false);
    const [listUserResults, setListUserResults] = useState([]);
    const [listSearching, setListSearching] = useState(false);
    const [listSearchFilter, setListSearchFilter] = useState('all');
    const searchWrapRef = useRef(null);

    // ── Modal new chat (kept as secondary, via pencil icon) ──
    const [showNewChat, setShowNewChat] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [friendIds, setFriendIds] = useState(new Set());
    const [searchFilter, setSearchFilter] = useState('all');

    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const listSearchInputRef = useRef(null);

    const tabs = [
        { key: 'all', label: 'Tất cả' },
        { key: 'unread', label: 'Chưa đọc' },
        { key: 'groups', label: 'Nhóm' },
    ];

    const myUserId = useMemo(() => localStorage.getItem('userId') || '', []);
    const token = useMemo(() => localStorage.getItem('token') || '', []);
    const backendOrigin = useMemo(() => {
        try { return new URL(API_BASE_URL).origin; } catch { return 'http://localhost:3000'; }
    }, []);
    const socketUrl = useMemo(() => backendOrigin, [backendOrigin]);

    const normalizeUploadsUrl = useCallback((raw, uploadsSubPath = '') => {
        if (!raw) return '';
        // filename only
        if (typeof raw === 'string' && !raw.startsWith('http://') && !raw.startsWith('https://')) {
            const sub = uploadsSubPath ? `/${uploadsSubPath.replace(/^\/+|\/+$/g, '')}` : '';
            return `${backendOrigin}/uploads${sub}/${raw}`;
        }
        try {
            const url = new URL(raw);
            if (url.pathname.startsWith('/uploads/')) {
                return `${backendOrigin}${url.pathname}`;
            }
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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [chatMessages]);

    const filteredConvs = useMemo(() => {
        let list = conversations;
        if (activeTab === 'unread') list = list.filter(c => (c.unread || 0) > 0);
        if (activeTab === 'groups') list = list.filter(c => c.type === 'group');
        const q = searchQuery.trim().toLowerCase();
        if (q) list = list.filter(c => (c.name || '').toLowerCase().includes(q));
        return list;
    }, [conversations, activeTab, searchQuery]);

    const loadConversations = useCallback(async () => {
        if (!myUserId) return;
        setLoadingConvs(true);
        setError('');
        try {
            const res = await apiFetch(`/tinnhan/conversations/${myUserId}`);
            const rows = res?.data || [];
            const mapped = rows.map((c) => ({
                id: c.conversation_id,
                type: c.conversation_type, // private | group
                name: c.conversation_name || 'Unknown',
                avatar: normalizeUploadsUrl(c.conversation_avatar) || avatarFallback(c.conversation_id),
                lastMsg: c.last_message || '',
                lastAt: c.last_message_time ? new Date(c.last_message_time) : null,
                unread: c.unread_count || 0,
                online: false, // will update via socket events later
            }));
            setConversations(mapped);
            if (!selectedChat && mapped.length > 0) {
                setSelectedChat(mapped[0]);
            }
        } catch (e) {
            console.error('Load conversations failed', e);
            setError('Không thể tải danh sách chat. Kiểm tra backend/API_BASE_URL.');
            setConversations([]);
        } finally {
            setLoadingConvs(false);
        }
    }, [apiFetch, myUserId, normalizeUploadsUrl, selectedChat]);

    const loadMessages = useCallback(async (conv) => {
        if (!conv || !myUserId) return;
        setLoadingMsgs(true);
        setError('');
        try {
            if (conv.type === 'group') {
                // TODO: group chat UI
                setChatMessages([{ id: 'sys', sender: 'system', text: 'Group chat (đang phát triển)', time: '' }]);
                return;
            }
            const res = await apiFetch(`/tinnhan/private/${myUserId}/${conv.id}?limit=50&offset=0`);
            const rows = res?.data || [];
            const msgs = rows
                .slice()
                .reverse()
                .map((m) => {
                    const isMine = m.ID_NguoiGui === myUserId;
                    const time = m.thoi_gian_gui
                        ? new Date(m.thoi_gian_gui).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : '';
                    const file = m.file_dinh_kem ? normalizeUploadsUrl(m.file_dinh_kem, 'messages') : '';
                    return {
                        id: m.ID_TinNhan,
                        sender: isMine ? 'me' : 'them',
                        text: m.noi_dung || '',
                        time,
                        image: file || '',
                    };
                });
            setChatMessages(msgs.length ? msgs : [{ id: 'start', sender: 'system', text: 'Bắt đầu cuộc trò chuyện! 👋', time: '' }]);
        } catch (e) {
            console.error('Load messages failed', e);
            setError('Không thể tải tin nhắn.');
            setChatMessages([{ id: 'start', sender: 'system', text: 'Không thể tải tin nhắn. Thử lại sau.', time: '' }]);
        } finally {
            setLoadingMsgs(false);
        }
    }, [apiFetch, myUserId, normalizeUploadsUrl]);

    const handleSelectChat = useCallback((conv) => {
        setSelectedChat(conv);
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
        loadMessages(conv);
        // join socket room for realtime
        if (socketRef.current?.connected && conv.type === 'private') {
            socketRef.current.emit('join_chat', { userId: myUserId, chatType: 'private', chatId: conv.id });
            socketRef.current.emit('mark_read', { userId: myUserId, chatType: 'private', chatId: conv.id });
        }
    }, [loadMessages, myUserId]);

    // initial load
    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // socket connect
    useEffect(() => {
        if (!myUserId || !token) return;

        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        const s = io(socketUrl, {
            transports: ['websocket'],
            auth: {
                token,
            },
        });
        socketRef.current = s;

        s.on('connect', () => {
            s.emit('user_login', { userId: myUserId });
            if (selectedChat?.type === 'private') {
                s.emit('join_chat', { userId: myUserId, chatType: 'private', chatId: selectedChat.id });
            }
        });

        s.on('friend_status_change', (data) => {
            const { userId, status } = data || {};
            if (!userId) return;
            setConversations(prev => prev.map(c => (c.type === 'private' && c.id === userId ? { ...c, online: status === 'online' } : c)));
        });

        s.on('new_message', (payload) => {
            if (!payload || payload.type !== 'private') return;
            const m = payload.message;
            if (!m) return;

            const otherId = m.ID_NguoiGui === myUserId ? m.ID_NguoiNhan : m.ID_NguoiGui;
            const time = m.thoi_gian_gui
                ? new Date(m.thoi_gian_gui).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '';
            const img = m.file_dinh_kem ? normalizeUploadsUrl(m.file_dinh_kem, 'messages') : '';

            // update messages if current chat is open with this user
            if (selectedChat?.type === 'private' && selectedChat.id === otherId) {
                const msg = { id: m.ID_TinNhan, sender: m.ID_NguoiGui === myUserId ? 'me' : 'them', text: m.noi_dung || '', time, image: img };
                setChatMessages(prev => {
                    // Nếu là tin nhắn của mình, tìm tin nhắn tạm trùng nội dung để thay thế
                    if (m.ID_NguoiGui === myUserId) {
                        const tempIdx = prev.findIndex(x => x.sender === 'me' && x.id.toString().startsWith('temp_') && x.text === msg.text);
                        if (tempIdx !== -1) {
                            const updated = [...prev];
                            updated[tempIdx] = msg;
                            return updated;
                        }
                    }
                    // Tránh duplicate nếu nhận lại tin nhắn đã có ID thật
                    if (prev.some(x => x.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                s.emit('mark_read', { userId: myUserId, chatType: 'private', chatId: otherId });
            } else {
                // increment unread
                setConversations(prev => prev.map(c => (c.type === 'private' && c.id === otherId ? { ...c, unread: (c.unread || 0) + 1, lastMsg: m.noi_dung || '', lastAt: m.thoi_gian_gui ? new Date(m.thoi_gian_gui) : c.lastAt } : c)));
            }
        });

        s.on('connect_error', (e) => {
            console.error('Socket connect error', e?.message || e);
        });

        return () => {
            s.disconnect();
        };
    }, [myUserId, token, socketUrl, normalizeUploadsUrl, selectedChat]);

    // Load friend list on mount (used for both inline search and modal)
    useEffect(() => {
        if (!myUserId) return;
        apiFetch(`/quanHeBanBe/list/${myUserId}`)
            .then((res) => {
                const rows = res?.data || res || [];
                const ids = new Set(rows.map((f) => f.ID_NguoiDung || f.friend_id || f.id).filter(Boolean));
                setFriendIds(ids);
            })
            .catch(() => setFriendIds(new Set()));
    }, [myUserId, apiFetch]);

    // ── Inline search: trigger on searchQuery ──
    useEffect(() => {
        const q = searchQuery.trim();
        if (!q || !myUserId) {
            setListUserResults([]);
            setListSearchFilter('all');
            return;
        }

        const t = setTimeout(async () => {
            setListSearching(true);
            try {
                const res = await apiFetch(`/nguoidung/search?tuKhoa=${encodeURIComponent(q)}&idNguoiDungHienTai=${encodeURIComponent(myUserId)}`);
                const rows = res?.data || res || [];
                const mapped = rows.map((u) => ({
                    id: u.ID_NguoiDung,
                    name: u.ho_ten || 'Người dùng',
                    email: u.email || '',
                    avatar: normalizeUploadsUrl(u.anh_dai_dien) || avatarFallback(u.ID_NguoiDung),
                    school: u.truong_hoc || '',
                    hometown: u.que_quan || '',
                    isFriend: friendIds.has(u.ID_NguoiDung),
                }));
                setListUserResults(mapped);
            } catch (e) {
                console.error('Inline search failed', e);
                setListUserResults([]);
            } finally {
                setListSearching(false);
            }
        }, 400);

        return () => clearTimeout(t);
    }, [searchQuery, myUserId, apiFetch, normalizeUploadsUrl, friendIds]);

    // ── Close inline dropdown when clicking outside ──
    useEffect(() => {
        const handle = (e) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // ── Modal search (pencil icon) ──
    useEffect(() => {
        if (!showNewChat) return;
        const q = userSearch.trim();
        if (!q || !myUserId) {
            setUserResults([]);
            return;
        }

        const t = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const res = await apiFetch(`/nguoidung/search?tuKhoa=${encodeURIComponent(q)}&idNguoiDungHienTai=${encodeURIComponent(myUserId)}`);
                const rows = res?.data || res || [];
                const mapped = rows.map((u) => ({
                    id: u.ID_NguoiDung,
                    name: u.ho_ten || 'Người dùng',
                    email: u.email || '',
                    avatar: normalizeUploadsUrl(u.anh_dai_dien) || avatarFallback(u.ID_NguoiDung),
                    school: u.truong_hoc || '',
                    hometown: u.que_quan || '',
                    isFriend: friendIds.has(u.ID_NguoiDung),
                }));
                setUserResults(mapped);
            } catch (e) {
                console.error('Modal user search failed', e);
                setUserResults([]);
            } finally {
                setSearchingUsers(false);
            }
        }, 450);

        return () => clearTimeout(t);
    }, [showNewChat, userSearch, myUserId, apiFetch, normalizeUploadsUrl, friendIds]);

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) return;

        try {
            await apiFetch(`/tinnhan/delete/${msgId}`, {
                method: 'DELETE',
                body: JSON.stringify({ userId: myUserId })
            });

            // Update local state
            setChatMessages(prev => prev.filter(m => m.id !== msgId));

            // Optionally notify via socket if backend doesn't broadcast it
            if (socketRef.current?.connected) {
                socketRef.current.emit('delete_message', { msgId, chatId: selectedChat.id });
            }
        } catch (e) {
            console.error('Delete message failed', e);
            alert('Không thể xóa tin nhắn. Vui lòng thử lại.');
        }
    };

    const handleDeleteConversation = async () => {
        if (!selectedChat) return;
        if (selectedChat.type !== 'private') {
            alert('Hiện tại chỉ hỗ trợ xóa cuộc trò chuyện cá nhân.');
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện với ${selectedChat.name}? Hành động này không thể hoàn tác.`)) return;

        try {
            await apiFetch(`/tinnhan/delete-conversation/${myUserId}/${selectedChat.id}`, {
                method: 'DELETE'
            });

            // Update local state
            setConversations(prev => prev.filter(c => c.id !== selectedChat.id));
            setSelectedChat(null);
            setChatMessages([]);

            if (socketRef.current?.connected) {
                socketRef.current.emit('delete_conversation', { userId: myUserId, otherUserId: selectedChat.id });
            }
        } catch (e) {
            console.error('Delete conversation failed', e);
            alert('Không thể xóa cuộc trò chuyện. Vui lòng thử lại.');
        }
    };

    const handleSend = () => {
        if (!inputText.trim()) return;
        if (!selectedChat || selectedChat.type !== 'private') return;
        const newMsg = {
            id: `temp_${Date.now()}`,
            text: inputText.trim(),
            sender: 'me',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        };
        setChatMessages(prev => [...prev, newMsg]);
        setInputText('');

        const payload = {
            ID_NguoiGui: myUserId,
            ID_NguoiNhan: selectedChat.id,
            noi_dung: newMsg.text,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
        };

        if (socketRef.current?.connected) {
            socketRef.current.emit('send_message', payload);
        } else {
            // fallback HTTP
            apiFetch('/tinnhan/send', {
                method: 'POST',
                body: JSON.stringify(payload),
            }).catch((e) => {
                console.error('Send message HTTP failed', e);
            });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="messages-page">
            {error && (
                <div style={{
                    position: 'fixed',
                    top: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '10px 12px',
                    borderRadius: 12,
                    maxWidth: 720,
                    width: 'calc(100% - 32px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    fontSize: 13,
                }}>
                    <span>{error}</span>
                    <button
                        type="button"
                        className="msg-icon-btn"
                        onClick={() => setError('')}
                        aria-label="Close error"
                        style={{ background: 'transparent' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ═══ LEFT — Chat List ═══ */}
            <div className="msg-list-panel">
                <div className="msg-list-header">
                    <h2>Đoạn chat</h2>
                    <div className="msg-list-header-actions">
                        <button className="msg-icon-btn" aria-label="More"><MoreHorizontal size={16} /></button>
                        <button className="msg-icon-btn" aria-label="New chat" onClick={() => setShowNewChat(true)}><Edit3 size={15} /></button>
                    </div>
                </div>

                {/* ── Search bar with inline dropdown ── */}
                <div className="msg-list-search-wrap" ref={searchWrapRef}>
                    <div className={`msg-list-search ${searchQuery.includes('@') ? 'email-mode' : ''}`}>
                        {searchQuery.includes('@') ? <Mail size={15} style={{ color: '#3b82f6', flexShrink: 0 }} /> : <Search size={15} />}
                        <input
                            ref={listSearchInputRef}
                            type="text"
                            placeholder="Tìm tên, email người dùng..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setSearchFocused(true); }}
                            onFocus={() => setSearchFocused(true)}
                            onKeyDown={e => { if (e.key === 'Escape') { setSearchFocused(false); setSearchQuery(''); } }}
                        />
                        {searchQuery && (
                            <button
                                className="msg-modal-clear"
                                onClick={() => { setSearchQuery(''); setListUserResults([]); setSearchFocused(false); listSearchInputRef.current?.focus(); }}
                                aria-label="Xóa"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {listSearching && <span className="msg-list-search-spin" />}
                    </div>

                    {/* ── Inline dropdown ── */}
                    {searchFocused && searchQuery.trim() && (() => {
                        const isEmail = searchQuery.includes('@');
                        const filtered = listUserResults.filter(u => {
                            if (listSearchFilter === 'friend') return u.isFriend;
                            if (listSearchFilter === 'stranger') return !u.isFriend;
                            return true;
                        });
                        return (
                            <div className="msg-search-dropdown">
                                {/* Filter tabs */}
                                {listUserResults.length > 0 && (
                                    <div className="msg-search-dropdown-tabs">
                                        {[['all', 'Tất cả', <Users size={12} />], ['friend', 'Bạn bè', <UserCheck size={12} />], ['stranger', 'Người lạ', <UserX size={12} />]].map(([key, label, icon]) => (
                                            <button
                                                key={key}
                                                className={`msg-search-dropdown-tab ${listSearchFilter === key ? 'active' : ''}`}
                                                onMouseDown={e => { e.preventDefault(); setListSearchFilter(key); }}
                                            >
                                                {icon}{label}
                                                <span className="tab-count">
                                                    {key === 'all' ? listUserResults.length
                                                        : key === 'friend' ? listUserResults.filter(u => u.isFriend).length
                                                            : listUserResults.filter(u => !u.isFriend).length}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Results */}
                                <div className="msg-search-dropdown-list">
                                    {filtered.length > 0 ? filtered.map(u => (
                                        <button
                                            key={u.id}
                                            className="msg-user-row"
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => {
                                                const conv = { id: u.id, type: 'private', name: u.name, avatar: u.avatar, lastMsg: '', lastAt: null, unread: 0, online: false };
                                                setSearchQuery('');
                                                setListUserResults([]);
                                                setSearchFocused(false);
                                                handleSelectChat(conv);
                                            }}
                                        >
                                            <div className="msg-user-avatar-wrap">
                                                <img className="msg-user-avatar" src={u.avatar} alt={u.name} />
                                                {u.isFriend && <span className="msg-user-friend-dot" />}
                                            </div>
                                            <div className="msg-user-info">
                                                <div className="msg-user-name-row">
                                                    <span className="msg-user-name">{u.name}</span>
                                                    {u.isFriend
                                                        ? <span className="user-badge friend">Bạn bè</span>
                                                        : <span className="user-badge stranger">Người lạ</span>}
                                                </div>
                                                <div className="msg-user-sub">
                                                    {u.isFriend ? (
                                                        u.email ? <span className="msg-user-email"><Mail size={11} />{u.email}</span> : (u.school || u.hometown || '')
                                                    ) : (
                                                        u.school ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileText size={11} />{u.school}</span> : (u.hometown || '')
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    )) : (
                                        <div className="msg-search-dropdown-empty">
                                            {listSearching
                                                ? 'Đang tìm...'
                                                : isEmail
                                                    ? 'Không tìm thấy email này.'
                                                    : <><Search size={16} style={{ opacity: 0.4 }} /><span>Không tìm thấy. Thử email chính xác.</span></>}
                                        </div>
                                    )}
                                </div>

                                {/* Email hint row */}
                                {!isEmail && (
                                    <div className="msg-search-dropdown-hint">
                                        <Mail size={12} /> Nhập email để tìm người lạ
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* ── Tabs (hidden when search dropdown is open) ── */}
                {!(searchFocused && searchQuery.trim()) && (
                    <div className="msg-list-tabs">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                className={`msg-list-tab ${activeTab === t.key ? 'active' : ''}`}
                                onClick={() => setActiveTab(t.key)}
                            >
                                {t.label}
                            </button>
                        ))}
                        <button className="msg-list-tab-more"><MoreHorizontal size={16} /></button>
                    </div>
                )}

                {/* ── Conversation list (hidden when search dropdown is open) ── */}
                {!(searchFocused && searchQuery.trim()) && (
                    <div className="msg-list-conversations">
                        {loadingConvs ? (
                            <div style={{ padding: 16, color: '#777' }}>Đang tải...</div>
                        ) : filteredConvs.map(conv => (
                            <button
                                key={conv.id}
                                className={`msg-conv-item ${selectedChat?.id === conv.id ? 'selected' : ''} ${conv.unread > 0 ? 'has-unread' : ''}`}
                                onClick={() => handleSelectChat(conv)}
                            >
                                <div className="msg-conv-avatar-wrap">
                                    <img className="msg-conv-avatar" src={conv.avatar} alt={conv.name} />
                                    {conv.online && <span className="msg-conv-online-dot" />}
                                </div>
                                <div className="msg-conv-info">
                                    <div className="msg-conv-name">{conv.name}</div>
                                    <div className="msg-conv-last">
                                        {conv.lastMsg}
                                        {conv.lastAt ? ` · ${conv.lastAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}
                                    </div>
                                </div>
                                <div className="msg-conv-right">
                                    {conv.unread > 0 && <span className="msg-conv-badge">{conv.unread}</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ CENTER — Chat Detail ═══ */}
            <div className="msg-detail-panel">
                {selectedChat ? (
                    <>
                        {/* Header */}
                        <div className="msg-detail-header">
                            <img className="msg-detail-avatar" src={selectedChat.avatar} alt={selectedChat.name} />
                            <div className="msg-detail-info">
                                <div className="msg-detail-name">{selectedChat.name}</div>
                                <div className={`msg-detail-status ${selectedChat.online ? '' : 'offline'}`}>
                                    {selectedChat.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
                                </div>
                            </div>
                            <div className="msg-detail-actions">
                                <button className="msg-detail-action-btn" title="Gọi thoại"><Phone size={18} /></button>
                                <button className="msg-detail-action-btn" title="Gọi video"><Video size={18} /></button>
                                <button className="msg-detail-action-btn" title="Xóa cuộc trò chuyện" onClick={handleDeleteConversation}>
                                    <Trash2 size={18} color="#7f001f" />
                                </button>
                                <button className="msg-detail-action-btn" title="Thông tin"><Info size={18} /></button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="msg-detail-messages">
                            {loadingMsgs && <div style={{ padding: 16, color: '#777' }}>Đang tải tin nhắn...</div>}
                            {chatMessages.map(msg => (
                                <div key={msg.id} className={`msg-bubble-row ${msg.sender === 'me' ? 'mine' : 'theirs'}`}>
                                    <div className="msg-bubble-container">
                                        {msg.image && <img className="msg-bubble-img" src={msg.image} alt="" />}
                                        <div className="msg-bubble-wrap">
                                            <div className="msg-bubble">{msg.text}</div>
                                            {msg.sender === 'me' && msg.id && !msg.id.toString().startsWith('temp_') && (
                                                <button
                                                    className="msg-bubble-delete-btn"
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    title="Xóa tin nhắn"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        {msg.time && <div className="msg-bubble-time">{msg.time}</div>}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="msg-input-bar">
                            <button className="msg-input-icon"><Image size={20} /></button>
                            <button className="msg-input-icon"><Mic size={20} /></button>
                            <input
                                type="text"
                                className="msg-input-text"
                                placeholder="Aa"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button className="msg-input-emoji">😊</button>
                            <button className="msg-send-btn" onClick={handleSend}>
                                <Send size={18} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="msg-detail-empty">
                        <div className="msg-detail-empty-icon">
                            <MessageCircle size={36} />
                        </div>
                        <h3>Chọn cuộc trò chuyện</h3>
                        <p>Chọn một đoạn chat bên trái để bắt đầu nhắn tin</p>
                    </div>
                )}
            </div>

            {/* ═══ RIGHT — User Info ═══ */}
            <div className="msg-info-panel">
                {selectedChat ? (
                    <>
                        <div className="msg-info-top">
                            <img className="msg-info-avatar" src={selectedChat.avatar} alt={selectedChat.name} />
                            <div className="msg-info-name">{selectedChat.name}</div>
                            <div className={`msg-info-status ${selectedChat.online ? '' : 'offline'}`}>
                                {selectedChat.online ? '● Đang hoạt động' : '○ Ngoại tuyến'}
                            </div>

                            <div className="msg-info-quick-actions">
                                <button className="msg-info-quick-btn">
                                    <span className="msg-info-quick-icon"><User size={16} /></span>
                                    <span className="msg-info-quick-label">Trang cá nhân</span>
                                </button>
                                <button className="msg-info-quick-btn">
                                    <span className="msg-info-quick-icon"><Bell size={16} /></span>
                                    <span className="msg-info-quick-label">Tắt thông báo</span>
                                </button>
                                <button className="msg-info-quick-btn">
                                    <span className="msg-info-quick-icon"><Search size={16} /></span>
                                    <span className="msg-info-quick-label">Tìm kiếm</span>
                                </button>
                            </div>
                        </div>

                        <div className="msg-info-section">
                            <button className="msg-info-section-header">
                                <span>Thông tin về đoạn chat</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        <div className="msg-info-section">
                            <button className="msg-info-section-header">
                                <span>Tùy chỉnh đoạn chat</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        <div className="msg-info-section">
                            <button className="msg-info-section-header">
                                <span>File phương tiện & file</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        <div className="msg-info-section">
                            <button className="msg-info-section-header">
                                <span>Quyền riêng tư và hỗ trợ</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="msg-info-empty">
                        <p>Chọn cuộc trò chuyện để xem thông tin</p>
                    </div>
                )}
            </div>

            {/* New chat modal */}
            {showNewChat && (() => {
                const isEmailQuery = userSearch.includes('@');
                const filteredResults = userResults.filter(u => {
                    if (searchFilter === 'friend') return u.isFriend;
                    if (searchFilter === 'stranger') return !u.isFriend;
                    return true;
                });
                return (
                    <div className="msg-modal-overlay" onClick={() => { setShowNewChat(false); setSearchFilter('all'); }}>
                        <div className="msg-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="msg-modal-header">
                                <h3>Tìm người nhắn tin</h3>
                                <button className="msg-icon-btn" onClick={() => { setShowNewChat(false); setSearchFilter('all'); }} aria-label="Close">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search input */}
                            <div className={`msg-modal-search ${isEmailQuery ? 'email-mode' : ''}`}>
                                {isEmailQuery ? <Mail size={16} className="email-icon" /> : <Search size={16} />}
                                <input
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Tìm bằng tên hoặc email (người lạ)..."
                                    autoFocus
                                />
                                {searchingUsers
                                    ? <span className="msg-modal-loading">&#8230;</span>
                                    : userSearch && (
                                        <button className="msg-modal-clear" onClick={() => setUserSearch('')} aria-label="Clear">
                                            <X size={13} />
                                        </button>
                                    )
                                }
                            </div>

                            {/* Email hint */}
                            {!userSearch && (
                                <div className="msg-modal-hint">
                                    <Mail size={13} />
                                    <span>Nhập email chính xác để tìm người lạ</span>
                                </div>
                            )}

                            {/* Filter tabs — only when there are results */}
                            {userSearch.trim() && userResults.length > 0 && (
                                <div className="msg-modal-filter-tabs">
                                    {[['all', 'Tất cả', <Users size={13} />], ['friend', 'Bạn bè', <UserCheck size={13} />], ['stranger', 'Người lạ', <UserX size={13} />]].map(([key, label, icon]) => (
                                        <button
                                            key={key}
                                            className={`msg-modal-filter-tab ${searchFilter === key ? 'active' : ''}`}
                                            onClick={() => setSearchFilter(key)}
                                        >
                                            {icon}{label}
                                            <span className="tab-count">
                                                {key === 'all' ? userResults.length
                                                    : key === 'friend' ? userResults.filter(u => u.isFriend).length
                                                        : userResults.filter(u => !u.isFriend).length}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Results list */}
                            <div className="msg-modal-results">
                                {filteredResults.map((u) => (
                                    <button
                                        key={u.id}
                                        className="msg-user-row"
                                        onClick={() => {
                                            const conv = {
                                                id: u.id,
                                                type: 'private',
                                                name: u.name,
                                                avatar: u.avatar,
                                                lastMsg: '',
                                                lastAt: null,
                                                unread: 0,
                                                online: false,
                                            };
                                            setShowNewChat(false);
                                            setUserSearch('');
                                            setUserResults([]);
                                            setSearchFilter('all');
                                            handleSelectChat(conv);
                                        }}
                                    >
                                        <div className="msg-user-avatar-wrap">
                                            <img className="msg-user-avatar" src={u.avatar} alt={u.name} />
                                            {u.isFriend && <span className="msg-user-friend-dot" title="Bạn bè" />}
                                        </div>
                                        <div className="msg-user-info">
                                            <div className="msg-user-name-row">
                                                <span className="msg-user-name">{u.name}</span>
                                                {u.isFriend
                                                    ? <span className="user-badge friend">Bạn bè</span>
                                                    : <span className="user-badge stranger">Người lạ</span>
                                                }
                                            </div>
                                            <div className="msg-user-sub">
                                                {u.isFriend ? (
                                                    u.email ? <span className="msg-user-email"><Mail size={11} />{u.email}</span> : (u.school || u.hometown || '')
                                                ) : (
                                                    u.school ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileText size={11} />{u.school}</span> : (u.hometown || '')
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {!searchingUsers && userSearch.trim() && filteredResults.length === 0 && (
                                    <div className="msg-modal-empty">
                                        {searchFilter === 'friend'
                                            ? <><UserCheck size={28} /><p>Không tìm thấy bạn bè nào phù hợp</p></>
                                            : searchFilter === 'stranger'
                                                ? <><UserX size={28} /><p>Không tìm thấy người lạ nào phù hợp</p></>
                                                : <><Search size={28} /><p>Không tìm thấy ai. Thử tìm bằng email chính xác.</p></>
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}