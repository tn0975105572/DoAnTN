import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    BadgeCheck,
    Calendar,
    Check,
    Copy,
    Crown,
    ExternalLink,
    GraduationCap,
    Heart,
    Loader2,
    Mail,
    MapPin,
    MessageCircle,
    Pencil,
    PlusCircle,
    RefreshCw,
    Settings,
    ShieldCheck,
    Sparkles,
    Star,
    Store,
    Trash2,
    Trophy,
    UserCheck,
    UserMinus,
    UserPlus,
    Users,
    X,
    XCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import './Profile.css';
import PostMediaGallery from '../../components/post/PostMediaGallery';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/200?u=profile-user';

const BADGE_ICONS = {
    shield: ShieldCheck,
    crown: Crown,
    sparkles: Sparkles,
    store: Store,
    users: Users,
    heart: Heart,
    user: BadgeCheck,
};

const MANAGE_STATUSES = [
    { value: 'dang_ban', label: 'Đang bán' },
    { value: 'da_trao_doi', label: 'Đã trao đổi' },
    { value: 'da_tang', label: 'Đã tặng' },
];

const MANAGE_STATUS_LABELS = {
    dang_ban: 'Đang bán',
    dang_giu_cho: 'Đang giữ chỗ',
    dang_giao_dich: 'Đang giao dịch',
    da_ban: 'Đã bán',
    da_trao_doi: 'Đã trao đổi',
    da_tang: 'Đã tặng',
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
    };
};

const normalizeProfilePayload = (payload, backendOrigin) => {
    const featured = (payload?.listings?.featured || []).map((listing) => normalizeListing(listing, backendOrigin));
    const items = (payload?.listings?.items || []).map((listing) => normalizeListing(listing, backendOrigin));

    return {
        ...payload,
        user: {
            ...payload?.user,
            avatar: normalizeAssetUrl(payload?.user?.avatar, backendOrigin) || DEFAULT_AVATAR,
        },
        friendsPreview: (payload?.friendsPreview || []).map((friend) => ({
            ...friend,
            avatar: normalizeAssetUrl(friend.avatar, backendOrigin) || `https://i.pravatar.cc/80?u=${encodeURIComponent(friend.id || 'friend')}`,
        })),
        listings: {
            ...payload?.listings,
            featured,
            items,
        },
        reviews: {
            ...payload?.reviews,
            items: (payload?.reviews?.items || []).map((review) => ({
                ...review,
                author: {
                    ...review.author,
                    avatar: normalizeAssetUrl(review?.author?.avatar, backendOrigin) || `https://i.pravatar.cc/80?u=${encodeURIComponent(review?.author?.id || 'reviewer')}`,
                },
            })),
        },
    };
};

const createListingNavigationState = (listing, profileUser, formatDateValue) => ({
    id: listing?.id || '',
    authorId: listing?.userId || profileUser?.id || '',
    author: profileUser?.name || 'Người dùng OLODO',
    avatar: profileUser?.avatar || DEFAULT_AVATAR,
    time: formatDateValue(listing?.createdAt, true),
    location: listing?.location || '',
    title: listing?.title || 'Bài đăng',
    desc: listing?.description || '',
    price: Number(listing?.price || 0),
    img: listing?.primaryImage || listing?.images?.[0] || DEFAULT_AVATAR,
    imageUrls: listing?.images || [],
    likes: Number(listing?.likeCount || 0),
    comments: Number(listing?.commentCount || 0),
    category: listing?.categoryName || '',
    postTypeName: listing?.postTypeName || '',
    trang_thai: listing?.statusLabel || listing?.status || '',
});

function Stars({ value, interactive = false, onChange }) {
    return (
        <div className={`pr-stars${interactive ? ' interactive' : ''}`}>
            {Array.from({ length: 5 }).map((_, index) => {
                const score = index + 1;
                const active = score <= Number(value || 0);

                if (interactive) {
                    return (
                        <button
                            key={score}
                            type="button"
                            className={`pr-star-btn${active ? ' active' : ''}`}
                            onClick={() => onChange?.(score)}
                            aria-label={`${score} sao`}
                        >
                            <Star size={16} strokeWidth={2} fill={active ? 'currentColor' : 'none'} />
                        </button>
                    );
                }

                return (
                    <span key={score} className={active ? 'active' : ''}>
                        <Star size={16} strokeWidth={2} fill={active ? 'currentColor' : 'none'} />
                    </span>
                );
            })}
        </div>
    );
}

function BadgePill({ badge }) {
    const Icon = BADGE_ICONS[badge.icon] || BadgeCheck;

    return (
        <span className={`pr-badge tone-${badge.tone || 'neutral'}`} title={badge.description || badge.label}>
            <Icon size={14} strokeWidth={2.2} />
            {badge.label}
        </span>
    );
}

function EmptyState({ title, description, action }) {
    return (
        <div className="pr-empty">
            <div className="pr-empty-icon">
                <Sparkles size={24} strokeWidth={2} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            {action}
        </div>
    );
}

