import { ChevronLeft, Play, RefreshCw, Smartphone, Star } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

function formatHistoryTime(value) {
    if (!value) return 'Không rõ thời gian';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function mapHistoryItem(item) {
    const points = Number(item?.diem_thay_doi || 0);
    const isUse = points < 0 || ['su_dung_diem', 'tru_diem'].includes(item?.loai_giao_dich);

    return {
        id: item?.ID_LichSu || item?.id || `${item?.thoi_gian_tao || ''}-${item?.mo_ta || ''}`,
        type: isUse ? 'use' : 'earn',
        points,
        title: item?.mo_ta || (isUse ? 'Sử dụng điểm' : 'Tích điểm'),
        time: formatHistoryTime(item?.thoi_gian_tao),
        description: item?.loai_giao_dich || 'Giao dịch điểm',
    };
}

const POINT_PACKAGES = [
    { points: 1000, amount: 20000, highlight: 'Phổ biến' },
    { points: 5000, amount: 90000, highlight: 'Tiết kiệm' },
    { points: 10000, amount: 150000, highlight: 'Tối ưu' },
];

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN').format(value);
}

function formatCountdown(value) {
    const totalSeconds = Math.max(0, Number(value) || 0);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

export default function PointsHistoryView({
    user,
    onBack,
    pointHistory = [],
    isLoading,
    error,
    onRefresh,
    onBuyPackage,
    onCreatePaymentQr,
    paymentState,
    onOpenPaymentLink,
}) {
    const currentPoints = user?.diem_so || 0;
    const normalizedHistory = pointHistory.map(mapHistoryItem);
    const {
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
    } = paymentState || {};
    const isQrExpired = paymentStatus === 'expired';
    const canCreateQr = Boolean(selectedPackage) && !isCreatingPayment;

    return (
        <div className="settings-subview">
            <div className="settings-subview-header">
                <button className="settings-back-btn" onClick={onBack}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Tích điểm & lịch sử</h2>
                <div style={{ width: 24 }} />
            </div>

            <div className="settings-subview-content">
                <div className="points-summary">
                    <div className="points-balance">
                        <div className="points-balance-label">Điểm hiện tại</div>
                        <div className="points-balance-value">
                            <Star size={20} fill="#FFD700" color="#FFD700" />
                            <span>{currentPoints}</span>
                        </div>
                        <div className="points-balance-sub">Tích điểm để đổi quà và ưu đãi dành riêng cho sinh viên.</div>
                    </div>

                    <div className="points-tier">
                        <div className="points-tier-left">
                            <div className="points-tier-label">Hạng thành viên</div>
                            <div className="points-tier-name">
                                {currentPoints >= 500 ? 'Gold' : currentPoints >= 200 ? 'Silver' : 'Starter'}
                            </div>
                            <div className="points-tier-progress-text">
                                Còn {Math.max(0, 200 - currentPoints)} điểm để lên hạng Silver
                            </div>
                        </div>
                        <div className="points-tier-right">
                            <div className="points-progress">
                                <div
                                    className="points-progress-fill"
                                    style={{ width: `${Math.min(100, (currentPoints / 200) * 100)}%` }}
                                />
                            </div>
                            <div className="points-progress-scale">
                                <span>0</span>
                                <span>200</span>
                                <span>500+</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="points-history">
                    <div className="zalopay-topup-card">
                        <div className="zalopay-topup-header">
                            <div>
                                <div className="zalopay-brand">Mua điểm bằng ZaloPay</div>
                                <p className="zalopay-subtitle">
                                    Tạo mã QR, mở app ZaloPay để quét và thanh toán. Sau đó hệ thống sẽ tự kiểm tra giao dịch và cộng điểm.
                                </p>
                            </div>
                            <div className="zalopay-badge">ZaloPay QR</div>
                        </div>

                        <div className="zalopay-package-grid">
                            {POINT_PACKAGES.map((pkg) => (
                                <button
                                    key={pkg.points}
                                    type="button"
                                    className={`zalopay-package ${selectedPackage?.points === pkg.points ? 'active' : ''}`}
                                    onClick={() => onBuyPackage?.(pkg)}
                                    disabled={isCreatingPayment}
                                >
                                    <span className="zalopay-package-tag">{pkg.highlight}</span>
                                    <strong>{formatCurrency(pkg.points)} điểm</strong>
                                    <span>{formatCurrency(pkg.amount)} VNĐ</span>
                                </button>
                            ))}
                        </div>

                        {paymentMessage && <div className={`video-note ${paymentStatus === 'success' ? 'zalopay-success-note' : ''}`}>{paymentMessage}</div>}

                        {paymentStatus === 'success' && paymentSuccessInfo && (
                            <div className="zalopay-success-card">
                                <div className="zalopay-success-badge">Thanh toán thành công</div>
                                <div className="zalopay-success-points">
                                    {paymentSuccessInfo.pointsAdded > 0
                                        ? `+${formatCurrency(paymentSuccessInfo.pointsAdded)} điểm`
                                        : 'Điểm đã được cộng'}
                                </div>
                                <div className="zalopay-success-balance">
                                    Số dư hiện tại: <strong>{formatCurrency(paymentSuccessInfo.newBalance)}</strong> điểm
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
                                            ? 'Mã cũ đã mờ và không còn được dùng tiếp. Hãy tạo lại QR mới để thanh toán.'
                                            : 'Mở ứng dụng ZaloPay trên điện thoại, chọn quét mã và thanh toán gói điểm đang chờ.'}
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
                                    <div className="video-note">
                                        {isQrExpired
                                            ? 'Hệ thống đã dừng kiểm tra mã cũ. Bấm nút bên dưới để tạo một QR mới.'
                                            : 'Hệ thống đang tự kiểm tra thanh toán và sẽ tự cộng điểm khi giao dịch hoàn tất.'}
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

                        {!paymentQrUrl && selectedPackage && paymentStatus !== 'success' && (
                            <div className="zalopay-pending-box">
                                <div>
                                    Gói đã chọn: <strong>{formatCurrency(selectedPackage.points)} điểm</strong>. Bấm nút để tạo mã QR mới.
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

                    <div className="points-history-header">
                        <h3>Lịch sử tích điểm</h3>
                        <span className="points-history-count">
                            {normalizedHistory.length} hoạt động gần đây
                        </span>
                    </div>

                    {onRefresh && (
                        <button className="settings-save-btn" type="button" onClick={onRefresh} disabled={isLoading}>
                            {isLoading ? 'Đang tải...' : <><RefreshCw size={16} /> Tải lại dữ liệu</>}
                        </button>
                    )}

                    {error && <div className="pw-error">{error}</div>}

                    {!isLoading && !normalizedHistory.length && !error && (
                        <div className="video-note">Chưa có lịch sử tích điểm nào.</div>
                    )}

                    <div className="points-history-list">
                        {normalizedHistory.map((item) => (
                            <div
                                key={item.id}
                                className={`points-history-item ${item.type === 'use' ? 'points-use' : 'points-earn'}`}
                            >
                                <div className="points-history-icon">
                                    {item.type === 'use' ? (
                                        <Play size={16} />
                                    ) : (
                                        <Star size={16} />
                                    )}
                                </div>
                                <div className="points-history-body">
                                    <div className="points-history-main">
                                        <div className="points-history-title">{item.title}</div>
                                        <div className="points-history-points">
                                            {item.type === 'use' ? '' : '+'}
                                            {item.points}
                                        </div>
                                    </div>
                                    <div className="points-history-meta">
                                        <span className="points-history-time">{item.time}</span>
                                        <span className="points-history-desc">{item.description}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
