import { useState, useRef, useEffect } from 'react';
import {
    MessageCircle, X, Search, MoreHorizontal, Edit3,
    ArrowLeft, Phone, Video, Send, Image, Smile, ChevronDown
} from 'lucide-react';
import './ChatWidget.css';

/* ════════ MOCK DATA ════════ */
const MOCK_CONVERSATIONS = [
    {
        id: 'c1', name: 'Tuấn đzz', avatar: 'https://i.pravatar.cc/150?img=11',
        lastMsg: 'Hello bạn!', time: '22:00', unread: 4, online: true,
    },
    {
        id: 'c2', name: 'Linh Lê', avatar: 'https://i.pravatar.cc/150?img=5',
        lastMsg: 'Bài đăng: Máy lạnh daikin 2.5hp i...', time: '14:42', unread: 0, online: true,
    },
    {
        id: 'c3', name: 'Bảo Vũ', avatar: 'https://i.pravatar.cc/150?img=33',
        lastMsg: 'Ok anh, em gửi ảnh nha', time: '22:18', unread: 0, online: false,
    },
    {
        id: 'c4', name: 'Kim Tuyến', avatar: 'https://i.pravatar.cc/150?img=44',
        lastMsg: 'Bạn: Uk', time: '09:30', unread: 0, online: false,
    },
    {
        id: 'c5', name: 'Đức Thụy', avatar: 'https://i.pravatar.cc/150?img=17',
        lastMsg: 'Bạn: Ăn cái bún bh ...', time: '08:15', unread: 0, online: true,
    },
    {
        id: 'c6', name: 'Thi Nguyen', avatar: 'https://i.pravatar.cc/150?img=21',
        lastMsg: 'Bạn: Tú con về', time: '昨天', unread: 0, online: false,
    },
    {
        id: 'c7', name: 'Nguyễn Duy Tiến', avatar: 'https://i.pravatar.cc/150?img=60',
        lastMsg: 'Oke anh', time: '昨天', unread: 0, online: false,
    },
];

