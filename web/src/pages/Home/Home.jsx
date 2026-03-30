'use no memo';
import { createElement, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home as HomeIcon, Map as MapIcon, UserPlus, MessageCircle, Bell, Settings,
    Search, Heart, MessageSquare, Share2, Send, MoreHorizontal,
    Image, Tag, Smile, Video, Plus, Bookmark, TrendingUp, Star,
    ShoppingBag, Zap, Shield, MapPin, Clock, ChevronRight, ChevronDown,
    Tv, Shirt, Car, Sofa, Smartphone, Camera, BookOpen, Headphones, Wrench, Gift,
    X, Copy, Check
} from 'lucide-react';
import './Home.css';
import PostMediaGallery from '../../components/post/PostMediaGallery';

const API_BASE = 'http://localhost:3000';
const API_URLS = {
    RECOMMENDATIONS: `${API_BASE}/api/recommendations/`,
    GET_POST_BY_ID: `${API_BASE}/api/baidang/getById/`,
    GET_POST_IMAGE: `${API_BASE}/api/baidang_anh/getById/`,
    GET_USER_INFO: `${API_BASE}/api/nguoidung/get/`,
    LIKE_BY_POST: `${API_BASE}/api/likebaidang/getLikesByPostId/`,
    COMMENT_COUNT_BY_POST: `${API_BASE}/api/binhluanbaidang/getCommentCountByPost/`,
    LIKE_CREATE: `${API_BASE}/api/likebaidang/create`,
    LIKE_DELETE: `${API_BASE}/api/likebaidang/delete/`,
    GET_ALL_WITH_DETAILS: `${API_BASE}/api/baidang/getAllWithDetails`,
    UNREAD_NOTIFICATIONS: `${API_BASE}/api/thongbao/unread/`,
    UNREAD_MESSAGES: `${API_BASE}/api/tinnhan/unread/`,
    PENDING_FRIEND_REQUESTS: `${API_BASE}/api/quanHeBanBe/requests/`,
    FRIEND_SUGGESTIONS: `${API_BASE}/api/quanhebanbe/suggestions/`,
    FRIEND_REQUEST: `${API_BASE}/api/quanhebanbe/request`,
};
const POSTS_PER_CHUNK = 5;
const INITIAL_LOAD_COUNT = 8;
const INITIAL_PAGE_LOADING_MIN_MS = 700;
const VIEW_HISTORY_STORAGE_PREFIX = 'olodo_home_seen_posts_';
const VIEW_HISTORY_LIMIT = 250;
const userInfoCache = new Map();
const postDetailCache = new Map();
const DEFAULT_AVATAR = 'https://i.pravatar.cc/80?u=guest';

// Chuyển bất kỳ URL có IP thành localhost (giữ port & path)
function normalizeUrl(url) {
    if (!url) return url;
    // Khớp http://192.168.x.x:PORT hoặc http://10.x.x.x:PORT, ...
    return url.replace(/^http:\/\/(?!localhost)[\d.]+:(\d+)/, 'http://localhost:$1');
}

function getViewHistoryStorageKey(userId) {
    return `${VIEW_HISTORY_STORAGE_PREFIX}${userId || 'guest'}`;
}

