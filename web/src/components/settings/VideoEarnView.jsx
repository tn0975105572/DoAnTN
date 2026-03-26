import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Lock, PlayCircle, X } from 'lucide-react';

const REWARD_POINTS = 100;
const MINIMUM_CLOSE_DELAY_SECONDS = 5;
const SEEK_TOLERANCE_SECONDS = 1;

export default function VideoEarnView({ user, onBack, onEarnPoints, isVerified, hasWatchedToday, isLoading, onGoVerify }) {
    const [isClaimingReward, setIsClaimingReward] = useState(false);
    const [hasCompletedVideo, setHasCompletedVideo] = useState(false);
    const [watchProgress, setWatchProgress] = useState(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [canClosePlayer, setCanClosePlayer] = useState(false);
    const [closeCountdown, setCloseCountdown] = useState(MINIMUM_CLOSE_DELAY_SECONDS);
    const [playerSessionKey, setPlayerSessionKey] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const videoRef = useRef(null);
    const lastAllowedTimeRef = useRef(0);
    const isSyncingTimeRef = useRef(false);
    const hasHandledEndingRef = useRef(false);
    const sampleVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

    const hidePlayer = () => {
        const video = videoRef.current;
        if (video) {
            video.pause();
            video.currentTime = 0;
        }

        setIsPlayerOpen(false);
        setIsVideoPlaying(false);
        setCanClosePlayer(false);
        setCloseCountdown(MINIMUM_CLOSE_DELAY_SECONDS);
        lastAllowedTimeRef.current = 0;
        isSyncingTimeRef.current = false;
        hasHandledEndingRef.current = false;
    };

    const resetIncompleteWatch = (message) => {
        setHasCompletedVideo(false);
        setWatchProgress(0);
        setStatusMessage(message);
        hidePlayer();
    };

    const handleStartWatching = () => {
        if (!isVerified) {
            onGoVerify?.();
            return;
        }

        if (hasWatchedToday || isLoading || isClaimingReward || isPlayerOpen) return;

        setStatusMessage('');
        setHasCompletedVideo(false);
        setWatchProgress(0);
        setIsVideoPlaying(false);
        setCanClosePlayer(false);
        setCloseCountdown(MINIMUM_CLOSE_DELAY_SECONDS);
        lastAllowedTimeRef.current = 0;
        isSyncingTimeRef.current = false;
        hasHandledEndingRef.current = false;
        setPlayerSessionKey((prev) => prev + 1);
        setIsPlayerOpen(true);
    };

    const handleClosePlayer = () => {
        if (!canClosePlayer || isClaimingReward) return;

        if (!hasCompletedVideo) {
            resetIncompleteWatch('Bạn đã thoát sớm nên lượt xem này không được cộng điểm. Hãy xem lại từ đầu để nhận thưởng.');
            return;
        }

        hidePlayer();
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || !video.duration) return;

        lastAllowedTimeRef.current = Math.max(lastAllowedTimeRef.current, video.currentTime);
        setWatchProgress((lastAllowedTimeRef.current / video.duration) * 100);
    };

    const handleSeeking = () => {
        const video = videoRef.current;
        if (!video || isSyncingTimeRef.current) return;

        if (Math.abs(video.currentTime - lastAllowedTimeRef.current) <= SEEK_TOLERANCE_SECONDS) {
            return;
        }

        isSyncingTimeRef.current = true;
        video.currentTime = lastAllowedTimeRef.current;
        video.play().catch(() => {});

        window.setTimeout(() => {
            isSyncingTimeRef.current = false;
        }, 0);
    };

    const handleVideoEnded = async () => {
        if (hasHandledEndingRef.current) return;

        hasHandledEndingRef.current = true;
        setIsVideoPlaying(false);
        setHasCompletedVideo(true);
        setWatchProgress(100);
        setCanClosePlayer(true);
        setCloseCountdown(0);
        setStatusMessage('');
        setIsClaimingReward(true);

        try {
            const didAward = await onEarnPoints?.(REWARD_POINTS);
            if (didAward === false) {
                resetIncompleteWatch('Video đã chạy hết nhưng chưa cộng được điểm. Hãy xem lại từ đầu để thử lại.');
                return;
            }

            setStatusMessage('Bạn đã xem hết video và nhận đủ 100 điểm thưởng.');
            hidePlayer();
        } catch (error) {
            console.error('Award video points error:', error);
            resetIncompleteWatch('Video đã chạy hết nhưng chưa cộng được điểm. Hãy xem lại từ đầu để thử lại.');
        } finally {
            setIsClaimingReward(false);
        }
    };

    useEffect(() => {
        if (!isPlayerOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const video = videoRef.current;
        if (video) {
            video.currentTime = 0;
            video.play().catch((error) => {
                console.error('Play video error:', error);
                setStatusMessage('Không thể phát video. Vui lòng thử lại.');
                setCanClosePlayer(true);
                setCloseCountdown(0);
            });
        }

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isPlayerOpen, playerSessionKey]);

    useEffect(() => {
        if (!isPlayerOpen || canClosePlayer) return undefined;

        const countdownTimer = window.setInterval(() => {
            setCloseCountdown((prev) => {
                if (prev <= 1) {
                    window.clearInterval(countdownTimer);
                    setCanClosePlayer(true);
                    return 0;
                }

                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(countdownTimer);
    }, [canClosePlayer, isPlayerOpen]);

    useEffect(() => {
        if (!isPlayerOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && canClosePlayer && !isClaimingReward) {
                event.preventDefault();

                if (!hasCompletedVideo) {
                    const video = videoRef.current;
                    if (video) {
                        video.pause();
                        video.currentTime = 0;
                    }

                    setHasCompletedVideo(false);
                    setWatchProgress(0);
                    setStatusMessage('Bạn đã thoát sớm nên lượt xem này không được cộng điểm. Hãy xem lại từ đầu để nhận thưởng.');
                    setIsPlayerOpen(false);
                    setIsVideoPlaying(false);
                    setCanClosePlayer(false);
                    setCloseCountdown(MINIMUM_CLOSE_DELAY_SECONDS);
                    lastAllowedTimeRef.current = 0;
                    isSyncingTimeRef.current = false;
                    hasHandledEndingRef.current = false;
                    return;
                }

                const video = videoRef.current;
                if (video) {
                    video.pause();
                    video.currentTime = 0;
                }

                setIsPlayerOpen(false);
                setIsVideoPlaying(false);
                setCanClosePlayer(false);
                setCloseCountdown(MINIMUM_CLOSE_DELAY_SECONDS);
                lastAllowedTimeRef.current = 0;
                isSyncingTimeRef.current = false;
                hasHandledEndingRef.current = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canClosePlayer, hasCompletedVideo, isClaimingReward, isPlayerOpen]);

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
                                Tài khoản chưa xác thực sẽ không thể mở video kiếm điểm. Hãy xác thực trước rồi quay lại xem video.
                            </p>
                            <button className="video-primary-btn" onClick={onGoVerify}>
                                Đi tới xác minh tài khoản
                            </button>
                        </div>
                    </div>
                )}

                <div className="video-task-card">
                    <div className={`video-thumb-wrap settings-video-preview ${!isVerified ? 'settings-video-preview-locked' : ''}`}>
                        <div className="settings-video-poster">
                            <div className="settings-video-poster-badge">
                                {isVerified ? (
                                    <>
                                        <PlayCircle size={16} />
                                        <span>Video thưởng 100 điểm</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock size={16} />
                                        <span>Đang khóa</span>
                                    </>
                                )}
                            </div>
                            <div className="settings-video-poster-center">
                                {isVerified ? <PlayCircle size={48} /> : <Lock size={48} />}
                                <strong>
                                    {isVerified
                                        ? 'Video sẽ mở gần toàn màn hình'
                                        : 'Xác thực tài khoản để mở video'}
                                </strong>
                                <span>
                                    {isVerified
                                        ? 'Không có thanh tua. Chỉ xem hết video mới được cộng điểm.'
                                        : 'Người chưa xác thực sẽ không xem được video và không thể nhận điểm.'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="video-task-body">
                        <div className="video-task-header">
                            <div className="video-task-title">Video quảng cáo sinh viên OLODO</div>
                            <span className="video-reward-pill">+100 điểm</span>
                        </div>
                        <p className="video-task-desc">
                            Video sẽ được mở trong trình phát lớn gần toàn màn hình. Hệ thống không cho tua, không tính điểm nếu thoát sớm,
                            và chỉ cộng điểm khi video chạy hết.
                        </p>
                        <div className="video-note">
                            Tiến độ hợp lệ: {Math.round(watchProgress)}%
                        </div>
                        <div className="video-progress-bar" aria-hidden="true">
                            <div className="video-progress-fill" style={{ width: `${watchProgress}%` }} />
                        </div>
                        <div className="video-action-group">
                            <button
                                className={`video-primary-btn ${hasWatchedToday || isLoading || isClaimingReward || isPlayerOpen ? 'video-primary-btn-disabled' : ''}`}
                                onClick={handleStartWatching}
                                disabled={hasWatchedToday || isLoading || isClaimingReward || isPlayerOpen}
                            >
                                {hasWatchedToday
                                    ? 'Bạn đã xem video hôm nay rồi'
                                    : !isVerified
                                        ? 'Xác thực để xem video'
                                        : isPlayerOpen || isVideoPlaying
                                            ? 'Video đang phát...'
                                            : isClaimingReward || isLoading
                                                ? 'Đang cộng điểm...'
                                                : 'Bắt đầu xem video'}
                            </button>
                        </div>
                        <div className="video-note">
                            {hasWatchedToday
                                ? 'Bạn đã hoàn tất lượt xem hôm nay và không thể xem thêm.'
                                : !isVerified
                                    ? 'Hãy xác thực tài khoản trước khi bắt đầu xem video.'
                                    : 'Bạn chỉ có thể đóng video sau 5 giây, nhưng thoát trước khi xem hết sẽ không được cộng điểm.'}
                        </div>
                        {!!statusMessage && <div className="video-note video-note-strong">{statusMessage}</div>}
                    </div>
                </div>
            </div>

            {isPlayerOpen && (
                <div className="video-player-overlay" role="dialog" aria-modal="true" aria-labelledby="video-player-title">
                    <div className="video-player-dialog">
                        <div className="video-player-topbar">
                            <div>
                                <div className="video-player-title" id="video-player-title">
                                    Xem hết video để nhận {REWARD_POINTS} điểm
                                </div>
                                <div className="video-player-subtitle">
                                    {isClaimingReward
                                        ? 'Video đã hoàn tất. Hệ thống đang cộng điểm cho bạn.'
                                        : 'Không thể tua video. Thoát sớm sẽ không được cộng điểm.'}
                                </div>
                            </div>
                            <button
                                className="video-player-close-btn"
                                onClick={handleClosePlayer}
                                disabled={!canClosePlayer || isClaimingReward}
                            >
                                <span>
                                    {isClaimingReward
                                        ? 'Đang cộng điểm...'
                                        : canClosePlayer
                                            ? 'Đóng video'
                                            : `Thoát sau ${closeCountdown}s`}
                                </span>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="video-player-stage">
                            <div className="video-player-frame">
                                <video
                                    key={playerSessionKey}
                                    ref={videoRef}
                                    className="video-player-element"
                                    src={sampleVideoUrl}
                                    preload="auto"
                                    autoPlay
                                    playsInline
                                    controls={false}
                                    disablePictureInPicture
                                    controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
                                    onContextMenu={(event) => event.preventDefault()}
                                    onTimeUpdate={handleTimeUpdate}
                                    onSeeking={handleSeeking}
                                    onEnded={handleVideoEnded}
                                    onPlay={() => setIsVideoPlaying(true)}
                                    onPause={() => setIsVideoPlaying(false)}
                                />
                            </div>
                        </div>

                        <div className="video-player-bottom">
                            <div className="video-player-meta">
                                <span>{Math.round(watchProgress)}% đã xem</span>
                                <span>
                                    {canClosePlayer
                                        ? 'Bạn có thể đóng, nhưng chỉ xem hết mới được cộng điểm.'
                                        : `Nút đóng sẽ mở sau ${closeCountdown} giây`}
                                </span>
                            </div>
                            <div className="video-progress-bar" aria-hidden="true">
                                <div className="video-progress-fill" style={{ width: `${watchProgress}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
