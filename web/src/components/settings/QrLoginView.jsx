import { ChevronLeft } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function QrLoginView({ onBack }) {
    const demoCode = 'OL-QR-123-456';
    const demoUrl = `${window.location.origin}/login?session=${demoCode}`;

    return (
        <div className="settings-subview">
            <div className="settings-subview-header">
                <button className="settings-back-btn" onClick={onBack}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Quét mã QR đăng nhập</h2>
                <div style={{ width: 24 }} />
            </div>

            <div className="settings-subview-content">
                <div className="qr-card">
                    <div className="qr-left">
                        <div className="qr-title">Đăng nhập nhanh bằng ứng dụng OLODO</div>
                        <p className="qr-sub">
                            Mở app OLODO trên điện thoại, vào mục <strong>Quét mã QR</strong> và hướng camera vào mã bên phải
                            để đăng nhập nhanh trên trình duyệt này.
                        </p>
                        <ul className="qr-steps">
                            <li>1. Đăng nhập tài khoản của bạn trên app OLODO.</li>
                            <li>2. Chọn mục <strong>Đăng nhập web bằng QR</strong>.</li>
                            <li>3. Quét mã QR trên màn hình này và xác nhận trên điện thoại.</li>
                        </ul>
                        <div className="qr-code-text">
                            <span>Mã phiên demo:</span>
                            <code>{demoCode}</code>
                        </div>
                        <p className="qr-note">
                            Lưu ý: Đây là bản mô phỏng giao diện. Khi kết nối backend, mã QR sẽ được tạo động và xác thực thật.
                        </p>
                    </div>
                    <div className="qr-right">
                        <div className="qr-box">
                            <div className="qr-box-inner">
                                <QRCodeCanvas
                                    value={demoUrl}
                                    size={120}
                                    bgColor="#f9fafb"
                                    fgColor="#111827"
                                    includeMargin
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
