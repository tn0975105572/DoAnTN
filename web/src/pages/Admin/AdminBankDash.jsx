import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    Heart,
    LayoutDashboard,
    Loader2,
    MessageCircle,
    PlusCircle,
    RefreshCw,
    Search,
    Sparkles,
    Store,
    Trash2,
    TrendingUp,
    UserRound,
    ExternalLink,
    Settings,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import PostMediaGallery from '../../components/post/PostMediaGallery';
import './AdminBankDash.css';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/200?u=admin-user';

const MANAGE_STATUSES = [
    { value: 'dang_ban', label: 'Đang bán' },
    { value: 'da_ban', label: 'Đã bán' },
    { value: 'da_trao_doi', label: 'Đã trao đổi' },
    { value: 'da_tang', label: 'Đã tặng' },
];

const STATUS_LABELS = {
    dang_ban: 'Đang bán',
    da_ban: 'Đã bán',
    da_trao_doi: 'Đã trao đổi',
    da_tang: 'Đã tặng',
    cho_duyet: 'Chờ duyệt',
};

const STATUS_TONES = {
    dang_ban: 'success',
    da_ban: 'danger',
    da_trao_doi: 'brand',
    da_tang: 'gold',
    cho_duyet: 'muted',
};

const getBackendOrigin = () => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        return 'http://localhost:3000';
    }
};

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const formatCurrency = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(numeric);
};

const formatDate = (value) => {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const normalizeAssetUrl = (raw, origin) => {
    if (!raw || typeof raw !== 'string') return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
            const parsed = new URL(raw);
            if (parsed.pathname.startsWith('/uploads/')) return `${origin}${parsed.pathname}`;
            return raw;
        } catch {
            return raw;
        }
    }
    const cleaned = raw.replace(/^\/+/, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('uploads/')) return `${origin}/${cleaned}`;
    return `${origin}/uploads/${cleaned}`;
};

const normalizeListing = (listing, origin) => {
    const images = (listing?.images || []).map((item) => normalizeAssetUrl(item, origin)).filter(Boolean);
    const primaryImage = normalizeAssetUrl(listing?.primaryImage, origin) || images[0] || DEFAULT_AVATAR;
    return {
        ...listing,
        images: images.length ? images : [primaryImage],
        primaryImage,
        statusLabel: STATUS_LABELS[listing?.status] || listing?.statusLabel || listing?.status || 'Không rõ',
        statusTone: STATUS_TONES[listing?.status] || 'muted',
    };
};

const normalizeProfilePayload = (payload, origin) => ({
    ...payload,
    user: {
        ...payload?.user,
        avatar: normalizeAssetUrl(payload?.user?.avatar, origin) || DEFAULT_AVATAR,
    },
    listings: {
        ...payload?.listings,
        items: (payload?.listings?.items || []).map((listing) => normalizeListing(listing, origin)),
        featured: (payload?.listings?.featured || []).map((listing) => normalizeListing(listing, origin)),
    },
    activity: payload?.activity || [],
});

const getEngagementScore = (listing) => Number(listing.likeCount || 0) * 3 + Number(listing.commentCount || 0) * 2;

const estimateTraffic = (listing) => {
    const likes = Number(listing.likeCount || 0);
    const comments = Number(listing.commentCount || 0);
    return likes * 18 + comments * 32 + (listing.status === 'dang_ban' ? 24 : 8);
};

function MetricCard({ icon: Icon, label, value, helper, tone = 'brand', delay = 0 }) {
    return (
        <article className={`bankdash-metric tone-${tone}`} style={{ '--delay': `${delay}ms` }}>
            <span className="bankdash-metric-icon">
                <Icon size={18} strokeWidth={2.2} />
            </span>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{helper}</small>
        </article>
    );
}

function SidebarStat({ label, value, helper, tone = 'brand' }) {
    return (
        <div className={`admin-sidebar-stat tone-${tone}`}>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{helper}</small>
        </div>
    );
}

