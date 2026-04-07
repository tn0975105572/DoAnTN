import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Copy,
    ExternalLink,
    Heart,
    Loader2,
    MapPin,
    MessageCircle,
    Send,
    ShieldCheck,
    Tag,
    UserRound,
    X,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import './PostDetail.css';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/200?u=post-detail-user';
const FALLBACK_IMAGE = 'https://via.placeholder.com/1200x800?text=No+Image';

const STATUS_LABELS = {
    dang_ban: 'Đang bán',
    dang_giu_cho: 'Đang giữ chỗ',
    dang_giao_dich: 'Đang giao dịch',
    da_ban: 'Đã bán',
    cho_duyet: 'Chờ duyệt',
    da_trao_doi: 'Đã trao đổi',
    da_tang: 'Đã tặng',
    het_hang: 'Hết hàng',
};

const getBackendOrigin = () => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        return 'http://localhost:3000';
    }
};

const parseNumericValue = (value) => {
    if (typeof value === 'number') return value;
    const sanitized = String(value || '').replace(/[^\d.-]/g, '');
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => {
    const numeric = parseNumericValue(value);
    if (!numeric) {
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

const normalizeStatusLabel = (status) => {
    if (!status) return 'Không rõ trạng thái';
    const key = String(status).trim().toLowerCase();
    return STATUS_LABELS[key] || status;
};

const normalizeCommentPreview = (comment, backendOrigin) => ({
    id: comment?.ID_BinhLuan || '',
    author: comment?.TenNguoiDung || 'Người dùng OLODO',
    avatar: normalizeAssetUrl(comment?.anh_dai_dien, backendOrigin) || `https://i.pravatar.cc/80?u=${encodeURIComponent(comment?.ID_NguoiDung || 'comment')}`,
    content: comment?.noi_dung || '',
    time: formatDate(comment?.thoi_gian_binh_luan, true),
});

const uniqueImages = (items) => Array.from(
    new Set((items || []).filter(Boolean)),
);

const normalizePostFromState = (statePost, backendOrigin) => {
    if (!statePost) return null;

    const images = uniqueImages((statePost.imageUrls || [statePost.img])
        .map((item) => normalizeAssetUrl(item, backendOrigin) || item)
        .filter(Boolean));

    return {
        id: statePost.id || '',
        authorId: statePost.authorId || '',
        author: statePost.author || 'Người dùng OLODO',
        avatar: normalizeAssetUrl(statePost.avatar, backendOrigin) || statePost.avatar || DEFAULT_AVATAR,
        title: statePost.title || 'Bài đăng',
        description: statePost.desc || statePost.description || '',
        price: parseNumericValue(statePost.price),
        location: statePost.location || '',
        createdAt: statePost.createdAt || '',
        timeLabel: statePost.time || 'Đang cập nhật',
        category: statePost.category || '',
        postTypeName: statePost.postTypeName || '',
        statusLabel: normalizeStatusLabel(statePost.trang_thai || statePost.status || ''),
        images: images.length ? images : [FALLBACK_IMAGE],
        likeCount: Number(statePost.likes || 0),
        commentCount: Number(statePost.comments || 0),
        commentsPreview: [],
    };
};

const normalizePostResponse = (payload, backendOrigin) => {
    const raw = payload?.data || payload || {};
    const images = uniqueImages((raw?.DanhSachAnh || [])
        .map((item) => normalizeAssetUrl(item, backendOrigin))
        .filter(Boolean));
    const comments = Array.isArray(raw?.comments) ? raw.comments : [];
    const likes = Array.isArray(raw?.likes) ? raw.likes : [];

    return {
        id: raw?.ID_BaiDang || '',
        authorId: raw?.ID_NguoiDung || '',
        author: raw?.TenNguoiDung || 'Người dùng OLODO',
        avatar: normalizeAssetUrl(raw?.anh_dai_dien, backendOrigin) || DEFAULT_AVATAR,
        title: raw?.tieu_de || 'Bài đăng',
        description: raw?.mo_ta || '',
        price: parseNumericValue(raw?.gia),
        location: raw?.vi_tri || '',
        createdAt: raw?.thoi_gian_tao || '',
        timeLabel: formatDate(raw?.thoi_gian_tao, true),
        category: raw?.TenDanhMuc || '',
        postTypeName: raw?.TenLoaiBaiDang || '',
        statusLabel: normalizeStatusLabel(raw?.trang_thai),
        images: images.length ? images : [FALLBACK_IMAGE],
        likeCount: likes.length || Number(raw?.SoLuongLike || 0),
        commentCount: comments.length || Number(raw?.SoLuongBinhLuan || 0),
        commentsPreview: comments.slice(0, 3).map((comment) => normalizeCommentPreview(comment, backendOrigin)),
    };
};

function DetailMeta({ icon: Icon, label, value }) {
    return (
        <div className="pd-meta-item">
            <span className="pd-meta-icon">
                <Icon size={16} strokeWidth={2} />
            </span>
            <div>
                <strong>{value}</strong>
                <small>{label}</small>
            </div>
        </div>
    );
}

function SellerMessageModal({
    post,
    draftMessage,
    onDraftChange,
    onClose,
    onSubmit,
    isSending,
    error,
}) {
    const previewImage = post?.images?.[0] || FALLBACK_IMAGE;

    return (
        <div className="pd-message-overlay" onClick={onClose}>
            <div className="pd-message-modal" onClick={(event) => event.stopPropagation()}>
                <div className="pd-message-handle" />
                <div className="pd-message-header">
                    <h3>Nhắn người bán</h3>
                    <button type="button" className="pd-message-close-btn" onClick={onClose} aria-label="Đóng form nhắn người bán">
                        <X size={20} />
                    </button>
                </div>

                <div className="pd-message-post-preview">
                    <img className="pd-message-preview-img" src={previewImage} alt={post?.title || 'Bài đăng'} />
                    <div className="pd-message-preview-info">
                        <div className="pd-message-preview-title">{post?.title || 'Bài đăng'}</div>
                        <div className="pd-message-preview-meta">Người bán: {post?.author || 'Người bán'}</div>
                        <div className="pd-message-preview-price">{formatCurrency(post?.price)}</div>
                    </div>
                </div>

                <div className="pd-message-input-section">
                    <textarea
                        className="pd-message-textarea"
                        placeholder="Nhập lời nhắn của bạn cho người bán..."
                        value={draftMessage}
                        onChange={(event) => onDraftChange(event.target.value)}
                    />
                </div>

                {error && (
                    <div className="pd-message-error">
                        <ShieldCheck size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="pd-message-footer">
                    <button
                        type="button"
                        className="pd-message-send-btn"
                        disabled={isSending}
                        onClick={onSubmit}
                    >
                        {isSending ? 'Đang gửi...' : 'Gửi kèm bài viết'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PostDetail() {
    const navigate = useNavigate();
    const { postId } = useParams();
    const location = useLocation();
    const backendOrigin = useMemo(() => getBackendOrigin(), []);
    const { userId: viewerId, token } = useAuthSession();
    const initialPost = useMemo(
        () => normalizePostFromState(location.state?.post, backendOrigin),
        [backendOrigin, location.state?.post],
    );

    const [post, setPost] = useState(initialPost);
    const [loading, setLoading] = useState(!initialPost);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageDraft, setMessageDraft] = useState('');
    const [messageError, setMessageError] = useState('');
    const [messageSending, setMessageSending] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadPost = async () => {
            if (!postId) {
                setError('Không xác định được bài đăng cần mở.');
                setLoading(false);
                return;
            }

            if (!initialPost) {
                setLoading(true);
            }

            try {
                const response = await fetch(`${API_BASE_URL}/baidang/getByIdWithDetails/${postId}`);
                const data = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
                }

                if (!cancelled) {
                    setPost(normalizePostResponse(data, backendOrigin));
                    setError('');
                }
            } catch (requestError) {
                console.error('Load post detail failed', requestError);
                if (!cancelled) {
                    setError(requestError.message || 'Không thể tải chi tiết bài đăng.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadPost();
        return () => {
            cancelled = true;
        };
    }, [API_BASE_URL, backendOrigin, initialPost, postId]);

    useEffect(() => {
        setActiveImageIndex(0);
    }, [post?.id]);

    useEffect(() => {
        if (!isMessageModalOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMessageModalOpen]);

    const shareUrl = post?.id ? `${window.location.origin}/post/${post.id}` : window.location.href;
    const canMessage = Boolean(viewerId && post?.authorId && String(viewerId) !== String(post.authorId));
    const totalImages = post?.images?.length || 0;
    const activeImage = post?.images?.[activeImageIndex] || post?.images?.[0] || FALLBACK_IMAGE;
    const commentStatePost = useMemo(() => (
        post
            ? {
                ...post,
                img: post.images?.[0] || FALLBACK_IMAGE,
                time: post.timeLabel || formatDate(post.createdAt, true),
            }
            : null
    ), [post]);

    const openComments = useCallback(() => {
        if (!post?.id) return;
        navigate(`/post/${post.id}/comments`, { state: { post: commentStatePost } });
    }, [commentStatePost, navigate, post?.id]);

    const openSellerProfile = useCallback(() => {
        if (!post?.authorId) return;
        navigate(`/profile/${post.authorId}`);
    }, [navigate, post?.authorId]);

    const openMessageComposer = useCallback(() => {
        if (!post?.authorId) return;
        if (!viewerId) {
            navigate('/login');
            return;
        }

        setMessageError('');
        setMessageDraft('');
        setIsMessageModalOpen(true);
    }, [navigate, post, viewerId]);

    const handleMessageSubmit = useCallback(async () => {
        if (!post?.authorId || !post?.id) return;
        if (!viewerId || !token) {
            navigate('/login');
            return;
        }

        const targetUserId = post.authorId;
        const postImage = post.images?.[0] || '';
        const shareTextLines = [
            `📱 Bài đăng: ${post.title}`,
            '🔗 Xem chi tiết bài đăng này',
            `🆔 Post ID: ${post.id}`,
        ];

        if (postImage) {
            shareTextLines.push(`🖼️ Post Image: ${postImage}`);
        }

        const shareText = shareTextLines.join('\n');
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };

        try {
            setMessageSending(true);
            setMessageError('');

            if (messageDraft.trim()) {
                const textResponse = await fetch(`${API_BASE_URL}/tinnhan/send`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        ID_NguoiNhan: targetUserId,
                        noi_dung: messageDraft.trim(),
                        loai_tin_nhan: 'text',
                        file_dinh_kem: null,
                        tin_nhan_phu_thuoc: null,
                    }),
                });

                if (!textResponse.ok) {
                    throw new Error('Không gửi được lời nhắn tới người bán.');
                }
            }

            const postResponse = await fetch(`${API_BASE_URL}/tinnhan/send`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ID_NguoiNhan: targetUserId,
                    noi_dung: shareText,
                    loai_tin_nhan: 'text',
                    file_dinh_kem: null,
                    tin_nhan_phu_thuoc: null,
                }),
            });

            if (!postResponse.ok) {
                throw new Error('Không gửi được bài viết cho người bán.');
            }

            setIsMessageModalOpen(false);
            setMessageDraft('');

            navigate('/messages', {
                state: {
                    selectedUser: {
                        id: targetUserId,
                        name: post.author,
                        avatar: post.avatar,
                    },
                    focusPostId: post.id,
                },
            });
        } catch (requestError) {
            console.error('Send seller message failed', requestError);
            setMessageError(requestError.message || 'Không thể gửi tin nhắn cho người bán.');
        } finally {
            setMessageSending(false);
        }
    }, [messageDraft, navigate, post, token, viewerId]);

    const copyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch (copyError) {
            console.error('Copy link failed', copyError);
        }
    }, [shareUrl]);

    const showPrevImage = useCallback(() => {
        if (!totalImages) return;
        setActiveImageIndex((current) => (current - 1 + totalImages) % totalImages);
    }, [totalImages]);

    const showNextImage = useCallback(() => {
        if (!totalImages) return;
        setActiveImageIndex((current) => (current + 1) % totalImages);
    }, [totalImages]);

    if (loading && !post) {
        return (
            <div className="post-detail-page">
                <div className="pd-shell">
                    <div className="pd-state-card">
                        <Loader2 size={28} className="spin" />
                        <h1>Đang tải bài đăng</h1>
                        <p>Mình đang lấy chi tiết bài đăng, ảnh, người bán và bình luận gần đây.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !post) {
        return (
            <div className="post-detail-page">
                <div className="pd-shell">
                    <div className="pd-state-card">
                        <ShieldCheck size={28} />
                        <h1>Không mở được bài đăng</h1>
                        <p>{error}</p>
                        <div className="pd-top-actions">
                            <button type="button" className="pd-btn pd-btn-primary" onClick={() => navigate(-1)}>
                                <ArrowLeft size={16} />
                                Quay lại
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="post-detail-page">
            <div className="pd-shell">
                <div className="pd-topbar">
                    <button type="button" className="pd-btn pd-btn-ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} />
                        Quay lại
                    </button>
                    <button type="button" className={`pd-btn pd-btn-ghost${copied ? ' copied' : ''}`} onClick={copyLink}>
                        <Copy size={16} />
                        {copied ? 'Đã sao chép link' : 'Sao chép link'}
                    </button>
                </div>

                {error && (
                    <div className="pd-inline-alert">
                        <ShieldCheck size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="pd-layout">
                    <section className="pd-main-card">
                        <div className="pd-gallery-head">
                            <div>
                                <span className="pd-kicker">Bộ ảnh bài đăng</span>
                                <h1>{post.title}</h1>
                            </div>
                            <span className="pd-gallery-count">{totalImages} ảnh</span>
                        </div>

                        <div className="pd-viewer-shell">
                            <div className="pd-viewer-stage">
                                <img src={activeImage} alt={`${post.title} - ảnh ${activeImageIndex + 1}`} className="pd-viewer-image" />
                                {totalImages > 1 && (
                                    <>
                                        <button type="button" className="pd-viewer-nav pd-viewer-nav-prev" onClick={showPrevImage} aria-label="Ảnh trước">
                                            <ChevronLeft size={22} strokeWidth={2.5} />
                                        </button>
                                        <button type="button" className="pd-viewer-nav pd-viewer-nav-next" onClick={showNextImage} aria-label="Ảnh tiếp theo">
                                            <ChevronRight size={22} strokeWidth={2.5} />
                                        </button>
                                    </>
                                )}
                                <div className="pd-viewer-meta">
                                    <span>{activeImageIndex + 1} / {totalImages}</span>
                                    <strong>{formatCurrency(post.price)}</strong>
                                </div>
                            </div>
                        </div>

                        {post.images.length > 1 && (
                            <div className="pd-thumbnail-strip">
                                {post.images.map((image, index) => (
                                    <button
                                        key={`${image}-${index}`}
                                        type="button"
                                        className={`pd-thumbnail${index === activeImageIndex ? ' active' : ''}`}
                                        onClick={() => setActiveImageIndex(index)}
                                        aria-label={`Xem ảnh ${index + 1}`}
                                    >
                                        <img src={image} alt={`${post.title} thumbnail ${index + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="pd-body-grid">
                            <article className="pd-card">
                                <div className="pd-card-head">
                                    <h2>Mô tả chi tiết</h2>
                                    <span>{post.statusLabel}</span>
                                </div>
                                <p className="pd-description">
                                    {post.description || 'Người bán chưa bổ sung mô tả chi tiết cho bài đăng này.'}
                                </p>
                            </article>

                            <article className="pd-card">
                                <div className="pd-card-head">
                                    <h2>Bình luận gần đây</h2>
                                    <button type="button" className="pd-text-btn" onClick={openComments}>
                                        Xem tất cả
                                    </button>
                                </div>
                                {post.commentsPreview.length > 0 ? (
                                    <div className="pd-comment-list">
                                        {post.commentsPreview.map((comment) => (
                                            <div key={comment.id} className="pd-comment-item">
                                                <img src={comment.avatar} alt={comment.author} />
                                                <div>
                                                    <div className="pd-comment-head">
                                                        <strong>{comment.author}</strong>
                                                        <span>{comment.time}</span>
                                                    </div>
                                                    <p>{comment.content || 'Không có nội dung.'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="pd-empty-note">
                                        Chưa có bình luận nào. Bạn có thể là người mở đầu cuộc trò chuyện.
                                    </div>
                                )}
                            </article>
                        </div>
                    </section>

                    <aside className="pd-sidebar-card">
                        <div className="pd-chip-row">
                            <span className="pd-chip pd-chip-primary">{post.statusLabel}</span>
                            {post.category && <span className="pd-chip">{post.category}</span>}
                            {post.postTypeName && <span className="pd-chip">{post.postTypeName}</span>}
                        </div>

                        <div className="pd-price">{formatCurrency(post.price)}</div>

                        <div className="pd-meta-grid">
                            <DetailMeta icon={Calendar} label="Ngày đăng" value={post.timeLabel || formatDate(post.createdAt, true)} />
                            <DetailMeta icon={MapPin} label="Vị trí" value={post.location || 'Chưa cập nhật'} />
                            <DetailMeta icon={Heart} label="Lượt thích" value={`${post.likeCount} quan tâm`} />
                            <DetailMeta icon={MessageCircle} label="Bình luận" value={`${post.commentCount} trao đổi`} />
                            <DetailMeta icon={Tag} label="Danh mục" value={post.category || 'Đang phân loại'} />
                            <DetailMeta icon={UserRound} label="Người bán" value={post.author} />
                        </div>

                        <div className="pd-seller-card">
                            <img src={post.avatar} alt={post.author} />
                            <div>
                                <strong>{post.author}</strong>
                                <span>Người đăng bài</span>
                            </div>
                            <button type="button" className="pd-text-btn" onClick={openSellerProfile}>
                                Hồ sơ
                            </button>
                        </div>

                        <div className="pd-actions">
                            <button type="button" className="pd-btn pd-btn-primary" onClick={openComments}>
                                <ExternalLink size={16} />
                                Mở bình luận
                            </button>
                            <button type="button" className="pd-btn pd-btn-soft" onClick={openSellerProfile}>
                                <UserRound size={16} />
                                Xem người bán
                            </button>
                            {canMessage && (
                                <button type="button" className="pd-btn pd-btn-soft" onClick={openMessageComposer}>
                                    <Send size={16} />
                                    Nhắn tin ngay
                                </button>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            {isMessageModalOpen && post && (
                <SellerMessageModal
                    post={post}
                    draftMessage={messageDraft}
                    onDraftChange={setMessageDraft}
                    onClose={() => {
                        if (messageSending) return;
                        setIsMessageModalOpen(false);
                        setMessageError('');
                    }}
                    onSubmit={handleMessageSubmit}
                    isSending={messageSending}
                    error={messageError}
                />
            )}
        </div>
    );
}
