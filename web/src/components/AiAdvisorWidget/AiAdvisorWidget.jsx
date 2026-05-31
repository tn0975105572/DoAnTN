import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bot,
    Coins,
    ExternalLink,
    Loader2,
    LogIn,
    MapPin,
    Search,
    Send,
    Sparkles,
    X,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import './AiAdvisorWidget.css';

const FALLBACK_IMAGE = '/paper-plane-blue.png';

const QUICK_PROMPTS = [
    'Tủ lạnh dưới 5 triệu',
    'Đồ học tập còn đang bán',
    'Bàn ghế gần khu của tôi',
];

const STATUS_LABELS = {
    dang_ban: 'Đang bán',
    da_tang: 'Đã tặng',
    da_ban: 'Đã bán',
    da_trao_doi: 'Đã trao đổi',
};

const buildWelcomeMessage = () => ({
    id: 'welcome',
    role: 'assistant',
    content: 'Bạn cần tìm món gì hôm nay?',
    createdAt: new Date(),
    posts: [],
});

const getBackendOrigin = () => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        return 'http://localhost:3000';
    }
};

const formatTime = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const formatCurrency = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 'Liên hệ';
    return `${number.toLocaleString('vi-VN')} đ`;
};

const buildPriceLabel = (value) => {
    if (value === undefined || value === null || value === '') return 'Liên hệ';
    if (typeof value === 'number') return formatCurrency(value);

    const text = String(value).trim();
    if (!text) return 'Liên hệ';
    if (/[^0-9.,\s]/.test(text)) return text;

    const compact = text.replace(/\s+/g, '');
    if (/^\d+([.,]\d{1,2})?$/.test(compact)) {
        return formatCurrency(Number(compact.replace(',', '.')));
    }

    const digits = compact.replace(/\D/g, '');
    return digits ? formatCurrency(Number(digits)) : text;
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
    if (cleaned.startsWith('uploads/')) return `${backendOrigin}/${cleaned}`;

    return `${backendOrigin}/uploads/${cleaned}`;
};

const firstFilled = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const normalizeStatus = (status) => {
    const key = String(status || '').trim().toLowerCase();
    return STATUS_LABELS[key] || firstFilled(status, 'Đang cập nhật');
};

const pickImageValue = (image) => {
    if (!image) return '';
    if (typeof image === 'string') return image;
    return firstFilled(image.LinkAnh, image.link, image.url, image.src, image.image, '');
};

const normalizePost = (post, backendOrigin) => {
    if (!post || typeof post !== 'object') return null;

    const rawImages = [
        post.image,
        post.image_url,
        post.imageUrl,
        post.img,
        ...(Array.isArray(post.imageUrls) ? post.imageUrls : []),
        ...(Array.isArray(post.DanhSachAnh) ? post.DanhSachAnh.map(pickImageValue) : []),
    ].filter(Boolean);

    const rawPrice = firstFilled(post.priceLabel, post.price_text, post.priceText, post.gia_label, post.price, post.gia, post.Gia);

    return {
        id: firstFilled(post.id, post.post_id, post.ID_BaiDang, post.postId, post.ID_Post, ''),
        authorId: firstFilled(post.authorId, post.seller_id, post.ID_NguoiDung, ''),
        title: firstFilled(post.title, post.tieu_de, post.TieuDe, 'Bài đăng'),
        description: firstFilled(post.description, post.mo_ta, post.MoTa, ''),
        image: normalizeAssetUrl(pickImageValue(rawImages[0]), backendOrigin) || FALLBACK_IMAGE,
        priceLabel: buildPriceLabel(rawPrice),
        location: firstFilled(post.location, post.vi_tri, post.ViTri, 'Chưa cập nhật'),
        statusLabel: normalizeStatus(firstFilled(post.status, post.trang_thai, post.TrangThai, '')),
        category: firstFilled(post.category, post.TenDanhMuc, post.danh_muc, ''),
        postType: firstFilled(post.postType, post.post_type, post.type, post.TenLoaiBaiDang, post.loai_bai_dang, ''),
        reason: firstFilled(post.reason, ''),
    };
};

const normalizePosts = (posts, backendOrigin) => {
    if (!Array.isArray(posts)) return [];
    return posts
        .map((post) => normalizePost(post, backendOrigin))
        .filter(Boolean);
};

const buildHistoryPayload = (messages) => messages
    .filter((message) => !message.isError)
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .filter((message) => message.id !== 'welcome')
    .slice(-8)
    .map((message) => ({
        role: message.role,
        content: message.content,
    }));

function AdvisorPostCard({ post, onOpen }) {
    const href = post.id ? `/post/${post.id}` : '#';

    return (
        <a
            href={href}
            className="aia-post-card"
            onClick={(event) => {
                event.preventDefault();
                onOpen(post);
            }}
            title="Mở bài đăng"
        >
            <img className="aia-post-image" src={post.image} alt={post.title} />
            <span className="aia-post-status">{post.statusLabel}</span>
            <div className="aia-post-body">
                <strong>{post.title}</strong>
                <span className="aia-post-price">
                    <Coins size={13} />
                    <span>{post.priceLabel}</span>
                </span>
                <span className="aia-post-location">
                    <MapPin size={13} />
                    <span>{post.location}</span>
                </span>
                {(post.reason || post.description) && (
                    <span className="aia-post-note">
                        {post.reason || post.description}
                    </span>
                )}
            </div>
            <span className="aia-post-open">
                <ExternalLink size={14} />
            </span>
        </a>
    );
}

