import { CheckCircle, ChevronRight, Edit2, ShieldAlert, Star } from 'lucide-react';

export default function UserProfile({ user, isVerified, onEdit, onVerification }) {
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
