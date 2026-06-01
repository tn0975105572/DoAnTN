import { CheckCircle, ChevronRight, Crown, Edit2, ShieldAlert, Star } from 'lucide-react';

function isActiveVip(user) {
    if (Number(user?.la_vip || 0) !== 1 || !user?.ngay_het_han_vip) return false;
    return new Date(user.ngay_het_han_vip).getTime() > Date.now();
}

export default function UserProfile({ user, isVerified, onEdit, onVerification }) {
    const isVip = isActiveVip(user);

    return (
        <div className={`settings-profile-card ${isVip ? 'vip' : ''}`}>
            <div className="settings-avatar-wrap">
                <img
                    className={`settings-avatar ${isVip ? 'vip' : isVerified ? 'verified' : 'unverified'}`}
                    src={user.anh_dai_dien || 'https://i.pravatar.cc/150'}
                    alt={user.ho_ten}
                />
                <button className="settings-avatar-edit" onClick={onEdit}>
                    <Edit2 size={13} />
                </button>
            </div>

            <div className="settings-profile-info">
                <div className="settings-profile-name-row">
                    <div className="settings-profile-name">{user.ho_ten || 'Người dùng'}</div>
                    {isVip && (
                        <span className="settings-vip-badge">
                            <Crown size={12} />
                            VIP
                        </span>
                    )}
                </div>
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
