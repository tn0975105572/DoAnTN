const profileModel = require("../models/profile");
const lichSuTichDiemModel = require("../models/lich_su_tich_diem");
const nguoiDungTichDiemModel = require("../models/nguoidungtichdiem");

const MANAGE_STATUSES = [
  { value: "dang_ban", label: "Dang ban" },
  { value: "dang_giu_cho", label: "Dang giu cho" },
  { value: "dang_giao_dich", label: "Dang giao dich" },
  { value: "da_ban", label: "Da ban" },
  { value: "da_trao_doi", label: "Da trao doi" },
  { value: "da_tang", label: "Da tang" },
];

const STATUS_LABELS = {
  dang_ban: "Dang ban",
  dang_giu_cho: "Dang giu cho",
  dang_giao_dich: "Dang giao dich",
  da_ban: "Da ban",
  da_trao_doi: "Da trao doi",
  da_tang: "Da tang",
  cho_duyet: "Cho duyet",
};

const ACTIVITY_TITLES = {
  post_created: "Dang tin moi",
  comment_received: "Nhan binh luan",
  review_received: "Nhan danh gia",
  points_changed: "Diem tai khoan thay doi",
  friend_connected: "Ket noi ban be moi",
};

const MAX_ACTIVITY_LIMIT = 50;

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getAuthenticatedUserId = (req) =>
  String(req.user?.id || req.user?.userId || "").trim();

const isAdminRequest = (req) => req.user?.Role === "admin";

const isMissingReviewTableError = (error) =>
  error?.code === "ER_NO_SUCH_TABLE" && String(error?.sqlMessage || "").includes("danhgia");

const normalizeLimit = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const normalizeUploadsPath = (raw) => {
  if (!raw || typeof raw !== "string") {
    return "";
  }

  return raw.trim();
};

const getEngagementScore = (listing) =>
  Number(listing?.likeCount || 0) * 3 + Number(listing?.commentCount || 0) * 2;

const estimateTraffic = (listing) => {
  const likes = Number(listing?.likeCount || 0);
  const comments = Number(listing?.commentCount || 0);
  const liveBoost = listing?.status === "dang_ban" ? 24 : 8;

  return likes * 18 + comments * 32 + liveBoost;
};

const formatListing = (listing) => {
  const images = listing?.danh_sach_anh
    ? String(listing.danh_sach_anh)
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
    : [];

  return {
    id: listing.ID_BaiDang,
    userId: listing.ID_NguoiDung,
    postTypeId: listing.ID_LoaiBaiDang || "",
    categoryId: listing.ID_DanhMuc || "",
    title: listing.tieu_de,
    description: listing.mo_ta || "",
    price: listing.gia,
    location: listing.vi_tri || "",
    status: listing.trang_thai,
    statusLabel: STATUS_LABELS[listing.trang_thai] || listing.trang_thai || "Khong ro",
    createdAt: listing.thoi_gian_tao,
    updatedAt: listing.thoi_gian_cap_nhat,
    categoryName: listing.ten_danh_muc || "",
    postTypeName: listing.ten_loai_bai_dang || "",
    likeCount: Number(listing.so_luot_thich || 0),
    commentCount: Number(listing.so_binh_luan || 0),
    images,
    primaryImage: images[0] || "",
  };
};

const sortActivities = (items) =>
  items
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return rightTime - leftTime;
    });

const normalizePointHistoryItem = (item) => ({
  id: item?.ID_LichSu || item?.ID_NguoiDungTichDiem || `${item?.thoi_gian_tao || ""}-${item?.mo_ta || ""}`,
  createdAt: item?.thoi_gian_tao || item?.thoi_gian || "",
  pointsChanged: Number(item?.diem_thay_doi ?? item?.thay_doi_diem ?? 0),
  pointsBefore: Number(item?.diem_truoc ?? item?.diem_truoc_khi_su_dung ?? 0),
  pointsAfter: Number(item?.diem_sau ?? item?.diem_sau_khi_su_dung ?? 0),
  transactionType: item?.loai_giao_dich || "",
  description: item?.mo_ta || "",
});

