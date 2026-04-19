import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    BadgeCheck,
    Clock3,
    ExternalLink,
    Heart,
    LayoutDashboard,
    Loader2,
    MapPin,
    MessageCircle,
    PlusCircle,
    RefreshCw,
    Search,
    ShoppingBag,
    Sparkles,
    Star,
    Store,
    TrendingUp,
    Trash2,
    UserRound,
    Settings,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { API_BASE_URL } from '../../constants';
import PostMediaGallery from '../../components/post/PostMediaGallery';
import { useAuthSession } from '../../utils/authSession';
import './AdminBankDash.css';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/200?u=admin-user';

const MANAGE_STATUSES = [
    { value: 'dang_ban', label: 'Đang bán' },
    { value: 'da_trao_doi', label: 'Đã trao đổi' },
    { value: 'da_tang', label: 'Đã tặng' },
];

const STATUS_LABELS = {
    dang_ban: 'Đang bán',
    dang_giu_cho: 'Đang giữ chỗ',
    dang_giao_dich: 'Đang giao dịch',
    da_ban: 'Đã bán',
    da_trao_doi: 'Đã trao đổi',
    da_tang: 'Đã tặng',
    cho_duyet: 'Chờ duyệt',
};

const STATUS_TONES = {
    dang_ban: 'success',
    dang_giu_cho: 'gold',
    dang_giao_dich: 'brand',
    da_ban: 'danger',
    da_trao_doi: 'brand',
    da_tang: 'gold',
    cho_duyet: 'muted',
};

const ORDER_STATUS_OPTIONS = [
    { value: 'cho_nguoi_ban_xac_nhan', label: 'Chờ người bán xác nhận' },
    { value: 'nguoi_ban_da_chap_nhan', label: 'Đã chấp nhận' },
    { value: 'cho_hen_gap', label: 'Đang chốt điểm hẹn' },
    { value: 'cho_xac_nhan_hoan_tat', label: 'Chờ xác nhận hoàn tất' },
    { value: 'hoan_tat', label: 'Hoàn tất' },
    { value: 'nguoi_mua_da_huy', label: 'Người mua đã hủy' },
    { value: 'nguoi_ban_da_tu_choi', label: 'Người bán từ chối' },
    { value: 'he_thong_da_huy', label: 'Hệ thống đã đóng' },
    { value: 'het_han', label: 'Đã hết hạn' },
];

const ORDER_STATUS_LABELS = Object.fromEntries(ORDER_STATUS_OPTIONS.map((item) => [item.value, item.label]));

const ORDER_STATUS_TONES = {
    cho_nguoi_ban_xac_nhan: 'gold',
    nguoi_ban_da_chap_nhan: 'brand',
    cho_hen_gap: 'success',
    cho_xac_nhan_hoan_tat: 'gold',
    hoan_tat: 'success',
    nguoi_mua_da_huy: 'danger',
    nguoi_ban_da_tu_choi: 'danger',
    he_thong_da_huy: 'muted',
    het_han: 'muted',
};

const ORDER_HISTORY_ACTION_LABELS = {
    tao_yeu_cau_mua: 'Tạo yêu cầu mua',
    nguoi_ban_chap_nhan: 'Người bán chấp nhận',
    nguoi_ban_tu_choi: 'Người bán từ chối',
    cap_nhat_diem_hen: 'Cập nhật điểm hẹn',
    yeu_cau_hoan_tat: 'Gửi yêu cầu hoàn tất',
    xac_nhan_hoan_tat: 'Đã xác nhận hoàn tất',
    hoan_tat_giao_dich: 'Giao dịch hoàn tất',
    nguoi_mua_huy: 'Người mua hủy',
    he_thong_huy: 'Hệ thống đóng giao dịch',
    het_han_giao_dich: 'Giao dịch hết hạn',
};

const ORDER_OPEN_STATUSES = [
    'cho_nguoi_ban_xac_nhan',
    'nguoi_ban_da_chap_nhan',
    'cho_hen_gap',
    'cho_xac_nhan_hoan_tat',
];

const ORDER_VIEW_FILTERS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'needs_action', label: 'Cần tôi xử lý' },
    { value: 'open', label: 'Đang mở' },
    { value: 'completed', label: 'Hoàn tất' },
];

const ADMIN_SECTIONS = [
    {
        id: 'overview',
        label: 'Tổng quan',
        helper: 'Chỉ số chính và bài đăng nổi bật',
        title: 'Tổng quan quản lý bài đăng',
        description: 'Giữ layout cũ nhưng chia theo từng khu rõ ràng để bạn nhìn nhanh toàn bộ tình hình mà không bị rối.',
        kicker: 'Bảng điều khiển',
        icon: LayoutDashboard,
    },
    {
        id: 'manage',
        label: 'Bài đăng',
        helper: 'Lọc, đổi trạng thái và mở bài',
        title: 'Quản lý bài đăng',
        description: 'Khu thao tác chính để bạn cập nhật trạng thái, mở chi tiết và xử lý bình luận của từng bài.',
        kicker: 'Điều hành nội dung',
        icon: Store,
    },
    {
        id: 'orders',
        label: 'Đơn hàng',
        helper: 'Theo dõi deal từ tin nhắn chốt đơn',
        title: 'Khu vực quản lý đơn hàng',
        description: 'Các đơn hàng ở đây được đồng bộ trực tiếp từ deal room trong Tin nhắn, để bạn nhìn được trạng thái, đối tác, điểm hẹn và mốc hoàn tất ở cùng một chỗ.',
        kicker: 'Đơn hàng và giao dịch',
        icon: ShoppingBag,
    },
    {
        id: 'analytics',
        label: 'Hiệu suất',
        helper: 'So sánh tương tác và tình trạng bán',
        title: 'Phân tích hiệu suất',
        description: 'Giúp bạn nhìn rõ bài nào đang hút tương tác, bài nào cần tối ưu lại tiêu đề, ảnh hoặc trạng thái.',
        kicker: 'Phân tích',
        icon: BarChart3,
    },
    {
        id: 'points',
        label: 'Điểm thưởng',
        helper: 'Số dư, lịch sử dùng và biến động',
        title: 'Dashboard quản lý điểm',
        description: 'Theo dõi số dư hiện tại, lịch sử dùng điểm và xu hướng cộng trừ để biết điểm đang được dùng thế nào.',
        kicker: 'Điểm và giao dịch',
        icon: Star,
    },
    {
        id: 'activity',
        label: 'Hoạt động',
        helper: 'Bình luận mới và cập nhật gần đây',
        title: 'Nhật ký hoạt động',
        description: 'Tập trung vào các chuyển động mới nhất để bạn biết việc nào cần phản hồi trước trong ngày.',
        kicker: 'Theo dõi cập nhật',
        icon: Sparkles,
    },
];

const ACTIVITY_LABELS = {
    post_created: 'Tin mới',
    comment_received: 'Bình luận',
    review_received: 'Đánh giá',
    points_changed: 'Điểm',
    friend_connected: 'Kết nối',
};

const ACTIVITY_TONES = {
    post_created: 'brand',
    comment_received: 'success',
    review_received: 'gold',
    points_changed: 'danger',
    friend_connected: 'muted',
};

const CHART_PALETTE = {
    brand: '#60a5fa',
    brandSoft: '#93c5fd',
    success: '#22d3ee',
    successSoft: '#67e8f9',
    gold: '#fbbf24',
    goldSoft: '#fde68a',
    danger: '#fb7185',
    slate: '#cbd5e1',
    grid: 'rgba(148, 163, 184, 0.18)',
    activeDotStroke: '#140f16',
    pie: ['#60a5fa', '#22d3ee', '#fbbf24', '#f97316', '#a78bfa', '#34d399'],
};

const getBackendOrigin = () => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        return 'http://localhost:3000';
    }
};

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const formatCurrency = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(numeric);
};

const formatDate = (value, withTime = false) => {
    if (!value) return 'Chưa cập nhật';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    return date.toLocaleString(
        'vi-VN',
        withTime
            ? {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }
            : {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            },
    );
};

const formatRelativeTime = (value) => {
    if (!value) return 'Vừa xong';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Vừa xong';

    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return formatDate(date, true);
};

const normalizeAssetUrl = (raw, origin) => {
    if (!raw || typeof raw !== 'string') return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
            const parsed = new URL(raw);
            if (parsed.pathname.startsWith('/uploads/')) return `${origin}${parsed.pathname}`;
            return raw;
        } catch {
            return raw;
        }
    }
    const cleaned = raw.replace(/^\/+/, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('uploads/')) return `${origin}/${cleaned}`;
    return `${origin}/uploads/${cleaned}`;
};

const normalizeListing = (listing, origin) => {
    const images = (listing?.images || []).map((item) => normalizeAssetUrl(item, origin)).filter(Boolean);
    const primaryImage = normalizeAssetUrl(listing?.primaryImage, origin) || images[0] || DEFAULT_AVATAR;
    return {
        ...listing,
        images: images.length ? images : [primaryImage],
        primaryImage,
        statusLabel: STATUS_LABELS[listing?.status] || listing?.statusLabel || listing?.status || 'Không rõ',
        statusTone: STATUS_TONES[listing?.status] || 'muted',
    };
};

const normalizeProfilePayload = (payload, origin) => ({
    ...payload,
    user: {
        ...payload?.user,
        fullName: payload?.user?.fullName || payload?.user?.name || '',
        avatar: normalizeAssetUrl(payload?.user?.avatar, origin) || DEFAULT_AVATAR,
    },
    listings: {
        ...payload?.listings,
        items: (payload?.listings?.items || []).map((listing) => normalizeListing(listing, origin)),
        featured: (payload?.listings?.featured || []).map((listing) => normalizeListing(listing, origin)),
    },
    activity: payload?.activity || [],
});

