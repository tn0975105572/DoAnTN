import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home as HomeIcon, Map, UserPlus, MessageCircle, Bell, Settings,
    Search, Heart, MessageSquare, Share2, Send, MoreHorizontal,
    Image, Tag, Smile, Video, Plus, Bookmark, TrendingUp, Star,
    ShoppingBag, Zap, Shield, MapPin, Clock, ChevronRight, ChevronDown,
    Tv, Shirt, Car, Sofa, Smartphone, Camera, BookOpen, Headphones, Wrench, Gift,
    X, Copy, Check
} from 'lucide-react';
import './Home.css';

/* ════════ HERO BANNER COMPONENT ════════ */
const HERO_CATEGORIES = [
    { icon: Smartphone, label: 'Điện tử', color: '#3b82f6' },
    { icon: BookOpen, label: 'Sách vở', color: '#8b5cf6' },
    { icon: Shirt, label: 'Thời trang', color: '#ec4899' },
    { icon: Car, label: 'Xe cộ', color: '#10b981' },
    { icon: Sofa, label: 'Nội thất', color: '#f59e0b' },
    { icon: Headphones, label: 'Phụ kiện', color: '#06b6d4' },
    { icon: Camera, label: 'Máy ảnh', color: '#ef4444' },
    { icon: Wrench, label: 'Đồ dùng', color: '#64748b' },
    { icon: Gift, label: 'Khác', color: '#a855f7' },
];

const SEARCH_CATEGORIES = [
    'Tất cả danh mục', 'Điện tử', 'Sách vở', 'Thời trang',
    'Xe cộ', 'Nội thất', 'Phụ kiện', 'Máy ảnh', 'Đồ dùng',
];

