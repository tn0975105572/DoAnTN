import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Bell,
    BookOpen,
    Camera,
    Car,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Gift,
    Headphones,
    Heart,
    Home as HomeIcon,
    Layers,
    Map as MapIcon,
    MessageCircle,
    MessageSquare,
    RotateCcw,
    Search as SearchIcon,
    Settings,
    ShieldCheck,
    Shirt,
    Smartphone,
    Sofa,
    SortAsc,
    UserPlus,
    Wrench,
    X,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import './Search.css';

/* ─────────────────────────────────────── constants ─── */
const API_BASE = 'http://localhost:3000';
const POSTS_PER_PAGE = 12;
const FETCH_PAGE_SIZE = 100;

const CATEGORIES = [
    { label: 'Tất cả', icon: Layers, color: '#7f001f' },
    { label: 'Điện tử', icon: Smartphone, color: '#3b82f6' },
    { label: 'Sách vở', icon: BookOpen, color: '#8b5cf6' },
    { label: 'Thời trang', icon: Shirt, color: '#ec4899' },
    { label: 'Xe cộ', icon: Car, color: '#10b981' },
    { label: 'Nội thất', icon: Sofa, color: '#f59e0b' },
    { label: 'Phụ kiện', icon: Headphones, color: '#06b6d4' },
    { label: 'Máy ảnh', icon: Camera, color: '#ef4444' },
    { label: 'Đồ dùng', icon: Wrench, color: '#64748b' },
    { label: 'Khác', icon: Gift, color: '#a855f7' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'dang_ban', label: 'Đang bán' },
    { value: 'da_ban', label: 'Đã bán' },
    { value: 'cho_duyet', label: 'Chờ duyệt' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'oldest', label: 'Cũ nhất' },
    { value: 'price_asc', label: 'Giá thấp → cao' },
    { value: 'price_desc', label: 'Giá cao → thấp' },
    { value: 'most_liked', label: 'Tương tác nhiều' },
];

const STATUS_LABELS = {
    dang_ban: 'Đang bán',
    da_ban: 'Đã bán',
    cho_duyet: 'Chờ duyệt',
    het_hang: 'Hết hàng',
    dang_giu_cho: 'Đang giữ chỗ',
};

const STATUS_COLORS = {
    dang_ban: '#10b981',
    da_ban: '#ef4444',
    cho_duyet: '#f59e0b',
    het_hang: '#9ca3af',
    dang_giu_cho: '#3b82f6',
};

const NAV_ITEMS = [
    { icon: HomeIcon, label: 'Trang chủ', path: '/' },
    { icon: MapIcon, label: 'Bản đồ', path: '/map' },
    { icon: UserPlus, label: 'Thêm bạn', path: '/add-friends' },
    { icon: MessageCircle, label: 'Tin nhắn', path: '/messages' },
    { icon: Bell, label: 'Thông báo', path: '/notifications' },
    { icon: Settings, label: 'Cài đặt', path: '/settings' },
];

/* ─────────────────────────────────────── helpers ─── */
function normalizeUrl(url) {
    if (!url) return url;
    return url.replace(/^http:\/\/(?!localhost)[\d.]+:(\d+)/, 'http://localhost:$1');
}

function normalizeImageUrl(raw) {
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return normalizeUrl(raw);
    const clean = raw.replace(/^\/+/, '');
    return `${API_BASE}/${clean.startsWith('uploads/') ? clean : `uploads/${clean}`}`;
}

function normalizePost(item) {
    const imageUrls = (item.DanhSachAnh || [])
        .map(normalizeImageUrl)
        .filter(Boolean);

    const statusKey = String(item.trang_thai || '').trim().toLowerCase();
    const rawPrice = Number.parseFloat(item.gia) || 0;

    return {
        id: item.ID_BaiDang,
        authorId: item.ID_NguoiDung,
        author: item.TenNguoiDung || 'Người dùng OLODO',
        avatar: item.anh_dai_dien
            ? normalizeUrl(item.anh_dai_dien.startsWith('http') ? item.anh_dai_dien : `${API_BASE}/uploads/${item.anh_dai_dien}`)
            : `https://i.pravatar.cc/50?u=${item.ID_NguoiDung}`,
        title: item.tieu_de || 'Bài đăng',
        desc: item.mo_ta || '',
        price: rawPrice,
        priceLabel: rawPrice
            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(rawPrice)
            : 'Liên hệ',
        img: imageUrls[0] || null,
        imageUrls,
        likes: Number(item.SoLuongLike || 0),
        comments: Number(item.SoLuongBinhLuan || 0),
        category: item.TenDanhMuc || '',
        statusKey,
        statusLabel: STATUS_LABELS[statusKey] || item.trang_thai || 'Không rõ',
        statusColor: STATUS_COLORS[statusKey] || '#9ca3af',
        location: item.vi_tri || '',
        createdAt: item.thoi_gian_tao ? new Date(item.thoi_gian_tao).getTime() : 0,
        timeLabel: item.thoi_gian_tao
            ? new Date(item.thoi_gian_tao).toLocaleDateString('vi-VN')
            : '',
    };
}

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
}