const normalizePointUsageItem = (item) => {
  const before = Number(item?.diem_truoc_khi_su_dung ?? 0);
  const after = Number(item?.diem_sau_khi_su_dung ?? 0);

  return {
    id: item?.ID_NguoiDungTichDiem || `${item?.thoi_gian_su_dung || ""}-${item?.ten_hang_muc || ""}`,
    createdAt: item?.thoi_gian_su_dung || "",
    title: item?.ten_hang_muc || item?.mo_ta || "Su dung diem",
    description: item?.mo_ta || item?.loai_giao_dich || "Giao dich diem",
    transactionType: item?.loai_giao_dich || "",
    usedPoints: Math.abs(before - after),
    pointsBefore: before,
    pointsAfter: after,
    rewardType: item?.loai || "",
  };
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

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
    if (!rawDate) {
      return;
    }

    const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const key = getMonthKey(new Date(date.getFullYear(), date.getMonth(), 1));
    const seriesIndex = monthIndexMap.get(key);
    if (seriesIndex === undefined) {
      return;
    }

    const amount = Number(valueSelector(item) || 0);
    months[seriesIndex].value += Number.isFinite(amount) ? amount : 0;
    months[seriesIndex].count += 1;
  });

  return months.map((item) => ({
    ...item,
    value: Math.round(item.value * 100) / 100,
  }));
};

const getPostingWindowSeries = (items) => {
  const windows = [
    { label: "Sang", range: "06h-11h", value: 0 },
    { label: "Chieu", range: "12h-17h", value: 0 },
    { label: "Toi", range: "18h-23h", value: 0 },
    { label: "Khuya", range: "00h-05h", value: 0 },
  ];

  items.forEach((item) => {
    if (!item?.createdAt) {
      return;
    }

    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const hour = date.getHours();
    if (hour >= 6 && hour < 12) {
      windows[0].value += 1;
    } else if (hour >= 12 && hour < 18) {
      windows[1].value += 1;
    } else if (hour >= 18) {
      windows[2].value += 1;
    } else {
      windows[3].value += 1;
    }
  });

  return windows;
};

const getPostingWindowLabel = (items) => {
  const windows = {
    "Sang (06h-11h)": 0,
    "Chieu (12h-17h)": 0,
    "Toi (18h-23h)": 0,
    "Khuya (00h-05h)": 0,
  };

  items.forEach((item) => {
    if (!item?.createdAt) {
      return;
    }

    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const hour = date.getHours();
    if (hour >= 6 && hour < 12) {
      windows["Sang (06h-11h)"] += 1;
    } else if (hour >= 12 && hour < 18) {
      windows["Chieu (12h-17h)"] += 1;
    } else if (hour >= 18) {
      windows["Toi (18h-23h)"] += 1;
    } else {
      windows["Khuya (00h-05h)"] += 1;
    }
  });

  const [label, total] = Object.entries(windows).sort((left, right) => right[1] - left[1])[0] || ["Chua co du lieu", 0];
  return { label, total };
};

const buildUsageCategorySeries = (usageItems) => {
  const usageMap = new Map();

  usageItems.forEach((item) => {
    const label = item?.title || item?.description || item?.transactionType || "Khac";
    usageMap.set(label, (usageMap.get(label) || 0) + Number(item?.usedPoints || 0));
  });

  return [...usageMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);
};

const getPointTier = (points) => {
  if (points >= 1000) {
    return "Kim cuong";
  }
  if (points >= 500) {
    return "Vang";
  }
  if (points >= 200) {
    return "Bac";
  }
  return "Khoi dong";
};

const buildListingAnalytics = (listings) => {
  const totalLikes = listings.reduce((sum, listing) => sum + Number(listing.likeCount || 0), 0);
  const totalComments = listings.reduce((sum, listing) => sum + Number(listing.commentCount || 0), 0);
  const estimatedTraffic = listings.reduce((sum, listing) => sum + estimateTraffic(listing), 0);
  const activeListings = listings.filter((listing) => listing.status === "dang_ban").length;
  const topListings = [...listings]
    .sort((left, right) => {
      const scoreDelta = getEngagementScore(right) - getEngagementScore(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
    })
    .slice(0, 4);
  const statusRows = MANAGE_STATUSES.map((status) => {
    const count = listings.filter((listing) => listing.status === status.value).length;
    const percent = listings.length ? Math.round((count / listings.length) * 100) : 0;

    return {
      ...status,
      count,
      percent,
    };
  });

  return {
    totalLikes,
    totalComments,
    estimatedTraffic,
    activeListings,
    topListings,
    statusRows,
  };
};

const buildPostTimingAnalytics = (listings) => {
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
    averagePosts: monthlySeries.length ? totalPosts / monthlySeries.length : 0,
  };
};

