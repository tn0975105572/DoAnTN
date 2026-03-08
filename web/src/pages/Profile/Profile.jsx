import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  BarChart2,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Heart,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  PlusCircle,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Star,
  Store,
  Tag,
  Timer,
  Trash2,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';
import './Profile.css';

const MOCK_LISTINGS = [
  {
    id: 'p1',
    title: 'MacBook Pro 14" M3 — Còn BH 6 tháng',
    price: '38.000.000 ₫',
    location: 'Hà Nội',
    time: '2 giờ trước',
    img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=900',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=500',
    ],
    desc: 'MacBook Pro 14" chip M3, máy sinh viên dùng kỹ, còn bảo hành 6 tháng. Full hộp, sạc zin, pin khỏe, không xước cấn, sẵn sàng lên bàn học mới.',
    likes: 142,
    comments: 38,
    tag: 'Điện tử',
  },
  {
    id: 'p2',
    title: 'iPad Air 5 + Apple Pencil (fullbox)',
    price: '11.900.000 ₫',
    location: 'TP.HCM',
    time: 'Hôm qua',
    img: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?q=80&w=1000',
    images: [
      'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?q=80&w=900',
      'https://images.unsplash.com/photo-1618380987973-d06b0b37d2b6?q=80&w=600',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=600',
    ],
    desc: 'Combo iPad Air 5 + Apple Pencil, rất hợp cho sinh viên ghi chú, vẽ, làm slide. Máy ít dùng, không trầy, kèm ốp và cường lực.',
    likes: 68,
    comments: 12,
    tag: 'Học tập',
  },
  {
    id: 'p3',
    title: 'Xe đạp thể thao Giant ATX 830 — Như mới',
    price: '5.200.000 ₫',
    location: 'Đà Nẵng',
    time: '3 ngày trước',
    img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000',
    images: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=900',
      'https://images.unsplash.com/photo-1485963631004-f2e4844e3510?q=80&w=600',
      'https://images.unsplash.com/photo-1485963631004-f2e4844e3510?q=80&w=500',
    ],
    desc: 'Xe đạp Giant ATX 830 chính hãng, đi học, đi chơi đều ổn. Đã bảo dưỡng định kỳ, thắng, phuộc, lốp hoạt động mượt, tặng kèm mũ bảo hiểm.',
    likes: 41,
    comments: 9,
    tag: 'Xe cộ',
  },
];

const MOCK_REVIEWS = [
  {
    id: 'r1',
    name: 'Phạm Minh Đức',
    avatar: 'https://i.pravatar.cc/80?img=12',
    rating: 5,
    time: '1 tuần trước',
    text: 'Giao dịch nhanh, đúng hẹn. Sản phẩm như mô tả, đóng gói kỹ. 10/10!',
  },
  {
    id: 'r2',
    name: 'Trần Thu Hà',
    avatar: 'https://i.pravatar.cc/80?img=5',
    rating: 4,
    time: '2 tuần trước',
    text: 'Bạn nhiệt tình, phản hồi nhanh. Có thương lượng nhẹ, nói chuyện dễ chịu.',
  },
  {
    id: 'r3',
    name: 'Lê Thị Lan',
    avatar: 'https://i.pravatar.cc/80?img=47',
    rating: 5,
    time: '1 tháng trước',
    text: 'Chủ shop uy tín, hỗ trợ ship và kiểm tra hàng trước khi nhận.',
  },
];

const SKILLS = ['Đóng gói', 'Trả lời nhanh', 'Chụp ảnh sản phẩm', 'Thương lượng', 'Giao dịch an toàn', 'Sinh viên verified'];

const BADGES = [
  { icon: ShieldCheck, label: 'Đã xác thực', tone: 'success' },
  { icon: Zap, label: 'Phản hồi nhanh', tone: 'gold' },
  { icon: BadgeCheck, label: 'Tỉ lệ đúng hẹn 98%', tone: 'primary' },
];