const MOCK_MESSAGES = {
    c1: [
        { id: 'm1', text: 'Hey! Mình muốn hỏi về cái laptop bạn đăng bán', sender: 'them', time: '21:50' },
        { id: 'm2', text: 'Chào bạn, laptop vẫn còn nha!', sender: 'me', time: '21:52' },
        { id: 'm3', text: 'Bạn thấy sao?', sender: 'them', time: '21:55', image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=400' },
        { id: 'm4', text: 'Máy đẹp quá! Giá bao nhiêu vậy bạn?', sender: 'them', time: '22:00' },
        { id: 'm5', text: '28 triệu bạn nhé, còn bảo hành 10 tháng', sender: 'me', time: '22:00' },
        { id: 'm6', text: 'Hello bạn!', sender: 'them', time: '22:00' },
    ],
    c2: [
        { id: 'm1', text: 'Cho mình hỏi máy lạnh còn không ạ?', sender: 'them', time: '14:30' },
        { id: 'm2', text: 'Dạ vẫn còn bạn', sender: 'me', time: '14:35' },
        { id: 'm3', text: 'Bài đăng: Máy lạnh daikin 2.5hp inverter', sender: 'them', time: '14:42' },
    ],
    c3: [
        { id: 'm1', text: 'Anh ơi hàng tới chưa?', sender: 'them', time: '22:10' },
        { id: 'm2', text: 'Rồi em, đợi anh gửi ảnh', sender: 'me', time: '22:15' },
        { id: 'm3', text: 'Ok anh, em gửi ảnh nha', sender: 'them', time: '22:18' },
    ],
};

/* ════════ SUB-COMPONENTS ════════ */

/* ── Chat List View ── */
function ChatListView({ conversations, onSelectChat, onClose, searchQuery, onSearchChange }) {
    const [activeTab, setActiveTab] = useState('all');
    const tabs = [
        { key: 'all', label: 'All Chats' },
        { key: 'groups', label: 'Groups' },
        { key: 'contacts', label: 'Contacts' },
    ];

    const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

    const filtered = searchQuery.trim()
        ? conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : conversations;

    return (
        <>
            {/* Header */}
            <div className="cw-header">
                <div className="cw-header-left">
                    <h2>Đoạn chat</h2>
                </div>
                <div className="cw-header-actions">
                    <button className="cw-icon-btn" aria-label="More"><MoreHorizontal size={16} /></button>
                    <button className="cw-icon-btn" aria-label="New chat"><Edit3 size={15} /></button>
                    <button className="cw-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
                </div>
            </div>

            {/* Search */}
            <div className="cw-search">
                <Search size={15} />
                <input
                    type="text"
                    placeholder="Tìm kiếm trên Messenger"
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                />
            </div>

            {/* Tabs */}
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

            {/* List */}
            <div className="cw-list">
                {filtered.length === 0 ? (
                    <div className="cw-empty">
                        <MessageCircle size={40} />
                        <p>Không tìm thấy cuộc trò chuyện</p>
                    </div>
                ) : (
                    filtered.map(conv => (
                        <button key={conv.id} className="cw-chat-item" onClick={() => onSelectChat(conv)}>
                            <img className="cw-chat-avatar" src={conv.avatar} alt={conv.name} />
                            <div className="cw-chat-info">
                                <div className="cw-chat-name">{conv.name}</div>
                                <div className="cw-chat-last">{conv.lastMsg}</div>
                            </div>
                            <div className="cw-chat-right">
                                <span className="cw-chat-time">{conv.time}</span>
                                {conv.unread > 0 && <span className="cw-chat-badge">{conv.unread}</span>}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </>
    );
}

/* ── Chat Detail View ── */
function ChatDetailView({ chat, messages, onBack }) {
    const [inputText, setInputText] = useState('');
    const [chatMessages, setChatMessages] = useState(messages);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        const newMsg = {
            id: `temp_${Date.now()}`,
            text: inputText.trim(),
            sender: 'me',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        };
        setChatMessages(prev => [...prev, newMsg]);
        setInputText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Header */}
            <div className="cd-header">
                <button className="cd-back-btn" onClick={onBack}><ArrowLeft size={18} /></button>
                <img className="cd-header-avatar" src={chat.avatar} alt={chat.name} />
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

            {/* Messages */}
            <div className="cd-messages">
                {chatMessages.map(msg => (
                    <div key={msg.id} className={`cd-msg-row ${msg.sender === 'me' ? 'mine' : 'theirs'}`}>
                        <div>
                            {msg.image && <img className="cd-msg-image" src={msg.image} alt="" />}
                            <div className="cd-msg-bubble">{msg.text}</div>
                            <div className="cd-msg-time">{msg.time}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="cd-input-bar">
                <button className="cd-input-icon"><Image size={18} /></button>
                <button className="cd-input-icon"><Smile size={18} /></button>
                <input
                    type="text"
                    className="cd-input-text"
                    placeholder="Write your message"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button className="cd-send-btn" onClick={handleSend}>
                    <Send size={16} />
                </button>
            </div>
        </>
    );
}

/* ════════ MAIN WIDGET ════════ */
export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);

    const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

    const handleSelectChat = (conv) => {
        // Mark as read
        setConversations(prev =>
            prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c)
        );
        setSelectedChat(conv);
    };

    const handleBack = () => {
        setSelectedChat(null);
    };

    const handleClose = () => {
        setIsOpen(false);
        setSelectedChat(null);
        setSearchQuery('');
    };

    const getMessages = (chatId) => {
        return MOCK_MESSAGES[chatId] || [
            { id: 'empty', text: 'Bắt đầu cuộc trò chuyện!', sender: 'system', time: '' }
        ];
    };

    return (
        <>
            {/* FAB Button */}
            <button className="chat-fab" onClick={() => setIsOpen(!isOpen)} aria-label="Tin nhắn">
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
                {!isOpen && totalUnread > 0 && <span className="chat-fab-badge">{totalUnread}</span>}
            </button>

            {/* Widget Panel */}
            {isOpen && (
                <div className="chat-widget">
                    {selectedChat ? (
                        <ChatDetailView
                            chat={selectedChat}
                            messages={getMessages(selectedChat.id)}
                            onBack={handleBack}
                        />
                    ) : (
                        <ChatListView
                            conversations={conversations}
                            onSelectChat={handleSelectChat}
                            onClose={handleClose}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                        />
                    )}
                </div>
            )}
        </>
    );
}
