import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    ArrowLeft, MessageSquare, Send, Heart,
    ChevronDown, ChevronUp, Reply, MoreHorizontal, Smile,
} from 'lucide-react';
import { useAuthSession } from '../../utils/authSession';
import ProfileAvatarLink from '../../components/profile/ProfileAvatarLink';
import './PostComments.css';

/* ════════ API CONFIG ════════ */
const API_BASE = 'http://localhost:3000';
const API_URLS = {
    GET_COMMENT_TREE: `${API_BASE}/api/binhluanbaidang/getCommentTreeByPost/`,
    CREATE_COMMENT: `${API_BASE}/api/binhluanbaidang/create`,
    GET_USER_INFO: `${API_BASE}/api/nguoidung/get/`,
    LIKE_BY_POST: `${API_BASE}/api/likebaidang/getLikesByPostId/`,
    COMMENT_COUNT_BY_POST: `${API_BASE}/api/binhluanbaidang/getCommentCountByPost/`,
};

// Chuyển bất kỳ URL có IP thành localhost
function normalizeUrl(url) {
    if (!url) return url;
    return url.replace(/^http:\/\/(?!localhost)[\d.]+:(\d+)/, 'http://localhost:$1');
}

// Cache user info
const userInfoCache = new Map();

// ─── Helpers: đếm tổng comments ──────────────────────────────────────────
function countAll(comments) {
    return comments.reduce((acc, c) => acc + 1 + countAll(c.children || []), 0);
}

// ─── Extract all user IDs from comment tree ──────────────────────────────
function extractUserIds(comments, ids = new Set()) {
    comments.forEach((comment) => {
        if (comment.ID_NguoiDung) ids.add(comment.ID_NguoiDung);
        if (comment.children?.length) extractUserIds(comment.children, ids);
    });
    return ids;
}

