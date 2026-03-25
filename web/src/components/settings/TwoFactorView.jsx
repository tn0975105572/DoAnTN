import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

export default function TwoFactorView({ enabled, onToggle, onBack }) {
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
                stream.getTracks().forEach((track) => track.stop());
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