function HeroBanner() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả danh mục');
    const [showCatDropdown, setShowCatDropdown] = useState(false);
    const dropdownRef = useRef(null);

    return (
        <section className="hero-banner">
            {/* ── Background Decorations ── */}
            <div className="hero-bg-shapes">
                <div className="hero-shape hero-shape-1" />
                <div className="hero-shape hero-shape-2" />
                <div className="hero-shape hero-shape-3" />
                <div className="hero-circle hero-circle-1" />
                <div className="hero-circle hero-circle-2" />
            </div>

            {/* ── Decoration Image (bên phải) ── */}
            <img
                src="https://cdn.chotot.com/admincentre/HEWoXUx8yC979hplnGnmAVeX9IjCJi9yW4b4-uiJL2U/preset:raw/plain/1dfe28b43aaf537a0ddac4776847c3e9-2970771132313733247.jpg"
                alt="Mascot"
                className="hero-deco-img"
            />

            {/* ── Content ── */}
            <div className="hero-content">
                <h1 className="hero-slogan">
                    Chợ sinh viên, <span className="hero-highlight">gần bạn</span>, chốt nhanh!
                </h1>
                <p className="hero-sub">Mua bán đồ cũ dễ dàng, an toàn giữa sinh viên với nhau 🎓</p>

                {/* ── Search Bar ── */}
                <div className="hero-search-bar">
                    {/* Category Dropdown */}
                    <div className="hero-cat-dropdown" ref={dropdownRef}>
                        <button
                            className="hero-cat-btn"
                            onClick={() => setShowCatDropdown(!showCatDropdown)}
                        >
                            <span>{selectedCategory}</span>
                            <ChevronDown size={14} strokeWidth={2.5} />
                        </button>
                        {showCatDropdown && (
                            <div className="hero-cat-menu">
                                {SEARCH_CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        className={`hero-cat-option ${cat === selectedCategory ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setShowCatDropdown(false);
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="hero-search-divider" />

                    {/* Search Input */}
                    <div className="hero-search-input-wrap">
                        <Search size={18} strokeWidth={2} className="hero-search-icon" />
                        <input
                            type="text"
                            className="hero-search-input"
                            placeholder="Tìm sản phẩm bạn cần..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Location */}
                    <div className="hero-search-divider" />
                    <button className="hero-location-btn">
                        <MapPin size={16} strokeWidth={2} />
                        <span>Toàn quốc</span>
                        <ChevronDown size={13} strokeWidth={2.5} />
                    </button>

                    {/* Search Button */}
                    <button className="hero-search-submit">
                        <Search size={18} strokeWidth={2.5} />
                        <span>Tìm kiếm</span>
                    </button>
                </div>

                {/* ── Quick Categories ── */}
                <div className="hero-quick-cats">
                    {HERO_CATEGORIES.map(({ icon: Icon, label, color }) => (
                        <button key={label} className="hero-quick-cat">
                            <span className="hero-quick-cat-icon" style={{ background: color + '20', color }}>
                                <Icon size={20} strokeWidth={2} />
                            </span>
                            <span className="hero-quick-cat-label">{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ════════ DATA ════════ */
const STORIES = [
    { id: 1, isAdd: true, img: 'https://images.unsplash.com/photo-1579626343210-9b6d611f8b33?q=80&w=400', name: 'Thêm Tin' },
    { id: 2, name: 'Alexfin', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400', avatar: 'https://i.pravatar.cc/60?img=1' },
    { id: 3, name: 'Harinax', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400', avatar: 'https://i.pravatar.cc/60?img=2' },
    { id: 4, name: 'Sonix', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400', avatar: 'https://i.pravatar.cc/60?img=3' },
    { id: 5, name: 'Mia', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400', avatar: 'https://i.pravatar.cc/60?img=4' },
    { id: 6, name: 'Lucas', img: 'https://images.unsplash.com/photo-1489980557514-251d61e3eeb6?q=80&w=400', avatar: 'https://i.pravatar.cc/60?img=5' },
];

const NAV_ITEMS = [
    { icon: HomeIcon, label: 'Trang chủ', active: true, path: '/' },
    { icon: Map, label: 'Bản đồ' },
    { icon: UserPlus, label: 'Thêm bạn', path: '/add-friends' },
    { icon: MessageCircle, label: 'Tin nhắn', badge: 3, path: '/messages' },
    { icon: Bell, label: 'Thông báo', badge: 12, path: '/notifications' },
    { icon: Settings, label: 'Cài đặt', path: '/settings' },
];

const CATEGORIES = [
    { icon: Smartphone, label: 'Điện tử', color: '#3b82f6' },
    { icon: Shirt, label: 'Thời trang', color: '#ec4899' },
    { icon: ShoppingBag, label: 'Bất động sản', color: '#f59e0b' },
    { icon: Car, label: 'Xe cộ', color: '#10b981' },
    { icon: Sofa, label: 'Nội thất', color: '#8b5cf6' },
    { icon: Camera, label: 'Máy ảnh', color: '#ef4444' },
];

const STATS = [
    { icon: ShoppingBag, label: 'Bài đăng', value: '12,843', color: '#7f001f' },
    { icon: UserPlus, label: 'Người dùng', value: '4,219', color: '#3b82f6' },
    { icon: Zap, label: 'Giao dịch', value: '2,651', color: '#f59e0b' },
    { icon: Shield, label: 'Đã xác thực', value: '98%', color: '#10b981' },
];

const MOCK_POSTS = [
    {
        id: '1', author: 'Nguyễn Minh Tuấn', avatar: 'https://i.pravatar.cc/150?img=11',
        time: '2 giờ trước', location: 'Hà Nội', verified: true,
        title: 'Laptop Dell XPS 15 2023 — Cần bán gấp',
        desc: 'Laptop Dell XPS 15 2023, còn bảo hành 10 tháng, tình trạng 99%, chưa sửa chữa. Cấu hình: Core i7-12700H, RAM 16GB, SSD 512GB, màn 4K OLED. Lý do bán: chuyển sang dùng MacBook.',
        price: '28,000,000', category: 'Điện tử', categoryColor: '#3b82f6',
        img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=900',
        likes: 142, comments: 38,
    },
    {
        id: '2', author: 'Trần Thu Hà', avatar: 'https://i.pravatar.cc/150?img=5',
        time: '5 giờ trước', location: 'TP.HCM', verified: false,
        title: 'iPhone 14 Pro Max 256GB Deep Purple — Fullbox',
        desc: 'Điện thoại còn fullbox, mua tháng 3/2024, ít dùng, pin 98%, không trầy xước. Có kèm ốp lưng Apple Silicone và cường lực gốc. Thương lượng với người thiện chí.',
        price: '22,500,000', category: 'Điện tử', categoryColor: '#3b82f6',
        img: 'https://images.unsplash.com/photo-1681134395546-a0e04ff8e5c3?q=80&w=900',
        likes: 95, comments: 21,
    },
    {
        id: '3', author: 'Lê Văn Đức', avatar: 'https://i.pravatar.cc/150?img=17',
        time: '1 ngày trước', location: 'Đà Nẵng', verified: true,
        title: 'Xe đạp thể thao Giant ATX 830 — Như mới',
        desc: 'Xe đạp địa hình Giant ATX 830, màu xanh dương, đã đi khoảng 500km. Còn mới, đầy đủ phụ kiện, bảo dưỡng định kỳ. Kèm mũ bảo hiểm và bộ bơm xe.',
        price: '5,200,000', category: 'Xe cộ', categoryColor: '#10b981',
        img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=900',
        likes: 67, comments: 12,
    },
];

const PEOPLE_MAY_KNOW = [
    { id: 1, name: 'Cooper George', mutual: 2, avatar: 'https://i.pravatar.cc/150?img=33', verified: true },
    { id: 2, name: 'Terry Bator', mutual: 5, avatar: 'https://i.pravatar.cc/150?img=44', verified: false },
    { id: 3, name: 'Skylar Affhoff', mutual: 3, avatar: 'https://i.pravatar.cc/150?img=55', verified: true },
];

const TRENDING = [
    { tag: '#ĐiệnTử', count: '2.4K bài' },
    { tag: '#XeCũ', count: '1.8K bài' },
    { tag: '#ThờiTrang', count: '934 bài' },
    { tag: '#NộiThất', count: '722 bài' },
    { tag: '#MáyẢnh', count: '541 bài' },
];

const FILTERS = ['Tất cả', 'Điện tử', 'Thời trang', 'Xe cộ', 'Nội thất', 'Bất động sản'];

/* ════════ SHARE MODAL COMPONENT ════════ */
function ShareModal({ post, onClose }) {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/post/${post.id}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const shareOptions = [
        {
            label: 'Facebook',
            icon: (
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.43 23.09 10.12 24v-8.44H7.08v-3.49h3.04V9.41c0-3 1.78-4.66 4.52-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87v2.24h3.32l-.53 3.49h-2.79V24C19.57 23.09 24 18.1 24 12.07z" fill="#1877F2" />
                    <path d="M16.47 15.56l.53-3.49h-3.32V9.83c0-.95.46-1.87 1.95-1.87h1.51V5.01s-1.37-.23-2.68-.23c-2.74 0-4.52 1.66-4.52 4.66v2.66H7.08v3.49h3.04V24c.6.09 1.21.14 1.83.14.63 0 1.24-.05 1.84-.14v-8.44h2.79z" fill="#fff" />
                </svg>
            ),
            onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
        },
        {
            label: 'Zalo',
            icon: (
                <svg viewBox="0 0 40 40" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="40" height="40" rx="10" fill="#0068FF" />
                    <path d="M26.2 27.5H13.8C11.7 27.5 10 25.8 10 23.7V11.3C10 9.2 11.7 7.5 13.8 7.5H26.2C28.3 7.5 30 9.2 30 11.3V23.7C30 25.8 28.3 27.5 26.2 27.5Z" fill="white" />
                    <path d="M14.5 12.5H23.5V14.5H16.5L23.5 21.5V23.5H14.5V21.5H21.5L14.5 14.5V12.5Z" fill="#0068FF" />
                </svg>
            ),
            onClick: () => window.open(`https://zalo.me/share?url=${encodeURIComponent(shareUrl)}`, '_blank')
        },
        {
            label: 'Twitter / X',
            icon: (
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            onClick: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank')
        }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="share-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />
                <div className="modal-header">
                    <h3 className="modal-title">Chia sẻ bài viết</h3>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="share-link-section">
                    <div className="share-link-box">
                        <span className="share-link-text">{shareUrl}</span>
                        <button className={`copy-link-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                    </div>
                </div>

                <div className="share-options">
                    {shareOptions.map(opt => (
                        <button key={opt.label} className="share-option-btn" onClick={opt.onClick}>
                            <div className="share-option-icon">{opt.icon}</div>
                            <span className="share-option-label">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ════════ MESSAGE MODAL COMPONENT ════════ */
const MOCK_FRIENDS = [
    { id: 1, name: 'Nguyễn Văn A', avatar: 'https://i.pravatar.cc/100?img=1' },
    { id: 2, name: 'Trần Thị B', avatar: 'https://i.pravatar.cc/100?img=2' },
    { id: 3, name: 'Lê Văn C', avatar: 'https://i.pravatar.cc/100?img=3' },
    { id: 4, name: 'Phạm Thị D', avatar: 'https://i.pravatar.cc/100?img=4' },
    { id: 5, name: 'Hoàng Văn E', avatar: 'https://i.pravatar.cc/100?img=5' },
];

function MessageModal({ post, onClose }) {
    const [view, setView] = useState('selection'); // 'selection', 'direct', 'friends'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const filteredFriends = MOCK_FRIENDS.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleFriend = (id) => {
        setSelectedFriends(prev =>
            prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
        );
    };

    const handleSend = () => {
        if (view === 'friends' && selectedFriends.length === 0) return;
        setIsSending(true);
        // Simulate sending
        setTimeout(() => {
            setIsSending(false);
            onClose();
        }, 1500);
    };

    const renderContent = () => {
        if (view === 'selection') {
            return (
                <div className="message-selection-view">
                    <p className="selection-subtitle">Chọn phương thức liên hệ</p>
                    <button className="selection-btn" onClick={() => setView('direct')}>
                        <div className="selection-icon-wrap owner">
                            <Send size={20} />
                        </div>
                        <div className="selection-info">
                            <span className="selection-label">Nhắn tin với chủ sở hữu</span>
                            <span className="selection-desc">Liên hệ trực tiếp với người đăng bài</span>
                        </div>
                        <ChevronRight size={18} color="#aaa" />
                    </button>
                    <button className="selection-btn" onClick={() => setView('friends')}>
                        <div className="selection-icon-wrap friends">
                            <Check size={20} />
                        </div>
                        <div className="selection-info">
                            <span className="selection-label">Gửi cho bạn bè</span>
                            <span className="selection-desc">Chia sẻ bài viết này với bạn bè của bạn</span>
                        </div>
                        <ChevronRight size={18} color="#aaa" />
                    </button>
                </div>
            );
        }

        return (
            <>
                <div className="message-post-preview">
                    <img src={post.img} alt={post.title} className="msg-preview-img" />
                    <div className="msg-preview-info">
                        <span className="msg-preview-title">{post.title}</span>
                        <span className="msg-preview-price">{post.price} ₫</span>
                    </div>
                </div>

                <div className="message-input-section">
                    <textarea
                        className="message-textarea"
                        placeholder={view === 'direct' ? "Nhập tin nhắn cho người bán..." : "Thêm tin nhắn..."}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                    />
                </div>

                {view === 'friends' && (
                    <>
                        <div className="friends-search">
                            <Search size={16} color="#aaa" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm bạn bè..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="friends-list">
                            {filteredFriends.map(friend => (
                                <div
                                    key={friend.id}
                                    className={`friend-item ${selectedFriends.includes(friend.id) ? 'selected' : ''}`}
                                    onClick={() => toggleFriend(friend.id)}
                                >
                                    <img src={friend.avatar} alt={friend.name} className="friend-avatar" />
                                    <span className="friend-name">{friend.name}</span>
                                    <div className="friend-checkbox">
                                        {selectedFriends.includes(friend.id) && <Check size={12} strokeWidth={3} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div className="message-footer">
                    <button
                        className="send-message-btn"
                        disabled={(view === 'friends' && selectedFriends.length === 0) || isSending}
                        onClick={handleSend}
                    >
                        {isSending ? 'Đang gửi...' : view === 'direct' ? 'Gửi cho chủ bài đăng' : `Gửi cho ${selectedFriends.length} bạn bè`}
                    </button>
                    <button className="back-btn" onClick={() => setView('selection')}>Quay lại</button>
                </div>
            </>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="message-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{view === 'selection' ? 'Nhắn tin' : view === 'direct' ? 'Liên hệ chủ bài' : 'Gửi cho bạn bè'}</h3>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
}

/* ════════ SUB-COMPONENTS ════════ */

function PostCard({ post, onCommentClick, onShareClick, onMessageClick }) {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes);
    const [saved, setSaved] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const isLong = post.desc.length > 130;

    const handleLike = () => {
        setLiked(!liked);
        setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    };

    return (
        <article className="post-card">
            {/* Header */}
            <div className="post-header">
                <div className="post-author-wrap">
                    <div className="post-avatar-wrap">
                        <img src={post.avatar} alt={post.author} className="post-avatar" />
                        {post.verified && <span className="verified-badge">✓</span>}
                    </div>
                    <div className="post-meta">
                        <div className="post-author-row">
                            <span className="post-author">{post.author}</span>
                            <span
                                className="post-category-tag"
                                style={{ background: post.categoryColor + '18', color: post.categoryColor, borderColor: post.categoryColor + '40' }}
                            >
                                {post.category}
                            </span>
                        </div>
                        <div className="post-time-loc">
                            <Clock size={11} strokeWidth={2} />
                            <span>{post.time}</span>
                            <span className="separator">·</span>
                            <MapPin size={11} strokeWidth={2} />
                            <span>{post.location}</span>
                        </div>
                    </div>
                </div>
                <div className="post-header-actions">
                    <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={() => setSaved(!saved)} aria-label="Lưu">
                        <Bookmark size={18} fill={saved ? '#7f001f' : 'none'} strokeWidth={2} />
                    </button>
                    <button className="more-btn" aria-label="Thêm">
                        <MoreHorizontal size={20} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* Title & Price */}
            <div className="post-title-row">
                <h3 className="post-title">{post.title}</h3>
                <div className="post-price-badge">{post.price} ₫</div>
            </div>

            {/* Description */}
            <p className={`post-desc ${expanded ? 'expanded' : ''}`}>
                {expanded || !isLong ? post.desc : post.desc.slice(0, 130) + '...'}
            </p>
            {isLong && (
                <button className="btn-expand" onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Thu gọn ↑' : 'Xem thêm →'}
                </button>
            )}

            {/* Image */}
            <div className="post-img-wrap">
                <img src={post.img} alt={post.title} className="post-img" loading="lazy" />
                <div className="post-img-overlay">
                    <span className="img-overlay-price">{post.price} VNĐ</span>
                </div>
            </div>

            {/* Stats */}
            <div className="post-stats">
                <span className="stat-item">
                    <Heart size={13} fill={liked ? '#7f001f' : 'none'} color={liked ? '#7f001f' : '#aaa'} />
                    {likeCount.toLocaleString()} thích
                </span>
                <span className="stat-item">
                    <MessageSquare size={13} color="#aaa" />
                    {post.comments} bình luận
                </span>
            </div>

            <div className="post-divider" />

            {/* Actions */}
            <div className="post-actions">
                <button className={`action-btn ${liked ? 'action-liked' : ''}`} onClick={handleLike}>
                    <Heart size={17} fill={liked ? '#7f001f' : 'none'} strokeWidth={2} />
                    <span>{liked ? 'Đã thích' : 'Thích'}</span>
                </button>
                <button type="button" className="action-btn" onClick={() => onCommentClick?.(post)}>
                    <MessageSquare size={17} strokeWidth={2} />
                    <span>Bình luận</span>
                </button>
                <button type="button" className="action-btn" onClick={() => onShareClick?.(post)}>
                    <Share2 size={17} strokeWidth={2} />
                    <span>Chia sẻ</span>
                </button>
                <button type="button" className="action-btn action-primary" onClick={() => onMessageClick?.(post)}>
                    <Send size={17} strokeWidth={2} />
                    <span>Nhắn tin</span>
                </button>
            </div>
        </article>
    );
}

/* ════════ MAIN PAGE ════════ */
export default function Home() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('news');
    const [activeFilter, setActiveFilter] = useState('Tất cả');
    const [searchFocused, setSearchFocused] = useState(false);
    const [sharePost, setSharePost] = useState(null);
    const [messagePost, setMessagePost] = useState(null);

    return (
        <div className="home-page">

            {/* ─── HERO BANNER (Chợ Tốt style) ─── */}
            <HeroBanner />

            {/* ─── LEFT SIDEBAR ─── */}
            <aside className="sidebar-left">
                {/* Search */}
                <div className={`sidebar-search ${searchFocused ? 'focused' : ''}`}>
                    <Search size={15} strokeWidth={2} className="search-icon" />
                    <input
                        type="text" placeholder="Tìm kiếm..."
                        className="search-input"
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                    />
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(({ icon: Icon, label, active, badge, path }) => (
                        <button key={label} className={`nav-item ${active ? 'nav-active' : ''}`} onClick={() => path && navigate(path)}>
                            <span className="nav-icon-wrap">
                                <Icon size={19} strokeWidth={2} />
                                {badge && <span className="nav-badge">{badge}</span>}
                            </span>
                            <span className="nav-label">{label}</span>
                            {active && <span className="nav-active-bar" />}
                        </button>
                    ))}
                </nav>

                {/* Categories */}
                <div className="sidebar-block">
                    <div className="block-header">
                        <span>Danh mục</span>
                        <ChevronRight size={14} strokeWidth={2} className="block-chevron" />
                    </div>
                    <div className="cat-list">
                        {CATEGORIES.map(({ icon: Icon, label, color }) => (
                            <button key={label} className="cat-item">
                                <span className="cat-icon" style={{ background: color + '15', color }}>
                                    <Icon size={15} strokeWidth={2} />
                                </span>
                                <span className="cat-label">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* ─── MAIN FEED ─── */}
            <main className="feed">

                {/* Stats Bar */}
                <div className="stats-bar">
                    {STATS.map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="stat-card">
                            <span className="stat-icon" style={{ background: color + '15', color }}>
                                <Icon size={18} strokeWidth={2} />
                            </span>
                            <div className="stat-info">
                                <span className="stat-value">{value}</span>
                                <span className="stat-label">{label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stories */}
                <div className="stories-section">
                    <div className="section-header">
                        <Tv size={16} strokeWidth={2} color="#7f001f" />
                        <span>Tin mới</span>
                    </div>
                    <div className="stories-row">
                        {STORIES.map(story => (
                            <div key={story.id} className={`story-card ${story.isAdd ? 'story-add' : ''}`}>
                                <div className="story-img-wrap">
                                    <img src={story.img} alt={story.name} className="story-img" />
                                    {story.isAdd ? (
                                        <div className="story-add-layer">
                                            <div className="story-add-btn"><Plus size={22} strokeWidth={2.5} /></div>
                                        </div>
                                    ) : (
                                        <img src={story.avatar} alt={story.name} className="story-avatar-pin" />
                                    )}
                                    {!story.isAdd && <div className="story-gradient" />}
                                </div>
                                <span className="story-name">{story.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Create Post */}
                <div className="create-post">
                    <div className="create-top">
                        <img src="https://i.pravatar.cc/80?img=7" alt="You" className="create-avatar" />
                        <div className="create-fake-input">
                            <span>Bạn muốn bán gì hôm nay? 🛒</span>
                        </div>
                    </div>
                    <div className="create-actions-row">
                        <button className="create-action">
                            <Image size={17} strokeWidth={2} color="#22c55e" />
                            <span>Ảnh / Video</span>
                        </button>
                        <button className="create-action">
                            <Tag size={17} strokeWidth={2} color="#3b82f6" />
                            <span>Tag người</span>
                        </button>
                        <button className="create-action">
                            <Smile size={17} strokeWidth={2} color="#f59e0b" />
                            <span>Cảm xúc</span>
                        </button>
                        <button className="create-action">
                            <Video size={17} strokeWidth={2} color="#ef4444" />
                            <span>Live</span>
                        </button>
                    </div>
                </div>

                {/* Feed Controls */}
                <div className="feed-controls">
                    <div className="tab-group">
                        <button className={`tab-btn ${activeTab === 'news' ? 'tab-active' : ''}`} onClick={() => setActiveTab('news')}>
                            <TrendingUp size={14} strokeWidth={2} />
                            Mới nhất
                        </button>
                        <button className={`tab-btn ${activeTab === 'popular' ? 'tab-active' : ''}`} onClick={() => setActiveTab('popular')}>
                            <Star size={14} strokeWidth={2} />
                            Phổ biến
                        </button>
                    </div>
                    <div className="filter-chips">
                        {FILTERS.map(f => (
                            <button key={f} className={`chip ${activeFilter === f ? 'chip-active' : ''}`} onClick={() => setActiveFilter(f)}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Posts */}
                {MOCK_POSTS.map(p => (
                    <PostCard
                        key={p.id}
                        post={p}
                        onCommentClick={(postData) => navigate(`/post/${postData.id}/comments`, { state: { post: postData } })}
                        onShareClick={(postData) => setSharePost(postData)}
                        onMessageClick={(postData) => setMessagePost(postData)}
                    />
                ))}

                {/* Modals */}
                {sharePost && (
                    <ShareModal
                        post={sharePost}
                        onClose={() => setSharePost(null)}
                    />
                )}
                {messagePost && (
                    <MessageModal
                        post={messagePost}
                        onClose={() => setMessagePost(null)}
                    />
                )}

                <div className="feed-end">
                    <div className="feed-end-icon">🎉</div>
                    <span>Bạn đã xem hết bài viết hôm nay</span>
                </div>
            </main>

            {/* ─── RIGHT SIDEBAR ─── */}
            <aside className="sidebar-right">

                {/* User Mini Card */}
                <div className="user-mini-card">
                    <img src="https://i.pravatar.cc/80?img=7" alt="You" className="user-mini-avatar" />
                    <div className="user-mini-info">
                        <span className="user-mini-name">Bạn</span>
                        <span className="user-mini-sub">Xem hồ sơ →</span>
                    </div>
                </div>

                {/* People You May Know */}
                <div className="widget">
                    <div className="widget-header">
                        <UserPlus size={15} strokeWidth={2} color="#7f001f" />
                        <span className="widget-title">Có thể bạn quen</span>
                    </div>
                    <div className="people-list">
                        {PEOPLE_MAY_KNOW.map(p => (
                            <div key={p.id} className="person-row">
                                <div className="person-avatar-wrap">
                                    <img src={p.avatar} alt={p.name} className="person-avatar" />
                                    {p.verified && <span className="person-verified">✓</span>}
                                </div>
                                <div className="person-info">
                                    <span className="person-name">{p.name}</span>
                                    <span className="person-mutual">
                                        <UserPlus size={10} strokeWidth={2} />
                                        {p.mutual} bạn chung
                                    </span>
                                </div>
                                <div className="person-btns">
                                    <button className="btn-add"><Plus size={14} strokeWidth={2.5} /></button>
                                    <button className="btn-decline">✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="widget-see-all">Xem tất cả <ChevronRight size={13} strokeWidth={2} /></button>
                </div>

                {/* App Download */}
                <div className="app-banner-card">
                    <div className="banner-glow" />
                    <div className="banner-logo">OLODO</div>
                    <p className="banner-tagline">Trải nghiệm đầy đủ trên mobile!</p>
                    <div className="banner-rating">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} fill="#ffd700" color="#ffd700" />
                        ))}
                        <span>4.9 (12K reviews)</span>
                    </div>
                    <div className="banner-btns">
                        <button className="btn-download" type="button" aria-label="Tải trên App Store">
                            {/* Logo Apple (App Store) chính thức */}
                            <svg className="btn-download-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            <span>App Store</span>
                        </button>
                        <button className="btn-download" type="button" aria-label="Tải trên Google Play">
                            <img src="/google-play-logo.png" alt="" width="20" height="20" />
                            <span>Google Play</span>
                        </button>
                    </div>
                </div>

                {/* Trending */}
                <div className="widget">
                    <div className="widget-header">
                        <TrendingUp size={15} strokeWidth={2} color="#7f001f" />
                        <span className="widget-title">Xu hướng</span>
                    </div>
                    <div className="trending-list">
                        {TRENDING.map((t, i) => (
                            <div key={t.tag} className="trend-row">
                                <span className="trend-rank" style={{ color: i < 3 ? '#7f001f' : '#bbb' }}>
                                    #{i + 1}
                                </span>
                                <div className="trend-info">
                                    <span className="trend-tag">{t.tag}</span>
                                    <span className="trend-count">{t.count}</span>
                                </div>
                                <ChevronRight size={13} strokeWidth={2} color="#ddd" />
                            </div>
                        ))}
                    </div>
                </div>

            </aside>
        </div>
    );
}