export default function AiAdvisorWidget() {
    const navigate = useNavigate();
    const { token, userId } = useAuthSession();
    const backendOrigin = useMemo(() => getBackendOrigin(), []);
    const messagesEndRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [messages, setMessages] = useState(() => [buildWelcomeMessage()]);

    const isAuthenticated = Boolean(token && userId);
    const canSubmit = Boolean(inputText.trim()) && !isLoading;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isLoading]);

    useEffect(() => {
        const closeForChatWidget = () => setIsOpen(false);
        window.addEventListener('olodo:chat-widget-open', closeForChatWidget);
        return () => window.removeEventListener('olodo:chat-widget-open', closeForChatWidget);
    }, []);

    useEffect(() => {
        if (isAuthenticated) setError('');
    }, [isAuthenticated]);

    const openPost = useCallback((post) => {
        if (!post?.id) return;
        navigate(`/post/${post.id}`);
        setIsOpen(false);
    }, [navigate]);

    const toggleOpen = useCallback(() => {
        setIsOpen((current) => {
            const next = !current;
            if (next) window.dispatchEvent(new CustomEvent('olodo:ai-advisor-open'));
            return next;
        });
    }, []);

    const sendMessage = useCallback(async (presetText = '') => {
        const text = String(presetText || inputText).trim();
        if (!text || isLoading) return;

        if (!isAuthenticated) {
            setError('Bạn cần đăng nhập để sử dụng AI gợi ý.');
            return;
        }

        const userMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: text,
            createdAt: new Date(),
            posts: [],
        };

        const history = buildHistoryPayload(messages);
        setMessages((current) => [...current, userMessage]);
        setInputText('');
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/tinnhanai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: text,
                    history,
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
            }

            const responseData = payload?.data || payload || {};
            const answer = responseData.answer || responseData.reply || 'Mình chưa tìm được câu trả lời phù hợp.';
            const nextPosts = normalizePosts(
                responseData.posts || responseData.source_posts || responseData.searchResults || responseData.results,
                backendOrigin,
            );
            const showPosts = firstFilled(responseData.meta?.showPosts, responseData.meta?.show_posts, true);

            setMessages((current) => [
                ...current,
                {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: answer,
                    createdAt: new Date(),
                    posts: showPosts === false ? [] : nextPosts,
                },
            ]);
        } catch (requestError) {
            console.error('AI advisor request failed', requestError);
            setError(requestError.message || 'Không thể kết nối AI gợi ý.');
            setMessages((current) => [
                ...current,
                {
                    id: `assistant_error_${Date.now()}`,
                    role: 'assistant',
                    content: 'Hiện tại AI chưa phản hồi được. Bạn thử lại sau hoặc kiểm tra backend.',
                    createdAt: new Date(),
                    posts: [],
                    isError: true,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [backendOrigin, inputText, isAuthenticated, isLoading, messages, token]);

    const handleSubmit = useCallback((event) => {
        event.preventDefault();
        sendMessage();
    }, [sendMessage]);

    return (
        <>
            <button
                type="button"
                className={`aia-fab${isOpen ? ' is-open' : ''}`}
                onClick={toggleOpen}
                aria-label="AI gợi ý bài đăng"
                title="AI gợi ý bài đăng"
            >
                {isOpen ? <X size={22} /> : <Sparkles size={22} />}
                {!isOpen && <span className="aia-fab-tag">AI</span>}
            </button>

            {isOpen && (
                <section className="aia-panel" aria-label="AI gợi ý bài đăng">
                    <header className="aia-header">
                        <div className="aia-brand">
                            <span className="aia-brand-mark">
                                <Bot size={20} />
                            </span>
                            <div className="aia-brand-copy">
                                <span>OLODO AI</span>
                                <strong>Gợi ý bài đăng</strong>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="aia-icon-btn"
                            onClick={() => setIsOpen(false)}
                            aria-label="Đóng AI gợi ý"
                            title="Đóng"
                        >
                            <X size={18} />
                        </button>
                    </header>

                    {error && (
                        <div className="aia-alert">
                            <LogIn size={15} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="aia-quick-row">
                        {QUICK_PROMPTS.map((prompt) => (
                            <button
                                type="button"
                                key={prompt}
                                onClick={() => sendMessage(prompt)}
                                disabled={isLoading}
                            >
                                <Search size={13} />
                                <span>{prompt}</span>
                            </button>
                        ))}
                    </div>

                    <div className="aia-messages">
                        {messages.map((message) => (
                            <div key={message.id} className={`aia-message-row ${message.role}${message.isError ? ' is-error' : ''}`}>
                                <div className="aia-message-bubble">
                                    <p>{message.content}</p>
                                    {Array.isArray(message.posts) && message.posts.length > 0 && (
                                        <div className="aia-post-list">
                                            <div className="aia-post-list-head">
                                                <Sparkles size={14} />
                                                <span>{message.posts.length} bài đăng phù hợp</span>
                                            </div>
                                            {message.posts.slice(0, 5).map((post, index) => (
                                                <AdvisorPostCard
                                                    key={post.id || `${post.title}_${index}`}
                                                    post={post}
                                                    onOpen={openPost}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <time>{formatTime(message.createdAt)}</time>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="aia-message-row assistant">
                                <div className="aia-message-bubble aia-typing">
                                    <Loader2 size={16} className="aia-spin" />
                                    <span>Đang tìm bài đăng...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="aia-compose" onSubmit={handleSubmit}>
                        <Search size={18} />
                        <input
                            type="text"
                            value={inputText}
                            onChange={(event) => setInputText(event.target.value)}
                            placeholder="Tên món, ngân sách, khu vực..."
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={!canSubmit} aria-label="Gửi câu hỏi">
                            {isLoading ? <Loader2 size={17} className="aia-spin" /> : <Send size={17} />}
                        </button>
                    </form>
                </section>
            )}
        </>
    );
}
