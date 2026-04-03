import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    Heart,
    LayoutDashboard,
    Loader2,
    MessageCircle,
    MessageSquareText,
    PlusCircle,
    Search,
    RefreshCw,
    Send,
    Settings,
    Sparkles,
    Store,
    Trash2,
    TrendingUp,
    UserRound,
    ExternalLink,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import PostMediaGallery from '../../components/post/PostMediaGallery';
import './Admin.css';

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
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 'Liên hệ';
    }

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(numeric);
};

const formatDate = (value, withTime = false) => {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

    return date.toLocaleString(
        'vi-VN',
        withTime
            ? {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }
            : {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            },
    );
};

const formatRelativeTime = (value) => {
    if (!value) return 'Vừa xong';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Vừa xong';

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return formatDate(date, true);
};

const normalizeAssetUrl = (raw, backendOrigin) => {
    if (!raw || typeof raw !== 'string') return '';

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
            const url = new URL(raw);
            if (url.pathname.startsWith('/uploads/')) {
                return `${backendOrigin}${url.pathname}`;
            }
            return raw;
        } catch {
            return raw;
        }
    }

    const cleaned = raw.replace(/^\/+/, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('uploads/')) {
        return `${backendOrigin}/${cleaned}`;
    }

    return `${backendOrigin}/uploads/${cleaned}`;
};

const normalizeListing = (listing, backendOrigin) => {
    const images = (listing?.images || [])
        .map((item) => normalizeAssetUrl(item, backendOrigin))
        .filter(Boolean);
    const primaryImage = normalizeAssetUrl(listing?.primaryImage, backendOrigin) || images[0] || DEFAULT_AVATAR;

    return {
        ...listing,
        images: images.length ? images : [primaryImage],
        primaryImage,
        statusLabel: STATUS_LABELS[listing?.status] || listing?.statusLabel || listing?.status || 'Không rõ',
        statusTone: STATUS_TONES[listing?.status] || 'muted',
    };
};

const normalizeProfilePayload = (payload, backendOrigin) => ({
    ...payload,
    user: {
        ...payload?.user,
        avatar: normalizeAssetUrl(payload?.user?.avatar, backendOrigin) || DEFAULT_AVATAR,
    },
    listings: {
        ...payload?.listings,
        items: (payload?.listings?.items || []).map((listing) => normalizeListing(listing, backendOrigin)),
        featured: (payload?.listings?.featured || []).map((listing) => normalizeListing(listing, backendOrigin)),
    },
    activity: payload?.activity || [],
});

const normalizeConversation = (conversation, backendOrigin) => ({
    id: conversation.conversation_id,
    type: conversation.conversation_type,
    name: conversation.conversation_name || 'Người dùng',
    avatar: normalizeAssetUrl(conversation.conversation_avatar, backendOrigin) || `https://i.pravatar.cc/120?u=${encodeURIComponent(conversation.conversation_id || 'chat')}`,
    lastMessage: conversation.last_message || '',
    lastAt: conversation.last_message_time ? new Date(conversation.last_message_time) : null,
    unread: Number(conversation.unread_count || 0),
});

const normalizeMessage = (message, viewerId, backendOrigin) => ({
    id: message.ID_TinNhan,
    sender: String(message.ID_NguoiGui) === String(viewerId) ? 'me' : 'them',
    text: message.noi_dung || '',
    time: formatRelativeTime(message.thoi_gian_gui),
    image: message.file_dinh_kem ? normalizeAssetUrl(message.file_dinh_kem, backendOrigin) : '',
});

const getEngagementScore = (listing) => Number(listing.likeCount || 0) * 3 + Number(listing.commentCount || 0) * 2;

const estimateTraffic = (listing) => {
    const likes = Number(listing.likeCount || 0);
    const comments = Number(listing.commentCount || 0);
    const liveBoost = listing.status === 'dang_ban' ? 24 : 8;

    return likes * 18 + comments * 32 + liveBoost;
};

