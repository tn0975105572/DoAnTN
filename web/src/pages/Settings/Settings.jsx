import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, LogOut, Play, ShieldCheck, Star, User } from 'lucide-react';
import {
    ChangePasswordView,
    LoginPrompt,
    PersonalInfoView,
    PointsHistoryView,
    SettingsItem,
    SettingsSection,
    UserProfile,
    VerificationView,
    VideoEarnView
} from '../../components/settings';
import { API_BASE_URL } from '../../constants';
import { clearAuthSession, updateStoredUser, useAuthSession } from '../../utils/authSession';
import './Settings.css';

const PAYMENT_QR_LIFETIME_SECONDS = 180;
const PAYMENT_AUTO_POLL_INTERVAL_MS = 8000;
const SETTINGS_BACKEND_ORIGIN = (() => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        return 'http://localhost:3000';
    }
})();

function getStoredPaymentCountdown() {
    const pendingTransId = localStorage.getItem('pending_zalopay_trans_id');
    if (!pendingTransId) return 0;

    const startedAt = Number(localStorage.getItem('pending_zalopay_started_at') || 0);
    if (!startedAt) return PAYMENT_QR_LIFETIME_SECONDS;

    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, PAYMENT_QR_LIFETIME_SECONDS - elapsedSeconds);
}

function getStoredPaymentStatus() {
    const pendingTransId = localStorage.getItem('pending_zalopay_trans_id');
    if (!pendingTransId) return 'idle';

    return getStoredPaymentCountdown() > 0 ? 'qr_ready' : 'expired';
}

function normalizeSettingsUploadsUrl(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw;

    if (!raw.startsWith('http')) {
        const cleanPath = raw.startsWith('/uploads/') ? raw : `/uploads/${raw.replace(/^\/+/, '')}`;
        return `${SETTINGS_BACKEND_ORIGIN}${cleanPath}`;
    }

    try {
        const url = new URL(raw);
        if (url.pathname.startsWith('/uploads/')) {
            return `${SETTINGS_BACKEND_ORIGIN}${url.pathname}`;
        }
        return raw.replace(/^http:\/\/(?!localhost)[\d.]+:(\d+)/, 'http://localhost:$1');
    } catch {
        return raw.replace(/^http:\/\/(?!localhost)[\d.]+:(\d+)/, 'http://localhost:$1');
    }
}

function normalizeSettingsUser(userData) {
    if (!userData || typeof userData !== 'object') return userData;

    return {
        ...userData,
        anh_dai_dien: normalizeSettingsUploadsUrl(userData.anh_dai_dien),
    };
}

