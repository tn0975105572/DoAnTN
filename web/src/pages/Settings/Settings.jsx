import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Bell,
    Camera,
    Car,
    ChevronLeft,
    ChevronRight,
    Crown,
    Home as HomeIcon,
    Lock,
    LogOut,
    Map as MapIcon,
    MessageCircle,
    Play,
    Plus,
    Search,
    ShieldCheck,
    Shirt,
    ShoppingBag,
    Smartphone,
    Sofa,
    Sparkles,
    Star,
    User,
    UserPlus,
    X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import {
    ChangePasswordView,
    LoginPrompt,
    PersonalInfoView,
    PointsHistoryView,
    SettingsItem,
    SettingsSection,
    UserProfile,
    VerificationView,
    VideoEarnView
} from '../../components/settings';
import { API_BASE_URL } from '../../constants';
import { clearAuthSession, updateStoredUser, useAuthSession } from '../../utils/authSession';
import './Settings.css';

const PAYMENT_QR_LIFETIME_SECONDS = 600;
const PAYMENT_AUTO_POLL_INTERVAL_MS = 2500;
const VIP_PACKAGES = [
    { type: 'vip', title: 'VIP 1 tháng', vipDays: 30, amount: 29000, highlight: 'Dùng thử' },
    { type: 'vip', title: 'VIP 3 tháng', vipDays: 90, amount: 79000, highlight: 'Phổ biến' },
    { type: 'vip', title: 'VIP 1 năm', vipDays: 365, amount: 249000, highlight: 'Tiết kiệm' },
];
const SETTINGS_NAV_ITEMS = [
    { icon: HomeIcon, label: 'Trang chủ', path: '/' },
    { icon: MapIcon, label: 'Bản đồ', path: '/map' },
    { icon: UserPlus, label: 'Thêm bạn', path: '/add-friends', badge: 2 },
    { icon: MessageCircle, label: 'Tin nhắn', path: '/messages' },
    { icon: Bell, label: 'Thông báo', path: '/notifications' },
    { icon: ShieldCheck, label: 'Cài đặt', path: '/settings', active: true },
];
const SETTINGS_CATEGORIES = [
    { icon: Smartphone, label: 'Điện tử', color: '#3b82f6' },
    { icon: Shirt, label: 'Thời trang', color: '#ec4899' },
    { icon: ShoppingBag, label: 'Đồ dùng', color: '#f59e0b' },
    { icon: Car, label: 'Xe cộ', color: '#10b981' },
    { icon: Sofa, label: 'Nội thất', color: '#8b5cf6' },
    { icon: Camera, label: 'Máy ảnh', color: '#ef4444' },
];
const SETTINGS_PEOPLE = [
    { name: 'Vân Bùi', mutual: 0, avatar: 'https://i.pravatar.cc/80?img=47' },
    { name: 'Hải Xuân Đặng', mutual: 0, avatar: 'https://i.pravatar.cc/80?img=32' },
    { name: 'Lâm Lê', mutual: 0, avatar: 'https://i.pravatar.cc/80?img=5' },
];
const SETTINGS_BACKEND_ORIGIN = (() => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        return 'http://localhost:3000';
    }
})();

function getStoredPaymentCountdown() {
    const pendingTransId = localStorage.getItem('pending_zalopay_trans_id');
    if (!pendingTransId) return 0;

    const startedAt = Number(localStorage.getItem('pending_zalopay_started_at') || 0);
    if (!startedAt) return PAYMENT_QR_LIFETIME_SECONDS;

    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, PAYMENT_QR_LIFETIME_SECONDS - elapsedSeconds);
}

function getStoredPaymentStatus() {
    const pendingTransId = localStorage.getItem('pending_zalopay_trans_id');
    if (!pendingTransId) return 'idle';

    return getStoredPaymentCountdown() > 0 ? 'qr_ready' : 'expired';
}

function getStoredPaymentPackage() {
    try {
        return JSON.parse(localStorage.getItem('pending_zalopay_package') || 'null');
    } catch {
        return null;
    }
}

function getStoredPaymentFlow() {
    const flow = localStorage.getItem('pending_zalopay_flow');
    if (flow === 'vip_purchase' || flow === 'points_history') return flow;
    return '';
}

function getPaymentViewFromPackage(pkg = getStoredPaymentPackage()) {
    const storedFlow = getStoredPaymentFlow();
    if (storedFlow) return storedFlow;
    return pkg?.type === 'vip' ? 'vip_purchase' : 'points_history';
}

function getInitialSettingsView() {
    const pendingTransId = localStorage.getItem('pending_zalopay_trans_id');
    if (!pendingTransId) return 'main';

    // Nếu QR đã hết hạn thì xóa dữ liệu tồn đọng và về trang chính
    if (getStoredPaymentCountdown() <= 0) {
        localStorage.removeItem('pending_zalopay_trans_id');
        localStorage.removeItem('pending_zalopay_order_url');
        localStorage.removeItem('pending_zalopay_package');
        localStorage.removeItem('pending_zalopay_flow');
        localStorage.removeItem('pending_zalopay_started_at');
        return 'main';
    }

    return getPaymentViewFromPackage();
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN').format(value);
}

