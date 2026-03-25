import { User } from 'lucide-react';

export default function LoginPrompt({ onLogin, onRegister }) {
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
