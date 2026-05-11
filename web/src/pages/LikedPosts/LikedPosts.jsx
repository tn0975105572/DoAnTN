import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Clock,
    Heart,
    Loader2,
    MapPin,
    MessageCircle,
    Search,
    ShoppingBag,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import ProfileAvatarLink from '../../components/profile/ProfileAvatarLink';
import { useAuthSession } from '../../utils/authSession';
import './LikedPosts.css';

const BACKEND_ORIGIN = (() => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        return 'http://localhost:3000';
    }
})();

const FALLBACK_IMAGE = 'https://via.placeholder.com/900x650?text=No+Image';
const DEFAULT_AVATAR = 'https://i.pravatar.cc/80?u=liked-post';

const STATUS_LABELS = {
    dang_ban: 'Đang bán',
    dang_giu_cho: 'Đang giữ chỗ',
    dang_giao_dich: 'Đang giao dịch',
    da_ban: 'Đã bán',
    da_trao_doi: 'Đã trao đổi',
    da_tang: 'Đã tặng',
    cho_duyet: 'Chờ duyệt',
    het_hang: 'Hết hàng',
};

const normalizeAssetUrl = (raw) => {
    if (!raw || typeof raw !== 'string') return '';

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
            const url = new URL(raw);
            if (url.pathname.startsWith('/uploads/')) {
                return `${BACKEND_ORIGIN}${url.pathname}`;
            }
            return raw;
        } catch {
            return raw;
        }
    }

    const cleaned = raw.replace(/^\/+/, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('uploads/')) return `${BACKEND_ORIGIN}/${cleaned}`;
    return `${BACKEND_ORIGIN}/uploads/${cleaned}`;
};

const formatCurrency = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 'Liên hệ';

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(numeric);
};

