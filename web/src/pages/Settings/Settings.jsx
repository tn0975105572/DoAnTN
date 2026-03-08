import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Star, Play, Lock, QrCode, ShieldCheck,
    Globe, Moon, HelpCircle, LogOut, ChevronRight,
    Edit2, CheckCircle, ShieldAlert, ChevronLeft, Camera
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import './Settings.css';

/* ════════ SUB-COMPONENTS ════════ */

/* Login Prompt — khi chưa đăng nhập */
function LoginPrompt({ onLogin, onRegister }) {
    return (
        <div className="settings-login-prompt">
            <div className="settings-login-prompt-icon">
                <User size={28} />
            </div>
            <h3>Trải nghiệm tốt hơn!</h3>
            <p>Đăng nhập để lưu các cài đặt và thông tin cá nhân của bạn.</p>
            <div className="settings-login-buttons">
                <button className="settings-btn-login" onClick={onLogin}>Đăng nhập</button>
                <button className="settings-btn-register" onClick={onRegister}>Đăng ký</button>
            </div>
        </div>
    );
}

/* ════════ PERSONAL INFO VIEW ════════ */
function PersonalInfoView({ user, onBack, onSave }) {
    const [formData, setFormData] = useState({
        ho_ten: user?.ho_ten || '',
        email: user?.email || '',
        so_dien_thoai: user?.so_dien_thoai || '',
        dia_chi: user?.dia_chi || '',
        ngay_sinh: user?.ngay_sinh || '',
        truong: user?.truong || ''
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return (
        <div className="settings-subview">
            <div className="settings-subview-header">
                <button className="settings-back-btn" onClick={onBack}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Thông tin cá nhân</h2>
                <div style={{ width: 24 }} /> {/* Spacer to center title */}
            </div>

            <div className="settings-subview-content">
                <div className="settings-avatar-edit-lg">
                    <img src={user?.anh_dai_dien || 'https://i.pravatar.cc/150'} alt="Avatar" />
                    <button className="settings-avatar-change-btn">
                        <Camera size={16} />
                        Thay đổi ảnh
                    </button>
                </div>

                <div className="settings-form-group">
                    <label>Họ và tên</label>
                    <input name="ho_ten" value={formData.ho_ten} onChange={handleChange} placeholder="Nhập họ và tên" />
                </div>
                <div className="settings-form-group">
                    <label>Email</label>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Nhập email" disabled />
                    <span className="settings-input-hint">Email không thể thay đổi</span>
                </div>
                <div className="settings-form-group">
                    <label>Số điện thoại</label>
                    <input name="so_dien_thoai" value={formData.so_dien_thoai} onChange={handleChange} placeholder="Nhập số điện thoại" />
                </div>
                <div className="settings-form-group">
                    <label>Ngày sinh</label>
                    <input name="ngay_sinh" type="date" value={formData.ngay_sinh} onChange={handleChange} />
                </div>
                <div className="settings-form-group">
                    <label>Trường học</label>
                    <input name="truong" value={formData.truong} onChange={handleChange} placeholder="Ví dụ: Đại học Bách Khoa" />
                </div>
                <div className="settings-form-group">
                    <label>Địa chỉ</label>
                    <textarea name="dia_chi" value={formData.dia_chi} onChange={handleChange} placeholder="Nhập địa chỉ của bạn" rows={3}></textarea>
                </div>

                <button className="settings-save-btn" onClick={() => onSave(formData)}>
                    Lưu thay đổi
                </button>
            </div>
        </div>
    );
}

/* ════════ POINTS & HISTORY VIEW ════════ */
const MOCK_POINT_HISTORY = [
    {
        id: 1,
        type: 'earn',
        points: 50,
        title: 'Xem video kiếm điểm',
        time: 'Hôm nay · 10:45',
        description: 'Hoàn thành nhiệm vụ xem video quảng cáo 30 giây.',
    },
    {
        id: 2,
        type: 'earn',
        points: 20,
        title: 'Điểm thưởng đăng ký',
        time: 'Hôm qua · 21:10',
        description: 'Nhận điểm khi tạo tài khoản OLODO lần đầu.',
    },
    {
        id: 3,
        type: 'use',
        points: -30,
        title: 'Đổi ưu đãi vận chuyển',
        time: '2 ngày trước · 15:20',
        description: 'Sử dụng điểm để giảm phí vận chuyển đơn hàng.',
    },
];

function PointsHistoryView({ user, onBack }) {
    const currentPoints = user?.diem_so || 0;

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
                    <div className="points-history-header">
                        <h3>Lịch sử tích điểm</h3>
                        <span className="points-history-count">
                            {MOCK_POINT_HISTORY.length} hoạt động gần đây
                        </span>
                    </div>

                    <div className="points-history-list">
                        {MOCK_POINT_HISTORY.map((item) => (
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
                                            {item.points}đ
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

/* ════════ VIDEO EARN POINTS VIEW ════════ */
function VideoEarnView({ user, onBack, onEarnPoints }) {
    const [hasClaimed, setHasClaimed] = useState(false);

    const handleClaim = () => {
        if (hasClaimed) return;
        onEarnPoints?.(30);
        setHasClaimed(true);
    };

    return (
        <div className="settings-subview">
            <div className="settings-subview-header">
                <button className="settings-back-btn" onClick={onBack}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Video kiếm điểm</h2>
                <div style={{ width: 24 }} />
            </div>

            <div className="settings-subview-content">
                <div className="video-hero-card">
                    <div className="video-hero-left">
                        <div className="video-hero-title">Xem video để nhận điểm thưởng</div>
                        <div className="video-hero-sub">
                            Hoàn thành nhiệm vụ xem video quảng cáo để tích thêm điểm cho tài khoản OLODO của bạn.
                        </div>
                        <div className="video-hero-meta">
                            <span>+30 điểm / lượt</span>
                            <span>~30 giây</span>
                            <span>Tối đa 3 lần/ngày (demo)</span>
                        </div>
                    </div>
                    <div className="video-hero-right">
                        <div className="video-points-now">
                            <span>Điểm hiện tại</span>
                            <strong>{user?.diem_so || 0}</strong>
                        </div>
                    </div>
                </div>

                <div className="video-task-card">
                    <div className="video-thumb-wrap">
                        <div className="video-thumb">
                            <div className="video-thumb-play">
                                <Play size={26} />
                            </div>
                        </div>
                    </div>
                    <div className="video-task-body">
                        <div className="video-task-header">
                            <div className="video-task-title">Video quảng cáo sinh viên OLODO</div>
                            <span className="video-reward-pill">+30 điểm</span>
                        </div>
                        <p className="video-task-desc">
                            Đây là phiên bản demo. Khi tích hợp backend, hệ thống sẽ kiểm tra thời lượng xem video thực tế
                            trước khi cộng điểm vào tài khoản của bạn.
                        </p>
                        <button
                            className={`video-primary-btn ${hasClaimed ? 'video-primary-btn-disabled' : ''}`}
                            onClick={handleClaim}
                            disabled={hasClaimed}
                        >
                            {hasClaimed ? 'Bạn đã nhận điểm cho lượt xem này' : 'Xem xong – Nhận điểm'}
                        </button>
                        <div className="video-note">
                            Lưu ý: Tính năng đang ở chế độ mô phỏng trên web. Điểm được lưu vào tài khoản cục bộ của bạn.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ════════ CHANGE PASSWORD VIEW ════════ */
function ChangePasswordView({ onBack }) {
    const [form, setForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
            setError('Vui lòng điền đầy đủ các trường.');
            return;
        }
        if (form.newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        if (form.newPassword !== form.confirmPassword) {
            setError('Xác nhận mật khẩu không khớp.');
            return;
        }

        alert('Đổi mật khẩu thành công (mô phỏng). Khi có backend, màn hình này sẽ gọi API để đổi mật khẩu thực tế.');
        onBack();
    };

    return (
        <div className="settings-subview">
            <div className="settings-subview-header">
                <button className="settings-back-btn" onClick={onBack}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Đổi mật khẩu</h2>
                <div style={{ width: 24 }} />
            </div>

            <div className="settings-subview-content">
                <form className="pw-form" onSubmit={handleSubmit}>
                    <p className="pw-hint">
                        Để đảm bảo an toàn, hãy sử dụng mật khẩu khó đoán, kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.
                    </p>

                    <div className="settings-form-group">
                        <label>Mật khẩu hiện tại</label>
                        <input
                            type="password"
                            name="currentPassword"
                            value={form.currentPassword}
                            onChange={handleChange}
                            placeholder="Nhập mật khẩu đang dùng"
                        />
                    </div>

                    <div className="settings-form-group">
                        <label>Mật khẩu mới</label>
                        <input
                            type="password"
                            name="newPassword"
                            value={form.newPassword}
                            onChange={handleChange}
                            placeholder="Nhập mật khẩu mới"
                        />
                    </div>

                    <div className="settings-form-group">
                        <label>Nhập lại mật khẩu mới</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="Nhập lại mật khẩu mới"
                        />
                    </div>

                    {error && <div className="pw-error">{error}</div>}

                    <button type="submit" className="settings-save-btn">
                        Xác nhận đổi mật khẩu
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ════════ QR LOGIN VIEW ════════ */
function QrLoginView({ onBack }) {
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

/* ════════ TWO FACTOR AUTH VIEW ════════ */
function TwoFactorView({ enabled, onToggle, onBack }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [cameraOn, setCameraOn] = useState(false);
    const [hasCaptured, setHasCaptured] = useState(false);
    const [cameraError, setCameraError] = useState('');

    useEffect(() => {
        if (!cameraOn || !navigator.mediaDevices?.getUserMedia) return;

        let stream;
        setCameraError('');

        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((mediaStream) => {
                stream = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play().catch(() => {});
                }
            })
            .catch(() => {
                setCameraError('Không truy cập được camera. Vui lòng kiểm tra quyền truy cập hoặc thử trình duyệt khác.');
            });

        return () => {
            if (stream) {
                stream.getTracks().forEach((t) => t.stop());
            }
        };
    }, [cameraOn]);

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, width, height);

        setHasCaptured(true);

        if (!enabled) {
            onToggle();
        }
    };

    return (
        <div className="settings-subview">
            <div className="settings-subview-header">
                <button className="settings-back-btn" onClick={onBack}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Xác thực 2 yếu tố (2FA)</h2>
                <div style={{ width: 24 }} />
            </div>

            <div className="settings-subview-content">
                <div className="twofa-card">
                    <div className="twofa-header">
                        <div>
                            <div className="twofa-title">Bảo vệ tài khoản tốt hơn</div>
                            <p className="twofa-sub">
                                Khi bật 2FA, ngoài mật khẩu bạn sẽ cần nhập thêm mã dùng một lần khi đăng nhập trên thiết bị lạ.
                            </p>
                        </div>
                        <span className={`twofa-status-pill ${enabled ? 'on' : 'off'}`}>
                            {enabled ? 'ĐÃ BẬT' : 'CHƯA BẬT'}
                        </span>
                    </div>

                    <div className="twofa-switch-row">
                        <div className="twofa-switch-text">
                            <div className="twofa-switch-title">Bật / tắt xác thực 2 yếu tố</div>
                            <p>Khuyến nghị nên bật để tăng mức độ an toàn cho tài khoản OLODO của bạn.</p>
                        </div>
                        <button
                            type="button"
                            className={`twofa-switch-btn ${enabled ? 'on' : 'off'}`}
                            onClick={onToggle}
                        >
                            <span className="twofa-switch-knob" />
                        </button>
                    </div>

                    <div className="twofa-section">
                        <div className="twofa-section-title">Cách hoạt động</div>
                        <ul className="twofa-steps">
                            <li>1. Đăng nhập bằng email và mật khẩu như bình thường.</li>
                            <li>2. Hệ thống yêu cầu bạn nhập mã 6 số từ ứng dụng hoặc SMS.</li>
                            <li>3. Sau khi mã hợp lệ, bạn mới hoàn tất đăng nhập.</li>
                        </ul>
                    </div>

                    <div className="twofa-section">
                        <div className="twofa-section-title">Xác thực CCCD + khuôn mặt (demo)</div>
                        <p className="twofa-backup-note">
                            Hệ thống sẽ dùng camera để chụp ảnh thẻ CCCD và khuôn mặt của bạn. Ảnh chỉ được xử lý và lưu trên
                            thiết bị này trong bản demo, không gửi lên server.
                        </p>

                        <div className="twofa-camera">
                            <div className="twofa-preview">
                                {cameraOn ? (
                                    <video ref={videoRef} className="twofa-video" autoPlay playsInline />
                                ) : (
                                    <div className="twofa-video-placeholder">
                                        Cho phép truy cập camera để bắt đầu chụp ảnh xác thực.
                                    </div>
                                )}
                                <div className="twofa-face-frame" />
                            </div>
                            <canvas
                                ref={canvasRef}
                                className={`twofa-canvas ${hasCaptured ? 'visible' : ''}`}
                            />
                        </div>

                        <div className="twofa-camera-actions">
                            <button
                                type="button"
                                className="twofa-btn"
                                onClick={() => setCameraOn(true)}
                            >
                                Mở camera
                            </button>
                            <button
                                type="button"
                                className="twofa-btn twofa-btn-primary"
                                onClick={handleCapture}
                                disabled={!cameraOn}
                            >
                                Chụp ảnh xác thực
                            </button>
                        </div>

                        {cameraError && <div className="twofa-error">{cameraError}</div>}
                        {hasCaptured && !cameraError && (
                            <div className="twofa-success">
                                Đã chụp ảnh CCCD + khuôn mặt (demo). Xác thực 2 bước đã được bật cho tài khoản này.
                            </div>
                        )}
                    </div>

                    <div className="twofa-section">
                        <div className="twofa-section-title">Mã dự phòng (demo)</div>
                        <p className="twofa-backup-note">
                            Lưu lại các mã này ở nơi an toàn. Dùng khi bạn mất điện thoại hoặc không nhận được mã.
                        </p>
                        <div className="twofa-backup-list">
                            <code>OL-92KD-1A</code>
                            <code>OL-7BQP-3F</code>
                            <code>OL-5XZT-9M</code>
                        </div>
                    </div>

                    <p className="twofa-footnote">
                        Đây là giao diện mô phỏng. Khi có backend, việc kiểm tra ảnh CCCD + khuôn mặt, gửi mã SMS/app và xác
                        thực đăng nhập sẽ được xử lý qua API bảo mật.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* User Profile Card */
function UserProfile({ user, isVerified, onEdit, onVerification }) {
    return (
        <div className="settings-profile-card">
            <div className="settings-avatar-wrap">
                <img
                    className={`settings-avatar ${isVerified ? 'verified' : 'unverified'}`}
                    src={user.anh_dai_dien || 'https://i.pravatar.cc/150'}
                    alt={user.ho_ten}
                />
                <button className="settings-avatar-edit" onClick={onEdit}>
                    <Edit2 size={13} />
                </button>
            </div>

            <div className="settings-profile-info">
                <div className="settings-profile-name">{user.ho_ten || 'Người dùng'}</div>
                <div className="settings-profile-email">{user.email || 'Không có email'}</div>
                <div className="settings-profile-points">
                    <Star size={15} fill="#FFD700" color="#FFD700" />
                    {user.diem_so || 0} điểm
                </div>
            </div>

            <div className="settings-profile-actions">
                <button
                    className={`settings-verification ${isVerified ? 'verified' : 'unverified'}`}
                    onClick={onVerification}
                >
                    {isVerified ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
                    {isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                    {!isVerified && <ChevronRight size={14} />}
                </button>
                <button className="settings-edit-btn" onClick={onEdit}>
                    <Edit2 size={16} />
                </button>
            </div>
        </div>
    );
}

/* Settings Section */
function SettingsSection({ title, children }) {
    return (
        <div className="settings-section">
            <div className="settings-section-title">{title}</div>
            <div className="settings-section-body">{children}</div>
        </div>
    );
}

/* Settings Item */
function SettingsItem({ icon: Icon, label, isSwitch, switchValue, onSwitchChange, onClick, iconColor }) {
    return (
        <button className="settings-item" onClick={isSwitch ? undefined : onClick} style={isSwitch ? { cursor: 'default' } : {}}>
            <span className="settings-item-icon" style={iconColor ? { background: iconColor + '15', color: iconColor } : {}}>
                <Icon size={18} />
            </span>
            <span className="settings-item-label">{label}</span>
            {isSwitch ? (
                <button
                    className={`settings-switch ${switchValue ? 'on' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onSwitchChange?.(); }}
                >
                    <span className="settings-switch-knob" />
                </button>
            ) : (
                <ChevronRight size={18} className="settings-item-chevron" />
            )}
        </button>
    );
}

/* ════════ MAIN PAGE ════════ */
export default function Settings() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isVerified, setIsVerified] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved).da_xac_thuc === 1 : false;
    });
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
        const saved = localStorage.getItem('twoFactorEnabled');
        return saved === 'true';
    });
    const [activeView, setActiveView] = useState('main'); // 'main' | 'personal_info' | 'points_history' | 'video_earn' | 'change_password' | 'qr_login' | 'two_factor'

    const handleLogout = () => {
        if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentUser(null);
            setIsVerified(false);
        }
    };

    const handleVerification = () => {
        if (isVerified) {
            alert('Tài khoản của bạn đã được xác thực thành công với CCCD gắn chip.');
        } else {
            alert('Xác thực CCCD giúp bảo vệ tài khoản của bạn. Chức năng đang được phát triển.');
        }
    };

    const handleSavePersonalInfo = (data) => {
        // Mock save implementation
        const updatedUser = { ...currentUser, ...data };
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Cập nhật thông tin thành công!');
        setActiveView('main');
    };

    const handleEarnPointsFromVideo = (amount) => {
        if (!currentUser) return;
        const updatedUser = {
            ...currentUser,
            diem_so: (currentUser.diem_so || 0) + amount,
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert(`Bạn đã nhận thêm ${amount} điểm!`);
    };

    const handleToggleTwoFactor = () => {
        const next = !twoFactorEnabled;
        setTwoFactorEnabled(next);
        localStorage.setItem('twoFactorEnabled', String(next));
        alert(
            next
                ? 'Đã bật xác thực 2 yếu tố (mô phỏng). Từ giờ khi có backend, bạn sẽ cần thêm mã 6 số khi đăng nhập.'
                : 'Đã tắt xác thực 2 yếu tố cho tài khoản này (mô phỏng).'
        );
    };

    if (activeView === 'personal_info' && currentUser) {
        return (
            <div className="settings-page">
                <PersonalInfoView
                    user={currentUser}
                    onBack={() => setActiveView('main')}
                    onSave={handleSavePersonalInfo}
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
                    onEarnPoints={handleEarnPointsFromVideo}
                />
            </div>
        );
    }

    if (activeView === 'change_password' && currentUser) {
        return (
            <div className="settings-page">
                <ChangePasswordView
                    onBack={() => setActiveView('main')}
                />
            </div>
        );
    }

    if (activeView === 'qr_login' && currentUser) {
        return (
            <div className="settings-page">
                <QrLoginView
                    onBack={() => setActiveView('main')}
                />
            </div>
        );
    }

    if (activeView === 'two_factor' && currentUser) {
        return (
            <div className="settings-page">
                <TwoFactorView
                    enabled={twoFactorEnabled}
                    onToggle={handleToggleTwoFactor}
                    onBack={() => setActiveView('main')}
                />
            </div>
        );
    }

    return (
        <div className="settings-page">

            {/* Header */}
            <div className="settings-header">
                <h1>Tài khoản</h1>
            </div>

            {/* Profile or Login Prompt */}
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

            {/* Account Settings — chỉ hiện khi đã đăng nhập */}
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
                        icon={QrCode}
                        label="Quét mã QR đăng nhập"
                        iconColor="#10b981"
                        onClick={() => setActiveView('qr_login')}
                    />
                    <SettingsItem
                        icon={ShieldCheck}
                        label="Xác thực 2 yếu tố"
                        iconColor="#f59e0b"
                        onClick={() => setActiveView('two_factor')}
                    />
                </SettingsSection>
            )}

            {/* General Settings — luôn hiện */}
            <SettingsSection title="Cài đặt chung">
                <SettingsItem
                    icon={Globe}
                    label="Ngôn ngữ"
                    iconColor="#3b82f6"
                    onClick={() => alert('Chức năng Ngôn ngữ đang được phát triển.')}
                />
                <SettingsItem
                    icon={Moon}
                    label="Chế độ tối"
                    iconColor="#8b5cf6"
                    isSwitch
                    switchValue={isDarkMode}
                    onSwitchChange={() => setIsDarkMode(!isDarkMode)}
                />
                <SettingsItem
                    icon={HelpCircle}
                    label="Hỗ trợ & Góp ý"
                    iconColor="#10b981"
                    onClick={() => alert('Chức năng Hỗ trợ đang được phát triển.')}
                />
            </SettingsSection>

            {/* Logout — chỉ hiện khi đã đăng nhập */}
            {currentUser && (
                <button className="settings-logout-btn" onClick={handleLogout}>
                    <LogOut size={18} />
                    Đăng xuất
                </button>
            )}
        </div>
    );
}
