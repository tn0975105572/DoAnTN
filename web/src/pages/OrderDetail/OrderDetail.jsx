import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    BadgeCheck,
    Clock,
    Download,
    ExternalLink,
    FileText,
    Loader2,
    MapPin,
    ReceiptText,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import './OrderDetail.css';

const buildPlaceholderSvg = (label, startColor, endColor) =>
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
            <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${startColor}" />
                    <stop offset="100%" stop-color="${endColor}" />
                </linearGradient>
            </defs>
            <rect width="1200" height="720" rx="40" fill="url(#g)" />
            <circle cx="1040" cy="110" r="180" fill="rgba(255,255,255,0.08)" />
            <circle cx="120" cy="630" r="220" fill="rgba(255,255,255,0.08)" />
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
                fill="rgba(255,255,255,0.92)" font-family="Segoe UI, Arial, sans-serif"
                font-size="88" font-weight="700" letter-spacing="8">
                ${label}
            </text>
        </svg>
    `)}`;

const DEFAULT_AVATAR = buildPlaceholderSvg('OD', '#0f172a', '#475569');
const FALLBACK_IMAGE = buildPlaceholderSvg('HOA DON', '#7f1d1d', '#ef4444');
const INVOICE_LOGO = '/invoice-logo.svg';

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

const normalizeMediaUrl = (raw, backendOrigin, fallback) => {
    if (!raw) return fallback;

    try {
        const url = new URL(raw);
        if (url.pathname.startsWith('/uploads/')) {
            return `${backendOrigin}${url.pathname}`;
        }
        return raw;
    } catch {
        const cleaned = String(raw).replace(/^\/+/, '');
        if (!cleaned) return fallback;
        return cleaned.startsWith('uploads/')
            ? `${backendOrigin}/${cleaned}`
            : `${backendOrigin}/uploads/${cleaned}`;
    }
};