export default function AdminBankDash() {
    const navigate = useNavigate();
    const viewerId = useMemo(() => localStorage.getItem('userId') || '', []);
    const token = useMemo(() => localStorage.getItem('token') || '', []);
    const origin = useMemo(() => getBackendOrigin(), []);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [profile, setProfile] = useState(null);
    const [selectedListingId, setSelectedListingId] = useState('');
    const [listingBusyId, setListingBusyId] = useState('');
    const [listingSearch, setListingSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortMode, setSortMode] = useState('engagement');

    const apiFetch = useCallback(async (path, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };
        const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
        return data;
    }, [token]);

    const loadDashboard = useCallback(async () => {
        if (!viewerId) {
            setError('Bạn cần đăng nhập để mở trang Admin.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const query = new URLSearchParams({ viewerId });
            const profileResponse = await apiFetch(`/profile/${viewerId}?${query.toString()}`);
            const normalizedProfile = normalizeProfilePayload(profileResponse?.data || profileResponse, origin);
            setProfile(normalizedProfile);
            setSelectedListingId((current) => {
                const listings = normalizedProfile?.listings?.items || [];
                if (!listings.length) return '';
                if (current && listings.some((item) => String(item.id) === String(current))) return current;
                return listings[0].id;
            });
        } catch (requestError) {
            console.error('Load admin dashboard failed', requestError);
            setError(requestError.message || 'Không thể tải trang Admin.');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, origin, viewerId]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        if (!feedback?.text) return undefined;
        const timer = window.setTimeout(() => setFeedback(null), 3000);
        return () => window.clearTimeout(timer);
    }, [feedback]);

    const listings = profile?.listings?.items || [];
    const selectedListing = useMemo(
        () => listings.find((listing) => String(listing.id) === String(selectedListingId)) || listings[0] || null,
        [listings, selectedListingId],
    );

    const analytics = useMemo(() => {
        const totalLikes = listings.reduce((sum, listing) => sum + Number(listing.likeCount || 0), 0);
        const totalComments = listings.reduce((sum, listing) => sum + Number(listing.commentCount || 0), 0);
        const estimatedTraffic = listings.reduce((sum, listing) => sum + estimateTraffic(listing), 0);
        const activeListings = listings.filter((listing) => listing.status === 'dang_ban').length;
        const topListings = [...listings].sort((left, right) => getEngagementScore(right) - getEngagementScore(left)).slice(0, 4);
        const statusRows = MANAGE_STATUSES.map((status) => {
            const count = listings.filter((listing) => listing.status === status.value).length;
            const percent = listings.length ? Math.round((count / listings.length) * 100) : 0;
            return { ...status, count, percent, tone: STATUS_TONES[status.value] || 'muted' };
        });
        return { totalLikes, totalComments, estimatedTraffic, activeListings, topListings, statusRows };
    }, [listings]);

    const filteredListings = useMemo(() => {
        const keyword = listingSearch.trim().toLowerCase();
        const next = listings.filter((listing) => {
            if (statusFilter !== 'all' && listing.status !== statusFilter) return false;
            if (!keyword) return true;
            return (listing.title || '').toLowerCase().includes(keyword)
                || (listing.categoryName || '').toLowerCase().includes(keyword)
                || (listing.location || '').toLowerCase().includes(keyword);
        });

        if (sortMode === 'latest') return next.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        if (sortMode === 'traffic') return next.sort((left, right) => estimateTraffic(right) - estimateTraffic(left));
        return next.sort((left, right) => getEngagementScore(right) - getEngagementScore(left));
    }, [listingSearch, listings, sortMode, statusFilter]);

    const opportunities = useMemo(() => {
        const items = [];
        if (analytics.activeListings < 3) items.push('Bạn đang có ít bài đăng đang bán. Hãy đẩy thêm tin mới để tăng độ phủ.');
        if (analytics.totalComments < Math.max(3, listings.length * 2)) items.push('Tỷ lệ bình luận còn thấp. Bổ sung ảnh cận cảnh và tiêu đề rõ hơn.');
        if (!items.length) items.push('Hiệu suất hiện tại khá ổn. Có thể thử đẩy thêm bài mới để mở rộng tiếp cận.');
        return items;
    }, [analytics.activeListings, analytics.totalComments, listings.length]);

    const handleStatusChange = useCallback(async (listingId, nextStatus) => {
        if (!listingId) return;
        setListingBusyId(String(listingId));
        try {
            await apiFetch(`/baidang/update/${listingId}`, {
                method: 'PUT',
                body: JSON.stringify({ trang_thai: nextStatus, thoi_gian_cap_nhat: new Date().toISOString() }),
            });
            setFeedback({ type: 'success', text: 'Đã cập nhật trạng thái bài đăng.' });
            await loadDashboard();
        } catch (requestError) {
            console.error('Update listing in admin failed', requestError);
            setFeedback({ type: 'error', text: requestError.message || 'Không thể cập nhật bài đăng.' });
        } finally {
            setListingBusyId('');
        }
    }, [apiFetch, loadDashboard]);

    const handleDeleteListing = useCallback(async (listingId) => {
        if (!listingId) return;
        if (!window.confirm('Bạn chắc chắn muốn xóa bài đăng này?')) return;
        setListingBusyId(String(listingId));
        try {
            await apiFetch(`/baidang/delete/${listingId}`, { method: 'DELETE' });
            setFeedback({ type: 'success', text: 'Đã xóa bài đăng.' });
            await loadDashboard();
        } catch (requestError) {
            console.error('Delete listing in admin failed', requestError);
            setFeedback({ type: 'error', text: requestError.message || 'Không thể xóa bài đăng.' });
        } finally {
            setListingBusyId('');
        }
    }, [apiFetch, loadDashboard]);

    if (loading && !profile) {
        return (
            <div className="admin-page">
                <div className="admin-board">
                    <div className="admin-state-card">
                        <Loader2 size={28} className="spin" />
                        <h1>Đang dựng trung tâm Admin</h1>
                        <p>Mình đang nạp bài đăng, thống kê hiệu suất và dữ liệu cần thiết cho dashboard.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="admin-page">
                <div className="admin-board">
                    <div className="admin-state-card">
                        <Store size={28} />
                        <h1>Không mở được trang Admin</h1>
                        <p>{error}</p>
                        <div className="admin-inline-actions">
                            {!viewerId && <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/login')}>Đăng nhập</button>}
                            <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/profile')}>Quay lại hồ sơ</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="admin-page">
            <div className="admin-board">
                <aside className="admin-sidebar">
                    <div className="admin-brand">
                        <div className="admin-brand-mark"><Store size={22} /></div>
                        <div className="admin-brand-copy">
                            <strong>OLODO Admin</strong>
                            <span>Post management studio</span>
                        </div>
                    </div>

                    <div className="admin-sidebar-card admin-profile-card">
                        <img src={profile?.user?.avatar || DEFAULT_AVATAR} alt={profile?.user?.fullName || 'Quản trị viên'} />
                        <div>
                            <strong>{profile?.user?.fullName || 'Quản trị viên'}</strong>
                            <span>{profile?.user?.email || 'Trung tâm điều hành bài đăng'}</span>
                        </div>
                        <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/profile')}>
                            <UserRound size={16} />
                            Hồ sơ
                        </button>
                    </div>

                    <div className="admin-sidebar-stack">
                        <SidebarStat label="Bài đăng" value={formatNumber(listings.length)} helper="đang theo dõi" tone="brand" />
                        <SidebarStat label="Quan tâm" value={formatNumber(analytics.totalLikes + analytics.totalComments)} helper="lượt thích và bình luận" tone="success" />
                        <SidebarStat label="Tiếp cận" value={formatNumber(analytics.estimatedTraffic)} helper="ước tính từ tương tác" tone="gold" />
                    </div>

                    <div className="admin-sidebar-footer">
                        <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/create-post')}>
                            <PlusCircle size={16} />
                            Đăng bài mới
                        </button>
                        <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/settings')}>
                            <Settings size={16} />
                            Cài đặt
                        </button>
                        <button type="button" className="admin-btn admin-btn-soft" onClick={loadDashboard}>
                            <RefreshCw size={16} />
                            Làm mới
                        </button>
                    </div>
                </aside>

                <main className="admin-workspace">
                    <header className="admin-topbar admin-card">
                        <div className="admin-topbar-copy">
                            <span className="admin-kicker">BankDash inspired</span>
                            <h1>Quản lý bài đăng</h1>
                            <p>Giao diện tập trung vào bài đăng, giữ khoảng trắng thoáng và chia khối rõ ràng để đỡ rối mắt.</p>
                        </div>

                        <div className="admin-topbar-actions">
                            <label className="admin-search" htmlFor="admin-search-input">
                                <Search size={16} />
                                <input
                                    id="admin-search-input"
                                    type="text"
                                    value={listingSearch}
                                    onChange={(event) => setListingSearch(event.target.value)}
                                    placeholder="Tìm bài đăng, danh mục hoặc vị trí"
                                />
                            </label>
                            <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/create-post')}>
                                <PlusCircle size={16} />
                                Đăng bài mới
                            </button>
                        </div>
                    </header>

                    {feedback?.text && <div className={`admin-feedback ${feedback.type || 'info'}`}>{feedback.text}</div>}

                    <section className="admin-metrics-grid">
                        <MetricCard icon={LayoutDashboard} label="Bài đăng đang bán" value={formatNumber(analytics.activeListings)} helper={`${formatNumber(listings.length)} bài đang được theo dõi`} tone="brand" delay={0} />
                        <MetricCard icon={Heart} label="Tổng quan tâm" value={formatNumber(analytics.totalLikes + analytics.totalComments)} helper={`${formatNumber(analytics.totalLikes)} thích · ${formatNumber(analytics.totalComments)} bình luận`} tone="success" delay={80} />
                        <MetricCard icon={TrendingUp} label="Tiếp cận ước tính" value={formatNumber(analytics.estimatedTraffic)} helper="Tính từ tương tác và hoạt động bán hàng" tone="gold" delay={160} />
                        <MetricCard icon={MessageCircle} label="Bài nổi bật" value={formatNumber(analytics.topListings.length)} helper="dựa trên tương tác gần đây" tone="danger" delay={240} />
                    </section>

                    <div className="admin-main-grid">
                        <section className="admin-card admin-featured-card">
                            <div className="admin-card-head">
                                <div>
                                    <span className="admin-section-tag">Featured post</span>
                                    <h2>Bài đăng trọng tâm</h2>
                                    <p>Khung xem nhanh một bài nổi bật để kiểm tra hình ảnh, trạng thái và hiệu suất trước khi thao tác.</p>
                                </div>
                                {selectedListing && (
                                    <button type="button" className="admin-text-link" onClick={() => navigate(`/post/${selectedListing.id}`)}>
                                        Mở chi tiết
                                    </button>
                                )}
                            </div>

                            {selectedListing ? (
                                <div className="admin-featured-layout">
                                    <div className="admin-featured-media">
                                        <PostMediaGallery
                                            images={selectedListing.images}
                                            title={selectedListing.title}
                                            badge={formatCurrency(selectedListing.price)}
                                            interactive
                                            onOpen={() => navigate(`/post/${selectedListing.id}`)}
                                        />
                                    </div>
                                    <div className="admin-featured-body">
                                        <div className="admin-inline-badges">
                                            <span className={`admin-pill tone-${selectedListing.statusTone}`}>{selectedListing.statusLabel}</span>
                                            {selectedListing.categoryName && <span className="admin-pill tone-ghost">{selectedListing.categoryName}</span>}
                                            {selectedListing.postTypeName && <span className="admin-pill tone-ghost">{selectedListing.postTypeName}</span>}
                                        </div>
                                        <h3>{selectedListing.title}</h3>
                                        <div className="admin-price">{formatCurrency(selectedListing.price)}</div>
                                        <p>{selectedListing.description || 'Bài đăng này chưa có mô tả chi tiết.'}</p>
                                        <div className="admin-meta-grid">
                                            <div><span>Đã đăng</span><strong>{formatDate(selectedListing.createdAt)}</strong></div>
                                            <div><span>Vị trí</span><strong>{selectedListing.location || 'Chưa có vị trí'}</strong></div>
                                            <div><span>Tiếp cận</span><strong>{formatNumber(estimateTraffic(selectedListing))}</strong></div>
                                            <div><span>Tương tác</span><strong>{formatNumber(getEngagementScore(selectedListing))}</strong></div>
                                        </div>
                                        <div className="admin-stat-inline">
                                            <span><Heart size={14} /> {formatNumber(selectedListing.likeCount)} thích</span>
                                            <span><MessageCircle size={14} /> {formatNumber(selectedListing.commentCount)} bình luận</span>
                                            <span><BarChart3 size={14} /> {formatNumber(estimateTraffic(selectedListing))} tiếp cận ước tính</span>
                                        </div>
                                        <div className="admin-inline-actions">
                                            <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate(`/post/${selectedListing.id}`)}>
                                                <ExternalLink size={16} />
                                                Xem bài đăng
                                            </button>
                                            <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate(`/post/${selectedListing.id}/comments`)}>
                                                <MessageCircle size={16} />
                                                Mở bình luận
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="admin-empty-note">Bạn chưa có bài đăng nào để quản lý. Hãy tạo bài đầu tiên để bắt đầu dashboard.</div>
                            )}
                        </section>

                        <aside className="admin-side-column">
                            <section className="admin-card">
                                <div className="admin-card-head">
                                    <div>
                                        <span className="admin-section-tag">Insights</span>
                                        <h2>Phân tích nhanh</h2>
                                        <p>Trạng thái bài đăng và danh sách hiệu suất cao nhất được đặt riêng để không làm rối khu vực chính.</p>
                                    </div>
                                </div>

                                <div className="admin-status-list">
                                    {analytics.statusRows.map((row) => (
                                        <div key={row.value} className="admin-status-row">
                                            <div className="admin-status-copy">
                                                <strong>{row.label}</strong>
                                                <span>{formatNumber(row.count)} bài</span>
                                            </div>
                                            <div className="admin-status-bar">
                                                <div className={`tone-${row.tone}`} style={{ width: `${row.percent}%` }} />
                                            </div>
                                            <small>{row.percent}%</small>
                                        </div>
                                    ))}
                                </div>

                                <div className="admin-top-list">
                                    <div className="admin-section-caption">
                                        <Sparkles size={14} />
                                        Top bài có hiệu suất cao
                                    </div>
                                    {analytics.topListings.length > 0 ? (
                                        analytics.topListings.map((listing) => (
                                            <button
                                                key={listing.id}
                                                type="button"
                                                className={`admin-top-item${String(selectedListing?.id) === String(listing.id) ? ' active' : ''}`}
                                                onClick={() => setSelectedListingId(listing.id)}
                                            >
                                                <span>{listing.title}</span>
                                                <strong>{formatNumber(getEngagementScore(listing))} điểm</strong>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="admin-empty-note compact">Top hiệu suất sẽ xuất hiện khi bạn có thêm dữ liệu tương tác.</div>
                                    )}
                                </div>
                            </section>

                            <section className="admin-card">
                                <div className="admin-card-head">
                                    <div>
                                        <span className="admin-section-tag">Opportunities</span>
                                        <h2>Cơ hội tối ưu hôm nay</h2>
                                        <p>Những gợi ý ngắn để bạn xử lý nhanh các điểm có thể làm tăng tỷ lệ chốt đơn.</p>
                                    </div>
                                </div>

                                <div className="admin-opportunity-list">
                                    {opportunities.map((item) => (
                                        <div key={item} className="admin-opportunity-item">
                                            <Sparkles size={15} />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="admin-side-actions">
                                    <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/settings')}>
                                        <Settings size={16} />
                                        Cài đặt tài khoản
                                    </button>
                                    <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/create-post')}>
                                        <ArrowRight size={16} />
                                        Tạo thêm bài mới
                                    </button>
                                </div>
                            </section>
                        </aside>
                        <section className="admin-card admin-board-card">
                            <div className="admin-card-head">
                                <div>
                                    <span className="admin-section-tag">Board</span>
                                    <h2>Bảng quản lý bài đăng</h2>
                                    <p>Lọc nhanh, đổi trạng thái và mở bài đăng ngay trong một bố cục gọn hơn.</p>
                                </div>
                                <div className="admin-section-chip">{formatNumber(filteredListings.length)} bài</div>
                            </div>

                            <div className="admin-toolbar">
                                <input type="text" value={listingSearch} onChange={(event) => setListingSearch(event.target.value)} placeholder="Tìm theo tiêu đề, danh mục hoặc vị trí" />
                                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                    <option value="all">Tất cả trạng thái</option>
                                    {MANAGE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                                </select>
                                <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                                    <option value="engagement">Ưu tiên tương tác</option>
                                    <option value="traffic">Ưu tiên tiếp cận</option>
                                    <option value="latest">Mới nhất</option>
                                </select>
                            </div>

                            <div className="admin-post-list">
                                {filteredListings.length > 0 ? (
                                    filteredListings.map((listing, index) => (
                                        <article key={listing.id} className="admin-post-row" style={{ '--delay': `${index * 50}ms` }}>
                                            <button type="button" className="admin-post-thumb" onClick={() => setSelectedListingId(listing.id)}>
                                                <PostMediaGallery images={listing.images} title={listing.title} interactive={false} maxVisible={3} />
                                            </button>
                                            <div className="admin-post-copy">
                                                <div className="admin-inline-badges">
                                                    <span className={`admin-pill tone-${listing.statusTone}`}>{listing.statusLabel}</span>
                                                    {listing.categoryName && <span className="admin-pill tone-ghost">{listing.categoryName}</span>}
                                                </div>
                                                <strong>{listing.title}</strong>
                                                <span>{formatCurrency(listing.price)}</span>
                                                <small>{listing.location || 'Chưa có vị trí'} · {formatNumber(listing.likeCount)} thích · {formatNumber(listing.commentCount)} bình luận</small>
                                            </div>
                                            <div className="admin-post-stats">
                                                <div><label>Tương tác</label><strong>{formatNumber(getEngagementScore(listing))}</strong></div>
                                                <div><label>Tiếp cận</label><strong>{formatNumber(estimateTraffic(listing))}</strong></div>
                                            </div>
                                            <div className="admin-post-controls">
                                                <select value={listing.status} onChange={(event) => handleStatusChange(listing.id, event.target.value)} disabled={listingBusyId === String(listing.id)}>
                                                    {MANAGE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                                                </select>
                                                <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate(`/post/${listing.id}`)}>
                                                    <ExternalLink size={16} />
                                                    Xem
                                                </button>
                                                <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate(`/post/${listing.id}/comments`)}>
                                                    <MessageCircle size={16} />
                                                    Bình luận
                                                </button>
                                                <button type="button" className="admin-icon-danger" onClick={() => handleDeleteListing(listing.id)} disabled={listingBusyId === String(listing.id)}>
                                                    {listingBusyId === String(listing.id) ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        </article>
                                    ))
                                ) : (
                                    <div className="admin-empty-note">Không có bài đăng nào khớp với bộ lọc hiện tại.</div>
                                )}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
