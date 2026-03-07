import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home as HomeIcon, Map, UserPlus, MessageCircle, Bell, Settings,
    Search, Heart, MessageSquare, Share2, Send, MoreHorizontal,
    Image, Tag, Smile, Video, Plus, Bookmark, TrendingUp, Star,
    ShoppingBag, Zap, Shield, MapPin, Clock, ChevronRight, ChevronDown,
    Tv, Shirt, Car, Sofa, Smartphone, Camera, BookOpen, Headphones, Wrench, Gift,
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

/* ════════ SUB-COMPONENTS ════════ */

function PostCard({ post }) {
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
                <button className="action-btn">
                    <MessageSquare size={17} strokeWidth={2} />
                    <span>Bình luận</span>
                </button>
                <button className="action-btn">
                    <Share2 size={17} strokeWidth={2} />
                    <span>Chia sẻ</span>
                </button>
                <button className="action-btn action-primary">
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
                {MOCK_POSTS.map(p => <PostCard key={p.id} post={p} />)}

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
                        <button className="btn-download">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                            App Store
                        </button>
                        <button className="btn-download">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M3.18 23.76c.34.19.72.24 1.1.14l12.8-7.4-2.88-2.88-11.02 10.14zm15.8-10.26L16.6 12l2.38-1.5 3.36 1.94c.96.55.96 1.45 0 2L19.7 16l-2.38-1.5.75-.75-2.83-2.83-.75.75L12 12l-2.76-1.73L6.36 12.9 3.18.24C2.84.05 2.46 0 2.08.1L14.76 12.9l-2.88 2.88 12.8 7.4c.38.1.76.05 1.1-.14-.96.55-.96-1.45 0-2l-3.36-1.94-.62-.1z" /></svg>
                            Google Play
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
