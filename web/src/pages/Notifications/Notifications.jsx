import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Search, MoreHorizontal, Settings, Bell, Check, CheckCheck,
    ShoppingBag, MessageSquare, UserPlus, Shield, Tag, Heart,
    Clock, Trash2, Eye, ExternalLink, ChevronLeft
} from 'lucide-react';
import './Notifications.css';
import axios from 'axios';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';

/* ════════ MAP BACKEND → UI MODEL ════════ */
const mapApiNotification = (n) => {
    let type = 'system';
    if (n.loai === 'tin_nhan') type = 'message';
    else if (n.loai === 'phan_hoi_bai_dang') type = 'comment';
    else if (n.loai === 'thanh_toan') type = 'order';
    else if (n.loai === 'voucher_moi') type = 'promo';

    return {
        id: n.ID_ThongBao,
        type,
        avatar: n.nguoi_gui_avatar || '',
        sender: n.nguoi_gui_ten || 'Hệ thống',
        text: n.noi_dung,
        detail: n.noi_dung,
        time: new Date(n.thoi_gian_tao).toLocaleString('vi-VN'),
        timeDetail: new Date(n.thoi_gian_tao).toLocaleString('vi-VN'),
        unread: n.da_doc === 0,
        raw: n,
    };
};

const TYPE_CONFIG = {
    order: { icon: ShoppingBag, label: 'Đơn hàng', color: '#22c55e' },
    comment: { icon: MessageSquare, label: 'Bình luận', color: '#3b82f6' },
    friend: { icon: UserPlus, label: 'Kết bạn', color: '#f59e0b' },
    system: { icon: Shield, label: 'Hệ thống', color: '#8b5cf6' },
    promo: { icon: Tag, label: 'Khuyến mãi', color: '#ef4444' },
    like: { icon: Heart, label: 'Lượt thích', color: '#ec4899' },
    message: { icon: MessageSquare, label: 'Tin nhắn', color: '#0ea5e9' },
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
    const { userId, token } = useAuthSession();
    const [notifications, setNotifications] = useState([]);
    const [selected, setSelected] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const backendOrigin = useMemo(() => {
        try { return new URL(API_BASE_URL).origin; } catch { return 'http://localhost:3000'; }
    }, []);

    const normalizeUploadsUrl = useCallback((raw) => {
        if (!raw) return '';
        try {
            const url = new URL(raw);
            if (url.pathname.startsWith('/uploads/')) {
                return `${backendOrigin}${url.pathname}`;
            }
            return raw;
        } catch {
            // raw có thể là relative path /uploads/...
            if (typeof raw === 'string' && raw.startsWith('/uploads/')) {
                return `${backendOrigin}${raw}`;
            }
            return raw;
        }
    }, [backendOrigin]);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            setError('Bạn cần đăng nhập để xem thông báo.');
            return;
        }

        const fetchNotifications = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await axios.get(`${API_BASE_URL}/thongbao/user/${userId}?limit=50`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const data = res.data?.data || [];
                const mapped = data.map(mapApiNotification);
                setNotifications(mapped);
            } catch (err) {
                setError('Không thể tải thông báo. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [token, userId]);

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

    const handleDelete = async (notifId) => {
        try {
            await axios.delete(`${API_BASE_URL}/thongbao/delete/${notifId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
        } catch (e) {
            // API lỗi vẫn xóa local
        }
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        if (selected?.id === notifId) setSelected(null);
    };

    const handleMarkAllRead = async () => {
        if (!userId) return;
        try {
            await axios.put(`${API_BASE_URL}/thongbao/mark-all-read/${userId}`, null, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
        } catch (e) {
            // giữ im lặng, UI vẫn cập nhật local
        }
    };

    const renderIcon = (type, size = 12) => {
        const config = TYPE_CONFIG[type];
        if (!config) return null;
        const Icon = config.icon;
        return <Icon size={size} />;
    };

    const renderAvatar = (notif) => {
        const config = TYPE_CONFIG[notif.type];
        const avatarSrc = normalizeUploadsUrl(notif.avatar);
        if (avatarSrc) {
            return (
                <div className="notif-avatar-wrap">
                    <img className="notif-avatar" src={avatarSrc} alt={notif.sender} />
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
                            <button className="notif-item-action-btn" title="Xóa" onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}>
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
                    {error && (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#f97373', fontSize: 13 }}>
                            {error}
                        </div>
                    )}
                    {loading && !error && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                            <Clock size={24} style={{ marginBottom: 8, opacity: 0.7 }} />
                            <p style={{ fontSize: 14 }}>Đang tải thông báo...</p>
                        </div>
                    )}
                    {renderSection('Hôm nay', today)}
                    {renderSection('Trước đó', earlier)}
                    {!loading && filtered.length === 0 && !error && (
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
                                <button className="notif-detail-action-btn" title="Xóa" onClick={() => handleDelete(selected.id)}>
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
