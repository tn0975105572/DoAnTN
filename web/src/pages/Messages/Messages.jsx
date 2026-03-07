import { useState, useRef, useEffect } from 'react';
import {
    Search, MoreHorizontal, Edit3, Phone, Video, Info,
    Send, Image, Smile, Mic, ThumbsUp, ChevronDown,
    MessageCircle, User, Bell, FileText, Shield, Lock
} from 'lucide-react';
import './Messages.css';

/* ════════ MOCK DATA ════════ */
const MOCK_CONVERSATIONS = [
    { id: 'c1', name: 'Đức Thụy', avatar: 'https://i.pravatar.cc/150?img=17', lastMsg: 'Bạn: bọn lớp chọn khó chơi về...', time: '1 phút', unread: 0, online: true },
    { id: 'c2', name: 'SV ko rep bạn', avatar: 'https://i.pravatar.cc/150?img=60', lastMsg: 'Chậm thế', time: '16 giờ', unread: 0, online: false },
    { id: 'c3', name: 'Kim Tuyến', avatar: 'https://i.pravatar.cc/150?img=5', lastMsg: 'Bạn: Uk', time: '1 ngày', unread: 0, online: false },
    { id: 'c4', name: 'Tuấn đzz', avatar: 'https://i.pravatar.cc/150?img=11', lastMsg: 'Hello bạn!', time: '22:00', unread: 4, online: true },
    { id: 'c5', name: 'Thi Nguyen', avatar: 'https://i.pravatar.cc/150?img=21', lastMsg: 'Bạn: Tú con về', time: '1 ngày', unread: 0, online: false },
    { id: 'c6', name: 'Nguyễn Duy Tiến', avatar: 'https://i.pravatar.cc/150?img=33', lastMsg: 'Oke anh', time: '1 ngày', unread: 0, online: false },
    { id: 'c7', name: 'Rãnh ko có gì làm', avatar: 'https://i.pravatar.cc/150?img=44', lastMsg: 'Haha đúng rồi', time: '2 ngày', unread: 0, online: true },
    { id: 'c8', name: 'Linh Lê', avatar: 'https://i.pravatar.cc/150?img=55', lastMsg: 'Bài đăng: Máy lạnh daikin 2.5hp...', time: '14:42', unread: 0, online: true },
    { id: 'c9', name: 'Bảo Vũ', avatar: 'https://i.pravatar.cc/150?img=68', lastMsg: 'Ok anh, em gửi ảnh nha', time: '22:18', unread: 0, online: false },
];

const MOCK_MESSAGES = {
    c1: [
        { id: 'm1', text: 'Ê mày, thi cấp 3 xong chia con mẹ lớp thường với lớp chọn này cũng phải chạy lên tầng 3 để chơi', sender: 'them', time: '21:50' },
        { id: 'm2', text: 'lrồng vui phết đấy', sender: 'me', time: '21:52', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=400' },
        { id: 'm3', text: 'hồi ý đánh chén ác vì đều party nướng khoai', sender: 'me', time: '21:55' },
        { id: 'm4', text: 'vẫn còn cái ảnh báo đỏ c3', sender: 'me', time: '22:00' },
        { id: 'm5', text: 'Tao hồi í chưa có đi làm j có ảnh', sender: 'them', time: '22:02' },
        { id: 'm6', text: 'trc thi cấp 3 xong chia con mẹ lớp thường với lớp chọn ngày nào cũng phải chạy lên tầng 3 để chơi', sender: 'me', time: '22:05' },
        { id: 'm7', text: 'bọn lớp chọn khó chơi về điều khôn nhỉ chó', sender: 'me', time: '22:06' },
    ],
    c4: [
        { id: 'm1', text: 'Hey! Mình muốn hỏi về cái laptop bạn đăng bán', sender: 'them', time: '21:50' },
        { id: 'm2', text: 'Chào bạn, laptop vẫn còn nha!', sender: 'me', time: '21:52' },
        { id: 'm3', text: 'Bạn thấy sao?', sender: 'them', time: '21:55', image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=400' },
        { id: 'm4', text: 'Máy đẹp quá! Giá bao nhiêu vậy bạn?', sender: 'them', time: '22:00' },
        { id: 'm5', text: '28 triệu bạn nhé, còn bảo hành 10 tháng', sender: 'me', time: '22:00' },
        { id: 'm6', text: 'Hello bạn!', sender: 'them', time: '22:00' },
    ],
    c3: [
        { id: 'm1', text: 'Bạn ơi hôm nay đi cafe không?', sender: 'them', time: '09:00' },
        { id: 'm2', text: 'Uk', sender: 'me', time: '09:30' },
    ],
};

/* ════════ MAIN PAGE ════════ */
export default function Messages() {
    const [selectedChat, setSelectedChat] = useState(MOCK_CONVERSATIONS[0]);
    const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [inputText, setInputText] = useState('');
    const [chatMessages, setChatMessages] = useState(MOCK_MESSAGES.c1 || []);
    const messagesEndRef = useRef(null);

    const tabs = [
        { key: 'all', label: 'Tất cả' },
        { key: 'unread', label: 'Chưa đọc' },
        { key: 'groups', label: 'Nhóm' },
    ];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [chatMessages]);

    const filteredConvs = searchQuery.trim()
        ? conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : conversations;

    const handleSelectChat = (conv) => {
        setSelectedChat(conv);
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
        setChatMessages(MOCK_MESSAGES[conv.id] || [
            { id: 'start', text: 'Bắt đầu cuộc trò chuyện! 👋', sender: 'system', time: '' }
        ]);
    };

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
        <div className="messages-page">

            {/* ═══ LEFT — Chat List ═══ */}
            <div className="msg-list-panel">
                <div className="msg-list-header">
                    <h2>Đoạn chat</h2>
                    <div className="msg-list-header-actions">
                        <button className="msg-icon-btn" aria-label="More"><MoreHorizontal size={16} /></button>
                        <button className="msg-icon-btn" aria-label="New chat"><Edit3 size={15} /></button>
                    </div>
                </div>

                <div className="msg-list-search">
                    <Search size={15} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm trên Messenger"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

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

                <div className="msg-list-conversations">
                    {filteredConvs.map(conv => (
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
                                <div className="msg-conv-last">{conv.lastMsg} · {conv.time}</div>
                            </div>
                            <div className="msg-conv-right">
                                {conv.unread > 0 && <span className="msg-conv-badge">{conv.unread}</span>}
                            </div>
                        </button>
                    ))}
                </div>
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
                                <button className="msg-detail-action-btn"><Phone size={18} /></button>
                                <button className="msg-detail-action-btn"><Video size={18} /></button>
                                <button className="msg-detail-action-btn"><Info size={18} /></button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="msg-detail-messages">
                            {chatMessages.map(msg => (
                                <div key={msg.id} className={`msg-bubble-row ${msg.sender === 'me' ? 'mine' : 'theirs'}`}>
                                    <div>
                                        {msg.image && <img className="msg-bubble-img" src={msg.image} alt="" />}
                                        <div className="msg-bubble">{msg.text}</div>
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
        </div>
    );
}
