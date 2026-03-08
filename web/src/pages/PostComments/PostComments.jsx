import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    ArrowLeft, MessageSquare, Send, Heart,
    ChevronDown, ChevronUp, Reply, MoreHorizontal, Smile,
} from 'lucide-react';
import './PostComments.css';

// ─── Dữ liệu mẫu đa cấp ─────────────────────────────────────────────────────
const MOCK_COMMENTS = [
    {
        id: 1,
        author: 'Phạm Minh Đức',
        avatar: 'https://i.pravatar.cc/80?img=12',
        time: '1 giờ trước',
        text: 'Sản phẩm còn bảo hành không bạn? Mình rất quan tâm đến cái này!',
        likes: 5, liked: false,
        replies: [
            {
                id: 11, author: 'Nguyễn Minh Tuấn', avatar: 'https://i.pravatar.cc/80?img=11',
                time: '55 phút trước', text: 'Còn bảo hành 6 tháng nữa bạn nhé, mua mới được 6 tháng thôi.',
                likes: 2, liked: false, isAuthor: true,
                replies: [
                    { id: 111, author: 'Phạm Minh Đức', avatar: 'https://i.pravatar.cc/80?img=12', time: '50 phút trước', text: 'Oke bạn ơi, mình có thể xem thêm ảnh thực tế được không?', likes: 0, liked: false, replies: [] },
                    { id: 112, author: 'Lê Thị Lan', avatar: 'https://i.pravatar.cc/80?img=47', time: '40 phút trước', text: 'Bạn ship được không ạ? Mình ở Đà Nẵng.', likes: 1, liked: false, replies: [] },
                ],
            },
        ],
    },
    {
        id: 2, author: 'Nguyễn Thị Hương', avatar: 'https://i.pravatar.cc/80?img=25',
        time: '45 phút trước', text: 'Cho mình xem thêm ảnh thực tế được không? Trông có vẻ ổn đó.',
        likes: 1, liked: false,
        replies: [
            { id: 21, author: 'Vũ Hoàng Nam', avatar: 'https://i.pravatar.cc/80?img=65', time: '30 phút trước', text: 'Mình đã mua rồi, sản phẩm rất tốt, recommend!', likes: 4, liked: false, replies: [] },
        ],
    },
    {
        id: 3, author: 'Trần Văn Nam', avatar: 'https://i.pravatar.cc/80?img=33',
        time: '30 phút trước', text: 'Giá còn thương lượng được không ạ? 😊',
        likes: 0, liked: false, replies: [],
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
let nextId = 1000;
const genId = () => ++nextId;

function addReplyTo(comments, targetId, newReply) {
    return comments.map((c) => {
        if (c.id === targetId) return { ...c, replies: [...(c.replies || []), newReply] };
        if (c.replies?.length) return { ...c, replies: addReplyTo(c.replies, targetId, newReply) };
        return c;
    });
}

function toggleLikeOn(comments, targetId) {
    return comments.map((c) => {
        if (c.id === targetId) return { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 };
        if (c.replies?.length) return { ...c, replies: toggleLikeOn(c.replies, targetId) };
        return c;
    });
}

function countAll(comments) {
    return comments.reduce((acc, c) => acc + 1 + countAll(c.replies || []), 0);
}

// ─── CommentItem (đệ quy) ────────────────────────────────────────────────────
function CommentItem({ comment, depth = 0, onReply, onLike, replyingTo, myAvatar }) {
    const [collapsed, setCollapsed] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const hasReplies = comment.replies?.length > 0;
    const isReplying = replyingTo === comment.id;
    const indent = Math.min(depth, 3);

    return (
        <div className={`comment-node depth-${indent}`}>
            {depth > 0 && <div className="thread-line" />}
            <div className="comment-item">
                <div className="comment-left">
                    <img src={comment.avatar} alt={comment.author} className="comment-avatar" />
                    {hasReplies && !collapsed && <div className="avatar-connector" />}
                </div>
                <div className="comment-body">
                    <div className={`comment-bubble ${comment.isAuthor ? 'is-author' : ''}`}>
                        <div className="comment-header">
                            <span className="comment-author">
                                {comment.author}
                                {comment.isAuthor && <span className="author-badge">Tác giả</span>}
                            </span>
                            <span className="comment-time">{comment.time}</span>
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
                        <p className="comment-text">{comment.text}</p>
                    </div>
                    <div className="comment-actions">
                        <button className={`action-btn like-btn ${comment.liked ? 'liked' : ''}`} onClick={() => onLike(comment.id)}>
                            <Heart size={13} strokeWidth={2} fill={comment.liked ? 'currentColor' : 'none'} />
                            {comment.likes > 0 && <span>{comment.likes}</span>}
                        </button>
                        <button className="action-btn reply-btn" onClick={() => onReply(comment.id)}>
                            <Reply size={13} strokeWidth={2} /> Trả lời
                        </button>
                        {hasReplies && (
                            <button className="action-btn collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                                {collapsed
                                    ? <><ChevronDown size={13} /> Xem {comment.replies.length} trả lời</>
                                    : <><ChevronUp size={13} /> Ẩn trả lời</>}
                            </button>
                        )}
                    </div>
                    {isReplying && (
                        <ReplyInput parentId={comment.id} onReply={onReply} myAvatar={myAvatar} replyingTo={comment.author} />
                    )}
                </div>
            </div>
            {hasReplies && !collapsed && (
                <div className="replies-container">
                    {comment.replies.map((r) => (
                        <CommentItem key={r.id} comment={r} depth={depth + 1} onReply={onReply} onLike={onLike} replyingTo={replyingTo} myAvatar={myAvatar} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── ReplyInput ──────────────────────────────────────────────────────────────
function ReplyInput({ parentId, onReply, myAvatar, replyingTo }) {
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
            <img src={myAvatar} alt="Bạn" className="reply-avatar" />
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

// ─── PostComments (trang chính) ──────────────────────────────────────────────
export default function PostComments() {
    const navigate = useNavigate();
    const { postId } = useParams();
    const { state } = useLocation();
    const post = state?.post;

    const [comments, setComments] = useState(MOCK_COMMENTS);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [sortMode, setSortMode] = useState('newest');

    const MY_AVATAR = 'https://i.pravatar.cc/80?img=7';
    const totalCount = countAll(comments);

    const displayPost = post || {
        id: postId || '1',
        author: 'Nguyễn Minh Tuấn',
        avatar: 'https://i.pravatar.cc/150?img=11',
        time: '2 giờ trước',
        location: 'Hà Nội',
        title: 'MacBook Pro 14" M3 – Còn BH 6 tháng',
        price: '38.000.000',
        img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=400',
    };

    const handleSubmitComment = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setComments((prev) => [
            { id: genId(), author: 'Bạn', avatar: MY_AVATAR, time: 'Vừa xong', text: newComment.trim(), likes: 0, liked: false, replies: [] },
            ...prev,
        ]);
        setNewComment('');
    };

    const handleReply = (id, text) => {
        if (text) {
            setComments((prev) => addReplyTo(prev, id, { id: genId(), author: 'Bạn', avatar: MY_AVATAR, time: 'Vừa xong', text, likes: 0, liked: false, replies: [] }));
            setReplyingTo(null);
        } else {
            setReplyingTo((prev) => (prev === id ? null : id));
        }
    };

    const handleLike = (id) => setComments((prev) => toggleLikeOn(prev, id));

    const sortedComments = [...comments].sort((a, b) =>
        sortMode === 'top' ? b.likes - a.likes : b.id - a.id
    );

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

            {/* Comment list */}
            <div className="comments-list" onClick={(e) => e.stopPropagation()}>
                {sortedComments.length === 0 && (
                    <div className="comments-empty">
                        <Smile size={40} strokeWidth={1.5} />
                        <p>Hãy là người đầu tiên bình luận!</p>
                    </div>
                )}
                {sortedComments.map((c) => (
                    <CommentItem key={c.id} comment={c} depth={0}
                        onReply={handleReply} onLike={handleLike}
                        replyingTo={replyingTo} myAvatar={MY_AVATAR} />
                ))}
            </div>

            {/* Input sticky */}
            <form className="comments-form" onSubmit={handleSubmitComment} onClick={(e) => e.stopPropagation()}>
                <img src={MY_AVATAR} alt="Bạn" className="form-my-avatar" />
                <div className="comments-input-wrap">
                    <input
                        type="text" className="comments-input" placeholder="Viết bình luận..."
                        value={newComment} onChange={(e) => setNewComment(e.target.value)} maxLength={500}
                    />
                </div>
                <button type="submit" className="comments-send" disabled={!newComment.trim()} aria-label="Gửi">
                    <Send size={18} strokeWidth={2} />
                </button>
            </form>
        </div>
    );
}