const MOCK_LISTING_COMMENTS = {
  p1: [
    { id: 'c11', name: 'Phạm Minh Đức', time: '1 giờ trước', text: 'Máy còn bảo hành hãng không bạn? Có hoá đơn không ạ?', likes: 5 },
    { id: 'c12', name: 'Trần Thu Hà', time: '45 phút trước', text: 'Bạn cho xin thêm ảnh góc cạnh + cycle pin nhé!', likes: 2 },
    { id: 'c13', name: 'Lê Thị Lan', time: '30 phút trước', text: 'Mình ở Đà Nẵng, bạn hỗ trợ ship/ COD được không?', likes: 1 },
  ],
  p2: [
    { id: 'c21', name: 'Nguyễn Thị Hương', time: '2 giờ trước', text: 'iPad còn đẹp không bạn? Màn có ám/ điểm chết không?', likes: 3 },
    { id: 'c22', name: 'Vũ Hoàng Nam', time: 'Hôm qua', text: 'Pencil gen mấy vậy bạn? Giá fix thêm chút được không?', likes: 1 },
    { id: 'c23', name: 'Phạm Minh Đức', time: 'Hôm qua', text: 'Có nhận giao trực tiếp tại trường không ạ?', likes: 0 },
  ],
  p3: [
    { id: 'c31', name: 'Trần Văn Nam', time: '3 ngày trước', text: 'Khung size bao nhiêu vậy bạn? Chiều cao 1m75 đi ổn không?', likes: 2 },
    { id: 'c32', name: 'Lê Thị Lan', time: '3 ngày trước', text: 'Xe đã thay lốp/ xích lần nào chưa ạ?', likes: 1 },
    { id: 'c33', name: 'Nguyễn Thị Hương', time: '4 ngày trước', text: 'Bạn có bớt chút cho sinh viên không?', likes: 4 },
  ],
};