export default function Profile() {
    const navigate = useNavigate();
    const location = useLocation();
    const { userId: routeUserId } = useParams();
    const [profile, setProfile] = useState(null);
    const [tab, setTab] = useState('overview');
    const [selectedListingId, setSelectedListingId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [relationshipBusy, setRelationshipBusy] = useState(false);
    const [reviewBusy, setReviewBusy] = useState(false);
    const [listingBusyId, setListingBusyId] = useState('');

    const { userId: viewerId, token } = useAuthSession();
    const backendOrigin = useMemo(() => getBackendOrigin(), []);
    const targetUserId = routeUserId || viewerId || '';

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

    const loadProfile = useCallback(async () => {
        if (!targetUserId) {
            setProfile(null);
            setError('Bạn cần đăng nhập hoặc đi tới một hồ sơ cụ thể để xem dữ liệu.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const query = new URLSearchParams();
            if (viewerId) {
                query.set('viewerId', viewerId);
            }

            const response = await apiFetch(`/profile/${targetUserId}${query.toString() ? `?${query}` : ''}`);
            const normalized = normalizeProfilePayload(response?.data || response, backendOrigin);

            setProfile(normalized);
            setReviewForm({
                rating: normalized?.reviews?.viewerReview?.rating || 5,
                comment: normalized?.reviews?.viewerReview?.comment || '',
            });
            setSelectedListingId((current) => {
                const listings = normalized?.listings?.items || [];
                if (!listings.length) return '';
                if (current && listings.some((item) => String(item.id) === String(current))) {
                    return current;
                }
                return listings[0].id;
            });
        } catch (requestError) {
            console.error('Load profile failed', requestError);
            setProfile(null);
            setError(requestError.message || 'Không thể tải hồ sơ người dùng.');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, backendOrigin, targetUserId, viewerId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        setTab('overview');
        setFeedback(null);
    }, [targetUserId]);

    useEffect(() => {
        if (!feedback?.text) return undefined;
        const timer = window.setTimeout(() => setFeedback(null), 3200);
        return () => window.clearTimeout(timer);
    }, [feedback]);

    useEffect(() => {
        if (!profile?.viewer?.isOwner && tab === 'manage') {
            setTab('overview');
        }
    }, [profile?.viewer?.isOwner, tab]);

    const listings = profile?.listings?.items || [];
    const featuredListings = profile?.listings?.featured?.length ? profile.listings.featured : listings.slice(0, 3);
    const selectedListing = useMemo(
        () => listings.find((item) => String(item.id) === String(selectedListingId)) || listings[0] || null,
        [listings, selectedListingId],
    );
    const shareUrl = useMemo(
        () => (profile?.user?.id ? `${window.location.origin}/profile/${profile.user.id}` : window.location.href),
        [profile?.user?.id],
    );

    const isOwner = Boolean(profile?.viewer?.isOwner);
    const relationshipStatus = profile?.viewer?.relationshipStatus || 'guest';
    const canReview = Boolean(profile?.viewer?.canReview);
    const canMessage = Boolean(profile?.viewer?.canMessage);

    const setMessage = (type, text) => setFeedback({ type, text });

    const copyProfileLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setMessage('success', 'Đã sao chép liên kết hồ sơ.');
        } catch {
            setMessage('error', 'Không thể sao chép liên kết hồ sơ.');
        }
    }, [shareUrl]);

    const openListingDetail = useCallback((listing) => {
        if (!listing?.id) return;

        navigate(`/post/${listing.id}`, {
            state: {
                post: createListingNavigationState(listing, profile?.user, formatDate),
            },
        });
    }, [navigate, profile?.user]);

    const openListingComments = useCallback((listing) => {
        if (!listing?.id) return;

        navigate(`/post/${listing.id}/comments`, {
            state: {
                post: createListingNavigationState(listing, profile?.user, formatDate),
            },
        });
    }, [navigate, profile?.user]);

    const openProfileMessages = useCallback(() => {
        if (!profile?.user?.id) return;
        navigate('/messages', {
            state: {
                selectedUser: {
                    id: profile.user.id,
                    name: profile.user.name,
                    avatar: profile.user.avatar,
                },
            },
        });
    }, [navigate, profile?.user]);

    const runRelationshipAction = useCallback(async (path, method, body, successMessage) => {
        if (!viewerId || !profile?.user?.id) {
            navigate('/login');
            return;
        }

        setRelationshipBusy(true);
        try {
            await apiFetch(path, {
                method,
                body: JSON.stringify(body),
            });
            setMessage('success', successMessage);
            await loadProfile();
        } catch (requestError) {
            console.error('Relationship action failed', requestError);
            setMessage('error', requestError.message || 'Không thể cập nhật quan hệ bạn bè.');
        } finally {
            setRelationshipBusy(false);
        }
    }, [apiFetch, loadProfile, navigate, profile?.user?.id, viewerId]);

    const handleRelationshipPrimary = useCallback(() => {
        if (!profile?.user?.id) return;

        if (relationshipStatus === 'guest') {
            navigate('/login');
            return;
        }

        if (relationshipStatus === 'not_friends') {
            runRelationshipAction(
                '/quanhebanbe/request',
                'POST',
                { idNguoiGui: viewerId, idNguoiNhan: profile.user.id },
                'Đã gửi lời mời kết bạn.',
            );
            return;
        }

        if (relationshipStatus === 'request_sent') {
            runRelationshipAction(
                '/quanhebanbe/cancel',
                'DELETE',
                { idNguoiGui: viewerId, idNguoiNhan: profile.user.id },
                'Đã hủy lời mời kết bạn.',
            );
            return;
        }

        if (relationshipStatus === 'request_received') {
            runRelationshipAction(
                '/quanhebanbe/accept',
                'PUT',
                { idNguoiGui: profile.user.id, idNguoiNhan: viewerId },
                'Đã chấp nhận lời mời kết bạn.',
            );
            return;
        }

        if (relationshipStatus === 'friends') {
            const confirmed = window.confirm('Bạn muốn hủy kết bạn với người này?');
            if (!confirmed) return;

            runRelationshipAction(
                '/quanhebanbe/unfriend',
                'DELETE',
                { idNguoiGui: viewerId, idNguoiNhan: profile.user.id },
                'Đã hủy kết bạn.',
            );
        }
    }, [navigate, profile?.user?.id, relationshipStatus, runRelationshipAction, viewerId]);

    const handleDeclineRequest = useCallback(() => {
        if (!profile?.user?.id || relationshipStatus !== 'request_received') return;

        const confirmed = window.confirm('Bạn muốn từ chối lời mời kết bạn này?');
        if (!confirmed) return;

        runRelationshipAction(
            '/quanhebanbe/unfriend',
            'DELETE',
            { idNguoiGui: profile.user.id, idNguoiNhan: viewerId },
            'Đã từ chối lời mời kết bạn.',
        );
    }, [profile?.user?.id, relationshipStatus, runRelationshipAction, viewerId]);

    const handleReviewSubmit = useCallback(async (event) => {
        event.preventDefault();

        if (!profile?.user?.id || !viewerId) {
            navigate('/login');
            return;
        }

        setReviewBusy(true);
        try {
            await apiFetch(`/profile/${profile.user.id}/review`, {
                method: 'POST',
                body: JSON.stringify({
                    viewerId,
                    rating: reviewForm.rating,
                    comment: reviewForm.comment.trim(),
                }),
            });
            setMessage('success', 'Đánh giá đã được lưu.');
            await loadProfile();
        } catch (requestError) {
            console.error('Submit review failed', requestError);
            setMessage('error', requestError.message || 'Không thể gửi đánh giá.');
        } finally {
            setReviewBusy(false);
        }
    }, [apiFetch, loadProfile, navigate, profile?.user?.id, reviewForm.comment, reviewForm.rating, viewerId]);

    const handleListingStatusChange = useCallback(async (listingId, nextStatus) => {
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
            setMessage('success', 'Đã cập nhật trạng thái bài đăng.');
            await loadProfile();
        } catch (requestError) {
            console.error('Update listing status failed', requestError);
            setMessage('error', requestError.message || 'Không thể cập nhật trạng thái bài đăng.');
        } finally {
            setListingBusyId('');
        }
    }, [apiFetch, loadProfile]);

    const handleDeleteListing = useCallback(async (listingId) => {
        if (!listingId) return;
        const confirmed = window.confirm('Bạn chắc chắn muốn xóa bài đăng này?');
        if (!confirmed) return;

        setListingBusyId(String(listingId));
        try {
            await apiFetch(`/baidang/delete/${listingId}`, {
                method: 'DELETE',
            });
            setMessage('success', 'Đã xóa bài đăng.');
            await loadProfile();
        } catch (requestError) {
            console.error('Delete listing failed', requestError);
            setMessage('error', requestError.message || 'Không thể xóa bài đăng.');
        } finally {
            setListingBusyId('');
        }
    }, [apiFetch, loadProfile]);

    const tabs = [
        { key: 'overview', label: 'Tổng quan' },
        { key: 'listings', label: 'Bài đăng' },
        { key: 'reviews', label: 'Đánh giá' },
        { key: 'activity', label: 'Hoạt động' },
        ...(isOwner ? [{ key: 'manage', label: 'Quản lý' }] : []),
    ];

    const getManageStatusOptions = useCallback((currentStatus) => {
        const normalized = String(currentStatus || '').trim();
        if (!normalized || MANAGE_STATUSES.some((option) => option.value === normalized)) {
            return MANAGE_STATUSES;
        }

        return [
            {
                value: normalized,
                label: MANAGE_STATUS_LABELS[normalized] || normalized,
            },
            ...MANAGE_STATUSES,
        ];
    }, []);

    if (loading) {
        return (
            <div className="profile-redesign">
                <div className="pr-shell">
                    <div className="pr-state">
                        <Loader2 size={28} className="spin" />
                        <h2>Đang tải hồ sơ</h2>
                        <p>Mình đang lấy dữ liệu hồ sơ, bài đăng, bạn bè và đánh giá.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="profile-redesign">
                <div className="pr-shell">
                    <div className="pr-state">
                        <XCircle size={28} />
                        <h2>Không mở được hồ sơ</h2>
                        <p>{error || 'Hồ sơ hiện chưa sẵn sàng.'}</p>
                        <div className="pr-inline-actions">
                            {!viewerId && (
                                <button type="button" className="pr-btn pr-btn-primary" onClick={() => navigate('/login')}>
                                    Đăng nhập
                                </button>
                            )}
                            <button type="button" className="pr-btn pr-btn-soft" onClick={() => navigate(-1)}>
                                Quay lại
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-redesign">
            <div className="pr-shell">
                <section className="pr-hero">
                    <div className="pr-orbit pr-orbit-one" />
                    <div className="pr-orbit pr-orbit-two" />
                    <div className="pr-hero-card">
                        <div className="pr-toolbar">
                            <button type="button" className="pr-toolbar-btn" onClick={() => navigate(-1)}>
                                <ArrowLeft size={16} />
                                Quay lại
                            </button>
                            <button type="button" className="pr-toolbar-btn" onClick={copyProfileLink}>
                                <Copy size={16} />
                                Sao chép link
                            </button>
                        </div>
                        <div className="pr-hero-main">
                            <div className="pr-avatar-wrap">
                                <div className="pr-avatar">
                                    <img src={profile.user.avatar} alt={profile.user.name} />
                                </div>
                                {profile.user.isVerified && (
                                    <span className="pr-verified-badge">
                                        <ShieldCheck size={14} />
                                        Đã xác thực
                                    </span>
                                )}
                            </div>

                            <div className="pr-identity">
                                <div className="pr-name-row">
                                    <h1>{profile.user.name}</h1>
                                    {profile.user.isVipActive && (
                                        <span className="pr-vip-pill">
                                            <Crown size={14} />
                                            VIP
                                        </span>
                                    )}
                                </div>

                                <p className="pr-headline">
                                    {profile.user.bio || 'Hồ sơ giao dịch cá nhân, nơi tổng hợp uy tín, hoạt động và các bài đăng đang vận hành.'}
                                </p>

                                <div className="pr-meta">
                                    {profile.user.school && (
                                        <span>
                                            <GraduationCap size={15} />
                                            {profile.user.school}
                                        </span>
                                    )}
                                    {profile.user.location && (
                                        <span>
                                            <MapPin size={15} />
                                            {profile.user.location}
                                        </span>
                                    )}
                                    <span>
                                        <Calendar size={15} />
                                        Tham gia {formatDate(profile.user.joinedAt)}
                                    </span>
                                </div>

                                <div className="pr-badges-row">
                                    {(profile.badges || []).map((badge) => (
                                        <BadgePill key={badge.key} badge={badge} />
                                    ))}
                                </div>

                                {!isOwner && profile.viewer.mutualFriends > 0 && (
                                    <div className="pr-mutual">
                                        <Users size={15} />
                                        {formatNumber(profile.viewer.mutualFriends)} bạn chung
                                    </div>
                                )}
                            </div>

                            <div className="pr-actions">
                                {isOwner ? (
                                    <>
                                        <button type="button" className="pr-btn pr-btn-primary" onClick={() => navigate('/settings')}>
                                            <Settings size={16} />
                                            Cài đặt hồ sơ
                                        </button>
                                        <button type="button" className="pr-btn pr-btn-soft" onClick={() => navigate('/create-post')}>
                                            <PlusCircle size={16} />
                                            Đăng bài mới
                                        </button>
                                        <button type="button" className="pr-btn pr-btn-soft" onClick={() => navigate('/admin')}>
                                            <Pencil size={16} />
                                            Mở Admin
                                        </button>
                                        <button type="button" className="pr-btn pr-btn-ghost" onClick={loadProfile}>
                                            <RefreshCw size={16} />
                                            Làm mới
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="pr-btn pr-btn-primary"
                                            onClick={handleRelationshipPrimary}
                                            disabled={relationshipBusy || relationshipStatus === 'blocked'}
                                        >
                                            {relationshipBusy ? (
                                                <Loader2 size={16} className="spin" />
                                            ) : relationshipStatus === 'guest' || relationshipStatus === 'not_friends' ? (
                                                <UserPlus size={16} />
                                            ) : relationshipStatus === 'request_sent' ? (
                                                <X size={16} />
                                            ) : relationshipStatus === 'request_received' ? (
                                                <UserCheck size={16} />
                                            ) : (
                                                <UserMinus size={16} />
                                            )}
                                            {relationshipStatus === 'guest'
                                                ? 'Đăng nhập để kết bạn'
                                                : relationshipStatus === 'not_friends'
                                                    ? 'Gửi lời mời'
                                                    : relationshipStatus === 'request_sent'
                                                        ? 'Hủy lời mời'
                                                        : relationshipStatus === 'request_received'
                                                            ? 'Chấp nhận'
                                                            : relationshipStatus === 'friends'
                                                                ? 'Hủy kết bạn'
                                                                : 'Đang bị chặn'}
                                        </button>

                                        {relationshipStatus === 'request_received' && (
                                            <button
                                                type="button"
                                                className="pr-btn pr-btn-danger"
                                                onClick={handleDeclineRequest}
                                                disabled={relationshipBusy}
                                            >
                                                <XCircle size={16} />
                                                Từ chối
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className="pr-btn pr-btn-soft"
                                            onClick={openProfileMessages}
                                            disabled={!canMessage}
                                        >
                                            <MessageCircle size={16} />
                                            Nhắn tin
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="pr-stats-grid">
                            <div className="pr-stat-card">
                                <span className="pr-stat-icon">
                                    <Store size={18} />
                                </span>
                                <strong>{formatNumber(profile.stats.active_listings)}</strong>
                                <span>Đang bán</span>
                            </div>
                            <div className="pr-stat-card">
                                <span className="pr-stat-icon">
                                    <Trophy size={18} />
                                </span>
                                <strong>{formatNumber(profile.stats.sold_listings)}</strong>
                                <span>Đã bán</span>
                            </div>
                            <div className="pr-stat-card">
                                <span className="pr-stat-icon">
                                    <Star size={18} />
                                </span>
                                <strong>{profile.stats.average_rating ? `${profile.stats.average_rating}/5` : 'Chưa có'}</strong>
                                <span>{formatNumber(profile.stats.total_reviews)} đánh giá</span>
                            </div>
                            <div className="pr-stat-card">
                                <span className="pr-stat-icon">
                                    <Users size={18} />
                                </span>
                                <strong>{formatNumber(profile.stats.total_friends)}</strong>
                                <span>{isOwner ? `${formatNumber(profile.stats.total_points)} điểm` : 'Bạn bè'}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="pr-tabs">
                    {tabs.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`pr-tab${tab === item.key ? ' active' : ''}`}
                            onClick={() => setTab(item.key)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {feedback?.text && (
                    <div className={`pr-feedback ${feedback.type || 'info'}`}>
                        {feedback.text}
                    </div>
                )}

                <div className="pr-layout">
                    <aside className="pr-sidebar">
                        <div className="pr-card">
                            <div className="pr-card-head">
                                <h2>Thông tin hồ sơ</h2>
                            </div>
                            <div className="pr-info-list">
                                {profile.user.email && (
                                    <div className="pr-info-item">
                                        <Mail size={15} />
                                        <span>{profile.user.email}</span>
                                    </div>
                                )}
                                {profile.user.phone && (
                                    <div className="pr-info-item">
                                        <MessageCircle size={15} />
                                        <span>{profile.user.phone}</span>
                                    </div>
                                )}
                                {profile.user.hometown && (
                                    <div className="pr-info-item">
                                        <MapPin size={15} />
                                        <span>Quê quán: {profile.user.hometown}</span>
                                    </div>
                                )}
                                {!profile.user.email && !profile.user.phone && !profile.user.hometown && (
                                    <p className="pr-muted-copy">Người dùng chưa cập nhật thêm thông tin liên hệ.</p>
                                )}
                            </div>
                        </div>

                        <div className="pr-card pr-card-highlight">
                            <div className="pr-card-head">
                                <h2>Điểm nổi bật</h2>
                            </div>
                            <div className="pr-highlight-list">
                                {(profile.highlights || []).map((item) => (
                                    <div key={item.key} className="pr-highlight-item">
                                        <strong>{item.value}</strong>
                                        <span>{item.label}</span>
                                        <small>{item.helper}</small>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pr-card">
                            <div className="pr-card-head pr-card-head-inline">
                                <h2>Bạn bè nổi bật</h2>
                                {isOwner && (
                                    <button type="button" className="pr-text-link" onClick={() => navigate('/add-friends')}>
                                        Xem thêm
                                    </button>
                                )}
                            </div>
                            <div className="pr-friends-list">
                                {(profile.friendsPreview || []).length > 0 ? (
                                    profile.friendsPreview.map((friend) => (
                                        <button
                                            key={friend.id}
                                            type="button"
                                            className="pr-friend-row"
                                            onClick={() => navigate(`/profile/${friend.id}`)}
                                        >
                                            <img src={friend.avatar} alt={friend.name} />
                                            <div>
                                                <strong>{friend.name}</strong>
                                                <span>{friend.school || friend.hometown || 'Bạn bè trong hệ thống'}</span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <p className="pr-muted-copy">Chưa có dữ liệu bạn bè hiển thị.</p>
                                )}
                            </div>
                        </div>
                    </aside>

                    <main className="pr-main">
                        {tab === 'overview' && (
                            <>
                                {selectedListing ? (
                                    <div className="pr-card pr-spotlight">
                                        <div className="pr-card-head pr-card-head-inline">
                                            <h2>Bài đăng trọng tâm</h2>
                                            <button type="button" className="pr-text-link" onClick={() => setTab('listings')}>
                                                Xem tất cả
                                            </button>
                                        </div>
                                        <div className="pr-spotlight-grid">
                                            <div className="pr-spotlight-media">
                                                <PostMediaGallery
                                                    images={selectedListing.images}
                                                    title={selectedListing.title}
                                                    badge={formatCurrency(selectedListing.price)}
                                                    onOpen={() => openListingDetail(selectedListing)}
                                                />
                                            </div>
                                            <div className="pr-spotlight-body">
                                                <div className="pr-inline-badges">
                                                    <span className="pr-status-pill">{selectedListing.statusLabel}</span>
                                                    {selectedListing.categoryName && <span className="pr-soft-pill">{selectedListing.categoryName}</span>}
                                                    {selectedListing.postTypeName && <span className="pr-soft-pill">{selectedListing.postTypeName}</span>}
                                                </div>
                                                <h2>{selectedListing.title}</h2>
                                                <div className="pr-price">{formatCurrency(selectedListing.price)}</div>
                                                <p>{selectedListing.description || 'Bài đăng chưa có mô tả chi tiết.'}</p>
                                                <div className="pr-meta pr-meta-tight">
                                                    {selectedListing.location && (
                                                        <span>
                                                            <MapPin size={15} />
                                                            {selectedListing.location}
                                                        </span>
                                                    )}
                                                    <span>
                                                        <Heart size={15} />
                                                        {formatNumber(selectedListing.likeCount)} lượt thích
                                                    </span>
                                                    <span>
                                                        <MessageCircle size={15} />
                                                        {formatNumber(selectedListing.commentCount)} bình luận
                                                    </span>
                                                </div>
                                                <div className="pr-inline-actions">
                                                    <button
                                                        type="button"
                                                        className="pr-btn pr-btn-primary"
                                                        onClick={() => openListingDetail(selectedListing)}
                                                    >
                                                        <ExternalLink size={16} />
                                                        Xem chi tiết
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="pr-btn pr-btn-soft"
                                                        onClick={() => openListingComments(selectedListing)}
                                                    >
                                                        <MessageCircle size={16} />
                                                        Mở bình luận
                                                    </button>
                                                    {isOwner && (
                                                        <>
                                                            <button type="button" className="pr-btn pr-btn-soft" onClick={() => navigate('/admin')}>
                                                                <Pencil size={16} />
                                                                Mở Admin
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="pr-btn pr-btn-danger"
                                                                onClick={() => handleDeleteListing(selectedListing.id)}
                                                                disabled={listingBusyId === String(selectedListing.id)}
                                                            >
                                                                {listingBusyId === String(selectedListing.id) ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                                                                Xóa bài đăng
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="Chưa có bài đăng"
                                        description="Khi người dùng có tin mới, phần tổng quan sẽ hiển thị trọng tâm tại đây."
                                    />
                                )}

                                <div className="pr-card">
                                    <div className="pr-card-head pr-card-head-inline">
                                        <h2>Bài đăng nổi bật</h2>
                                        <button type="button" className="pr-text-link" onClick={() => setTab('listings')}>
                                            Sang tab bài đăng
                                        </button>
                                    </div>
                                    {featuredListings.length > 0 ? (
                                        <div className="pr-listing-grid">
                                            {featuredListings.map((listing) => (
                                                <button
                                                    key={listing.id}
                                                    type="button"
                                                    className={`pr-listing-card${String(selectedListing?.id) === String(listing.id) ? ' active' : ''}`}
                                                    onClick={() => setSelectedListingId(listing.id)}
                                                >
                                                    <div className="pr-listing-card-media">
                                                        <PostMediaGallery
                                                            images={listing.images}
                                                            title={listing.title}
                                                            interactive={false}
                                                        />
                                                    </div>
                                                    <div className="pr-listing-copy">
                                                        <strong>{listing.title}</strong>
                                                        <span>{formatCurrency(listing.price)}</span>
                                                        <small>{listing.location || listing.statusLabel}</small>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="pr-muted-copy">Chưa có bài đăng nổi bật.</p>
                                    )}
                                </div>

                                <div className="pr-split-grid">
                                    <div className="pr-card">
                                        <div className="pr-card-head pr-card-head-inline">
                                            <h2>Đánh giá mới nhất</h2>
                                            <button type="button" className="pr-text-link" onClick={() => setTab('reviews')}>
                                                Xem toàn bộ
                                            </button>
                                        </div>
                                        {(profile.reviews.items || []).length > 0 ? (
                                            <div className="pr-review-list">
                                                {profile.reviews.items.slice(0, 3).map((review) => (
                                                    <article key={review.id} className="pr-review-item">
                                                        <img src={review.author.avatar} alt={review.author.name} />
                                                        <div>
                                                            <div className="pr-review-head">
                                                                <strong>{review.author.name}</strong>
                                                                <span>{formatDate(review.createdAt)}</span>
                                                            </div>
                                                            <Stars value={review.rating} />
                                                            <p>{review.comment || 'Không có bình luận chi tiết.'}</p>
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="pr-muted-copy">Hồ sơ này chưa nhận đánh giá nào.</p>
                                        )}
                                    </div>

                                    <div className="pr-card">
                                        <div className="pr-card-head pr-card-head-inline">
                                            <h2>Hoạt động gần đây</h2>
                                            <button type="button" className="pr-text-link" onClick={() => setTab('activity')}>
                                                Xem timeline
                                            </button>
                                        </div>
                                        {(profile.activity || []).length > 0 ? (
                                            <div className="pr-timeline">
                                                {profile.activity.slice(0, 4).map((item) => (
                                                    <div key={item.id} className="pr-timeline-item">
                                                        <span className="pr-dot" />
                                                        <div>
                                                            <strong>{item.title}</strong>
                                                            <p>{item.description}</p>
                                                            <small>{formatDate(item.createdAt, true)}</small>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="pr-muted-copy">Chưa có hoạt động nào để hiển thị.</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {tab === 'listings' && (
                            <div className="pr-card">
                                <div className="pr-card-head pr-card-head-inline">
                                    <h2>Danh sách bài đăng</h2>
                                    <span className="pr-muted-copy">{formatNumber(profile.listings.total)} bài</span>
                                </div>
                                {listings.length > 0 ? (
                                    <>
                                        {selectedListing && (
                                            <div className="pr-listing-detail">
                                                <div className="pr-listing-detail-media">
                                                    <PostMediaGallery
                                                        images={selectedListing.images}
                                                        title={selectedListing.title}
                                                        badge={formatCurrency(selectedListing.price)}
                                                        onOpen={() => openListingDetail(selectedListing)}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="pr-inline-badges">
                                                        <span className="pr-status-pill">{selectedListing.statusLabel}</span>
                                                        {selectedListing.categoryName && <span className="pr-soft-pill">{selectedListing.categoryName}</span>}
                                                    </div>
                                                    <h3>{selectedListing.title}</h3>
                                                    <div className="pr-price">{formatCurrency(selectedListing.price)}</div>
                                                    <p>{selectedListing.description || 'Bài đăng chưa có mô tả chi tiết.'}</p>
                                                    <div className="pr-meta pr-meta-tight">
                                                        {selectedListing.location && (
                                                            <span>
                                                                <MapPin size={15} />
                                                                {selectedListing.location}
                                                            </span>
                                                        )}
                                                        <span>
                                                            <Heart size={15} />
                                                            {formatNumber(selectedListing.likeCount)} thích
                                                        </span>
                                                        <span>
                                                            <MessageCircle size={15} />
                                                            {formatNumber(selectedListing.commentCount)} bình luận
                                                        </span>
                                                    </div>
                                                    <div className="pr-inline-actions">
                                                        <button
                                                            type="button"
                                                            className="pr-btn pr-btn-primary"
                                                            onClick={() => openListingDetail(selectedListing)}
                                                        >
                                                            <ExternalLink size={16} />
                                                            Xem chi tiết
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="pr-btn pr-btn-soft"
                                                            onClick={() => openListingComments(selectedListing)}
                                                        >
                                                            <MessageCircle size={16} />
                                                            Mở thảo luận
                                                        </button>
                                                        {isOwner && (
                                                            <>
                                                                <button type="button" className="pr-btn pr-btn-soft" onClick={() => navigate('/admin')}>
                                                                    <Pencil size={16} />
                                                                    Mở Admin
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="pr-btn pr-btn-danger"
                                                                    onClick={() => handleDeleteListing(selectedListing.id)}
                                                                    disabled={listingBusyId === String(selectedListing.id)}
                                                                >
                                                                    {listingBusyId === String(selectedListing.id) ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                                                                    Xóa bài đăng
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pr-listing-grid pr-listing-grid-full">
                                            {listings.map((listing) => (
                                                <button
                                                    key={listing.id}
                                                    type="button"
                                                    className={`pr-listing-card${String(selectedListing?.id) === String(listing.id) ? ' active' : ''}`}
                                                    onClick={() => setSelectedListingId(listing.id)}
                                                >
                                                    <div className="pr-listing-card-media">
                                                        <PostMediaGallery
                                                            images={listing.images}
                                                            title={listing.title}
                                                            interactive={false}
                                                        />
                                                    </div>
                                                    <div className="pr-listing-copy">
                                                        <strong>{listing.title}</strong>
                                                        <span>{formatCurrency(listing.price)}</span>
                                                        <small>{listing.location || listing.statusLabel}</small>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <EmptyState
                                        title="Chưa có bài đăng nào"
                                        description="Người dùng này chưa có bài đăng công khai trong hệ thống."
                                    />
                                )}
                            </div>
                        )}

                        {tab === 'reviews' && (
                            <div className="pr-card">
                                <div className="pr-card-head">
                                    <h2>Đánh giá người dùng</h2>
                                    <p className="pr-section-sub">
                                        Nghiệp vụ đánh giá chỉ cho phép giữa hai người đã là bạn bè, và cho phép cập nhật lại nội dung đã gửi.
                                    </p>
                                </div>

                                <div className="pr-review-summary">
                                    <div className="pr-review-score">
                                        <strong>{profile.reviews.summary.averageRating ? profile.reviews.summary.averageRating.toFixed(1) : '0.0'}</strong>
                                        <Stars value={Math.round(profile.reviews.summary.averageRating || 0)} />
                                        <span>{formatNumber(profile.reviews.summary.totalReviews)} đánh giá</span>
                                    </div>

                                    <div className="pr-distribution">
                                        {[5, 4, 3, 2, 1].map((score) => {
                                            const count = profile.reviews.summary.distribution?.[score] || 0;
                                            const percent = profile.reviews.summary.totalReviews
                                                ? (count / profile.reviews.summary.totalReviews) * 100
                                                : 0;

                                            return (
                                                <div key={score} className="pr-distribution-row">
                                                    <span>{score} sao</span>
                                                    <div className="pr-distribution-bar">
                                                        <div style={{ width: `${percent}%` }} />
                                                    </div>
                                                    <strong>{formatNumber(count)}</strong>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isOwner ? (
                                    <div className="pr-note-box">
                                        <ShieldCheck size={16} />
                                        Đây là hồ sơ của bạn. Bạn sẽ thấy tổng hợp đánh giá từ người khác tại đây.
                                    </div>
                                ) : canReview ? (
                                    <form className="pr-review-form" onSubmit={handleReviewSubmit}>
                                        <div className="pr-card-head pr-card-head-inline">
                                            <h3>{profile.reviews.viewerReview ? 'Cập nhật đánh giá của bạn' : 'Viết đánh giá'}</h3>
                                            <span className="pr-muted-copy">Bạn bè mới có quyền gửi đánh giá.</span>
                                        </div>
                                        <Stars
                                            value={reviewForm.rating}
                                            interactive
                                            onChange={(rating) => setReviewForm((current) => ({ ...current, rating }))}
                                        />
                                        <textarea
                                            value={reviewForm.comment}
                                            onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                                            placeholder="Mô tả trải nghiệm giao dịch, độ uy tín, tốc độ phản hồi..."
                                            rows={4}
                                        />
                                        <div className="pr-inline-actions">
                                            <button type="submit" className="pr-btn pr-btn-primary" disabled={reviewBusy}>
                                                {reviewBusy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                                {profile.reviews.viewerReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="pr-note-box">
                                        <Users size={16} />
                                        {viewerId
                                            ? 'Bạn cần trở thành bạn bè với người này để gửi đánh giá.'
                                            : 'Đăng nhập để tham gia kết bạn và để lại đánh giá sau giao dịch.'}
                                    </div>
                                )}

                                {(profile.reviews.items || []).length > 0 ? (
                                    <div className="pr-review-list pr-review-list-full">
                                        {profile.reviews.items.map((review) => (
                                            <article key={review.id} className="pr-review-item">
                                                <img src={review.author.avatar} alt={review.author.name} />
                                                <div>
                                                    <div className="pr-review-head">
                                                        <strong>{review.author.name}</strong>
                                                        <span>{formatDate(review.createdAt, true)}</span>
                                                    </div>
                                                    <Stars value={review.rating} />
                                                    <p>{review.comment || 'Không có bình luận chi tiết.'}</p>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="Chưa có đánh giá"
                                        description="Khi có giao dịch hoặc tương tác đủ điều kiện, đánh giá sẽ xuất hiện tại đây."
                                    />
                                )}
                            </div>
                        )}

                        {tab === 'activity' && (
                            <div className="pr-card">
                                <div className="pr-card-head">
                                    <h2>Timeline hoạt động</h2>
                                    <p className="pr-section-sub">
                                        Timeline tổng hợp từ đăng bài, bình luận nhận được, đánh giá, thay đổi điểm và kết nối bạn bè.
                                    </p>
                                </div>

                                {(profile.activity || []).length > 0 ? (
                                    <div className="pr-timeline pr-timeline-full">
                                        {profile.activity.map((item) => (
                                            <div key={item.id} className="pr-timeline-item">
                                                <span className="pr-dot" />
                                                <div>
                                                    <strong>{item.title}</strong>
                                                    <p>{item.description}</p>
                                                    <small>{formatDate(item.createdAt, true)}</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="Chưa có hoạt động"
                                        description="Phần này sẽ đầy lên khi người dùng phát sinh bài đăng, bạn bè, đánh giá hoặc thay đổi điểm."
                                    />
                                )}
                            </div>
                        )}

                        {tab === 'manage' && isOwner && (
                            <>
                                <div className="pr-card">
                                    <div className="pr-card-head">
                                        <h2>Điều hành hồ sơ</h2>
                                        <p className="pr-section-sub">
                                            Tab này dành cho chủ hồ sơ để vận hành bài đăng, cập nhật trạng thái kinh doanh và đi nhanh tới các khu vực quản trị liên quan.
                                        </p>
                                    </div>

                                    <div className="pr-manage-actions">
                                        <button type="button" className="pr-manage-action" onClick={() => navigate('/admin')}>
                                            <Pencil size={18} />
                                            <span>Admin Studio</span>
                                        </button>
                                        <button type="button" className="pr-manage-action" onClick={() => navigate('/create-post')}>
                                            <PlusCircle size={18} />
                                            <span>Đăng bài mới</span>
                                        </button>
                                        <button type="button" className="pr-manage-action" onClick={() => navigate('/settings')}>
                                            <Settings size={18} />
                                            <span>Cài đặt tài khoản</span>
                                        </button>
                                        <button type="button" className="pr-manage-action" onClick={() => navigate('/add-friends')}>
                                            <Users size={18} />
                                            <span>Quản lý bạn bè</span>
                                        </button>
                                        <button type="button" className="pr-manage-action" onClick={() => navigate('/messages')}>
                                            <MessageCircle size={18} />
                                            <span>Đi tới tin nhắn</span>
                                        </button>
                                        <button type="button" className="pr-manage-action" onClick={loadProfile}>
                                            <RefreshCw size={18} />
                                            <span>Tải lại dữ liệu</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="pr-card">
                                    <div className="pr-card-head pr-card-head-inline">
                                        <h2>Quản lý bài đăng cá nhân</h2>
                                        <span className="pr-muted-copy">{formatNumber(listings.length)} bài đăng</span>
                                    </div>

                                    {listings.length > 0 ? (
                                        <div className="pr-manage-list">
                                            {listings.map((listing) => (
                                                <div key={listing.id} className="pr-manage-row">
                                                    <div className="pr-manage-media">
                                                        <PostMediaGallery
                                                            images={listing.images}
                                                            title={listing.title}
                                                            interactive={false}
                                                        />
                                                    </div>
                                                    <div className="pr-manage-copy">
                                                        <strong>{listing.title}</strong>
                                                        <span>{formatCurrency(listing.price)}</span>
                                                        <small>
                                                            {listing.location || 'Không rõ vị trí'} · {formatNumber(listing.commentCount)} bình luận · {formatNumber(listing.likeCount)} thích
                                                        </small>
                                                    </div>
                                                    <div className="pr-manage-controls">
                                                        <select
                                                            value={listing.status}
                                                            onChange={(event) => handleListingStatusChange(listing.id, event.target.value)}
                                                            disabled={listingBusyId === String(listing.id)}
                                                        >
                                                            {getManageStatusOptions(listing.status).map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            className="pr-btn pr-btn-soft"
                                                            onClick={() => openListingComments(listing)}
                                                            disabled={listingBusyId === String(listing.id)}
                                                        >
                                                            <MessageCircle size={16} />
                                                            Bình luận
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="pr-btn pr-btn-danger"
                                                            onClick={() => handleDeleteListing(listing.id)}
                                                            disabled={listingBusyId === String(listing.id)}
                                                        >
                                                            {listingBusyId === String(listing.id) ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                                                            Xóa bài
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            title="Chưa có bài đăng để quản lý"
                                            description="Khi bạn có bài đăng, khu vực điều hành sẽ cho phép cập nhật trạng thái và xóa trực tiếp."
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
