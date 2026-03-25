import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft } from 'lucide-react';

export default function PersonalInfoView({ user, onBack, onSave, isSaving, onDeleteAccount, isDeleting }) {
    const [formData, setFormData] = useState({
        ho_ten: user?.ho_ten || '',
        email: user?.email || '',
        vi_tri: user?.vi_tri || '',
        truong_hoc: user?.truong_hoc || user?.truong || ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.anh_dai_dien || 'https://i.pravatar.cc/150');
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeleteBox, setShowDeleteBox] = useState(false);
    const fileInputRef = useRef(null);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleChooseAvatar = () => fileInputRef.current?.click();

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    useEffect(() => {
        setFormData({
            ho_ten: user?.ho_ten || '',
            email: user?.email || '',
            vi_tri: user?.vi_tri || '',
            truong_hoc: user?.truong_hoc || user?.truong || ''
        });
        setAvatarFile(null);
        setAvatarPreview(user?.anh_dai_dien || 'https://i.pravatar.cc/150');
    }, [user]);

    return (
        <div className="settings-subview">
            <div className="settings-subview-header">
                <button className="settings-back-btn" onClick={onBack}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Thông tin cá nhân</h2>
                <div style={{ width: 24 }} />
            </div>

            <div className="settings-subview-content">
                <div className="settings-avatar-edit-lg">
                    <img src={avatarPreview} alt="Avatar" />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        hidden
                    />
                    <button className="settings-avatar-change-btn" type="button" onClick={handleChooseAvatar}>
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
                    <label>Trường học</label>
                    <input
                        name="truong_hoc"
                        value={formData.truong_hoc}
                        onChange={handleChange}
                        placeholder="Ví dụ: Đại học Bách Khoa"
                    />
                </div>
                <div className="settings-form-group">
                    <label>Vị trí</label>
                    <textarea
                        name="vi_tri"
                        value={formData.vi_tri}
                        onChange={handleChange}
                        placeholder="Nhập vị trí hoặc địa chỉ của bạn"
                        rows={3}
                    ></textarea>
                </div>

                <button className="settings-save-btn" onClick={() => onSave(formData, avatarFile)} disabled={isSaving}>
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>

                <div className="settings-danger-zone">
                    <h3>Xóa tài khoản</h3>
                    <p className="video-note">
                        Hành động này sẽ xóa vĩnh viễn dữ liệu tài khoản của bạn và không thể khôi phục.
                    </p>

                    {!showDeleteBox ? (
                        <button
                            type="button"
                            className="settings-delete-btn"
                            onClick={() => setShowDeleteBox(true)}
                        >
                            Tiếp tục xóa tài khoản
                        </button>
                    ) : (
                        <div className="settings-delete-box">
                            <div className="settings-form-group">
                                <label>Nhập mật khẩu để xác nhận xóa</label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Nhập mật khẩu hiện tại"
                                />
                            </div>
                            <div className="settings-delete-actions">
                                <button
                                    type="button"
                                    className="settings-cancel-btn"
                                    onClick={() => {
                                        setShowDeleteBox(false);
                                        setDeletePassword('');
                                    }}
                                    disabled={isDeleting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="settings-delete-btn"
                                    onClick={() => onDeleteAccount?.(deletePassword, setDeletePassword, setShowDeleteBox)}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
