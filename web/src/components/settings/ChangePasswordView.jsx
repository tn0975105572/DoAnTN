import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

export default function ChangePasswordView({ onBack, onSubmit, isSaving }) {
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

        onSubmit?.(form, setError);
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

                    <button type="submit" className="settings-save-btn" disabled={isSaving}>
                        {isSaving ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
                    </button>
                </form>
            </div>
        </div>
    );
}
