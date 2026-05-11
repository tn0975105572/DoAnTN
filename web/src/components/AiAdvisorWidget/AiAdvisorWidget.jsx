import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Bot,
    Coins,
    ExternalLink,
    Loader2,
    MapPin,
    MessageSquareText,
    Search,
    Send,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import './AiAdvisorWidget.css';

const MotionAside = motion.aside;

const QUICK_PROMPTS = [
    'Tìm laptop dưới 5 triệu',
    'Gợi ý đồ học tập còn đang bán',
    'Có món nào ở gần Quận 7 không?',
];

const STATUS_LABELS = {
    dang_ban: 'Đang bán',
    da_tang: 'Đang tặng',
    da_ban: 'Đã bán',
    da_trao_doi: 'Đã trao đổi',
};

const FALLBACK_IMAGE = '/paper-plane-blue.png';

const formatTime = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const normalizeStatus = (status) => STATUS_LABELS[String(status || '').trim()] || 'Đang cập nhật';

const buildHistoryPayload = (messages) => messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .filter((message) => message.id !== 'welcome')
    .slice(-8)
    .map((message) => ({
        role: message.role,
        content: message.content,
    }));

function AdvisorPostCard({ post, onOpen }) {
    const image = post?.image || post?.imageUrls?.[0] || FALLBACK_IMAGE;
    const href = post?.id ? `/post/${post.id}` : '#';

    return (
        <a
            href={href}
            className="ai-post-card"
            onClick={(event) => {
                event.preventDefault();
                onOpen(post);
            }}
            title="Mở chi tiết bài đăng"
        >
            <img src={image} alt={post?.title || 'Bài đăng'} className="ai-post-image" />
            <div className="ai-post-body">
                <div className="ai-post-title">{post?.title || 'Bài đăng'}</div>
                <div className="ai-post-price">
                    <Coins size={13} />
                    <span>{post?.priceLabel || 'Liên hệ'}</span>
                </div>
                <div className="ai-post-meta">
                    <span>
                        <MapPin size={12} />
                        {post?.location || 'Chưa cập nhật'}
                    </span>
                    <span>{normalizeStatus(post?.status)}</span>
                </div>
            </div>
            <span className="ai-post-open">
                <ExternalLink size={14} />
                <span>Mở bài</span>
            </span>
        </a>
    );
}

export default function AiAdvisorWidget() {
    const navigate = useNavigate();
    const { token, userId } = useAuthSession();
    const messagesEndRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [messages, setMessages] = useState(() => ([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Bạn đang tìm món gì hôm nay?',
            createdAt: new Date(),
            posts: [],
        },
    ]));

    const isAuthenticated = Boolean(token && userId);
    const hasOnlyWelcome = messages.length === 1 && messages[0]?.id === 'welcome';

    const panelVariants = useMemo(() => ({
        hidden: { opacity: 0, y: 18, scale: 0.96 },
        visible: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 14, scale: 0.97 },
    }), []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isLoading]);

    useEffect(() => {
        const closeForChatWidget = () => setIsOpen(false);
        window.addEventListener('olodo:chat-widget-open', closeForChatWidget);
        return () => window.removeEventListener('olodo:chat-widget-open', closeForChatWidget);
    }, []);

    const openPost = useCallback((post) => {
        if (!post?.id) return;
        navigate(`/post/${post.id}`);
        setIsOpen(false);
    }, [navigate]);

    const sendMessage = useCallback(async (presetText = '') => {
        const text = String(presetText || inputText).trim();
        if (!text || isLoading) return;

        if (!isAuthenticated) {
            setError('Bạn cần đăng nhập để sử dụng AI tư vấn.');
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

            setMessages((current) => [
                ...current,
                {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: payload?.data?.answer || 'AI chưa có câu trả lời phù hợp.',
                    createdAt: new Date(),
                    posts: payload?.data?.meta?.showPosts && Array.isArray(payload?.data?.posts)
                        ? payload.data.posts
                        : [],
                    meta: payload?.data?.meta || null,
                },
            ]);
        } catch (requestError) {
            console.error('AI advisor request failed', requestError);
            setError(requestError.message || 'Không thể kết nối AI tư vấn.');
            setMessages((current) => [
                ...current,
                {
                    id: `assistant_error_${Date.now()}`,
                    role: 'assistant',
                    content: 'Hiện tại AI chưa phản hồi được. Bạn thử lại với từ khóa ngắn hơn hoặc kiểm tra backend.',
                    createdAt: new Date(),
                    posts: [],
                    isError: true,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [inputText, isAuthenticated, isLoading, messages, token]);

    const handleSubmit = useCallback((event) => {
        event.preventDefault();
        sendMessage();
    }, [sendMessage]);

    return (
        <>
            <button
                type="button"
                className={`ai-advisor-fab${isOpen ? ' is-open' : ''}`}
                onClick={() => {
                    setIsOpen((current) => {
                        const next = !current;
                        if (next) window.dispatchEvent(new CustomEvent('olodo:ai-advisor-open'));
                        return next;
                    });
                }}
                aria-label="AI tư vấn bài đăng"
                title="AI tư vấn bài đăng"
            >
                {isOpen ? <X size={22} /> : <Sparkles size={23} />}
                <span className="ai-advisor-fab-ring" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <MotionAside
                        className="ai-advisor-panel"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={panelVariants}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="ai-advisor-top">
                            <div className="ai-advisor-mark">
                                <Bot size={21} />
                            </div>
                            <div className="ai-advisor-title">
                                <span>OLODO AI</span>
                                <strong>Tư vấn bài đăng</strong>
                            </div>
                            <button
                                type="button"
                                className="ai-advisor-close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Đóng AI tư vấn"
                                title="Đóng"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="ai-advisor-status">
                            <ShieldCheck size={14} />
                            <span>Dữ liệu lấy từ backend, key AI giữ ở server</span>
                        </div>

                        {error && (
                            <div className="ai-advisor-error">
                                <ShieldCheck size={15} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="ai-advisor-messages">
                            {messages.map((message) => (
                                <div key={message.id} className={`ai-message-row ${message.role} ${message.isError ? 'is-error' : ''}`}>
                                    <div className="ai-message-bubble">
                                        <p>{message.content}</p>
                                        {Array.isArray(message.posts) && message.posts.length > 0 && (
                                            <div className="ai-post-list">
                                                <div className="ai-post-list-title">Bài đăng phù hợp</div>
                                                {message.posts.slice(0, 6).map((post) => (
                                                    <AdvisorPostCard key={post.id} post={post} onOpen={openPost} />
                                                ))}
                                            </div>
                                        )}
                                        <time>{formatTime(message.createdAt)}</time>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="ai-message-row assistant">
                                    <div className="ai-message-bubble ai-typing">
                                        <Loader2 size={16} className="ai-spin" />
                                        <span>Đang phân tích bài đăng...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {hasOnlyWelcome && (
                            <div className="ai-quick-prompts">
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
                        )}

                        <form className="ai-advisor-inputbar" onSubmit={handleSubmit}>
                            <MessageSquareText size={18} />
                            <input
                                type="text"
                                value={inputText}
                                onChange={(event) => setInputText(event.target.value)}
                                placeholder="Hỏi về món cần tìm, ngân sách, khu vực..."
                                disabled={isLoading}
                            />
                            <button type="submit" disabled={isLoading || !inputText.trim()} aria-label="Gửi câu hỏi">
                                {isLoading ? <Loader2 size={17} className="ai-spin" /> : <Send size={17} />}
                            </button>
                        </form>
                    </MotionAside>
                )}
            </AnimatePresence>
        </>
    );
}