function Stars({ value }) {
  return (
    <span className="pf-stars" aria-label={`${value} sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} strokeWidth={2} fill={i < value ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="pf-stat">
      <span className="pf-stat-icon">
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="pf-stat-meta">
        <span className="pf-stat-value">{value}</span>
        <span className="pf-stat-label">{label}</span>
      </div>
    </div>
  );
}

function ListingCard({ listing, onViewComments, onSelect, featured }) {
  return (
    <article
      className={`pf-listing${featured ? ' pf-listing--featured' : ''}`}
      onClick={() => onSelect?.(listing)}
      style={{ cursor: 'pointer' }}
    >
      <div className="pf-listing-media">
        <img src={listing.img} alt={listing.title} loading="lazy" />
        <div className="pf-listing-overlay" />
        <span className="pf-listing-tag">{listing.tag}</span>
        <span className="pf-listing-price-badge">{listing.price}</span>
        {featured && <span className="pf-listing-featured-badge"><Zap size={12} strokeWidth={2.5} /> Nổi bật</span>}
      </div>
      <div className="pf-listing-body">
        <h3 className="pf-listing-title">{listing.title}</h3>
        {listing.desc && <p className="pf-listing-desc">{listing.desc}</p>}
        <div className="pf-listing-info">
          <span className="pf-listing-meta">
            <MapPin size={13} strokeWidth={2} /> {listing.location}
          </span>
          <span className="pf-listing-meta">
            <Timer size={13} strokeWidth={2} /> {listing.time}
          </span>
        </div>
        <div className="pf-listing-foot">
          <div className="pf-listing-stats">
            <span className="pf-mini">
              <Heart size={14} strokeWidth={2} /> {listing.likes}
            </span>
            <span className="pf-mini">
              <MessageCircle size={14} strokeWidth={2} /> {listing.comments}
            </span>
          </div>
          <button
            type="button"
            className="pf-mini-btn"
            onClick={(e) => { e.stopPropagation(); onViewComments?.(listing); }}
          >
            Xem bình luận →
          </button>
        </div>
      </div>
    </article>
  );
}

function ListingDetail({ listing, onBack, onOpenComments, sellerName, sellerAvatar }) {
  const allImages = listing.images?.length ? listing.images : [listing.img];
  const [activeImg, setActiveImg] = useState(0);
  const [liked, setLiked] = useState(false);
  const comments = MOCK_LISTING_COMMENTS[listing.id] || [];

  const prevImg = () => setActiveImg((i) => (i > 0 ? i - 1 : allImages.length - 1));
  const nextImg = () => setActiveImg((i) => (i < allImages.length - 1 ? i + 1 : 0));

  const shareUrl = useMemo(
    () => `${window.location.origin}/post/${listing.id}/comments`,
    [listing.id],
  );

  const handleShare = async () => {
    const payload = { title: listing.title, text: `${listing.title} • ${listing.price}`, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch {
      // ignore share cancel/errors; fallback to clipboard
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // no-op
    }
  };

  return (
    <div className="ld">
      {/* Header */}
      <div className="ld-header">
        <button type="button" className="ld-back" onClick={onBack}>
          <ArrowLeft size={18} strokeWidth={2.5} />
          Quay lại danh sách
        </button>
        <div className="ld-header-actions">
          <button type="button" className="ld-action-btn" onClick={() => setLiked(!liked)}>
            <Heart size={16} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} className={liked ? 'ld-liked' : ''} />
          </button>
          <button type="button" className="ld-action-btn" onClick={handleShare} title="Chia sẻ (copy link nếu không hỗ trợ share)">
            <Share2 size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="ld-gallery">
        <div className="ld-gallery-main">
          <img src={allImages[activeImg]} alt={listing.title} />
          <div className="ld-gallery-overlay" />
          <span className="ld-gallery-counter">{activeImg + 1} / {allImages.length}</span>
          {allImages.length > 1 && (
            <>
              <button type="button" className="ld-gallery-nav ld-gallery-prev" onClick={prevImg}>
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              <button type="button" className="ld-gallery-nav ld-gallery-next" onClick={nextImg}>
                <ChevronRight size={20} strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
        {allImages.length > 1 && (
          <div className="ld-gallery-thumbs">
            {allImages.map((src, idx) => (
              <button
                key={src + idx}
                type="button"
                className={`ld-thumb${idx === activeImg ? ' ld-thumb--active' : ''}`}
                onClick={() => setActiveImg(idx)}
              >
                <img src={src} alt={`${listing.title} ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="ld-content">
        <div className="ld-main">
          {/* Title & Tag */}
          <div className="ld-title-row">
            <span className="ld-tag"><Tag size={12} strokeWidth={2.5} /> {listing.tag}</span>
            <span className="ld-time"><Clock size={12} strokeWidth={2} /> {listing.time}</span>
          </div>
          <h2 className="ld-title">{listing.title}</h2>

          {/* Price */}
          <div className="ld-price-section">
            <span className="ld-price">{listing.price}</span>
            <span className="ld-price-note">Có thể thương lượng</span>
          </div>

          {/* Description */}
          <div className="ld-section">
            <h3 className="ld-section-title">Mô tả chi tiết</h3>
            <p className="ld-desc">{listing.desc}</p>
          </div>

          {/* Info Grid */}
          <div className="ld-info-grid">
            <div className="ld-info-item">
              <MapPin size={16} strokeWidth={2} />
              <div>
                <span className="ld-info-label">Khu vực</span>
                <span className="ld-info-value">{listing.location}</span>
              </div>
            </div>
            <div className="ld-info-item">
              <Eye size={16} strokeWidth={2} />
              <div>
                <span className="ld-info-label">Lượt xem</span>
                <span className="ld-info-value">{listing.likes + listing.comments + 200}</span>
              </div>
            </div>
            <div className="ld-info-item">
              <Heart size={16} strokeWidth={2} />
              <div>
                <span className="ld-info-label">Yêu thích</span>
                <span className="ld-info-value">{listing.likes}</span>
              </div>
            </div>
            <div className="ld-info-item">
              <MessageCircle size={16} strokeWidth={2} />
              <div>
                <span className="ld-info-label">Bình luận</span>
                <span className="ld-info-value">{listing.comments}</span>
              </div>
            </div>
          </div>

          {/* Safety */}
          <div className="ld-safety">
            <ShieldCheck size={16} strokeWidth={2} />
            <span>Hẹn gặp nơi công cộng, kiểm tra hàng trước khi thanh toán. Ưu tiên COD.</span>
          </div>

          {/* Comments Preview */}
          <div className="ld-section">
            <div className="ld-section-head">
              <h3 className="ld-section-title">
                <MessageCircle size={16} strokeWidth={2} />
                Bình luận nổi bật
              </h3>
              <button
                type="button"
                className="ld-link"
                onClick={() => onOpenComments?.(listing)}
              >
                Xem tất cả →
              </button>
            </div>
            {comments.length === 0 ? (
              <div className="ld-empty">
                Chưa có bình luận. Hãy đặt câu hỏi đầu tiên để chốt nhanh hơn.
              </div>
            ) : (
              <div className="ld-comments">
                {comments.slice(0, 3).map((c) => (
                  <div key={c.id} className="ld-comment">
                    <div className="ld-comment-avatar" aria-hidden>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ld-comment-body">
                      <div className="ld-comment-head">
                        <span className="ld-comment-name">{c.name}</span>
                        <span className="ld-comment-dot">•</span>
                        <span className="ld-comment-time">{c.time}</span>
                        {typeof c.likes === 'number' && (
                          <span className="ld-comment-like">
                            <Heart size={12} strokeWidth={2} /> {c.likes}
                          </span>
                        )}
                      </div>
                      <p className="ld-comment-text">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="ld-comments-cta">
              <button type="button" className="ld-comments-btn ld-comments-btn-primary" onClick={() => onOpenComments?.(listing)}>
                <MessageCircle size={16} strokeWidth={2} />
                Viết bình luận / hỏi nhanh
              </button>
              <button type="button" className="ld-comments-btn ld-comments-btn-ghost" onClick={handleShare}>
                <Share2 size={16} strokeWidth={2} />
                Copy link
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="ld-sidebar">
          {/* Seller Card */}
          <div className="ld-seller-card">
            <div className="ld-seller-top">
              <div className="ld-seller-avatar">
                <span>{sellerAvatar}</span>
              </div>
              <div className="ld-seller-info">
                <span className="ld-seller-name">{sellerName}</span>
                <span className="ld-seller-badge">
                  <BadgeCheck size={12} strokeWidth={2.5} /> Đã xác thực
                </span>
              </div>
            </div>
            <div className="ld-seller-stats">
              <div className="ld-seller-stat">
                <span className="ld-seller-stat-v">4.9</span>
                <span className="ld-seller-stat-l">Đánh giá</span>
              </div>
              <div className="ld-seller-stat">
                <span className="ld-seller-stat-v">98%</span>
                <span className="ld-seller-stat-l">Đúng hẹn</span>
              </div>
              <div className="ld-seller-stat">
                <span className="ld-seller-stat-v">~5p</span>
                <span className="ld-seller-stat-l">Phản hồi</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="ld-cta">
            <button type="button" className="ld-cta-btn ld-cta-primary">
              <MessageCircle size={18} strokeWidth={2} />
              Nhắn tin cho người bán
            </button>
            <button type="button" className="ld-cta-btn ld-cta-secondary">
              <Phone size={18} strokeWidth={2} />
              Gọi điện
            </button>
            <button type="button" className="ld-cta-btn ld-cta-ghost">
              <Send size={18} strokeWidth={2} />
              Gửi đề nghị mua
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="ld-sticky">
        <div className="ld-sticky-left">
          <div className="ld-sticky-price">{listing.price}</div>
          <div className="ld-sticky-sub">{listing.location} · {listing.time}</div>
        </div>
        <div className="ld-sticky-actions">
          <button type="button" className="ld-sticky-btn ld-sticky-btn-ghost" onClick={() => onOpenComments?.(listing)}>
            <MessageCircle size={18} strokeWidth={2} />
          </button>
          <button type="button" className="ld-sticky-btn ld-sticky-btn-primary">
            Nhắn tin
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [selectedListing, setSelectedListing] = useState(null);

  const displayUser = useMemo(() => {
    if (currentUser) {
      const name = currentUser.ho_ten || 'Người dùng';
      return {
        name,
        headline: 'Chợ sinh viên — chốt nhanh, giao dịch đẹp.',
        avatarText: name.charAt(0).toUpperCase(),
        location: currentUser.dia_chi || 'Việt Nam',
        school: currentUser.truong || 'Đại học (chưa cập nhật)',
        join: '2026',
        phone: currentUser.so_dien_thoai || 'Chưa cập nhật',
      };
    }
    return {
      name: 'Khách vãng lai',
      headline: 'Đăng nhập để cá nhân hóa hồ sơ của bạn.',
      avatarText: 'G',
      location: '—',
      school: '—',
      join: '—',
      phone: '—',
    };
  }, [currentUser]);

  const profileUrl = useMemo(() => `${window.location.origin}/profile`, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="profile-page">
      <section className="pf-hero">
        <div className="pf-hero-bg" />
        <div className="pf-container">
          <div className="pf-hero-card">
            <div className="pf-hero-top">
              <div className="pf-avatar" aria-hidden>
                <span>{displayUser.avatarText}</span>
              </div>

              <div className="pf-identity">
                <div className="pf-name-row">
                  <h1 className="pf-name">{displayUser.name}</h1>
                  <span className="pf-verified" title="Hồ sơ xác thực">
                    <BadgeCheck size={16} strokeWidth={2} />
                    Verified
                  </span>
                </div>
                <p className="pf-headline">{displayUser.headline}</p>

                <div className="pf-meta-row">
                  <span className="pf-meta">
                    <MapPin size={14} strokeWidth={2} /> {displayUser.location}
                  </span>
                  <span className="pf-dot">•</span>
                  <span className="pf-meta">
                    <BookOpen size={14} strokeWidth={2} /> {displayUser.school}
                  </span>
                  <span className="pf-dot">•</span>
                  <span className="pf-meta">
                    <Calendar size={14} strokeWidth={2} /> Tham gia {displayUser.join}
                  </span>
                </div>
              </div>

              <div className="pf-actions">
                <button type="button" className="pf-btn pf-btn-ghost" onClick={handleCopy}>
                  <Copy size={16} strokeWidth={2} />
                  {copied ? 'Đã chép link' : 'Copy link'}
                </button>
                <button type="button" className="pf-btn pf-btn-ghost">
                  <Share2 size={16} strokeWidth={2} />
                  Chia sẻ
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn-primary"
                  onClick={() => navigate('/messages')}
                  disabled={!currentUser}
                  title={!currentUser ? 'Đăng nhập để nhắn tin' : undefined}
                >
                  <MessageCircle size={16} strokeWidth={2} />
                  Nhắn tin
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn-soft"
                  disabled={!currentUser}
                  title={!currentUser ? 'Đăng nhập để theo dõi' : undefined}
                >
                  <UserPlus size={16} strokeWidth={2} />
                  Theo dõi
                </button>
                {currentUser && (
                  <button
                    type="button"
                    className="pf-btn pf-btn-manage"
                    onClick={() => setTab('manage')}
                    title="Trang quản lý của bạn"
                  >
                    <LayoutDashboard size={16} strokeWidth={2} />
                    Quản lý
                  </button>
                )}
              </div>
            </div>

            <div className="pf-badges">
              {BADGES.map(({ icon: Icon, label, tone }) => (
                <span key={label} className={`pf-badge tone-${tone}`}>
                  <Icon size={14} strokeWidth={2} />
                  {label}
                </span>
              ))}
            </div>

            <div className="pf-stats">
              <Stat icon={Store} label="Đang bán" value="12" />
              <Stat icon={Briefcase} label="Đã bán" value="46" />
              <Stat icon={Star} label="Đánh giá" value="4.9/5" />
              <Stat icon={Timer} label="Phản hồi" value="~ 5 phút" />
            </div>
          </div>
        </div>
      </section>

      <div className="pf-container pf-body">
        <div className="pf-tabs" role="tablist" aria-label="Hồ sơ">
          <button className={`pf-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')} role="tab">
            Tổng quan
          </button>
          <button className={`pf-tab ${tab === 'listings' ? 'active' : ''}`} onClick={() => setTab('listings')} role="tab">
            Đang bán
          </button>
          <button className={`pf-tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')} role="tab">
            Đánh giá
          </button>
          <button className={`pf-tab ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')} role="tab">
            Hoạt động
          </button>
        </div>

        {!currentUser && (
          <div className="pf-login-cta">
            <div className="pf-login-cta-left">
              <h2>Đăng nhập để mở khóa hồ sơ “signature”</h2>
              <p>
                Bạn sẽ có trang cá nhân siêu chi tiết: thống kê giao dịch, danh sách đang bán, đánh giá, hoạt động và nhiều hơn.
              </p>
            </div>
            <div className="pf-login-cta-actions">
              <button className="pf-btn pf-btn-primary" onClick={() => navigate('/login')}>
                Đăng nhập
              </button>
              <button className="pf-btn pf-btn-ghost" onClick={() => navigate('/register')}>
                Tạo tài khoản
              </button>
            </div>
          </div>
        )}

        <div className="pf-grid">
          <aside className="pf-col pf-col-left">
            <div className="pf-card">
              <div className="pf-card-title">Giới thiệu</div>
              <p className="pf-about">
                Mình ưu tiên giao dịch an toàn giữa sinh viên: minh bạch tình trạng, ảnh thật, hẹn đúng giờ. Có thể thương lượng nhẹ với người thiện chí.
              </p>
              <div className="pf-contact">
                <span className="pf-contact-item">
                  <Phone size={14} strokeWidth={2} />
                  {displayUser.phone}
                </span>
                <span className="pf-contact-item">
                  <Heart size={14} strokeWidth={2} />
                  “Uy tín là thương hiệu”
                </span>
              </div>
            </div>

            <div className="pf-card">
              <div className="pf-card-title">Kỹ năng giao dịch</div>
              <div className="pf-chips">
                {SKILLS.map((s) => (
                  <span key={s} className="pf-chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pf-card pf-card-glow">
              <div className="pf-card-title">Điểm nổi bật</div>
              <div className="pf-highlights">
                <div className="pf-highlight">
                  <span className="pf-highlight-k">98%</span>
                  <span className="pf-highlight-l">Đúng hẹn</span>
                </div>
                <div className="pf-highlight">
                  <span className="pf-highlight-k">4.9</span>
                  <span className="pf-highlight-l">Xếp hạng</span>
                </div>
                <div className="pf-highlight">
                  <span className="pf-highlight-k">≤5p</span>
                  <span className="pf-highlight-l">Phản hồi</span>
                </div>
              </div>
              <div className="pf-divider" />
              <div className="pf-safety">
                <ShieldCheck size={16} strokeWidth={2} />
                <span>Gợi ý: Hẹn gặp nơi công cộng, kiểm tra hàng trước khi thanh toán.</span>
              </div>
            </div>
          </aside>

          <section className="pf-col pf-col-right">
            {tab === 'overview' && (
              <>
                {selectedListing ? (
                  <ListingDetail
                    listing={selectedListing}
                    onBack={() => setSelectedListing(null)}
                    onOpenComments={(listing) => navigate(`/post/${listing.id}/comments`, {
                      state: {
                        post: {
                          id: listing.id,
                          author: displayUser.name,
                          avatar: 'https://i.pravatar.cc/150?img=11',
                          time: listing.time,
                          location: listing.location,
                          title: listing.title,
                          price: listing.price?.replaceAll('₫', '').trim(),
                          img: listing.img,
                        },
                      },
                    })}
                    sellerName={displayUser.name}
                    sellerAvatar={displayUser.avatarText}
                  />
                ) : (
                  <div className="pf-card pf-card-featured-listings">
                    <div className="pf-card-title">Đang bán nổi bật</div>
                    <div className="pf-listings">
                      {MOCK_LISTINGS.map((p, idx) => (
                        <ListingCard
                          key={p.id}
                          listing={p}
                          featured={idx === 0}
                          onSelect={setSelectedListing}
                          onViewComments={(listing) => navigate(`/post/${listing.id}/comments`, {
                            state: {
                              post: {
                                id: listing.id,
                                author: displayUser.name,
                                avatar: 'https://i.pravatar.cc/150?img=11',
                                time: listing.time,
                                location: listing.location,
                                title: listing.title,
                                price: listing.price?.replaceAll('₫', '').trim(),
                                img: listing.img,
                              },
                            },
                          })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="pf-card">
                  <div className="pf-card-title">Đánh giá gần đây</div>
                  <div className="pf-reviews-mini">
                    {MOCK_REVIEWS.slice(0, 2).map((r) => (
                      <div key={r.id} className="pf-review">
                        <img src={r.avatar} alt={r.name} className="pf-review-avatar" />
                        <div className="pf-review-body">
                          <div className="pf-review-head">
                            <span className="pf-review-name">{r.name}</span>
                            <span className="pf-review-time">{r.time}</span>
                          </div>
                          <Stars value={r.rating} />
                          <p className="pf-review-text">{r.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="pf-more" onClick={() => setTab('reviews')}>
                    Xem tất cả đánh giá →
                  </button>
                </div>
              </>
            )}

            {tab === 'listings' && (
              selectedListing ? (
                <ListingDetail
                  listing={selectedListing}
                  onBack={() => setSelectedListing(null)}
                  onOpenComments={(listing) => navigate(`/post/${listing.id}/comments`, {
                    state: {
                      post: {
                        id: listing.id,
                        author: displayUser.name,
                        avatar: 'https://i.pravatar.cc/150?img=11',
                        time: listing.time,
                        location: listing.location,
                        title: listing.title,
                        price: listing.price?.replaceAll('₫', '').trim(),
                        img: listing.img,
                      },
                    },
                  })}
                  sellerName={displayUser.name}
                  sellerAvatar={displayUser.avatarText}
                />
              ) : (
                <div className="pf-card">
                  <div className="pf-card-title">Danh sách đang bán</div>
                  <div className="pf-listings">
                    {MOCK_LISTINGS.map((p) => (
                      <ListingCard
                        key={p.id}
                        listing={p}
                        onSelect={setSelectedListing}
                        onViewComments={(listing) => navigate(`/post/${listing.id}/comments`, {
                          state: {
                            post: {
                              id: listing.id,
                              author: displayUser.name,
                              avatar: 'https://i.pravatar.cc/150?img=11',
                              time: listing.time,
                              location: listing.location,
                              title: listing.title,
                              price: listing.price?.replaceAll('₫', '').trim(),
                              img: listing.img,
                            },
                          },
                        })}
                      />
                    ))}
                  </div>
                </div>
              )
            )}

            {tab === 'reviews' && (
              <div className="pf-card">
                <div className="pf-card-title">Đánh giá</div>
                <div className="pf-rating-head">
                  <div className="pf-rating-left">
                    <div className="pf-rating-score">4.9</div>
                    <Stars value={5} />
                    <div className="pf-rating-sub">Dựa trên {MOCK_REVIEWS.length} đánh giá</div>
                  </div>
                  <div className="pf-rating-bars">
                    {[5, 4, 3, 2, 1].map((k) => (
                      <div key={k} className="pf-bar-row">
                        <span className="pf-bar-label">{k}</span>
                        <div className="pf-bar">
                          <div className="pf-bar-fill" style={{ width: `${k === 5 ? 78 : k === 4 ? 18 : 4}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pf-reviews">
                  {MOCK_REVIEWS.map((r) => (
                    <div key={r.id} className="pf-review">
                      <img src={r.avatar} alt={r.name} className="pf-review-avatar" />
                      <div className="pf-review-body">
                        <div className="pf-review-head">
                          <span className="pf-review-name">{r.name}</span>
                          <span className="pf-review-time">{r.time}</span>
                        </div>
                        <Stars value={r.rating} />
                        <p className="pf-review-text">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'activity' && (
              <div className="pf-card">
                <div className="pf-card-title">Hoạt động</div>
                <div className="pf-timeline">
                  <div className="pf-time-item">
                    <span className="pf-time-dot" />
                    <div className="pf-time-body">
                      <div className="pf-time-title">Đăng bài mới: “MacBook Pro 14&quot; M3”</div>
                      <div className="pf-time-sub">2 giờ trước · {displayUser.location}</div>
                    </div>
                  </div>
                  <div className="pf-time-item">
                    <span className="pf-time-dot" />
                    <div className="pf-time-body">
                      <div className="pf-time-title">Cập nhật hồ sơ và xác thực sinh viên</div>
                      <div className="pf-time-sub">1 tuần trước</div>
                    </div>
                  </div>
                  <div className="pf-time-item">
                    <span className="pf-time-dot" />
                    <div className="pf-time-body">
                      <div className="pf-time-title">Hoàn tất giao dịch #A1023</div>
                      <div className="pf-time-sub">3 tuần trước · Đánh giá 5 sao</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'manage' && currentUser && (
              <div className="pf-manage">
                {/* Stats Row */}
                <div className="pf-manage-stats">
                  <div className="pf-manage-stat-card">
                    <span className="pf-manage-stat-icon" style={{ background: '#3b82f615', color: '#3b82f6' }}>
                      <Store size={20} strokeWidth={2} />
                    </span>
                    <div>
                      <div className="pf-manage-stat-val">12</div>
                      <div className="pf-manage-stat-lbl">Đang bán</div>
                    </div>
                  </div>
                  <div className="pf-manage-stat-card">
                    <span className="pf-manage-stat-icon" style={{ background: '#10b98115', color: '#10b981' }}>
                      <Briefcase size={20} strokeWidth={2} />
                    </span>
                    <div>
                      <div className="pf-manage-stat-val">46</div>
                      <div className="pf-manage-stat-lbl">Đã bán</div>
                    </div>
                  </div>
                  <div className="pf-manage-stat-card">
                    <span className="pf-manage-stat-icon" style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                      <TrendingUp size={20} strokeWidth={2} />
                    </span>
                    <div>
                      <div className="pf-manage-stat-val">4.9</div>
                      <div className="pf-manage-stat-lbl">Đánh giá</div>
                    </div>
                  </div>
                  <div className="pf-manage-stat-card">
                    <span className="pf-manage-stat-icon" style={{ background: '#8b5cf615', color: '#8b5cf6' }}>
                      <BarChart2 size={20} strokeWidth={2} />
                    </span>
                    <div>
                      <div className="pf-manage-stat-val">1.2k</div>
                      <div className="pf-manage-stat-lbl">Lượt xem</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pf-card">
                  <div className="pf-card-title">Thao tác nhanh</div>
                  <div className="pf-manage-actions">
                    <button className="pf-manage-action-btn" style={{ '--clr': '#7f001f' }}>
                      <PlusCircle size={22} strokeWidth={2} />
                      <span>Đăng tin mới</span>
                    </button>
                    <button className="pf-manage-action-btn" style={{ '--clr': '#3b82f6' }}>
                      <Pencil size={22} strokeWidth={2} />
                      <span>Sửa hồ sơ</span>
                    </button>
                    <button className="pf-manage-action-btn" style={{ '--clr': '#10b981' }}>
                      <BarChart2 size={22} strokeWidth={2} />
                      <span>Thống kê</span>
                    </button>
                    <button className="pf-manage-action-btn" onClick={() => navigate('/settings')} style={{ '--clr': '#8b5cf6' }}>
                      <Settings size={22} strokeWidth={2} />
                      <span>Cài đặt</span>
                    </button>
                  </div>
                </div>

                {/* My Listings Management */}
                <div className="pf-card">
                  <div className="pf-card-title">Đang bán — cần xử lý</div>
                  <div className="pf-manage-listing-list">
                    {MOCK_LISTINGS.map((item) => (
                      <div key={item.id} className="pf-manage-listing-row">
                        <img src={item.img} alt={item.title} className="pf-manage-listing-thumb" />
                        <div className="pf-manage-listing-info">
                          <div className="pf-manage-listing-title">{item.title}</div>
                          <div className="pf-manage-listing-meta">
                            <span>{item.price}</span>
                            <span>·</span>
                            <Eye size={13} strokeWidth={2} /> {item.likes + item.comments + 200}
                            <span>·</span>
                            <MessageCircle size={13} strokeWidth={2} /> {item.comments}
                          </div>
                        </div>
                        <div className="pf-manage-listing-btns">
                          <button className="pf-manage-edit-btn" title="Sửa tin">
                            <Pencil size={15} strokeWidth={2} />
                          </button>
                          <button className="pf-manage-del-btn" title="Xóa tin">
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