export default function OrderDetail() {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const { token, userId } = useAuthSession();
    const [order, setOrder] = useState(null);
    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [logoVisible, setLogoVisible] = useState(true);

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

        if (!orderId) {
            setLoading(false);
            setError('Không xác định được hóa đơn cần mở.');
            return;
        }

        let cancelled = false;

        const loadOrder = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await fetch(`${API_BASE_URL}/donhang/getById/${orderId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.message || 'Không thể tải chi tiết hóa đơn.');
                }

                const nextOrder = payload?.data || null;

                if (!cancelled) {
                    setOrder(nextOrder);
                }

                if (nextOrder?.ID_GiaoDich) {
                    const transactionResponse = await fetch(
                        `${API_BASE_URL}/giaodich_baidang/getById/${nextOrder.ID_GiaoDich}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                    if (transactionResponse.ok) {
                        const transactionPayload = await transactionResponse.json().catch(() => null);
                        if (!cancelled) {
                            setTransaction(transactionPayload?.data || null);
                        }
                    }
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError.message || 'Không thể tải chi tiết hóa đơn.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadOrder();

        return () => {
            cancelled = true;
        };
    }, [orderId, token, userId]);

    if (loading) {
        return (
            <div className="order-detail-page">
                <div className="order-detail-shell">
                    <div className="order-detail-state">
                        <Loader2 size={28} className="spin" />
                        <h1>Đang tải hóa đơn</h1>
                        <p>Hệ thống đang lấy thông tin hóa đơn chi tiết của giao dịch đã hoàn tất.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="order-detail-page">
                <div className="order-detail-shell">
                    <div className="order-detail-state">
                        <FileText size={28} />
                        <h1>Không mở được hóa đơn</h1>
                        <p>{error || 'Hóa đơn không tồn tại.'}</p>
                        <button type="button" className="order-detail-btn" onClick={() => navigate('/orders')}>
                            Quay lại danh sách hóa đơn
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const buyerAvatar = normalizeMediaUrl(order.anh_nguoi_mua, backendOrigin, DEFAULT_AVATAR);
    const sellerAvatar = normalizeMediaUrl(order.anh_nguoi_ban, backendOrigin, DEFAULT_AVATAR);
    const postImage = normalizeMediaUrl(order.anh_bai_dang, backendOrigin, FALLBACK_IMAGE);
    const viewerIsBuyer = String(order.ID_NguoiMua) === String(userId);

    const meetingAddress = transaction?.dia_chi_hen_gap || order.dia_chi_hen_gap || order.vi_tri_bai_dang || 'Chưa có địa chỉ hẹn gặp';
    const meetingNote = transaction?.ghi_chu_hen_gap || order.ghi_chu_hen_gap || 'Không có ghi chú điểm hẹn.';
    const meetingTime = transaction?.thoi_gian_hen_gap || order.thoi_gian_hen_gap;

    const meetingLatitude = Number(transaction?.vi_do_hen_gap);
    const meetingLongitude = Number(transaction?.kinh_do_hen_gap);
    const hasCoordinates = Number.isFinite(meetingLatitude) && Number.isFinite(meetingLongitude);
    const mapQuery = hasCoordinates ? `${meetingLatitude},${meetingLongitude}` : meetingAddress;
    const mapExternalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
    const coordinateLabel = hasCoordinates
        ? `${meetingLatitude.toFixed(6)}, ${meetingLongitude.toFixed(6)}`
        : 'Chưa có tọa độ đã xác nhận';
    const completedDate = formatDateTime(order.thoi_gian_hoan_tat);
    const meetingDate = formatDateTime(meetingTime);
    const invoiceTotal = formatCurrency(order.gia_giao_dich);

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <div className="order-detail-page">
            <div className="order-detail-shell">
                <div className="order-detail-topbar">
                    <button type="button" className="order-detail-back" onClick={() => navigate('/orders')}>
                        <ArrowLeft size={16} />
                        Danh sách hóa đơn
                    </button>
                    <div className="order-detail-topbar-actions">
                        <a
                            href={mapExternalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="order-detail-link-btn"
                        >
                            <ExternalLink size={16} />
                            Mở Google Maps
                        </a>
                        <button type="button" className="order-detail-btn" onClick={handlePrint}>
                            <Download size={16} />
                            Xuất PDF
                        </button>
                    </div>
                </div>

                <section className="order-detail-invoice">
                    <div className="order-detail-print-page">
                        <div className="order-detail-watermark" aria-hidden="true">
                            {logoVisible ? (
                                <img src={INVOICE_LOGO} alt="" onError={() => setLogoVisible(false)} />
                            ) : (
                                <span>OLODO</span>
                            )}
                        </div>

                        <header className="order-detail-invoice-head">
                            <div className="order-detail-brand">
                                <div className="order-detail-brand-mark">
                                    {logoVisible ? (
                                        <img src={INVOICE_LOGO} alt="OLODO" onError={() => setLogoVisible(false)} />
                                    ) : (
                                        <span>OD</span>
                                    )}
                                </div>
                                <div className="order-detail-brand-copy">
                                    <span className="order-detail-kicker">
                                        <ReceiptText size={14} />
                                        Hóa đơn giao dịch
                                    </span>
                                    <h1>OLODO</h1>
                                    <p>Nền tảng mua bán, trao đổi và tặng đồ đã qua xác nhận giao dịch.</p>
                                </div>
                            </div>

                            <div className="order-detail-meta-card">
                                <span className="order-detail-badge">
                                    <BadgeCheck size={14} />
                                    Hoàn tất
                                </span>
                                <dl>
                                    <div>
                                        <dt>Mã hóa đơn</dt>
                                        <dd>{order.ma_hoa_don}</dd>
                                    </div>
                                    <div>
                                        <dt>Ngày lập</dt>
                                        <dd>{completedDate}</dd>
                                    </div>
                                    <div>
                                        <dt>Vai trò của bạn</dt>
                                        <dd>{viewerIsBuyer ? 'Người mua' : 'Người bán'}</dd>
                                    </div>
                                </dl>
                            </div>
                        </header>

                        <section className="order-detail-title-band">
                            <div>
                                <small>Biên nhận mua bán</small>
                                <h2>HÓA ĐƠN GIAO DỊCH</h2>
                            </div>
                            <strong>{invoiceTotal}</strong>
                        </section>

                        <section className="order-detail-party-grid">
                            <article>
                                <small>Bên mua</small>
                                <div className="order-detail-user-card">
                                    <img src={buyerAvatar} alt={order.ten_nguoi_mua || 'Người mua'} />
                                    <div>
                                        <strong>{order.ten_nguoi_mua || 'Người mua'}</strong>
                                        <span>{order.email_nguoi_mua || 'Chưa có email'}</span>
                                    </div>
                                </div>
                                {order.ID_NguoiMua && (
                                    <Link to={`/profile/${order.ID_NguoiMua}`} className="order-detail-link">
                                        Xem hồ sơ người mua
                                    </Link>
                                )}
                            </article>

                            <article>
                                <small>Bên bán</small>
                                <div className="order-detail-user-card">
                                    <img src={sellerAvatar} alt={order.ten_nguoi_ban || 'Người bán'} />
                                    <div>
                                        <strong>{order.ten_nguoi_ban || 'Người bán'}</strong>
                                        <span>{order.email_nguoi_ban || 'Chưa có email'}</span>
                                    </div>
                                </div>
                                {order.ID_NguoiBan && (
                                    <Link to={`/profile/${order.ID_NguoiBan}`} className="order-detail-link">
                                        Xem hồ sơ người bán
                                    </Link>
                                )}
                            </article>
                        </section>

                        <section className="order-detail-item-section">
                            <div className="order-detail-product-summary">
                                <img src={postImage} alt={order.tieu_de_bai_dang} className="order-detail-image" />
                                <div>
                                    <small>Bài đăng giao dịch</small>
                                    <h3>{order.tieu_de_bai_dang}</h3>
                                    <p>{meetingNote}</p>
                                </div>
                            </div>

                            <div className="order-detail-table-wrap">
                                <table className="order-detail-items">
                                    <thead>
                                        <tr>
                                            <th>STT</th>
                                            <th>Nội dung giao dịch</th>
                                            <th>Thời gian hẹn</th>
                                            <th>Địa điểm</th>
                                            <th>Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>01</td>
                                            <td>{order.tieu_de_bai_dang}</td>
                                            <td>{meetingDate}</td>
                                            <td>{meetingAddress}</td>
                                            <td>{invoiceTotal}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="order-detail-summary-grid">
                            <article>
                                <small>Thông tin xác nhận</small>
                                <p>
                                    <Clock size={15} />
                                    Hoàn tất lúc {completedDate}
                                </p>
                                <p>
                                    <MapPin size={15} />
                                    Tọa độ: {coordinateLabel}
                                </p>
                                <a href={mapExternalUrl} target="_blank" rel="noreferrer" className="order-detail-inline-link">
                                    Mở Google Maps
                                    <ExternalLink size={15} />
                                </a>
                            </article>

                            <article className="order-detail-total-card">
                                <div>
                                    <span>Tạm tính</span>
                                    <strong>{invoiceTotal}</strong>
                                </div>
                                <div>
                                    <span>Phí phát sinh</span>
                                    <strong>0 ₫</strong>
                                </div>
                                <div className="order-detail-grand-total">
                                    <span>Tổng cộng</span>
                                    <strong>{invoiceTotal}</strong>
                                </div>
                            </article>
                        </section>

                        <section className="order-detail-note-grid">
                            <article>
                                <small>Ghi chú người mua</small>
                                <p>{order.ghi_chu_nguoi_mua || 'Không có ghi chú từ người mua.'}</p>
                            </article>
                            <article>
                                <small>Mã tra cứu</small>
                                <p>ID hóa đơn: {order.ID_DonHang}</p>
                                <p>ID giao dịch: {order.ID_GiaoDich}</p>
                            </article>
                        </section>

                        <footer className="order-detail-signatures">
                            <div>
                                <span>Người mua</span>
                                <strong>{order.ten_nguoi_mua || 'Người mua'}</strong>
                            </div>
                            <div>
                                <span>Người bán</span>
                                <strong>{order.ten_nguoi_ban || 'Người bán'}</strong>
                            </div>
                        </footer>
                    </div>
                </section>
            </div>
        </div>
    );
}