const buildPostNavigationState = (listing, user) => {
    if (!listing) return null;

    return {
        id: listing.id,
        authorId: listing.userId || user?.id || '',
        author: user?.name || user?.fullName || 'Người dùng OLODO',
        avatar: user?.avatar || DEFAULT_AVATAR,
        title: listing.title || 'Bài đăng',
        desc: listing.description || '',
        description: listing.description || '',
        price: listing.price || 0,
        img: listing.primaryImage || listing.images?.[0] || DEFAULT_AVATAR,
        imageUrls: listing.images || [],
        location: listing.location || '',
        createdAt: listing.createdAt || '',
        time: formatDate(listing.createdAt, true),
        category: listing.categoryName || '',
        postTypeName: listing.postTypeName || '',
        status: listing.status || '',
        trang_thai: listing.status || '',
        likes: Number(listing.likeCount || 0),
        comments: Number(listing.commentCount || 0),
    };
};

const buildQuickReplies = (selectedListing) => {
    const listingName = selectedListing?.title || 'bài đăng này';

    return [
        `Bài "${listingName}" vẫn còn nhé bạn.`,
        'Mình có thể gửi thêm ảnh cận cảnh ngay bây giờ.',
        'Bạn muốn qua xem trực tiếp hay mình hỗ trợ giao nhận?',
        'Nếu bạn chốt hôm nay mình sẽ giữ bài cho bạn.',
        'Giá hiện tại mình còn hỗ trợ thương lượng nhẹ.',
    ];
};

function MetricCard({ icon: Icon, label, value, helper, tone = 'brand', delay = 0 }) {
    return (
        <article className={`admin-metric tone-${tone}`} style={{ '--delay': `${delay}ms` }}>
            <span className="admin-metric-icon">
                <Icon size={18} strokeWidth={2.2} />
            </span>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{helper}</small>
        </article>
    );
}

const ADMIN_SECTIONS = [
    {
        key: 'posts',
        label: 'Bài đăng',
        helper: 'Điều hành bài và trạng thái',
        icon: Store,
        title: 'Quản lý bài đăng',
        description: 'Không gian ưu tiên cho thao tác duyệt, cập nhật và xoá bài đăng.',
    },
    {
        key: 'overview',
        label: 'Tổng quan',
        helper: 'Nhìn nhanh hiệu suất',
        icon: LayoutDashboard,
        title: 'Tổng quan vận hành',
        description: 'Tóm lược số liệu, bài trọng tâm và các chỉ báo cần chú ý nhất.',
    },
    {
        key: 'inbox',
        label: 'Inbox',
        helper: 'Trả lời khách nhanh',
        icon: MessageSquareText,
        title: 'Inbox bán hàng',
        description: 'Theo dõi hội thoại, trả lời nhanh và giữ nhịp chăm sóc khách.',
    },
    {
        key: 'insights',
        label: 'Phân tích',
        helper: 'Biểu đồ và cơ hội',
        icon: BarChart3,
        title: 'Phân tích hiệu suất',
        description: 'Xem trạng thái bài đăng, top bài và cơ hội tối ưu trong ngày.',
    },
];