const buildPointsAnalytics = (currentPoints, pointHistoryRows, pointUsageRows) => {
  const pointHistory = pointHistoryRows.map(normalizePointHistoryItem);
  const pointUsageHistory = pointUsageRows.map(normalizePointUsageItem);
  const earnedTotal = pointHistory.reduce((sum, item) => sum + Math.max(0, item.pointsChanged), 0);
  const fallbackUsedHistory = pointHistory
    .filter((item) => item.pointsChanged < 0)
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      title: item.description || "Su dung diem",
      description: item.transactionType || "Giao dich diem",
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
    averageUsedPerMonth: usageTimeline.length ? usedTotal / usageTimeline.length : 0,
  };
};

const buildActivityMetrics = (activities) => ({
  total: activities.length,
  comments: activities.filter((item) => item.type === "comment_received").length,
  reviews: activities.filter((item) => item.type === "review_received").length,
  friends: activities.filter((item) => item.type === "friend_connected").length,
});

const buildOpportunities = (analytics, listings) => {
  const items = [];

  if (analytics.activeListings < 3) {
    items.push("Ban dang co it bai dang dang ban. Hay day them tin moi de tang do phu.");
  }

  if (analytics.totalComments < Math.max(3, listings.length * 2)) {
    items.push("Ty le binh luan con thap. Hay bo sung anh can canh va tieu de ro hon.");
  }

  if (analytics.topListings.some((item) => Number(item.commentCount || 0) > Number(item.likeCount || 0))) {
    items.push("Mot vai bai dang dang co khach hoi nhieu hon luot thich. Ban nen vao binh luan de phan hoi som.");
  }

  if (!items.length) {
    items.push("Hieu suat hien tai kha on. Ban co the thu day them bai moi de mo rong tiep can.");
  }

  return items;
};

const getSafeRecentReviews = async (userId, limit) => {
  try {
    return await profileModel.getRecentReviewActivities(userId, limit);
  } catch (error) {
    if (!isMissingReviewTableError(error)) {
      throw error;
    }

    return [];
  }
};

