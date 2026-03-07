import { useState } from 'react';
import {
    Search, MoreHorizontal, Settings, Bell, Check, CheckCheck,
    ShoppingBag, MessageSquare, UserPlus, Shield, Tag, Heart,
    Clock, Trash2, Eye, ExternalLink, ChevronLeft
} from 'lucide-react';
import './Notifications.css';

/* ════════ MOCK DATA ════════ */
const MOCK_NOTIFICATIONS = [
    {
        id: 'n1',
        type: 'order',
        avatar: 'https://i.pravatar.cc/150?img=17',
        sender: 'Đức Thụy',
        text: 'đã đặt mua sản phẩm "Laptop Dell XPS 15" của bạn',
        detail: 'Đức Thụy đã đặt mua sản phẩm Laptop Dell XPS 15 của bạn. Vui lòng xác nhận đơn hàng và chuẩn bị giao hàng trong vòng 24 giờ.',
        product: { name: 'Laptop Dell XPS 15 — 16GB RAM', price: '28.500.000₫', img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?q=80&w=200' },
        time: '2 phút trước',
        timeDetail: '01/03/2026, 16:22',
        unread: true,
    },
    {
        id: 'n2',
        type: 'comment',
        avatar: 'https://i.pravatar.cc/150?img=5',
        sender: 'Kim Tuyến',
        text: 'đã bình luận về bài đăng của bạn: "Sản phẩm còn không bạn?"',
        detail: 'Kim Tuyến đã bình luận về bài đăng "Máy lạnh Daikin 2.5HP": "Sản phẩm còn không bạn? Mình muốn xem trực tiếp có được không?"',
        time: '15 phút trước',
        timeDetail: '01/03/2026, 16:09',
        unread: true,
    },
    {
        id: 'n3',
        type: 'friend',
        avatar: 'https://i.pravatar.cc/150?img=33',
        sender: 'Nguyễn Duy Tiến',
        text: 'đã gửi lời mời kết bạn cho bạn',
        detail: 'Nguyễn Duy Tiến — Sinh viên Đại học Bách khoa TP.HCM muốn kết bạn với bạn. Các bạn có 5 bạn chung.',
        time: '1 giờ trước',
        timeDetail: '01/03/2026, 15:24',
        unread: true,
    },
    {
        id: 'n4',
        type: 'like',
        avatar: 'https://i.pravatar.cc/150?img=21',
        sender: 'Thi Nguyen',
        text: 'và 12 người khác đã thích bài đăng của bạn',
        detail: 'Thi Nguyen và 12 người khác đã thích bài đăng "iPhone 14 Pro Max 256GB — còn bảo hành" của bạn. Bài đăng đã đạt 45 lượt xem.',
        time: '2 giờ trước',
        timeDetail: '01/03/2026, 14:20',
        unread: false,
    },
    {
        id: 'n5',
        type: 'promo',
        avatar: '',
        sender: 'OLODO',
        text: 'Ưu đãi Flash Sale 50% — Chỉ hôm nay!',
        detail: '🎉 Flash Sale đặc biệt! Giảm đến 50% phí đăng tin premium trong hôm nay. Đăng tin ngay để tiếp cận hàng ngàn sinh viên đang tìm kiếm sản phẩm.',
        time: '3 giờ trước',
        timeDetail: '01/03/2026, 13:00',
        unread: false,
    },
    {
        id: 'n6',
        type: 'system',
        avatar: '',
        sender: 'Hệ thống',
        text: 'Bài đăng "Xe đạp Giant ATX" đã được duyệt thành công',
        detail: 'Bài đăng "Xe đạp Giant ATX — like new 95%" của bạn đã được duyệt và hiện đang hiển thị trên sàn giao dịch. Bài đăng sẽ tự động hết hạn sau 30 ngày.',
        time: '5 giờ trước',
        timeDetail: '01/03/2026, 11:00',
        unread: false,
    },
    {
        id: 'n7',
        type: 'order',
        avatar: 'https://i.pravatar.cc/150?img=44',
        sender: 'Rãnh ko có gì làm',
        text: 'đã xác nhận nhận hàng đơn #OD2026030145',
        detail: 'Người mua đã xác nhận nhận hàng thành công. Đơn hàng #OD2026030145 đã hoàn tất. Số tiền 1.200.000₫ đã được chuyển vào ví OLODO của bạn.',
        product: { name: 'Bàn phím cơ Keychron K2', price: '1.200.000₫', img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=200' },
        time: '1 ngày trước',
        timeDetail: '28/02/2026, 09:15',
        unread: false,
    },
    {
        id: 'n8',
        type: 'comment',
        avatar: 'https://i.pravatar.cc/150?img=68',
        sender: 'Bảo Vũ',
        text: 'đã trả lời bình luận của bạn: "Em gửi ảnh chi tiết nha"',
        detail: 'Bảo Vũ đã trả lời bình luận của bạn trong bài đăng "Máy ảnh Canon EOS M50": "Em gửi ảnh chi tiết nha anh, em còn giữ hộp và phụ kiện đầy đủ."',
        time: '1 ngày trước',
        timeDetail: '28/02/2026, 08:30',
        unread: false,
    },
    {
        id: 'n9',
        type: 'system',
        avatar: '',
        sender: 'Hệ thống',
        text: 'Tài khoản của bạn đã được xác minh thành công ✓',
        detail: 'Chúc mừng! Tài khoản OLODO của bạn đã được xác minh danh tính sinh viên thành công. Bạn sẽ nhận được huy hiệu "Đã xác minh" trên tất cả bài đăng.',
        time: '2 ngày trước',
        timeDetail: '27/02/2026, 14:00',
        unread: false,
    },
];

const TYPE_CONFIG = {
    order: { icon: ShoppingBag, label: 'Đơn hàng', color: '#22c55e' },
    comment: { icon: MessageSquare, label: 'Bình luận', color: '#3b82f6' },
    friend: { icon: UserPlus, label: 'Kết bạn', color: '#f59e0b' },
    system: { icon: Shield, label: 'Hệ thống', color: '#8b5cf6' },
    promo: { icon: Tag, label: 'Khuyến mãi', color: '#ef4444' },
    like: { icon: Heart, label: 'Lượt thích', color: '#ec4899' },
};

const TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
    { key: 'order', label: 'Đơn hàng' },
    { key: 'comment', label: 'Bình luận' },
    { key: 'system', label: 'Hệ thống' },
];

/* ════════ MAIN COMPONENT ════════ */
export default function Notifications() {
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
    const [selected, setSelected] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const unreadCount = notifications.filter(n => n.unread).length;

    /* Filter */
    let filtered = notifications;
    if (activeTab === 'unread') {
        filtered = filtered.filter(n => n.unread);
    } else if (activeTab !== 'all') {
        filtered = filtered.filter(n => n.type === activeTab);
    }
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(n =>
            n.sender.toLowerCase().includes(q) ||
            n.text.toLowerCase().includes(q)
        );
    }

    /* Group: Today / Earlier */
    const today = filtered.filter(n => !n.time.includes('ngày'));
    const earlier = filtered.filter(n => n.time.includes('ngày'));

    const handleSelect = (notif) => {
        setSelected(notif);
        setNotifications(prev =>
            prev.map(n => n.id === notif.id ? { ...n, unread: false } : n)
        );
    };

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    };

    const renderIcon = (type, size = 12) => {
        const config = TYPE_CONFIG[type];
        if (!config) return null;
        const Icon = config.icon;
        return <Icon size={size} />;
    };

    const renderAvatar = (notif) => {
        const config = TYPE_CONFIG[notif.type];
        if (notif.avatar) {
            return (
                <div className="notif-avatar-wrap">
                    <img className="notif-avatar" src={notif.avatar} alt={notif.sender} />
                    <span className={`notif-avatar-icon ${notif.type}`}>
                        {renderIcon(notif.type, 11)}
                    </span>
                </div>
            );
        }
        return (
            <div className="notif-avatar-wrap">
                <div
                    className="notif-avatar"
                    style={{
                        background: `linear-gradient(135deg, ${config?.color || '#ccc'}22, ${config?.color || '#ccc'}44)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: config?.color || '#ccc'
                    }}
                >
                    {renderIcon(notif.type, 22)}
                </div>
            </div>
        );
    };

    const renderSection = (label, items) => {
        if (items.length === 0) return null;
        return (
            <>
                <div className="notif-section-divider">{label}</div>
                {items.map(notif => (
                    <button
                        key={notif.id}
                        className={`notif-item ${notif.unread ? 'unread' : ''} ${selected?.id === notif.id ? 'selected' : ''}`}
                        onClick={() => handleSelect(notif)}
                    >
                        {renderAvatar(notif)}
                        <div className="notif-content">
                            <div className="notif-text">
                                <strong>{notif.sender}</strong> {notif.text}
                            </div>
                            <div className="notif-time">{notif.time}</div>
                        </div>
                        <div className="notif-item-actions">
                            <button className="notif-item-action-btn" title="Xem" onClick={(e) => { e.stopPropagation(); handleSelect(notif); }}>
                                <Eye size={13} />
                            </button>
                            <button className="notif-item-action-btn" title="Xóa" onClick={(e) => { e.stopPropagation(); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }}>
                                <Trash2 size={13} />
                            </button>
                        </div>
                    </button>
                ))}
            </>
        );
    };

    return (
        <div className="notif-page">

            {/* ═══ LEFT — Notification List ═══ */}
            <div className={`notif-list-panel ${selected ? 'hidden-mobile' : ''}`}>
                <div className="notif-list-header">
                    <h2>Thông báo</h2>
                    <div className="notif-header-actions">
                        <button className="notif-icon-btn" aria-label="Settings">
                            <Settings size={16} />
                        </button>
                        <button className="notif-icon-btn" aria-label="More">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>
                </div>

                <div className="notif-search">
                    <Search size={15} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm thông báo..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="notif-tabs">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            className={`notif-tab ${activeTab === t.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="notif-quick-row">
                    <span className="notif-unread-count">{unreadCount} chưa đọc</span>
                    {unreadCount > 0 && (
                        <button className="notif-mark-read-btn" onClick={handleMarkAllRead}>
                            <CheckCheck size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            Đánh dấu tất cả đã đọc
                        </button>
                    )}
                </div>

                <div className="notif-list">
                    {renderSection('Hôm nay', today)}
                    {renderSection('Trước đó', earlier)}
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ccc' }}>
                            <Bell size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                            <p style={{ fontSize: 14 }}>Không có thông báo nào</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ RIGHT — Detail ═══ */}
            <div className={`notif-detail-panel ${selected ? 'show-mobile' : ''}`}>
                {selected ? (
                    <>
                        <div className="notif-detail-header">
                            <button
                                className="notif-detail-action-btn"
                                style={{ display: 'none' }}
                                onClick={() => setSelected(null)}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {selected.avatar ? (
                                <img className="notif-detail-avatar" src={selected.avatar} alt={selected.sender} />
                            ) : (
                                <div
                                    className="notif-detail-avatar"
                                    style={{
                                        background: `linear-gradient(135deg, ${TYPE_CONFIG[selected.type]?.color || '#ccc'}22, ${TYPE_CONFIG[selected.type]?.color || '#ccc'}44)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: TYPE_CONFIG[selected.type]?.color || '#ccc'
                                    }}
                                >
                                    {renderIcon(selected.type, 22)}
                                </div>
                            )}
                            <div className="notif-detail-info">
                                <div className="notif-detail-name">{selected.sender}</div>
                                <div className="notif-detail-type">
                                    <span className={`notif-detail-type-dot ${selected.type}`} />
                                    {TYPE_CONFIG[selected.type]?.label || 'Thông báo'}
                                </div>
                            </div>
                            <div className="notif-detail-actions">
                                <button className="notif-detail-action-btn" title="Xóa">
                                    <Trash2 size={16} />
                                </button>
                                <button className="notif-detail-action-btn" title="Thêm">
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="notif-detail-body">
                            <div className="notif-detail-card">
                                <div className="notif-detail-card-title">
                                    {selected.sender} {selected.text}
                                </div>
                                <div className="notif-detail-card-time">
                                    <Clock size={13} />
                                    {selected.timeDetail}
                                </div>

                                <div className="notif-detail-card-body">
                                    <p>{selected.detail}</p>
                                </div>

                                {selected.product && (
                                    <div className="notif-product-preview">
                                        <img className="notif-product-img" src={selected.product.img} alt={selected.product.name} />
                                        <div className="notif-product-info">
                                            <div className="notif-product-name">{selected.product.name}</div>
                                            <div className="notif-product-price">{selected.product.price}</div>
                                        </div>
                                        <ExternalLink size={16} style={{ color: '#aaa', flexShrink: 0 }} />
                                    </div>
                                )}

                                <div className="notif-detail-cta">
                                    {selected.type === 'order' && (
                                        <>
                                            <button className="notif-cta-btn primary">Xem đơn hàng</button>
                                            <button className="notif-cta-btn secondary">Nhắn tin</button>
                                        </>
                                    )}
                                    {selected.type === 'comment' && (
                                        <>
                                            <button className="notif-cta-btn primary">Trả lời</button>
                                            <button className="notif-cta-btn secondary">Xem bài đăng</button>
                                        </>
                                    )}
                                    {selected.type === 'friend' && (
                                        <>
                                            <button className="notif-cta-btn primary">Chấp nhận</button>
                                            <button className="notif-cta-btn secondary">Từ chối</button>
                                        </>
                                    )}
                                    {selected.type === 'like' && (
                                        <button className="notif-cta-btn primary">Xem bài đăng</button>
                                    )}
                                    {selected.type === 'promo' && (
                                        <button className="notif-cta-btn primary">Xem ưu đãi</button>
                                    )}
                                    {selected.type === 'system' && (
                                        <button className="notif-cta-btn primary">Xem chi tiết</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="notif-detail-empty">
                        <div className="notif-detail-empty-icon">
                            <Bell size={36} />
                        </div>
                        <h3>Chọn thông báo</h3>
                        <p>Chọn một thông báo bên trái để xem chi tiết nội dung</p>
                    </div>
                )}
            </div>
        </div>
    );
}
