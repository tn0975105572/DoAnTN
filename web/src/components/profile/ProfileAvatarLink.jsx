import { useNavigate } from 'react-router-dom';
import './ProfileAvatarLink.css';

export default function ProfileAvatarLink({
    userId,
    children,
    className = '',
    stopPropagation = true,
    title = 'Mở trang cá nhân',
}) {
    const navigate = useNavigate();
    const canNavigate = Boolean(userId);

    const handleActivate = (event) => {
        if (!canNavigate) return;
        if (stopPropagation) {
            event.preventDefault();
            event.stopPropagation();
        }
        navigate(`/profile/${userId}`);
    };

    const handleKeyDown = (event) => {
        if (!canNavigate) return;
        if (event.key === 'Enter' || event.key === ' ') {
            handleActivate(event);
        }
    };

    return (
        <span
            role={canNavigate ? 'button' : undefined}
            tabIndex={canNavigate ? 0 : -1}
            className={`profile-avatar-link ${className}`.trim()}
            onClick={canNavigate ? handleActivate : undefined}
            onKeyDown={canNavigate ? handleKeyDown : undefined}
            aria-label={canNavigate ? title : undefined}
        >
            {children}
        </span>
    );
}
