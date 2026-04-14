import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Search, Users, Mail, Clock, UserPlus, UserCheck, UserX,
    ArrowLeft, Check, Heart, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import ProfileAvatarLink from '../../components/profile/ProfileAvatarLink';
import './AddFriends.css';

/* ════════ COVER IMAGES ════════ */
const COVERS = [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=600',
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=600',
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=600',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600',
    'https://images.unsplash.com/photo-1506869640319-fe1a24fd76cb?q=80&w=600',
];

const avatarFallback = (userId) => `https://i.pravatar.cc/150?u=${encodeURIComponent(userId || 'user')}`;

/* ════════ SUB-COMPONENTS ════════ */

function TabBar({ activeTab, onTabChange, requestCount, sentCount, friendsCount, sentTabRef }) {
    const tabs = [
        { key: 'suggestions', label: 'Gợi ý', Icon: Users },
        { key: 'requests', label: 'Lời mời', Icon: Mail, count: requestCount },
        { key: 'sent', label: 'Đã gửi', Icon: Clock, count: sentCount },
        { key: 'friends', label: 'Bạn bè', Icon: Heart, count: friendsCount },
    ];

    return (
        <div className="af-tabs">
            {tabs.map(({ key, label, Icon, count }) => (
                <button
                    key={key}
                    className={`af-tab ${activeTab === key ? 'active' : ''}`}
                    onClick={() => onTabChange(key)}
                    ref={key === 'sent' ? sentTabRef : undefined}
                >
                    <span className="af-tab-icon">
                        <Icon size={18} strokeWidth={2} />
                        {count > 0 && <span className="af-tab-badge">{count}</span>}
                    </span>
                    <span className="af-tab-text">{label}</span>
                </button>
            ))}
        </div>
    );
}

/* ── Suggestion Card (Grid) ── */
function SuggestionCard({ user, coverIndex, onAdd, onViewProfile }) {
    let actionBtn;
    if (user.status === 'sent') {
        actionBtn = (
            <span className="af-btn af-btn-sent">
                <Check size={14} /> Đã gửi
            </span>
        );
    } else if (user.status === 'friend') {
        actionBtn = (
            <span className="af-btn af-btn-friend">
                <UserCheck size={14} /> Bạn bè
            </span>
        );
    } else {
        actionBtn = (
            <button className="af-btn af-btn-primary" onClick={(e) => { e.stopPropagation(); onAdd(user.id, user.name, e); }}>
                <UserPlus size={14} /> Kết bạn
            </button>
        );
    }

    return (
        <div className="af-suggestion-card">
            <div className="af-card-cover">
                <img src={COVERS[coverIndex % COVERS.length]} alt="" />
                <ProfileAvatarLink userId={user.id}>
                    <div className="af-card-avatar-wrap">
                        <img className="af-card-avatar" src={user.avatar} alt={user.name} />
                    </div>
                </ProfileAvatarLink>
            </div>
            <div className="af-card-body">
                <div className="af-card-name">{user.name}</div>
                {user.mutual > 0 && (
                    <div className="af-card-mutual">
                        <Heart size={11} fill="#7f001f" />
                        {user.mutual} bạn chung
                    </div>
                )}
                <div className="af-card-actions">
                    {actionBtn}
                </div>
            </div>
        </div>
    );
}

/* ── Request Card (List) ── */
function RequestCard({ user, onAccept, onDecline, onViewProfile }) {
    return (
        <div className="af-user-card">
            <ProfileAvatarLink userId={user.id}>
                <img className="af-list-avatar" src={user.avatar} alt={user.name} />
            </ProfileAvatarLink>
            <div className="af-user-info">
                <div className="af-user-name">{user.name}</div>
                <div className="af-user-subtitle">Lời mời kết bạn</div>
                {user.school && <div className="af-user-detail">🎓 {user.school}</div>}
                {user.hometown && <div className="af-user-detail">📍 {user.hometown}</div>}
            </div>
            <div className="af-list-actions">
                <button className="af-btn af-btn-secondary af-list-btn" onClick={() => onDecline(user.id, user.name)}>
                    Từ chối
                </button>
                <button className="af-btn af-btn-primary af-list-btn" onClick={() => onAccept(user.id, user.name)}>
                    Đồng ý
                </button>
            </div>
        </div>
    );
}