function readPostViewHistory(userId) {
    if (!userId) return {};

    try {
        const raw = localStorage.getItem(getViewHistoryStorageKey(userId));
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writePostViewHistory(userId, history) {
    if (!userId || !history || typeof history !== 'object') return;

    try {
        const trimmedHistory = Object.fromEntries(
            Object.entries(history)
                .sort(([, left], [, right]) => (Number(right?.lastSeenAt) || 0) - (Number(left?.lastSeenAt) || 0))
                .slice(0, VIEW_HISTORY_LIMIT)
        );
        localStorage.setItem(getViewHistoryStorageKey(userId), JSON.stringify(trimmedHistory));
    } catch {
        // Ignore storage failures on restrictive browsers.
    }
}

function getPostViewMeta(viewHistory, postId) {
    const entry = viewHistory?.[String(postId)];
    const count = Number(entry?.count || 0);
    const lastSeenAt = Number(entry?.lastSeenAt || 0);

    return {
        count: Number.isFinite(count) && count > 0 ? count : 0,
        lastSeenAt: Number.isFinite(lastSeenAt) && lastSeenAt > 0 ? lastSeenAt : 0,
    };
}

function compareItemsByViewPriority(left, right) {
    const leftBucket = (left.count > 0 ? 2 : 0) + (left.isFriendPost ? 0 : 1);
    const rightBucket = (right.count > 0 ? 2 : 0) + (right.isFriendPost ? 0 : 1);

    if (leftBucket !== rightBucket) return leftBucket - rightBucket;
    if (left.count !== right.count) return left.count - right.count;
    if (left.lastSeenAt !== right.lastSeenAt) return left.lastSeenAt - right.lastSeenAt;
    if (left.baseScore !== right.baseScore) return right.baseScore - left.baseScore;

    return String(left.id).localeCompare(String(right.id));
}

function sortRecommendationsByViewHistory(recommendations, viewHistory) {
    return [...recommendations].sort((left, right) => compareItemsByViewPriority(
        {
            id: left.ID_BaiDang,
            isFriendPost: !!left.isFriendPost,
            baseScore: Number(left.Score) || 0,
            ...getPostViewMeta(viewHistory, left.ID_BaiDang),
        },
        {
            id: right.ID_BaiDang,
            isFriendPost: !!right.isFriendPost,
            baseScore: Number(right.Score) || 0,
            ...getPostViewMeta(viewHistory, right.ID_BaiDang),
        }
    ));
}

function sortPostsByViewHistory(posts, viewHistory) {
    return [...posts].sort((left, right) => compareItemsByViewPriority(
        {
            id: left.id,
            isFriendPost: !!left.isFriendPost,
            baseScore: Number(left.rawTime) || 0,
            ...getPostViewMeta(viewHistory, left.id),
        },
        {
            id: right.id,
            isFriendPost: !!right.isFriendPost,
            baseScore: Number(right.rawTime) || 0,
            ...getPostViewMeta(viewHistory, right.id),
        }
    ));
}


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
                    {HERO_CATEGORIES.map(({ icon, label, color }) => (
                        <button key={label} className="hero-quick-cat">
                            <span className="hero-quick-cat-icon" style={{ background: color + '20', color }}>
                                {createElement(icon, { size: 20, strokeWidth: 2 })}
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
    { icon: HomeIcon, label: 'Trang chủ', key: 'home', path: '/' },
    { icon: MapIcon, label: 'Bản đồ', key: 'map', path: '/map' },
    { icon: UserPlus, label: 'Thêm bạn', key: 'add-friends', path: '/add-friends' },
    { icon: MessageCircle, label: 'Tin nhắn', key: 'messages', badge: 3, path: '/messages' },
    { icon: Bell, label: 'Thông báo', key: 'notifications', badge: 12, path: '/notifications' },
    { icon: Settings, label: 'Cài đặt', key: 'settings', path: '/settings' },
];

const CATEGORIES = [
    { icon: Smartphone, label: 'Điện tử', color: '#3b82f6' },
    { icon: Shirt, label: 'Thời trang', color: '#ec4899' },
    { icon: ShoppingBag, label: 'Bất động sản', color: '#f59e0b' },
    { icon: Car, label: 'Xe cộ', color: '#10b981' },
    { icon: Sofa, label: 'Nội thất', color: '#8b5cf6' },
    { icon: Camera, label: 'Máy ảnh', color: '#ef4444' },
];

const STATUS_LABELS = {
    dang_ban: 'Đang bán',
    da_ban: 'Đã bán',
    cho_duyet: 'Chờ duyệt',
    het_hang: 'Hết hàng',
};

const STATUS_COLORS = {
    dang_ban: '#10b981',
    da_ban: '#ef4444',
    cho_duyet: '#f59e0b',
    het_hang: '#9ca3af',
};

function normalizePostStatus(status) {
    if (!status) return { label: 'Không rõ', color: '#7f001f' };
    const key = String(status).trim().toLowerCase();
    return {
        label: STATUS_LABELS[key] || status,
        color: STATUS_COLORS[key] || '#7f001f',
    };
}

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
        price: '28,000,000', category: 'Điện tử', categoryColor: '#3b82f6', trang_thai: 'Đang bán', statusColor: '#10b981',
        img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=900',
        likes: 142, comments: 38,
    },
    {
        id: '2', author: 'Trần Thu Hà', avatar: 'https://i.pravatar.cc/150?img=5',
        time: '5 giờ trước', location: 'TP.HCM', verified: false,
        title: 'iPhone 14 Pro Max 256GB Deep Purple — Fullbox',
        desc: 'Điện thoại còn fullbox, mua tháng 3/2024, ít dùng, pin 98%, không trầy xước. Có kèm ốp lưng Apple Silicone và cường lực gốc. Thương lượng với người thiện chí.',
        price: '22,500,000', category: 'Điện tử', categoryColor: '#3b82f6', trang_thai: 'Đang bán', statusColor: '#10b981',
        img: 'https://images.unsplash.com/photo-1681134395546-a0e04ff8e5c3?q=80&w=900',
        likes: 95, comments: 21,
    },
    {
        id: '3', author: 'Lê Văn Đức', avatar: 'https://i.pravatar.cc/150?img=17',
        time: '1 ngày trước', location: 'Đà Nẵng', verified: true,
        title: 'Xe đạp thể thao Giant ATX 830 — Như mới',
        desc: 'Xe đạp địa hình Giant ATX 830, màu xanh dương, đã đi khoảng 500km. Còn mới, đầy đủ phụ kiện, bảo dưỡng định kỳ. Kèm mũ bảo hiểm và bộ bơm xe.',
        price: '5,200,000', category: 'Xe cộ', categoryColor: '#10b981', trang_thai: 'Đang bán', statusColor: '#10b981',
        img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=900',
        likes: 67, comments: 12,
    },
];

const PEOPLE_MAY_KNOW_FALLBACK = [
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

function HomePageLoader() {
    return (
        <div className="home-page-loader" role="status" aria-live="polite">
            <div className="home-page-loader-card">
                <div className="home-page-loader-badge">OLODO</div>
                <h2>Đang tải trang chủ cho bạn</h2>
                <p>
                    Hệ thống đang sắp xếp lại bài đăng và giảm ưu tiên những bài bạn đã xem để feed đỡ lặp hơn.
                </p>
                <div className="home-page-loader-bar" aria-hidden="true">
                    <div className="home-page-loader-bar-fill" />
                </div>
                <div className="home-page-loader-skeleton">
                    <span />
                    <span />
                    <span />
                </div>
            </div>
        </div>
    );
}

/* ════════ LIKE TOOLTIP COMPONENT ════════ */
function LikeTooltip({ postId, show }) {
    const [likers, setLikers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        if (!show || fetched || loading) return;
        const token = localStorage.getItem('token') || '';
        if (!token) return;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch(`${API_URLS.LIKE_BY_POST}${postId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const raw = await res.json();
                const data = Array.isArray(raw) ? raw : (raw?.data ?? []);
                // Fetch user info for each liker
                const likersWithInfo = await Promise.all(
                    data.slice(0, 20).map(async (like) => {
                        const name = like.TenNguoiDung || null;
                        const avatar = like.anh_dai_dien || null;
                        if (name) {
                            return {
                                id: like.ID_NguoiDung,
                                name,
                                avatar: avatar
                                    ? normalizeUrl(avatar.startsWith('http') ? avatar : `${API_BASE}/uploads/${avatar}`)
                                    : `https://i.pravatar.cc/30?u=${like.ID_NguoiDung}`,
                                time: like.thoi_gian_like,
                            };
                        }
                        // Fallback: fetch user info
                        if (userInfoCache.has(like.ID_NguoiDung)) {
                            const cached = userInfoCache.get(like.ID_NguoiDung);
                            return {
                                id: like.ID_NguoiDung,
                                name: cached.name,
                                avatar: cached.avatar,
                                time: like.thoi_gian_like,
                            };
                        }
                        try {
                            const uRes = await fetch(`${API_URLS.GET_USER_INFO}${like.ID_NguoiDung}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            if (uRes.ok) {
                                const uData = await uRes.json();
                                const u = uData.user || {};
                                return {
                                    id: like.ID_NguoiDung,
                                    name: u.ho_ten || 'Người dùng',
                                    avatar: normalizeUrl(
                                        u.anh_dai_dien
                                            ? (u.anh_dai_dien.startsWith('http') ? u.anh_dai_dien : `${API_BASE}/uploads/${u.anh_dai_dien}`)
                                            : `https://i.pravatar.cc/30?u=${like.ID_NguoiDung}`
                                    ),
                                    time: like.thoi_gian_like,
                                };
                            }
                        } catch { /* silent */ }
                        return {
                            id: like.ID_NguoiDung,
                            name: 'Người dùng',
                            avatar: `https://i.pravatar.cc/30?u=${like.ID_NguoiDung}`,
                            time: like.thoi_gian_like,
                        };
                    })
                );
                setLikers(likersWithInfo);
                setFetched(true);
            } catch (e) {
                console.error('Error fetching likers:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [show, fetched, loading, postId]);

    if (!show) return null;

    const formatTime = (timeStr) => {
        try {
            const date = new Date(timeStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            if (diffMin < 1) return 'Vừa xong';
            if (diffMin < 60) return `${diffMin}p trước`;
            if (diffHrs < 24) return `${diffHrs}h trước`;
            if (diffDays < 7) return `${diffDays}d trước`;
            return date.toLocaleDateString('vi-VN');
        } catch { return ''; }
    };

    return (
        <div className="like-tooltip">
            <div className="like-tooltip-arrow" />
            {loading ? (
                <div className="like-tooltip-loading">
                    <div className="like-tooltip-spinner" />
                    <span>Đang tải...</span>
                </div>
            ) : likers.length === 0 ? (
                <div className="like-tooltip-empty">Chưa có ai thích</div>
            ) : (
                <>
                    <div className="like-tooltip-header">
                        <Heart size={12} fill="#7f001f" color="#7f001f" />
                        <span>{likers.length} người đã thích</span>
                    </div>
                    <div className="like-tooltip-list">
                        {likers.map((liker) => (
                            <div key={liker.id} className="like-tooltip-item">
                                <img src={liker.avatar} alt={liker.name} className="like-tooltip-avatar" />
                                <div className="like-tooltip-info">
                                    <span className="like-tooltip-name">{liker.name}</span>
                                    {liker.time && <span className="like-tooltip-time">{formatTime(liker.time)}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/* ════════ SUB-COMPONENTS ════════ */

function LikeStats({ postId, liked, likeCount, comments }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const hoverTimeoutRef = useRef(null);

    const handleMouseEnter = () => {
        hoverTimeoutRef.current = setTimeout(() => setShowTooltip(true), 300);
    };
    const handleMouseLeave = () => {
        clearTimeout(hoverTimeoutRef.current);
        setShowTooltip(false);
    };

    return (
        <div className="post-stats">
            <span
                className="stat-item stat-item-hoverable"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <Heart size={13} fill={liked ? '#7f001f' : 'none'} color={liked ? '#7f001f' : '#aaa'} />
                {likeCount.toLocaleString()} thích
                <LikeTooltip postId={postId} show={showTooltip} />
            </span>
            <span className="stat-item">
                <MessageSquare size={13} color="#aaa" />
                {comments} bình luận
            </span>
        </div>
    );
}

function PostCard({ post, onCommentClick, onShareClick, onMessageClick, onLike, onOpenDetail }) {
    // Khi có onLike (API mode) → dùng giá trị từ props trực tiếp
    // Khi không có onLike (mock mode) 
    const [localLiked, setLocalLiked] = useState(false);
    const [localLikeCount, setLocalLikeCount] = useState(post.likes ?? 0);
    const [saved, setSaved] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const isLong = (post.desc || '').length > 130;

    const liked = onLike ? (post.liked ?? false) : localLiked;
    const likeCount = onLike ? (post.likes ?? 0) : localLikeCount;
    const statusColor = post.statusColor || post.categoryColor || '#7f001f';
    const galleryImages = Array.isArray(post.imageUrls) && post.imageUrls.length
        ? post.imageUrls
        : [post.img];

    const handleLike = () => {
        if (onLike) {
            onLike(post.id); // Parent xử lý API + state
        } else {
            setLocalLiked(!localLiked);
            setLocalLikeCount(localLiked ? localLikeCount - 1 : localLikeCount + 1);
        }
    };

    const handleOpenDetail = () => {
        onOpenDetail?.(post);
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
                            {post.isFriendPost && (
                                <span className="friend-badge-web">Bạn bè</span>
                            )}
                            <span
                                className="post-category-tag"
                                style={{ backgroundColor: `${statusColor}18`, color: statusColor, borderColor: `${statusColor}40` }}
                            >
                                {post.trang_thai || 'Chưa xác định'}
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
                <button type="button" className="post-title-link" onClick={handleOpenDetail}>
                    <h3 className="post-title">{post.title}</h3>
                </button>
                <div className="post-price-badge">{post.price} ₫</div>
            </div>

            {/* Description */}
            <p className={`post-desc ${expanded ? 'expanded' : ''}`}>
                {expanded || !isLong ? (post.desc || '') : (post.desc || '').slice(0, 130) + '...'}
            </p>
            {isLong && (
                <button className="btn-expand" onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Thu gọn ↑' : 'Xem thêm →'}
                </button>
            )}

            {/* Image */}
            <PostMediaGallery
                images={galleryImages}
                title={post.title}
                badge={`${post.price} VNĐ`}
                onOpen={handleOpenDetail}
                className="post-media-gallery"
            />

            {/* Stats */}
            <LikeStats postId={post.id} liked={liked} likeCount={likeCount} comments={post.comments} />

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
    const [activeTab, setActiveTab] = useState('recommend');
    const [activeFilter, setActiveFilter] = useState('Tất cả');
    const [searchFocused, setSearchFocused] = useState(false);
    const [sharePost, setSharePost] = useState(null);

    // ── Auth từ localStorage ──
    const [token, setToken] = useState('');
    const [userId, setUserId] = useState('');
    const [currentUser, setCurrentUser] = useState({ name: 'Bạn', avatar: DEFAULT_AVATAR });
    const [badgeCounts, setBadgeCounts] = useState({ friends: 0, messages: 0, notifications: 0 });
    const [peopleSuggestions, setPeopleSuggestions] = useState(PEOPLE_MAY_KNOW_FALLBACK);
    const inlineRailRef = useRef(null);
    const [toast, setToast] = useState(null);

    // ── Feed state ──
    const [allRecommendations, setAllRecommendations] = useState([]);
    const [feedPosts, setFeedPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [processedIndex, setProcessedIndex] = useState(0);
    const [fallbackPage, setFallbackPage] = useState(1);
    const [totalFallbackItems, setTotalFallbackItems] = useState(0);
    const [isRecommendationsExhausted, setIsRecommendationsExhausted] = useState(false);
    const lastLoadTimeRef = useRef(0);
    const pageLoadStartedAtRef = useRef(Date.now());
    const pageLoaderTimeoutRef = useRef(null);
    const hasFinishedInitialPageLoadRef = useRef(false);
    const postElementRefs = useRef(new Map());
    const sessionSeenPostIdsRef = useRef(new Set());
    const isAuthenticated = !!token && !!userId;

    const finishInitialPageLoading = useCallback(() => {
        if (hasFinishedInitialPageLoadRef.current) return;

        hasFinishedInitialPageLoadRef.current = true;
        const elapsed = Date.now() - pageLoadStartedAtRef.current;
        const remaining = Math.max(0, INITIAL_PAGE_LOADING_MIN_MS - elapsed);

        if (pageLoaderTimeoutRef.current) {
            window.clearTimeout(pageLoaderTimeoutRef.current);
        }

        pageLoaderTimeoutRef.current = window.setTimeout(() => {
            setIsPageLoading(false);
        }, remaining);
    }, []);

    // ── Load token & userId ──
    useEffect(() => {
        const syncAuth = () => {
            const nextToken = localStorage.getItem('token') || '';
            const nextUserId = localStorage.getItem('userId') || '';

            setToken(nextToken);
            setUserId(nextUserId);

            if (!nextToken || !nextUserId) {
                finishInitialPageLoading();
            }
        };
        syncAuth();
        window.addEventListener('storage', syncAuth);
        window.addEventListener('focus', syncAuth);
        return () => {
            window.removeEventListener('storage', syncAuth);
            window.removeEventListener('focus', syncAuth);
        };
    }, [finishInitialPageLoading]);

    useEffect(() => () => {
        if (pageLoaderTimeoutRef.current) {
            window.clearTimeout(pageLoaderTimeoutRef.current);
        }
    }, []);

    // ── Hydrate: gọi 4 API song song cho mỗi bài ──
    const hydratePostChunk = useCallback(async (chunk) => {
        if (!token) return [];
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        const results = await Promise.allSettled(chunk.map(async (reco) => {
            try {
                const cacheKey = `post_${reco.ID_BaiDang}`;
                if (postDetailCache.has(cacheKey)) return postDetailCache.get(cacheKey);

                const [postDetailRes, postImageRes, likeRes, commentRes] = await Promise.allSettled([
                    fetch(`${API_URLS.GET_POST_BY_ID}${reco.ID_BaiDang}`, { headers }),
                    fetch(`${API_URLS.GET_POST_IMAGE}${reco.ID_BaiDang}`, { headers }),
                    fetch(`${API_URLS.LIKE_BY_POST}${reco.ID_BaiDang}`, { headers }),
                    fetch(`${API_URLS.COMMENT_COUNT_BY_POST}${reco.ID_BaiDang}`, { headers }),
                ]);

                const postDetail = postDetailRes.status === 'fulfilled' && postDetailRes.value.ok
                    ? await postDetailRes.value.json() : {};
                if (!postDetail.ID_BaiDang) return null;

                const postImages = postImageRes.status === 'fulfilled' && postImageRes.value.ok
                    ? await postImageRes.value.json() : [];
                if (postImages.length === 0) return null;

                const likesRaw = likeRes.status === 'fulfilled' && likeRes.value.ok
                    ? await likeRes.value.json() : [];
                // Response từ getLikesByPostId trả về { success, data, total } — lấy .data
                const likes = Array.isArray(likesRaw) ? likesRaw : (likesRaw?.data ?? []);
                const commentCountRes = commentRes.status === 'fulfilled' && commentRes.value.ok
                    ? await commentRes.value.json() : { count: 0 };
                const commentCount = commentCountRes?.count ?? 0;

                // Thông tin tác giả (có cache)
                let authorName = 'Người dùng OLODO';
                let authorAvatar = `https://i.pravatar.cc/50?u=${postDetail.ID_NguoiDung}`;
                if (!userInfoCache.has(postDetail.ID_NguoiDung)) {
                    try {
                        const uRes = await fetch(`${API_URLS.GET_USER_INFO}${postDetail.ID_NguoiDung}`, { headers });
                        if (uRes.ok) {
                            const uData = await uRes.json();
                            const u = uData.user || {};
                            userInfoCache.set(postDetail.ID_NguoiDung, {
                                name: u.ho_ten || authorName,
                                avatar: normalizeUrl(
                                    u.anh_dai_dien
                                        ? (u.anh_dai_dien.startsWith('http') ? u.anh_dai_dien : `${API_BASE}/uploads/${u.anh_dai_dien}`)
                                        : authorAvatar
                                ),
                            });
                        }
                    } catch { /* silent */ }
                }
                const cachedUser = userInfoCache.get(postDetail.ID_NguoiDung);
                if (cachedUser) { authorName = cachedUser.name; authorAvatar = cachedUser.avatar; }

                // URL ảnh — thêm localhost và normalizẽ IP
                const imageUrls = postImages.map(img => {
                    const link = img.LinkAnh;
                    const full = (link.startsWith('http://') || link.startsWith('https://'))
                        ? link
                        : `${API_BASE}/uploads/${link}`;
                    return normalizeUrl(full);
                });

                const userLike = likes.find(l => String(l.ID_NguoiDung) === String(userId));
                const rawPrice = parseFloat(postDetail.gia) || 0;
                const statusInfo = normalizePostStatus(postDetail.trang_thai);
                const categoryInfo = CATEGORIES.find(c => c.label === (postDetail.TenDanhMuc || postDetail.category)) || {};

                const hydratedPost = {
                    id: postDetail.ID_BaiDang,
                    authorId: postDetail.ID_NguoiDung,
                    author: authorName,
                    avatar: authorAvatar,
                    time: new Date(postDetail.thoi_gian_tao).toLocaleDateString('vi-VN'),
                    rawTime: new Date(postDetail.thoi_gian_tao).getTime() || 0,
                    location: postDetail.vi_tri || '',
                    verified: false,
                    title: postDetail.tieu_de,
                    desc: postDetail.mo_ta || '',
                    price: rawPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                    img: imageUrls[0],
                    imageUrls,
                    likes: likes.length,
                    comments: commentCount,
                    category: postDetail.TenDanhMuc || '',
                    categoryColor: categoryInfo.color || '#7f001f',
                    trang_thai: statusInfo.label,
                    statusColor: statusInfo.color,
                    liked: !!userLike,
                    userLikeId: userLike?.ID_Like || null,
                    isFriendPost: reco.isFriendPost || false,
                    typeId: postDetail.ID_LoaiBaiDang || '',
                };
                postDetailCache.set(cacheKey, hydratedPost);
                return hydratedPost;
            } catch { return null; }
        }));

        return results
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value);
    }, [token, userId]);

    const registerPostElement = useCallback((postId, node) => {
        const normalizedId = String(postId);
        if (!normalizedId) return;

        if (node) {
            postElementRefs.current.set(normalizedId, node);
            return;
        }

        postElementRefs.current.delete(normalizedId);
    }, []);

    const markPostAsSeen = useCallback((postId) => {
        if (!userId || !postId) return;

        const normalizedId = String(postId);
        if (sessionSeenPostIdsRef.current.has(normalizedId)) return;

        sessionSeenPostIdsRef.current.add(normalizedId);

        const history = readPostViewHistory(userId);
        const currentEntry = history[normalizedId];
        history[normalizedId] = {
            count: Math.min((Number(currentEntry?.count) || 0) + 1, 50),
            lastSeenAt: Date.now(),
        };
        writePostViewHistory(userId, history);
    }, [userId]);

    // ── Fetch lần đầu ──
    // ── Load thêm từ API chung (Fallback) ──
    const loadFallbackPosts = useCallback(async (page) => {
        if (!token) return;
        setIsLoadingMore(true);
        try {
            const res = await fetch(`${API_URLS.GET_ALL_WITH_DETAILS}?page=${page}&limit=${POSTS_PER_CHUNK}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const result = await res.json();
            const rawPosts = result.data || [];
            setTotalFallbackItems(result.total || 0);

            const formattedPosts = rawPosts.map(p => {
                const imageUrls = (p.DanhSachAnh || []).map(link => {
                    const full = (link.startsWith('http://') || link.startsWith('https://'))
                        ? link : `${API_BASE}/uploads/${link}`;
                    return normalizeUrl(full);
                });
                const rawPrice = parseFloat(p.gia) || 0;

                const statusInfo = normalizePostStatus(p.trang_thai);
                const categoryInfo = CATEGORIES.find(c => c.label === (p.TenDanhMuc || p.category)) || {};
                return {
                    id: p.ID_BaiDang,
                    authorId: p.ID_NguoiDung,
                    author: p.TenNguoiDung || 'Người dùng OLODO',
                    avatar: normalizeUrl(p.anh_dai_dien 
                        ? (p.anh_dai_dien.startsWith('http') ? p.anh_dai_dien : `${API_BASE}/uploads/${p.anh_dai_dien}`)
                        : `https://i.pravatar.cc/50?u=${p.ID_NguoiDung}`),
                    time: new Date(p.thoi_gian_tao).toLocaleDateString('vi-VN'),
                    rawTime: new Date(p.thoi_gian_tao).getTime() || 0,
                    location: p.vi_tri || '',
                    verified: false,
                    title: p.tieu_de,
                    desc: p.mo_ta || '',
                    price: rawPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                    img: imageUrls[0] || 'https://via.placeholder.com/400x300?text=No+Image',
                    imageUrls,
                    likes: p.SoLuongLike || 0,
                    comments: p.SoLuongBinhLuan || 0,
                    category: p.TenDanhMuc || '',
                    categoryColor: categoryInfo.color || '#7f001f',
                    trang_thai: statusInfo.label,
                    statusColor: statusInfo.color,
                    liked: false, 
                    isFriendPost: false,
                    typeId: p.ID_LoaiBaiDang || '',
                };
            });

            if (formattedPosts.length > 0) {
                const viewHistory = readPostViewHistory(userId);
                const rankedPosts = sortPostsByViewHistory(formattedPosts, viewHistory);
                setFeedPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    return [...prev, ...rankedPosts.filter(p => !existingIds.has(p.id))];
                });
                setFallbackPage(v => v + 1);
            }
        } catch (e) {
            console.error('Fallback load error:', e);
        } finally {
            setIsLoadingMore(false);
        }
    }, [token, userId]);

    // ── Fetch lần đầu ──
    const fetchInitialData = useCallback(async () => {
        if (!token || !userId) return;
        setIsLoading(true);
        userInfoCache.clear();
        postDetailCache.clear();
        sessionSeenPostIdsRef.current = new Set();
        setFeedPosts([]);
        setAllRecommendations([]);
        setProcessedIndex(0);
        setFallbackPage(1);
        setTotalFallbackItems(0);
        setIsRecommendationsExhausted(false);
        try {
            const res = await fetch(`${API_URLS.RECOMMENDATIONS}${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch recommendations');
            const recommendations = await res.json();
            const viewHistory = readPostViewHistory(userId);
            const rankedRecommendations = sortRecommendationsByViewHistory(
                Array.isArray(recommendations) ? recommendations : [],
                viewHistory
            );
            setAllRecommendations(rankedRecommendations);
            
            if (rankedRecommendations.length > 0) {
                const firstChunk = rankedRecommendations.slice(0, INITIAL_LOAD_COUNT);
                const posts = await hydratePostChunk(firstChunk);
                setFeedPosts(posts);
                setProcessedIndex(INITIAL_LOAD_COUNT);
                
                if (rankedRecommendations.length <= INITIAL_LOAD_COUNT) {
                    setIsRecommendationsExhausted(true);
                }
            } else {
                setIsRecommendationsExhausted(true);
                await loadFallbackPosts(1);
            }
        } catch (e) {
            console.error('Feed fetch error:', e);
            setIsRecommendationsExhausted(true);
            await loadFallbackPosts(1);
        } finally {
            setIsLoading(false);
            finishInitialPageLoading();
        }
    }, [token, userId, hydratePostChunk, loadFallbackPosts, finishInitialPageLoading]);

    // ── Load thêm khi scroll ──
    const handleLoadMore = useCallback(async () => {
        const now = Date.now();
        if (isLoadingMore || now - lastLoadTimeRef.current < 1500) return;
        lastLoadTimeRef.current = now;

        // Ưu tiên load hết Recommendations trước
        if (!isRecommendationsExhausted && processedIndex < allRecommendations.length) {
            setIsLoadingMore(true);
            try {
                const nextChunk = allRecommendations.slice(processedIndex, processedIndex + POSTS_PER_CHUNK);
                const newPosts = await hydratePostChunk(nextChunk);
                if (newPosts.length > 0) {
                    setFeedPosts(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        return [...prev, ...newPosts.filter(p => !existingIds.has(p.id))];
                    });
                }
                const nextIdx = processedIndex + POSTS_PER_CHUNK;
                setProcessedIndex(nextIdx);
                if (nextIdx >= allRecommendations.length) {
                    setIsRecommendationsExhausted(true);
                }
            } catch (e) {
                console.error('Load more reco error:', e);
                setIsRecommendationsExhausted(true);
            } finally {
                setIsLoadingMore(false);
            }
        } 
        // Sau đó chuyển sang Fallback (bài đăng mới nhất chung)
        else {
            await loadFallbackPosts(fallbackPage);
        }
    }, [isLoadingMore, isRecommendationsExhausted, processedIndex, allRecommendations, fallbackPage, hydratePostChunk, loadFallbackPosts]);

    // ── Like / Unlike thật (optimistic update) ──
    const handleLike = useCallback(async (postId) => {
        if (!token || !userId) return;
        const idx = feedPosts.findIndex(p => p.id === postId);
        if (idx === -1) return;
        const post = feedPosts[idx];
        const wasLiked = post.liked;

        // Cập nhật UI ngay
        setFeedPosts(prev => prev.map((p, i) => i === idx
            ? { ...p, liked: !wasLiked, likes: wasLiked ? p.likes - 1 : p.likes + 1 }
            : p
        ));

        try {
            if (wasLiked) {
                let likeId = post.userLikeId;
                if (!likeId) {
                    const r = await fetch(`${API_URLS.LIKE_BY_POST}${postId}`, { headers: { Authorization: `Bearer ${token}` } });
                    const lsRaw = r.ok ? await r.json() : [];
                    const ls = Array.isArray(lsRaw) ? lsRaw : (lsRaw?.data ?? []);
                    likeId = ls.find(l => String(l.ID_NguoiDung) === String(userId))?.ID_Like;
                }
                if (likeId) {
                    await fetch(`${API_URLS.LIKE_DELETE}${likeId}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    // Xoá cache để fetch lại lần sau
                    postDetailCache.delete(`post_${postId}`);
                }
            } else {
                const r = await fetch(API_URLS.LIKE_CREATE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ ID_BaiDang: postId, ID_NguoiDung: userId }),
                });
                if (r.ok) {
                    const data = await r.json();
                    setFeedPosts(prev => prev.map((p, i) => i === idx ? { ...p, userLikeId: data.ID_Like } : p));
                    postDetailCache.delete(`post_${postId}`);
                } else throw new Error('Like failed');
            }
        } catch {
            // Rollback nếu API lỗi
            setFeedPosts(prev => prev.map((p, i) => i === idx
                ? { ...p, liked: wasLiked, likes: wasLiked ? p.likes + 1 : p.likes - 1 }
                : p
            ));
        }
    }, [token, userId, feedPosts]);

    // ── Effects ──
    useEffect(() => {
        if (token && userId) return;

        setIsLoading(false);
        setFeedPosts([]);
        setAllRecommendations([]);
        setProcessedIndex(0);
        setFallbackPage(1);
        setTotalFallbackItems(0);
        setIsRecommendationsExhausted(false);
        sessionSeenPostIdsRef.current = new Set();
    }, [token, userId]);

    useEffect(() => {
        if (token && userId) fetchInitialData();
    }, [token, userId, fetchInitialData]);

    const filteredFeed = useMemo(() => {
        let base = feedPosts;
        if (activeFilter !== 'Tất cả') {
            base = base.filter(p => (p.category || '').toLowerCase() === activeFilter.toLowerCase());
        }
        if (activeTab === 'news') {
            return [...base].sort((a, b) => (b.rawTime || 0) - (a.rawTime || 0));
        }
        if (activeTab === 'popular') {
            return [...base].sort((a, b) => (b.likes || 0) - (a.likes || 0));
        }
        return base;
    }, [feedPosts, activeFilter, activeTab]);

    useEffect(() => {
        if (isLoading || filteredFeed.length === 0 || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
            return undefined;
        }

        const observer = new window.IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;

                const postId = entry.target.getAttribute('data-post-id');
                if (!postId) return;

                markPostAsSeen(postId);
                observer.unobserve(entry.target);
            });
        }, {
            threshold: [0.6],
        });

        filteredFeed.forEach((post) => {
            const element = postElementRefs.current.get(String(post.id));
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [filteredFeed, isLoading, markPostAsSeen]);

    useEffect(() => {
        const onScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 400) handleLoadMore();
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, [handleLoadMore]);

    // ── Badge counts & user info ──
    useEffect(() => {
        if (!isAuthenticated) {
            setBadgeCounts({ friends: 0, messages: 0, notifications: 0 });
            setCurrentUser({ name: 'Khách', avatar: DEFAULT_AVATAR });
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const buildAvatar = (raw) => normalizeUrl(
            raw
                ? (raw.startsWith('http') ? raw : `${API_BASE}/uploads/${raw}`)
                : DEFAULT_AVATAR
        );

        const fetchBadgesAndUser = async () => {
            try {
                const [notiRes, msgRes, friendRes, userRes] = await Promise.all([
                    fetch(`${API_URLS.UNREAD_NOTIFICATIONS}${userId}`, { headers }),
                    fetch(`${API_URLS.UNREAD_MESSAGES}${userId}`, { headers }),
                    fetch(`${API_URLS.PENDING_FRIEND_REQUESTS}${userId}`, { headers }),
                    fetch(`${API_URLS.GET_USER_INFO}${userId}`, { headers }),
                ]);

                let notifications = 0;
                if (notiRes.ok) {
                    const data = await notiRes.json();
                    notifications = data?.unread_count ?? data?.data?.unread_count ?? 0;
                }

                let messages = 0;
                if (msgRes.ok) {
                    const data = await msgRes.json();
                    const payload = data?.data ?? data;
                    messages = payload?.total_unread ?? payload?.totalUnread ?? 0;
                }

                let friends = 0;
                if (friendRes.ok) {
                    const data = await friendRes.json();
                    friends = data?.count ?? (Array.isArray(data?.data) ? data.data.length : 0);
                }

                if (userRes.ok) {
                    const data = await userRes.json();
                    const u = data?.user || {};
                    setCurrentUser({
                        name: u.ho_ten || 'Bạn',
                        avatar: buildAvatar(u.anh_dai_dien),
                    });
                } else {
                    setCurrentUser({ name: 'Bạn', avatar: DEFAULT_AVATAR });
                }

                setBadgeCounts({ friends, messages, notifications });
            } catch (err) {
                console.error('Badge/user fetch failed', err);
                setBadgeCounts({ friends: 0, messages: 0, notifications: 0 });
            }
        };

        fetchBadgesAndUser();
    }, [isAuthenticated, token, userId]);

    const navBadges = {
        messages: badgeCounts.messages,
        notifications: badgeCounts.notifications,
        'add-friends': badgeCounts.friends,
    };
    const lockedNavKeys = new Set(['map', 'add-friends', 'messages', 'notifications']);
    const inlineSuggestions = useMemo(() => peopleSuggestions.slice(0, 4), [peopleSuggestions]);
    const sidebarSuggestions = useMemo(() => peopleSuggestions.slice(0, 3), [peopleSuggestions]);
    const scrollInlineRail = useCallback((dir) => {
        const el = inlineRailRef.current;
        if (!el) return;
        const card = el.querySelector('.person-card-small');
        const cardWidth = card?.clientWidth || 160;
        const gap = 12;
        const step = (cardWidth + gap) * 2; // scroll 2 cards each click
        el.scrollBy({ left: dir === 'next' ? step : -step, behavior: 'smooth' });
    }, []);

    const handleQuickAddFriend = useCallback(async (targetId, name) => {
        if (!token || !userId) {
            setToast({ type: 'error', text: 'Bạn cần đăng nhập để kết bạn.' });
            return;
        }
        setPeopleSuggestions(prev => prev.map(p => p.id === targetId ? { ...p, status: 'sent' } : p));
        try {
            const res = await fetch(API_URLS.FRIEND_REQUEST, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ idNguoiGui: userId, idNguoiNhan: targetId }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setToast({ type: 'success', text: `Đã gửi lời mời tới ${name || 'bạn'}.` });
        } catch (err) {
            console.error('Quick add friend failed', err);
            setPeopleSuggestions(prev => prev.map(p => p.id === targetId ? { ...p, status: null } : p));
            setToast({ type: 'error', text: `Không gửi được lời mời tới ${name || 'bạn'}.` });
        }
    }, [token, userId]);

    const handleQuickDismiss = useCallback((targetId) => {
        setPeopleSuggestions(prev => prev.filter(p => p.id !== targetId));
    }, []);

    // ── Load "Có thể bạn quen" giống AddFriends.jsx ──
    useEffect(() => {
        if (!userId || !token) {
            setPeopleSuggestions(PEOPLE_MAY_KNOW_FALLBACK);
            return;
        }

        let cancelled = false;
        const headers = { Authorization: `Bearer ${token}` };
        const toAvatar = (raw) => normalizeUrl(
            raw
                ? (raw.startsWith('http') ? raw : `${API_BASE}/uploads/${raw}`)
                : DEFAULT_AVATAR
        );

        const loadSuggestions = async () => {
            try {
                const res = await fetch(`${API_URLS.FRIEND_SUGGESTIONS}${userId}`, { headers });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const payload = await res.json();
                const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
                if (list.length === 0) {
                    if (!cancelled) setPeopleSuggestions(PEOPLE_MAY_KNOW_FALLBACK);
                    return;
                }
                const mapped = list.map((u, idx) => {
                    const id = u.ID_NguoiDung ?? u.id ?? u.userId ?? `sug-${idx}`;
                    return {
                        id,
                        name: u.ho_ten || u.name || 'Người dùng',
                        mutual: Number(u.so_nguoi_chung ?? u.mutual ?? 0) || 0,
                        avatar: toAvatar(u.anh_dai_dien),
                        verified: !!u.verified,
                        status: u.status || null,
                    };
                });
                if (!cancelled) setPeopleSuggestions(mapped);
            } catch (err) {
                console.error('Load friend suggestions failed', err);
                if (!cancelled) setPeopleSuggestions(PEOPLE_MAY_KNOW_FALLBACK);
            }
        };

        loadSuggestions();
        return () => { cancelled = true; };
    }, [token, userId]);

    return (
        <>
            {isPageLoading && <HomePageLoader />}
            <div className={`home-page ${isPageLoading ? 'home-page-booting' : ''}`}>

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
                    {NAV_ITEMS.map(({ icon, label, key, path }) => {
                        const isActive = key === 'home';
                        const badge = navBadges[key] || 0;
                        const isLocked = !isAuthenticated && lockedNavKeys.has(key);
                        return (
                            <button
                                key={label}
                                className={`nav-item ${isActive ? 'nav-active' : ''} ${isLocked ? 'nav-disabled' : ''}`}
                                onClick={() => {
                                    if (isLocked) return;
                                    if (path) navigate(path);
                                }}
                            >
                                <span className="nav-icon-wrap">
                                    {createElement(icon, { size: 19, strokeWidth: 2 })}
                                    {badge > 0 && <span className="nav-badge">{badge}</span>}
                                </span>
                                <span className="nav-label">{label}</span>
                                {isActive && <span className="nav-active-bar" />}
                            </button>
                        );
                    })}
                </nav>

                {/* Categories */}
                <div className="sidebar-block">
                    <div className="block-header">
                        <span>Danh mục</span>
                        <ChevronRight size={14} strokeWidth={2} className="block-chevron" />
                    </div>
                    <div className="cat-list">
                        {CATEGORIES.map(({ icon, label, color }) => (
                            <button key={label} className="cat-item">
                                <span className="cat-icon" style={{ background: color + '15', color }}>
                                    {createElement(icon, { size: 15, strokeWidth: 2 })}
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
                    {STATS.map(({ icon, label, value, color }) => (
                        <div key={label} className="stat-card">
                            <span className="stat-icon" style={{ background: color + '15', color }}>
                                {createElement(icon, { size: 18, strokeWidth: 2 })}
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
                        <img src={currentUser.avatar} alt="You" className="create-avatar" />
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
                        <button className={`tab-btn ${activeTab === 'recommend' ? 'tab-active' : ''}`} onClick={() => setActiveTab('recommend')}>
                            <Zap size={14} strokeWidth={2.2} />
                            Dành cho bạn
                        </button>
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
                {isLoading ? (
                    <div className="feed-loading">
                        <div className="feed-spinner" />
                        <span>Đang tải bài viết...</span>
                    </div>
                ) : filteredFeed.length === 0 ? (
                    <div className="feed-empty">
                        <span>Chưa có bài viết nào. Hãy đăng nhập để xem feed cá nhân hoá 🎯</span>
                    </div>
                ) : (
                    filteredFeed.map((p, index) => (
                        <div
                            key={p.id}
                            ref={(node) => registerPostElement(p.id, node)}
                            data-post-id={p.id}
                        >
                            <PostCard
                                post={p}
                                onLike={handleLike}
                                onOpenDetail={(postData) => navigate(`/post/${postData.id}`, { state: { post: postData } })}
                                onCommentClick={(postData) => navigate(`/post/${postData.id}/comments`, { state: { post: postData } })}
                                onShareClick={(postData) => setSharePost(postData)}
                                onMessageClick={(postData) => {
                                    if (!isAuthenticated) {
                                        setToast({ type: 'error', text: 'Bạn cần đăng nhập để nhắn tin.' });
                                        return;
                                    }
                                    const targetUserId = postData?.authorId || '';
                                    if (!targetUserId) {
                                        setToast({ type: 'error', text: 'Không xác định được người nhận tin nhắn.' });
                                        return;
                                    }
                                    if (String(targetUserId) === String(userId)) {
                                        setToast({ type: 'error', text: 'Không thể nhắn tin cho chính bạn.' });
                                        return;
                                    }
                                    navigate('/messages');
                                }}
                            />

                            {/* Gợi ý người quen xen kẽ vào Feed như mobile */}
                            {index === 0 && (
                                <div className="feed-widget-inline">
                                    <div className="widget-header">
                                        <UserPlus size={15} strokeWidth={2} color="#7f001f" />
                                        <span className="widget-title">Người có thể bạn quen</span>
                                    </div>
                                    <div className="people-rail">
                                        {inlineSuggestions.length > 4 && (
                                            <button
                                                type="button"
                                                className="rail-btn rail-btn-prev"
                                                onClick={() => scrollInlineRail('prev')}
                                                aria-label="Previous suggestions"
                                            >
                                                <ChevronRight size={16} strokeWidth={2.5} />
                                            </button>
                                        )}
                                        <div className="people-row-horizontal" ref={inlineRailRef}>
                                            {inlineSuggestions.map(person => (
                                                <div key={person.id} className="person-card-small">
                                                    <div className="person-avatar-wrap">
                                                        <img src={person.avatar} alt={person.name} className="person-avatar" />
                                                        {person.verified && <span className="person-verified">✓</span>}
                                                    </div>
                                                    <span className="person-name">{person.name}</span>
                                                    <span className="person-mutual">{person.mutual} bạn chung</span>
                                                    <button
                                                        className={`btn-add-small ${person.status === 'sent' ? 'sent' : ''}`}
                                                        disabled={person.status === 'sent'}
                                                        onClick={() => handleQuickAddFriend(person.id, person.name)}
                                                    >
                                                        {person.status === 'sent' ? 'Đã gửi' : 'Thêm bạn'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {inlineSuggestions.length > 4 && (
                                            <button
                                                type="button"
                                                className="rail-btn rail-btn-next"
                                                onClick={() => scrollInlineRail('next')}
                                                aria-label="Next suggestions"
                                            >
                                                <ChevronRight size={16} strokeWidth={2.5} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
                {isLoadingMore && (
                    <div className="feed-loading">
                        <div className="feed-spinner" />
                        <span>Đang tải thêm...</span>
                    </div>
                )}

                {toast && (
                    <div className={`toast ${toast.type}`}>
                        {toast.text}
                    </div>
                )}

                {/* Modals */}
                {sharePost && (
                    <ShareModal
                        post={sharePost}
                        onClose={() => setSharePost(null)}
                    />
                )}

                {!isLoading && !isLoadingMore && filteredFeed.length > 0 &&
                    isRecommendationsExhausted && filteredFeed.length >= (totalFallbackItems || allRecommendations.length) && (
                        <div className="feed-end">
                            <div className="feed-end-icon">🎉</div>
                            <span>Bạn đã xem hết bài viết hôm nay</span>
                        </div>
                    )}
            </main>

            {/* ─── RIGHT SIDEBAR ─── */}
            <aside className="sidebar-right">

                {/* User Mini Card */}
                <div className="user-mini-card">
                    <img src={currentUser.avatar} alt="You" className="user-mini-avatar" />
                    <div className="user-mini-info">
                        <span className="user-mini-name">{currentUser.name || 'Bạn'}</span>
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
                        {sidebarSuggestions.map(p => (
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
                                    <button
                                        className={`btn-add ${p.status === 'sent' ? 'btn-add-sent' : ''}`}
                                        disabled={p.status === 'sent'}
                                        onClick={() => handleQuickAddFriend(p.id, p.name)}
                                    >
                                        {p.status === 'sent' ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                                    </button>
                                    <button className="btn-decline" onClick={() => handleQuickDismiss(p.id)}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        className="widget-see-all"
                        onClick={() => navigate('/add-friends')}
                    >
                        Xem tất cả <ChevronRight size={13} strokeWidth={2} />
                    </button>
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
        </>
    );
}