const buildMeetingMapUrl = (order) => {
    const lat = Number(order?.meetingLat);
    const lng = Number(order?.meetingLng);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return `https://www.google.com/maps?q=${lat},${lng}`;
    }

    const address = String(order?.meetingAddress || '').trim();
    if (!address) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const normalizeOrder = (item, origin, viewerId) => {
    const sellerId = String(item?.ID_NguoiBan || '');
    const buyerId = String(item?.ID_NguoiMua || '');
    const viewerKey = String(viewerId || '');
    const role = viewerKey && viewerKey === sellerId
        ? 'seller'
        : viewerKey && viewerKey === buyerId
            ? 'buyer'
            : 'viewer';

    const seller = {
        id: sellerId,
        name: item?.ten_nguoi_ban || 'Người bán',
        avatar: normalizeAssetUrl(item?.anh_nguoi_ban, origin) || `https://i.pravatar.cc/90?u=${encodeURIComponent(sellerId || 'seller')}`,
    };

    const buyer = {
        id: buyerId,
        name: item?.ten_nguoi_mua || 'Người mua',
        avatar: normalizeAssetUrl(item?.anh_nguoi_mua, origin) || `https://i.pravatar.cc/90?u=${encodeURIComponent(buyerId || 'buyer')}`,
    };

    const history = Array.isArray(item?.lich_su_json) ? item.lich_su_json : [];
    const completion = item?.completion_confirmation || {};
    const confirmedByUserIds = Array.isArray(completion?.confirmedByUserIds)
        ? completion.confirmedByUserIds.map((userId) => String(userId))
        : [];
    const meConfirmed = viewerKey ? confirmedByUserIds.includes(viewerKey) : false;
    const status = item?.trang_thai || '';
    const waitingForMe = (
        (role === 'seller' && status === 'cho_nguoi_ban_xac_nhan')
        || (status === 'cho_xac_nhan_hoan_tat' && viewerKey && !meConfirmed && [sellerId, buyerId].includes(viewerKey))
    );

    const counterparty = role === 'seller' ? buyer : seller;

    const normalized = {
        id: item?.ID_GiaoDich || '',
        shortCode: item?.ID_GiaoDich ? `#${String(item.ID_GiaoDich).slice(0, 8)}` : 'Đơn giao dịch',
        status,
        statusLabel: ORDER_STATUS_LABELS[status] || status || 'Chưa rõ',
        statusTone: ORDER_STATUS_TONES[status] || 'muted',
        isOpen: ORDER_OPEN_STATUSES.includes(status),
        isCompleted: status === 'hoan_tat',
        waitingForMe,
        role,
        roleLabel: role === 'seller' ? 'Bạn là người bán' : role === 'buyer' ? 'Bạn là người mua' : 'Bạn là người theo dõi',
        seller,
        buyer,
        counterparty,
        postId: item?.ID_BaiDang || '',
        postTitle: item?.tieu_de || 'Bài đăng',
        postImage: normalizeAssetUrl(item?.anh_bai_dang, origin) || DEFAULT_AVATAR,
        postPrice: Number(item?.gia || 0),
        postLocation: item?.vi_tri || '',
        postStatus: item?.trang_thai_baidang || '',
        postStatusLabel: STATUS_LABELS[item?.trang_thai_baidang] || item?.trang_thai_baidang || 'Chưa rõ',
        postStatusTone: STATUS_TONES[item?.trang_thai_baidang] || 'muted',
        createdAt: item?.thoi_gian_tao || item?.thoi_gian_yeu_cau || '',
        requestedAt: item?.thoi_gian_yeu_cau || item?.thoi_gian_tao || '',
        acceptedAt: item?.thoi_gian_nguoi_ban_xac_nhan || '',
        meetingTime: item?.thoi_gian_hen_gap || '',
        completedAt: item?.thoi_gian_hoan_tat || '',
        cancelledAt: item?.thoi_gian_huy || '',
        buyerNote: item?.ghi_chu_nguoi_mua || '',
        meetingAddress: item?.dia_chi_hen_gap || '',
        meetingNote: item?.ghi_chu_hen_gap || '',
        meetingLat: item?.vi_do_hen_gap,
        meetingLng: item?.kinh_do_hen_gap,
        history,
        historyPreview: [...history].reverse().slice(0, 5),
        completion: {
            ...completion,
            confirmedByUserIds,
            meConfirmed,
        },
    };

    return {
        ...normalized,
        meetingMapUrl: buildMeetingMapUrl(normalized),
    };
};

const getEngagementScore = (listing) => Number(listing.likeCount || 0) * 3 + Number(listing.commentCount || 0) * 2;

const estimateTraffic = (listing) => {
    const likes = Number(listing.likeCount || 0);
    const comments = Number(listing.commentCount || 0);
    const liveBoost = ['dang_ban', 'dang_giu_cho', 'dang_giao_dich'].includes(listing.status) ? 24 : 8;
    return likes * 18 + comments * 32 + liveBoost;
};

const buildPostNavigationState = (listing, user) => {
    if (!listing) return null;

    return {
        id: listing.id,
        authorId: listing.userId || user?.id || '',
        author: user?.name || user?.fullName || 'Người dùng OLODO',
        avatar: user?.avatar || DEFAULT_AVATAR,
        title: listing.title || 'Bài đăng',
        desc: listing.description || '',
        description: listing.description || '',
        price: listing.price || 0,
        img: listing.primaryImage || listing.images?.[0] || DEFAULT_AVATAR,
        imageUrls: listing.images || [],
        location: listing.location || '',
        createdAt: listing.createdAt || '',
        time: formatDate(listing.createdAt),
        category: listing.categoryName || '',
        postTypeName: listing.postTypeName || '',
        status: listing.status || '',
        trang_thai: listing.status || '',
        likes: Number(listing.likeCount || 0),
        comments: Number(listing.commentCount || 0),
    };
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const buildRecentMonthSeries = (items, dateSelector, valueSelector = () => 1, monthCount = 6) => {
    const now = new Date();
    const months = [];

    for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        months.push({
            key: getMonthKey(date),
            date,
            label: `T${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`,
            value: 0,
            count: 0,
        });
    }

    const monthIndexMap = new Map(months.map((item, index) => [item.key, index]));

    items.forEach((item) => {
        const rawDate = dateSelector(item);
        if (!rawDate) return;

        const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
        if (Number.isNaN(date.getTime())) return;

        const key = getMonthKey(new Date(date.getFullYear(), date.getMonth(), 1));
        const seriesIndex = monthIndexMap.get(key);
        if (seriesIndex === undefined) return;

        const amount = Number(valueSelector(item) || 0);
        months[seriesIndex].value += Number.isFinite(amount) ? amount : 0;
        months[seriesIndex].count += 1;
    });

    return months.map((item) => ({
        ...item,
        value: Math.round(item.value * 100) / 100,
    }));
};

const getPostingWindowLabel = (items) => {
    const windows = {
        'Sáng (06h-11h)': 0,
        'Chiều (12h-17h)': 0,
        'Tối (18h-23h)': 0,
        'Khuya (00h-05h)': 0,
    };

    items.forEach((item) => {
        if (!item?.createdAt) return;
        const date = new Date(item.createdAt);
        if (Number.isNaN(date.getTime())) return;

        const hour = date.getHours();
        if (hour >= 6 && hour < 12) windows['Sáng (06h-11h)'] += 1;
        else if (hour >= 12 && hour < 18) windows['Chiều (12h-17h)'] += 1;
        else if (hour >= 18) windows['Tối (18h-23h)'] += 1;
        else windows['Khuya (00h-05h)'] += 1;
    });

    const [label, total] = Object.entries(windows).sort((left, right) => right[1] - left[1])[0] || ['Chưa có dữ liệu', 0];
    return {
        label,
        total,
    };
};

const getPointTier = (points) => {
    if (points >= 1000) return 'Kim cương';
    if (points >= 500) return 'Vàng';
    if (points >= 200) return 'Bạc';
    return 'Khởi động';
};

const getPostingWindowSeries = (items) => {
    const windows = [
        { label: 'Sáng', range: '06h-11h', value: 0 },
        { label: 'Chiều', range: '12h-17h', value: 0 },
        { label: 'Tối', range: '18h-23h', value: 0 },
        { label: 'Khuya', range: '00h-05h', value: 0 },
    ];

    items.forEach((item) => {
        if (!item?.createdAt) return;
        const date = new Date(item.createdAt);
        if (Number.isNaN(date.getTime())) return;

        const hour = date.getHours();
        if (hour >= 6 && hour < 12) windows[0].value += 1;
        else if (hour >= 12 && hour < 18) windows[1].value += 1;
        else if (hour >= 18) windows[2].value += 1;
        else windows[3].value += 1;
    });

    return windows;
};

const normalizePointHistoryItem = (item) => {
    // BE lich_su_tich_diem fields: ID_LichSu, diem_thay_doi, diem_truoc, diem_sau, loai_giao_dich, mo_ta, thoi_gian_tao
    const pointsChanged = Number(item?.diem_thay_doi ?? item?.thay_doi_diem ?? 0);
    const pointsBefore = Number(item?.diem_truoc ?? item?.diem_truoc_khi_su_dung ?? 0);
    const pointsAfter = Number(item?.diem_sau ?? item?.diem_sau_khi_su_dung ?? 0);

    return {
        id: item?.ID_LichSu || item?.ID_NguoiDungTichDiem || `${item?.thoi_gian_tao || ''}-${item?.mo_ta || ''}`,
        createdAt: item?.thoi_gian_tao || item?.thoi_gian || '',
        pointsChanged,
        pointsBefore,
        pointsAfter,
        transactionType: item?.loai_giao_dich || '',
        description: item?.mo_ta || '',
        kind: pointsChanged < 0 ? 'use' : 'earn',
    };
};

const normalizePointUsageItem = (item) => {
    // BE nguoidungtichdiem fields: ID_NguoiDungTichDiem, diem_truoc_khi_su_dung, diem_sau_khi_su_dung, thoi_gian_su_dung, ten_hang_muc, mo_ta, loai_giao_dich, loai
    const before = Number(item?.diem_truoc_khi_su_dung ?? 0);
    const after = Number(item?.diem_sau_khi_su_dung ?? 0);
    // Điểm bị trừ khi đăng bài: before > after => delta âm
    const deltaAbs = Math.abs(before - after);

    return {
        id: item?.ID_NguoiDungTichDiem || `${item?.thoi_gian_su_dung || ''}-${item?.ten_hang_muc || ''}`,
        createdAt: item?.thoi_gian_su_dung || '',
        title: item?.ten_hang_muc || item?.mo_ta || 'Sử dụng điểm',
        description: item?.mo_ta || item?.loai_giao_dich || 'Giao dịch điểm',
        transactionType: item?.loai_giao_dich || '',
        usedPoints: deltaAbs,
        pointsBefore: before,
        pointsAfter: after,
        rewardType: item?.loai || '',
    };
};

const buildUsageCategorySeries = (usageItems) => {
    const usageMap = new Map();

    usageItems.forEach((item) => {
        const label = item?.title || item?.description || item?.transactionType || 'Khác';
        usageMap.set(label, (usageMap.get(label) || 0) + Number(item?.usedPoints || 0));
    });

    return [...usageMap.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 5);
};

function AdminChartTooltip({ active, payload, label, labelPrefix = '' }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="admin-chart-tooltip">
            {label ? <strong>{labelPrefix ? `${labelPrefix} ${label}` : label}</strong> : null}
            {payload.map((entry) => (
                <div key={`${entry.dataKey}-${entry.name}`} className="admin-chart-tooltip-row">
                    <span>{entry.name}</span>
                    <strong>{formatNumber(entry.value)}</strong>
                </div>
            ))}
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, helper, tone = 'brand', delay = 0 }) {
    return (
        <article className={`bankdash-metric tone-${tone}`} style={{ '--delay': `${delay}ms` }}>
            <span className="bankdash-metric-icon">
                <Icon size={18} strokeWidth={2.2} />
            </span>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{helper}</small>
        </article>
    );
}

