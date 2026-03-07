import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Star, Play, Lock, QrCode, ShieldCheck,
    Globe, Moon, HelpCircle, LogOut, ChevronRight,
    Edit2, CheckCircle, ShieldAlert
} from 'lucide-react';
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
    const [currentUser, setCurrentUser] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            const userData = JSON.parse(savedUser);
            setCurrentUser(userData);
            setIsVerified(userData.da_xac_thuc === 1);
        }
    }, []);

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
                    onEdit={() => alert('Chức năng chỉnh sửa thông tin đang được phát triển.')}
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
                        onClick={() => alert('Chức năng đang được phát triển.')}
                    />
                    <SettingsItem
                        icon={Star}
                        label="Tích điểm & Lịch sử"
                        iconColor="#FFD700"
                        onClick={() => alert('Chức năng đang được phát triển.')}
                    />
                    <SettingsItem
                        icon={Play}
                        label="Xem Video Kiếm Điểm"
                        iconColor="#ef4444"
                        onClick={() => alert('Chức năng đang được phát triển.')}
                    />
                    <SettingsItem
                        icon={Lock}
                        label="Đổi mật khẩu"
                        iconColor="#8b5cf6"
                        onClick={() => alert('Chức năng đang được phát triển.')}
                    />
                    <SettingsItem
                        icon={QrCode}
                        label="Quét mã QR đăng nhập"
                        iconColor="#10b981"
                        onClick={() => alert('Chức năng đang được phát triển.')}
                    />
                    <SettingsItem
                        icon={ShieldCheck}
                        label="Xác thực 2 yếu tố"
                        iconColor="#f59e0b"
                        onClick={handleVerification}
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
