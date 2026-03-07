import { useState } from 'react';
import {
    Search, Users, Mail, Clock, UserPlus, UserCheck, UserX,
    ArrowLeft, Check, X as XIcon, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AddFriends.css';

/* ════════ COVER IMAGES ════════ */
const COVERS = [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=600',
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=600',
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=600',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600',
    'https://images.unsplash.com/photo-1506869640319-fe1a24fd76cb?q=80&w=600',
];

/* ════════ MOCK DATA ════════ */
const MOCK_SUGGESTIONS = [
    { id: 's1', name: 'Nguyễn Văn An', avatar: 'https://i.pravatar.cc/150?img=11', mutual: 5, school: 'ĐH Bách Khoa', status: null },
    { id: 's2', name: 'Trần Thị Bình', avatar: 'https://i.pravatar.cc/150?img=5', mutual: 3, school: 'ĐH Kinh Tế', status: null },
    { id: 's3', name: 'Lê Minh Châu', avatar: 'https://i.pravatar.cc/150?img=12', mutual: 8, school: 'ĐH Sư Phạm', status: null },
    { id: 's4', name: 'Phạm Đức Dũng', avatar: 'https://i.pravatar.cc/150?img=33', mutual: 2, school: 'ĐH Công Nghệ', status: null },
    { id: 's5', name: 'Hoàng Thu Hà', avatar: 'https://i.pravatar.cc/150?img=44', mutual: 1, school: 'ĐH Ngoại Thương', status: null },
    { id: 's6', name: 'Đỗ Quang Huy', avatar: 'https://i.pravatar.cc/150?img=55', mutual: 4, school: 'ĐH Bách Khoa', status: null },
    { id: 's7', name: 'Vương Thị Lan', avatar: 'https://i.pravatar.cc/150?img=9', mutual: 6, school: 'ĐH KHTN', status: null },
    { id: 's8', name: 'Trịnh Quốc Bảo', avatar: 'https://i.pravatar.cc/150?img=68', mutual: 3, school: 'ĐH Luật', status: null },
];

const MOCK_REQUESTS = [
    { id: 'r1', name: 'Vũ Thị Mai', avatar: 'https://i.pravatar.cc/150?img=21', school: 'ĐH Y Hà Nội', hometown: 'Nam Định' },
    { id: 'r2', name: 'Bùi Thanh Sơn', avatar: 'https://i.pravatar.cc/150?img=17', school: 'ĐH FPT', hometown: 'Nghệ An' },
    { id: 'r3', name: 'Ngô Thùy Linh', avatar: 'https://i.pravatar.cc/150?img=25', school: 'ĐH Ngoại Ngữ', hometown: 'Thanh Hóa' },
];

const MOCK_SENT = [
    { id: 'st1', name: 'Đinh Công Minh', avatar: 'https://i.pravatar.cc/150?img=60', school: 'ĐH Giao Thông', hometown: 'Bắc Ninh' },
    { id: 'st2', name: 'Lý Thị Ngọc', avatar: 'https://i.pravatar.cc/150?img=47', school: 'ĐH Mỹ Thuật', hometown: 'Quảng Ninh' },
];

/* ════════ SUB-COMPONENTS ════════ */

function TabBar({ activeTab, onTabChange, requestCount, sentCount }) {
    const tabs = [
        { key: 'suggestions', label: 'Gợi ý', Icon: Users },
        { key: 'requests', label: 'Lời mời', Icon: Mail, count: requestCount },
        { key: 'sent', label: 'Đã gửi', Icon: Clock, count: sentCount },
    ];

    return (
        <div className="af-tabs">
            {tabs.map(({ key, label, Icon, count }) => (
                <button
                    key={key}
                    className={`af-tab ${activeTab === key ? 'active' : ''}`}
                    onClick={() => onTabChange(key)}
                >
                    <span className="af-tab-icon">
                        <Icon size={18} strokeWidth={2} />
                        {count > 0 && <span className="af-tab-badge">{count}</span>}
                    </span>
                    <span className="af-tab-text">{label}</span>
                </button>
            ))}
        </div>
    );
}

/* ── Suggestion Card (Grid) ── */
function SuggestionCard({ user, coverIndex, onAdd }) {
    let actionBtn;
    if (user.status === 'sent') {
        actionBtn = (
            <span className="af-btn af-btn-sent">
                <Check size={14} /> Đã gửi
            </span>
        );
    } else if (user.status === 'friend') {
        actionBtn = (
            <span className="af-btn af-btn-friend">
                <UserCheck size={14} /> Bạn bè
            </span>
        );
    } else {
        actionBtn = (
            <button className="af-btn af-btn-primary" onClick={(e) => { e.stopPropagation(); onAdd(user.id); }}>
                <UserPlus size={14} /> Kết bạn
            </button>
        );
    }

    return (
        <div className="af-suggestion-card">
            <div className="af-card-cover">
                <img src={COVERS[coverIndex % COVERS.length]} alt="" />
                <div className="af-card-avatar-wrap">
                    <img className="af-card-avatar" src={user.avatar} alt={user.name} />
                </div>
            </div>
            <div className="af-card-body">
                <div className="af-card-name">{user.name}</div>
                {user.mutual > 0 && (
                    <div className="af-card-mutual">
                        <Heart size={11} fill="#7f001f" />
                        {user.mutual} bạn chung
                    </div>
                )}
                <div className="af-card-actions">
                    {actionBtn}
                </div>
            </div>
        </div>
    );
}

/* ── Request Card (List) ── */
function RequestCard({ user, onAccept, onDecline }) {
    return (
        <div className="af-user-card">
            <img className="af-list-avatar" src={user.avatar} alt={user.name} />
            <div className="af-user-info">
                <div className="af-user-name">{user.name}</div>
                <div className="af-user-subtitle">Lời mời kết bạn</div>
                {user.school && <div className="af-user-detail">🎓 {user.school}</div>}
                {user.hometown && <div className="af-user-detail">📍 {user.hometown}</div>}
            </div>
            <div className="af-list-actions">
                <button className="af-btn af-btn-secondary af-list-btn" onClick={() => onDecline(user.id)}>
                    Từ chối
                </button>
                <button className="af-btn af-btn-primary af-list-btn" onClick={() => onAccept(user.id)}>
                    Đồng ý
                </button>
            </div>
        </div>
    );
}

/* ── Sent Card (List) ── */
function SentCard({ user, onCancel }) {
    return (
        <div className="af-user-card">
            <img className="af-list-avatar" src={user.avatar} alt={user.name} />
            <div className="af-user-info">
                <div className="af-user-name">{user.name}</div>
                <div className="af-user-subtitle">Đã gửi lời mời</div>
                {user.school && <div className="af-user-detail">🎓 {user.school}</div>}
                {user.hometown && <div className="af-user-detail">📍 {user.hometown}</div>}
            </div>
            <div className="af-list-actions">
                <button className="af-btn af-btn-danger af-list-btn" onClick={() => onCancel(user.id)}>
                    Hủy lời mời
                </button>
            </div>
        </div>
    );
}

/* ── Empty State ── */
function EmptyState({ activeTab, hasSearch }) {
    let icon, title, subtitle;

    if (hasSearch) {
        icon = <Search size={48} strokeWidth={1.5} />;
        title = 'Không tìm thấy ai';
        subtitle = 'Hãy thử tìm kiếm với từ khóa khác nhé';
    } else if (activeTab === 'requests') {
        icon = <Mail size={48} strokeWidth={1.5} />;
        title = 'Chưa có lời mời nào';
        subtitle = 'Khi có ai gửi lời mời kết bạn, bạn sẽ thấy ở đây';
    } else if (activeTab === 'sent') {
        icon = <Clock size={48} strokeWidth={1.5} />;
        title = 'Chưa gửi lời mời nào';
        subtitle = 'Hãy khám phá tab Gợi ý để tìm bạn bè mới!';
    } else {
        icon = <Users size={48} strokeWidth={1.5} />;
        title = 'Không có gợi ý nào';
        subtitle = 'Dùng thanh tìm kiếm để tìm bạn bè';
    }

    return (
        <div className="af-empty">
            <div className="af-empty-icon-wrap">{icon}</div>
            <div className="af-empty-title">{title}</div>
            <div className="af-empty-subtitle">{subtitle}</div>
        </div>
    );
}

/* ════════ MAIN PAGE ════════ */
export default function AddFriends() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('suggestions');
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState(MOCK_SUGGESTIONS);
    const [requests, setRequests] = useState(MOCK_REQUESTS);
    const [sentRequests, setSentRequests] = useState(MOCK_SENT);

    /* ── Handlers ── */
    const handleAddFriend = (userId) => {
        setSuggestions(prev => prev.map(u => u.id === userId ? { ...u, status: 'sent' } : u));
        const user = suggestions.find(u => u.id === userId);
        if (user) setSentRequests(prev => [...prev, { ...user }]);
    };

    const handleAccept = (userId) => {
        setRequests(prev => prev.filter(u => u.id !== userId));
    };

    const handleDecline = (userId) => {
        setRequests(prev => prev.filter(u => u.id !== userId));
    };

    const handleCancelSent = (userId) => {
        setSentRequests(prev => prev.filter(u => u.id !== userId));
        setSuggestions(prev => prev.map(u => u.id === userId ? { ...u, status: null } : u));
    };

    /* ── Filtered ── */
    const filteredSuggestions = searchQuery.trim()
        ? suggestions.filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.school && u.school.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : suggestions;

    return (
        <div className="addfriends-page">

            {/* ── Hero Header ── */}
            <div className="af-hero">
                <div className="af-hero-top">
                    <button className="af-back-btn" onClick={() => navigate(-1)} aria-label="Quay lại">
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <h1 className="af-hero-title">Thêm bạn bè</h1>
                </div>
                <p className="af-hero-subtitle">Kết nối với bạn bè sinh viên gần bạn ✨</p>

                {/* Search — inside hero on suggestions tab */}
                {activeTab === 'suggestions' && (
                    <div className="af-search-wrap">
                        <div className="af-search-bar">
                            <Search size={18} strokeWidth={2} />
                            <input
                                type="text"
                                className="af-search-input"
                                placeholder="Tìm bạn bè theo tên, trường..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="addfriends-inner">

                {/* Tab Bar */}
                <TabBar
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    requestCount={requests.length}
                    sentCount={sentRequests.length}
                />

                {/* ── Content ── */}

                {/* Suggestions Tab — Grid */}
                {activeTab === 'suggestions' && (
                    filteredSuggestions.length === 0
                        ? <EmptyState activeTab="suggestions" hasSearch={!!searchQuery.trim()} />
                        : <>
                            <div className="af-section-title">
                                {searchQuery.trim() ? `Kết quả cho "${searchQuery}"` : 'Những người bạn có thể biết'}
                            </div>
                            <div className="af-suggestions-grid">
                                {filteredSuggestions.map((user, i) => (
                                    <SuggestionCard key={user.id} user={user} coverIndex={i} onAdd={handleAddFriend} />
                                ))}
                            </div>
                        </>
                )}

                {/* Requests Tab — List */}
                {activeTab === 'requests' && (
                    requests.length === 0
                        ? <EmptyState activeTab="requests" />
                        : <>
                            <div className="af-section-title">Lời mời kết bạn ({requests.length})</div>
                            <div className="af-card-list">
                                {requests.map(user => (
                                    <RequestCard key={user.id} user={user} onAccept={handleAccept} onDecline={handleDecline} />
                                ))}
                            </div>
                        </>
                )}

                {/* Sent Tab — List */}
                {activeTab === 'sent' && (
                    sentRequests.length === 0
                        ? <EmptyState activeTab="sent" />
                        : <>
                            <div className="af-section-title">Đã gửi lời mời ({sentRequests.length})</div>
                            <div className="af-card-list">
                                {sentRequests.map(user => (
                                    <SentCard key={user.id} user={user} onCancel={handleCancelSent} />
                                ))}
                            </div>
                        </>
                )}

            </div>
        </div>
    );
}