// ─── CommentItem (đệ quy, dùng cho API data) ────────────────────────────
function CommentItem({ comment, userMap, depth = 0, onReply, onLike, replyingTo, myAvatar, currentUserId }) {
    const [collapsed, setCollapsed] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const hasReplies = comment.children?.length > 0;
    const isReplying = replyingTo === comment.ID_BinhLuan;
    const indent = Math.min(depth, 3);

    const user = userMap[comment.ID_NguoiDung] || {};
    const authorName = user.ho_ten || 'Người dùng';
    const avatarUrl = user.anh_dai_dien
        ? normalizeUrl(user.anh_dai_dien.startsWith('http') ? user.anh_dai_dien : `${API_BASE}/uploads/${user.anh_dai_dien}`)
        : `https://i.pravatar.cc/80?u=${comment.ID_NguoiDung}`;
    const isAuthor = String(comment.ID_NguoiDung) === String(currentUserId);

    const normalizedContent = comment.noi_dung ? comment.noi_dung.replace(/\s+/g, ' ').trim() : '';

    const timeString = (() => {
        try {
            const date = new Date(comment.thoi_gian_binh_luan);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            if (diffMin < 1) return 'Vừa xong';
            if (diffMin < 60) return `${diffMin} phút trước`;
            if (diffHrs < 24) return `${diffHrs} giờ trước`;
            if (diffDays < 7) return `${diffDays} ngày trước`;
            return date.toLocaleDateString('vi-VN');
        } catch {
            return '';
        }
    })();

    return (
        <div className={`comment-node depth-${indent}`}>
            {depth > 0 && <div className="thread-line" />}
            <div className="comment-item">
                <div className="comment-left">
                    <ProfileAvatarLink userId={comment.ID_NguoiDung}>
                        <img src={avatarUrl} alt={authorName} className="comment-avatar" />
                    </ProfileAvatarLink>
                    {hasReplies && !collapsed && <div className="avatar-connector" />}
                </div>
                <div className="comment-body">
                    <div className={`comment-bubble ${isAuthor ? 'is-author' : ''}`}>
                        <div className="comment-header">
                            <span className="comment-author">
                                {authorName}
                                {isAuthor && <span className="author-badge">Tác giả</span>}
                            </span>
                            <span className="comment-time">{timeString}</span>
                            <button className="comment-menu-btn" onClick={() => setShowMenu(!showMenu)} aria-label="Tùy chọn">
                                <MoreHorizontal size={15} />
                            </button>
                            {showMenu && (
                                <div className="comment-menu">
                                    <button onClick={() => setShowMenu(false)}>Sao chép</button>
                                    <button onClick={() => setShowMenu(false)}>Báo cáo</button>
                                </div>
                            )}
                        </div>
                        <p className="comment-text">{normalizedContent}</p>
                    </div>
                    <div className="comment-actions">
                        <button className={`action-btn like-btn ${comment.liked ? 'liked' : ''}`} onClick={() => onLike?.(comment.ID_BinhLuan)}>
                            <Heart size={13} strokeWidth={2} fill={comment.liked ? 'currentColor' : 'none'} />
                            {comment.likes > 0 && <span>{comment.likes}</span>}
                        </button>
                        <button className="action-btn reply-btn" onClick={() => onReply(comment.ID_BinhLuan)}>
                            <Reply size={13} strokeWidth={2} /> Trả lời
                        </button>
                        {hasReplies && (
                            <button className="action-btn collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                                {collapsed
                                    ? <><ChevronDown size={13} /> Xem {comment.children.length} trả lời</>
                                    : <><ChevronUp size={13} /> Ẩn trả lời</>}
                            </button>
                        )}
                    </div>
                    {isReplying && (
                        <ReplyInput
                            parentId={comment.ID_BinhLuan}
                            onReply={onReply}
                            myAvatar={myAvatar}
                            replyingTo={authorName}
                            currentUserId={currentUserId}
                        />
                    )}
                </div>
            </div>
            {hasReplies && !collapsed && (
                <div className="replies-container">
                    {comment.children.map((r) => (
                        <CommentItem
                            key={r.ID_BinhLuan}
                            comment={r}
                            userMap={userMap}
                            depth={depth + 1}
                            onReply={onReply}
                            onLike={onLike}
                            replyingTo={replyingTo}
                            myAvatar={myAvatar}
                            currentUserId={currentUserId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── ReplyInput ──────────────────────────────────────────────────────────
function ReplyInput({ parentId, onReply, myAvatar, replyingTo, currentUserId }) {
    const [text, setText] = useState('');
    const inputRef = useRef(null);
    useEffect(() => { inputRef.current?.focus(); }, []);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onReply(parentId, text.trim());
        setText('');
    };
    return (
        <form className="inline-reply-form" onSubmit={handleSubmit}>
            <ProfileAvatarLink userId={currentUserId} stopPropagation={false}>
                <img src={myAvatar} alt="Bạn" className="reply-avatar" />
            </ProfileAvatarLink>
            <div className="reply-input-wrap">
                <span className="replying-hint">Đang trả lời <strong>@{replyingTo}</strong></span>
                <div className="reply-row">
                    <input ref={inputRef} type="text" value={text} onChange={(e) => setText(e.target.value)}
                        placeholder={`Trả lời ${replyingTo}...`} className="reply-input" maxLength={500} />
                    <button type="submit" className="reply-send" disabled={!text.trim()}><Send size={15} /></button>
                    <button type="button" className="reply-cancel" onClick={() => onReply(null)}>Hủy</button>
                </div>
            </div>
        </form>
    );
}

// ─── PostComments (trang chính — gọi API thật) ───────────────────────────
export default function PostComments() {
    const navigate = useNavigate();
    const { postId } = useParams();
    const { state } = useLocation();
    const post = state?.post;

    const [comments, setComments] = useState([]);
    const [userMap, setUserMap] = useState({});
    const userMapRef = useRef({});
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [sortMode, setSortMode] = useState('newest');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const { token, userId } = useAuthSession();

    // keep ref in sync
    useEffect(() => {
        userMapRef.current = userMap;
    }, [userMap]);

    // ── Fetch user info ──
    const fetchUserById = useCallback(async (id, signal) => {
        if (userInfoCache.has(id)) return userInfoCache.get(id);
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await fetch(`${API_URLS.GET_USER_INFO}${id}`, { headers, signal });
            if (!res.ok) {
                const fallback = { ID_NguoiDung: id, ho_ten: 'Người dùng', anh_dai_dien: null };
                userInfoCache.set(id, fallback);
                return fallback;
            }
            const data = await res.json();
            const user = data.user || data;
            userInfoCache.set(id, user);
            return user;
        } catch (err) {
            if (err.name === 'AbortError') throw err;
            const fallback = { ID_NguoiDung: id, ho_ten: 'Người dùng', anh_dai_dien: null };
            userInfoCache.set(id, fallback);
            return fallback;
        }
    }, [token]);

    // ── Fetch comments + user info ──
    const fetchComments = useCallback(async (signal) => {
        if (!postId) return;
        setIsLoading(true);
        setError(null);
        try {
            const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
            const res = await fetch(`${API_URLS.GET_COMMENT_TREE}${postId}`, { headers, signal });
            if (!res.ok) throw new Error(`Không thể tải bình luận (status ${res.status})`);
            const dataComments = await res.json();
            setComments(dataComments);

            // Fetch user info cho tất cả user IDs
            const userIds = extractUserIds(dataComments);
            if (userId) userIds.add(userId);

            const idsToFetch = Array.from(userIds).filter(id => !userMapRef.current[id]);
            if (idsToFetch.length > 0) {
                const fetchedUsers = await Promise.all(
                    idsToFetch.map(id =>
                        fetchUserById(id, signal).catch(err => {
                            if (err.name === 'AbortError') throw err;
                            return { ID_NguoiDung: id, ho_ten: 'Người dùng', anh_dai_dien: null };
                        })
                    )
                );
                setUserMap(prev => {
                    const merged = { ...prev };
                    fetchedUsers.forEach(u => {
                        if (u?.ID_NguoiDung) merged[u.ID_NguoiDung] = u;
                    });
                    return merged;
                });
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Lỗi khi fetch comments:', err);
            setError(err.message || 'Lỗi khi tải bình luận');
        } finally {
            setIsLoading(false);
        }
    }, [postId, token, userId, fetchUserById]);

    useEffect(() => {
        if (!postId) return;
        const controller = new AbortController();
        fetchComments(controller.signal);
        return () => controller.abort();
    }, [postId, token, userId, fetchComments]);

    // ── My avatar ──
    const myUser = userMap[userId] || {};
    const myAvatar = myUser.anh_dai_dien
        ? normalizeUrl(myUser.anh_dai_dien.startsWith('http') ? myUser.anh_dai_dien : `${API_BASE}/uploads/${myUser.anh_dai_dien}`)
        : 'https://i.pravatar.cc/80?img=7';

    const totalCount = countAll(comments);

    const displayPost = post || {
        id: postId || '1',
        author: 'Đang tải...',
        avatar: 'https://i.pravatar.cc/150?img=11',
        time: '',
        location: '',
        title: 'Đang tải bài viết...',
        price: '',
        img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=400',
    };

    // ── Submit comment (API thật) ──
    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;
        if (!userId || !token) {
            setError('Vui lòng đăng nhập để bình luận.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ID_BaiDang: postId,
                noi_dung: newComment.trim(),
                ID_BinhLuanCha: null,
            };
            const res = await fetch(API_URLS.CREATE_COMMENT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Không thể thêm bình luận.');

            // Reload comments
            await fetchComments();
            setNewComment('');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Lỗi khi gửi bình luận.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Reply (API thật) ──
    const handleReply = async (id, text) => {
        if (text) {
            if (!userId || !token) {
                setError('Vui lòng đăng nhập để trả lời.');
                return;
            }
            setIsSubmitting(true);
            try {
                const payload = {
                    ID_BaiDang: postId,
                    noi_dung: text,
                    ID_BinhLuanCha: id,
                };
                const res = await fetch(API_URLS.CREATE_COMMENT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error('Không thể trả lời bình luận.');
                await fetchComments();
                setReplyingTo(null);
            } catch (err) {
                console.error(err);
                setError(err.message || 'Lỗi khi gửi trả lời.');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            setReplyingTo(prev => (prev === id ? null : id));
        }
    };

    const handleLike = (id) => {
        // Placeholder — có thể thêm API like comment sau
    };

    // ── Sort comments ──
    const sortedComments = [...comments].sort((a, b) => {
        if (sortMode === 'top') return (b.likes || 0) - (a.likes || 0);
        // newest: theo thời gian
        return new Date(b.thoi_gian_binh_luan) - new Date(a.thoi_gian_binh_luan);
    });

    return (
        <div className="post-comments-page" onClick={() => setReplyingTo(null)}>
            {/* Header */}
            <header className="comments-header">
                <button type="button" className="comments-back" onClick={() => navigate(-1)} aria-label="Quay lại">
                    <ArrowLeft size={22} strokeWidth={2} />
                </button>
                <h1 className="comments-title">
                    <MessageSquare size={20} strokeWidth={2} /> Bình luận
                </h1>
            </header>

            {/* Post summary */}
            <section className="comments-post-summary">
                <div className="comments-post-thumb">
                    <img src={displayPost.img} alt={displayPost.title} />
                </div>
                <div className="comments-post-info">
                    <h2 className="comments-post-title">{displayPost.title}</h2>
                    <p className="comments-post-meta">
                        {displayPost.author} · {displayPost.time}
                        {displayPost.location && ` · ${displayPost.location}`}
                    </p>
                    <p className="comments-post-price">{displayPost.price} ₫</p>
                </div>
            </section>

            {/* Toolbar */}
            <div className="comments-toolbar">
                <span className="comments-count">
                    <MessageSquare size={14} /> {totalCount} bình luận
                </span>
                <div className="sort-tabs">
                    <button className={`sort-tab ${sortMode === 'newest' ? 'active' : ''}`} onClick={() => setSortMode('newest')}>Mới nhất</button>
                    <button className={`sort-tab ${sortMode === 'top' ? 'active' : ''}`} onClick={() => setSortMode('top')}>Nổi bật</button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="comments-error">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {/* Comment list */}
            <div className="comments-list" onClick={(e) => e.stopPropagation()}>
                {isLoading ? (
                    <div className="comments-loading">
                        <div className="comments-spinner" />
                        <span>Đang tải bình luận...</span>
                    </div>
                ) : sortedComments.length === 0 ? (
                    <div className="comments-empty">
                        <Smile size={40} strokeWidth={1.5} />
                        <p>Hãy là người đầu tiên bình luận!</p>
                    </div>
                ) : (
                    sortedComments.map((c) => (
                        <CommentItem
                            key={c.ID_BinhLuan}
                            comment={c}
                            userMap={userMap}
                            depth={0}
                            onReply={handleReply}
                            onLike={handleLike}
                            replyingTo={replyingTo}
                            myAvatar={myAvatar}
                            currentUserId={userId}
                        />
                    ))
                )}
            </div>

            {/* Input sticky */}
            <form className="comments-form" onSubmit={handleSubmitComment} onClick={(e) => e.stopPropagation()}>
                <ProfileAvatarLink userId={userId} stopPropagation={false}>
                    <img src={myAvatar} alt="Bạn" className="form-my-avatar" />
                </ProfileAvatarLink>
                <div className="comments-input-wrap">
                    <input
                        type="text" className="comments-input"
                        placeholder={isSubmitting ? "Đang gửi..." : "Viết bình luận..."}
                        value={newComment} onChange={(e) => setNewComment(e.target.value)} maxLength={500}
                        disabled={isSubmitting}
                    />
                </div>
                <button type="submit" className="comments-send" disabled={!newComment.trim() || isSubmitting} aria-label="Gửi">
                    <Send size={18} strokeWidth={2} />
                </button>
            </form>
        </div>
    );
}
