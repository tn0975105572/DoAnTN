import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Circle as LeafletCircle,
    MapContainer,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import confetti from 'canvas-confetti';
import {
    Search, MoreHorizontal, Edit3, Phone, Video, Info,
    Send, Image, ChevronDown,
    MessageCircle, User, Bell, Shield, X, Mail, Users, UserCheck, UserX, FileText, Trash2,
    Sparkles, Handshake, ShoppingBag, MapPin, Clock3, BadgeCheck, AlertTriangle, LocateFixed
} from 'lucide-react';
import io from 'socket.io-client';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../constants';
import { useAuthSession } from '../../utils/authSession';
import ProfileAvatarLink from '../../components/profile/ProfileAvatarLink';
import './Messages.css';
import 'leaflet/dist/leaflet.css';

const avatarFallback = (seed) => `https://i.pravatar.cc/150?u=${encodeURIComponent(seed || 'user')}`;
const POST_SHARE_PREFIX = '📱 Bài đăng:';
const POST_SHARE_ID_PREFIX = '🆔 Post ID:';
const POST_SHARE_IMAGE_PREFIX = '🖼️ Post Image:';
const POST_SHARE_META_PREFIX = '__OLODO_POST_META__';
const DEAL_ROOM_STORAGE_PREFIX = 'olodo_deal_room';
const ACTIVE_ACCEPTED_STATUSES = ['nguoi_ban_da_chap_nhan', 'cho_hen_gap', 'cho_xac_nhan_hoan_tat'];
const OPEN_DEAL_STATUSES = ['cho_nguoi_ban_xac_nhan', 'nguoi_ban_da_chap_nhan', 'cho_hen_gap', 'cho_xac_nhan_hoan_tat'];
const DEAL_MAP_DEFAULT_CENTER = { lat: 16.047079, lng: 108.20623 };
const DEAL_MAP_DEFAULT_ZOOM = 6;
const DEAL_MAP_FOCUS_ZOOM = 16;
const EMPTY_DEAL_CONTEXT = {
    post: null,
    transactions: [],
    currentTransaction: null,
    activeAcceptedOther: null,
    role: 'viewer',
    buyerId: null,
    sellerId: null,
};

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

const TRANSACTION_STATUS_META = {
    idle: {
        label: 'Sẵn sàng mở giao dịch',
        tone: 'idle',
        headline: 'Bật chế độ chốt đơn ngay trong chat',
        description: 'Chỉ một cú xác nhận là bài đăng có thể chuyển sang giữ chỗ hoặc giao dịch.',
    },
    cho_nguoi_ban_xac_nhan: {
        label: 'Chờ người bán xác nhận',
        tone: 'warm',
        headline: 'Yêu cầu mua đang được giữ ở phòng chờ',
        description: 'Người bán chỉ cần một lần đồng ý để chuyển bài đăng sang trạng thái giữ chỗ.',
    },
    nguoi_ban_da_chap_nhan: {
        label: 'Đã chấp nhận',
        tone: 'live',
        headline: 'Hai bên đã bắt tay giao dịch',
        description: 'Bài đăng đã được giữ cho người mua hiện tại. Có thể chốt điểm hẹn hoặc chuẩn bị hoàn tất.',
    },
    cho_hen_gap: {
        label: 'Đang chốt điểm hẹn',
        tone: 'live',
        headline: 'Điểm hẹn đã lên bàn',
        description: 'Cập nhật nơi gặp và thời gian để đẩy giao dịch sang bước gặp mặt rõ ràng hơn.',
    },
    cho_xac_nhan_hoan_tat: {
        label: 'Chờ xác nhận hoàn tất',
        tone: 'signal',
        headline: 'Cả hai bên đang ở bước xác nhận cuối',
        description: 'Người mua và người bán đều cần xác nhận để bài đăng chuyển hẳn sang đã bán.',
    },
    hoan_tat: {
        label: 'Hoàn tất',
        tone: 'done',
        headline: 'Giao dịch đã khép lại',
        description: 'Bài đăng đã được đánh dấu đã bán và lịch sử giao dịch vẫn còn lưu trong đoạn chat này.',
    },
    nguoi_mua_da_huy: {
        label: 'Người mua đã hủy',
        tone: 'muted',
        headline: 'Yêu cầu mua đã được đóng',
        description: 'Bài đăng quay về trạng thái mở bán, người mua có thể tạo lại yêu cầu mới nếu cần.',
    },
    nguoi_ban_da_tu_choi: {
        label: 'Người bán từ chối',
        tone: 'muted',
        headline: 'Người bán chưa chốt giao dịch này',
        description: 'Đoạn chat vẫn còn, nhưng giao dịch đã dừng ở bước xác nhận ban đầu.',
    },
    he_thong_da_huy: {
        label: 'Đã đóng tự động',
        tone: 'blocked',
        headline: 'Giao dịch này bị khóa lại',
        description: 'Hệ thống tự đóng vì bài đăng đã giữ cho người mua khác hoặc đã hoàn tất với người khác.',
    },
    het_han: {
        label: 'Đã hết hạn',
        tone: 'blocked',
        headline: 'Yêu cầu mua đã quá hạn',
        description: 'Không còn giữ chỗ cho giao dịch này nữa. Có thể mở lại một yêu cầu mới nếu bài vẫn còn bán.',
    },
};

const POST_STATUS_META = {
    dang_ban: {
        label: 'Đang mở bán',
        hint: 'Bài đăng vẫn đang mở cho người mua mới.',
    },
    dang_giu_cho: {
        label: 'Đang giữ chỗ',
        hint: 'Người bán đang ưu tiên xử lý một giao dịch.',
    },
    dang_giao_dich: {
        label: 'Đang giao dịch',
        hint: 'Bài đăng đang ở giữa tiến trình chốt đơn.',
    },
    da_ban: {
        label: 'Đã bán',
        hint: 'Bài đăng đã hoàn tất giao dịch.',
    },
    da_trao_doi: {
        label: 'Đã trao đổi',
        hint: 'Bài đăng đã được xử lý xong.',
    },
    da_tang: {
        label: 'Đã tặng',
        hint: 'Bài đăng không còn mở để giao dịch.',
    },
};

const FINAL_POST_STATUSES = ['da_ban', 'da_trao_doi', 'da_tang'];

const DEAL_PROGRESS_STEPS = [
    {
        key: 'request',
        label: 'Yêu cầu mua',
        hint: 'Người mua mở yêu cầu chốt đơn trong chat.',
    },
    {
        key: 'accept',
        label: 'Xác nhận',
        hint: 'Người bán chấp nhận để giữ bài cho đúng người.',
    },
    {
        key: 'meeting',
        label: 'Điểm hẹn',
        hint: 'Hai bên chốt nơi gặp hoặc thời gian giao nhận.',
    },
    {
        key: 'complete',
        label: 'Hoàn tất',
        hint: 'Giao dịch được chốt và bài đăng chuyển sang đã bán.',
    },
];

const HISTORY_ACTION_LABELS = {
    tao_yeu_cau_mua: 'Đã tạo yêu cầu mua',
    nguoi_ban_chap_nhan: 'Người bán đã chấp nhận',
    nguoi_ban_tu_choi: 'Người bán đã từ chối',
    cap_nhat_diem_hen: 'Đã cập nhật điểm hẹn',
    yeu_cau_hoan_tat: 'Đã gửi yêu cầu hoàn tất',
    xac_nhan_hoan_tat: 'Đã xác nhận hoàn tất',
    hoan_tat_giao_dich: 'Đã hoàn tất giao dịch',
    nguoi_mua_huy: 'Người mua đã hủy',
    he_thong_huy: 'Hệ thống đã đóng giao dịch',
    het_han_giao_dich: 'Giao dịch đã hết hạn',
};

const DEAL_SOCKET_NOTICE_LABELS = {
    request_created: 'Đã có yêu cầu mua mới trong cuộc chat này.',
    request_accepted: 'Người bán vừa chấp nhận giao dịch.',
    request_rejected: 'Giao dịch vừa bị từ chối.',
    request_cancelled: 'Giao dịch vừa được hủy.',
    meeting_updated: 'Điểm hẹn vừa được cập nhật.',
    completion_confirmed: 'Một bên vừa xác nhận giao dịch, đang chờ bên còn lại.',
    complete_requested: 'Đã có yêu cầu hoàn tất giao dịch.',
    deal_completed: 'Giao dịch vừa được xác nhận hoàn tất.',
};

function getPostShareMetadataLine(text, prefix) {
    if (typeof text !== 'string') return '';
    return text
        .split('\n')
        .find((line) => line.startsWith(prefix))
        ?.replace(prefix, '')
        .trim() || '';
}

function isPostShareMessage(text) {
    return typeof text === 'string' && text.includes(POST_SHARE_PREFIX);
}

function parsePostSharePayload(text) {
    if (typeof text !== 'string') {
        return { cleanText: '', postId: '', postImage: '', title: '' };
    }

    let cleanText = text;
    let postId = '';
    let postImage = '';

    const markerIndex = text.indexOf(POST_SHARE_META_PREFIX);
    if (markerIndex >= 0) {
        cleanText = text.slice(0, markerIndex).trimEnd();
        const rawMeta = text.slice(markerIndex + POST_SHARE_META_PREFIX.length).trim();
        try {
            const parsed = JSON.parse(rawMeta);
            postId = typeof parsed?.postId === 'string' ? parsed.postId.trim() : '';
            postImage = typeof parsed?.postImage === 'string' ? parsed.postImage.trim() : '';
        } catch {
            cleanText = text;
        }
    }

    const legacyPostId = getPostShareMetadataLine(cleanText, POST_SHARE_ID_PREFIX);
    const legacyPostImage = getPostShareMetadataLine(cleanText, POST_SHARE_IMAGE_PREFIX);
    if (!postId) postId = legacyPostId;
    if (!postImage) postImage = legacyPostImage;

    cleanText = cleanText
        .split('\n')
        .filter((line) => !line.startsWith(POST_SHARE_ID_PREFIX) && !line.startsWith(POST_SHARE_IMAGE_PREFIX))
        .join('\n')
        .trim();

    return {
        cleanText,
        postId,
        postImage,
        title: getPostShareMetadataLine(cleanText, POST_SHARE_PREFIX),
    };
}

function extractPostShareTitle(text) {
    if (!isPostShareMessage(text)) return '';
    return parsePostSharePayload(text).title;
}

function extractPostShareId(text) {
    return parsePostSharePayload(text).postId;
}

function extractPostShareImage(text) {
    return parsePostSharePayload(text).postImage;
}

function extractLocationPayload(text) {
    if (typeof text !== 'string' || !text.includes('📍')) return null;

    const match = text.match(/maps\?q=([-\d.]+),([-\d.]+)/i);
    if (!match) return null;

    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
}

function formatCurrency(value) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? currencyFormatter.format(amount) : 'Liên hệ';
}

function formatDateTime(value) {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
    });
}

function toDateTimeLocalValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return offsetDate.toISOString().slice(0, 16);
}

function toMySqlDateTime(value) {
    if (!value) return null;
    return `${value.replace('T', ' ')}:00`;
}

function buildMapLookupUrl(transaction) {
    if (!transaction) return '';

    const lat = Number(transaction.vi_do_hen_gap);
    const lng = Number(transaction.kinh_do_hen_gap);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return `https://www.google.com/maps?q=${lat},${lng}`;
    }

    const address = String(transaction.dia_chi_hen_gap || '').trim();
    if (!address) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function resolveMeetingMapCenter(draft) {
    const lat = Number(draft?.lat);
    const lng = Number(draft?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
    }
    return DEAL_MAP_DEFAULT_CENTER;
}