/* ── Sent Card (List) ── */
function SentCard({ user, onCancel, onViewProfile }) {
    return (
        <div className="af-user-card">
            <ProfileAvatarLink userId={user.id}>
                <img className="af-list-avatar" src={user.avatar} alt={user.name} />
            </ProfileAvatarLink>
            <div className="af-user-info">
                <div className="af-user-name">{user.name}</div>
                <div className="af-user-subtitle">Đã gửi lời mời</div>
                {user.school && <div className="af-user-detail">🎓 {user.school}</div>}
                {user.hometown && <div className="af-user-detail">📍 {user.hometown}</div>}
            </div>
            <div className="af-list-actions">
                <button className="af-btn af-btn-danger af-list-btn" onClick={() => onCancel(user.id, user.name)}>
                    Hủy lời mời
                </button>
            </div>
        </div>
    );
}

function FriendCard({ user, onViewProfile }) {
    return (
        <div className="af-user-card" onClick={() => onViewProfile?.(user.id)}>
            <img className="af-list-avatar" src={user.avatar} alt={user.name} />
            <div className="af-user-info">
                <div className="af-user-name">{user.name}</div>
                {user.school && <div className="af-user-detail">🎓 {user.school}</div>}
                {user.hometown && <div className="af-user-detail">📍 {user.hometown}</div>}
            </div>
            <div className="af-list-actions">
                <button
                    className="af-btn af-btn-primary af-list-btn"
                    onClick={(e) => { e.stopPropagation(); onViewProfile?.(user.id); }}
                >
                    Trang cá nhân
                </button>
            </div>
        </div>
    );
}

/* ── Empty State ── */
function EmptyState({ activeTab, hasSearch }) {
    let icon, title, subtitle;

    if (hasSearch) {
        icon = <Search size={48} strokeWidth={1.5} />;
        title = 'Không tìm thấy ai';
        subtitle = 'Hãy thử tìm kiếm với từ khóa khác nhé';
    } else if (activeTab === 'requests') {
        icon = <Mail size={48} strokeWidth={1.5} />;
        title = 'Chưa có lời mời nào';
        subtitle = 'Khi có ai gửi lời mời kết bạn, bạn sẽ thấy ở đây';
    } else if (activeTab === 'sent') {
        icon = <Clock size={48} strokeWidth={1.5} />;
        title = 'Chưa gửi lời mời nào';
        subtitle = 'Hãy khám phá tab Gợi ý để tìm bạn bè mới!';
    } else if (activeTab === 'friends') {
        icon = <Heart size={48} strokeWidth={1.5} />;
        title = 'Chưa có bạn bè nào';
        subtitle = 'Kết bạn với mọi người ngay!';
    } else {
        icon = <Users size={48} strokeWidth={1.5} />;
        title = 'Không có gợi ý nào';
        subtitle = 'Dùng thanh tìm kiếm để tìm bạn bè';
    }

    return (
        <div className="af-empty">
            <div className="af-empty-icon-wrap">{icon}</div>
            <div className="af-empty-title">{title}</div>
            <div className="af-empty-subtitle">{subtitle}</div>
        </div>
    );
}