function SidebarNavItem({ icon: Icon, label, helper, active, onClick }) {
    return (
        <button type="button" className={`bankdash-nav-item${active ? ' active' : ''}`} onClick={onClick}>
            <span className="bankdash-nav-icon">
                <Icon size={18} />
            </span>
            <span className="bankdash-nav-copy">
                <strong>{label}</strong>
                <small>{helper}</small>
            </span>
        </button>
    );
}

export default function AdminBankDash() {
    const navigate = useNavigate();
    const location = useLocation();
    const { userId: viewerId, token } = useAuthSession();
    const origin = useMemo(() => getBackendOrigin(), []);
    const chartPalette = useMemo(() => CHART_PALETTE, []);
    const chartTickStyle = useMemo(
        () => ({ fill: chartPalette.slate, fontSize: 12, fontWeight: 700 }),
        [chartPalette.slate],
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [profile, setProfile] = useState(null);
    const [selectedListingId, setSelectedListingId] = useState('');
    const [listingBusyId, setListingBusyId] = useState('');
    const [listingSearch, setListingSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortMode, setSortMode] = useState('engagement');
    const [activeSection, setActiveSection] = useState('overview');
    const [pointHistory, setPointHistory] = useState([]);
    const [pointUsageHistory, setPointUsageHistory] = useState([]);
    const [pointsError, setPointsError] = useState('');
    const [orders, setOrders] = useState([]);
    const [ordersError, setOrdersError] = useState('');
    const [orderSearch, setOrderSearch] = useState('');
    const [orderRoleFilter, setOrderRoleFilter] = useState('all');
    const [orderViewFilter, setOrderViewFilter] = useState('needs_action');
    const [selectedOrderId, setSelectedOrderId] = useState('');

    const apiFetch = useCallback(async (path, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };
        const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
        return data;
    }, [token]);

    const loadDashboard = useCallback(async () => {
        if (!viewerId) {
            setError('Bạn cần đăng nhập để mở trang Admin.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const loadOrdersData = async () => {
                try {
                    const orderResult = await apiFetch(`/giaodich_baidang/user/${viewerId}`);
                    const rawOrders = Array.isArray(orderResult?.data)
                        ? orderResult.data
                        : (Array.isArray(orderResult) ? orderResult : []);
                    const normalizedOrders = rawOrders.map((item) => normalizeOrder(item, origin, viewerId));
                    setOrders(normalizedOrders);
                    setSelectedOrderId((current) => {
                        if (current && normalizedOrders.some((item) => String(item.id) === String(current))) {
                            return current;
                        }

                        const priorityOrder = normalizedOrders.find((item) => item.waitingForMe)
                            || normalizedOrders.find((item) => item.isOpen)
                            || normalizedOrders[0];

                        return priorityOrder?.id || '';
                    });
                    setOrdersError('');
                } catch (orderError) {
                    console.error('Load orders for admin workspace failed', orderError);
                    setOrders([]);
                    setOrdersError(orderError.message || 'Không thể nạp đơn hàng ở thời điểm hiện tại.');
                }
            };

            try {
                const dashboardResult = await apiFetch(`/admin/dashboard/${viewerId}`);
                const dashboardData = dashboardResult?.data || dashboardResult || {};
                const profilePayload = dashboardData?.profile || null;

                if (!profilePayload?.user) {
                    throw new Error('Admin dashboard payload is incomplete.');
                }

                const normalizedProfile = normalizeProfilePayload(profilePayload, origin);
                setProfile(normalizedProfile);
                setSelectedListingId((current) => {
                    const listings = normalizedProfile?.listings?.items || [];
                    if (!listings.length) return '';
                    if (current && listings.some((item) => String(item.id) === String(current))) return current;
                    return listings[0].id;
                });

                const historyArr = Array.isArray(dashboardData?.pointHistory) ? dashboardData.pointHistory : [];
                setPointHistory(historyArr.map(normalizePointHistoryItem));

                const usageArr = Array.isArray(dashboardData?.pointUsageHistory) ? dashboardData.pointUsageHistory : [];
                setPointUsageHistory(usageArr.map(normalizePointUsageItem));
                setPointsError('');
                await loadOrdersData();
                return;
            } catch (dashboardError) {
                console.warn('Load dedicated admin dashboard failed, fallback to legacy sources.', dashboardError);
            }

            const query = new URLSearchParams({ viewerId, listingLimit: '60' });
            const [profileResult, pointHistoryResult, pointUsageResult] = await Promise.allSettled([
                apiFetch(`/profile/${viewerId}?${query.toString()}`),
                apiFetch(`/lich_su_tich_diem/getByUserId/${viewerId}?limit=120`),
                apiFetch(`/nguoidungtichdiem/getByUserId/${viewerId}`),
            ]);

            if (profileResult.status !== 'fulfilled') {
                throw profileResult.reason;
            }

            const normalizedProfile = normalizeProfilePayload(profileResult.value?.data || profileResult.value, origin);
            setProfile(normalizedProfile);
            setSelectedListingId((current) => {
                const listings = normalizedProfile?.listings?.items || [];
                if (!listings.length) return '';
                if (current && listings.some((item) => String(item.id) === String(current))) return current;
                return listings[0].id;
            });

            if (pointHistoryResult.status === 'fulfilled') {
                // BE trả raw array trực tiếp (không wrap trong {data})
                const raw = pointHistoryResult.value;
                const historyArr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
                setPointHistory(historyArr.map(normalizePointHistoryItem));
            } else {
                console.error('Load point history failed', pointHistoryResult.reason);
                setPointHistory([]);
            }

            if (pointUsageResult.status === 'fulfilled') {
                // BE trả raw array trực tiếp (không wrap trong {data})
                const raw = pointUsageResult.value;
                const usageArr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
                setPointUsageHistory(usageArr.map(normalizePointUsageItem));
            } else {
                console.error('Load point usage history failed', pointUsageResult.reason);
                setPointUsageHistory([]);
            }

            setPointsError(
                pointHistoryResult.status !== 'fulfilled' && pointUsageResult.status !== 'fulfilled'
                    ? 'Không thể tải lịch sử điểm ở thời điểm hiện tại.'
                    : '',
            );
            await loadOrdersData();
        } catch (requestError) {
            console.error('Load admin dashboard failed', requestError);
            setError(requestError.message || 'Không thể tải trang Admin.');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, origin, viewerId]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        if (!feedback?.text) return undefined;
        const timer = window.setTimeout(() => setFeedback(null), 3000);
        return () => window.clearTimeout(timer);
    }, [feedback]);

    useEffect(() => {
        const incomingSection = location.state?.section;
        const incomingOrderId = location.state?.orderId;
        if (!incomingSection && !incomingOrderId) return;

        if (incomingSection || incomingOrderId) {
            setActiveSection(incomingSection || 'orders');
        }

        if (incomingOrderId) {
            setSelectedOrderId(String(incomingOrderId));
        }

        navigate(location.pathname, { replace: true, state: {} });
    }, [location.pathname, location.state, navigate]);

    const listings = profile?.listings?.items || [];
    const activities = profile?.activity || [];
    const profileDisplayName = profile?.user?.name || profile?.user?.fullName || 'Quản trị viên';
    const selectedListing = useMemo(
        () => listings.find((listing) => String(listing.id) === String(selectedListingId)) || listings[0] || null,
        [listings, selectedListingId],
    );

    const analytics = useMemo(() => {
        const totalLikes = listings.reduce((sum, listing) => sum + Number(listing.likeCount || 0), 0);
        const totalComments = listings.reduce((sum, listing) => sum + Number(listing.commentCount || 0), 0);
        const estimatedTraffic = listings.reduce((sum, listing) => sum + estimateTraffic(listing), 0);
        const activeListings = listings.filter((listing) => listing.status === 'dang_ban').length;
        const topListings = [...listings].sort((left, right) => getEngagementScore(right) - getEngagementScore(left)).slice(0, 4);
        const statusRows = MANAGE_STATUSES.map((status) => {
            const count = listings.filter((listing) => listing.status === status.value).length;
            const percent = listings.length ? Math.round((count / listings.length) * 100) : 0;
            return { ...status, count, percent, tone: STATUS_TONES[status.value] || 'muted' };
        });
        return { totalLikes, totalComments, estimatedTraffic, activeListings, topListings, statusRows };
    }, [listings]);

    const filteredListings = useMemo(() => {
        const keyword = listingSearch.trim().toLowerCase();
        const next = listings.filter((listing) => {
            if (statusFilter !== 'all' && listing.status !== statusFilter) return false;
            if (!keyword) return true;
            return (listing.title || '').toLowerCase().includes(keyword)
                || (listing.categoryName || '').toLowerCase().includes(keyword)
                || (listing.location || '').toLowerCase().includes(keyword);
        });

        if (sortMode === 'latest') return next.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        if (sortMode === 'traffic') return next.sort((left, right) => estimateTraffic(right) - estimateTraffic(left));
        return next.sort((left, right) => getEngagementScore(right) - getEngagementScore(left));
    }, [listingSearch, listings, sortMode, statusFilter]);

    const opportunities = useMemo(() => {
        const items = [];
        if (analytics.activeListings < 3) items.push('Bạn đang có ít bài đăng đang bán. Hãy đẩy thêm tin mới để tăng độ phủ.');
        if (analytics.totalComments < Math.max(3, listings.length * 2)) items.push('Tỷ lệ bình luận còn thấp. Hãy bổ sung ảnh cận cảnh và tiêu đề rõ hơn.');
        if (analytics.topListings.some((item) => Number(item.commentCount || 0) > Number(item.likeCount || 0))) {
            items.push('Một vài bài đăng đang có khách hỏi nhiều hơn lượt thích. Bạn nên vào bình luận để phản hồi sớm.');
        }
        if (!items.length) items.push('Hiệu suất hiện tại khá ổn. Bạn có thể thử đẩy thêm bài mới để mở rộng tiếp cận.');
        return items;
    }, [analytics.activeListings, analytics.totalComments, analytics.topListings, listings.length]);

    const activityMetrics = useMemo(() => ({
        total: activities.length,
        comments: activities.filter((item) => item.type === 'comment_received').length,
        reviews: activities.filter((item) => item.type === 'review_received').length,
        friends: activities.filter((item) => item.type === 'friend_connected').length,
    }), [activities]);

    const postTimingAnalytics = useMemo(() => {
        const monthlySeries = buildRecentMonthSeries(listings, (item) => item.createdAt, () => 1, 6);
        const postingWindowSeries = getPostingWindowSeries(listings);
        const totalPosts = monthlySeries.reduce((sum, item) => sum + item.value, 0);
        const busiestMonth = [...monthlySeries].sort((left, right) => right.value - left.value)[0] || null;
        const recentPost = [...listings]
            .filter((item) => item?.createdAt)
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null;
        const postingWindow = getPostingWindowLabel(listings);

        return {
            monthlySeries,
            postingWindowSeries,
            totalPosts,
            busiestMonth,
            recentPost,
            postingWindow,
            averagePosts: monthlySeries.length ? (totalPosts / monthlySeries.length) : 0,
        };
    }, [listings]);

    const orderAnalytics = useMemo(() => {
        const total = orders.length;
        const open = orders.filter((item) => item.isOpen).length;
        const completed = orders.filter((item) => item.isCompleted).length;
        const waitingForMe = orders.filter((item) => item.waitingForMe).length;
        const asSeller = orders.filter((item) => item.role === 'seller').length;
        const asBuyer = orders.filter((item) => item.role === 'buyer').length;
        const withMeeting = orders.filter((item) => item.meetingAddress || item.meetingTime).length;
        const completedValue = orders
            .filter((item) => item.isCompleted)
            .reduce((sum, item) => sum + Number(item.postPrice || 0), 0);
        const recentCompleted = [...orders]
            .filter((item) => item.isCompleted && item.completedAt)
            .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())[0] || null;

        const statusRows = ORDER_STATUS_OPTIONS.map((status) => {
            const count = orders.filter((item) => item.status === status.value).length;
            const percent = total ? Math.round((count / total) * 100) : 0;
            return {
                ...status,
                count,
                percent,
                tone: ORDER_STATUS_TONES[status.value] || 'muted',
            };
        }).filter((item) => item.count > 0);

        return {
            total,
            open,
            completed,
            waitingForMe,
            asSeller,
            asBuyer,
            withMeeting,
            completedValue,
            recentCompleted,
            statusRows,
        };
    }, [orders]);

    const filteredOrders = useMemo(() => {
        const keyword = orderSearch.trim().toLowerCase();
        return [...orders]
            .filter((order) => {
                if (orderRoleFilter !== 'all' && order.role !== orderRoleFilter) return false;
                if (orderViewFilter === 'needs_action' && !order.waitingForMe) return false;
                if (orderViewFilter === 'open' && !order.isOpen) return false;
                if (orderViewFilter === 'completed' && !order.isCompleted) return false;
                if (!keyword) return true;

                return [
                    order.shortCode,
                    order.postTitle,
                    order.counterparty?.name,
                    order.meetingAddress,
                    order.meetingNote,
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(keyword));
            })
            .sort((left, right) => {
                if (left.waitingForMe !== right.waitingForMe) return Number(right.waitingForMe) - Number(left.waitingForMe);
                if (left.isOpen !== right.isOpen) return Number(right.isOpen) - Number(left.isOpen);
                return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
            });
    }, [orderRoleFilter, orderSearch, orderViewFilter, orders]);

    const selectedOrder = useMemo(
        () => filteredOrders.find((item) => String(item.id) === String(selectedOrderId)) || filteredOrders[0] || null,
        [filteredOrders, selectedOrderId],
    );

    useEffect(() => {
        if (!filteredOrders.length) return;
        if (filteredOrders.some((item) => String(item.id) === String(selectedOrderId))) return;
        setSelectedOrderId(filteredOrders[0].id);
    }, [filteredOrders, selectedOrderId]);

    const pointsAnalytics = useMemo(() => {
        const currentPoints = Number(profile?.user?.points || 0);
        const earnedTotal = pointHistory.reduce((sum, item) => sum + Math.max(0, item.pointsChanged), 0);
        const fallbackUsedHistory = pointHistory
            .filter((item) => item.pointsChanged < 0)
            .map((item) => ({
                id: item.id,
                createdAt: item.createdAt,
                title: item.description || 'Sử dụng điểm',
                description: item.transactionType || 'Giao dịch điểm',
                usedPoints: Math.abs(item.pointsChanged),
                pointsBefore: item.pointsBefore,
                pointsAfter: item.pointsAfter,
            }));
        const usageSource = pointUsageHistory.length ? pointUsageHistory : fallbackUsedHistory;
        const usedTotal = usageSource.reduce((sum, item) => sum + Number(item.usedPoints || 0), 0);
        const usageTimeline = buildRecentMonthSeries(usageSource, (item) => item.createdAt, (item) => Number(item.usedPoints || 0), 6);
        const usageCategorySeries = buildUsageCategorySeries(usageSource);
        const lastPointChange = [...pointHistory]
            .filter((item) => item.createdAt)
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null;
        const recentUsage = [...usageSource]
            .filter((item) => Number(item.usedPoints || 0) > 0)
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
            .slice(0, 4);

        return {
            currentPoints,
            earnedTotal,
            usedTotal,
            usageCount: usageSource.length,
            tier: getPointTier(currentPoints),
            usageTimeline,
            usageCategorySeries,
            lastPointChange,
            recentUsage,
            averageUsedPerMonth: usageTimeline.length ? (usedTotal / usageTimeline.length) : 0,
        };
    }, [pointHistory, pointUsageHistory, profile?.user?.points]);

    const activeSectionMeta = useMemo(
        () => ADMIN_SECTIONS.find((section) => section.id === activeSection) || ADMIN_SECTIONS[0],
        [activeSection],
    );

    const openPostDetail = useCallback((listing) => {
        if (!listing?.id) return;
        navigate(`/post/${listing.id}`, {
            state: {
                post: buildPostNavigationState(listing, profile?.user),
            },
        });
    }, [navigate, profile?.user]);

    const openPostComments = useCallback((listing) => {
        if (!listing?.id) return;
        navigate(`/post/${listing.id}/comments`, {
            state: {
                post: buildPostNavigationState(listing, profile?.user),
            },
        });
    }, [navigate, profile?.user]);

    const openActivityTarget = useCallback((activity) => {
        const postId = activity?.meta?.postId;
        if (postId) {
            const relatedListing = listings.find((item) => String(item.id) === String(postId)) || { id: postId };
            if (activity.type === 'comment_received') {
                openPostComments(relatedListing);
                return;
            }
            openPostDetail(relatedListing);
            return;
        }

        const targetUserId = activity?.meta?.partnerId || activity?.meta?.reviewerId || activity?.meta?.commenterId;
        if (targetUserId) {
            navigate(`/profile/${targetUserId}`);
        }
    }, [listings, navigate, openPostComments, openPostDetail]);

    const openOrderPost = useCallback((order) => {
        if (!order?.postId) return;
        navigate(`/post/${order.postId}`);
    }, [navigate]);

    const openOrderChat = useCallback((order) => {
        if (!order?.counterparty?.id || !order?.postId) return;

        navigate('/messages', {
            state: {
                selectedUser: {
                    id: order.counterparty.id,
                    name: order.counterparty.name,
                    avatar: order.counterparty.avatar,
                },
                focusPostId: order.postId,
            },
        });
    }, [navigate]);

    const handleStatusChange = useCallback(async (listingId, nextStatus) => {
        if (!listingId) return;
        setListingBusyId(String(listingId));
        try {
            await apiFetch(`/baidang/update/${listingId}`, {
                method: 'PUT',
                body: JSON.stringify({ trang_thai: nextStatus, thoi_gian_cap_nhat: new Date().toISOString() }),
            });
            setFeedback({ type: 'success', text: 'Đã cập nhật trạng thái bài đăng.' });
            await loadDashboard();
        } catch (requestError) {
            console.error('Update listing in admin failed', requestError);
            setFeedback({ type: 'error', text: requestError.message || 'Không thể cập nhật bài đăng.' });
        } finally {
            setListingBusyId('');
        }
    }, [apiFetch, loadDashboard]);

    const handleDeleteListing = useCallback(async (listingId) => {
        if (!listingId) return;
        if (!window.confirm('Bạn chắc chắn muốn xóa bài đăng này?')) return;
        setListingBusyId(String(listingId));
        try {
            await apiFetch(`/baidang/delete/${listingId}`, { method: 'DELETE' });
            setFeedback({ type: 'success', text: 'Đã xóa bài đăng.' });
            await loadDashboard();
        } catch (requestError) {
            console.error('Delete listing in admin failed', requestError);
            setFeedback({ type: 'error', text: requestError.message || 'Không thể xóa bài đăng.' });
        } finally {
            setListingBusyId('');
        }
    }, [apiFetch, loadDashboard]);

    const renderPrimaryMetrics = () => (
        <section className="admin-metrics-grid">
            <MetricCard icon={LayoutDashboard} label="Bài đang bán" value={formatNumber(analytics.activeListings)} helper={`${formatNumber(listings.length)} bài đang được theo dõi`} tone="brand" delay={0} />
            <MetricCard icon={Heart} label="Tổng quan tâm" value={formatNumber(analytics.totalLikes + analytics.totalComments)} helper={`${formatNumber(analytics.totalLikes)} thích - ${formatNumber(analytics.totalComments)} bình luận`} tone="success" delay={80} />
            <MetricCard icon={TrendingUp} label="Tiếp cận ước tính" value={formatNumber(analytics.estimatedTraffic)} helper="Tính từ tương tác và trạng thái bài đăng" tone="gold" delay={160} />
            <MetricCard icon={MessageCircle} label="Bài nổi bật" value={formatNumber(analytics.topListings.length)} helper="Mở nhanh để xem chi tiết hoặc bình luận" tone="danger" delay={240} />
        </section>
    );

    const renderOrderMetrics = () => (
        <section className="admin-metrics-grid">
            <MetricCard icon={ShoppingBag} label="Đơn đang mở" value={formatNumber(orderAnalytics.open)} helper={`${formatNumber(orderAnalytics.total)} đơn đã vào khu làm việc`} tone="brand" delay={0} />
            <MetricCard icon={BadgeCheck} label="Chờ bạn xử lý" value={formatNumber(orderAnalytics.waitingForMe)} helper="Ưu tiên phản hồi hoặc xác nhận ngay trong hôm nay" tone="danger" delay={80} />
            <MetricCard icon={Clock3} label="Đã chốt điểm hẹn" value={formatNumber(orderAnalytics.withMeeting)} helper="Đã có địa chỉ hoặc thời gian giao nhận" tone="gold" delay={160} />
            <MetricCard icon={TrendingUp} label="Giá trị đã chốt" value={orderAnalytics.completedValue > 0 ? formatCurrency(orderAnalytics.completedValue) : '0 ₫'} helper={`${formatNumber(orderAnalytics.completed)} đơn đã hoàn tất`} tone="success" delay={240} />
        </section>
    );

    const renderOpportunitiesCard = () => (
        <section className="admin-card">
            <div className="admin-card-head">
                <div>
                    <span className="admin-section-tag">Gợi ý</span>
                    <h2>Cơ hội tối ưu hôm nay</h2>
                    <p>Những gợi ý ngắn để bạn xử lý nhanh các điểm có thể làm tăng tỷ lệ chốt đơn.</p>
                </div>
            </div>

            <div className="admin-opportunity-list">
                {opportunities.map((item) => (
                    <div key={item} className="admin-opportunity-item">
                        <Sparkles size={15} />
                        <span>{item}</span>
                    </div>
                ))}
            </div>

            <div className="admin-side-actions">
                <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/settings')}>
                    <Settings size={16} />
                    Cài đặt tài khoản
                </button>
                <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/create-post')}>
                    <ArrowRight size={16} />
                    Tạo thêm bài mới
                </button>
            </div>
        </section>
    );

    const renderSelectedListingCard = (mode = 'summary') => (
        <section className="admin-card">
            <div className="admin-card-head">
                <div>
                    <span className="admin-section-tag">{mode === 'focus' ? 'Bài nổi bật' : 'Đang chọn'}</span>
                    <h2>{mode === 'focus' ? 'Bài đăng trọng tâm' : 'Bài đăng đang chọn'}</h2>
                    <p>{mode === 'focus' ? 'Khung xem nhanh một bài nổi bật để kiểm tra hình ảnh, trạng thái và hiệu suất trước khi thao tác.' : 'Một khung gọn để bạn không mất dấu bài đăng đang được xử lý.'}</p>
                </div>
                {selectedListing && (
                    <button type="button" className="admin-text-link" onClick={() => openPostDetail(selectedListing)}>
                        Mở chi tiết
                    </button>
                )}
            </div>

            {selectedListing ? (
                <div className={`admin-focus-card${mode === 'focus' ? ' expanded' : ''}`}>
                    <button type="button" className="admin-focus-media" onClick={() => openPostDetail(selectedListing)}>
                        <PostMediaGallery
                            images={selectedListing.images}
                            title={selectedListing.title}
                            badge={formatCurrency(selectedListing.price)}
                            interactive={false}
                        />
                    </button>

                    <div className="admin-focus-body">
                        <div className="admin-inline-badges">
                            <span className={`admin-pill tone-${selectedListing.statusTone}`}>{selectedListing.statusLabel}</span>
                            {selectedListing.categoryName && <span className="admin-pill tone-ghost">{selectedListing.categoryName}</span>}
                            {selectedListing.postTypeName && <span className="admin-pill tone-ghost">{selectedListing.postTypeName}</span>}
                        </div>

                        <h3>{selectedListing.title}</h3>
                        <div className="admin-price">{formatCurrency(selectedListing.price)}</div>
                        <p>{selectedListing.description || 'Bài đăng này chưa có mô tả chi tiết.'}</p>

                        <div className="admin-focus-stats">
                            <div>
                                <span>Đã đăng</span>
                                <strong>{formatDate(selectedListing.createdAt)}</strong>
                            </div>
                            <div>
                                <span>Vị trí</span>
                                <strong>{selectedListing.location || 'Chưa có vị trí'}</strong>
                            </div>
                            <div>
                                <span>Mã bài</span>
                                <strong>#{String(selectedListing.id || '').slice(0, 8) || 'Chưa có'}</strong>
                            </div>
                            <div>
                                <span>Tiếp cận</span>
                                <strong>{formatNumber(estimateTraffic(selectedListing))}</strong>
                            </div>
                        </div>

                        <div className="admin-stat-inline">
                            <span><Heart size={14} /> {formatNumber(selectedListing.likeCount)} thích</span>
                            <span><MessageCircle size={14} /> {formatNumber(selectedListing.commentCount)} bình luận</span>
                            <span><BarChart3 size={14} /> {formatNumber(getEngagementScore(selectedListing))} điểm</span>
                        </div>

                        <div className="admin-inline-actions">
                            <button type="button" className="admin-btn admin-btn-primary" onClick={() => openPostDetail(selectedListing)}>
                                <ExternalLink size={16} />
                                Xem bài đăng
                            </button>
                            <button type="button" className="admin-btn admin-btn-soft" onClick={() => openPostComments(selectedListing)}>
                                <MessageCircle size={16} />
                                Mở bình luận
                            </button>
                            <button
                                type="button"
                                className="admin-btn admin-btn-danger"
                                onClick={() => handleDeleteListing(selectedListing.id)}
                                disabled={listingBusyId === String(selectedListing.id)}
                            >
                                {listingBusyId === String(selectedListing.id) ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                                Xóa bài đăng
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="admin-empty-note">Bạn chưa có bài đăng nào để quản lý. Hãy tạo bài đầu tiên để bắt đầu dashboard.</div>
            )}
        </section>
    );

    const renderManageBoard = () => (
        <section className="admin-card admin-board-card">
            <div className="admin-card-head">
                <div>
                    <span className="admin-section-tag">Quản lý</span>
                    <h2>Bảng quản lý bài đăng</h2>
                    <p>Lọc nhanh, đổi trạng thái và mở bài đăng ngay trong một bố cục gọn hơn.</p>
                </div>
                <div className="admin-section-chip">{formatNumber(filteredListings.length)} bài</div>
            </div>

            <div className="admin-toolbar">
                <input type="text" value={listingSearch} onChange={(event) => setListingSearch(event.target.value)} placeholder="Tìm theo tiêu đề, danh mục hoặc vị trí" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">Tất cả trạng thái</option>
                    {MANAGE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                    <option value="engagement">Ưu tiên tương tác</option>
                    <option value="traffic">Ưu tiên tiếp cận</option>
                    <option value="latest">Mới nhất</option>
                </select>
            </div>

            <div className="admin-post-list">
                {filteredListings.length > 0 ? (
                    filteredListings.map((listing, index) => (
                        <article key={listing.id} className="admin-post-row" style={{ '--delay': `${index * 50}ms` }}>
                            <button type="button" className="admin-post-thumb" onClick={() => setSelectedListingId(listing.id)}>
                                <PostMediaGallery images={listing.images} title={listing.title} interactive={false} maxVisible={3} />
                            </button>
                            <div className="admin-post-copy">
                                <div className="admin-inline-badges">
                                    <span className={`admin-pill tone-${listing.statusTone}`}>{listing.statusLabel}</span>
                                    {listing.categoryName && <span className="admin-pill tone-ghost">{listing.categoryName}</span>}
                                </div>
                                <strong>{listing.title}</strong>
                                <span>{formatCurrency(listing.price)}</span>
                                <small>{listing.location || 'Chưa có vị trí'} - {formatNumber(listing.likeCount)} thích - {formatNumber(listing.commentCount)} bình luận</small>
                            </div>
                            <div className="admin-post-stats">
                                <div><label>Tương tác</label><strong>{formatNumber(getEngagementScore(listing))}</strong></div>
                                <div><label>Tiếp cận</label><strong>{formatNumber(estimateTraffic(listing))}</strong></div>
                            </div>
                            <div className="admin-post-controls">
                                <select value={listing.status} onChange={(event) => handleStatusChange(listing.id, event.target.value)} disabled={listingBusyId === String(listing.id)}>
                                    {MANAGE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                                </select>
                                <button type="button" className="admin-btn admin-btn-soft" onClick={() => openPostDetail(listing)}>
                                    <ExternalLink size={16} />
                                    Xem
                                </button>
                                <button type="button" className="admin-btn admin-btn-soft" onClick={() => openPostComments(listing)}>
                                    <MessageCircle size={16} />
                                    Bình luận
                                </button>
                                <button
                                    type="button"
                                    className="admin-btn admin-btn-danger"
                                    onClick={() => handleDeleteListing(listing.id)}
                                    disabled={listingBusyId === String(listing.id)}
                                >
                                    {listingBusyId === String(listing.id) ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                                    Xóa bài
                                </button>
                            </div>
                        </article>
                    ))
                ) : (
                    <div className="admin-empty-note">Không có bài đăng nào khớp với bộ lọc hiện tại.</div>
                )}
            </div>
        </section>
    );

    const renderOrdersBoard = () => (
        <>
            <section className="admin-card">
                <div className="admin-card-head">
                    <div>
                        <span className="admin-section-tag">Danh sách đơn</span>
                        <h2>Đơn hàng từ tin nhắn chốt đơn</h2>
                        <p>Mỗi dòng là một deal thật phát sinh trong chat. Bạn chỉ cần chọn một dòng là phần chi tiết bên dưới sẽ đổi theo đúng đơn đó.</p>
                    </div>
                    <div className="admin-section-chip">{formatNumber(filteredOrders.length)} đơn</div>
                </div>

                <div className="admin-orders-toolbar">
                    <label className="admin-search" htmlFor="admin-order-search">
                        <Search size={16} />
                        <input
                            id="admin-order-search"
                            type="text"
                            value={orderSearch}
                            onChange={(event) => setOrderSearch(event.target.value)}
                            placeholder="Tìm theo mã đơn, món hàng hoặc người liên quan"
                        />
                    </label>

                    <select value={orderRoleFilter} onChange={(event) => setOrderRoleFilter(event.target.value)}>
                        <option value="all">Mọi vai trò</option>
                        <option value="seller">Tôi đang bán</option>
                        <option value="buyer">Tôi đang mua</option>
                    </select>
                </div>

                <div className="admin-orders-filter-pills">
                    {ORDER_VIEW_FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            className={`admin-orders-filter-pill${orderViewFilter === filter.value ? ' active' : ''}`}
                            onClick={() => setOrderViewFilter(filter.value)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {ordersError && <div className="admin-empty-note compact">{ordersError}</div>}

                <div className="admin-order-list">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order, index) => (
                            <article
                                key={order.id}
                                className={`admin-order-row${String(selectedOrder?.id) === String(order.id) ? ' active' : ''}`}
                                style={{ '--delay': `${index * 40}ms` }}
                            >
                                <button type="button" className="admin-order-row-main" onClick={() => setSelectedOrderId(order.id)}>
                                    <img src={order.postImage} alt={order.postTitle} className="admin-order-compact-thumb" />

                                    <div className="admin-order-compact-body">
                                        <div className="admin-order-compact-head">
                                            <div className="admin-inline-badges">
                                                <span className={`admin-pill tone-${order.statusTone}`}>{order.statusLabel}</span>
                                                {order.waitingForMe && <span className="admin-pill tone-danger">Cần bạn xử lý</span>}
                                            </div>
                                            <strong>{order.shortCode}</strong>
                                        </div>

                                        <h3>{order.postTitle}</h3>

                                        <div className="admin-order-compact-meta">
                                            <span>{formatCurrency(order.postPrice)}</span>
                                            <span>{order.counterparty?.name || 'Đối tác giao dịch'}</span>
                                            <span>{order.meetingTime ? formatDate(order.meetingTime, true) : 'Chưa hẹn giờ'}</span>
                                        </div>

                                        <p>{order.meetingAddress || order.postLocation || 'Chưa có điểm hẹn cụ thể'}</p>
                                    </div>
                                </button>

                                <div className="admin-order-row-side">
                                    <div className="admin-order-row-side-meta">
                                        <span>{order.role === 'seller' ? 'Bạn đang bán' : order.role === 'buyer' ? 'Bạn đang mua' : 'Đơn liên quan'}</span>
                                        <strong>{formatRelativeTime(order.requestedAt)}</strong>
                                    </div>

                                    <div className="admin-order-actions compact">
                                        <button type="button" className="admin-btn admin-btn-soft" onClick={() => openOrderPost(order)}>
                                            <ExternalLink size={16} />
                                            Xem bài
                                        </button>
                                        <button type="button" className="admin-btn admin-btn-primary" onClick={() => openOrderChat(order)}>
                                            <MessageCircle size={16} />
                                            Mở chat
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="admin-empty-note">Không có đơn hàng nào khớp với bộ lọc hiện tại.</div>
                    )}
                </div>
            </section>

            <div className="admin-main-grid">
                <section className="admin-card admin-order-detail-card">
                    <div className="admin-card-head">
                        <div>
                            <span className="admin-section-tag">Đơn đang chọn</span>
                            <h2>Chi tiết đơn đang chọn</h2>
                            <p>Phần này chỉ tập trung vào đúng một đơn: trạng thái hiện tại, hai bên giao dịch, điểm hẹn và lịch sử xử lý gần nhất.</p>
                        </div>
                        {selectedOrder && (
                            <div className="admin-inline-actions">
                                <button type="button" className="admin-btn admin-btn-soft" onClick={() => openOrderPost(selectedOrder)}>
                                    <ExternalLink size={16} />
                                    Xem bài
                                </button>
                                <button type="button" className="admin-btn admin-btn-primary" onClick={() => openOrderChat(selectedOrder)}>
                                    <MessageCircle size={16} />
                                    Mở chat
                                </button>
                            </div>
                        )}
                    </div>

                    {selectedOrder ? (
                        <div className="admin-order-detail-grid">
                            <div className="admin-order-hero">
                                <img src={selectedOrder.postImage} alt={selectedOrder.postTitle} className="admin-order-hero-image" />
                                <div className="admin-order-hero-copy">
                                    <div className="admin-inline-badges">
                                        <span className={`admin-pill tone-${selectedOrder.statusTone}`}>{selectedOrder.statusLabel}</span>
                                        <span className="admin-pill tone-ghost">{selectedOrder.roleLabel}</span>
                                        <span className={`admin-pill tone-${selectedOrder.postStatusTone}`}>{selectedOrder.postStatusLabel}</span>
                                    </div>
                                    <h2>{selectedOrder.postTitle}</h2>
                                    <div className="admin-price">{formatCurrency(selectedOrder.postPrice)}</div>
                                    <p>
                                        {selectedOrder.waitingForMe
                                            ? 'Đơn này đang chờ đúng thao tác từ bạn. Bạn có thể mở lại cuộc chat để xử lý ngay đúng deal.'
                                            : 'Đơn này được đồng bộ từ tin nhắn chốt đơn, nên mọi mốc quan trọng ở đây đều bám theo giao dịch thật trong chat.'}
                                    </p>

                                    <div className="admin-focus-stats">
                                        <div>
                                            <span>Mã đơn</span>
                                            <strong>{selectedOrder.shortCode}</strong>
                                        </div>
                                        <div>
                                            <span>Mở đơn lúc</span>
                                            <strong>{formatDate(selectedOrder.requestedAt, true)}</strong>
                                        </div>
                                        <div>
                                            <span>Điểm hẹn</span>
                                            <strong>{selectedOrder.meetingAddress || 'Chưa chốt địa chỉ'}</strong>
                                        </div>
                                        <div>
                                            <span>Giờ hẹn</span>
                                            <strong>{selectedOrder.meetingTime ? formatDate(selectedOrder.meetingTime, true) : 'Chưa đặt thời gian'}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-order-party-grid">
                                {[{
                                    label: 'Người bán',
                                    person: selectedOrder.seller,
                                }, {
                                    label: 'Người mua',
                                    person: selectedOrder.buyer,
                                }].map((item) => (
                                    <div key={item.label} className="admin-order-party-card">
                                        <img src={item.person.avatar} alt={item.person.name} />
                                        <div>
                                            <span>{item.label}</span>
                                            <strong>{item.person.name}</strong>
                                            <small>{String(item.person.id) === String(viewerId) ? 'Đây là bạn trong giao dịch này.' : 'Đối tác liên quan trực tiếp tới đơn hàng.'}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="admin-meta-grid">
                                <div>
                                    <span>Vị trí bài đăng</span>
                                    <strong>{selectedOrder.postLocation || 'Chưa có vị trí'}</strong>
                                </div>
                                <div>
                                    <span>Mốc hoàn tất</span>
                                    <strong>{selectedOrder.completedAt ? formatDate(selectedOrder.completedAt, true) : 'Chưa hoàn tất'}</strong>
                                </div>
                                <div>
                                    <span>Xác nhận người bán</span>
                                    <strong>{selectedOrder.completion?.sellerConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</strong>
                                </div>
                                <div>
                                    <span>Xác nhận người mua</span>
                                    <strong>{selectedOrder.completion?.buyerConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</strong>
                                </div>
                            </div>

                            {(selectedOrder.buyerNote || selectedOrder.meetingNote) && (
                                <div className="admin-order-note-grid">
                                    {selectedOrder.buyerNote && (
                                        <div className="admin-order-note-card">
                                            <span>Ghi chú lúc mở đơn</span>
                                            <strong>{selectedOrder.buyerNote}</strong>
                                        </div>
                                    )}
                                    {selectedOrder.meetingNote && (
                                        <div className="admin-order-note-card">
                                            <span>Ghi chú điểm hẹn</span>
                                            <strong>{selectedOrder.meetingNote}</strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="admin-card-head">
                                <div>
                                    <span className="admin-section-tag">Dòng sự kiện</span>
                                    <h2>Lịch sử xử lý đơn</h2>
                                    <p>Những bước gần nhất được ghi lại để bạn biết đơn này đang đi đến đâu.</p>
                                </div>
                            </div>

                            {selectedOrder.historyPreview.length > 0 ? (
                                <div className="admin-order-history-list">
                                    {selectedOrder.historyPreview.map((entry) => (
                                        <div key={entry.id || `${entry.hanh_dong}-${entry.thoi_gian}`} className="admin-order-history-item">
                                            <div>
                                                <strong>{ORDER_HISTORY_ACTION_LABELS[entry.hanh_dong] || entry.hanh_dong || 'Cập nhật giao dịch'}</strong>
                                                <span>{entry.noi_dung || 'Hệ thống đã ghi nhận thao tác cho đơn hàng này.'}</span>
                                            </div>
                                            <small>{formatRelativeTime(entry.thoi_gian)}</small>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="admin-empty-note compact">Đơn này chưa có lịch sử chi tiết để hiển thị thêm.</div>
                            )}

                            <div className="admin-inline-actions">
                                <button type="button" className="admin-btn admin-btn-primary" onClick={() => openOrderChat(selectedOrder)}>
                                    <MessageCircle size={16} />
                                    Đi tới chat xử lý đơn
                                </button>
                                <button type="button" className="admin-btn admin-btn-soft" onClick={() => openOrderPost(selectedOrder)}>
                                    <ExternalLink size={16} />
                                    Mở bài đăng
                                </button>
                                {selectedOrder.meetingMapUrl && (
                                    <a href={selectedOrder.meetingMapUrl} target="_blank" rel="noreferrer" className="admin-btn admin-btn-soft admin-order-link-btn">
                                        <MapPin size={16} />
                                        Xem bản đồ
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="admin-empty-note">
                            Chưa có đơn hàng nào được đồng bộ từ phần tin nhắn chốt đơn. Khi có giao dịch, khu này sẽ hiện mã đơn, người liên quan, điểm hẹn và mốc hoàn tất.
                        </div>
                    )}
                </section>

                <aside className="admin-side-column">
                    <section className="admin-card">
                        <div className="admin-card-head">
                            <div>
                                <span className="admin-section-tag">Đọc nhanh</span>
                                <h2>Nhịp đơn hàng hiện tại</h2>
                                <p>Các số này giúp bạn biết hôm nay nên ưu tiên xử lý loại đơn nào trước.</p>
                            </div>
                        </div>

                        <div className="admin-status-list">
                            <div className="admin-status-row">
                                <div className="admin-status-copy">
                                    <strong>Đơn bán ra</strong>
                                    <span>{formatNumber(orderAnalytics.asSeller)} đơn</span>
                                </div>
                            </div>
                            <div className="admin-status-row">
                                <div className="admin-status-copy">
                                    <strong>Đơn bạn mua</strong>
                                    <span>{formatNumber(orderAnalytics.asBuyer)} đơn</span>
                                </div>
                            </div>
                            <div className="admin-status-row">
                                <div className="admin-status-copy">
                                    <strong>Chờ bạn xử lý</strong>
                                    <span>{formatNumber(orderAnalytics.waitingForMe)} đơn</span>
                                </div>
                            </div>
                            <div className="admin-status-row">
                                <div className="admin-status-copy">
                                    <strong>Hoàn tất gần nhất</strong>
                                    <span>{orderAnalytics.recentCompleted ? formatRelativeTime(orderAnalytics.recentCompleted.completedAt) : 'Chưa có'}</span>
                                </div>
                            </div>
                        </div>

                        {orderAnalytics.statusRows.length > 0 ? (
                            <div className="admin-status-list">
                                {orderAnalytics.statusRows.map((row) => (
                                    <div key={row.value} className="admin-status-row">
                                        <div className="admin-status-copy">
                                            <strong>{row.label}</strong>
                                            <span>{formatNumber(row.count)} đơn</span>
                                        </div>
                                        <div className="admin-status-bar">
                                            <div className={`tone-${row.tone}`} style={{ width: `${row.percent}%` }} />
                                        </div>
                                        <small>{row.percent}%</small>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="admin-empty-note compact">Khi có đơn hàng, tỷ trọng theo trạng thái sẽ hiện ở đây.</div>
                        )}
                    </section>
                </aside>
            </div>
        </>
    );

    const renderPostingTimelineCard = () => (
        <section className="admin-card admin-chart-card">
            <div className="admin-card-head">
                <div>
                    <span className="admin-section-tag">Biểu đồ đăng bài</span>
                    <h2>Thời gian đăng bài</h2>
                    <p>Theo dõi nhịp đăng bài trong 6 tháng gần nhất để biết thời điểm nào bạn đang hoạt động đều nhất.</p>
                </div>
                <div className="admin-section-chip">6 tháng gần nhất</div>
            </div>

            <div className="admin-chart-summary">
                <div>
                    <span>Tổng kỳ này</span>
                    <strong>{formatNumber(postTimingAnalytics.totalPosts)} bài</strong>
                </div>
                <div>
                    <span>Đăng nhiều nhất</span>
                    <strong>{postTimingAnalytics.busiestMonth ? `${postTimingAnalytics.busiestMonth.label} · ${formatNumber(postTimingAnalytics.busiestMonth.value)} bài` : 'Chưa có dữ liệu'}</strong>
                </div>
            </div>

            {postTimingAnalytics.totalPosts > 0 ? (
                <div className="admin-chart-library-shell">
                    <div className="admin-chart-surface large">
                        <div className="admin-chart-surface-head">
                            <strong>Số bài theo tháng</strong>
                            <span>Xu hướng đăng bài</span>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={postTimingAnalytics.monthlySeries} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="post-chart-area" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={chartPalette.brand} stopOpacity={0.28} />
                                        <stop offset="100%" stopColor={chartPalette.brand} stopOpacity={0.04} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke={chartPalette.grid} strokeDasharray="4 4" vertical={false} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={chartTickStyle} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={chartTickStyle} />
                                <Tooltip content={<AdminChartTooltip labelPrefix="Tháng" />} />
                                <Area type="monotone" dataKey="value" name="Bài đăng" stroke={chartPalette.brand} strokeWidth={3} fill="url(#post-chart-area)" activeDot={{ r: 5, fill: chartPalette.brand, stroke: chartPalette.activeDotStroke, strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="admin-chart-surface compact">
                        <div className="admin-chart-surface-head">
                            <strong>Khung giờ đăng bài</strong>
                            <span>Thời điểm hoạt động</span>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={postTimingAnalytics.postingWindowSeries} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke={chartPalette.grid} strokeDasharray="4 4" vertical={false} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={chartTickStyle} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={chartTickStyle} />
                                <Tooltip content={<AdminChartTooltip />} />
                                <Bar dataKey="value" name="Số bài" radius={[10, 10, 0, 0]} fill={chartPalette.success}>
                                    {postTimingAnalytics.postingWindowSeries.map((entry, index) => (
                                        <Cell key={`${entry.label}-${index}`} fill={index % 2 === 0 ? chartPalette.brand : chartPalette.success} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="admin-empty-note compact">Chưa có dữ liệu đăng bài để dựng biểu đồ.</div>
            )}

            <div className="admin-chart-facts">
                <div className="admin-chart-fact">
                    <span>Nhịp đăng trung bình</span>
                    <strong>{postTimingAnalytics.averagePosts.toFixed(1)} bài/tháng</strong>
                </div>
                <div className="admin-chart-fact">
                    <span>Khung giờ thường đăng</span>
                    <strong>{postTimingAnalytics.postingWindow.label}</strong>
                </div>
                <div className="admin-chart-fact">
                    <span>Bài đăng gần nhất</span>
                    <strong>{postTimingAnalytics.recentPost ? formatDate(postTimingAnalytics.recentPost.createdAt, true) : 'Chưa có bài đăng'}</strong>
                </div>
            </div>
        </section>
    );

    const renderPointsDashboard = () => (
        <>
            <section className="admin-metrics-grid">
                <MetricCard icon={Sparkles} label="Điểm hiện tại" value={formatNumber(pointsAnalytics.currentPoints)} helper={`Hạng ${pointsAnalytics.tier}`} tone="brand" delay={0} />
                <MetricCard icon={TrendingUp} label="Đã tích lũy" value={formatNumber(pointsAnalytics.earnedTotal)} helper="Tổng điểm cộng từ lịch sử" tone="success" delay={80} />
                <MetricCard icon={BarChart3} label="Đã sử dụng" value={formatNumber(pointsAnalytics.usedTotal)} helper="Tổng điểm đã đổi và tiêu" tone="gold" delay={160} />
                <MetricCard icon={LayoutDashboard} label="Lượt sử dụng" value={formatNumber(pointsAnalytics.usageCount)} helper="Giao dịch dùng điểm đã ghi nhận" tone="danger" delay={240} />
            </section>

            <div className="admin-main-grid">
                <section className="admin-card admin-chart-card">
                    <div className="admin-card-head">
                        <div>
                            <span className="admin-section-tag">Biểu đồ điểm</span>
                            <h2>Lịch sử sử dụng điểm</h2>
                            <p>Xem lượng điểm đã dùng theo tháng để biết giai đoạn nào tài khoản đang tiêu điểm nhiều nhất.</p>
                        </div>
                        <div className="admin-section-chip">6 tháng gần nhất</div>
                    </div>

                    {pointsError && <div className="admin-empty-note compact">{pointsError}</div>}

                    <div className="admin-chart-summary">
                        <div>
                            <span>Tổng đã dùng</span>
                            <strong>{formatNumber(pointsAnalytics.usedTotal)} điểm</strong>
                        </div>
                        <div>
                            <span>Trung bình / tháng</span>
                            <strong>{pointsAnalytics.averageUsedPerMonth.toFixed(1)} điểm</strong>
                        </div>
                    </div>

                    {(pointsAnalytics.usedTotal > 0 || pointsAnalytics.usageCategorySeries.length > 0) ? (
                        <div className="admin-chart-library-shell">
                            <div className="admin-chart-surface large">
                                <div className="admin-chart-surface-head">
                                    <strong>Lịch sử dùng điểm</strong>
                                    <span>Điểm đã sử dụng theo tháng</span>
                                </div>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={pointsAnalytics.usageTimeline} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke={chartPalette.grid} strokeDasharray="4 4" vertical={false} />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={chartTickStyle} />
                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={chartTickStyle} />
                                        <Tooltip content={<AdminChartTooltip labelPrefix="Tháng" />} />
                                        <Bar dataKey="value" name="Điểm đã dùng" radius={[10, 10, 0, 0]} fill={chartPalette.brand} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="admin-chart-surface compact">
                                <div className="admin-chart-surface-head">
                                    <strong>Phân bổ sử dụng</strong>
                                    <span>Hạng mục dùng điểm</span>
                                </div>
                                {pointsAnalytics.usageCategorySeries.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={pointsAnalytics.usageCategorySeries}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={56}
                                                outerRadius={90}
                                                paddingAngle={3}
                                                stroke="rgba(255,255,255,0.8)"
                                                strokeWidth={2}
                                            >
                                                {pointsAnalytics.usageCategorySeries.map((entry, index) => (
                                                    <Cell key={`${entry.name}-${index}`} fill={chartPalette.pie[index % chartPalette.pie.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<AdminChartTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="admin-empty-note compact">Chưa có hạng mục dùng điểm để hiển thị.</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="admin-empty-note compact">Chưa có giao dịch dùng điểm để dựng biểu đồ.</div>
                    )}

                    <div className="admin-chart-facts">
                        <div className="admin-chart-fact">
                            <span>Số dư hiện tại</span>
                            <strong>{formatNumber(pointsAnalytics.currentPoints)} điểm</strong>
                        </div>
                        <div className="admin-chart-fact">
                            <span>Lần cập nhật gần nhất</span>
                            <strong>{pointsAnalytics.lastPointChange ? formatDate(pointsAnalytics.lastPointChange.createdAt, true) : 'Chưa có giao dịch'}</strong>
                        </div>
                        <div className="admin-chart-fact">
                            <span>Hạng điểm</span>
                            <strong>{pointsAnalytics.tier}</strong>
                        </div>
                    </div>
                </section>

                <aside className="admin-side-column">
                    <section className="admin-card">
                        <div className="admin-card-head">
                            <div>
                                <span className="admin-section-tag">Tổng quan điểm</span>
                                <h2>Dashboard điểm hiện tại</h2>
                                <p>Các chỉ số chính và những giao dịch dùng điểm gần nhất để bạn theo dõi nhanh.</p>
                            </div>
                        </div>

                        <div className="admin-points-balance-card">
                            <span>Số dư khả dụng</span>
                            <strong>{formatNumber(pointsAnalytics.currentPoints)} điểm</strong>
                            <small>{pointsAnalytics.lastPointChange ? `Cập nhật gần nhất ${formatRelativeTime(pointsAnalytics.lastPointChange.createdAt)}` : 'Chưa có biến động điểm gần đây'}</small>
                        </div>

                        <div className="admin-points-usage-list">
                            {pointsAnalytics.recentUsage.length > 0 ? (
                                pointsAnalytics.recentUsage.map((item) => (
                                    <div key={item.id} className="admin-points-usage-item">
                                        <div>
                                            <strong>{item.title || 'Sử dụng điểm'}</strong>
                                            <span>{item.description || item.transactionType || 'Giao dịch điểm'}</span>
                                        </div>
                                        <div className="admin-points-usage-meta">
                                            <strong>-{formatNumber(item.usedPoints)} điểm</strong>
                                            <small>{formatDate(item.createdAt, true)}</small>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="admin-empty-note compact">Chưa có giao dịch sử dụng điểm nào để hiển thị.</div>
                            )}
                        </div>

                        <div className="admin-side-actions">
                            <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/settings')}>
                                <Settings size={16} />
                                Mở cài đặt điểm
                            </button>
                        </div>
                    </section>
                </aside>
            </div>
        </>
    );

    if (loading && !profile) {
        return (
            <div className="admin-page">
                <div className="admin-board">
                    <div className="admin-state-card">
                        <Loader2 size={28} className="spin" />
                        <h1>Đang dựng trung tâm Admin</h1>
                        <p>Mình đang nạp bài đăng, thống kê hiệu suất và dữ liệu cần thiết cho dashboard.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="admin-page">
                <div className="admin-board">
                    <div className="admin-state-card">
                        <Store size={28} />
                        <h1>Không mở được trang Admin</h1>
                        <p>{error}</p>
                        <div className="admin-inline-actions">
                            {!viewerId && <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/login')}>Đăng nhập</button>}
                            <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/profile')}>Quay lại hồ sơ</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="admin-page">
            <div className="admin-board">
                <aside className="admin-sidebar">
                    <div className="admin-brand">
                        <div className="admin-brand-mark"><Store size={22} /></div>
                        <div className="admin-brand-copy">
                            <strong>OLODO Admin</strong>
                            <span>Trung tâm bài đăng và đơn hàng</span>
                        </div>
                    </div>

                    <div className="admin-sidebar-card admin-profile-card">
                        <img src={profile?.user?.avatar || DEFAULT_AVATAR} alt={profileDisplayName} />
                        <div>
                            <strong>{profileDisplayName}</strong>
                            <span>{profile?.user?.email || 'Trung tâm điều hành bài đăng và giao dịch'}</span>
                        </div>
                        <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/profile')}>
                            <UserRound size={16} />
                            Hồ sơ
                        </button>
                    </div>

                    <div className="admin-sidebar-card admin-sidebar-nav">
                        <div className="admin-sidebar-card-title">Khu vực làm việc</div>
                        <div className="admin-nav-list">
                            {ADMIN_SECTIONS.map((section) => (
                                <SidebarNavItem
                                    key={section.id}
                                    icon={section.icon}
                                    label={section.label}
                                    helper={section.helper}
                                    active={activeSection === section.id}
                                    onClick={() => setActiveSection(section.id)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="admin-sidebar-footer">
                        <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/create-post')}>
                            <PlusCircle size={16} />
                            Đăng bài mới
                        </button>
                        <button type="button" className="admin-btn admin-btn-soft" onClick={() => navigate('/settings')}>
                            <Settings size={16} />
                            Cài đặt
                        </button>
                        <button type="button" className="admin-btn admin-btn-soft" onClick={loadDashboard}>
                            <RefreshCw size={16} />
                            Làm mới
                        </button>
                    </div>
                </aside>

                <main className="admin-workspace">
                    <header className="admin-topbar admin-card">
                        <div className="admin-topbar-copy">
                            <span className="admin-kicker">{activeSectionMeta.kicker}</span>
                            <h1>{activeSectionMeta.title}</h1>
                            <p>{activeSectionMeta.description}</p>
                        </div>

                        <div className="admin-topbar-actions">
                            {activeSection === 'manage' ? (
                                <label className="admin-search" htmlFor="admin-search-input">
                                    <Search size={16} />
                                    <input
                                        id="admin-search-input"
                                        type="text"
                                        value={listingSearch}
                                        onChange={(event) => setListingSearch(event.target.value)}
                                        placeholder="Tìm bài đăng, danh mục hoặc vị trí"
                                    />
                                </label>
                            ) : activeSection === 'orders' ? (
                                <div className="admin-topbar-badge">
                                    Đơn hàng ở đây được đồng bộ trực tiếp từ phần chốt đơn trong Tin nhắn.
                                </div>
                            ) : (
                                <div className="admin-topbar-badge">
                                    Chuyển khu vực ở thanh bên để làm việc gọn và tập trung hơn.
                                </div>
                            )}
                            <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/create-post')}>
                                <PlusCircle size={16} />
                                Đăng bài mới
                            </button>
                        </div>
                    </header>

                    {feedback?.text && <div className={`admin-feedback ${feedback.type || 'info'}`}>{feedback.text}</div>}

                    {['overview', 'manage', 'analytics'].includes(activeSection) && renderPrimaryMetrics()}
                    {activeSection === 'orders' && renderOrderMetrics()}

                    {activeSection === 'overview' && (
                        <div className="admin-main-grid">
                            {renderSelectedListingCard('focus')}

                            <aside className="admin-side-column">
                                <section className="admin-card">
                                    <div className="admin-card-head">
                                        <div>
                                            <span className="admin-section-tag">Tổng hợp nhanh</span>
                                            <h2>Phân tích nhanh</h2>
                                            <p>Trạng thái bài đăng và nhóm bài hiệu suất cao được đặt riêng để khu chính vẫn thoáng và dễ nhìn.</p>
                                        </div>
                                    </div>

                                    <div className="admin-status-list">
                                        {analytics.statusRows.map((row) => (
                                            <div key={row.value} className="admin-status-row">
                                                <div className="admin-status-copy">
                                                    <strong>{row.label}</strong>
                                                    <span>{formatNumber(row.count)} bài</span>
                                                </div>
                                                <div className="admin-status-bar">
                                                    <div className={`tone-${row.tone}`} style={{ width: `${row.percent}%` }} />
                                                </div>
                                                <small>{row.percent}%</small>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="admin-top-list">
                                        <div className="admin-section-caption">
                                            <Sparkles size={14} />
                                            Top bài có hiệu suất cao
                                        </div>
                                        {analytics.topListings.length > 0 ? (
                                            analytics.topListings.map((listing) => (
                                                <button
                                                    key={listing.id}
                                                    type="button"
                                                    className={`admin-top-item${String(selectedListing?.id) === String(listing.id) ? ' active' : ''}`}
                                                    onClick={() => setSelectedListingId(listing.id)}
                                                >
                                                    <span>{listing.title}</span>
                                                    <strong>{formatNumber(getEngagementScore(listing))} điểm</strong>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="admin-empty-note compact">Top hiệu suất sẽ xuất hiện khi bạn có thêm dữ liệu tương tác.</div>
                                        )}
                                    </div>
                                </section>

                                {renderOpportunitiesCard()}
                            </aside>
                        </div>
                    )}

                    {activeSection === 'manage' && renderManageBoard()}

                    {activeSection === 'orders' && renderOrdersBoard()}

                    {activeSection === 'analytics' && (
                        <div className="admin-main-grid">
                            {renderPostingTimelineCard()}

                            <aside className="admin-side-column">
                                <section className="admin-card">
                                    <div className="admin-card-head">
                                        <div>
                                            <span className="admin-section-tag">Đọc nhanh</span>
                                            <h2>Trạng thái và top tương tác</h2>
                                            <p>Giữ lại các chỉ dấu quan trọng để bạn vừa xem biểu đồ vừa nắm được bài nào đang nổi bật nhất.</p>
                                        </div>
                                    </div>

                                    <div className="admin-status-list">
                                        {analytics.statusRows.map((row) => (
                                            <div key={row.value} className="admin-status-row">
                                                <div className="admin-status-copy">
                                                    <strong>{row.label}</strong>
                                                    <span>{formatNumber(row.count)} bài</span>
                                                </div>
                                                <div className="admin-status-bar">
                                                    <div className={`tone-${row.tone}`} style={{ width: `${row.percent}%` }} />
                                                </div>
                                                <small>{row.percent}%</small>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="admin-top-list">
                                        <div className="admin-section-caption">
                                            <Sparkles size={14} />
                                            Top bài có hiệu suất cao
                                        </div>
                                        {analytics.topListings.length > 0 ? (
                                            analytics.topListings.map((listing) => (
                                                <button
                                                    key={listing.id}
                                                    type="button"
                                                    className={`admin-top-item${String(selectedListing?.id) === String(listing.id) ? ' active' : ''}`}
                                                    onClick={() => setSelectedListingId(listing.id)}
                                                >
                                                    <span>{listing.title}</span>
                                                    <strong>{formatNumber(getEngagementScore(listing))} điểm</strong>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="admin-empty-note compact">Chưa có dữ liệu top bài để so sánh.</div>
                                        )}
                                    </div>
                                </section>

                                {renderSelectedListingCard('summary')}
                            </aside>
                        </div>
                    )}

                    {activeSection === 'points' && renderPointsDashboard()}

                    {activeSection === 'activity' && (
                        <>
                            <section className="admin-metrics-grid">
                                <MetricCard icon={Sparkles} label="Tổng hoạt động" value={formatNumber(activityMetrics.total)} helper="được tổng hợp từ bài đăng và cộng đồng" tone="brand" delay={0} />
                                <MetricCard icon={MessageCircle} label="Bình luận mới" value={formatNumber(activityMetrics.comments)} helper="cần ưu tiên phản hồi sớm" tone="success" delay={80} />
                                <MetricCard icon={Heart} label="Đánh giá mới" value={formatNumber(activityMetrics.reviews)} helper="theo dõi uy tín tài khoản" tone="gold" delay={160} />
                                <MetricCard icon={UserRound} label="Kết nối mới" value={formatNumber(activityMetrics.friends)} helper="mở rộng mạng lưới giao dịch" tone="danger" delay={240} />
                            </section>

                            <div className="admin-main-grid">
                                <section className="admin-card">
                                    <div className="admin-card-head">
                                        <div>
                                            <span className="admin-section-tag">Dòng hoạt động</span>
                                            <h2>Hoạt động mới nhất</h2>
                                            <p>Các cập nhật được tách thành một panel riêng để bạn xử lý từng việc mà không làm rối màn quản lý bài đăng.</p>
                                        </div>
                                        <div className="admin-section-chip">{formatNumber(activities.length)} mục</div>
                                    </div>

                                    {activities.length > 0 ? (
                                        <div className="admin-activity-list">
                                            {activities.map((item, index) => (
                                                <article key={item.id} className="admin-activity-item" style={{ '--delay': `${index * 40}ms` }}>
                                                    <div className="admin-activity-head">
                                                        <span className={`admin-pill tone-${ACTIVITY_TONES[item.type] || 'ghost'}`}>{ACTIVITY_LABELS[item.type] || item.title}</span>
                                                        <small>{formatRelativeTime(item.createdAt)}</small>
                                                    </div>
                                                    <strong>{item.title}</strong>
                                                    <p>{item.description}</p>
                                                    {item.meta?.preview && (
                                                        <div className="admin-activity-preview">
                                                            {item.meta.preview}
                                                        </div>
                                                    )}
                                                    <div className="admin-activity-footer">
                                                        <span>{formatDate(item.createdAt, true)}</span>
                                                        {(item.meta?.postId || item.meta?.partnerId || item.meta?.reviewerId || item.meta?.commenterId) && (
                                                            <button type="button" className="admin-btn admin-btn-soft" onClick={() => openActivityTarget(item)}>
                                                                Mở liên quan
                                                            </button>
                                                        )}
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="admin-empty-note">Chưa có nhật ký hoạt động nào để hiển thị.</div>
                                    )}
                                </section>

                                <aside className="admin-side-column">
                                    <section className="admin-card">
                                        <div className="admin-card-head">
                                            <div>
                                                <span className="admin-section-tag">Ưu tiên xử lý</span>
                                                <h2>Việc cần ưu tiên</h2>
                                                <p>Những đầu việc nên xử lý đầu tiên để giữ nhịp bán hàng và tương tác.</p>
                                            </div>
                                        </div>

                                        <div className="admin-opportunity-list">
                                            <div className="admin-opportunity-item">
                                                <MessageCircle size={15} />
                                                <span>Bạn đang có {formatNumber(activityMetrics.comments)} bình luận mới. Nếu có khách hỏi giá, nên trả lời trong ngày.</span>
                                            </div>
                                            <div className="admin-opportunity-item">
                                                <Heart size={15} />
                                                <span>{formatNumber(activityMetrics.reviews)} đánh giá mới đang ảnh hưởng trực tiếp đến độ uy tín của gian hàng.</span>
                                            </div>
                                            <div className="admin-opportunity-item">
                                                <RefreshCw size={15} />
                                                <span>Khi xử lý xong một đợt phản hồi, bạn có thể bấm Làm mới để cập nhật feed ngay.</span>
                                            </div>
                                        </div>
                                    </section>

                                    {renderSelectedListingCard('summary')}
                                </aside>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