const formatDate = (value) => {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const normalizeStatus = (status) => {
    if (!status) return 'Không rõ';
    const key = String(status).trim().toLowerCase();
    return STATUS_LABELS[key] || status;
};

const normalizePost = (raw) => {
    const imageUrls = (Array.isArray(raw?.DanhSachAnh) ? raw.DanhSachAnh : [])
        .map(normalizeAssetUrl)
        .filter(Boolean);
    const fallbackAvatar = `https://i.pravatar.cc/80?u=${encodeURIComponent(raw?.ID_NguoiDung || 'liked-post')}`;
    const avatar = normalizeAssetUrl(raw?.anh_dai_dien) || fallbackAvatar || DEFAULT_AVATAR;
    const priceValue = Number(raw?.gia || 0);

    return {
        id: raw?.ID_BaiDang || '',
        likeId: raw?.ID_Like || '',
        likedAt: raw?.thoi_gian_like || '',
        authorId: raw?.ID_NguoiDung || '',
        author: raw?.TenNguoiDung || 'Người dùng OLODO',
        avatar,
        title: raw?.tieu_de || 'Bài đăng',
        desc: raw?.mo_ta || '',
        price: priceValue,
        priceLabel: formatCurrency(priceValue),
        location: raw?.vi_tri || 'Chưa cập nhật vị trí',
        time: formatDate(raw?.thoi_gian_tao),
        rawTime: new Date(raw?.thoi_gian_tao).getTime() || 0,
        likedAtLabel: formatDate(raw?.thoi_gian_like),
        category: raw?.TenDanhMuc || raw?.TenLoaiBaiDang || 'Bài đăng',
        status: normalizeStatus(raw?.trang_thai),
        imageUrls: imageUrls.length ? imageUrls : [FALLBACK_IMAGE],
        img: imageUrls[0] || FALLBACK_IMAGE,
        likes: Number(raw?.SoLuongLike || 0),
        comments: Number(raw?.SoLuongBinhLuan || 0),
    };
};

export default function LikedPosts() {
    const navigate = useNavigate();
    const { token } = useAuthSession();
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [removingId, setRemovingId] = useState('');

    const loadLikedPosts = useCallback(async () => {
        if (!token) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/likebaidang/getLikedPostsByUser?limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload?.message || 'Không thể tải danh sách bài đã thích.');
            }

            const nextPosts = (payload?.data || []).map(normalizePost);
            setPosts(nextPosts);
        } catch (loadError) {
            setError(loadError.message || 'Không thể tải danh sách bài đã thích.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadLikedPosts();
    }, [loadLikedPosts]);

    const filteredPosts = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return posts;

        return posts.filter((post) => [
            post.title,
            post.desc,
            post.author,
            post.location,
            post.category,
        ].some((value) => String(value || '').toLowerCase().includes(keyword)));
    }, [posts, query]);

    const openPost = (post) => {
        navigate(`/post/${post.id}`, {
            state: {
                post: {
                    id: post.id,
                    authorId: post.authorId,
                    author: post.author,
                    avatar: post.avatar,
                    title: post.title,
                    desc: post.desc,
                    price: post.price,
                    location: post.location,
                    time: post.time,
                    category: post.category,
                    trang_thai: post.status,
                    imageUrls: post.imageUrls,
                    img: post.img,
                    likes: post.likes,
                    comments: post.comments,
                },
            },
        });
    };

    const removeLike = async (event, post) => {
        event.stopPropagation();
        if (!post.likeId || removingId) return;

        setRemovingId(post.likeId);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/likebaidang/delete/${post.likeId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload?.message || 'Không thể bỏ thích bài đăng này.');
            }

            setPosts((current) => current.filter((item) => item.likeId !== post.likeId));
        } catch (removeError) {
            setError(removeError.message || 'Không thể bỏ thích bài đăng này.');
        } finally {
            setRemovingId('');
        }
    };

    return (
        <div className="liked-posts-page">
            <section className="liked-posts-head">
                <button type="button" className="liked-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    Quay lại
                </button>
                <div>
                    <span className="liked-eyebrow">Yêu thích</span>
                    <h1>Bài đăng đã thích</h1>
                    <p>Theo dõi lại những bài bạn đã bấm thích gần đây.</p>
                </div>
                <div className="liked-count-box">
                    <Heart size={18} fill="currentColor" />
                    <strong>{posts.length}</strong>
                    <span>bài</span>
                </div>
            </section>

            <section className="liked-toolbar" aria-label="Tìm bài đã thích">
                <Search size={18} />
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm theo tiêu đề, người bán, vị trí..."
                />
            </section>

            {error && (
                <div className="liked-state liked-state-error">
                    {error}
                    <button type="button" onClick={loadLikedPosts}>Thử lại</button>
                </div>
            )}

            {isLoading ? (
                <div className="liked-state">
                    <Loader2 className="liked-spinner" size={30} />
                    <span>Đang tải bài đã thích...</span>
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="liked-empty">
                    <div className="liked-empty-icon">
                        <Heart size={32} />
                    </div>
                    <h2>{query ? 'Không tìm thấy bài phù hợp' : 'Bạn chưa thích bài đăng nào'}</h2>
                    <p>{query ? 'Thử đổi từ khóa tìm kiếm.' : 'Khi bạn bấm thích một bài đăng, bài đó sẽ xuất hiện ở đây.'}</p>
                    {!query && (
                        <button type="button" onClick={() => navigate('/')}>
                            <ShoppingBag size={17} />
                            Khám phá bài đăng
                        </button>
                    )}
                </div>
            ) : (
                <div className="liked-grid">
                    {filteredPosts.map((post) => (
                        <article
                            key={post.likeId || post.id}
                            className="liked-card"
                            onClick={() => openPost(post)}
                        >
                            <button
                                type="button"
                                className="liked-remove-btn"
                                onClick={(event) => removeLike(event, post)}
                                disabled={removingId === post.likeId}
                                aria-label="Bỏ thích bài đăng"
                            >
                                {removingId === post.likeId ? (
                                    <Loader2 size={17} className="liked-spinner" />
                                ) : (
                                    <Heart size={18} fill="currentColor" />
                                )}
                            </button>
                            <div className="liked-card-media">
                                <img src={post.img} alt={post.title} loading="lazy" />
                                <span>{post.status}</span>
                            </div>
                            <div className="liked-card-body">
                                <div className="liked-card-author">
                                    <ProfileAvatarLink userId={post.authorId} className="liked-avatar-link">
                                        <img src={post.avatar} alt={post.author} />
                                    </ProfileAvatarLink>
                                    <div>
                                        <strong>{post.author}</strong>
                                        <small>Đã thích ngày {post.likedAtLabel}</small>
                                    </div>
                                </div>
                                <h2>{post.title}</h2>
                                <p>{post.desc}</p>
                                <div className="liked-card-meta">
                                    <span>
                                        <MapPin size={14} />
                                        {post.location}
                                    </span>
                                    <span>
                                        <Clock size={14} />
                                        {post.time}
                                    </span>
                                </div>
                                <div className="liked-card-bottom">
                                    <strong>{post.priceLabel}</strong>
                                    <span>
                                        <Heart size={14} fill="currentColor" />
                                        {post.likes}
                                    </span>
                                    <span>
                                        <MessageCircle size={14} />
                                        {post.comments}
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