function formatCountdown(value) {
    const totalSeconds = Math.max(0, Number(value) || 0);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function normalizeSettingsUploadsUrl(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw;

    if (!raw.startsWith('http')) {
        const cleanPath = raw.startsWith('/uploads/') ? raw : `/uploads/${raw.replace(/^\/+/, '')}`;
        return `${SETTINGS_BACKEND_ORIGIN}${cleanPath}`;
    }

    try {
        const url = new URL(raw);
        if (url.pathname.startsWith('/uploads/')) {
            return `${SETTINGS_BACKEND_ORIGIN}${url.pathname}`;
        }
        return raw.replace(/^http:\/\/(?!localhost)[\d.]+:(\d+)/, 'http://localhost:$1');
    } catch {
        return raw.replace(/^http:\/\/(?!localhost)[\d.]+:(\d+)/, 'http://localhost:$1');
    }
}

function normalizeSettingsUser(userData) {
    if (!userData || typeof userData !== 'object') return userData;

    return {
        ...userData,
        anh_dai_dien: normalizeSettingsUploadsUrl(userData.anh_dai_dien),
    };
}

function isActiveVip(user) {
    if (Number(user?.la_vip || 0) !== 1 || !user?.ngay_het_han_vip) return false;
    return new Date(user.ngay_het_han_vip).getTime() > Date.now();
}

function formatVipDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN');
}

function getVipDaysLeft(value) {
    if (!value) return 0;
    const expiresAt = new Date(value).getTime();
    if (Number.isNaN(expiresAt)) return 0;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000));
}

function VipBanner({ user }) {
    if (!isActiveVip(user)) return null;

    const expiryText = formatVipDate(user.ngay_het_han_vip);
    const daysLeft = getVipDaysLeft(user.ngay_het_han_vip);

    return (
        <div className="settings-vip-banner">
            <div className="settings-vip-banner-stripe" />
            <div className="settings-vip-banner-body">
                <span className="settings-vip-banner-icon">
                    <Crown size={26} />
                </span>
                <div className="settings-vip-banner-copy">
                    <strong>Tài khoản VIP</strong>
                    <span>Còn {daysLeft} ngày · Hết hạn {expiryText}</span>
                </div>
                <span className="settings-vip-banner-tag">
                    <Sparkles size={13} />
                    VIP
                </span>
            </div>
        </div>
    );
}

