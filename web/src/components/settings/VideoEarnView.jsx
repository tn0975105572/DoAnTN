import { useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

export default function VideoEarnView({ user, onBack, onEarnPoints, isVerified, hasWatchedToday, isLoading, onGoVerify }) {
    const [isWatching, setIsWatching] = useState(false);
    const [hasCompletedVideo, setHasCompletedVideo] = useState(false);
    const [watchProgress, setWatchProgress] = useState(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const videoRef = useRef(null);
    const sampleVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

    const handleStartWatching = async () => {
        if (!isVerified || hasWatchedToday) return;
        setHasCompletedVideo(false);
        setWatchProgress(0);
        if (videoRef.current) {
            try {
                videoRef.current.currentTime = 0;
                await videoRef.current.play();
                setIsVideoPlaying(true);
            } catch (error) {
                console.error('Play video error:', error);
            }
        }
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        setWatchProgress((video.currentTime / video.duration) * 100);
    };

    const handleVideoEnded = () => {
        setIsVideoPlaying(false);
        setHasCompletedVideo(true);
        setWatchProgress(100);
    };

    const handleClaim = async () => {
        if (hasWatchedToday || isWatching || !isVerified || !hasCompletedVideo) return;
        setIsWatching(true);
        try {
            await onEarnPoints?.(100);
        } finally {
            setIsWatching(false);
        }
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
                            <span>+100 điểm / lượt</span>
                            <span>Phải xác thực tài khoản</span>
                            <span>Mỗi ngày 1 lần</span>
                        </div>
                    </div>
                    <div className="video-hero-right">
                        <div className="video-points-now">
                            <span>Điểm hiện tại</span>
                            <strong>{user?.diem_so || 0}</strong>
                        </div>
                    </div>
                </div>

                {!isVerified && (
                    <div className="video-task-card">
                        <div className="video-task-body">
                            <div className="video-task-header">
                                <div className="video-task-title">Tài khoản chưa xác thực</div>
                            </div>
                            <p className="video-task-desc">
                                Trên Android, người dùng phải xác thực tài khoản trước khi xem video nhận điểm. Web đang bám theo logic đó.
                            </p>
                            <button className="video-primary-btn" onClick={onGoVerify}>
                                Đi tới xác minh tài khoản
                            </button>
                        </div>
                    </div>
                )}

                <div className="video-task-card">
                    <div className="video-thumb-wrap settings-video-wrap">
                        <video
                            ref={videoRef}
                            className="settings-video-player"
                            src={sampleVideoUrl}
                            controls
                            preload="metadata"
                            onTimeUpdate={handleTimeUpdate}
                            onEnded={handleVideoEnded}
                            onPlay={() => setIsVideoPlaying(true)}
                            onPause={() => setIsVideoPlaying(false)}
                        />
                    </div>
                    <div className="video-task-body">
                        <div className="video-task-header">
                            <div className="video-task-title">Video quảng cáo sinh viên OLODO</div>
                            <span className="video-reward-pill">+100 điểm</span>
                        </div>
                        <p className="video-task-desc">
                            Luồng web đang bám hành vi Android: sau khi đủ điều kiện, hệ thống cộng điểm qua API lịch sử tích điểm
                            và đánh dấu đã xem trong ngày trên máy hiện tại.
                        </p>
                        <div className="video-note">
                            Tiến độ xem: {Math.round(watchProgress)}%
                        </div>
                        <div className="video-progress-bar" aria-hidden="true">
                            <div className="video-progress-fill" style={{ width: `${watchProgress}%` }} />
                        </div>
                        <div className="video-action-group">
                            <button
                                className={`video-primary-btn ${hasWatchedToday || !isVerified ? 'video-primary-btn-disabled' : ''}`}
                                onClick={handleStartWatching}
                                disabled={hasWatchedToday || !isVerified || isVideoPlaying}
                            >
                                {hasWatchedToday
                                    ? 'Bạn đã xem video hôm nay rồi'
                                    : isVideoPlaying
                                        ? 'Video đang phát...'
                                        : hasCompletedVideo
                                            ? 'Đã xem xong video'
                                            : 'Bắt đầu xem video'}
                            </button>
                            <button
                                className={`video-primary-btn ${hasWatchedToday || !isVerified || !hasCompletedVideo ? 'video-primary-btn-disabled' : ''}`}
                                onClick={handleClaim}
                                disabled={hasWatchedToday || !isVerified || isWatching || isLoading || !hasCompletedVideo}
                            >
                                {hasWatchedToday
                                    ? 'Bạn đã xem video hôm nay rồi'
                                    : isWatching
                                        ? 'Đang cộng điểm...'
                                        : 'Xem xong - Nhận 100 điểm'}
                            </button>
                        </div>
                        <div className="video-note">
                            {isVerified
                                ? 'Bạn phải phát video và xem hết trước khi nút cộng điểm được mở.'
                                : 'Bạn cần xác thực tài khoản trước khi nhận điểm từ video.'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