/* ════════ MAIN PAGE ════════ */
export default function AddFriends() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('suggestions');
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [requests, setRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [friends, setFriends] = useState([]);

    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAllSuggestions, setShowAllSuggestions] = useState(false);
    const [flights, setFlights] = useState([]);

    const sentTabRef = useRef(null);

    const { userId: myUserId, token } = useAuthSession();
    const backendOrigin = useMemo(() => {
        try {
            return new URL(API_BASE_URL).origin; // e.g. http://localhost:3000
        } catch {
            return 'http://localhost:3000';
        }
    }, []);

    const apiFetch = useCallback(async (path, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };
        const res = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });

        let payload = null;
        try {
            payload = await res.json();
        } catch {
            payload = null;
        }

        if (!res.ok) {
            const msg = payload?.message || payload?.error || `HTTP ${res.status}`;
            const err = new Error(msg);
            err.status = res.status;
            err.payload = payload;
            throw err;
        }

        return payload;
    }, [token]);

    const normalizeAvatarUrl = useCallback((raw) => {
        if (!raw) return '';
        // Nếu backend trả filename -> ghép uploads với backendOrigin (localhost cho web)
        if (typeof raw === 'string' && !raw.startsWith('http://') && !raw.startsWith('https://')) {
            return `${backendOrigin}/uploads/${raw}`;
        }

        // Nếu backend trả full URL (có thể là IP LAN từ mobile) -> ép về backendOrigin (localhost cho web)
        try {
            const url = new URL(raw);
            if (url.pathname.startsWith('/uploads/')) {
                return `${backendOrigin}${url.pathname}`;
            }
            return raw;
        } catch {
            return raw;
        }
    }, [backendOrigin]);

    const mapUser = (u) => ({
        id: u.ID_NguoiDung,
        name: u.ho_ten || 'Người dùng',
        avatar: normalizeAvatarUrl(u.anh_dai_dien) || avatarFallback(u.ID_NguoiDung),
        school: u.truong_hoc || '',
        hometown: u.que_quan || '',
        mutual: u.so_nguoi_chung || 0,
        raw: u,
    });

    const mergeStatus = useCallback((users) => {
        const friendIds = new Set(friends.map((f) => f.id));
        const sentIds = new Set(sentRequests.map((s) => s.id));
        return users.map((u) => ({
            ...u,
            status: friendIds.has(u.id) ? 'friend' : sentIds.has(u.id) ? 'sent' : null,
        }));
    }, [friends, sentRequests]);

    const loadInitial = useCallback(async () => {
        if (!myUserId) {
            navigate('/login');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const [sug, req, sent, fr] = await Promise.all([
                apiFetch(`/quanhebanbe/suggestions/${myUserId}`),
                apiFetch(`/quanhebanbe/requests/${myUserId}`),
                apiFetch(`/quanhebanbe/sent-requests/${myUserId}`),
                apiFetch(`/quanhebanbe/list/${myUserId}`),
            ]);

            const mappedFriends = (fr?.data || fr || []).map(mapUser);
            const mappedSent = (sent?.data || sent || []).map(mapUser);
            const mappedReq = (req?.data || req || []).map(mapUser);
            const mappedSug = (sug?.data || sug || []).map(mapUser);

            setFriends(mappedFriends);
            setSentRequests(mappedSent);
            setRequests(mappedReq);
            setSuggestions(mergeStatus(mappedSug));
        } catch (e) {
            console.error('Load add-friends failed', e);
            setError('Không thể tải dữ liệu thêm bạn. Kiểm tra backend/API_BASE_URL rồi thử lại.');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, myUserId, navigate, mergeStatus]);

    useEffect(() => {
        loadInitial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Search users on suggestions tab
    useEffect(() => {
        if (activeTab !== 'suggestions') return;
        const q = searchQuery.trim();
        if (!q || !myUserId) {
            setSearchResults([]);
            return;
        }

        const t = setTimeout(async () => {
            setIsSearching(true);
            try {
                const data = await apiFetch(
                    `/nguoidung/search?tuKhoa=${encodeURIComponent(q)}&idNguoiDungHienTai=${encodeURIComponent(myUserId)}`,
                    {},
                );
                const raw = data?.data || data || [];
                // map first
                const mapped = raw.map(mapUser);

                // enrich mutual friends count (best-effort)
                const enriched = await Promise.all(
                    mapped.map(async (u) => {
                        try {
                            const r = await apiFetch(`/quanhebanbe/friends-count/${myUserId}/${u.id}`, {},);
                            const mutual = r?.mutualFriendsCount ?? r?.data?.mutualFriendsCount ?? r?.count ?? 0;
                            return { ...u, mutual: Number(mutual) || 0 };
                        } catch {
                            return u;
                        }
                    }),
                );
                setSearchResults(mergeStatus(enriched));
            } catch (e) {
                console.error('Search users failed', e);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 450);

        return () => clearTimeout(t);
    }, [activeTab, apiFetch, myUserId, searchQuery, mergeStatus]);

    /* ── Handlers ── */
    const spawnFlight = useCallback((fromEl) => {
        const toEl = sentTabRef.current;
        if (!fromEl || !toEl) return;

        const from = fromEl.getBoundingClientRect();
        const to = toEl.getBoundingClientRect();

        const startX = from.left + from.width / 2;
        const startY = from.top + from.height / 2;
        const endX = to.left + to.width / 2;
        const endY = to.top + to.height / 2;

        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        setFlights((prev) => [
            ...prev,
            {
                id,
                startX,
                startY,
                endX,
                endY,
            },
        ]);

        window.setTimeout(() => {
            setFlights((prev) => prev.filter((f) => f.id !== id));
        }, 900);
    }, []);

    const handleAddFriend = async (userId, name, event) => {
        if (!myUserId) return;
        const fromEl = event?.currentTarget || null;
        spawnFlight(fromEl);
        setActionLoading(true);
        // optimistic
        setSuggestions((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'sent' } : u)));
        setSearchResults((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'sent' } : u)));
        try {
            await apiFetch('/quanhebanbe/request', {
                method: 'POST',
                body: JSON.stringify({ idNguoiGui: myUserId, idNguoiNhan: userId }),
            });
            await loadInitial();
        } catch (e) {
            console.error('Send request failed', e);
            // rollback via reload
            await loadInitial();
            alert(e?.message || `Không thể gửi lời mời tới ${name || 'người dùng'}.`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAccept = async (userId, name) => {
        if (!myUserId) return;
        setActionLoading(true);
        try {
            await apiFetch('/quanhebanbe/accept', {
                method: 'PUT',
                body: JSON.stringify({ idNguoiNhan: myUserId, idNguoiGui: userId }),
            });
            await loadInitial();
        } catch (e) {
            console.error('Accept request failed', e);
            alert(e?.message || `Không thể đồng ý kết bạn với ${name || 'người dùng'}.`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDecline = async (userId, name) => {
        if (!myUserId) return;
        const ok = confirm(`Từ chối lời mời kết bạn từ ${name || 'người dùng'}?`);
        if (!ok) return;
        setActionLoading(true);
        try {
            await apiFetch('/quanhebanbe/unfriend', {
                method: 'DELETE',
                body: JSON.stringify({ idNguoiGui: userId, idNguoiNhan: myUserId }),
            });
            await loadInitial();
        } catch (e) {
            console.error('Decline request failed', e);
            alert(e?.message || 'Không thể từ chối lời mời.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelSent = async (userId, name) => {
        if (!myUserId) return;
        const ok = confirm(`Hủy lời mời kết bạn với ${name || 'người dùng'}?`);
        if (!ok) return;
        setActionLoading(true);
        try {
            await apiFetch('/quanhebanbe/cancel', {
                method: 'DELETE',
                body: JSON.stringify({ idNguoiGui: myUserId, idNguoiNhan: userId }),
            });
            await loadInitial();
        } catch (e) {
            console.error('Cancel request failed', e);
            alert(e?.message || 'Không thể hủy lời mời.');
        } finally {
            setActionLoading(false);
        }
    };

    /* ── Filtered ── */
    const displaySuggestions = searchQuery.trim() ? searchResults : suggestions;
    const limitedSuggestions = useMemo(() => {
        if (showAllSuggestions) return displaySuggestions;
        // 3 hàng x 3 người = 9
        return displaySuggestions.slice(0, 9);
    }, [displaySuggestions, showAllSuggestions]);

    useEffect(() => {
        // đổi keyword thì thu gọn lại
        setShowAllSuggestions(false);
    }, [searchQuery, activeTab]);

    const handleViewProfile = (userId) => {
        navigate(`/profile/${userId}`);
    };

    return (
        <div className="addfriends-page">
            {/* paper plane flights */}
            {flights.map((f) => (
                <div
                    key={f.id}
                    className="af-flight"
                    style={{
                        '--sx': `${f.startX}px`,
                        '--sy': `${f.startY}px`,
                        '--ex': `${f.endX}px`,
                        '--ey': `${f.endY}px`,
                    }}
                >
                    <div className="af-flight-plane" />
                </div>
            ))}

            {/* ── Hero Header ── */}
            <div className="af-hero">
                <div className="af-hero-top">
                    <button className="af-back-btn" onClick={() => navigate(-1)} aria-label="Quay lại">
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <h1 className="af-hero-title">Thêm bạn bè</h1>
                </div>
                <p className="af-hero-subtitle">Kết nối với bạn bè sinh viên gần bạn ✨</p>

                {/* Search — inside hero on suggestions tab */}
                {activeTab === 'suggestions' && (
                    <div className="af-search-wrap">
                        <div className="af-search-bar">
                            <Search size={18} strokeWidth={2} />
                            <input
                                type="text"
                                className="af-search-input"
                                placeholder="Tìm bạn bè theo tên, trường..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {(isSearching || actionLoading) && <Loader2 size={18} className="spin" />}
                        </div>
                    </div>
                )}
            </div>

            <div className="addfriends-inner">

                {/* Tab Bar */}
                <TabBar
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    requestCount={requests.length}
                    sentCount={sentRequests.length}
                    friendsCount={friends.length}
                    sentTabRef={sentTabRef}
                />

                {/* ── Content ── */}
                {loading && (
                    <div className="af-empty">
                        <div className="af-empty-icon-wrap"><Loader2 size={48} className="spin" /></div>
                        <div className="af-empty-title">Đang tải dữ liệu...</div>
                        <div className="af-empty-subtitle">Vui lòng chờ một chút</div>
                    </div>
                )}
                {!loading && error && (
                    <div className="af-empty">
                        <div className="af-empty-icon-wrap"><UserX size={48} strokeWidth={1.5} /></div>
                        <div className="af-empty-title">Không tải được dữ liệu</div>
                        <div className="af-empty-subtitle">{error}</div>
                        <div style={{ marginTop: 14, width: '100%', maxWidth: 280 }}>
                            <button className="af-btn af-btn-primary" onClick={loadInitial}>
                                Thử lại
                            </button>
                        </div>
                    </div>
                )}

                {/* Suggestions Tab — Grid */}
                {!loading && !error && activeTab === 'suggestions' && (
                    displaySuggestions.length === 0
                        ? <EmptyState activeTab="suggestions" hasSearch={!!searchQuery.trim()} />
                        : <>
                            <div className="af-section-title">
                                {searchQuery.trim() ? `Kết quả cho "${searchQuery}"` : 'Những người bạn có thể biết'}
                            </div>
                            <div className="af-suggestions-grid">
                                {limitedSuggestions.map((user, i) => (
                                    <div key={user.id} onClick={() => handleViewProfile(user.id)}>
                                        <SuggestionCard user={user} coverIndex={i} onAdd={handleAddFriend} />
                                    </div>
                                ))}
                            </div>
                            {displaySuggestions.length > 9 && (
                                <div className="af-more-wrap">
                                    <button
                                        type="button"
                                        className="af-btn af-btn-secondary af-more-btn"
                                        onClick={() => setShowAllSuggestions((v) => !v)}
                                    >
                                        {showAllSuggestions ? 'Thu gọn' : 'Xem thêm'}
                                    </button>
                                </div>
                            )}
                        </>
                )}

                {/* Requests Tab — List */}
                {!loading && !error && activeTab === 'requests' && (
                    requests.length === 0
                        ? <EmptyState activeTab="requests" />
                        : <>
                            <div className="af-section-title">Lời mời kết bạn ({requests.length})</div>
                            <div className="af-card-list">
                                {requests.map(user => (
                                    <RequestCard key={user.id} user={user} onAccept={handleAccept} onDecline={handleDecline} />
                                ))}
                            </div>
                        </>
                )}

                {/* Sent Tab — List */}
                {!loading && !error && activeTab === 'sent' && (
                    sentRequests.length === 0
                        ? <EmptyState activeTab="sent" />
                        : <>
                            <div className="af-section-title">Đã gửi lời mời ({sentRequests.length})</div>
                            <div className="af-card-list">
                                {sentRequests.map(user => (
                                    <SentCard key={user.id} user={user} onCancel={handleCancelSent} />
                                ))}
                            </div>
                        </>
                )}

                {/* Friends Tab — List */}
                {!loading && !error && activeTab === 'friends' && (
                    friends.length === 0
                        ? <EmptyState activeTab="friends" />
                        : <>
                            <div className="af-section-title">Bạn bè ({friends.length})</div>
                            <div className="af-card-list">
                                {friends.map(user => (
                                    <FriendCard key={user.id} user={user} onViewProfile={handleViewProfile} />
                                ))}
                            </div>
                        </>
                )}

            </div>
        </div>
    );
}