export default function Settings() {
    const navigate = useNavigate();
    const { token, userId: authUserId, user: authUser } = useAuthSession();
    const [currentUser, setCurrentUser] = useState(() => {
        return authUser ? normalizeSettingsUser(authUser) : null;
    });
    const [isVerified, setIsVerified] = useState(() => {
        return authUser ? authUser.da_xac_thuc === 1 : false;
    });
    const [activeView, setActiveView] = useState('main');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [pointHistory, setPointHistory] = useState([]);
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);
    const [pointError, setPointError] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
    const [hasWatchedToday, setHasWatchedToday] = useState(false);
    const [isAwardingPoints, setIsAwardingPoints] = useState(false);
    const [isCreatingPayment, setIsCreatingPayment] = useState(false);
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);
    const [pendingTransId, setPendingTransId] = useState(() => localStorage.getItem('pending_zalopay_trans_id'));
    const [paymentQrUrl, setPaymentQrUrl] = useState(() => localStorage.getItem('pending_zalopay_order_url'));
    const [selectedPackage, setSelectedPackage] = useState(() => {
        const saved = localStorage.getItem('pending_zalopay_package');
        return saved ? JSON.parse(saved) : null;
    });
    const [paymentMessage, setPaymentMessage] = useState('');
    const [paymentStatus, setPaymentStatus] = useState(getStoredPaymentStatus);
    const [paymentCountdown, setPaymentCountdown] = useState(getStoredPaymentCountdown);
    const [paymentSuccessInfo, setPaymentSuccessInfo] = useState(null);
    const [hasReturnedFromZaloPay, setHasReturnedFromZaloPay] = useState(false);

    const authHeaders = useMemo(
        () => (token ? { Authorization: `Bearer ${token}` } : {}),
        [token]
    );
    const currentUserId = currentUser?.ID_NguoiDung || authUserId;

    useEffect(() => {
        setCurrentUser(authUser ? normalizeSettingsUser(authUser) : null);
        setIsVerified(authUser?.da_xac_thuc === 1);
    }, [authUser]);

    const syncUserState = useCallback((userData) => {
        const normalizedUser = normalizeSettingsUser(userData);

        setCurrentUser(normalizedUser);
        setIsVerified(normalizedUser?.da_xac_thuc === 1);
        updateStoredUser(normalizedUser);
    }, []);

    const loadLatestUser = useCallback(async () => {
        if (!currentUserId || !token) return null;

        const response = await axios.get(`${API_BASE_URL}/nguoidung/get/${currentUserId}`, {
            headers: authHeaders,
        });

        const userData = response.data?.user || response.data;
        syncUserState(userData);
        return userData;
    }, [authHeaders, currentUserId, syncUserState, token]);

    const loadPointData = useCallback(async () => {
        if (!currentUserId || !token) return;

        setIsLoadingPoints(true);
        setPointError('');

        try {
            const [userResponse, historyResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/nguoidung/get/${currentUserId}`, {
                    headers: authHeaders,
                }),
                axios.get(`${API_BASE_URL}/lich_su_tich_diem/getByUserId/${currentUserId}?limit=20`, {
                    headers: authHeaders,
                }),
            ]);

            syncUserState(userResponse.data?.user || userResponse.data);
            setPointHistory(Array.isArray(historyResponse.data) ? historyResponse.data : []);
        } catch (error) {
            setPointError(error.response?.data?.message || 'Không thể tải dữ liệu tích điểm.');
        } finally {
            setIsLoadingPoints(false);
        }
    }, [authHeaders, currentUserId, syncUserState, token]);

    const handleLogout = () => {
        if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?')) {
            clearAuthSession(['cart', 'preferences', 'session', 'notifications']);
            setCurrentUser(null);
            setIsVerified(false);
        }
    };

    const handleVerification = () => setActiveView('verification');

    const handleSavePersonalInfo = async (data, avatarFile) => {
        if (!currentUserId || !token) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        setIsSavingProfile(true);

        try {
            let avatarUrl = currentUser?.anh_dai_dien || '';

            if (avatarFile) {
                const formData = new FormData();
                formData.append('avatar', avatarFile);

                const uploadResponse = await axios.post(`${API_BASE_URL}/upload`, formData, {
                    headers: {
                        ...authHeaders,
                        'Content-Type': 'multipart/form-data',
                    },
                });

                avatarUrl = uploadResponse.data?.imageUrl || avatarUrl;
            }

            const updatePayload = {
                ho_ten: data.ho_ten,
                truong_hoc: data.truong_hoc,
                vi_tri: data.vi_tri,
                anh_dai_dien: avatarUrl,
            };

            const updateResponse = await axios.put(
                `${API_BASE_URL}/nguoidung/update/${currentUserId}`,
                updatePayload,
                { headers: authHeaders }
            );

            const updatedUser = updateResponse.data?.user || { ...currentUser, ...updatePayload };
            syncUserState(updatedUser);
            alert('Cập nhật thông tin cá nhân thành công!');
            setActiveView('main');
        } catch (error) {
            alert(error.response?.data?.message || 'Không thể cập nhật thông tin cá nhân.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleDeleteAccount = async (password, resetPassword, closeBox) => {
        if (!password?.trim()) {
            alert('Vui lòng nhập mật khẩu để xác nhận xóa.');
            return;
        }

        if (!currentUserId || !token) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        setIsDeletingAccount(true);

        try {
            const response = await axios.delete(`${API_BASE_URL}/nguoidung/delete/${currentUserId}`, {
                headers: authHeaders,
                data: { mat_khau: password.trim() },
            });

            if (response.data?.success) {
                clearAuthSession(['cart', 'preferences', 'session', 'notifications']);
                resetPassword('');
                closeBox(false);
                alert('Xóa tài khoản thành công!');
                navigate('/login');
                return;
            }

            alert(response.data?.message || 'Không thể xóa tài khoản.');
        } catch (error) {
            alert(error.response?.data?.message || 'Không thể xóa tài khoản.');
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const handleChangePassword = async (form, setError) => {
        if (!currentUserId || !token) {
            setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        setIsChangingPassword(true);
        try {
            await axios.put(
                `${API_BASE_URL}/nguoidung/update/${currentUserId}`,
                {
                    mat_khau_cu: form.currentPassword,
                    mat_khau: form.newPassword,
                },
                { headers: authHeaders }
            );
            alert('Đã cập nhật mật khẩu mới.');
            setActiveView('main');
        } catch (error) {
            setError(error.response?.data?.message || 'Không thể cập nhật mật khẩu.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleVerificationUpload = async ({ faceFile, idFile, setError }) => {
        if (!currentUserId || !token) {
            setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        setIsSubmittingVerification(true);
        try {
            const formData = new FormData();
            formData.append('anh_khuon_mat', faceFile);
            formData.append('anh_cmnd', idFile);

            await axios.post(`${API_BASE_URL}/xacthuc/${currentUserId}`, formData, {
                headers: {
                    ...authHeaders,
                    'Content-Type': 'multipart/form-data',
                },
            });

            await axios.put(
                `${API_BASE_URL}/nguoidung/update/${currentUserId}`,
                { da_xac_thuc: 1 },
                { headers: authHeaders }
            );

            const refreshedUser = await loadLatestUser();
            syncUserState({ ...refreshedUser, da_xac_thuc: 1 });
            alert('Xác minh tài khoản thành công!');
            setActiveView('main');
        } catch (error) {
            setError(error.response?.data?.message || 'Không thể tải ảnh xác minh lên.');
        } finally {
            setIsSubmittingVerification(false);
        }
    };

    const handleAwardVideoPoints = async (points = 100) => {
        if (!currentUserId || !token) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return false;
        }

        if (!isVerified) {
            setActiveView('verification');
            return false;
        }

        const todayKey = `watched_video_${new Date().toDateString()}`;
        if (localStorage.getItem(todayKey)) {
            setHasWatchedToday(true);
            alert('Bạn đã xem video hôm nay rồi!');
            return false;
        }

        setIsAwardingPoints(true);
        try {
            await axios.post(
                `${API_BASE_URL}/lich_su_tich_diem/addPoints`,
                {
                    userId: currentUserId,
                    pointChange: points,
                    transactionType: 'tang_diem',
                    description: 'Xem video quảng cáo',
                    referenceId: null,
                },
                { headers: authHeaders }
            );

            localStorage.setItem(todayKey, 'true');
            setHasWatchedToday(true);
            await Promise.all([loadLatestUser(), loadPointData()]);
            alert(`Bạn đã nhận được ${points} điểm!`);
            return true;
        } catch (error) {
            alert(error.response?.data?.message || 'Không thể cộng điểm từ video.');
            return false;
        } finally {
            setIsAwardingPoints(false);
        }
    };

    const clearPendingPaymentStorage = useCallback((options = {}) => {
        const { preserveSelectedPackage = false } = options;
        setPendingTransId(null);
        setPaymentQrUrl(null);
        if (!preserveSelectedPackage) {
            setSelectedPackage(null);
        }
        localStorage.removeItem('pending_zalopay_trans_id');
        localStorage.removeItem('pending_zalopay_order_url');
        localStorage.removeItem('pending_zalopay_package');
        localStorage.removeItem('pending_zalopay_started_at');
    }, []);

    const handleBuyPointPackage = async (pkg) => {
        if (!currentUserId || !token) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        setIsCreatingPayment(true);
        setPaymentStatus('creating');
        setPaymentCountdown(0);
        setPaymentMessage('Đang tạo mã thanh toán ZaloPay...');
        setSelectedPackage(pkg);
        setPaymentSuccessInfo(null);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/zalopay/payment`,
                {
                    userId: currentUserId,
                    amount: pkg.amount,
                    points: pkg.points,
                    description: `Mua ${pkg.points} điểm`,
                    redirectBaseUrl: `${window.location.origin}/settings`,
                },
                { headers: authHeaders }
            );

            if (response.data?.return_code === 1 && response.data?.order_url) {
                setPendingTransId(response.data.app_trans_id || null);
                setPaymentQrUrl(response.data.order_url);
                setPaymentMessage('Mã QR đã sẵn sàng. Hệ thống sẽ tự kiểm tra và cộng điểm sau khi thanh toán thành công.');
                setPaymentStatus('qr_ready');
                setPaymentCountdown(PAYMENT_QR_LIFETIME_SECONDS);
                localStorage.setItem('pending_zalopay_trans_id', response.data.app_trans_id || '');
                localStorage.setItem('pending_zalopay_order_url', response.data.order_url);
                localStorage.setItem('pending_zalopay_package', JSON.stringify(pkg));
                localStorage.setItem('pending_zalopay_started_at', String(Date.now()));
                return;
            }

            setPaymentStatus('failure');
            setPaymentMessage(response.data?.return_message || 'Không thể tạo thanh toán ZaloPay.');
        } catch (error) {
            setPaymentStatus('failure');
            setPaymentMessage(error.response?.data?.return_message || 'Không thể tạo thanh toán ZaloPay.');
        } finally {
            setIsCreatingPayment(false);
        }
    };

    const checkPaymentStatus = useCallback(async (options = {}) => {
        const { expireIfPending = false, silentPending = false } = options;
        const transId = pendingTransId || localStorage.getItem('pending_zalopay_trans_id');
        if (!transId || !currentUserId || !token) {
            setPaymentStatus('idle');
            setPaymentMessage('Không có giao dịch ZaloPay nào đang chờ.');
            return;
        }

        setIsCheckingPayment(true);
        setPaymentStatus('checking');
        try {
            const response = await axios.get(
                `${API_BASE_URL}/zalopay/order-status/${transId}`,
                { headers: authHeaders }
            );

            const data = response.data;
            if (data.return_code === 1) {
                const savedPackage = selectedPackage || JSON.parse(localStorage.getItem('pending_zalopay_package') || 'null');
                const pointsAdded = Number(data.points_added || 0);
                const newBalance = Number.isFinite(Number(data.new_balance))
                    ? Number(data.new_balance)
                    : Number(currentUser?.diem_so || 0);

                if (Number.isFinite(newBalance)) {
                    syncUserState({
                        ...(currentUser || {}),
                        ID_NguoiDung: currentUserId,
                        diem_so: newBalance,
                        da_xac_thuc: isVerified ? 1 : 0,
                    });
                }

                setPaymentSuccessInfo({
                    pointsAdded,
                    newBalance,
                    packagePoints: savedPackage?.points || 0,
                });
                setPaymentStatus('success');
                setPaymentMessage(
                    pointsAdded
                        ? `Thanh toán thành công. +${pointsAdded} điểm đã được cộng vào tài khoản.`
                        : 'Thanh toán thành công. Giao dịch đã được xử lý trước đó hoặc điểm đã được cộng.'
                );
                setPaymentCountdown(0);
                clearPendingPaymentStorage({ preserveSelectedPackage: true });

                try {
                    await loadPointData();
                } catch (refreshError) {
                    console.warn('Không thể tải lại dữ liệu điểm sau khi thanh toán thành công:', refreshError);
                }
                return;
            }

            if (data.return_code === 3) {
                setPaymentStatus('failure');
                setPaymentMessage(data.return_message || 'Thanh toán thất bại hoặc bị hủy.');
                setPaymentCountdown(0);
                clearPendingPaymentStorage({ preserveSelectedPackage: true });
                return;
            }

            if (expireIfPending) {
                setPaymentStatus('expired');
                setPaymentCountdown(0);
                setPaymentMessage('Mã QR đã hết hạn. Hãy bấm "Tạo QR mới" để tạo lại mã thanh toán.');
                return;
            }

            setPaymentStatus('pending');
            if (!silentPending) {
                setPaymentMessage(data.return_message || 'Giao dịch đang được xử lý. Hệ thống sẽ tự động kiểm tra lại.');
            }
        } catch (error) {
            if (expireIfPending) {
                setPaymentStatus('expired');
                setPaymentCountdown(0);
                setPaymentMessage('Mã QR đã hết hạn. Hãy bấm "Tạo QR mới" để tạo lại mã thanh toán.');
                return;
            }

            setPaymentStatus('failure');
            setPaymentMessage(error.response?.data?.message || 'Không thể kiểm tra trạng thái thanh toán.');
        } finally {
            setIsCheckingPayment(false);
        }
    }, [authHeaders, clearPendingPaymentStorage, currentUser, currentUserId, isVerified, loadPointData, pendingTransId, selectedPackage, syncUserState, token]);

    const handleOpenPaymentLink = useCallback(() => {
        if (!paymentQrUrl) return;

        const popup = window.open(paymentQrUrl, '_blank', 'noopener,noreferrer');
        if (popup) {
            popup.focus?.();
            return;
        }

        setPaymentMessage('Trình duyệt đang chặn tab thanh toán. Bạn có thể quét QR trực tiếp hoặc cho phép popup rồi thử lại.');
    }, [paymentQrUrl]);

    const handleCreatePaymentQr = useCallback(() => {
        if (!selectedPackage) {
            setPaymentMessage('Hãy chọn một gói điểm trước khi tạo mã QR.');
            return;
        }

        handleBuyPointPackage(selectedPackage);
    }, [handleBuyPointPackage, selectedPackage]);

    useEffect(() => {
        if (activeView === 'personal_info' && currentUserId && token) {
            loadLatestUser().catch(() => {});
        }

        if (activeView === 'points_history' && currentUserId && token) {
            loadPointData().catch(() => {});
        }

        if (activeView === 'video_earn') {
            const todayKey = `watched_video_${new Date().toDateString()}`;
            setHasWatchedToday(localStorage.getItem(todayKey) === 'true');
            if (currentUserId && token) {
                loadLatestUser().catch(() => {});
            }
        }
    }, [activeView, currentUserId, loadLatestUser, loadPointData, token]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const returned = params.get('zalopay_return');
        const transId = params.get('app_trans_id');

        if (returned === '1') {
            setActiveView('points_history');
            setHasReturnedFromZaloPay(true);
            setPaymentStatus('pending');
            setPaymentMessage('Đã quay lại từ ZaloPay. Hệ thống đang kiểm tra trạng thái thanh toán...');
            setPaymentCountdown(0);
            if (transId) {
                setPendingTransId(transId);
                localStorage.setItem('pending_zalopay_trans_id', transId);
            }

            const cleanUrl = `${window.location.origin}/settings`;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, []);

    useEffect(() => {
        if (activeView !== 'points_history' || !pendingTransId) return undefined;

        if ((paymentStatus === 'qr_ready' || paymentStatus === 'pending') && paymentCountdown > 0) {
            const countdownTimer = setInterval(() => {
                setPaymentCountdown((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);

            return () => clearInterval(countdownTimer);
        }

        return undefined;
    }, [activeView, paymentCountdown, paymentStatus, pendingTransId]);

    useEffect(() => {
        if (activeView !== 'points_history' || !pendingTransId) return undefined;
        if ((paymentStatus === 'qr_ready' || paymentStatus === 'pending') && paymentCountdown === 0 && !isCheckingPayment) {
            checkPaymentStatus({ expireIfPending: true, silentPending: true }).catch(() => {});
        }
        return undefined;
    }, [activeView, checkPaymentStatus, isCheckingPayment, paymentCountdown, paymentStatus, pendingTransId]);

    useEffect(() => {
        if (activeView !== 'points_history' || !pendingTransId) return undefined;
        if (!['qr_ready', 'pending'].includes(paymentStatus) || paymentCountdown <= 0) return undefined;

        const pollTimer = setInterval(() => {
            if (!isCheckingPayment) {
                checkPaymentStatus({ silentPending: true }).catch(() => {});
            }
        }, PAYMENT_AUTO_POLL_INTERVAL_MS);

        return () => clearInterval(pollTimer);
    }, [activeView, checkPaymentStatus, isCheckingPayment, paymentCountdown, paymentStatus, pendingTransId]);

    useEffect(() => {
        if (!pendingTransId || !['qr_ready', 'pending'].includes(paymentStatus)) return undefined;

        const handleFocus = () => {
            setActiveView('points_history');
            checkPaymentStatus({ silentPending: true }).catch(() => {});
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [checkPaymentStatus, paymentStatus, pendingTransId]);

    useEffect(() => {
        if (hasReturnedFromZaloPay && activeView === 'points_history' && pendingTransId) {
            checkPaymentStatus({ silentPending: true }).catch(() => {});
            setHasReturnedFromZaloPay(false);
        }
    }, [activeView, checkPaymentStatus, hasReturnedFromZaloPay, pendingTransId]);

    useEffect(() => {
        if (paymentStatus === 'expired' && paymentQrUrl && !paymentMessage) {
            setPaymentMessage('Mã QR đã hết hạn. Hãy bấm "Tạo QR mới" để tạo lại mã thanh toán.');
        }
    }, [paymentMessage, paymentQrUrl, paymentStatus]);

    if (activeView === 'personal_info' && currentUser) {
        return (
            <div className="settings-page">
                <PersonalInfoView
                    user={currentUser}
                    onBack={() => setActiveView('main')}
                    onSave={handleSavePersonalInfo}
                    isSaving={isSavingProfile}
                    onDeleteAccount={handleDeleteAccount}
                    isDeleting={isDeletingAccount}
                />
            </div>
        );
    }

    if (activeView === 'points_history' && currentUser) {
        return (
            <div className="settings-page">
                <PointsHistoryView
                    user={currentUser}
                    onBack={() => setActiveView('main')}
                    pointHistory={pointHistory}
                    isLoading={isLoadingPoints}
                    error={pointError}
                    onRefresh={loadPointData}
                    onBuyPackage={handleBuyPointPackage}
                    onCreatePaymentQr={handleCreatePaymentQr}
                    paymentState={{
                        isCreatingPayment,
                        isCheckingPayment,
                        pendingTransId,
                        paymentQrUrl,
                        selectedPackage,
                        paymentMessage,
                        paymentStatus,
                        paymentCountdown,
                        paymentSuccessInfo,
                    }}
                    onOpenPaymentLink={handleOpenPaymentLink}
                />
            </div>
        );
    }

    if (activeView === 'video_earn' && currentUser) {
        return (
            <div className="settings-page">
                <VideoEarnView
                    user={currentUser}
                    onBack={() => setActiveView('main')}
                    onEarnPoints={handleAwardVideoPoints}
                    isVerified={isVerified}
                    hasWatchedToday={hasWatchedToday}
                    isLoading={isAwardingPoints}
                    onGoVerify={() => setActiveView('verification')}
                />
            </div>
        );
    }

    if (activeView === 'change_password' && currentUser) {
        return (
            <div className="settings-page">
                <ChangePasswordView
                    onBack={() => setActiveView('main')}
                    onSubmit={handleChangePassword}
                    isSaving={isChangingPassword}
                />
            </div>
        );
    }

    if (activeView === 'verification' && currentUser) {
        return (
            <div className="settings-page">
                <VerificationView
                    onBack={() => setActiveView('main')}
                    onSubmit={handleVerificationUpload}
                    isSaving={isSubmittingVerification}
                    isVerified={isVerified}
                />
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>Tài khoản</h1>
            </div>

            {currentUser ? (
                <UserProfile
                    user={currentUser}
                    isVerified={isVerified}
                    onEdit={() => setActiveView('personal_info')}
                    onVerification={handleVerification}
                />
            ) : (
                <LoginPrompt
                    onLogin={() => navigate('/login')}
                    onRegister={() => navigate('/register')}
                />
            )}

            {currentUser && (
                <SettingsSection title="Tài khoản">
                    <SettingsItem
                        icon={User}
                        label="Thông tin cá nhân"
                        iconColor="#3b82f6"
                        onClick={() => setActiveView('personal_info')}
                    />
                    <SettingsItem
                        icon={Star}
                        label="Tích điểm & Lịch sử"
                        iconColor="#FFD700"
                        onClick={() => setActiveView('points_history')}
                    />
                    <SettingsItem
                        icon={Play}
                        label="Xem Video Kiếm Điểm"
                        iconColor="#ef4444"
                        onClick={() => setActiveView('video_earn')}
                    />
                    <SettingsItem
                        icon={Lock}
                        label="Đổi mật khẩu"
                        iconColor="#8b5cf6"
                        onClick={() => setActiveView('change_password')}
                    />
                    <SettingsItem
                        icon={ShieldCheck}
                        label="Xác minh tài khoản"
                        iconColor="#f59e0b"
                        onClick={() => setActiveView('verification')}
                    />
                </SettingsSection>
            )}

            {currentUser && (
                <button className="settings-logout-btn" onClick={handleLogout}>
                    <LogOut size={18} />
                    Đăng xuất
                </button>
            )}
        </div>
    );
}
