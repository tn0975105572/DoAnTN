import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    BadgeCheck,
    Clock,
    FileText,
    Loader2,
    MapPin,
    ShoppingBag,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import './Orders.css';

const FALLBACK_IMAGE = 'https://via.placeholder.com/640x360?text=Invoice';

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    if (!amount) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDateTime = (value) => {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const normalizeImageUrl = (raw, backendOrigin) => {
    if (!raw) return FALLBACK_IMAGE;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    const cleaned = raw.replace(/^\/+/, '');
    if (!cleaned) return FALLBACK_IMAGE;
    return cleaned.startsWith('uploads/')
        ? `${backendOrigin}/${cleaned}`
        : `${backendOrigin}/uploads/${cleaned}`;
};

export default function Orders() {
    const navigate = useNavigate();
    const { token, userId } = useAuthSession();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const backendOrigin = useMemo(() => {
        try {
            return new URL(API_BASE_URL).origin;
        } catch {
            return 'http://localhost:3000';
        }
    }, []);

    useEffect(() => {
        if (!token || !userId) {
            setLoading(false);
            setError('Bạn cần đăng nhập để xem hóa đơn.');
            return;
        }

        let cancelled = false;

        const loadOrders = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await fetch(`${API_BASE_URL}/donhang/my`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.message || 'Không thể tải danh sách hóa đơn.');
                }

                if (!cancelled) {
                    setOrders(Array.isArray(payload?.data) ? payload.data : []);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError.message || 'Không thể tải danh sách hóa đơn.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadOrders();

        return () => {
            cancelled = true;
        };
    }, [token, userId]);

    const totalAmount = orders.reduce((sum, item) => sum + Number(item.gia_giao_dich || 0), 0);

    if (loading) {
        return (
            <div className="orders-page">
                <div className="orders-shell">
                    <div className="orders-state-card">
                        <Loader2 size={28} className="spin" />
                        <h1>Đang tải hóa đơn</h1>
                        <p>Hệ thống đang lấy các giao dịch đã hoàn tất của bạn.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="orders-page">
                <div className="orders-shell">
                    <div className="orders-state-card">
                        <FileText size={28} />
                        <h1>Không mở được hóa đơn</h1>
                        <p>{error}</p>
                        {!token && (
                            <button type="button" className="orders-btn-primary" onClick={() => navigate('/login')}>
                                Đăng nhập
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="orders-page">
            <div className="orders-shell">
                <section className="orders-hero">
                    <div>
                        <span className="orders-kicker">Lưu trữ hóa đơn</span>
                        <h1>Hóa đơn của tôi</h1>
                        <p>Mỗi giao dịch mua bán hoàn tất sẽ tạo một hóa đơn riêng để bạn tra cứu lại sau này.</p>
                    </div>
                    <div className="orders-stats">
                        <div className="orders-stat-card">
                            <strong>{orders.length}</strong>
                            <span>Tổng hóa đơn</span>
                        </div>
                        <div className="orders-stat-card">
                            <strong>{formatCurrency(totalAmount)}</strong>
                            <span>Tổng giá trị</span>
                        </div>
                    </div>
                </section>

                {orders.length === 0 ? (
                    <div className="orders-state-card is-empty">
                        <ShoppingBag size={28} />
                        <h2>Chưa có hóa đơn nào</h2>
                        <p>Khi một giao dịch được cả hai bên xác nhận hoàn tất, hóa đơn sẽ xuất hiện tại đây.</p>
                    </div>
                ) : (
                    <section className="orders-grid">
                        {orders.map((order) => {
                            const isBuyer = String(order.ID_NguoiMua) === String(userId);
                            const counterpartName = isBuyer
                                ? order.ten_nguoi_ban || 'Người bán'
                                : order.ten_nguoi_mua || 'Người mua';
                            const counterpartLabel = isBuyer ? 'Đối tác bán' : 'Đối tác mua';

                            return (
                                <article key={order.ID_DonHang} className="orders-card">
                                    <img
                                        className="orders-card-image"
                                        src={normalizeImageUrl(order.anh_bai_dang, backendOrigin)}
                                        alt={order.tieu_de_bai_dang}
                                    />

                                    <div className="orders-card-body">
                                        <div className="orders-card-top">
                                            <span className="orders-badge">
                                                <BadgeCheck size={14} />
                                                Hoàn tất
                                            </span>
                                            <span className="orders-code">{order.ma_hoa_don}</span>
                                        </div>

                                        <h2>{order.tieu_de_bai_dang}</h2>
                                        <div className="orders-price">{formatCurrency(order.gia_giao_dich)}</div>

                                        <div className="orders-meta">
                                            <div>
                                                <Clock size={14} />
                                                <span>{formatDateTime(order.thoi_gian_hoan_tat)}</span>
                                            </div>
                                            <div>
                                                <MapPin size={14} />
                                                <span>{order.dia_chi_hen_gap || order.vi_tri_bai_dang || 'Chưa có địa chỉ'}</span>
                                            </div>
                                        </div>

                                        <div className="orders-counterparty">
                                            <small>{counterpartLabel}</small>
                                            <strong>{counterpartName}</strong>
                                        </div>

                                        <Link to={`/orders/${order.ID_DonHang}`} className="orders-link">
                                            Xem chi tiết
                                            <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}
            </div>
        </div>
    );
}