function SectionNavItem({ item, active, index, onClick }) {
    const Icon = item.icon;

    return (
        <button
            type="button"
            className={`admin-nav-item${active ? ' active' : ''}`}
            onClick={onClick}
            style={{ '--delay': `${index * 60}ms` }}
        >
            <span className="admin-nav-icon">
                <Icon size={17} strokeWidth={2.2} />
            </span>
            <span className="admin-nav-copy">
                <strong>{item.label}</strong>
                <small>{item.helper}</small>
            </span>
        </button>
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

export default function Admin() {
    const navigate = useNavigate();
    const viewerId = useMemo(() => localStorage.getItem('userId') || '', []);
    const token = useMemo(() => localStorage.getItem('token') || '', []);
    const backendOrigin = useMemo(() => getBackendOrigin(), []);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [profile, setProfile] = useState(null);
    const [selectedListingId, setSelectedListingId] = useState('');
    const [listingBusyId, setListingBusyId] = useState('');
    const [listingSearch, setListingSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortMode, setSortMode] = useState('engagement');
    const [activeSection, setActiveSection] = useState('posts');

    const [conversations, setConversations] = useState([]);
    const [selectedConversationId, setSelectedConversationId] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatDraft, setChatDraft] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

    const apiFetch = useCallback(async (path, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };

        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
        }

        return data;
    }, [token]);

    const loadDashboard = useCallback(async () => {
        if (!viewerId) {
            setError('Bạn cần đăng nhập để mở trung tâm Admin.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const query = new URLSearchParams({ viewerId });
            const [profileResponse, conversationResponse] = await Promise.all([
                apiFetch(`/profile/${viewerId}?${query.toString()}`),
                apiFetch(`/tinnhan/conversations/${viewerId}`),
            ]);

            const normalizedProfile = normalizeProfilePayload(profileResponse?.data || profileResponse, backendOrigin);
            const privateConversations = (conversationResponse?.data || [])
                .map((conversation) => normalizeConversation(conversation, backendOrigin))
                .filter((conversation) => conversation.type === 'private');

            setProfile(normalizedProfile);
            setConversations(privateConversations);
            setSelectedListingId((current) => {
                const listings = normalizedProfile?.listings?.items || [];
                if (!listings.length) return '';
                if (current && listings.some((item) => String(item.id) === String(current))) {
                    return current;
                }
                return listings[0].id;
            });
            setSelectedConversationId((current) => {
                if (current && privateConversations.some((item) => String(item.id) === String(current))) {
                    return current;
                }
                return privateConversations[0]?.id || '';
            });
        } catch (requestError) {
            console.error('Load admin dashboard failed', requestError);
            setError(requestError.message || 'Không thể tải trang Admin.');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, backendOrigin, viewerId]);

    const loadMessages = useCallback(async (conversationId) => {
        if (!viewerId || !conversationId) {
            setChatMessages([]);
            return;
        }

        setLoadingMessages(true);
        try {
            const response = await apiFetch(`/tinnhan/private/${viewerId}/${conversationId}?limit=50&offset=0`);
            const rows = response?.data || [];
            const normalized = rows
                .slice()
                .reverse()
                .map((message) => normalizeMessage(message, viewerId, backendOrigin));
            setChatMessages(normalized);
        } catch (requestError) {
            console.error('Load admin messages failed', requestError);
            setChatMessages([]);
            setFeedback({ type: 'error', text: requestError.message || 'Không thể tải tin nhắn.' });
        } finally {
            setLoadingMessages(false);
        }
    }, [apiFetch, backendOrigin, viewerId]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        if (!selectedConversationId) {
            setChatMessages([]);
            return;
        }

        loadMessages(selectedConversationId);
    }, [loadMessages, selectedConversationId]);

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
    const selectedConversation = useMemo(
        () => conversations.find((conversation) => String(conversation.id) === String(selectedConversationId)) || null,
        [conversations, selectedConversationId],
    );
    const activeSectionMeta = ADMIN_SECTIONS.find((section) => section.key === activeSection) || ADMIN_SECTIONS[0];

    const analytics = useMemo(() => {
        const totalLikes = listings.reduce((sum, listing) => sum + Number(listing.likeCount || 0), 0);
        const totalComments = listings.reduce((sum, listing) => sum + Number(listing.commentCount || 0), 0);
        const estimatedTraffic = listings.reduce((sum, listing) => sum + estimateTraffic(listing), 0);
        const activeListings = listings.filter((listing) => listing.status === 'dang_ban').length;
        const topListings = [...listings]
            .sort((left, right) => getEngagementScore(right) - getEngagementScore(left))
            .slice(0, 4);
        const statusRows = MANAGE_STATUSES.map((status) => {
            const count = listings.filter((listing) => listing.status === status.value).length;
            const percent = listings.length ? Math.round((count / listings.length) * 100) : 0;
            return {
                ...status,
                count,
                percent,
                tone: STATUS_TONES[status.value] || 'muted',
            };
        });

        return {
            totalLikes,
            totalComments,
            estimatedTraffic,
            activeListings,
            topListings,
            statusRows,
        };
    }, [listings]);

    const filteredListings = useMemo(() => {
        const keyword = listingSearch.trim().toLowerCase();
        const next = listings.filter((listing) => {
            if (statusFilter !== 'all' && listing.status !== statusFilter) return false;
            if (!keyword) return true;
            return (
                (listing.title || '').toLowerCase().includes(keyword)
                || (listing.categoryName || '').toLowerCase().includes(keyword)
                || (listing.location || '').toLowerCase().includes(keyword)
            );
        });

        if (sortMode === 'latest') {
            return next.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        }

        if (sortMode === 'traffic') {
            return next.sort((left, right) => estimateTraffic(right) - estimateTraffic(left));
        }

        return next.sort((left, right) => getEngagementScore(right) - getEngagementScore(left));
    }, [listingSearch, listings, sortMode, statusFilter]);

    const opportunities = useMemo(() => {
        const suggestions = [];

        if (analytics.activeListings < 3) {
            suggestions.push('Bạn đang có ít bài đăng đang bán. Tăng thêm tin mới để giữ nhịp hiển thị.');
        }

        if (analytics.totalComments < Math.max(3, listings.length * 2)) {
            suggestions.push('Tỷ lệ bình luận còn thấp. Hãy thử làm tiêu đề rõ hơn và bổ sung ảnh cận cảnh.');
        }

        if (conversations.some((conversation) => conversation.unread > 0)) {
            suggestions.push('Bạn đang có khách nhắn chưa đọc. Trả lời sớm sẽ tăng khả năng chốt đơn.');
        }

        if (!suggestions.length) {
            suggestions.push('Hiệu suất hiện tại khá ổn. Bạn có thể thử đẩy thêm bài mới để mở rộng tiếp cận.');
        }

        return suggestions;
    }, [analytics.activeListings, analytics.totalComments, conversations, listings.length]);

    const openPostDetail = useCallback((listing) => {
        if (!listing?.id) return;
        navigate(`/post/${listing.id}`, {
            state: {
                post: buildPostNavigationState(listing, profile?.user),
            },
        });
    }, [navigate, profile?.user]);

    const openPostComments = useCallback((listing) => {
        if (!listing?.id) return;
        navigate(`/post/${listing.id}/comments`, {
            state: {
                post: buildPostNavigationState(listing, profile?.user),
            },
        });
    }, [navigate, profile?.user]);

    const handleStatusChange = useCallback(async (listingId, nextStatus) => {
        if (!listingId) return;
        setListingBusyId(String(listingId));

        try {
            await apiFetch(`/baidang/update/${listingId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    trang_thai: nextStatus,
                    thoi_gian_cap_nhat: new Date().toISOString(),
                }),
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
        const confirmed = window.confirm('Bạn chắc chắn muốn xóa bài đăng này?');
        if (!confirmed) return;

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

    const handleSendMessage = useCallback(async () => {
        if (!viewerId || !selectedConversation?.id || !chatDraft.trim() || sendingMessage) return;

        setSendingMessage(true);
        try {
            await apiFetch('/tinnhan/send', {
                method: 'POST',
                body: JSON.stringify({
                    ID_NguoiGui: viewerId,
                    ID_NguoiNhan: selectedConversation.id,
                    noi_dung: chatDraft.trim(),
                }),
            });
            setChatDraft('');
            await Promise.all([
                loadMessages(selectedConversation.id),
                loadDashboard(),
            ]);
        } catch (requestError) {
            console.error('Send admin message failed', requestError);
            setFeedback({ type: 'error', text: requestError.message || 'Không thể gửi tin nhắn.' });
        } finally {
            setSendingMessage(false);
        }
    }, [apiFetch, chatDraft, loadDashboard, loadMessages, selectedConversation?.id, sendingMessage, viewerId]);

    const quickReplies = useMemo(() => buildQuickReplies(selectedListing), [selectedListing]);
    const filteredConversations = useMemo(() => {
        const keyword = listingSearch.trim().toLowerCase();
        if (!keyword) return conversations;

        return conversations.filter((conversation) => (
            (conversation.name || '').toLowerCase().includes(keyword)
            || (conversation.lastMessage || '').toLowerCase().includes(keyword)
        ));
    }, [conversations, listingSearch]);

    const sidebarStats = useMemo(() => ([
        {
            label: 'Bài đăng',
            value: formatNumber(listings.length),
            helper: 'đang theo dõi',
            tone: 'brand',
        },
        {
            label: 'Chưa đọc',
            value: formatNumber(conversations.filter((item) => item.unread > 0).length),
            helper: 'hội thoại cần xử lý',
            tone: 'danger',
        },
        {
            label: 'Quan tâm',
            value: formatNumber(analytics.totalLikes + analytics.totalComments),
            helper: 'lượt thích và bình luận',
            tone: 'success',
        },
    ]), [analytics.totalComments, analytics.totalLikes, conversations, listings.length]);

    if (loading && !profile) {
        return (
            <div className="admin-page">
                <div className="admin-shell">
                    <div className="admin-state-card">
                        <Loader2 size={28} className="spin" />
                        <h1>Đang dựng trung tâm Admin</h1>
                        <p>Mình đang nạp bài đăng, thống kê hiệu suất và inbox bán hàng của bạn.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="admin-page">
                <div className="admin-shell">
                    <div className="admin-state-card">
                        <Store size={28} />
                        <h1>Không mở được trang Admin</h1>
                        <p>{error}</p>
                        <div className="admin-inline-actions">
                            {!viewerId && (
                                <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/login')}>
                                    Đăng nhập
                                </button>
                            )}
                            <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/profile')}>
                                Quay lại hồ sơ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-shell">
                <section className="admin-hero">
                    <div className="admin-hero-copy">
                        <span className="admin-kicker">Admin Studio</span>
                        <h1>Trung tâm vận hành bài đăng và inbox bán hàng</h1>
                        <p>
                            Một nơi để theo dõi hiệu suất tin đăng, quản lý trạng thái, đọc tin nhắn khách quan tâm
                            và xử lý nhanh những việc thường lặp lại.
                        </p>
                        <div className="admin-hero-note">
                            <Sparkles size={16} />
                            Tiếp cận đang hiển thị theo dạng ước tính từ lượt thích, bình luận và lượng hội thoại vì hệ thống chưa có bộ đếm view riêng.
                        </div>
                    </div>

                    <div className="admin-hero-actions">
                        <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/create-post')}>
                            <PlusCircle size={16} />
                            Đăng bài mới
                        </button>
                        <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/profile')}>
                            <UserRound size={16} />
                            Về hồ sơ
                        </button>
                        <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/messages')}>
                            <MessageSquareText size={16} />
                            Trang tin nhắn
                        </button>
                        <button type="button" className="admin-btn admin-btn-ghost" onClick={loadDashboard}>
                            <RefreshCw size={16} />
                            Làm mới
                        </button>
                    </div>
                </section>

                {feedback?.text && (
                    <div className={`admin-feedback ${feedback.type || 'info'}`}>
                        {feedback.text}
                    </div>
                )}

                <section className="admin-metrics-grid">
                    <MetricCard
                        icon={LayoutDashboard}
                        label="Bài đăng đang bán"
                        value={formatNumber(analytics.activeListings)}
                        helper={`${formatNumber(listings.length)} bài đang được theo dõi`}
                        tone="brand"
                    />
                    <MetricCard
                        icon={Heart}
                        label="Tổng quan tâm"
                        value={formatNumber(analytics.totalLikes + analytics.totalComments)}
                        helper={`${formatNumber(analytics.totalLikes)} thích · ${formatNumber(analytics.totalComments)} bình luận`}
                        tone="success"
                    />
                    <MetricCard
                        icon={TrendingUp}
                        label="Tiếp cận ước tính"
                        value={formatNumber(analytics.estimatedTraffic)}
                        helper="Tính từ tương tác và hoạt động bán hàng"
                        tone="gold"
                    />
                    <MetricCard
                        icon={MessageSquareText}
                        label="Cuộc trò chuyện"
                        value={formatNumber(conversations.length)}
                        helper={`${formatNumber(conversations.filter((item) => item.unread > 0).length)} hội thoại chưa đọc`}
                        tone="danger"
                    />
                </section>

                <div className="admin-layout">
                    <main className="admin-main-column">
                        <section className="admin-card">
                            <div className="admin-card-head">
                                <div>
                                    <h2>Bài đăng trọng tâm</h2>
                                    <p>Bạn có thể chọn bất kỳ bài nào bên dưới để xem nhanh hiệu suất và đi tới các thao tác chính.</p>
                                </div>
                                {selectedListing && (
                                    <button type="button" className="admin-text-link" onClick={() => openPostDetail(selectedListing)}>
                                        Mở chi tiết
                                    </button>
                                )}
                            </div>

                            {selectedListing ? (
                                <div className="admin-featured-grid">
                                    <div className="admin-featured-media">
                                        <PostMediaGallery
                                            images={selectedListing.images}
                                            title={selectedListing.title}
                                            badge={formatCurrency(selectedListing.price)}
                                            interactive
                                            onOpen={() => openPostDetail(selectedListing)}
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

                                        <div className="admin-stat-inline">
                                            <span><Heart size={14} /> {formatNumber(selectedListing.likeCount)} thích</span>
                                            <span><MessageCircle size={14} /> {formatNumber(selectedListing.commentCount)} bình luận</span>
                                            <span><BarChart3 size={14} /> {formatNumber(estimateTraffic(selectedListing))} tiếp cận ước tính</span>
                                        </div>

                                        <div className="admin-inline-actions">
                                            <button type="button" className="admin-btn admin-btn-primary" onClick={() => openPostDetail(selectedListing)}>
                                                <ExternalLink size={16} />
                                                Xem bài đăng
                                            </button>
                                            <button type="button" className="admin-btn admin-btn-soft" onClick={() => openPostComments(selectedListing)}>
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

                        <section className="admin-card">
                            <div className="admin-card-head">
                                <div>
                                    <h2>Phân tích hiệu suất bài đăng</h2>
                                    <p>So sánh nhanh trạng thái vận hành, mức quan tâm và cơ hội tối ưu của từng nhóm bài.</p>
                                </div>
                            </div>

                            <div className="admin-analytics-grid">
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
                            </div>
                        </section>

                        <section className="admin-card">
                            <div className="admin-card-head">
                                <div>
                                    <h2>Quản lý bài đăng</h2>
                                    <p>Lọc theo trạng thái, cập nhật nhanh và theo dõi hiệu suất từng bài ngay trong cùng một bảng điều hành.</p>
                                </div>
                            </div>

                            <div className="admin-toolbar">
                                <input
                                    type="text"
                                    value={listingSearch}
                                    onChange={(event) => setListingSearch(event.target.value)}
                                    placeholder="Tìm theo tiêu đề, danh mục hoặc vị trí"
                                />
                                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                    <option value="all">Tất cả trạng thái</option>
                                    {MANAGE_STATUSES.map((status) => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
                                </select>
                                <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                                    <option value="engagement">Ưu tiên tương tác</option>
                                    <option value="traffic">Ưu tiên tiếp cận</option>
                                    <option value="latest">Mới nhất</option>
                                </select>
                            </div>

                            <div className="admin-manage-list">
                                {filteredListings.length > 0 ? (
                                    filteredListings.map((listing) => (
                                        <div key={listing.id} className="admin-manage-row">
                                            <button
                                                type="button"
                                                className="admin-manage-media"
                                                onClick={() => setSelectedListingId(listing.id)}
                                            >
                                                <PostMediaGallery
                                                    images={listing.images}
                                                    title={listing.title}
                                                    interactive={false}
                                                />
                                            </button>

                                            <div className="admin-manage-copy">
                                                <div className="admin-inline-badges">
                                                    <span className={`admin-pill tone-${listing.statusTone}`}>{listing.statusLabel}</span>
                                                    {listing.categoryName && <span className="admin-pill tone-ghost">{listing.categoryName}</span>}
                                                </div>
                                                <strong>{listing.title}</strong>
                                                <span>{formatCurrency(listing.price)}</span>
                                                <small>
                                                    {listing.location || 'Chưa có vị trí'} · {formatNumber(listing.likeCount)} thích · {formatNumber(listing.commentCount)} bình luận
                                                </small>
                                            </div>

                                            <div className="admin-manage-stats">
                                                <div>
                                                    <label>Tương tác</label>
                                                    <strong>{formatNumber(getEngagementScore(listing))}</strong>
                                                </div>
                                                <div>
                                                    <label>Tiếp cận</label>
                                                    <strong>{formatNumber(estimateTraffic(listing))}</strong>
                                                </div>
                                            </div>

                                            <div className="admin-manage-controls">
                                                <select
                                                    value={listing.status}
                                                    onChange={(event) => handleStatusChange(listing.id, event.target.value)}
                                                    disabled={listingBusyId === String(listing.id)}
                                                >
                                                    {MANAGE_STATUSES.map((status) => (
                                                        <option key={status.value} value={status.value}>{status.label}</option>
                                                    ))}
                                                </select>
                                                <button type="button" className="admin-btn admin-btn-soft" onClick={() => openPostDetail(listing)}>
                                                    <ExternalLink size={16} />
                                                    Xem
                                                </button>
                                                <button type="button" className="admin-btn admin-btn-soft" onClick={() => openPostComments(listing)}>
                                                    <MessageCircle size={16} />
                                                    Chat
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-icon-danger"
                                                    onClick={() => handleDeleteListing(listing.id)}
                                                    disabled={listingBusyId === String(listing.id)}
                                                >
                                                    {listingBusyId === String(listing.id) ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="admin-empty-note">Không có bài đăng nào khớp với bộ lọc hiện tại.</div>
                                )}
                            </div>
                        </section>

                        <section className="admin-card">
                            <div className="admin-card-head">
                                <div>
                                    <h2>Nhật ký hoạt động gần đây</h2>
                                    <p>Theo dõi các mốc quan trọng để biết lúc nào cần đẩy bài, trả lời khách hoặc cập nhật trạng thái.</p>
                                </div>
                            </div>

                            {(profile?.activity || []).length > 0 ? (
                                <div className="admin-timeline">
                                    {profile.activity.slice(0, 6).map((item) => (
                                        <div key={item.id} className="admin-timeline-item">
                                            <span className="admin-dot" />
                                            <div>
                                                <strong>{item.title}</strong>
                                                <p>{item.description}</p>
                                                <small>{formatDate(item.createdAt, true)}</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="admin-empty-note">Hoạt động gần đây sẽ hiển thị ở đây khi bạn phát sinh thêm bài đăng và tương tác.</div>
                            )}
                        </section>
                    </main>

                    <aside className="admin-side-column">
                        <section className="admin-card">
                            <div className="admin-card-head">
                                <div>
                                    <h2>Inbox bán hàng</h2>
                                    <p>Ưu tiên khách đang quan tâm, xem nhanh lịch sử chat và trả lời ngay mà không phải rời dashboard.</p>
                                </div>
                                {selectedConversation && (
                                    <button
                                        type="button"
                                        className="admin-text-link"
                                        onClick={() => navigate('/messages', {
                                            state: {
                                                selectedUser: {
                                                    id: selectedConversation.id,
                                                    name: selectedConversation.name,
                                                    avatar: selectedConversation.avatar,
                                                },
                                            },
                                        })}
                                    >
                                        Mở full chat
                                    </button>
                                )}
                            </div>

                            <div className="admin-chat-list">
                                {conversations.length > 0 ? (
                                    conversations.map((conversation) => (
                                        <button
                                            key={conversation.id}
                                            type="button"
                                            className={`admin-chat-item${String(selectedConversationId) === String(conversation.id) ? ' active' : ''}`}
                                            onClick={() => setSelectedConversationId(conversation.id)}
                                        >
                                            <img src={conversation.avatar} alt={conversation.name} />
                                            <div>
                                                <strong>{conversation.name}</strong>
                                                <span>{conversation.lastMessage || 'Chưa có tin nhắn nào'}</span>
                                            </div>
                                            <div className="admin-chat-meta">
                                                <small>{formatRelativeTime(conversation.lastAt)}</small>
                                                {conversation.unread > 0 && <em>{conversation.unread}</em>}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="admin-empty-note compact">Chưa có hội thoại nào trong inbox bán hàng.</div>
                                )}
                            </div>

                            <div className="admin-chat-panel">
                                {selectedConversation ? (
                                    <>
                                        <div className="admin-chat-head">
                                            <img src={selectedConversation.avatar} alt={selectedConversation.name} />
                                            <div>
                                                <strong>{selectedConversation.name}</strong>
                                                <span>Khách đang quan tâm bài đăng</span>
                                            </div>
                                        </div>

                                        <div className="admin-message-stack">
                                            {loadingMessages ? (
                                                <div className="admin-empty-note compact">Đang tải hội thoại...</div>
                                            ) : chatMessages.length > 0 ? (
                                                chatMessages.map((message) => (
                                                    <div key={message.id} className={`admin-message-bubble ${message.sender}`}>
                                                        {message.image && <img src={message.image} alt="Đính kèm" />}
                                                        {message.text && <p>{message.text}</p>}
                                                        <small>{message.time}</small>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="admin-empty-note compact">Hội thoại này chưa có nội dung. Bạn có thể chủ động mở lời.</div>
                                            )}
                                        </div>

                                        <div className="admin-suggestion-box">
                                            <div className="admin-section-caption">
                                                <Sparkles size={14} />
                                                Gợi ý trả lời nhanh
                                            </div>
                                            <div className="admin-suggestion-list">
                                                {quickReplies.map((reply) => (
                                                    <button key={reply} type="button" onClick={() => setChatDraft(reply)}>
                                                        {reply}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="admin-chat-compose">
                                            <textarea
                                                value={chatDraft}
                                                onChange={(event) => setChatDraft(event.target.value)}
                                                placeholder="Soạn phản hồi cho khách..."
                                                rows={3}
                                            />
                                            <button type="button" className="admin-btn admin-btn-primary" onClick={handleSendMessage} disabled={!chatDraft.trim() || sendingMessage}>
                                                {sendingMessage ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                                                Gửi phản hồi
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="admin-empty-note">Chọn một hội thoại để xem nội dung và dùng gợi ý trả lời nhanh.</div>
                                )}
                            </div>
                        </section>

                        <section className="admin-card">
                            <div className="admin-card-head">
                                <div>
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
                                <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/create-post')}>
                                    <ArrowRight size={16} />
                                    Tạo thêm bài mới
                                </button>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
}