async function fetchAllPosts(headers) {
    const posts = [];
    let page = 1;
    let total = Infinity;

    while (posts.length < total) {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(FETCH_PAGE_SIZE),
            status: 'all',
        });

        const response = await fetch(`${API_BASE_URL}/baidang/getAllWithDetails?${params.toString()}`, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = await response.json();
        const pageItems = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
                ? payload.data
                : [];

        posts.push(...pageItems);
        total = Number.isFinite(Number(payload?.total)) ? Number(payload.total) : posts.length;

        if (pageItems.length === 0 || Array.isArray(payload)) break;
        page += 1;
    }

    return posts;
}

function formatRelativeTime(ms) {
    if (!ms) return '';
    const diffMs = Date.now() - ms;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHrs < 24) return `${diffHrs} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return new Date(ms).toLocaleDateString('vi-VN');
}

/* ─────────────────────────────────────── sub-components ─── */
function SkeletonCard() {
    return (
        <div className="sp-card sp-card-skeleton">
            <div className="sp-card-img-wrap sk-box" />
            <div className="sp-card-body">
                <div className="sk-line sk-line-title" />
                <div className="sk-line sk-line-short" />
                <div className="sk-line sk-line-price" />
            </div>
        </div>
    );
}

function PostCard({ post, onNavigate }) {
    const [imgError, setImgError] = useState(false);
    const catData = CATEGORIES.find((c) => c.label === post.category);

    return (
        <button
            type="button"
            className="sp-card"
            onClick={() => onNavigate(`/post/${post.id}`, { state: { post } })}
        >
            <div className="sp-card-img-wrap">
                {post.img && !imgError ? (
                    <img
                        src={post.img}
                        alt={post.title}
                        className="sp-card-img"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="sp-card-img-fallback">
                        <SearchIcon size={28} opacity={0.3} />
                    </div>
                )}
                <span
                    className="sp-card-status-badge"
                    style={{ background: post.statusColor }}
                >
                    {post.statusLabel}
                </span>
                {post.category && (
                    <span
                        className="sp-card-cat-badge"
                        style={{ color: catData?.color || '#7f001f' }}
                    >
                        {post.category}
                    </span>
                )}
            </div>
            <div className="sp-card-body">
                <div className="sp-card-title">{post.title}</div>
                <div className="sp-card-price">{post.priceLabel}</div>
                {post.location && (
                    <div className="sp-card-location">📍 {post.location}</div>
                )}
                <div className="sp-card-meta">
                    <span className="sp-card-time">{formatRelativeTime(post.createdAt)}</span>
                    <span className="sp-card-stats">
                        <Heart size={12} />
                        {post.likes}
                        <MessageSquare size={12} />
                        {post.comments}
                    </span>
                </div>
            </div>
        </button>
    );
}

function Pagination({ current, total, onChange }) {
    if (total <= 1) return null;

    const pages = [];
    const delta = 2;
    const left = Math.max(1, current - delta);
    const right = Math.min(total, current + delta);

    for (let i = left; i <= right; i++) pages.push(i);

    return (
        <div className="sp-pagination">
            <button
                type="button"
                className="sp-pg-btn"
                disabled={current === 1}
                onClick={() => onChange(current - 1)}
                aria-label="Trang trước"
            >
                <ChevronLeft size={16} />
            </button>

            {left > 1 && (
                <>
                    <button type="button" className="sp-pg-btn" onClick={() => onChange(1)}>1</button>
                    {left > 2 && <span className="sp-pg-ellipsis">…</span>}
                </>
            )}

            {pages.map((p) => (
                <button
                    key={p}
                    type="button"
                    className={`sp-pg-btn${p === current ? ' active' : ''}`}
                    onClick={() => onChange(p)}
                >
                    {p}
                </button>
            ))}

            {right < total && (
                <>
                    {right < total - 1 && <span className="sp-pg-ellipsis">…</span>}
                    <button type="button" className="sp-pg-btn" onClick={() => onChange(total)}>{total}</button>
                </>
            )}

            <button
                type="button"
                className="sp-pg-btn"
                disabled={current === total}
                onClick={() => onChange(current + 1)}
                aria-label="Trang tiếp"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

/* ─────────────────────────────────────── main component ─── */
export default function SearchPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { token } = useAuthSession();

    /* URL state */
    const urlKeyword = searchParams.get('q') || '';
    const urlCategory = searchParams.get('category') || 'Tất cả';

    /* local filter state (synced from URL on mount) */
    const [keyword, setKeyword] = useState(urlKeyword);
    const [activeCategory, setActiveCategory] = useState(urlCategory);
    const [activeStatus, setActiveStatus] = useState('');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    /* data state */
    const [allPosts, setAllPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const sortDropdownRef = useRef(null);
    const inputRef = useRef(null);

    /* ── fetch all posts once ── */
    useEffect(() => {
        let cancelled = false;

        const loadPosts = async () => {
            setLoading(true);
            setError('');

            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            try {
                const raw = await fetchAllPosts(headers);
                if (cancelled) return;
                setAllPosts(raw.map(normalizePost));
            } catch (err) {
                if (!cancelled) setError(err.message || 'Không thể tải bài đăng.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadPosts();

        return () => { cancelled = true; };
    }, [token]);

    /* ── close sort dropdown on outside click ── */
    useEffect(() => {
        const handler = (e) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
                setShowSortDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── update URL when keyword / category change ── */
    const syncUrl = useCallback((kw, cat) => {
        const params = {};
        if (kw) params.q = kw;
        if (cat && cat !== 'Tất cả') params.category = cat;
        setSearchParams(params, { replace: true });
    }, [setSearchParams]);

    /* ── filter + sort logic ── */
    const filteredPosts = useMemo(() => {
        const kw = normalizeSearchText(keyword);
        const minPrice = Number(priceMin.replace(/\D/g, '')) || 0;
        const maxPrice = Number(priceMax.replace(/\D/g, '')) || Infinity;

        let result = allPosts.filter((p) => {
            const searchableText = normalizeSearchText([
                p.title,
                p.desc,
                p.category,
                p.location,
                p.author,
                p.statusLabel,
            ].join(' '));

            if (kw && !searchableText.includes(kw)) return false;
            if (activeCategory !== 'Tất cả' && p.category !== activeCategory) return false;
            if (activeStatus && p.statusKey !== activeStatus) return false;
            if (p.price < minPrice) return false;
            if (maxPrice !== Infinity && p.price > maxPrice) return false;
            return true;
        });

        switch (sortBy) {
            case 'newest': result.sort((a, b) => b.createdAt - a.createdAt); break;
            case 'oldest': result.sort((a, b) => a.createdAt - b.createdAt); break;
            case 'price_asc': result.sort((a, b) => a.price - b.price); break;
            case 'price_desc': result.sort((a, b) => b.price - a.price); break;
            case 'most_liked': result.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments)); break;
            default: break;
        }

        return result;
    }, [allPosts, keyword, activeCategory, activeStatus, priceMin, priceMax, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageSlice = filteredPosts.slice((safePage - 1) * POSTS_PER_PAGE, safePage * POSTS_PER_PAGE);

    const handleSearch = (e) => {
        e?.preventDefault();
        setPage(1);
        syncUrl(keyword, activeCategory);
    };

    const handleCategoryClick = (cat) => {
        setActiveCategory(cat.label);
        setPage(1);
        syncUrl(keyword, cat.label);
    };

    const handleReset = () => {
        setKeyword('');
        setActiveCategory('Tất cả');
        setActiveStatus('');
        setPriceMin('');
        setPriceMax('');
        setSortBy('newest');
        setPage(1);
        setSearchParams({}, { replace: true });
        inputRef.current?.focus();
    };

    const hasActiveFilters = keyword || activeCategory !== 'Tất cả' || activeStatus || priceMin || priceMax;

    const handleNavigate = useCallback((path, options) => {
        navigate(path, options);
    }, [navigate]);

    const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sắp xếp';

    return (
        <div className="search-page">
            {/* ── Topbar ── */}
            <header className="sp-header">
                <div className="sp-header-inner">
                    <button
                        type="button"
                        className="sp-back-btn"
                        onClick={() => navigate(-1)}
                        aria-label="Quay lại"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <form className="sp-search-form" onSubmit={handleSearch}>
                        <div className="sp-search-wrap">
                            <SearchIcon size={18} className="sp-search-icon" />
                            <input
                                ref={inputRef}
                                type="search"
                                className="sp-search-input"
                                placeholder="Tìm kiếm bài đăng..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                autoFocus
                            />
                            {keyword && (
                                <button
                                    type="button"
                                    className="sp-search-clear"
                                    onClick={() => { setKeyword(''); setPage(1); }}
                                    aria-label="Xóa từ khóa"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>
                        <button type="submit" className="sp-search-submit">
                            Tìm
                        </button>
                    </form>
                </div>

                {/* ── Category pills ── */}
                <div className="sp-cats-row">
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.label;
                        return (
                            <button
                                key={cat.label}
                                type="button"
                                className={`sp-cat-pill${isActive ? ' active' : ''}`}
                                style={isActive ? { borderColor: cat.color, color: cat.color } : {}}
                                onClick={() => handleCategoryClick(cat)}
                            >
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* ── Layout ── */}
            <div className="sp-layout">
                {/* Sidebar filters */}
                <aside className="sp-sidebar">
                    <div className="sp-sidebar-card">
                        <div className="sp-sidebar-title">
                            <span>Bộ lọc</span>
                            {hasActiveFilters && (
                                <button type="button" className="sp-reset-btn" onClick={handleReset}>
                                    <RotateCcw size={13} />
                                    Xóa hết
                                </button>
                            )}
                        </div>

                        {/* Status */}
                        <div className="sp-filter-group">
                            <label className="sp-filter-label">Trạng thái</label>
                            <div className="sp-filter-options">
                                {STATUS_OPTIONS.map((s) => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        className={`sp-filter-option${activeStatus === s.value ? ' active' : ''}`}
                                        onClick={() => { setActiveStatus(s.value); setPage(1); }}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price range */}
                        <div className="sp-filter-group">
                            <label className="sp-filter-label">Khoảng giá (VNĐ)</label>
                            <div className="sp-price-row">
                                <input
                                    type="text"
                                    className="sp-price-input"
                                    placeholder="Từ"
                                    value={priceMin}
                                    onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                                />
                                <span className="sp-price-sep">—</span>
                                <input
                                    type="text"
                                    className="sp-price-input"
                                    placeholder="Đến"
                                    value={priceMax}
                                    onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                                />
                            </div>
                        </div>

                        {/* Category in sidebar */}
                        <div className="sp-filter-group">
                            <label className="sp-filter-label">Danh mục</label>
                            <div className="sp-filter-cat-list">
                                {CATEGORIES.map((cat) => {
                                    const isActive = activeCategory === cat.label;
                                    return (
                                        <button
                                            key={cat.label}
                                            type="button"
                                            className={`sp-filter-cat${isActive ? ' active' : ''}`}
                                            onClick={() => handleCategoryClick(cat)}
                                        >
                                            <span className="sp-filter-cat-dot" style={{ background: cat.color }} />
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Quick nav */}
                    <nav className="sp-sidebar-card sp-quick-nav">
                        <div className="sp-sidebar-title">Điều hướng</div>
                        {NAV_ITEMS.map((item) => {
                            const NavIcon = item.icon;
                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    className="sp-nav-item"
                                    onClick={() => navigate(item.path)}
                                >
                                    <NavIcon size={16} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main content */}
                <main className="sp-main">
                    {/* Toolbar */}
                    <div className="sp-toolbar">
                        <div className="sp-result-count">
                            {loading ? (
                                <span className="sp-result-loading">Đang tải...</span>
                            ) : (
                                <span>
                                    <strong>{filteredPosts.length}</strong> bài đăng
                                    {keyword && <> cho "<em>{keyword}</em>"</>}
                                    {activeCategory !== 'Tất cả' && <> trong <em>{activeCategory}</em></>}
                                </span>
                            )}
                        </div>

                        <div className="sp-sort-wrap" ref={sortDropdownRef}>
                            <button
                                type="button"
                                className="sp-sort-btn"
                                onClick={() => setShowSortDropdown((v) => !v)}
                            >
                                <SortAsc size={15} />
                                <span>{currentSortLabel}</span>
                                <ChevronDown size={14} />
                            </button>
                            {showSortDropdown && (
                                <div className="sp-sort-dropdown">
                                    {SORT_OPTIONS.map((s) => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            className={`sp-sort-option${sortBy === s.value ? ' active' : ''}`}
                                            onClick={() => {
                                                setSortBy(s.value);
                                                setShowSortDropdown(false);
                                                setPage(1);
                                            }}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="sp-grid">
                            {Array.from({ length: 9 }, (_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : error ? (
                        <div className="sp-state-card">
                            <ShieldCheck size={36} opacity={0.4} />
                            <h2>Không thể tải bài đăng</h2>
                            <p>{error}</p>
                            <button
                                type="button"
                                className="sp-state-btn"
                                onClick={() => window.location.reload()}
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : filteredPosts.length === 0 ? (
                        <div className="sp-state-card">
                            <SearchIcon size={42} opacity={0.25} />
                            <h2>Không tìm thấy bài nào</h2>
                            <p>Thử điều chỉnh từ khóa hoặc bộ lọc để mở rộng kết quả tìm kiếm.</p>
                            {hasActiveFilters && (
                                <button type="button" className="sp-state-btn" onClick={handleReset}>
                                    <RotateCcw size={15} />
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="sp-grid">
                                {pageSlice.map((post) => (
                                    <PostCard key={post.id} post={post} onNavigate={handleNavigate} />
                                ))}
                            </div>
                            <Pagination
                                current={safePage}
                                total={totalPages}
                                onChange={(p) => {
                                    setPage(p);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
