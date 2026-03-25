import { useState } from 'react';
import { ChevronLeft, ShieldCheck, Upload } from 'lucide-react';

export default function VerificationView({ onBack, onSubmit, isSaving, isVerified }) {
    const [faceFile, setFaceFile] = useState(null);
    const [idFile, setIdFile] = useState(null);
    const [error, setError] = useState('');

    const facePreview = faceFile ? URL.createObjectURL(faceFile) : '';
    const idPreview = idFile ? URL.createObjectURL(idFile) : '';

    const handleUpload = () => {
        setError('');
        if (!faceFile || !idFile) {
            setError('Vui lòng chọn đủ ảnh khuôn mặt và ảnh CCCD.');
            return;
        }
        onSubmit?.({ faceFile, idFile, setError });
    };

    return (
        <div className="settings-subview">
            <div className="settings-subview-header">
                <button className="settings-back-btn" onClick={onBack}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Xác minh tài khoản</h2>
                <div style={{ width: 24 }} />
            </div>

            <div className="settings-subview-content">
                <div className="twofa-card">
                    <div className="twofa-header">
                        <div>
                            <div className="twofa-title">Xác thực CCCD + khuôn mặt</div>
                            <p className="twofa-sub">
                                Luồng web đang làm theo Android: tải ảnh khuôn mặt và ảnh CCCD lên backend, sau đó cập nhật `da_xac_thuc = 1`.
                            </p>
                        </div>
                        <span className={`twofa-status-pill ${isVerified ? 'on' : 'off'}`}>
                            {isVerified ? 'ĐÃ XÁC THỰC' : 'CHƯA XÁC THỰC'}
                        </span>
                    </div>

                    <div className="twofa-section">
                        <div className="twofa-section-title">Bước 1: Ảnh khuôn mặt</div>
                        <label className="settings-upload-card">
                            <input type="file" accept="image/*" hidden onChange={(e) => setFaceFile(e.target.files?.[0] || null)} />
                            {facePreview ? <img src={facePreview} alt="Ảnh khuôn mặt" className="settings-upload-preview" /> : <Upload size={22} />}
                            <span>{faceFile ? faceFile.name : 'Chọn ảnh khuôn mặt'}</span>
                        </label>
                    </div>

                    <div className="twofa-section">
                        <div className="twofa-section-title">Bước 2: Ảnh CCCD</div>
                        <label className="settings-upload-card">
                            <input type="file" accept="image/*" hidden onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
                            {idPreview ? <img src={idPreview} alt="Ảnh CCCD" className="settings-upload-preview" /> : <ShieldCheck size={22} />}
                            <span>{idFile ? idFile.name : 'Chọn ảnh CCCD'}</span>
                        </label>
                    </div>

                    {error && <div className="pw-error">{error}</div>}

                    <button className="settings-save-btn" onClick={handleUpload} disabled={isSaving || isVerified}>
                        {isVerified ? 'Tài khoản đã xác thực' : isSaving ? 'Đang tải lên...' : 'Tải ảnh xác minh'}
                    </button>
                </div>
            </div>
        </div>
    );
}