function VipPurchaseView({
    user,
    onBack,
    onBuyPackage,
    onCreatePaymentQr,
    paymentState,
    onOpenPaymentLink,
}) {
    const {
        isCreatingPayment,
        pendingTransId,
        paymentQrUrl,
        selectedPackage,
        paymentMessage,
        paymentStatus,
        paymentCountdown,
        paymentSuccessInfo,
        paymentLastCheck,
    } = paymentState || {};
    const isQrExpired = paymentStatus === 'expired';
    const canCreateQr = Boolean(selectedPackage) && !isCreatingPayment;
    const vipExpiryText = formatVipDate(user?.ngay_het_han_vip);

    return (
        <div className="settings-subview">
            <div className="settings-subview-header">
                <button className="settings-back-btn" onClick={onBack}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Nâng cấp VIP</h2>
                <div style={{ width: 24 }} />
            </div>

            <div className="settings-subview-content">
                <div className="vip-purchase-hero">
                    <div className="vip-purchase-mark">
                        <Crown size={30} />
                    </div>
                    <div>
                        <div className="vip-purchase-eyebrow">OLODO VIP</div>
                        <h3>Tài khoản nổi bật hơn, giao dịch tiện hơn</h3>
                        <p>
                            Thanh toán bằng ZaloPay giống mua điểm. Sau khi thanh toán thành công,
                            hệ thống tự kích hoạt VIP cho tài khoản.
                        </p>
                        {isActiveVip(user) && (
                            <span className="vip-current-status">Đang VIP đến {vipExpiryText}</span>
                        )}
                    </div>
                </div>

                <div className="zalopay-topup-card vip-payment-card">
                    <div className="zalopay-topup-header">
                        <div>
                            <div className="zalopay-brand">Mua VIP bằng ZaloPay</div>
                            <p className="zalopay-subtitle">
                                Chọn gói, tạo QR, quét bằng ZaloPay. VIP sẽ được gia hạn tự động khi giao dịch hoàn tất.
                            </p>
                        </div>
                        <div className="zalopay-badge">ZaloPay QR</div>
                    </div>

                    <div className="zalopay-package-grid vip-package-grid">
                        {VIP_PACKAGES.map((pkg) => (
                            <button
                                key={pkg.vipDays}
                                type="button"
                                className={`zalopay-package vip-package ${selectedPackage?.type === 'vip' && selectedPackage?.vipDays === pkg.vipDays ? 'active' : ''}`}
                                onClick={() => onBuyPackage?.(pkg)}
                                disabled={isCreatingPayment}
                            >
                                <span className="zalopay-package-tag">{pkg.highlight}</span>
                                <strong>{pkg.title}</strong>
                                <span>{formatCurrency(pkg.amount)} VNĐ</span>
                            </button>
                        ))}
                    </div>

                    {paymentMessage && <div className={`video-note ${paymentStatus === 'success' ? 'zalopay-success-note' : ''}`}>{paymentMessage}</div>}

                    {paymentStatus === 'success' && paymentSuccessInfo?.type === 'vip' && (
                        <div className="zalopay-success-card vip-success-card">
                            <div className="zalopay-success-badge">Thanh toán thành công</div>
                            <div className="zalopay-success-points">VIP đã được kích hoạt</div>
                            <div className="zalopay-success-balance">
                                Hết hạn: <strong>{formatVipDate(paymentSuccessInfo.vipExpiresAt)}</strong>
                            </div>
                        </div>
                    )}

                    {paymentQrUrl && paymentStatus !== 'success' && (
                        <div className={`zalopay-qr-shell is-visible ${isQrExpired ? 'is-expired' : ''}`}>
                            <div className="zalopay-qr-card">
                                {isQrExpired && <div className="zalopay-qr-expired-badge">QR hết hạn</div>}
                                <QRCodeCanvas value={paymentQrUrl} size={172} includeMargin />
                            </div>
                            <div className="zalopay-qr-meta">
                                <div className="zalopay-qr-title">{isQrExpired ? 'Mã QR đã hết hạn' : 'Quét QR bằng app ZaloPay'}</div>
                                <div className="zalopay-qr-text">
                                    {isQrExpired
                                        ? 'Mã cũ đã hết hạn. Hãy tạo lại QR mới để thanh toán VIP.'
                                        : 'Mở app ZaloPay trên điện thoại, chọn quét mã và thanh toán gói VIP đang chờ.'}
                                </div>
                                <div className="zalopay-qr-trans">Mã giao dịch: {pendingTransId || 'Đang tạo...'}</div>
                                <div className="zalopay-countdown">
                                    {isQrExpired ? (
                                        <strong>Đã hết hạn</strong>
                                    ) : (
                                        <>
                                            Tự động hiệu lực còn: <strong>{formatCountdown(paymentCountdown)}</strong>
                                        </>
                                    )}
                                </div>
                                {paymentLastCheck && (
                                    <div className="zalopay-check-status">
                                        <strong>Lần kiểm tra gần nhất: {paymentLastCheck.checkedAt}</strong>
                                        <span>
                                            Mã trạng thái {paymentLastCheck.code || 'không rõ'} - {paymentLastCheck.message}
                                        </span>
                                    </div>
                                )}
                                <div className="zalopay-qr-actions">
                                    <button
                                        type="button"
                                        className="video-primary-btn"
                                        onClick={() => onOpenPaymentLink?.()}
                                        disabled={isQrExpired}
                                    >
                                        <Smartphone size={16} />
                                        Mở link thanh toán
                                    </button>
                                    <button
                                        type="button"
                                        className="settings-save-btn"
                                        onClick={() => onCreatePaymentQr?.()}
                                        disabled={!canCreateQr}
                                    >
                                        {isCreatingPayment ? 'Đang tạo QR...' : 'Tạo QR mới'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!paymentQrUrl && selectedPackage?.type === 'vip' && paymentStatus !== 'success' && (
                        <div className="zalopay-pending-box">
                            <div>
                                Gói đã chọn: <strong>{selectedPackage.title}</strong>. Bấm nút để tạo mã QR.
                            </div>
                            <button
                                type="button"
                                className="settings-save-btn"
                                onClick={() => onCreatePaymentQr?.()}
                                disabled={!canCreateQr}
                            >
                                {isCreatingPayment ? 'Đang tạo QR...' : 'Tạo QR'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SettingsSidebars({ user, onNavigate }) {
    return (
        <>
            <aside className="settings-side-panel settings-side-left" aria-label="Điều hướng phụ">
                <div className="settings-side-search">
                    <Search size={15} />
                    <span>Tìm kiếm...</span>
                </div>

                <nav className="settings-side-card settings-side-nav">
                    {SETTINGS_NAV_ITEMS.map(({ icon, label, path, badge, active }) => (
                        <button
                            key={label}
                            type="button"
                            className={`settings-side-nav-item ${active ? 'active' : ''}`}
                            onClick={() => onNavigate(path)}
                        >
                            <span className="settings-side-icon">
                                {createElement(icon, { size: 19 })}
                                {badge ? <span className="settings-side-badge">{badge}</span> : null}
                            </span>
                            <span>{label}</span>
                            {active && <span className="settings-side-dot" />}
                        </button>
                    ))}
                </nav>

                <div className="settings-side-card settings-side-categories">
                    <div className="settings-side-title">
                        <span>Danh mục</span>
                        <ChevronRight size={14} />
                    </div>
                    {SETTINGS_CATEGORIES.map(({ icon, label, color }) => (
                        <button key={label} type="button" className="settings-side-cat">
                            <span className="settings-side-cat-icon" style={{ background: `${color}15`, color }}>
                                {createElement(icon, { size: 15 })}
                            </span>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </aside>

            <aside className="settings-side-panel settings-side-right" aria-label="Gợi ý phụ">
                {user && (
                    <button
                        type="button"
                        className="settings-side-card settings-side-profile"
                        onClick={() => onNavigate('/profile')}
                    >
                        <img src={user.anh_dai_dien || 'https://i.pravatar.cc/80?u=guest'} alt={user.ho_ten || 'Bạn'} />
                        <span>
                            <strong>{user.ho_ten || 'Bạn'}</strong>
                            <small>Xem hồ sơ →</small>
                        </span>
                    </button>
                )}

                <div className="settings-side-card settings-side-people">
                    <div className="settings-side-widget-head">
                        <UserPlus size={15} />
                        <span>Có thể bạn quen</span>
                    </div>
                    {SETTINGS_PEOPLE.map((person) => (
                        <div key={person.name} className="settings-side-person">
                            <img src={person.avatar} alt={person.name} />
                            <span>
                                <strong>{person.name}</strong>
                                <small>{person.mutual} bạn chung</small>
                            </span>
                            <button type="button" className="settings-side-add" aria-label={`Thêm ${person.name}`}>
                                <Plus size={16} />
                            </button>
                            <button type="button" className="settings-side-remove" aria-label={`Bỏ qua ${person.name}`}>
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    <button type="button" className="settings-side-see-all" onClick={() => onNavigate('/add-friends')}>
                        Xem tất cả <ChevronRight size={13} />
                    </button>
                </div>

                <div className="settings-side-app">
                    <div className="settings-side-app-logo">OLODO</div>
                    <p>Trải nghiệm đầy đủ trên mobile!</p>
                    <div className="settings-side-stars">
                        {[...Array(5)].map((_, index) => (
                            <Star key={index} size={13} fill="#ffd700" color="#ffd700" />
                        ))}
                        <span>4.9</span>
                    </div>
                    <button type="button">App Store</button>
                </div>
            </aside>
        </>
    );
}

export default function Settings() {
    const navigate = useNavigate();
    const { token, userId: authUserId, user: authUser } = useAuthSession();
    const [currentUser, setCurrentUser] = useState(() => {
        return authUser ? normalizeSettingsUser(authUser) : null;
    });
    const [isVerified, setIsVerified] = useState(() => {
        return authUser ? authUser.da_xac_thuc === 1 : false;
    });
    const [activeView, setActiveView] = useState(getInitialSettingsView);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [pointHistory, setPointHistory] = useState([]);
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);
    const [pointError, setPointError] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
    const [hasWatchedToday, setHasWatchedToday] = useState(false);
    const [isAwardingPoints, setIsAwardingPoints] = useState(false);
    const [isCreatingPayment, setIsCreatingPayment] = useState(false);
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);
    const [pendingTransId, setPendingTransId] = useState(() => localStorage.getItem('pending_zalopay_trans_id'));
    const [paymentQrUrl, setPaymentQrUrl] = useState(() => localStorage.getItem('pending_zalopay_order_url'));
    const [selectedPackage, setSelectedPackage] = useState(getStoredPaymentPackage);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [paymentStatus, setPaymentStatus] = useState(getStoredPaymentStatus);
    const [paymentCountdown, setPaymentCountdown] = useState(getStoredPaymentCountdown);
    const [paymentSuccessInfo, setPaymentSuccessInfo] = useState(null);
    const [hasReturnedFromZaloPay, setHasReturnedFromZaloPay] = useState(false);
    const [paymentLastCheck, setPaymentLastCheck] = useState(null);
    const paymentStatusCheckInFlightRef = useRef(false);

    const authHeaders = useMemo(
        () => (token ? { Authorization: `Bearer ${token}` } : {}),
        [token]
    );
    const currentUserId = currentUser?.ID_NguoiDung || authUserId;
    const isVipActive = isActiveVip(currentUser);
    const vipExpiryText = formatVipDate(currentUser?.ngay_het_han_vip);

    useEffect(() => {
        setCurrentUser(authUser ? normalizeSettingsUser(authUser) : null);
        setIsVerified(authUser?.da_xac_thuc === 1);
    }, [authUser]);

    const syncUserState = useCallback((userData) => {
        const normalizedUser = normalizeSettingsUser(userData);

        setCurrentUser(normalizedUser);
        setIsVerified(normalizedUser?.da_xac_thuc === 1);
        updateStoredUser(normalizedUser);
    }, []);

    const loadLatestUser = useCallback(async () => {
        if (!currentUserId || !token) return null;

        const response = await axios.get(`${API_BASE_URL}/nguoidung/get/${currentUserId}`, {
            headers: authHeaders,
        });

        const userData = response.data?.user || response.data;
        syncUserState(userData);
        return userData;
    }, [authHeaders, currentUserId, syncUserState, token]);

    const loadPointData = useCallback(async () => {
        if (!currentUserId || !token) return;

        setIsLoadingPoints(true);
        setPointError('');

        try {
            const [userResponse, historyResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/nguoidung/get/${currentUserId}`, {
                    headers: authHeaders,
                }),
                axios.get(`${API_BASE_URL}/lich_su_tich_diem/getByUserId/${currentUserId}?limit=20`, {
                    headers: authHeaders,
                }),
            ]);

            syncUserState(userResponse.data?.user || userResponse.data);
            setPointHistory(Array.isArray(historyResponse.data) ? historyResponse.data : []);
        } catch (error) {
            setPointError(error.response?.data?.message || 'Không thể tải dữ liệu tích điểm.');
        } finally {
            setIsLoadingPoints(false);
        }
    }, [authHeaders, currentUserId, syncUserState, token]);

    const handleLogout = () => {
        if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?')) {
            clearAuthSession(['cart', 'preferences', 'session', 'notifications']);
            setCurrentUser(null);
            setIsVerified(false);
            navigate('/login', { replace: true });
        }
    };

    const handleVerification = () => setActiveView('verification');

    const handleVipPress = () => {
        setActiveView('vip_purchase');
    };

    const handleSavePersonalInfo = async (data, avatarFile) => {
        if (!currentUserId || !token) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        setIsSavingProfile(true);

        try {
            let avatarUrl = currentUser?.anh_dai_dien || '';

            if (avatarFile) {
                const formData = new FormData();
                formData.append('avatar', avatarFile);

                const uploadResponse = await axios.post(`${API_BASE_URL}/upload`, formData, {
                    headers: {
                        ...authHeaders,
                        'Content-Type': 'multipart/form-data',
                    },
                });

                avatarUrl = uploadResponse.data?.imageUrl || avatarUrl;
            }

            const updatePayload = {
                ho_ten: data.ho_ten,
                truong_hoc: data.truong_hoc,
                vi_tri: data.vi_tri,
                anh_dai_dien: avatarUrl,
            };

            const updateResponse = await axios.put(
                `${API_BASE_URL}/nguoidung/update/${currentUserId}`,
                updatePayload,
                { headers: authHeaders }
            );

            const updatedUser = updateResponse.data?.user || { ...currentUser, ...updatePayload };
            syncUserState(updatedUser);
            alert('Cập nhật thông tin cá nhân thành công!');
            setActiveView('main');
        } catch (error) {
            alert(error.response?.data?.message || 'Không thể cập nhật thông tin cá nhân.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleDeleteAccount = async (password, resetPassword, closeBox) => {
        if (!password?.trim()) {
            alert('Vui lòng nhập mật khẩu để xác nhận xóa.');
            return;
        }

        if (!currentUserId || !token) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        setIsDeletingAccount(true);

        try {
            const response = await axios.delete(`${API_BASE_URL}/nguoidung/delete/${currentUserId}`, {
                headers: authHeaders,
                data: { mat_khau: password.trim() },
            });

            if (response.data?.success) {
                clearAuthSession(['cart', 'preferences', 'session', 'notifications']);
                resetPassword('');
                closeBox(false);
                alert('Xóa tài khoản thành công!');
                navigate('/login');
                return;
            }

            alert(response.data?.message || 'Không thể xóa tài khoản.');
        } catch (error) {
            alert(error.response?.data?.message || 'Không thể xóa tài khoản.');
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const handleChangePassword = async (form, setError) => {
        if (!currentUserId || !token) {
            setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        setIsChangingPassword(true);
        try {
            await axios.put(
                `${API_BASE_URL}/nguoidung/update/${currentUserId}`,
                {
                    mat_khau_cu: form.currentPassword,
                    mat_khau: form.newPassword,
                },
                { headers: authHeaders }
            );
            alert('Đã cập nhật mật khẩu mới.');
            setActiveView('main');
        } catch (error) {
            setError(error.response?.data?.message || 'Không thể cập nhật mật khẩu.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleVerificationUpload = async ({ faceFile, idFile, setError }) => {
        if (!currentUserId || !token) {
            setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        setIsSubmittingVerification(true);
        try {
            const formData = new FormData();
            formData.append('anh_khuon_mat', faceFile);
            formData.append('anh_cmnd', idFile);

            await axios.post(`${API_BASE_URL}/xacthuc/${currentUserId}`, formData, {
                headers: {
                    ...authHeaders,
                    'Content-Type': 'multipart/form-data',
                },
            });

            await axios.put(
                `${API_BASE_URL}/nguoidung/update/${currentUserId}`,
                { da_xac_thuc: 1 },
                { headers: authHeaders }
            );

            const refreshedUser = await loadLatestUser();
            syncUserState({ ...refreshedUser, da_xac_thuc: 1 });
            alert('Xác minh tài khoản thành công!');
            setActiveView('main');
        } catch (error) {
            setError(error.response?.data?.message || 'Không thể tải ảnh xác minh lên.');
        } finally {
            setIsSubmittingVerification(false);
        }
    };

    const handleAwardVideoPoints = async (points = 100) => {
        if (!currentUserId || !token) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return false;
        }

        if (!isVerified) {
            setActiveView('verification');
            return false;
        }

        const todayKey = `watched_video_${new Date().toDateString()}`;
        if (localStorage.getItem(todayKey)) {
            setHasWatchedToday(true);
            alert('Bạn đã xem video hôm nay rồi!');
            return false;
        }

        setIsAwardingPoints(true);
        try {
            await axios.post(
                `${API_BASE_URL}/lich_su_tich_diem/addPoints`,
                {
                    userId: currentUserId,
                    pointChange: points,
                    transactionType: 'tang_diem',
                    description: 'Xem video quảng cáo',
                    referenceId: null,
                },
                { headers: authHeaders }
            );

            localStorage.setItem(todayKey, 'true');
            setHasWatchedToday(true);
            await Promise.all([loadLatestUser(), loadPointData()]);
            alert(`Bạn đã nhận được ${points} điểm!`);
            return true;
        } catch (error) {
            alert(error.response?.data?.message || 'Không thể cộng điểm từ video.');
            return false;
        } finally {
            setIsAwardingPoints(false);
        }
    };

    const clearPendingPaymentStorage = useCallback((options = {}) => {
        const { preserveSelectedPackage = false } = options;
        setPendingTransId(null);
        setPaymentQrUrl(null);
        if (!preserveSelectedPackage) {
            setSelectedPackage(null);
        }
        localStorage.removeItem('pending_zalopay_trans_id');
        localStorage.removeItem('pending_zalopay_order_url');
        localStorage.removeItem('pending_zalopay_package');
        localStorage.removeItem('pending_zalopay_flow');
        localStorage.removeItem('pending_zalopay_started_at');
    }, []);

    const handleBuyPointPackage = async (pkg) => {
        if (!currentUserId || !token) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        const paymentPackage = {
            type: pkg.type || 'points',
            ...pkg,
        };
        const isVipPackage = paymentPackage.type === 'vip';

        setIsCreatingPayment(true);
        setPaymentStatus('creating');
        setPaymentCountdown(0);
        setPaymentMessage('Đang tạo mã thanh toán ZaloPay...');
        setPaymentLastCheck(null);
        setSelectedPackage(paymentPackage);
        setPaymentSuccessInfo(null);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/zalopay/payment`,
                {
                    userId: currentUserId,
                    amount: paymentPackage.amount,
                    points: isVipPackage ? 0 : paymentPackage.points,
                    orderType: isVipPackage ? 'vip' : 'points',
                    vipDays: isVipPackage ? paymentPackage.vipDays : undefined,
                    description: isVipPackage
                        ? `Mua ${paymentPackage.title || `VIP ${paymentPackage.vipDays} ngày`}`
                        : `Mua ${paymentPackage.points} điểm`,
                    redirectBaseUrl: `${window.location.origin}/settings`,
                },
                { headers: authHeaders }
            );

            if (response.data?.return_code === 1 && response.data?.order_url) {
                setPendingTransId(response.data.app_trans_id || null);
                setPaymentQrUrl(response.data.order_url);
                setPaymentMessage(isVipPackage
                    ? 'Mã QR đã sẵn sàng. Hệ thống sẽ tự kiểm tra và kích hoạt VIP sau khi thanh toán thành công.'
                    : 'Mã QR đã sẵn sàng. Hệ thống sẽ tự kiểm tra và cộng điểm sau khi thanh toán thành công.');
                setPaymentStatus('qr_ready');
                setPaymentCountdown(PAYMENT_QR_LIFETIME_SECONDS);
                localStorage.setItem('pending_zalopay_trans_id', response.data.app_trans_id || '');
                localStorage.setItem('pending_zalopay_order_url', response.data.order_url);
                localStorage.setItem('pending_zalopay_package', JSON.stringify(paymentPackage));
                localStorage.setItem('pending_zalopay_flow', isVipPackage ? 'vip_purchase' : 'points_history');
                localStorage.setItem('pending_zalopay_started_at', String(Date.now()));
                return;
            }

            setPaymentStatus('failure');
            setPaymentMessage(response.data?.return_message || 'Không thể tạo thanh toán ZaloPay.');
        } catch (error) {
            setPaymentStatus('failure');
            setPaymentMessage(error.response?.data?.return_message || 'Không thể tạo thanh toán ZaloPay.');
        } finally {
            setIsCreatingPayment(false);
        }
    };

    const checkPaymentStatus = useCallback(async (options = {}) => {
        const { expireIfPending = false, silentPending = false } = options;
        if (silentPending && paymentStatusCheckInFlightRef.current) return;

        const transId = pendingTransId || localStorage.getItem('pending_zalopay_trans_id');
        if (!transId || !currentUserId || !token) {
            setPaymentStatus('idle');
            setPaymentMessage('Không có giao dịch ZaloPay nào đang chờ.');
            return;
        }

        paymentStatusCheckInFlightRef.current = true;
        setIsCheckingPayment(true);
        if (!silentPending) {
            setPaymentStatus('checking');
        }
        try {
            const response = await axios.get(
                `${API_BASE_URL}/zalopay/order-status/${transId}`,
                { headers: authHeaders }
            );

            const data = response.data;
            setPaymentLastCheck({
                checkedAt: new Date().toLocaleTimeString('vi-VN'),
                code: data.raw_return_code ? `${data.return_code} (raw ${data.raw_return_code})` : (data.return_code ?? data.status ?? ''),
                message: data.return_message || data.message || 'Đã kiểm tra giao dịch.',
            });

            if (data.return_code === 1) {
                const savedPackage = selectedPackage || getStoredPaymentPackage();
                const isVipPayment = data.order_type === 'vip' || savedPackage?.type === 'vip';

                if (isVipPayment) {
                    const vipExpiresAt = data.vip_expires_at || null;
                    syncUserState({
                        ...(currentUser || {}),
                        ID_NguoiDung: currentUserId,
                        la_vip: 1,
                        ngay_het_han_vip: vipExpiresAt,
                        da_xac_thuc: isVerified ? 1 : 0,
                    });
                    setPaymentSuccessInfo({
                        type: 'vip',
                        vipDays: Number(data.vip_days || savedPackage?.vipDays || 0),
                        vipExpiresAt,
                    });
                    setPaymentStatus('success');
                    setPaymentMessage(
                        vipExpiresAt
                            ? `Thanh toán thành công. VIP đã được kích hoạt đến ${formatVipDate(vipExpiresAt)}.`
                            : 'Thanh toán thành công. VIP đã được kích hoạt.'
                    );
                    setPaymentCountdown(0);
                    clearPendingPaymentStorage({ preserveSelectedPackage: true });

                    try {
                        await loadLatestUser();
                    } catch (refreshError) {
                        console.warn('Không thể tải lại dữ liệu VIP sau khi thanh toán thành công:', refreshError);
                    }
                    return;
                }

                const pointsAdded = Number(data.points_added || 0);
                const newBalance = Number.isFinite(Number(data.new_balance))
                    ? Number(data.new_balance)
                    : Number(currentUser?.diem_so || 0);

                if (Number.isFinite(newBalance)) {
                    syncUserState({
                        ...(currentUser || {}),
                        ID_NguoiDung: currentUserId,
                        diem_so: newBalance,
                        da_xac_thuc: isVerified ? 1 : 0,
                    });
                }

                setPaymentSuccessInfo({
                    pointsAdded,
                    newBalance,
                    packagePoints: savedPackage?.points || 0,
                });
                setPaymentStatus('success');
                setPaymentMessage(
                    pointsAdded
                        ? `Thanh toán thành công. +${pointsAdded} điểm đã được cộng vào tài khoản.`
                        : 'Thanh toán thành công. Giao dịch đã được xử lý trước đó hoặc điểm đã được cộng.'
                );
                setPaymentCountdown(0);
                clearPendingPaymentStorage({ preserveSelectedPackage: true });

                try {
                    await loadPointData();
                } catch (refreshError) {
                    console.warn('Không thể tải lại dữ liệu điểm sau khi thanh toán thành công:', refreshError);
                }
                return;
            }

            if (data.return_code === 3) {
                setPaymentStatus('failure');
                setPaymentMessage(data.return_message || 'Thanh toán thất bại hoặc bị hủy.');
                setPaymentCountdown(0);
                clearPendingPaymentStorage({ preserveSelectedPackage: true });
                return;
            }

            if (expireIfPending) {
                setPaymentStatus('pending');
                setPaymentCountdown(0);
                setPaymentMessage('Đã hết thời gian QR hiển thị, nhưng hệ thống vẫn đang kiểm tra giao dịch. Nếu điện thoại đã báo thành công, vui lòng chờ thêm vài giây.');
                return;
            }

            setPaymentStatus('pending');
            if (!silentPending) {
                setPaymentMessage(data.return_message || 'Giao dịch đang được xử lý. Hệ thống sẽ tự động kiểm tra lại.');
            }
        } catch (error) {
            setPaymentLastCheck({
                checkedAt: new Date().toLocaleTimeString('vi-VN'),
                code: 'error',
                message: error.response?.data?.message || 'Không thể kiểm tra trạng thái thanh toán.',
            });

            if (expireIfPending) {
                setPaymentStatus('pending');
                setPaymentCountdown(0);
                setPaymentMessage('Tạm thời chưa kiểm tra được giao dịch, hệ thống sẽ tiếp tục thử lại.');
                return;
            }

            if (!silentPending) {
                setPaymentStatus('failure');
                setPaymentMessage(error.response?.data?.message || 'Không thể kiểm tra trạng thái thanh toán.');
            }
        } finally {
            paymentStatusCheckInFlightRef.current = false;
            setIsCheckingPayment(false);
        }
    }, [authHeaders, clearPendingPaymentStorage, currentUser, currentUserId, isVerified, loadPointData, pendingTransId, selectedPackage, syncUserState, token]);

    const handleOpenPaymentLink = useCallback(() => {
        if (!paymentQrUrl) return;

        const popup = window.open(paymentQrUrl, '_blank', 'noopener,noreferrer');
        if (popup) {
            popup.focus?.();
            return;
        }

        setPaymentMessage('Trình duyệt đang chặn tab thanh toán. Bạn có thể quét QR trực tiếp hoặc cho phép popup rồi thử lại.');
    }, [paymentQrUrl]);

    const handleCreatePaymentQr = useCallback(() => {
        if (!selectedPackage) {
            setPaymentMessage('Hãy chọn một gói điểm trước khi tạo mã QR.');
            return;
        }

        handleBuyPointPackage(selectedPackage);
    }, [handleBuyPointPackage, selectedPackage]);

    useEffect(() => {
        if (activeView === 'main' && currentUserId && token) {
            loadLatestUser().catch(() => {});
        }

        if (activeView === 'personal_info' && currentUserId && token) {
            loadLatestUser().catch(() => {});
        }

        if (activeView === 'points_history' && currentUserId && token) {
            loadPointData().catch(() => {});
        }

        if (activeView === 'vip_purchase' && currentUserId && token) {
            loadLatestUser().catch(() => {});
        }

        if (activeView === 'video_earn') {
            const todayKey = `watched_video_${new Date().toDateString()}`;
            setHasWatchedToday(localStorage.getItem(todayKey) === 'true');
            if (currentUserId && token) {
                loadLatestUser().catch(() => {});
            }
        }
    }, [activeView, currentUserId, loadLatestUser, loadPointData, token]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const returned = params.get('zalopay_return');
        const transId = params.get('app_trans_id');

        if (returned === '1') {
            setActiveView(getPaymentViewFromPackage());
            setHasReturnedFromZaloPay(true);
            setPaymentStatus('pending');
            setPaymentMessage('Đã quay lại từ ZaloPay. Hệ thống đang kiểm tra trạng thái thanh toán...');
            setPaymentCountdown(0);
            if (transId) {
                setPendingTransId(transId);
                localStorage.setItem('pending_zalopay_trans_id', transId);
            }

            const cleanUrl = `${window.location.origin}/settings`;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, []);

    useEffect(() => {
        if (!['points_history', 'vip_purchase'].includes(activeView) || !pendingTransId) return undefined;

        if (['qr_ready', 'pending', 'checking'].includes(paymentStatus) && paymentCountdown > 0) {
            const countdownTimer = setInterval(() => {
                setPaymentCountdown((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);

            return () => clearInterval(countdownTimer);
        }

        return undefined;
    }, [activeView, paymentCountdown, paymentStatus, pendingTransId]);

    useEffect(() => {
        if (!['points_history', 'vip_purchase'].includes(activeView) || !pendingTransId) return undefined;
        if (['qr_ready', 'pending', 'checking'].includes(paymentStatus) && paymentCountdown === 0 && !isCheckingPayment) {
            checkPaymentStatus({ expireIfPending: true, silentPending: true }).catch(() => {});
        }
        return undefined;
    }, [activeView, checkPaymentStatus, isCheckingPayment, paymentCountdown, paymentStatus, pendingTransId]);

    useEffect(() => {
        if (!['points_history', 'vip_purchase'].includes(activeView) || !pendingTransId) return undefined;
        if (!['qr_ready', 'pending', 'checking'].includes(paymentStatus)) return undefined;

        const pollTimer = setInterval(() => {
            checkPaymentStatus({ silentPending: true }).catch(() => {});
        }, PAYMENT_AUTO_POLL_INTERVAL_MS);

        return () => clearInterval(pollTimer);
    }, [activeView, checkPaymentStatus, isCheckingPayment, paymentCountdown, paymentStatus, pendingTransId]);

    useEffect(() => {
        if (!currentUserId || !token) return undefined;
        if (paymentStatus === 'success' || paymentStatus === 'failure') return undefined;

        const pollPendingPayment = () => {
            const storedTransId = localStorage.getItem('pending_zalopay_trans_id');
            if (!storedTransId) return;

            if (!pendingTransId) {
                setPendingTransId(storedTransId);
            }

            checkPaymentStatus({ silentPending: true }).catch(() => {});
        };

        pollPendingPayment();
        const pollTimer = window.setInterval(pollPendingPayment, PAYMENT_AUTO_POLL_INTERVAL_MS);

        return () => window.clearInterval(pollTimer);
    }, [checkPaymentStatus, currentUserId, pendingTransId, paymentStatus, token]);

    useEffect(() => {
        if (!pendingTransId || !['qr_ready', 'pending', 'checking'].includes(paymentStatus)) return undefined;

        const handleFocus = () => {
            setActiveView(getPaymentViewFromPackage());
            checkPaymentStatus({ silentPending: true }).catch(() => {});
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [checkPaymentStatus, paymentStatus, pendingTransId]);

    useEffect(() => {
        if (hasReturnedFromZaloPay && ['points_history', 'vip_purchase'].includes(activeView) && pendingTransId) {
            checkPaymentStatus({ silentPending: true }).catch(() => {});
            setHasReturnedFromZaloPay(false);
        }
    }, [activeView, checkPaymentStatus, hasReturnedFromZaloPay, pendingTransId]);

    useEffect(() => {
        if (paymentStatus === 'expired' && paymentQrUrl && !paymentMessage) {
            setPaymentMessage('Mã QR đã hết hạn. Hãy bấm "Tạo QR mới" để tạo lại mã thanh toán.');
        }
    }, [paymentMessage, paymentQrUrl, paymentStatus]);

    if (activeView === 'personal_info' && currentUser) {
        return (
            <div className="settings-page">
                <PersonalInfoView
                    user={currentUser}
                    onBack={() => setActiveView('main')}
                    onSave={handleSavePersonalInfo}
                    isSaving={isSavingProfile}
                    onDeleteAccount={handleDeleteAccount}
                    isDeleting={isDeletingAccount}
                />
            </div>
        );
    }

    if (activeView === 'points_history' && currentUser) {
        return (
            <div className="settings-page">
                <PointsHistoryView
                    user={currentUser}
                    onBack={() => setActiveView('main')}
                    pointHistory={pointHistory}
                    isLoading={isLoadingPoints}
                    error={pointError}
                    onRefresh={loadPointData}
                    onBuyPackage={handleBuyPointPackage}
                    onCreatePaymentQr={handleCreatePaymentQr}
                    paymentState={{
                        isCreatingPayment,
                        isCheckingPayment,
                        pendingTransId,
                        paymentQrUrl,
                        selectedPackage,
                        paymentMessage,
                        paymentStatus,
                        paymentCountdown,
                        paymentSuccessInfo,
                        paymentLastCheck,
                    }}
                    onOpenPaymentLink={handleOpenPaymentLink}
                />
            </div>
        );
    }

    if (activeView === 'vip_purchase' && currentUser) {
        return (
            <div className="settings-page">
                <VipPurchaseView
                    user={currentUser}
                    onBack={() => setActiveView('main')}
                    onBuyPackage={handleBuyPointPackage}
                    onCreatePaymentQr={handleCreatePaymentQr}
                    paymentState={{
                        isCreatingPayment,
                        isCheckingPayment,
                        pendingTransId,
                        paymentQrUrl,
                        selectedPackage,
                        paymentMessage,
                        paymentStatus,
                        paymentCountdown,
                        paymentSuccessInfo,
                        paymentLastCheck,
                    }}
                    onOpenPaymentLink={handleOpenPaymentLink}
                />
            </div>
        );
    }

    if (activeView === 'video_earn' && currentUser) {
        return (
            <div className="settings-page">
                <VideoEarnView
                    user={currentUser}
                    onBack={() => setActiveView('main')}
                    onEarnPoints={handleAwardVideoPoints}
                    isVerified={isVerified}
                    hasWatchedToday={hasWatchedToday}
                    isLoading={isAwardingPoints}
                    onGoVerify={() => setActiveView('verification')}
                />
            </div>
        );
    }

    if (activeView === 'change_password' && currentUser) {
        return (
            <div className="settings-page">
                <ChangePasswordView
                    onBack={() => setActiveView('main')}
                    onSubmit={handleChangePassword}
                    isSaving={isChangingPassword}
                />
            </div>
        );
    }

    if (activeView === 'verification' && currentUser) {
        return (
            <div className="settings-page">
                <VerificationView
                    onBack={() => setActiveView('main')}
                    onSubmit={handleVerificationUpload}
                    isSaving={isSubmittingVerification}
                    isVerified={isVerified}
                />
            </div>
        );
    }

    return (
        <div className="settings-shell">
            <SettingsSidebars user={currentUser} onNavigate={(path) => navigate(path)} />

            <div className="settings-page">
                <div className="settings-header">
                    <h1>Tài khoản</h1>
                </div>

                {currentUser ? (
                    <UserProfile
                        user={currentUser}
                        isVerified={isVerified}
                        onEdit={() => setActiveView('personal_info')}
                        onVerification={handleVerification}
                    />
                ) : (
                    <LoginPrompt
                        onLogin={() => navigate('/login')}
                        onRegister={() => navigate('/register')}
                    />
                )}

                {currentUser && <VipBanner user={currentUser} />}

                {currentUser && (
                    <SettingsSection title="Tài khoản">
                        <SettingsItem
                            icon={User}
                            label="Thông tin cá nhân"
                            iconColor="#3b82f6"
                            onClick={() => setActiveView('personal_info')}
                        />
                        <SettingsItem
                            icon={Star}
                            label="Tích điểm & Lịch sử"
                            iconColor="#FFD700"
                            onClick={() => setActiveView('points_history')}
                        />
                        <SettingsItem
                            icon={Crown}
                            label={isVipActive ? `VIP · Hết hạn ${vipExpiryText}` : 'Nâng cấp VIP'}
                            iconColor={isVipActive ? '#B8860B' : '#555'}
                            className={isVipActive ? 'settings-vip-item-active' : ''}
                            labelClassName={isVipActive ? 'settings-vip-item-label' : ''}
                            onClick={handleVipPress}
                        />
                        <SettingsItem
                            icon={Play}
                            label="Xem Video Kiếm Điểm"
                            iconColor="#ef4444"
                            onClick={() => setActiveView('video_earn')}
                        />
                        <SettingsItem
                            icon={Lock}
                            label="Đổi mật khẩu"
                            iconColor="#8b5cf6"
                            onClick={() => setActiveView('change_password')}
                        />
                        <SettingsItem
                            icon={ShieldCheck}
                            label="Xác minh tài khoản"
                            iconColor="#f59e0b"
                            onClick={() => setActiveView('verification')}
                        />
                    </SettingsSection>
                )}

                {currentUser && (
                    <button className="settings-logout-btn" onClick={handleLogout}>
                        <LogOut size={18} />
                        Đăng xuất
                    </button>
                )}
            </div>
        </div>
    );
}