async function searchMeetingPlaces(keyword) {
    const query = String(keyword || '').trim();
    if (!query) return [];

    const response = await fetch(`${API_BASE_URL}/maps/search?q=${encodeURIComponent(query)}`, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Không thể tìm địa điểm trên bản đồ.');
    }

    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

async function reverseLookupMeetingPlace(lat, lng) {
    const response = await fetch(`${API_BASE_URL}/maps/reverse?lat=${lat}&lng=${lng}`, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Không thể lấy địa chỉ tại điểm vừa chọn.');
    }

    const payload = await response.json();
    return payload?.data || null;
}

function MeetingMapViewportController({ center, zoom }) {
    const map = useMap();

    useEffect(() => {
        if (!center) return;
        map.setView([center.lat, center.lng], zoom, { animate: true });
    }, [center, map, zoom]);

    return null;
}

function MeetingMapSizeController() {
    const map = useMap();

    useEffect(() => {
        const invalidate = () => {
            map.invalidateSize({ animate: false });
        };

        const frameId = window.requestAnimationFrame(invalidate);
        const timeoutId = window.setTimeout(invalidate, 180);

        let resizeObserver = null;
        if (typeof window.ResizeObserver === 'function') {
            resizeObserver = new window.ResizeObserver(() => {
                invalidate();
            });
            resizeObserver.observe(map.getContainer());
        }

        return () => {
            window.cancelAnimationFrame(frameId);
            window.clearTimeout(timeoutId);
            resizeObserver?.disconnect();
        };
    }, [map]);

    return null;
}

function MeetingMapPickerEvents({ onPick }) {
    useMapEvents({
        click(event) {
            onPick(event.latlng);
        },
    });

    return null;
}

function MeetingLocationPickerModal({
    draft,
    onDraftChange,
    onClose,
    onSave,
    isSaving,
}) {
    const bodyRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState(draft?.address || '');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchMessage, setSearchMessage] = useState('');
    const [searchFeedback, setSearchFeedback] = useState('');
    const [locating, setLocating] = useState(false);
    const [mapCenter, setMapCenter] = useState(() => resolveMeetingMapCenter(draft));
    const [mapZoom, setMapZoom] = useState(() => (draft?.lat && draft?.lng ? DEAL_MAP_FOCUS_ZOOM : DEAL_MAP_DEFAULT_ZOOM));
    const [pendingLocation, setPendingLocation] = useState(() => (
        draft?.address && draft?.lat && draft?.lng
            ? {
                address: draft.address,
                lat: Number(draft.lat),
                lng: Number(draft.lng),
                source: 'draft',
            }
            : null
    ));

    useEffect(() => {
        setSearchQuery(draft?.address || '');
        const nextCenter = resolveMeetingMapCenter(draft);
        setMapCenter(nextCenter);
        setMapZoom(draft?.lat && draft?.lng ? DEAL_MAP_FOCUS_ZOOM : DEAL_MAP_DEFAULT_ZOOM);
        setPendingLocation(
            draft?.address && draft?.lat && draft?.lng
                ? {
                    address: draft.address,
                    lat: Number(draft.lat),
                    lng: Number(draft.lng),
                    source: 'draft',
                }
                : null,
        );
    }, [draft?.address, draft?.lat, draft?.lng]);

    const stageLocationSelection = useCallback(({ lat, lng, address = '', source = 'search' }) => {
        const numericLat = Number(lat);
        const numericLng = Number(lng);

        setMapCenter({ lat: numericLat, lng: numericLng });
        setMapZoom(DEAL_MAP_FOCUS_ZOOM);
        setPendingLocation({
            address,
            lat: numericLat,
            lng: numericLng,
            source,
        });

        if (address) {
            setSearchQuery(address);
        }
    }, []);

    const applyLocationSelection = useCallback(async ({ lat, lng, address = '', source = 'search' }) => {
        const numericLat = Number(lat);
        const numericLng = Number(lng);

        setMapCenter({ lat: numericLat, lng: numericLng });
        setMapZoom(DEAL_MAP_FOCUS_ZOOM);

        if (address) {
            stageLocationSelection({
                lat: numericLat,
                lng: numericLng,
                address,
                source,
            });
            setSearchResults([]);
            setSearchFeedback('');
            setSearchMessage('Địa chỉ đã được chọn nháp. Bấm "Xác nhận địa chỉ" để chốt vào form.');
            return;
        }

        setSearchMessage('Đang lấy địa chỉ tại điểm vừa chọn...');
        try {
            const reverse = await reverseLookupMeetingPlace(numericLat, numericLng);
            const resolvedAddress = reverse?.display_name || `${numericLat.toFixed(6)}, ${numericLng.toFixed(6)}`;
            stageLocationSelection({
                lat: numericLat,
                lng: numericLng,
                address: resolvedAddress,
                source,
            });
            setSearchResults([]);
            setSearchFeedback('');
            setSearchMessage('Địa chỉ đã được chọn nháp từ bản đồ. Bấm "Xác nhận địa chỉ" để chốt.');
        } catch (error) {
            const fallbackAddress = `${numericLat.toFixed(6)}, ${numericLng.toFixed(6)}`;
            stageLocationSelection({
                lat: numericLat,
                lng: numericLng,
                address: fallbackAddress,
                source,
            });
            setSearchResults([]);
            setSearchFeedback('');
            setSearchMessage(error.message || 'Đã lấy tọa độ nháp. Bấm "Xác nhận địa chỉ" để dùng vị trí này.');
        }
    }, [stageLocationSelection]);

    const confirmPendingLocation = useCallback(() => {
        if (!pendingLocation?.address?.trim()) {
            setSearchMessage('Hãy chọn một gợi ý hoặc click lên bản đồ trước khi xác nhận địa chỉ.');
            return;
        }

        onDraftChange((current) => ({
            ...current,
            address: pendingLocation.address.trim(),
            lat: pendingLocation.lat,
            lng: pendingLocation.lng,
        }));
        setSearchResults([]);
        setSearchFeedback('');
        setSearchMessage('Đã xác nhận địa chỉ vào form điểm hẹn.');
    }, [onDraftChange, pendingLocation]);

    const handleSearch = useCallback(async () => {
        const query = searchQuery.trim();
        if (query.length < 2) {
            setSearchResults([]);
            setSearchFeedback(query ? 'Gõ thêm vài ký tự để nhận gợi ý địa chỉ.' : '');
            return;
        }

        setSearching(true);
        setSearchFeedback('Đang gợi ý địa chỉ...');
        try {
            const results = await searchMeetingPlaces(query);
            setSearchResults(results);
            setSearchFeedback(results.length ? '' : 'Không tìm thấy địa điểm phù hợp.');
        } catch (error) {
            setSearchResults([]);
            setSearchFeedback(error.message || 'Không thể tìm địa điểm lúc này.');
        } finally {
            setSearching(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length < 2) {
            setSearchResults([]);
            setSearchFeedback(query ? 'Gõ thêm vài ký tự để nhận gợi ý địa chỉ.' : '');
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            handleSearch();
        }, 280);

        return () => window.clearTimeout(timeoutId);
    }, [handleSearch, searchQuery]);

    const handleUseCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setSearchMessage('Trình duyệt không hỗ trợ định vị vị trí hiện tại.');
            return;
        }

        setLocating(true);
        setSearchMessage('Đang lấy vị trí hiện tại của bạn...');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    await applyLocationSelection({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        source: 'current-location',
                    });
                } finally {
                    setLocating(false);
                }
            },
            (error) => {
                console.error('Meeting picker geolocation failed', error);
                setLocating(false);
                setSearchMessage('Không thể lấy vị trí hiện tại. Hãy chọn trực tiếp trên bản đồ.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            },
        );
    }, [applyLocationSelection]);

    const handleSave = useCallback(() => {
        if (!draft.address?.trim()) {
            setSearchMessage('Hãy chọn điểm hẹn trên bản đồ hoặc từ ô tìm kiếm.');
            return;
        }

        if (!draft.time) {
            setSearchMessage('Hãy chọn thời gian hẹn gặp trước khi lưu.');
            return;
        }

        onSave();
    }, [draft.address, draft.time, onSave]);

    const handleMapWheelCapture = useCallback((event) => {
        const container = bodyRef.current;
        if (!container) return;

        event.preventDefault();
        event.stopPropagation();

        container.scrollBy({
            top: event.deltaY,
            left: 0,
            behavior: 'auto',
        });
    }, []);

    const shouldShowSearchDropdown = searchQuery.trim().length >= 2 && (
        searching ||
        searchResults.length > 0 ||
        Boolean(searchFeedback)
    );

    return (
        <div className="msg-modal-overlay msg-map-picker-overlay" onClick={onClose}>
            <div className="msg-modal msg-map-picker-modal" onClick={(event) => event.stopPropagation()}>
                <div className="msg-modal-header">
                    <div>
                        <h3>Chọn điểm hẹn trên bản đồ</h3>
                        <p className="msg-map-picker-subtitle">Tìm kiếm địa điểm, click trực tiếp trên bản đồ và chốt luôn thời gian gặp.</p>
                    </div>
                    <button type="button" className="msg-modal-clear" onClick={onClose} aria-label="Đóng chọn điểm hẹn">
                        <X size={14} />
                    </button>
                </div>

                <div className="msg-map-picker-body" ref={bodyRef}>
                    <div className="msg-map-picker-toolbar">
                        <div className="msg-map-picker-search-stack">
                            <div className="msg-map-picker-search">
                                <Search size={16} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    placeholder="Tìm trường, quán, địa chỉ, cổng gặp..."
                                    onChange={(event) => {
                                        setSearchQuery(event.target.value);
                                        setSearchFeedback('');
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            handleSearch();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="msg-deal-btn primary"
                                    onClick={handleSearch}
                                    disabled={searching}
                                >
                                    {searching ? 'Đang gợi ý...' : 'Tìm nhanh'}
                                </button>
                            </div>

                            {shouldShowSearchDropdown && (
                                <div className="msg-map-picker-results">
                                    {searching && searchResults.length === 0 && (
                                        <div className="msg-map-picker-results-state">
                                            Đang gợi ý địa chỉ...
                                        </div>
                                    )}

                                    {!searching && searchResults.length > 0 && searchResults.map((result) => (
                                        <button
                                            key={`${result.place_id}-${result.lat}-${result.lon}`}
                                            type="button"
                                            className={`msg-map-picker-result ${
                                                pendingLocation?.address === result.display_name ? 'active' : ''
                                            }`}
                                            onClick={() => applyLocationSelection({
                                                lat: result.lat,
                                                lng: result.lon,
                                                address: result.display_name,
                                                source: 'search',
                                            })}
                                        >
                                            <MapPin size={15} />
                                            <div className="msg-map-picker-result-copy">
                                                <strong>{result.name || 'Địa điểm'}</strong>
                                                <span>{result.display_name}</span>
                                            </div>
                                        </button>
                                    ))}

                                    {!searching && searchResults.length === 0 && searchFeedback && (
                                        <div className="msg-map-picker-results-state">
                                            {searchFeedback}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            className="msg-deal-btn ghost"
                            onClick={handleUseCurrentLocation}
                            disabled={locating}
                        >
                            <LocateFixed size={16} />
                            {locating ? 'Đang định vị...' : 'Vị trí của tôi'}
                        </button>
                    </div>

                    {searchMessage && <div className="msg-map-picker-status">{searchMessage}</div>}

                    {pendingLocation && (
                        <div className="msg-map-picker-selection">
                            <div className="msg-map-picker-selection-copy">
                                <span>Địa chỉ đang chọn</span>
                                <strong>{pendingLocation.address}</strong>
                                <small>
                                    {pendingLocation.source === 'search'
                                        ? 'Bạn vừa chọn từ gợi ý tìm kiếm.'
                                        : pendingLocation.source === 'current-location'
                                            ? 'Bạn vừa lấy từ vị trí hiện tại.'
                                            : pendingLocation.source === 'map-click'
                                                ? 'Bạn vừa chọn trực tiếp trên bản đồ.'
                                                : 'Địa chỉ đang có trong form.'}
                                </small>
                            </div>
                            <button
                                type="button"
                                className="msg-deal-btn primary"
                                onClick={confirmPendingLocation}
                            >
                                Xác nhận địa chỉ
                            </button>
                        </div>
                    )}

                    <div className="msg-map-picker-canvas" onWheelCapture={handleMapWheelCapture}>
                        <MapContainer
                            center={[mapCenter.lat, mapCenter.lng]}
                            zoom={mapZoom}
                            className="msg-map-picker-leaflet"
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap contributors"
                            />
                            <MeetingMapSizeController />
                            <MeetingMapViewportController center={mapCenter} zoom={mapZoom} />
                            <MeetingMapPickerEvents
                                onPick={({ lat, lng }) => applyLocationSelection({ lat, lng, source: 'map-click' })}
                            />
                            {Number.isFinite(Number(pendingLocation?.lat)) && Number.isFinite(Number(pendingLocation?.lng)) && (
                                <LeafletCircle
                                    center={[Number(pendingLocation.lat), Number(pendingLocation.lng)]}
                                    radius={28}
                                    pathOptions={{
                                        color: '#7f001f',
                                        fillColor: '#7f001f',
                                        fillOpacity: 0.28,
                                        weight: 2,
                                    }}
                                />
                            )}
                        </MapContainer>
                    </div>

                    <div className="msg-map-picker-fields">
                        <div className="msg-map-picker-field">
                            <span>Địa điểm đã xác nhận</span>
                            <strong>{draft.address || 'Chưa chọn điểm hẹn trên bản đồ'}</strong>
                        </div>
                        <div className="msg-map-picker-grid">
                            <label className="msg-map-picker-label">
                                <span>Thời gian hẹn</span>
                                <input
                                    className="msg-deal-input"
                                    type="datetime-local"
                                    value={draft.time}
                                    onChange={(event) => onDraftChange((current) => ({ ...current, time: event.target.value }))}
                                />
                            </label>
                            <label className="msg-map-picker-label">
                                <span>Ghi chú thêm</span>
                                <textarea
                                    className="msg-deal-textarea compact"
                                    placeholder="Ví dụ: gặp ở cổng A, gọi trước 5 phút, mặc áo đen..."
                                    value={draft.note}
                                    onChange={(event) => onDraftChange((current) => ({ ...current, note: event.target.value }))}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="msg-map-picker-actions">
                        <button type="button" className="msg-deal-btn ghost" onClick={onClose}>
                            Đóng
                        </button>
                        <button
                            type="button"
                            className="msg-deal-btn primary"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu điểm hẹn'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DealCompletedCelebrationCard({
    post,
    transaction,
    buyer,
    seller,
    meetingMapUrl,
    onViewPost,
}) {
    const firedTransactionRef = useRef('');

    useEffect(() => {
        if (!transaction?.ID_GiaoDich) return undefined;
        if (firedTransactionRef.current === transaction.ID_GiaoDich) return undefined;

        firedTransactionRef.current = transaction.ID_GiaoDich;

        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            return undefined;
        }

        const timeouts = [];
        const defaults = {
            zIndex: 1200,
            scalar: 1.08,
            ticks: 220,
            gravity: 0.88,
            drift: 0,
            disableForReducedMotion: true,
        };

        const fire = (options) => {
            confetti({
                ...defaults,
                ...options,
            });
        };

        fire({
            particleCount: 110,
            spread: 82,
            startVelocity: 55,
            origin: { x: 0.16, y: 0.62 },
        });
        fire({
            particleCount: 110,
            spread: 82,
            startVelocity: 55,
            origin: { x: 0.84, y: 0.62 },
        });

        timeouts.push(window.setTimeout(() => {
            fire({
                particleCount: 90,
                spread: 110,
                startVelocity: 48,
                origin: { x: 0.5, y: 0.24 },
            });
        }, 180));

        timeouts.push(window.setTimeout(() => {
            fire({
                particleCount: 70,
                spread: 72,
                angle: 58,
                origin: { x: 0.04, y: 0.7 },
            });
            fire({
                particleCount: 70,
                spread: 72,
                angle: 122,
                origin: { x: 0.96, y: 0.7 },
            });
        }, 420));

        return () => {
            timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
        };
    }, [transaction?.ID_GiaoDich]);

    return (
        <div className="msg-deal-celebration-card">
            <div className="msg-deal-celebration-orb orb-left" aria-hidden="true" />
            <div className="msg-deal-celebration-orb orb-right" aria-hidden="true" />

            <div className="msg-deal-celebration-shell">
                <div className="msg-deal-celebration-hero">
                    <div className="msg-deal-celebration-badge">
                        <BadgeCheck size={16} />
                        <span>Giao dịch thành công</span>
                    </div>
                    <h4>Hai bạn đã chốt đơn thành công</h4>
                    <p>
                        Giao dịch này đã được xác nhận bởi cả người mua lẫn người bán. Deal room giờ chuyển sang chế độ lưu kết quả,
                        để hai bên vẫn xem lại được món đã chốt, thời điểm hoàn tất và điểm hẹn cuối cùng.
                    </p>
                    <div className="msg-deal-celebration-actions">
                        <button
                            type="button"
                            className="msg-deal-btn primary"
                            onClick={onViewPost}
                        >
                            Xem bài đã chốt
                        </button>
                        {meetingMapUrl && (
                            <a
                                href={meetingMapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="msg-deal-btn ghost msg-deal-celebration-link"
                            >
                                Xem lại điểm hẹn
                            </a>
                        )}
                    </div>
                </div>

                <div className="msg-deal-celebration-sheet">
                    <div className="msg-deal-celebration-row">
                        <span>Trạng thái</span>
                        <strong>Đã giao dịch thành công</strong>
                    </div>
                    <div className="msg-deal-celebration-row">
                        <span>Sản phẩm</span>
                        <strong>{post?.title || 'Bài đăng'}</strong>
                    </div>
                    <div className="msg-deal-celebration-row">
                        <span>Mã giao dịch</span>
                        <strong>{transaction?.ID_GiaoDich ? `#${transaction.ID_GiaoDich.slice(0, 8)}` : 'Đã chốt'}</strong>
                    </div>
                    <div className="msg-deal-celebration-row">
                        <span>Hoàn tất lúc</span>
                        <strong>{formatDateTime(transaction?.thoi_gian_hoan_tat)}</strong>
                    </div>
                    <div className="msg-deal-celebration-row">
                        <span>Điểm hẹn cuối</span>
                        <strong>{transaction?.dia_chi_hen_gap || 'Đã xác nhận qua chat'}</strong>
                    </div>
                    <div className="msg-deal-celebration-row">
                        <span>Cặp giao dịch</span>
                        <strong>{buyer?.name} • {seller?.name}</strong>
                    </div>
                </div>
            </div>

                <div className="msg-deal-celebration-people">
                    <div className="msg-deal-celebration-party">
                    <ProfileAvatarLink userId={buyer?.userId}>
                        <img src={buyer?.avatar} alt={buyer?.name} className="msg-deal-celebration-party-avatar" />
                    </ProfileAvatarLink>
                    <div>
                        <span>Người mua</span>
                        <strong>{buyer?.name}</strong>
                    </div>
                </div>
                <div className="msg-deal-celebration-divider">
                    <Handshake size={16} />
                </div>
                <div className="msg-deal-celebration-party">
                    <ProfileAvatarLink userId={seller?.userId}>
                        <img src={seller?.avatar} alt={seller?.name} className="msg-deal-celebration-party-avatar" />
                    </ProfileAvatarLink>
                    <div>
                        <span>Người bán</span>
                        <strong>{seller?.name}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getTransactionMeta(status) {
    return TRANSACTION_STATUS_META[status] || TRANSACTION_STATUS_META.idle;
}

function getPostStatusMeta(status) {
    return POST_STATUS_META[status] || {
        label: 'Chưa rõ',
        hint: 'Trạng thái bài đăng chưa được xác định.',
    };
}

function getDealProgressPosition(status) {
    switch (status) {
    case 'cho_nguoi_ban_xac_nhan':
        return 0;
    case 'nguoi_ban_da_chap_nhan':
        return 1;
    case 'cho_hen_gap':
        return 2;
    case 'cho_xac_nhan_hoan_tat':
        return 3;
    case 'hoan_tat':
        return 4;
    default:
        return 0;
    }
}

function getDealFocusSummary({ transaction, role, activeAcceptedOther }) {
    if (activeAcceptedOther && !transaction) {
        return {
            waitingLabel: 'Đang chờ giao dịch khác kết thúc',
            waitingHint: `Bài đang được giữ cho ${activeAcceptedOther.ten_nguoi_mua || 'người mua khác'}.`,
            nextLabel: 'Tiếp tục nhắn tin hoặc chờ mở lại',
            nextHint: 'Bạn chỉ có thể thao tác lại khi giao dịch kia đóng hoặc bài mở bán trở lại.',
        };
    }

    if (!transaction) {
        return role === 'seller'
            ? {
                waitingLabel: 'Đang chờ người mua mở yêu cầu',
                waitingHint: 'Khi có yêu cầu mới, bạn sẽ thấy nút chấp nhận hoặc từ chối.',
                nextLabel: 'Theo dõi ghi chú của người mua',
                nextHint: 'Phần yêu cầu mua sẽ là nơi người mua để lại ý định chốt đơn.',
            }
            : {
                waitingLabel: 'Chưa có giao dịch được mở',
                waitingHint: 'Bạn cần gửi yêu cầu mua để bắt đầu luồng chốt đơn.',
                nextLabel: 'Gửi yêu cầu mua trong form đỏ',
                nextHint: 'Ghi rõ mong muốn chốt nhanh, thời gian hoặc cách gặp mặt để người bán dễ phản hồi.',
            };
    }

    switch (transaction.trang_thai) {
    case 'cho_nguoi_ban_xac_nhan':
        return role === 'seller'
            ? {
                waitingLabel: 'Đến lượt bạn phản hồi',
                waitingHint: 'Người mua đã gửi yêu cầu và đang chờ quyết định từ người bán.',
                nextLabel: 'Chấp nhận hoặc từ chối yêu cầu',
                nextHint: 'Chấp nhận sẽ chuyển bài sang giữ chỗ cho cuộc chat này.',
            }
            : {
                waitingLabel: 'Đang chờ người bán xác nhận',
                waitingHint: 'Yêu cầu đã được gửi, người bán chưa phản hồi.',
                nextLabel: 'Chờ phản hồi hoặc tự hủy',
                nextHint: 'Nếu đổi ý, bạn có thể hủy yêu cầu ngay trong deal room.',
            };
    case 'nguoi_ban_da_chap_nhan':
        return {
            waitingLabel: 'Hai bên đang ở pha giữ chỗ',
            waitingHint: 'Bài đăng đã được khóa cho cuộc giao dịch hiện tại.',
            nextLabel: 'Chốt điểm hẹn hoặc chuẩn bị hoàn tất',
            nextHint: 'Cập nhật địa chỉ gặp hoặc thời gian giao nhận để tiến tới bước cuối.',
        };
    case 'cho_hen_gap':
        return {
            waitingLabel: 'Đang chờ điểm hẹn rõ ràng',
            waitingHint: 'Hai bên cần thống nhất nơi gặp hoặc mốc thời gian cụ thể.',
            nextLabel: 'Lưu điểm hẹn mới nhất',
            nextHint: 'Thông tin điểm hẹn càng rõ thì xác suất chốt đơn càng cao.',
        };
    case 'cho_xac_nhan_hoan_tat':
    {
        const completionState = transaction.completion_confirmation || {
            sellerConfirmed: false,
            buyerConfirmed: false,
        };
        const sellerDone = completionState.sellerConfirmed;
        const buyerDone = completionState.buyerConfirmed;

        if (sellerDone && buyerDone) {
            return {
                waitingLabel: 'Đang khóa giao dịch để hoàn tất',
                waitingHint: 'Hai bên đã đủ xác nhận và hệ thống đang ghi nhận trạng thái cuối.',
                nextLabel: 'Theo dõi mốc hoàn tất',
                nextHint: 'Bài đăng sẽ được chốt sang đã bán ngay sau khi cập nhật hoàn tất.',
            };
        }

        if (role === 'seller' && !sellerDone) {
            return {
                waitingLabel: 'Đến lượt bạn xác nhận hoàn tất',
                waitingHint: buyerDone
                    ? 'Người mua đã xác nhận xong và đang chờ bạn chốt bước cuối.'
                    : 'Cần thêm xác nhận của người bán để khép giao dịch.',
                nextLabel: 'Xác nhận giao dịch đã xong',
                nextHint: 'Sau khi bạn xác nhận, hệ thống sẽ đánh dấu bài đăng đã bán nếu người mua cũng đã xác nhận.',
            };
        }

        if (role === 'buyer' && !buyerDone) {
            return {
                waitingLabel: 'Đến lượt bạn xác nhận hoàn tất',
                waitingHint: sellerDone
                    ? 'Người bán đã xác nhận xong và đang chờ bạn chốt bước cuối.'
                    : 'Cần thêm xác nhận của người mua để khép giao dịch.',
                nextLabel: 'Xác nhận đã nhận hàng',
                nextHint: 'Sau khi bạn xác nhận, hệ thống sẽ hoàn tất giao dịch nếu người bán cũng đã xác nhận.',
            };
        }

        return {
            waitingLabel: 'Bạn đã xác nhận, đang chờ bên còn lại',
            waitingHint: 'Giao dịch chỉ hoàn tất khi cả người mua và người bán đều đồng ý.',
            nextLabel: 'Theo dõi xác nhận cuối',
            nextHint: 'Khi bên còn lại xác nhận, deal room sẽ tự cập nhật sang hoàn tất.',
        };
    }
    case 'hoan_tat':
        return {
            waitingLabel: 'Không còn bước chờ xử lý',
            waitingHint: 'Giao dịch đã khép lại thành công.',
            nextLabel: 'Xem lại lịch sử hoặc mở giao dịch mới',
            nextHint: 'Deal room vẫn giữ lịch sử để tiện đối chiếu sau này.',
        };
    case 'nguoi_mua_da_huy':
        return {
            waitingLabel: 'Yêu cầu đã bị hủy bởi người mua',
            waitingHint: 'Bài đăng có thể quay lại trạng thái mở bán.',
            nextLabel: 'Tạo yêu cầu mới nếu vẫn muốn mua',
            nextHint: 'Luồng cũ đã đóng, cần mở một yêu cầu mới để tiếp tục.',
        };
    case 'nguoi_ban_da_tu_choi':
        return {
            waitingLabel: 'Người bán đã từ chối yêu cầu',
            waitingHint: 'Cuộc giao dịch này dừng ở bước xác nhận ban đầu.',
            nextLabel: 'Tiếp tục trao đổi hoặc tìm bài khác',
            nextHint: 'Bạn vẫn có thể nhắn tin nhưng không còn giao dịch mở.',
        };
    default:
        return {
            waitingLabel: 'Deal room đang tạm khóa',
            waitingHint: 'Giao dịch này chưa thể thao tác thêm.',
            nextLabel: 'Theo dõi trạng thái mới nhất',
            nextHint: 'Khi trạng thái đổi, các nút hành động sẽ được mở lại tương ứng.',
        };
    }
}

/* ════════ MAIN PAGE ════════ */
export default function Messages() {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedChat, setSelectedChat] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [inputText, setInputText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [error, setError] = useState('');

    // ── Inline search dropdown (left panel) ──
    const [searchFocused, setSearchFocused] = useState(false);
    const [listUserResults, setListUserResults] = useState([]);
    const [listSearching, setListSearching] = useState(false);
    const [listSearchFilter, setListSearchFilter] = useState('all');
    const searchWrapRef = useRef(null);

    // ── Modal new chat (kept as secondary, via pencil icon) ──
    const [showNewChat, setShowNewChat] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [friendIds, setFriendIds] = useState(new Set());
    const [searchFilter, setSearchFilter] = useState('all');

    const messagesEndRef = useRef(null);
    const messagesViewportRef = useRef(null);
    const dealActionPanelRef = useRef(null);
    const socketRef = useRef(null);
    const previousUserIdRef = useRef('');
    const selectedChatRef = useRef(null);
    const activeDealPostIdRef = useRef(null);
    const listSearchInputRef = useRef(null);
    const messageFileInputRef = useRef(null);
    const pendingSelectedUserRef = useRef(location.state?.selectedUser || null);
    const [focusedPostId, setFocusedPostId] = useState(null);
    const [dealContext, setDealContext] = useState(EMPTY_DEAL_CONTEXT);
    const [loadingDeal, setLoadingDeal] = useState(false);
    const [dealActionLoading, setDealActionLoading] = useState('');
    const [dealNotice, setDealNotice] = useState(null);
    const [purchaseNote, setPurchaseNote] = useState('');
    const [showDealReturnButton, setShowDealReturnButton] = useState(false);
    const [showMeetingComposer, setShowMeetingComposer] = useState(false);
    const [meetingDraft, setMeetingDraft] = useState({ address: '', time: '', note: '', lat: null, lng: null });

    const tabs = [
        { key: 'all', label: 'Tất cả' },
        { key: 'unread', label: 'Chưa đọc' },
        { key: 'groups', label: 'Nhóm' },
    ];

    const { userId: myUserId, token, user: currentUser } = useAuthSession();
    const backendOrigin = useMemo(() => {
        try { return new URL(API_BASE_URL).origin; } catch { return 'http://localhost:3000'; }
    }, []);
    const socketUrl = useMemo(() => backendOrigin, [backendOrigin]);
    const getDealRoomStorageKey = useCallback((chatId) => {
        if (!myUserId || !chatId) return '';
        return `${DEAL_ROOM_STORAGE_PREFIX}:${myUserId}:${chatId}`;
    }, [myUserId]);
    const persistDealRoomSelection = useCallback((chatId, postId) => {
        const storageKey = getDealRoomStorageKey(chatId);
        if (!storageKey) return;

        try {
            if (postId) {
                window.localStorage.setItem(storageKey, String(postId));
                return;
            }

            window.localStorage.removeItem(storageKey);
        } catch (storageError) {
            console.warn('Persist deal room selection failed', storageError);
        }
    }, [getDealRoomStorageKey]);
    const restoreDealRoomSelection = useCallback((chatId) => {
        const storageKey = getDealRoomStorageKey(chatId);
        if (!storageKey) return null;

        try {
            return window.localStorage.getItem(storageKey) || null;
        } catch (storageError) {
            console.warn('Restore deal room selection failed', storageError);
            return null;
        }
    }, [getDealRoomStorageKey]);

    const normalizeUploadsUrl = useCallback((raw, uploadsSubPath = '') => {
        if (!raw) return '';
        if (typeof raw === 'string' && raw.startsWith('/uploads/')) {
            return `${backendOrigin}${raw}`;
        }
        if (typeof raw === 'string' && raw.startsWith('uploads/')) {
            return `${backendOrigin}/${raw}`;
        }
        // filename only
        if (typeof raw === 'string' && !raw.startsWith('http://') && !raw.startsWith('https://')) {
            const sub = uploadsSubPath ? `/${uploadsSubPath.replace(/^\/+|\/+$/g, '')}` : '';
            return `${backendOrigin}/uploads${sub}/${raw}`;
        }
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

    const apiFetch = useCallback(async (path, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };
        const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
        return data;
    }, [token]);

    useEffect(() => {
        if (!dealNotice) return undefined;
        const timeoutId = window.setTimeout(() => setDealNotice(null), 4200);
        return () => window.clearTimeout(timeoutId);
    }, [dealNotice]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [chatMessages]);

    const filteredConvs = useMemo(() => {
        let list = conversations;
        if (activeTab === 'unread') list = list.filter(c => (c.unread || 0) > 0);
        if (activeTab === 'groups') list = list.filter(c => c.type === 'group');
        const q = searchQuery.trim().toLowerCase();
        if (q) list = list.filter(c => (c.name || '').toLowerCase().includes(q));
        return list;
    }, [conversations, activeTab, searchQuery]);

    const latestSharedPostMessage = useMemo(
        () => [...chatMessages].reverse().find((msg) => msg.isPostShare && msg.postId) || null,
        [chatMessages],
    );

    const activeDealPostId = focusedPostId || null;

    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

    useEffect(() => {
        if (!selectedChat || selectedChat.type !== 'private') {
            return;
        }

        const persistedPostId = restoreDealRoomSelection(selectedChat.id);
        if (!persistedPostId) {
            return;
        }

        setFocusedPostId((currentValue) => (
            String(currentValue || '') === String(persistedPostId)
                ? currentValue
                : String(persistedPostId)
        ));
    }, [restoreDealRoomSelection, selectedChat]);

    useEffect(() => {
        activeDealPostIdRef.current = activeDealPostId;
    }, [activeDealPostId]);

    const currentDealMeta = useMemo(() => {
        if (!dealContext.currentTransaction && FINAL_POST_STATUSES.includes(dealContext.post?.status)) {
            return {
                label: 'Bài đăng đã kết thúc',
                tone: 'blocked',
                headline: 'Bài đăng này không còn mở để giao dịch',
                description: 'Món hàng đã được đánh dấu hoàn tất, nên hệ thống sẽ không hiện các nút yêu cầu mua hoặc xác nhận mua nữa.',
            };
        }

        if (!dealContext.currentTransaction && dealContext.role === 'viewer' && dealContext.post) {
            return {
                label: 'Chỉ xem thông tin bài đăng',
                tone: 'muted',
                headline: 'Cuộc chat này không phải với đúng người bán của bài đăng',
                description: 'Bạn vẫn xem được thông tin bài chia sẻ, nhưng nút giao dịch chỉ hiện khi đang chat với chủ bài đăng đó.',
            };
        }

        if (dealContext.activeAcceptedOther && !dealContext.currentTransaction) {
            return {
                ...TRANSACTION_STATUS_META.he_thong_da_huy,
                label: 'Đang giữ cho người mua khác',
                tone: 'blocked',
                headline: 'Bài đăng này đang khóa cho một giao dịch khác',
                description: 'Bạn vẫn có thể nhắn tin, nhưng không thể thao tác chốt đơn trên bài đăng này trong cuộc chat hiện tại.',
            };
        }

        return getTransactionMeta(dealContext.currentTransaction?.trang_thai || 'idle');
    }, [dealContext.activeAcceptedOther, dealContext.currentTransaction, dealContext.post, dealContext.role]);

    const dealTimeline = useMemo(
        () => [...(dealContext.currentTransaction?.lich_su_json || [])].reverse().slice(0, 4),
        [dealContext.currentTransaction],
    );

    const completionConfirmation = useMemo(() => {
        const current = dealContext.currentTransaction?.completion_confirmation;
        if (current) return current;

        return {
            sellerConfirmed: false,
            buyerConfirmed: false,
            confirmedByUserIds: [],
            pendingUserIds: [],
            confirmationCount: 0,
            notesByUserId: {},
        };
    }, [dealContext.currentTransaction]);

    const hasCurrentUserConfirmedCompletion = useMemo(
        () => completionConfirmation.confirmedByUserIds.map(String).includes(String(myUserId || '')),
        [completionConfirmation.confirmedByUserIds, myUserId],
    );

    const isWaitingCounterpartyCompletion = Boolean(
        dealContext.currentTransaction?.trang_thai === 'cho_xac_nhan_hoan_tat'
        && hasCurrentUserConfirmedCompletion
        && completionConfirmation.pendingUserIds.length > 0,
    );
    const canConfirmDealCompletion = Boolean(
        dealContext.currentTransaction?.dia_chi_hen_gap
        && dealContext.currentTransaction?.thoi_gian_hen_gap,
    );

    const meetingMapUrl = useMemo(
        () => buildMapLookupUrl(dealContext.currentTransaction),
        [dealContext.currentTransaction],
    );

    const meetingUpdatedByLabel = useMemo(() => {
        const authorId = String(dealContext.currentTransaction?.ID_NguoiTaoHen || '');
        if (!authorId) return 'Chưa rõ';
        if (authorId === String(dealContext.sellerId || '')) return 'Người bán';
        if (authorId === String(dealContext.buyerId || '')) return 'Người mua';
        return 'Đối tác';
    }, [dealContext.buyerId, dealContext.currentTransaction?.ID_NguoiTaoHen, dealContext.sellerId]);

    const completionActionLabel = useMemo(() => {
        if (dealActionLoading === 'requestComplete') return 'Đang ghi nhận...';
        if (hasCurrentUserConfirmedCompletion) {
            return isWaitingCounterpartyCompletion ? 'Bạn đã xác nhận' : 'Đã xác nhận';
        }
        if (completionConfirmation.confirmationCount > 0) {
            return 'Xác nhận cuối để hoàn tất';
        }
        return dealContext.role === 'seller' ? 'Xác nhận giao dịch đã xong' : 'Xác nhận đã nhận hàng';
    }, [
        completionConfirmation.confirmationCount,
        dealActionLoading,
        dealContext.role,
        hasCurrentUserConfirmedCompletion,
        isWaitingCounterpartyCompletion,
    ]);

    const currentPostStatusMeta = useMemo(
        () => getPostStatusMeta(dealContext.post?.status),
        [dealContext.post?.status],
    );

    const dealFocusSummary = useMemo(
        () => getDealFocusSummary({
            transaction: dealContext.currentTransaction,
            role: dealContext.role,
            activeAcceptedOther: dealContext.activeAcceptedOther,
        }),
        [dealContext.activeAcceptedOther, dealContext.currentTransaction, dealContext.role],
    );

    const dealParticipantInfo = useMemo(() => {
        const transaction = dealContext.currentTransaction;
        const sellerName = transaction?.ten_nguoi_ban
            || dealContext.post?.sellerName
            || (dealContext.role === 'buyer' ? selectedChat?.name : currentUser?.ho_ten)
            || 'Người bán';
        const sellerAvatar = normalizeUploadsUrl(
            transaction?.anh_nguoi_ban
                || dealContext.post?.sellerAvatar
                || (dealContext.role === 'buyer' ? selectedChat?.avatar : currentUser?.anh_dai_dien || currentUser?.avatar || ''),
            'avatars',
        ) || avatarFallback(`seller-${dealContext.sellerId || dealContext.post?.authorId || selectedChat?.id}`);

        const buyerName = transaction?.ten_nguoi_mua
            || (dealContext.role === 'seller' ? selectedChat?.name : currentUser?.ho_ten)
            || 'Người mua';
        const buyerAvatar = normalizeUploadsUrl(
            transaction?.anh_nguoi_mua
                || (dealContext.role === 'seller' ? selectedChat?.avatar : currentUser?.anh_dai_dien || currentUser?.avatar || ''),
            'avatars',
        ) || avatarFallback(`buyer-${dealContext.buyerId || selectedChat?.id || 'current'}`);

        return {
            seller: {
                label: 'Người bán',
                name: sellerName,
                avatar: sellerAvatar,
                userId: dealContext.sellerId,
                isMe: dealContext.role === 'seller',
            },
            buyer: {
                label: 'Người mua',
                name: buyerName,
                avatar: buyerAvatar,
                userId: dealContext.buyerId,
                isMe: dealContext.role === 'buyer',
            },
        };
    }, [
        currentUser?.anh_dai_dien,
        currentUser?.avatar,
        currentUser?.ho_ten,
        dealContext.buyerId,
        dealContext.currentTransaction,
        dealContext.post?.authorId,
        dealContext.post?.sellerAvatar,
        dealContext.post?.sellerName,
        dealContext.role,
        dealContext.sellerId,
        normalizeUploadsUrl,
        selectedChat?.avatar,
        selectedChat?.id,
        selectedChat?.name,
    ]);

    const completionActors = useMemo(() => [
        {
            key: 'seller',
            label: 'Người bán',
            name: dealParticipantInfo.seller.name,
            avatar: dealParticipantInfo.seller.avatar,
            userId: dealContext.sellerId,
            confirmed: completionConfirmation.sellerConfirmed,
        },
        {
            key: 'buyer',
            label: 'Người mua',
            name: dealParticipantInfo.buyer.name,
            avatar: dealParticipantInfo.buyer.avatar,
            userId: dealContext.buyerId,
            confirmed: completionConfirmation.buyerConfirmed,
        },
    ], [
        completionConfirmation.buyerConfirmed,
        completionConfirmation.sellerConfirmed,
        dealContext.buyerId,
        dealContext.sellerId,
        dealParticipantInfo.buyer.avatar,
        dealParticipantInfo.buyer.name,
        dealParticipantInfo.seller.avatar,
        dealParticipantInfo.seller.name,
    ]);

    const competingRequestCount = useMemo(
        () => dealContext.transactions.filter((transaction) => {
            if (dealContext.currentTransaction && transaction.ID_GiaoDich === dealContext.currentTransaction.ID_GiaoDich) {
                return false;
            }

            return OPEN_DEAL_STATUSES.includes(transaction.trang_thai);
        }).length,
        [dealContext.currentTransaction, dealContext.transactions],
    );

    const dealInsightCards = useMemo(() => [
        {
            label: 'Trạng thái bài đăng',
            value: currentPostStatusMeta.label,
            hint: currentPostStatusMeta.hint,
        },
        {
            label: 'Ai đang chờ ai',
            value: dealFocusSummary.waitingLabel,
            hint: dealFocusSummary.waitingHint,
        },
        {
            label: 'Bước tiếp theo',
            value: dealFocusSummary.nextLabel,
            hint: dealFocusSummary.nextHint,
        },
        {
            label: 'Yêu cầu cạnh tranh',
            value: competingRequestCount > 0 ? `${competingRequestCount} đang mở` : 'Không có',
            hint: competingRequestCount > 0
                ? 'Còn các yêu cầu khác trên cùng bài đăng đang chờ hoặc đang được xử lý.'
                : 'Cuộc chat này hiện không phải cạnh tranh với yêu cầu mở nào khác.',
        },
    ], [competingRequestCount, currentPostStatusMeta.hint, currentPostStatusMeta.label, dealFocusSummary.nextHint, dealFocusSummary.nextLabel, dealFocusSummary.waitingHint, dealFocusSummary.waitingLabel]);

    const dealProgressSteps = useMemo(() => {
        const status = dealContext.currentTransaction?.trang_thai || null;
        const isClosedDeal = ['nguoi_mua_da_huy', 'nguoi_ban_da_tu_choi', 'he_thong_da_huy', 'het_han'].includes(status);
        const progressPosition = getDealProgressPosition(status);

        return DEAL_PROGRESS_STEPS.map((step, index) => {
            let state = 'upcoming';

            if (status === 'hoan_tat') {
                state = 'done';
            } else if (isClosedDeal) {
                state = index === 0 ? 'done' : 'muted';
            } else if (index < progressPosition) {
                state = 'done';
            } else if (index === progressPosition) {
                state = 'current';
            }

            return {
                ...step,
                state,
            };
        });
    }, [dealContext.currentTransaction?.trang_thai]);

    const resetDealStage = useCallback(() => {
        setDealContext(EMPTY_DEAL_CONTEXT);
        setPurchaseNote('');
        setShowMeetingComposer(false);
        setMeetingDraft({ address: '', time: '', note: '', lat: null, lng: null });
    }, []);

    useEffect(() => {
        const previousUserId = previousUserIdRef.current;
        const hasUserSwitched = previousUserId && previousUserId !== myUserId;

        if (!myUserId || hasUserSwitched) {
            setSelectedChat(null);
            setConversations([]);
            setChatMessages([]);
            setSearchQuery('');
            setError('');
            setFocusedPostId(null);
            resetDealStage();
        }

        previousUserIdRef.current = myUserId;
    }, [myUserId, resetDealStage]);

    const loadDealContext = useCallback(async (postId, conversation) => {
        if (!postId || !conversation || conversation.type !== 'private' || !myUserId) {
            resetDealStage();
            return;
        }

        setLoadingDeal(true);

        try {
            const [postResponse, transactionResponse] = await Promise.all([
                apiFetch(`/baidang/getByIdWithDetails/${postId}`),
                apiFetch(`/giaodich_baidang/post/${postId}`),
            ]);

            const rawPost = postResponse?.data || null;
            const rawTransactions = Array.isArray(transactionResponse?.data) ? transactionResponse.data : [];

            if (!rawPost) {
                setDealContext(EMPTY_DEAL_CONTEXT);
                return;
            }

            const imageList = Array.isArray(rawPost.DanhSachAnh) ? rawPost.DanhSachAnh : [];
            const post = {
                id: rawPost.ID_BaiDang,
                title: rawPost.tieu_de || 'Bài đăng',
                price: rawPost.gia,
                location: rawPost.vi_tri || 'Chưa có vị trí',
                authorId: rawPost.ID_NguoiDung,
                image: normalizeUploadsUrl(imageList[0] || ''),
                status: rawPost.trang_thai || 'dang_ban',
                sellerName: rawPost.TenNguoiDung || 'Người bán',
                sellerAvatar: normalizeUploadsUrl(rawPost.anh_dai_dien || '', 'avatars'),
                category: rawPost.TenDanhMuc || 'Bài đăng',
                typeLabel: rawPost.TenLoaiBaiDang || '',
            };

            let role = 'viewer';
            let buyerId = null;
            const sellerId = rawPost.ID_NguoiDung;

            if (String(sellerId) === String(myUserId) && String(conversation.id) !== String(sellerId)) {
                role = 'seller';
                buyerId = conversation.id;
            } else if (String(sellerId) === String(conversation.id)) {
                role = 'buyer';
                buyerId = myUserId;
            }

            const buyerTransactions = buyerId
                ? rawTransactions.filter(
                    (transaction) => String(transaction.ID_NguoiBan) === String(sellerId)
                        && String(transaction.ID_NguoiMua) === String(buyerId),
                )
                : [];

            const openTransaction = buyerTransactions.find(
                (transaction) => OPEN_DEAL_STATUSES.includes(transaction.trang_thai),
            ) || null;
            const completedTransaction = buyerTransactions.find(
                (transaction) => transaction.trang_thai === 'hoan_tat',
            ) || null;
            const currentTransaction = openTransaction
                || (FINAL_POST_STATUSES.includes(post.status) ? completedTransaction : null);

            const activeAcceptedOther = rawTransactions.find(
                (transaction) => ACTIVE_ACCEPTED_STATUSES.includes(transaction.trang_thai)
                    && (!buyerId || String(transaction.ID_NguoiMua) !== String(buyerId)),
            ) || null;

            setDealContext({
                post,
                transactions: rawTransactions,
                currentTransaction,
                activeAcceptedOther,
                role,
                buyerId,
                sellerId,
            });

            setMeetingDraft({
                address: currentTransaction?.dia_chi_hen_gap || '',
                time: toDateTimeLocalValue(currentTransaction?.thoi_gian_hen_gap),
                note: currentTransaction?.ghi_chu_hen_gap || '',
                lat: currentTransaction?.vi_do_hen_gap ? Number(currentTransaction.vi_do_hen_gap) : null,
                lng: currentTransaction?.kinh_do_hen_gap ? Number(currentTransaction.kinh_do_hen_gap) : null,
            });
        } catch (loadError) {
            console.error('Load deal context failed', loadError);
            setDealContext(EMPTY_DEAL_CONTEXT);
        } finally {
            setLoadingDeal(false);
        }
    }, [apiFetch, myUserId, normalizeUploadsUrl, resetDealStage]);

    const loadConversations = useCallback(async () => {
        if (!myUserId) return;
        setLoadingConvs(true);
        setError('');
        try {
            const res = await apiFetch(`/tinnhan/conversations/${myUserId}`);
            const rows = res?.data || [];
            const mapped = rows.map((c) => {
                const rawLastMessage = c.last_message || '';
                const postSharePayload = parsePostSharePayload(rawLastMessage);
                const isPostShare = isPostShareMessage(postSharePayload.cleanText || rawLastMessage);

                return {
                    id: c.conversation_id,
                    type: c.conversation_type, // private | group
                    name: c.conversation_name || 'Unknown',
                    avatar: normalizeUploadsUrl(c.conversation_avatar) || avatarFallback(c.conversation_id),
                    lastMsg: isPostShare
                        ? (postSharePayload.title ? `Đã chia sẻ bài: ${postSharePayload.title}` : 'Đã chia sẻ một bài đăng')
                        : (postSharePayload.cleanText || rawLastMessage),
                    lastAt: c.last_message_time ? new Date(c.last_message_time) : null,
                    unread: c.unread_count || 0,
                    online: false, // will update via socket events later
                };
            });
            setConversations(mapped);
            if (!selectedChat && mapped.length > 0) {
                setSelectedChat(mapped[0]);
            }
        } catch (e) {
            console.error('Load conversations failed', e);
            setError('Không thể tải danh sách chat. Kiểm tra backend/API_BASE_URL.');
            setConversations([]);
        } finally {
            setLoadingConvs(false);
        }
    }, [apiFetch, myUserId, normalizeUploadsUrl, selectedChat]);

    const loadMessages = useCallback(async (conv) => {
        if (!conv || !myUserId) return;
        setLoadingMsgs(true);
        setError('');
        try {
            if (conv.type === 'group') {
                // TODO: group chat UI
                setChatMessages([{ id: 'sys', sender: 'system', text: 'Group chat (đang phát triển)', time: '' }]);
                return;
            }
            const res = await apiFetch(`/tinnhan/private/${myUserId}/${conv.id}?limit=50&offset=0`);
            const rows = res?.data || [];
            const msgs = rows
                .slice()
                .reverse()
                .map((m) => {
                    const isMine = m.ID_NguoiGui === myUserId;
                    const rawText = m.noi_dung || '';
                    const postSharePayload = parsePostSharePayload(rawText);
                    const text = postSharePayload.cleanText || rawText;
                    const time = m.thoi_gian_gui
                        ? new Date(m.thoi_gian_gui).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : '';
                    const file = m.file_dinh_kem ? normalizeUploadsUrl(m.file_dinh_kem, 'messages') : '';
                    const postShare = isPostShareMessage(text);
                    const postImage = postShare ? normalizeUploadsUrl(postSharePayload.postImage || extractPostShareImage(rawText)) : '';
                    const location = extractLocationPayload(text);
                    return {
                        id: m.ID_TinNhan,
                        sender: isMine ? 'me' : 'them',
                        text,
                        time,
                        image: file || '',
                        location,
                        isPostShare: postShare,
                        postTitle: postShare ? (postSharePayload.title || extractPostShareTitle(rawText)) : '',
                        postId: postShare ? (postSharePayload.postId || extractPostShareId(rawText) || null) : null,
                        postImage,
                    };
                });
            setChatMessages(msgs.length ? msgs : [{ id: 'start', sender: 'system', text: 'Bắt đầu cuộc trò chuyện! 👋', time: '' }]);
        } catch (e) {
            console.error('Load messages failed', e);
            setError('Không thể tải tin nhắn.');
            setChatMessages([{ id: 'start', sender: 'system', text: 'Không thể tải tin nhắn. Thử lại sau.', time: '' }]);
        } finally {
            setLoadingMsgs(false);
        }
    }, [apiFetch, myUserId, normalizeUploadsUrl]);

    const handleSelectChat = useCallback((conv) => {
        setSelectedChat(conv);
        setFocusedPostId(null);
        setDealNotice(null);
        setShowMeetingComposer(false);
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
        loadMessages(conv);
        // join socket room for realtime
        if (socketRef.current?.connected && conv.type === 'private') {
            socketRef.current.emit('join_chat', { userId: myUserId, chatType: 'private', chatId: conv.id });
            socketRef.current.emit('mark_read', { userId: myUserId, chatType: 'private', chatId: conv.id });
        }
    }, [loadMessages, myUserId]);

    // initial load
    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        if (!selectedChat || loadingMsgs || chatMessages.length > 0) return;
        loadMessages(selectedChat);
    }, [chatMessages.length, loadMessages, loadingMsgs, selectedChat]);

    useEffect(() => {
        const pending = pendingSelectedUserRef.current;
        if (!pending || loadingConvs || !myUserId) return;

        const existing = conversations.find(
            (conv) => conv.type === 'private' && String(conv.id) === String(pending.id),
        );

        const nextConv = existing || {
            id: pending.id,
            type: 'private',
            name: pending.name || 'Người dùng',
            avatar: pending.avatar || avatarFallback(pending.id),
            lastMsg: '',
            lastAt: null,
            unread: 0,
            online: false,
        };

        if (!selectedChat || String(selectedChat.id) !== String(nextConv.id)) {
            handleSelectChat(nextConv);
        }

        pendingSelectedUserRef.current = null;
        if (location.state?.selectedUser) {
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [conversations, handleSelectChat, loadingConvs, location.pathname, location.state, myUserId, navigate, selectedChat]);

    useEffect(() => {
        if (!selectedChat || selectedChat.type !== 'private') {
            resetDealStage();
            return;
        }

        if (!activeDealPostId) {
            setDealContext(EMPTY_DEAL_CONTEXT);
            return;
        }

        loadDealContext(activeDealPostId, selectedChat);
    }, [activeDealPostId, loadDealContext, resetDealStage, selectedChat]);

    // socket connect
    useEffect(() => {
        if (!myUserId || !token) return;

        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        const s = io(socketUrl, {
            transports: ['websocket'],
            auth: {
                token,
            },
        });
        socketRef.current = s;

        s.on('connect', () => {
            s.emit('user_login', { userId: myUserId });
            const currentChat = selectedChatRef.current;
            if (currentChat?.type === 'private') {
                s.emit('join_chat', { userId: myUserId, chatType: 'private', chatId: currentChat.id });
            }
        });

        s.on('friend_status_change', (data) => {
            const { userId, status } = data || {};
            if (!userId) return;
            setConversations(prev => prev.map(c => (c.type === 'private' && c.id === userId ? { ...c, online: status === 'online' } : c)));
        });

        s.on('new_message', (payload) => {
            if (!payload || payload.type !== 'private') return;
            const m = payload.message;
            if (!m) return;

            const otherId = m.ID_NguoiGui === myUserId ? m.ID_NguoiNhan : m.ID_NguoiGui;
            const currentChat = selectedChatRef.current;
            const isCurrentChatOpen = currentChat?.type === 'private' && String(currentChat.id) === String(otherId);
            const rawText = m.noi_dung || '';
            const postSharePayload = parsePostSharePayload(rawText);
            const text = postSharePayload.cleanText || rawText;
            const time = m.thoi_gian_gui
                ? new Date(m.thoi_gian_gui).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '';
            const img = m.file_dinh_kem ? normalizeUploadsUrl(m.file_dinh_kem, 'messages') : '';
            const postShare = isPostShareMessage(text);
            const postImage = postShare ? normalizeUploadsUrl(postSharePayload.postImage || extractPostShareImage(rawText)) : '';
            const location = extractLocationPayload(text);
            const lastAt = m.thoi_gian_gui ? new Date(m.thoi_gian_gui) : new Date();

            setConversations((prev) => {
                const existingIndex = prev.findIndex((conversation) => (
                    conversation.type === 'private' && String(conversation.id) === String(otherId)
                ));

                const existingConversation = existingIndex >= 0 ? prev[existingIndex] : null;
                const nextConversation = {
                    id: otherId,
                    type: 'private',
                    name: existingConversation?.name
                        || (String(m.ID_NguoiGui) === String(myUserId) ? currentChat?.name : m.ten_nguoi_gui)
                        || 'Người dùng',
                    avatar: existingConversation?.avatar
                        || (String(m.ID_NguoiGui) === String(myUserId) ? currentChat?.avatar : normalizeUploadsUrl(m.anh_nguoi_gui))
                        || avatarFallback(otherId),
                    lastMsg: postShare ? (postSharePayload.title ? `Đã chia sẻ bài: ${postSharePayload.title}` : 'Đã chia sẻ một bài đăng') : text,
                    lastAt,
                    unread: isCurrentChatOpen || String(m.ID_NguoiGui) === String(myUserId)
                        ? 0
                        : (existingConversation?.unread || 0) + 1,
                    online: existingConversation?.online || false,
                };

                if (existingIndex === -1) {
                    return [nextConversation, ...prev];
                }

                const nextList = [...prev];
                nextList.splice(existingIndex, 1);
                return [nextConversation, ...nextList];
            });

            // update messages if current chat is open with this user
            if (isCurrentChatOpen) {
                const msg = {
                    id: m.ID_TinNhan,
                    sender: m.ID_NguoiGui === myUserId ? 'me' : 'them',
                    text,
                    time,
                    image: img,
                    location,
                    isPostShare: postShare,
                    postTitle: postShare ? (postSharePayload.title || extractPostShareTitle(rawText)) : '',
                    postId: postShare ? (postSharePayload.postId || extractPostShareId(rawText) || null) : null,
                    postImage,
                };
                setChatMessages(prev => {
                    // Nếu là tin nhắn của mình, tìm tin nhắn tạm trùng nội dung để thay thế
                    if (m.ID_NguoiGui === myUserId) {
                        const tempIdx = prev.findIndex(x => x.sender === 'me' && x.id.toString().startsWith('temp_') && x.text === msg.text);
                        if (tempIdx !== -1) {
                            const updated = [...prev];
                            const tempMessage = updated[tempIdx];
                            updated[tempIdx] = {
                                ...msg,
                                isPostShare: tempMessage.isPostShare || msg.isPostShare,
                                postTitle: tempMessage.postTitle || msg.postTitle,
                                postId: tempMessage.postId || msg.postId,
                                postImage: tempMessage.postImage || msg.postImage,
                            };
                            return updated;
                        }
                    }
                    // Tránh duplicate nếu nhận lại tin nhắn đã có ID thật
                    if (prev.some(x => x.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                s.emit('mark_read', { userId: myUserId, chatType: 'private', chatId: otherId });
            }
        });

        s.on('deal_transaction_updated', (payload) => {
            if (!payload?.postId || !payload?.sellerId || !payload?.buyerId) return;

            const currentChat = selectedChatRef.current;
            if (!currentChat || currentChat.type !== 'private') return;

            const participantIds = [String(payload.sellerId), String(payload.buyerId)];
            const isCurrentConversationRelated =
                participantIds.includes(String(myUserId))
                && participantIds.includes(String(currentChat.id));

            if (!isCurrentConversationRelated) return;

            const currentDealPostId = activeDealPostIdRef.current;

            if (!currentDealPostId) {
                setDealNotice({
                    type: 'success',
                    text: 'Giao dịch vừa cập nhật. Bấm "Chốt đơn hàng" trong tin nhắn bài đăng nếu bạn muốn mở deal room.',
                });
                loadConversations();
                return;
            }

            if (String(currentDealPostId) !== String(payload.postId)) {
                setDealNotice({
                    type: 'success',
                    text: DEAL_SOCKET_NOTICE_LABELS[payload.action] || 'Giao dịch ở bài khác vừa được cập nhật.',
                });
                loadConversations();
                return;
            }

            loadDealContext(payload.postId, currentChat);
            loadConversations();
            setDealNotice({
                type: 'success',
                text: DEAL_SOCKET_NOTICE_LABELS[payload.action] || 'Trạng thái giao dịch vừa được cập nhật.',
            });
        });

        s.on('deal_room_opened', (payload) => {
            if (!payload?.postId || !payload?.senderId || !payload?.receiverId) return;

            const currentChat = selectedChatRef.current;
            if (!currentChat || currentChat.type !== 'private') return;

            const participantIds = [String(payload.senderId), String(payload.receiverId)];
            const isCurrentConversationRelated =
                participantIds.includes(String(myUserId))
                && participantIds.includes(String(currentChat.id));

            if (!isCurrentConversationRelated) return;

            setFocusedPostId(String(payload.postId));
            persistDealRoomSelection(currentChat.id, payload.postId);
            setDealNotice({
                type: 'success',
                text: 'Deal room vừa được mở từ tin nhắn bài đăng.',
            });
        });

        s.on('connect_error', (e) => {
            console.error('Socket connect error', e?.message || e);
        });

        return () => {
            s.disconnect();
        };
    }, [loadConversations, loadDealContext, myUserId, normalizeUploadsUrl, socketUrl, token]);

    useEffect(() => {
        if (!myUserId || !selectedChat || selectedChat.type !== 'private' || !socketRef.current?.connected) {
            return;
        }

        socketRef.current.emit('join_chat', {
            userId: myUserId,
            chatType: 'private',
            chatId: selectedChat.id,
        });
        socketRef.current.emit('mark_read', {
            userId: myUserId,
            chatType: 'private',
            chatId: selectedChat.id,
        });
    }, [myUserId, selectedChat]);

    // Load friend list on mount (used for both inline search and modal)
    useEffect(() => {
        if (!myUserId) return;
        apiFetch(`/quanHeBanBe/list/${myUserId}`)
            .then((res) => {
                const rows = res?.data || res || [];
                const ids = new Set(rows.map((f) => f.ID_NguoiDung || f.friend_id || f.id).filter(Boolean));
                setFriendIds(ids);
            })
            .catch(() => setFriendIds(new Set()));
    }, [myUserId, apiFetch]);

    // ── Inline search: trigger on searchQuery ──
    useEffect(() => {
        const q = searchQuery.trim();
        if (!q || !myUserId) {
            setListUserResults([]);
            setListSearchFilter('all');
            return;
        }

        const t = setTimeout(async () => {
            setListSearching(true);
            try {
                const res = await apiFetch(`/nguoidung/search?tuKhoa=${encodeURIComponent(q)}&idNguoiDungHienTai=${encodeURIComponent(myUserId)}`);
                const rows = res?.data || res || [];
                const mapped = rows.map((u) => ({
                    id: u.ID_NguoiDung,
                    name: u.ho_ten || 'Người dùng',
                    email: u.email || '',
                    avatar: normalizeUploadsUrl(u.anh_dai_dien) || avatarFallback(u.ID_NguoiDung),
                    school: u.truong_hoc || '',
                    hometown: u.que_quan || '',
                    isFriend: friendIds.has(u.ID_NguoiDung),
                }));
                setListUserResults(mapped);
            } catch (e) {
                console.error('Inline search failed', e);
                setListUserResults([]);
            } finally {
                setListSearching(false);
            }
        }, 400);

        return () => clearTimeout(t);
    }, [searchQuery, myUserId, apiFetch, normalizeUploadsUrl, friendIds]);

    // ── Close inline dropdown when clicking outside ──
    useEffect(() => {
        const handle = (e) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // ── Modal search (pencil icon) ──
    useEffect(() => {
        if (!showNewChat) return;
        const q = userSearch.trim();
        if (!q || !myUserId) {
            setUserResults([]);
            return;
        }

        const t = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const res = await apiFetch(`/nguoidung/search?tuKhoa=${encodeURIComponent(q)}&idNguoiDungHienTai=${encodeURIComponent(myUserId)}`);
                const rows = res?.data || res || [];
                const mapped = rows.map((u) => ({
                    id: u.ID_NguoiDung,
                    name: u.ho_ten || 'Người dùng',
                    email: u.email || '',
                    avatar: normalizeUploadsUrl(u.anh_dai_dien) || avatarFallback(u.ID_NguoiDung),
                    school: u.truong_hoc || '',
                    hometown: u.que_quan || '',
                    isFriend: friendIds.has(u.ID_NguoiDung),
                }));
                setUserResults(mapped);
            } catch (e) {
                console.error('Modal user search failed', e);
                setUserResults([]);
            } finally {
                setSearchingUsers(false);
            }
        }, 450);

        return () => clearTimeout(t);
    }, [showNewChat, userSearch, myUserId, apiFetch, normalizeUploadsUrl, friendIds]);

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) return;

        try {
            await apiFetch(`/tinnhan/delete/${msgId}`, {
                method: 'DELETE',
                body: JSON.stringify({ userId: myUserId })
            });

            // Update local state
            setChatMessages(prev => prev.filter(m => m.id !== msgId));

            // Optionally notify via socket if backend doesn't broadcast it
            if (socketRef.current?.connected) {
                socketRef.current.emit('delete_message', { msgId, chatId: selectedChat.id });
            }
        } catch (e) {
            console.error('Delete message failed', e);
            alert('Không thể xóa tin nhắn. Vui lòng thử lại.');
        }
    };

    const handleDeleteConversation = async () => {
        if (!selectedChat) return;
        if (selectedChat.type !== 'private') {
            alert('Hiện tại chỉ hỗ trợ xóa cuộc trò chuyện cá nhân.');
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện với ${selectedChat.name}? Hành động này không thể hoàn tác.`)) return;

        try {
            await apiFetch(`/tinnhan/delete-conversation/${myUserId}/${selectedChat.id}`, {
                method: 'DELETE'
            });

            // Update local state
            setConversations(prev => prev.filter(c => c.id !== selectedChat.id));
            setSelectedChat(null);
            setChatMessages([]);

            if (socketRef.current?.connected) {
                socketRef.current.emit('delete_conversation', { userId: myUserId, otherUserId: selectedChat.id });
            }
        } catch (e) {
            console.error('Delete conversation failed', e);
            alert('Không thể xóa cuộc trò chuyện. Vui lòng thử lại.');
        }
    };

    const sendMessageWithOptimistic = useCallback(async (payload, optimisticMessage) => {
        setChatMessages((prev) => [...prev, optimisticMessage]);

        if (socketRef.current?.connected) {
            socketRef.current.emit('send_message', payload);
            return;
        }

        try {
            const response = await apiFetch('/tinnhan/send', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const serverMessage = response?.data;
            if (!serverMessage?.ID_TinNhan) return;

            setChatMessages((prev) => prev.map((msg) => (
                msg.id === optimisticMessage.id
                    ? {
                        ...msg,
                        id: serverMessage.ID_TinNhan,
                        time: serverMessage.thoi_gian_gui
                            ? new Date(serverMessage.thoi_gian_gui).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                            : msg.time,
                    }
                    : msg
            )));
        } catch (sendError) {
            console.error('Send message HTTP failed', sendError);
        }
    }, [apiFetch]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        if (!selectedChat || selectedChat.type !== 'private') return;
        const newMsg = {
            id: `temp_${Date.now()}`,
            text: inputText.trim(),
            sender: 'me',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            image: '',
            isPostShare: false,
            postTitle: '',
            postId: null,
            postImage: '',
        };
        setInputText('');

        const payload = {
            ID_NguoiNhan: selectedChat.id,
            noi_dung: newMsg.text,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
        };

        sendMessageWithOptimistic(payload, newMsg);
    };

    const handleShareLocation = useCallback(() => {
        if (!selectedChat || selectedChat.type !== 'private') return;

        if (!navigator.geolocation) {
            window.alert('Trình duyệt này chưa hỗ trợ lấy vị trí.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                const locationText = `📍 Vị trí GPS: https://www.google.com/maps?q=${latitude},${longitude}`;
                const optimisticMessage = {
                    id: `temp_location_${Date.now()}`,
                    sender: 'me',
                    text: locationText,
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    image: '',
                    location: { lat: latitude, lng: longitude },
                    isPostShare: false,
                    postTitle: '',
                    postId: null,
                    postImage: '',
                };

                sendMessageWithOptimistic({
                    ID_NguoiNhan: selectedChat.id,
                    noi_dung: locationText,
                    loai_tin_nhan: 'text',
                    file_dinh_kem: null,
                    tin_nhan_phu_thuoc: null,
                }, optimisticMessage);
            },
            () => {
                window.alert('Không lấy được vị trí hiện tại. Hãy kiểm tra quyền truy cập vị trí.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            },
        );
    }, [selectedChat, sendMessageWithOptimistic]);

    const handleOpenImagePicker = useCallback(() => {
        messageFileInputRef.current?.click();
    }, []);

    const handleImageFileChange = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file || !selectedChat || selectedChat.type !== 'private' || !token) {
            if (event.target) {
                event.target.value = '';
            }
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('ID_NguoiNhan', selectedChat.id);
        formData.append('noi_dung', '');

        try {
            const response = await fetch(`${API_BASE_URL}/tinnhan/upload-and-send`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.message || 'Không gửi được ảnh.');
            }

            const serverMessage = payload?.data?.message;
            if (!socketRef.current?.connected && serverMessage) {
                setChatMessages((prev) => [
                    ...prev,
                    {
                        id: serverMessage.ID_TinNhan,
                        sender: 'me',
                        text: serverMessage.noi_dung || '',
                        time: serverMessage.thoi_gian_gui
                            ? new Date(serverMessage.thoi_gian_gui).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                            : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                        image: serverMessage.file_dinh_kem ? normalizeUploadsUrl(serverMessage.file_dinh_kem, 'messages') : '',
                        location: null,
                        isPostShare: false,
                        postTitle: '',
                        postId: null,
                        postImage: '',
                    },
                ]);
            }
        } catch (uploadError) {
            console.error('Upload image message failed', uploadError);
            window.alert(uploadError.message || 'Không gửi được ảnh.');
        } finally {
            if (event.target) {
                event.target.value = '';
            }
        }
    }, [normalizeUploadsUrl, selectedChat, token]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const openDealRoom = useCallback((postId, options = {}) => {
        if (!postId || !selectedChat || selectedChat.type !== 'private') return;

        const { broadcast = true } = options;
        setFocusedPostId(String(postId));
        persistDealRoomSelection(selectedChat.id, postId);
        setDealNotice(null);

        if (broadcast && socketRef.current?.connected) {
            socketRef.current.emit('open_deal_room', {
                chatType: 'private',
                chatId: selectedChat.id,
                postId,
            });
        }
    }, [persistDealRoomSelection, selectedChat]);

    const refreshDealContext = useCallback(async () => {
        if (!selectedChat || !activeDealPostId) return;
        await loadDealContext(activeDealPostId, selectedChat);
        await loadConversations();
    }, [activeDealPostId, loadConversations, loadDealContext, selectedChat]);

    const runDealAction = useCallback(async (actionKey, path, body, options = {}) => {
        setDealActionLoading(actionKey);
        setDealNotice(null);

        try {
            const response = await apiFetch(path, {
                method: 'POST',
                body: JSON.stringify(body),
            });

            await refreshDealContext();

            if (options.resetPurchaseNote) {
                setPurchaseNote('');
            }

            if (options.closeMeetingComposer) {
                setShowMeetingComposer(false);
            }

            setDealNotice({
                type: 'success',
                text: response?.message || 'Đã cập nhật giao dịch.',
            });
        } catch (actionError) {
            console.error('Deal action failed', actionError);
            setDealNotice({
                type: 'error',
                text: actionError.message || 'Không thể cập nhật giao dịch.',
            });
        } finally {
            setDealActionLoading('');
        }
    }, [apiFetch, refreshDealContext]);

    const handleCreateRequest = useCallback(() => {
        if (!activeDealPostId || dealContext.role !== 'buyer') return;

        runDealAction('request', '/giaodich_baidang/request', {
            ID_BaiDang: activeDealPostId,
            ghi_chu_nguoi_mua: purchaseNote.trim() || null,
            ID_TinNhanKhoiTao: latestSharedPostMessage?.id?.toString().startsWith('temp_') ? null : latestSharedPostMessage?.id || null,
        }, { resetPurchaseNote: true });
    }, [activeDealPostId, dealContext.role, latestSharedPostMessage?.id, purchaseNote, runDealAction]);

    const handleAcceptDeal = useCallback(() => {
        if (!dealContext.currentTransaction) return;
        runDealAction('accept', `/giaodich_baidang/${dealContext.currentTransaction.ID_GiaoDich}/accept`, {});
    }, [dealContext.currentTransaction, runDealAction]);

    const handleRejectDeal = useCallback(() => {
        if (!dealContext.currentTransaction) return;
        runDealAction('reject', `/giaodich_baidang/${dealContext.currentTransaction.ID_GiaoDich}/reject`, {
            lyDo: 'Người bán chưa sẵn sàng chốt giao dịch này.',
        });
    }, [dealContext.currentTransaction, runDealAction]);

    const handleCancelDeal = useCallback(() => {
        if (!dealContext.currentTransaction) return;
        runDealAction('cancel', `/giaodich_baidang/${dealContext.currentTransaction.ID_GiaoDich}/cancel`, {
            lyDo: dealContext.role === 'buyer'
                ? 'Người mua chủ động hủy yêu cầu.'
                : 'Người bán chủ động đóng giao dịch.',
        }, { closeMeetingComposer: true });
    }, [dealContext.currentTransaction, dealContext.role, runDealAction]);

    const handleSubmitMeeting = useCallback(() => {
        if (!dealContext.currentTransaction) return;
        if (!meetingDraft.address.trim()) {
            setDealNotice({ type: 'error', text: 'Hãy chọn điểm hẹn trên bản đồ hoặc từ ô tìm kiếm trước khi lưu.' });
            return;
        }

        if (!meetingDraft.time) {
            setDealNotice({ type: 'error', text: 'Chọn thời gian hẹn gặp trước khi lưu điểm hẹn.' });
            return;
        }

        runDealAction('meeting', `/giaodich_baidang/${dealContext.currentTransaction.ID_GiaoDich}/meeting`, {
            dia_chi_hen_gap: meetingDraft.address.trim(),
            vi_do_hen_gap: meetingDraft.lat,
            kinh_do_hen_gap: meetingDraft.lng,
            ghi_chu_hen_gap: meetingDraft.note.trim() || null,
            thoi_gian_hen_gap: toMySqlDateTime(meetingDraft.time),
        }, { closeMeetingComposer: true });
    }, [dealContext.currentTransaction, meetingDraft.address, meetingDraft.lat, meetingDraft.lng, meetingDraft.note, meetingDraft.time, runDealAction]);

    const handleRequestComplete = useCallback(() => {
        if (!dealContext.currentTransaction) return;
        runDealAction('requestComplete', `/giaodich_baidang/${dealContext.currentTransaction.ID_GiaoDich}/request-complete`, {
            note: dealContext.role === 'seller'
                ? 'Người bán xác nhận đã giao dịch xong.'
                : 'Người mua xác nhận đã nhận hàng.',
        });
    }, [dealContext.currentTransaction, dealContext.role, runDealAction]);

    const scrollToDealActionPanel = useCallback(() => {
        dealActionPanelRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, []);

    const showBuyerRequestComposer = dealContext.role === 'buyer'
        && !dealContext.currentTransaction
        && !dealContext.activeAcceptedOther
        && !FINAL_POST_STATUSES.includes(dealContext.post?.status)
        && Boolean(activeDealPostId);
    const showSellerApprovalActions = dealContext.role === 'seller'
        && dealContext.currentTransaction?.trang_thai === 'cho_nguoi_ban_xac_nhan';
    const showBuyerPendingState = dealContext.role === 'buyer'
        && dealContext.currentTransaction?.trang_thai === 'cho_nguoi_ban_xac_nhan';
    const showLiveDealActions = Boolean(dealContext.currentTransaction)
        && ACTIVE_ACCEPTED_STATUSES.includes(dealContext.currentTransaction.trang_thai);
    const showDealCompletedCelebration = dealContext.currentTransaction?.trang_thai === 'hoan_tat';
    const hasDealActionPanel = showBuyerRequestComposer
        || showSellerApprovalActions
        || showBuyerPendingState
        || showLiveDealActions;

    const dealActionUnavailableMessage = useMemo(() => {
        if (showDealCompletedCelebration) {
            return '';
        }

        if (FINAL_POST_STATUSES.includes(dealContext.post?.status)) {
            return 'Bài đăng này đã bán hoặc đã xử lý xong, nên sẽ không còn nút yêu cầu mua hay xác nhận mua.';
        }

        if (dealContext.role === 'viewer' && activeDealPostId && dealContext.post) {
            return 'Bạn đang chat với một người khác, không phải chủ bài đăng này. Nút giao dịch chỉ hiện khi mở đúng cuộc chat với người bán.';
        }

        if (dealContext.activeAcceptedOther && !dealContext.currentTransaction) {
            return 'Bài đăng hiện đang được giữ cho người mua khác, nên cuộc chat này chưa có nút thao tác giao dịch.';
        }

        return '';
    }, [activeDealPostId, dealContext.activeAcceptedOther, dealContext.currentTransaction, dealContext.post, dealContext.role, showDealCompletedCelebration]);

    const dealReturnButtonLabel = useMemo(() => {
        if (showSellerApprovalActions) return 'Mở nút xác nhận mua';
        if (showBuyerPendingState) return 'Mở trạng thái yêu cầu mua';
        if (showLiveDealActions) return 'Mở thao tác giao dịch';
        if (showBuyerRequestComposer) return 'Mở lại form chốt đơn';
        return 'Mở Deal room';
    }, [showBuyerPendingState, showBuyerRequestComposer, showLiveDealActions, showSellerApprovalActions]);

    const dealQuickActionAnchorLabel = useMemo(() => {
        if (showSellerApprovalActions) return 'Tới phần xác nhận mua';
        if (showBuyerPendingState) return 'Tới trạng thái yêu cầu';
        if (showLiveDealActions) {
            return dealContext.currentTransaction?.dia_chi_hen_gap
                ? 'Tới phần điểm hẹn và xác nhận'
                : 'Tới phần chốt điểm hẹn';
        }
        if (showBuyerRequestComposer) return 'Tới form yêu cầu mua';
        return 'Tới phần thao tác';
    }, [
        dealContext.currentTransaction?.dia_chi_hen_gap,
        showBuyerPendingState,
        showBuyerRequestComposer,
        showLiveDealActions,
        showSellerApprovalActions,
    ]);

    useEffect(() => {
        if (!hasDealActionPanel) {
            setShowDealReturnButton(false);
            return undefined;
        }

        const viewport = messagesViewportRef.current;
        const composer = dealActionPanelRef.current;

        if (!viewport || !composer) {
            setShowDealReturnButton(false);
            return undefined;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                const scrolledPastComposer = viewport.scrollTop > 120;
                setShowDealReturnButton(!entry.isIntersecting && scrolledPastComposer);
            },
            {
                root: viewport,
                threshold: 0.35,
            },
        );

        observer.observe(composer);

        return () => observer.disconnect();
    }, [hasDealActionPanel, selectedChat?.id, activeDealPostId, loadingDeal]);

    return (
        <div className="messages-page">
            {error && (
                <div style={{
                    position: 'fixed',
                    top: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '10px 12px',
                    borderRadius: 12,
                    maxWidth: 720,
                    width: 'calc(100% - 32px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    fontSize: 13,
                }}>
                    <span>{error}</span>
                    <button
                        type="button"
                        className="msg-icon-btn"
                        onClick={() => setError('')}
                        aria-label="Close error"
                        style={{ background: 'transparent' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ═══ LEFT — Chat List ═══ */}
            <div className="msg-list-panel">
                <div className="msg-list-header">
                    <h2>Đoạn chat</h2>
                    <div className="msg-list-header-actions">
                        <button className="msg-icon-btn" aria-label="More"><MoreHorizontal size={16} /></button>
                        <button className="msg-icon-btn" aria-label="New chat" onClick={() => setShowNewChat(true)}><Edit3 size={15} /></button>
                    </div>
                </div>

                {/* ── Search bar with inline dropdown ── */}
                <div className="msg-list-search-wrap" ref={searchWrapRef}>
                    <div className={`msg-list-search ${searchQuery.includes('@') ? 'email-mode' : ''}`}>
                        {searchQuery.includes('@') ? <Mail size={15} style={{ color: '#3b82f6', flexShrink: 0 }} /> : <Search size={15} />}
                        <input
                            ref={listSearchInputRef}
                            type="text"
                            placeholder="Tìm tên, email người dùng..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setSearchFocused(true); }}
                            onFocus={() => setSearchFocused(true)}
                            onKeyDown={e => { if (e.key === 'Escape') { setSearchFocused(false); setSearchQuery(''); } }}
                        />
                        {searchQuery && (
                            <button
                                className="msg-modal-clear"
                                onClick={() => { setSearchQuery(''); setListUserResults([]); setSearchFocused(false); listSearchInputRef.current?.focus(); }}
                                aria-label="Xóa"
                            >
                                <X size={12} />
                            </button>
                        )}
                        {listSearching && <span className="msg-list-search-spin" />}
                    </div>

                    {/* ── Inline dropdown ── */}
                    {searchFocused && searchQuery.trim() && (() => {
                        const isEmail = searchQuery.includes('@');
                        const filtered = listUserResults.filter(u => {
                            if (listSearchFilter === 'friend') return u.isFriend;
                            if (listSearchFilter === 'stranger') return !u.isFriend;
                            return true;
                        });
                        return (
                            <div className="msg-search-dropdown">
                                {/* Filter tabs */}
                                {listUserResults.length > 0 && (
                                    <div className="msg-search-dropdown-tabs">
                                        {[['all', 'Tất cả', <Users size={12} />], ['friend', 'Bạn bè', <UserCheck size={12} />], ['stranger', 'Người lạ', <UserX size={12} />]].map(([key, label, icon]) => (
                                            <button
                                                key={key}
                                                className={`msg-search-dropdown-tab ${listSearchFilter === key ? 'active' : ''}`}
                                                onMouseDown={e => { e.preventDefault(); setListSearchFilter(key); }}
                                            >
                                                {icon}{label}
                                                <span className="tab-count">
                                                    {key === 'all' ? listUserResults.length
                                                        : key === 'friend' ? listUserResults.filter(u => u.isFriend).length
                                                            : listUserResults.filter(u => !u.isFriend).length}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Results */}
                                <div className="msg-search-dropdown-list">
                                    {filtered.length > 0 ? filtered.map(u => (
                                        <button
                                            key={u.id}
                                            className="msg-user-row"
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => {
                                                const conv = { id: u.id, type: 'private', name: u.name, avatar: u.avatar, lastMsg: '', lastAt: null, unread: 0, online: false };
                                                setSearchQuery('');
                                                setListUserResults([]);
                                                setSearchFocused(false);
                                                handleSelectChat(conv);
                                            }}
                                        >
                                            <ProfileAvatarLink userId={u.id}>
                                                <div className="msg-user-avatar-wrap">
                                                    <img className="msg-user-avatar" src={u.avatar} alt={u.name} />
                                                    {u.isFriend && <span className="msg-user-friend-dot" />}
                                                </div>
                                            </ProfileAvatarLink>
                                            <div className="msg-user-info">
                                                <div className="msg-user-name-row">
                                                    <span className="msg-user-name">{u.name}</span>
                                                    {u.isFriend
                                                        ? <span className="user-badge friend">Bạn bè</span>
                                                        : <span className="user-badge stranger">Người lạ</span>}
                                                </div>
                                                <div className="msg-user-sub">
                                                    {u.isFriend ? (
                                                        u.email ? <span className="msg-user-email"><Mail size={11} />{u.email}</span> : (u.school || u.hometown || '')
                                                    ) : (
                                                        u.school ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileText size={11} />{u.school}</span> : (u.hometown || '')
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    )) : (
                                        <div className="msg-search-dropdown-empty">
                                            {listSearching
                                                ? 'Đang tìm...'
                                                : isEmail
                                                    ? 'Không tìm thấy email này.'
                                                    : <><Search size={16} style={{ opacity: 0.4 }} /><span>Không tìm thấy. Thử email chính xác.</span></>}
                                        </div>
                                    )}
                                </div>

                                {/* Email hint row */}
                                {!isEmail && (
                                    <div className="msg-search-dropdown-hint">
                                        <Mail size={12} /> Nhập email để tìm người lạ
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* ── Tabs (hidden when search dropdown is open) ── */}
                {!(searchFocused && searchQuery.trim()) && (
                    <div className="msg-list-tabs">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                className={`msg-list-tab ${activeTab === t.key ? 'active' : ''}`}
                                onClick={() => setActiveTab(t.key)}
                            >
                                {t.label}
                            </button>
                        ))}
                        <button className="msg-list-tab-more"><MoreHorizontal size={16} /></button>
                    </div>
                )}

                {/* ── Conversation list (hidden when search dropdown is open) ── */}
                {!(searchFocused && searchQuery.trim()) && (
                    <div className="msg-list-conversations">
                        {loadingConvs ? (
                            <div style={{ padding: 16, color: '#777' }}>Đang tải...</div>
                        ) : filteredConvs.map(conv => (
                            <button
                                key={conv.id}
                                className={`msg-conv-item ${selectedChat?.id === conv.id ? 'selected' : ''} ${conv.unread > 0 ? 'has-unread' : ''}`}
                                onClick={() => handleSelectChat(conv)}
                            >
                                <ProfileAvatarLink userId={conv.type === 'private' ? conv.id : null}>
                                    <div className="msg-conv-avatar-wrap">
                                        <img className="msg-conv-avatar" src={conv.avatar} alt={conv.name} />
                                        {conv.online && <span className="msg-conv-online-dot" />}
                                    </div>
                                </ProfileAvatarLink>
                                <div className="msg-conv-info">
                                    <div className="msg-conv-name">{conv.name}</div>
                                    <div className="msg-conv-last">
                                        {conv.lastMsg}
                                        {conv.lastAt ? ` · ${conv.lastAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}
                                    </div>
                                </div>
                                <div className="msg-conv-right">
                                    {conv.unread > 0 && <span className="msg-conv-badge">{conv.unread}</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ CENTER — Chat Detail ═══ */}
            <div className="msg-detail-panel">
                {selectedChat ? (
                    <>
                        {/* Header */}
                        <div className="msg-detail-header">
                            <ProfileAvatarLink userId={selectedChat.type === 'private' ? selectedChat.id : null}>
                                <img className="msg-detail-avatar" src={selectedChat.avatar} alt={selectedChat.name} />
                            </ProfileAvatarLink>
                            <div className="msg-detail-info">
                                <div className="msg-detail-name">{selectedChat.name}</div>
                                <div className={`msg-detail-status ${selectedChat.online ? '' : 'offline'}`}>
                                    {selectedChat.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
                                </div>
                            </div>
                            <div className="msg-detail-actions">
                                <button className="msg-detail-action-btn" title="Gọi thoại"><Phone size={18} /></button>
                                <button className="msg-detail-action-btn" title="Gọi video"><Video size={18} /></button>
                                <button className="msg-detail-action-btn" title="Xóa cuộc trò chuyện" onClick={handleDeleteConversation}>
                                    <Trash2 size={18} color="#7f001f" />
                                </button>
                                <button className="msg-detail-action-btn" title="Thông tin"><Info size={18} /></button>
                            </div>
                        </div>

                        <div ref={messagesViewportRef} className="msg-detail-scrollbody">
                        {selectedChat.type === 'private' && (activeDealPostId || loadingDeal) && (
                            <section className={`msg-deal-stage tone-${currentDealMeta.tone}`}>
                                {loadingDeal ? (
                                    <div className="msg-deal-empty-stage loading">
                                        <Sparkles size={20} />
                                        <div>
                                            <h3>Đang dựng bảng chốt đơn...</h3>
                                            <p>Hệ thống đang ghép bài đăng và trạng thái giao dịch vào cuộc trò chuyện này.</p>
                                        </div>
                                    </div>
                                ) : activeDealPostId && dealContext.post ? (
                                    <>
                                        <div className="msg-deal-stage-head">
                                            <div className="msg-deal-stage-copy">
                                                <span className="msg-deal-kicker">Deal room</span>
                                                <h3>{currentDealMeta.headline}</h3>
                                                <p>{currentDealMeta.description}</p>
                                            </div>
                                            <div className={`msg-deal-status-pill tone-${currentDealMeta.tone}`}>
                                                {currentDealMeta.label}
                                            </div>
                                        </div>

                                        {hasDealActionPanel && (
                                            <div className="msg-deal-quick-actions">
                                                <div className="msg-deal-quick-head">
                                                    <strong>Thao tác ngay</strong>
                                                    <span>Khối này chỉ dẫn bạn tới đúng phần thao tác chính để tránh lặp nút nhiều lần trong cùng một deal room.</span>
                                                </div>
                                                <div className="msg-deal-action-row wrap">
                                                    <button
                                                        type="button"
                                                        className="msg-deal-btn primary"
                                                        onClick={scrollToDealActionPanel}
                                                    >
                                                        {dealQuickActionAnchorLabel}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {!hasDealActionPanel && dealActionUnavailableMessage && (
                                            <div className="msg-deal-unavailable-panel">
                                                <AlertTriangle size={16} />
                                                <div>
                                                    <strong>Hiện chưa có nút thao tác cho deal này</strong>
                                                    <p>{dealActionUnavailableMessage}</p>
                                                </div>
                                            </div>
                                        )}

                                        {showDealCompletedCelebration && (
                                            <DealCompletedCelebrationCard
                                                post={dealContext.post}
                                                transaction={dealContext.currentTransaction}
                                                buyer={dealParticipantInfo.buyer}
                                                seller={dealParticipantInfo.seller}
                                                meetingMapUrl={meetingMapUrl}
                                                onViewPost={() => navigate(`/post/${dealContext.post.id}`)}
                                            />
                                        )}

                                        <div className="msg-deal-insights">
                                            {dealInsightCards.map((item) => (
                                                <div key={item.label} className="msg-deal-insight-card">
                                                    <span>{item.label}</span>
                                                    <strong>{item.value}</strong>
                                                    <small>{item.hint}</small>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="msg-deal-actors">
                                            {Object.values(dealParticipantInfo).map((party) => (
                                                <div key={party.label} className={`msg-deal-actor-card ${party.isMe ? 'is-me' : ''}`}>
                                                    <ProfileAvatarLink userId={party.userId}>
                                                        <img src={party.avatar} alt={party.name} className="msg-deal-actor-avatar" />
                                                    </ProfileAvatarLink>
                                                    <div className="msg-deal-actor-copy">
                                                        <span>{party.label}</span>
                                                        <strong>{party.name}</strong>
                                                        <small>{party.isMe ? 'Bạn đang ở vai trò này' : 'Đối tác trong giao dịch hiện tại'}</small>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="msg-deal-grid">
                                            <button
                                                type="button"
                                                className="msg-deal-post-card"
                                                onClick={() => navigate(`/post/${dealContext.post.id}`)}
                                            >
                                                <div className="msg-deal-post-visual">
                                                    {dealContext.post.image ? (
                                                        <img src={dealContext.post.image} alt={dealContext.post.title} />
                                                    ) : (
                                                        <div className="msg-deal-post-placeholder">
                                                            <ShoppingBag size={22} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="msg-deal-post-copy">
                                                    <div className="msg-deal-post-title">{dealContext.post.title}</div>
                                                    <div className="msg-deal-post-badges">
                                                        <span className="msg-deal-post-badge status">{currentPostStatusMeta.label}</span>
                                                        {dealContext.post.category && (
                                                            <span className="msg-deal-post-badge">{dealContext.post.category}</span>
                                                        )}
                                                        {dealContext.post.typeLabel && (
                                                            <span className="msg-deal-post-badge subtle">{dealContext.post.typeLabel}</span>
                                                        )}
                                                    </div>
                                                    <div className="msg-deal-post-meta">
                                                        <span><BadgeCheck size={14} /> {formatCurrency(dealContext.post.price)}</span>
                                                        <span><MapPin size={14} /> {dealContext.post.location}</span>
                                                    </div>
                                                    <div className="msg-deal-post-foot">
                                                        <span>{dealContext.currentTransaction ? `Mã GD #${dealContext.currentTransaction.ID_GiaoDich.slice(0, 8)}` : 'Chưa mở mã giao dịch'}</span>
                                                        <span>{formatDateTime(dealContext.currentTransaction?.thoi_gian_yeu_cau || dealContext.currentTransaction?.thoi_gian_tao)}</span>
                                                    </div>
                                                </div>
                                            </button>

                                            <div className="msg-deal-progress-card">
                                                <div className="msg-deal-panel-head">
                                                    <span><Shield size={15} /> Đường đi giao dịch</span>
                                                    <strong>{dealContext.currentTransaction ? 'Đang theo dõi' : 'Chưa kích hoạt'}</strong>
                                                </div>
                                                <div className="msg-deal-progress-list">
                                                    {dealProgressSteps.map((step) => (
                                                        <div key={step.key} className={`msg-deal-progress-step ${step.state}`}>
                                                            <div className="msg-deal-progress-mark" />
                                                            <div className="msg-deal-progress-copy">
                                                                <strong>{step.label}</strong>
                                                                <small>{step.hint}</small>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {dealContext.currentTransaction?.ghi_chu_nguoi_mua && (
                                            <div className="msg-deal-buyer-note">
                                                <div className="msg-deal-panel-head">
                                                    <span><FileText size={15} /> Ghi chú chốt đơn</span>
                                                    <strong>{formatDateTime(dealContext.currentTransaction.thoi_gian_yeu_cau || dealContext.currentTransaction.thoi_gian_tao)}</strong>
                                                </div>
                                                <p>{dealContext.currentTransaction.ghi_chu_nguoi_mua}</p>
                                            </div>
                                        )}

                                        {dealNotice && (
                                            <div className={`msg-deal-note-banner ${dealNotice.type}`}>
                                                {dealNotice.type === 'error' ? <AlertTriangle size={16} /> : <BadgeCheck size={16} />}
                                                <span>{dealNotice.text}</span>
                                            </div>
                                        )}

                                        {dealContext.activeAcceptedOther && !dealContext.currentTransaction && (
                                            <div className="msg-deal-lock-banner">
                                                <AlertTriangle size={16} />
                                                <span>Bài đăng này đang được giữ cho người mua khác. Bạn vẫn có thể nhắn tin, nhưng không thể chốt đơn ở cuộc trò chuyện này.</span>
                                            </div>
                                        )}

                                        {dealContext.currentTransaction?.dia_chi_hen_gap && (
                                            <div className="msg-deal-meeting-card">
                                                <div className="msg-deal-meeting-head">
                                                    <span><LocateFixed size={15} /> Điểm hẹn hiện tại</span>
                                                    <strong>{formatDateTime(dealContext.currentTransaction.thoi_gian_hen_gap)}</strong>
                                                </div>
                                                <div className="msg-deal-meeting-address">{dealContext.currentTransaction.dia_chi_hen_gap}</div>
                                                <div className="msg-deal-meeting-meta">
                                                    <span><Clock3 size={14} /> {formatDateTime(dealContext.currentTransaction.thoi_gian_hen_gap)}</span>
                                                    <span><User size={14} /> {meetingUpdatedByLabel} vừa cập nhật</span>
                                                </div>
                                                {dealContext.currentTransaction.ghi_chu_hen_gap && (
                                                    <div className="msg-deal-meeting-note">
                                                        <strong>Ghi chú gặp mặt</strong>
                                                        <p>{dealContext.currentTransaction.ghi_chu_hen_gap}</p>
                                                    </div>
                                                )}
                                                {meetingMapUrl && (
                                                    <div className="msg-deal-meeting-links">
                                                        <a
                                                            href={meetingMapUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="msg-deal-map-link"
                                                        >
                                                            <MapPin size={14} />
                                                            <span>Mở trên bản đồ</span>
                                                        </a>
                                                        <button
                                                            type="button"
                                                            className="msg-deal-btn ghost"
                                                            onClick={() => setShowMeetingComposer(true)}
                                                        >
                                                            Chỉnh lại điểm hẹn
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {dealContext.currentTransaction && !showDealCompletedCelebration && (
                                            <div className="msg-deal-completion-card">
                                                <div className="msg-deal-panel-head">
                                                    <span><BadgeCheck size={15} /> Xác nhận hoàn tất</span>
                                                    <strong>{completionConfirmation.confirmationCount}/2 đã xác nhận</strong>
                                                </div>
                                                <div className="msg-deal-completion-grid">
                                                    {completionActors.map((party) => {
                                                        const note = completionConfirmation.notesByUserId?.[String(party.userId || '')];
                                                        return (
                                                            <div key={party.key} className={`msg-deal-completion-party ${party.confirmed ? 'confirmed' : ''}`}>
                                                                <ProfileAvatarLink userId={party.userId}>
                                                                    <img src={party.avatar} alt={party.name} className="msg-deal-completion-avatar" />
                                                                </ProfileAvatarLink>
                                                                <div className="msg-deal-completion-copy">
                                                                    <span>{party.label}</span>
                                                                    <strong>{party.name}</strong>
                                                                    <small>{party.confirmed ? 'Đã xác nhận hoàn tất' : 'Chưa xác nhận hoàn tất'}</small>
                                                                    {note && <p>{note}</p>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {isWaitingCounterpartyCompletion && (
                                                    <div className="msg-deal-completion-wait">
                                                        <Clock3 size={15} />
                                                        <span>Bạn đã xác nhận. Deal room đang chờ bên còn lại xác nhận để chuyển bài sang đã bán.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {showBuyerRequestComposer && (
                                            <div ref={dealActionPanelRef} className="msg-deal-action-panel standout">
                                                <div className="msg-deal-action-copy">
                                                    <Handshake size={18} />
                                                    <div>
                                                        <strong>Mở yêu cầu mua ngay trong chat</strong>
                                                        <span>Để lại một ghi chú ngắn để người bán biết bạn đang muốn chốt theo hướng nào.</span>
                                                    </div>
                                                </div>
                                                <textarea
                                                    className="msg-deal-textarea"
                                                    placeholder="Ví dụ: Mình chốt luôn hôm nay, có thể gặp ở cổng trường lúc 18:00."
                                                    value={purchaseNote}
                                                    onChange={(event) => setPurchaseNote(event.target.value)}
                                                />
                                                <div className="msg-deal-action-row">
                                                    <button
                                                        type="button"
                                                        className="msg-deal-btn primary"
                                                        onClick={handleCreateRequest}
                                                        disabled={dealActionLoading === 'request'}
                                                    >
                                                        {dealActionLoading === 'request' ? 'Đang gửi...' : 'Yêu cầu mua'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {showSellerApprovalActions && (
                                            <div ref={dealActionPanelRef} className="msg-deal-action-panel">
                                                <div className="msg-deal-action-copy">
                                                    <Sparkles size={18} />
                                                    <div>
                                                        <strong>Người mua đã gõ cửa</strong>
                                                        <span>Xác nhận mua để chuyển bài đăng sang giữ chỗ, hoặc từ chối để đóng yêu cầu này.</span>
                                                    </div>
                                                </div>
                                                {dealContext.currentTransaction?.ghi_chu_nguoi_mua && (
                                                    <div className="msg-deal-quote">“{dealContext.currentTransaction.ghi_chu_nguoi_mua}”</div>
                                                )}
                                                <div className="msg-deal-action-row">
                                                    <button
                                                        type="button"
                                                        className="msg-deal-btn primary"
                                                        onClick={handleAcceptDeal}
                                                        disabled={dealActionLoading === 'accept'}
                                                    >
                                                        {dealActionLoading === 'accept' ? 'Đang xác nhận...' : 'Xác nhận mua'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="msg-deal-btn ghost"
                                                        onClick={handleRejectDeal}
                                                        disabled={dealActionLoading === 'reject'}
                                                    >
                                                        {dealActionLoading === 'reject' ? 'Đang từ chối...' : 'Từ chối'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {showBuyerPendingState && (
                                            <div ref={dealActionPanelRef} className="msg-deal-action-panel compact">
                                                <div className="msg-deal-action-copy">
                                                    <Clock3 size={18} />
                                                    <div>
                                                        <strong>Yêu cầu đang chờ người bán phản hồi</strong>
                                                        <span>Bạn có thể hủy yêu cầu nếu đã đổi ý hoặc muốn mở cuộc giao dịch khác.</span>
                                                    </div>
                                                </div>
                                                <div className="msg-deal-action-row">
                                                    <button
                                                        type="button"
                                                        className="msg-deal-btn danger"
                                                        onClick={handleCancelDeal}
                                                        disabled={dealActionLoading === 'cancel'}
                                                    >
                                                        {dealActionLoading === 'cancel' ? 'Đang hủy...' : 'Hủy yêu cầu'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {showLiveDealActions && (
                                            <div ref={dealActionPanelRef} className="msg-deal-action-panel live">
                                                <div className="msg-deal-action-copy">
                                                    <Handshake size={18} />
                                                    <div>
                                                        <strong>Đang ở nhịp chốt đơn</strong>
                                                        <span>Chọn điểm hẹn trên bản đồ, lưu rõ thời gian và ghi chú, rồi để cả hai bên cùng xác nhận hoàn tất giao dịch.</span>
                                                    </div>
                                                </div>
                                                <div className="msg-deal-action-tips">
                                                    <span><MapPin size={14} /> Điểm hẹn nên được chốt trên bản đồ để cả hai nhìn cùng một vị trí.</span>
                                                    <span><BadgeCheck size={14} /> Giao dịch chỉ hoàn tất khi cả người mua và người bán đều xác nhận.</span>
                                                </div>
                                                <div className="msg-deal-action-row wrap">
                                                    <button
                                                        type="button"
                                                        className="msg-deal-btn primary"
                                                        onClick={() => setShowMeetingComposer(true)}
                                                    >
                                                        {dealContext.currentTransaction?.dia_chi_hen_gap ? 'Mở lại bản đồ điểm hẹn' : 'Chọn điểm hẹn trên bản đồ'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="msg-deal-btn signal"
                                                        onClick={handleRequestComplete}
                                                        disabled={!canConfirmDealCompletion || dealActionLoading === 'requestComplete' || hasCurrentUserConfirmedCompletion}
                                                    >
                                                        {completionActionLabel}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="msg-deal-btn danger"
                                                        onClick={handleCancelDeal}
                                                        disabled={dealActionLoading === 'cancel'}
                                                    >
                                                        {dealActionLoading === 'cancel' ? 'Đang đóng...' : 'Hủy giao dịch'}
                                                    </button>
                                                </div>
                                                {dealContext.currentTransaction?.dia_chi_hen_gap && (
                                                    <div className="msg-deal-action-summary">
                                                        <strong>Điểm hẹn đang chốt</strong>
                                                        <p>{dealContext.currentTransaction.dia_chi_hen_gap}</p>
                                                        <small>
                                                            {formatDateTime(dealContext.currentTransaction.thoi_gian_hen_gap)}
                                                            {dealContext.currentTransaction.ghi_chu_hen_gap ? ` · ${dealContext.currentTransaction.ghi_chu_hen_gap}` : ''}
                                                        </small>
                                                    </div>
                                                )}
                                                {!canConfirmDealCompletion && (
                                                    <div className="msg-deal-action-summary">
                                                        <strong>Chưa thể xác nhận hoàn tất</strong>
                                                        <small>Cần chốt điểm hẹn và thời gian trước khi một trong hai bên được phép xác nhận giao dịch đã xong.</small>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </section>
                        )}

                        {/* Messages */}
                        <div className="msg-detail-messages">
                            {loadingMsgs && <div style={{ padding: 16, color: '#777' }}>Đang tải tin nhắn...</div>}
                            {chatMessages.map(msg => (
                                <div key={msg.id} className={`msg-bubble-row ${msg.sender === 'me' ? 'mine' : 'theirs'}`}>
                                    <div className="msg-bubble-container">
                                        {msg.image && <img className="msg-bubble-img" src={msg.image} alt="" />}
                                        <div className="msg-bubble-wrap">
                                            {msg.location ? (
                                                <button
                                                    type="button"
                                                    className={`msg-location-card ${msg.sender === 'me' ? 'mine' : 'theirs'}`}
                                                    onClick={() => window.open(`https://www.google.com/maps?q=${msg.location.lat},${msg.location.lng}`, '_blank', 'noopener,noreferrer')}
                                                >
                                                    <div className="msg-location-icon">
                                                        <MapPin size={26} />
                                                    </div>
                                                    <div className="msg-location-content">
                                                        <div className="msg-location-title">📍 Vị trí của tôi</div>
                                                        <div className="msg-location-subtitle">Nhấn để xem trên bản đồ</div>
                                                    </div>
                                                </button>
                                            ) : msg.isPostShare ? (
                                                <div className={`msg-post-share-card ${msg.sender === 'me' ? 'mine' : 'theirs'}`}>
                                                    {msg.postImage && (
                                                        <img className="msg-post-share-image" src={msg.postImage} alt={msg.postTitle || 'Bài đăng'} />
                                                    )}
                                                    <div className="msg-post-share-content">
                                                        <div className="msg-post-share-label">Bài đăng được chia sẻ</div>
                                                        <div className="msg-post-share-title">{msg.postTitle || extractPostShareTitle(msg.text) || 'Bài đăng từ OLODO'}</div>
                                                        <div className="msg-post-share-subtitle">
                                                            {msg.postId ? 'Nhấn để xem chi tiết bài đăng' : 'Bài đăng được gửi kèm trong cuộc trò chuyện'}
                                                        </div>
                                                        <div className="msg-post-share-actions">
                                                            {msg.postId && (
                                                                <button
                                                                    type="button"
                                                                    className="msg-post-share-link-btn"
                                                                    onClick={() => navigate(`/post/${msg.postId}`)}
                                                                >
                                                                    Xem bài đăng
                                                                </button>
                                                            )}
                                                            {msg.postId && (
                                                                <button
                                                                    type="button"
                                                                    className="msg-post-share-deal-btn"
                                                                    onClick={() => openDealRoom(msg.postId)}
                                                                >
                                                                    Chốt đơn hàng
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="msg-bubble">{msg.text}</div>
                                            )}
                                            {msg.sender === 'me' && msg.id && !msg.id.toString().startsWith('temp_') && (
                                                <button
                                                    className="msg-bubble-delete-btn"
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    title="Xóa tin nhắn"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        {msg.time && <div className="msg-bubble-time">{msg.time}</div>}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        </div>

                        {/* Input */}
                        <div className="msg-input-zone">
                            {hasDealActionPanel && showDealReturnButton && (
                                <div className="msg-deal-return-row">
                                    <button
                                        type="button"
                                        className="msg-deal-return-btn"
                                        onClick={scrollToDealActionPanel}
                                    >
                                        <Sparkles size={15} />
                                        <span>{dealReturnButtonLabel}</span>
                                    </button>
                                </div>
                            )}
                            <input
                                ref={messageFileInputRef}
                                type="file"
                                accept="image/*"
                                className="msg-hidden-file-input"
                                onChange={handleImageFileChange}
                            />
                            <div className="msg-input-bar">
                                <button type="button" className="msg-input-icon" title="Chọn ảnh" onClick={handleOpenImagePicker}>
                                    <Image size={20} />
                                </button>
                                <button type="button" className="msg-input-icon" title="Chia sẻ vị trí" onClick={handleShareLocation}>
                                    <MapPin size={20} />
                                </button>
                                <input
                                    type="text"
                                    className="msg-input-text"
                                    placeholder="Aa"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <button className="msg-input-emoji">😊</button>
                                <button className="msg-send-btn" onClick={handleSend}>
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="msg-detail-empty">
                        <div className="msg-detail-empty-icon">
                            <MessageCircle size={36} />
                        </div>
                        <h3>Chọn cuộc trò chuyện</h3>
                        <p>Chọn một đoạn chat bên trái để bắt đầu nhắn tin</p>
                    </div>
                )}
            </div>

            {/* ═══ RIGHT — User Info ═══ */}
            <div className="msg-info-panel">
                {selectedChat ? (
                    <>
                        <div className="msg-info-top">
                            <ProfileAvatarLink userId={selectedChat.type === 'private' ? selectedChat.id : null} stopPropagation={false}>
                                <img className="msg-info-avatar" src={selectedChat.avatar} alt={selectedChat.name} />
                            </ProfileAvatarLink>
                            <div className="msg-info-name">{selectedChat.name}</div>
                            <div className={`msg-info-status ${selectedChat.online ? '' : 'offline'}`}>
                                {selectedChat.online ? '● Đang hoạt động' : '○ Ngoại tuyến'}
                            </div>

                            <div className="msg-info-quick-actions">
                                <button
                                    className="msg-info-quick-btn"
                                    onClick={() => selectedChat.type === 'private' && navigate(`/profile/${selectedChat.id}`)}
                                    disabled={selectedChat.type !== 'private'}
                                >
                                    <span className="msg-info-quick-icon"><User size={16} /></span>
                                    <span className="msg-info-quick-label">Trang cá nhân</span>
                                </button>
                                <button className="msg-info-quick-btn">
                                    <span className="msg-info-quick-icon"><Bell size={16} /></span>
                                    <span className="msg-info-quick-label">Tắt thông báo</span>
                                </button>
                                <button className="msg-info-quick-btn">
                                    <span className="msg-info-quick-icon"><Search size={16} /></span>
                                    <span className="msg-info-quick-label">Tìm kiếm</span>
                                </button>
                            </div>
                        </div>

                        {activeDealPostId && dealContext.post && (
                            <div className={`msg-deal-sidecard tone-${currentDealMeta.tone}`}>
                                <div className="msg-deal-sidecard-head">
                                    <div>
                                        <span className="msg-deal-kicker">Hộ chiếu giao dịch</span>
                                        <h4>{dealContext.post.title}</h4>
                                    </div>
                                    <span className={`msg-deal-side-pill tone-${currentDealMeta.tone}`}>{currentDealMeta.label}</span>
                                </div>

                                <div className="msg-deal-sidefacts">
                                    <div>
                                        <span>Trạng thái bài</span>
                                        <strong>{currentPostStatusMeta.label}</strong>
                                    </div>
                                    <div>
                                        <span>Ai đang chờ ai</span>
                                        <strong>{dealFocusSummary.waitingLabel}</strong>
                                    </div>
                                    <div>
                                        <span>Bước kế tiếp</span>
                                        <strong>{dealFocusSummary.nextLabel}</strong>
                                    </div>
                                    <div>
                                        <span>Mã giao dịch</span>
                                        <strong>{dealContext.currentTransaction ? `#${dealContext.currentTransaction.ID_GiaoDich.slice(0, 8)}` : 'Chưa mở'}</strong>
                                    </div>
                                </div>

                                {dealContext.currentTransaction?.ghi_chu_nguoi_mua && (
                                    <div className="msg-deal-side-note">
                                        <span>Ghi chú chốt đơn</span>
                                        <p>{dealContext.currentTransaction.ghi_chu_nguoi_mua}</p>
                                    </div>
                                )}

                                {dealContext.currentTransaction?.dia_chi_hen_gap && (
                                    <div className="msg-deal-side-note">
                                        <span>Điểm hẹn hiện tại</span>
                                        <p>
                                            {dealContext.currentTransaction.dia_chi_hen_gap}
                                            {dealContext.currentTransaction.thoi_gian_hen_gap ? ` · ${formatDateTime(dealContext.currentTransaction.thoi_gian_hen_gap)}` : ''}
                                            {dealContext.currentTransaction.ghi_chu_hen_gap ? ` · ${dealContext.currentTransaction.ghi_chu_hen_gap}` : ''}
                                        </p>
                                    </div>
                                )}

                                {dealContext.currentTransaction && (
                                    <div className="msg-deal-side-note">
                                        <span>Xác nhận hoàn tất</span>
                                        <p>
                                            {completionConfirmation.confirmationCount === 2
                                                ? 'Cả hai bên đã xác nhận hoàn tất giao dịch.'
                                                : `Đã có ${completionConfirmation.confirmationCount}/2 bên xác nhận. Giao dịch chỉ đóng khi đủ cả người mua và người bán.`}
                                        </p>
                                    </div>
                                )}

                                {dealTimeline.length > 0 ? (
                                    <div className="msg-deal-timeline">
                                        {dealTimeline.map((entry) => (
                                            <div key={entry.id || `${entry.hanh_dong}-${entry.thoi_gian}`} className="msg-deal-timeline-item">
                                                <span className="msg-deal-timeline-dot" />
                                                <div>
                                                    <strong>{HISTORY_ACTION_LABELS[entry.hanh_dong] || entry.hanh_dong || 'Cập nhật giao dịch'}</strong>
                                                    <p>{entry.noi_dung || 'Không có ghi chú thêm.'}</p>
                                                    <small>{formatDateTime(entry.thoi_gian)}</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="msg-deal-side-empty">
                                        <Clock3 size={16} />
                                        <span>Lịch sử giao dịch sẽ hiện ở đây sau khi bắt đầu chốt đơn.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="msg-info-section">
                            <button className="msg-info-section-header">
                                <span>Thông tin về đoạn chat</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        <div className="msg-info-section">
                            <button className="msg-info-section-header">
                                <span>Tùy chỉnh đoạn chat</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        <div className="msg-info-section">
                            <button className="msg-info-section-header">
                                <span>File phương tiện & file</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        <div className="msg-info-section">
                            <button className="msg-info-section-header">
                                <span>Quyền riêng tư và hỗ trợ</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="msg-info-empty">
                        <p>Chọn cuộc trò chuyện để xem thông tin</p>
                    </div>
                )}
            </div>

            {showMeetingComposer && (
                <MeetingLocationPickerModal
                    draft={meetingDraft}
                    onDraftChange={setMeetingDraft}
                    onClose={() => setShowMeetingComposer(false)}
                    onSave={handleSubmitMeeting}
                    isSaving={dealActionLoading === 'meeting'}
                />
            )}

            {/* New chat modal */}
            {showNewChat && (() => {
                const isEmailQuery = userSearch.includes('@');
                const filteredResults = userResults.filter(u => {
                    if (searchFilter === 'friend') return u.isFriend;
                    if (searchFilter === 'stranger') return !u.isFriend;
                    return true;
                });
                return (
                    <div className="msg-modal-overlay" onClick={() => { setShowNewChat(false); setSearchFilter('all'); }}>
                        <div className="msg-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="msg-modal-header">
                                <h3>Tìm người nhắn tin</h3>
                                <button className="msg-icon-btn" onClick={() => { setShowNewChat(false); setSearchFilter('all'); }} aria-label="Close">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search input */}
                            <div className={`msg-modal-search ${isEmailQuery ? 'email-mode' : ''}`}>
                                {isEmailQuery ? <Mail size={16} className="email-icon" /> : <Search size={16} />}
                                <input
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Tìm bằng tên hoặc email (người lạ)..."
                                    autoFocus
                                />
                                {searchingUsers
                                    ? <span className="msg-modal-loading">&#8230;</span>
                                    : userSearch && (
                                        <button className="msg-modal-clear" onClick={() => setUserSearch('')} aria-label="Clear">
                                            <X size={13} />
                                        </button>
                                    )
                                }
                            </div>

                            {/* Email hint */}
                            {!userSearch && (
                                <div className="msg-modal-hint">
                                    <Mail size={13} />
                                    <span>Nhập email chính xác để tìm người lạ</span>
                                </div>
                            )}

                            {/* Filter tabs — only when there are results */}
                            {userSearch.trim() && userResults.length > 0 && (
                                <div className="msg-modal-filter-tabs">
                                    {[['all', 'Tất cả', <Users size={13} />], ['friend', 'Bạn bè', <UserCheck size={13} />], ['stranger', 'Người lạ', <UserX size={13} />]].map(([key, label, icon]) => (
                                        <button
                                            key={key}
                                            className={`msg-modal-filter-tab ${searchFilter === key ? 'active' : ''}`}
                                            onClick={() => setSearchFilter(key)}
                                        >
                                            {icon}{label}
                                            <span className="tab-count">
                                                {key === 'all' ? userResults.length
                                                    : key === 'friend' ? userResults.filter(u => u.isFriend).length
                                                        : userResults.filter(u => !u.isFriend).length}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Results list */}
                            <div className="msg-modal-results">
                                {filteredResults.map((u) => (
                                    <button
                                        key={u.id}
                                        className="msg-user-row"
                                        onClick={() => {
                                            const conv = {
                                                id: u.id,
                                                type: 'private',
                                                name: u.name,
                                                avatar: u.avatar,
                                                lastMsg: '',
                                                lastAt: null,
                                                unread: 0,
                                                online: false,
                                            };
                                            setShowNewChat(false);
                                            setUserSearch('');
                                            setUserResults([]);
                                            setSearchFilter('all');
                                            handleSelectChat(conv);
                                        }}
                                    >
                                        <ProfileAvatarLink userId={u.id}>
                                            <div className="msg-user-avatar-wrap">
                                                <img className="msg-user-avatar" src={u.avatar} alt={u.name} />
                                                {u.isFriend && <span className="msg-user-friend-dot" title="Bạn bè" />}
                                            </div>
                                        </ProfileAvatarLink>
                                        <div className="msg-user-info">
                                            <div className="msg-user-name-row">
                                                <span className="msg-user-name">{u.name}</span>
                                                {u.isFriend
                                                    ? <span className="user-badge friend">Bạn bè</span>
                                                    : <span className="user-badge stranger">Người lạ</span>
                                                }
                                            </div>
                                            <div className="msg-user-sub">
                                                {u.isFriend ? (
                                                    u.email ? <span className="msg-user-email"><Mail size={11} />{u.email}</span> : (u.school || u.hometown || '')
                                                ) : (
                                                    u.school ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileText size={11} />{u.school}</span> : (u.hometown || '')
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {!searchingUsers && userSearch.trim() && filteredResults.length === 0 && (
                                    <div className="msg-modal-empty">
                                        {searchFilter === 'friend'
                                            ? <><UserCheck size={28} /><p>Không tìm thấy bạn bè nào phù hợp</p></>
                                            : searchFilter === 'stranger'
                                                ? <><UserX size={28} /><p>Không tìm thấy người lạ nào phù hợp</p></>
                                                : <><Search size={28} /><p>Không tìm thấy ai. Thử tìm bằng email chính xác.</p></>
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