exports.getDashboard = asyncHandler(async (req, res) => {
  const requestedUserId = String(req.params.userId || "").trim();
  const authenticatedUserId = getAuthenticatedUserId(req);
  const userId =
    isAdminRequest(req) && requestedUserId
      ? requestedUserId
      : authenticatedUserId;
  const activityLimit = normalizeLimit(req.query.activityLimit, 24, MAX_ACTIVITY_LIMIT);
  const perSourceActivityLimit = Math.max(activityLimit, 12);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Thieu ID nguoi dung.",
    });
  }

  const [
    user,
    listingRows,
    recentPosts,
    recentComments,
    recentPoints,
    recentFriends,
    recentReviews,
    pointHistoryRows,
    pointUsageRows,
  ] = await Promise.all([
    profileModel.getUserBase(userId),
    profileModel.getAllListings(userId),
    profileModel.getRecentPostActivities(userId, perSourceActivityLimit),
    profileModel.getRecentCommentActivities(userId, perSourceActivityLimit),
    profileModel.getRecentPointActivities(userId, perSourceActivityLimit),
    profileModel.getRecentFriendActivities(userId, perSourceActivityLimit),
    getSafeRecentReviews(userId, perSourceActivityLimit),
    lichSuTichDiemModel.getAllByUserId(userId),
    nguoiDungTichDiemModel.getByUserId(userId),
  ]);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Khong tim thay nguoi dung.",
    });
  }

  const listings = listingRows.map(formatListing);
  const featuredListings = [...listings]
    .filter((item) => item.status === "dang_ban")
    .sort((left, right) => {
      const scoreDelta = getEngagementScore(right) - getEngagementScore(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
    })
    .slice(0, 4);

  const activities = sortActivities([
    ...recentPosts.map((item) => ({
      id: `post-${item.ID_BaiDang}`,
      type: "post_created",
      title: ACTIVITY_TITLES.post_created,
      description: `Tin "${item.tieu_de}" da duoc dang len ho so.`,
      createdAt: item.thoi_gian_tao,
      meta: {
        postId: item.ID_BaiDang,
        status: item.trang_thai,
        statusLabel: STATUS_LABELS[item.trang_thai] || item.trang_thai,
      },
    })),
    ...recentComments.map((item) => ({
      id: `comment-${item.ID_BinhLuan}`,
      type: "comment_received",
      title: ACTIVITY_TITLES.comment_received,
      description: `${item.commenter_name || "Mot nguoi dung"} da binh luan vao "${item.post_title}".`,
      createdAt: item.thoi_gian_binh_luan,
      meta: {
        postId: item.ID_BaiDang,
        commenterId: item.commenter_id,
        preview: item.noi_dung || "",
      },
    })),
    ...recentReviews.map((item) => ({
      id: `review-${item.ID_DanhGia}`,
      type: "review_received",
      title: ACTIVITY_TITLES.review_received,
      description: `${item.reviewer_name || "Mot nguoi dung"} da de lai danh gia ${item.diem_so}/5 sao.`,
      createdAt: item.thoi_gian_tao,
      meta: {
        rating: Number(item.diem_so || 0),
        preview: item.binh_luan || "",
        reviewerId: item.reviewer_id,
      },
    })),
    ...recentPoints.map((item) => ({
      id: `points-${item.ID_NguoiDungTichDiem}`,
      type: "points_changed",
      title: ACTIVITY_TITLES.points_changed,
      description: item.ten_hang_muc
        ? `${item.ten_hang_muc}: ${item.mo_ta || item.loai_giao_dich || "Cap nhat diem"}.`
        : `Diem tai khoan duoc cap nhat theo giao dich ${item.loai_giao_dich || "khac"}.`,
      createdAt: item.thoi_gian_su_dung,
      meta: {
        delta: Number(item.diem_sau_khi_su_dung || 0) - Number(item.diem_truoc_khi_su_dung || 0),
        pointsAfter: Number(item.diem_sau_khi_su_dung || 0),
      },
    })),
    ...recentFriends.map((item) => ({
      id: `friend-${item.ID_QuanHe}`,
      type: "friend_connected",
      title: ACTIVITY_TITLES.friend_connected,
      description: `Ket noi moi voi ${item.partner_name || "mot nguoi dung"}.`,
      createdAt: item.thoi_gian_cap_nhat,
      meta: {
        partnerId: item.partner_id,
      },
    })),
  ]).slice(0, activityLimit);

  const analytics = buildListingAnalytics(listings);
  const postTimingAnalytics = buildPostTimingAnalytics(listings);
  const pointsAnalytics = buildPointsAnalytics(Number(user.diem_so || 0), pointHistoryRows, pointUsageRows);
  const activityMetrics = buildActivityMetrics(activities);
  const opportunities = buildOpportunities(analytics, listings);

  return res.status(200).json({
    success: true,
    data: {
      profile: {
        user: {
          id: user.ID_NguoiDung,
          name: user.ho_ten || "Nguoi dung",
          fullName: user.ho_ten || "Nguoi dung",
          email: user.email || "",
          avatar: normalizeUploadsPath(user.anh_dai_dien),
          points: Number(user.diem_so || 0),
        },
        stats: {
          total_listings: listings.length,
          active_listings: analytics.activeListings,
          sold_listings: listings.filter((item) => item.status === "da_ban").length,
          exchanged_listings: listings.filter((item) => item.status === "da_trao_doi").length,
          gifted_listings: listings.filter((item) => item.status === "da_tang").length,
          total_likes_received: analytics.totalLikes,
          total_comments_received: analytics.totalComments,
          total_points: Number(user.diem_so || 0),
        },
        listings: {
          total: listings.length,
          featured: featuredListings,
          items: listings,
        },
        activity: activities,
      },
      pointHistory: pointHistoryRows,
      pointUsageHistory: pointUsageRows,
      analytics,
      postTimingAnalytics,
      pointsAnalytics,
      activityMetrics,
      opportunities,
      generatedAt: new Date().toISOString(),
    },
  });
});
