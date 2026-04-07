const profileModel = require("../models/profile");
const danhgiaModel = require("../models/danhgia");

const STATUS_LABELS = {
  dang_ban: "Đang bán",
  dang_giu_cho: "Đang giữ chỗ",
  dang_giao_dich: "Đang giao dịch",
  da_ban: "Đã bán",
  da_trao_doi: "Đã trao đổi",
  da_tang: "Đã tặng",
};

const ACTIVITY_TITLES = {
  post_created: "Đăng tin mới",
  comment_received: "Nhận bình luận",
  review_received: "Nhận đánh giá",
  points_changed: "Điểm tài khoản thay đổi",
  friend_connected: "Kết nối bạn bè mới",
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getAuthenticatedViewerId = (req) =>
  String(req.user?.id || req.user?.userId || "").trim();

const isMissingReviewTableError = (error) =>
  error?.code === "ER_NO_SUCH_TABLE" && String(error?.sqlMessage || "").includes("danhgia");

const getSafeReviewBundle = async (userId, viewerId, reviewLimit) => {
  try {
    const [reviewSummary, reviewDistributionRows, reviewRows, viewerReview, recentReviews] = await Promise.all([
      profileModel.getReviewSummary(userId),
      profileModel.getReviewDistribution(userId),
      profileModel.getReviewItems(userId, reviewLimit || 8),
      profileModel.getViewerReview(viewerId, userId),
      profileModel.getRecentReviewActivities(userId),
    ]);

    return {
      reviewFeatureReady: true,
      reviewSummary,
      reviewDistributionRows,
      reviewRows,
      viewerReview,
      recentReviews,
    };
  } catch (error) {
    if (!isMissingReviewTableError(error)) {
      throw error;
    }

    return {
      reviewFeatureReady: false,
      reviewSummary: { total_reviews: 0, average_rating: 0 },
      reviewDistributionRows: [],
      reviewRows: [],
      viewerReview: null,
      recentReviews: [],
    };
  }
};

const normalizeUploadsPath = (raw) => {
  if (!raw || typeof raw !== "string") {
    return "";
  }

  return raw.trim();
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
    statusLabel: STATUS_LABELS[listing.trang_thai] || listing.trang_thai,
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

const buildRelationshipStatus = (viewerId, targetUserId, relationship) => {
  if (!viewerId) {
    return "guest";
  }

  if (viewerId === targetUserId) {
    return "self";
  }

  if (!relationship) {
    return "not_friends";
  }

  if (relationship.trang_thai === "da_dong_y") {
    return "friends";
  }

  if (relationship.trang_thai === "da_chan") {
    return "blocked";
  }

  return relationship.ID_NguoiGui === viewerId ? "request_sent" : "request_received";
};

const buildBadges = ({ user, isVerified, isVipActive, stats, reviewSummary, engagementStats }) => {
  const badges = [];

  if (isVerified) {
    badges.push({
      key: "verified",
      label: "Đã xác thực",
      tone: "success",
      icon: "shield",
      description: "Tài khoản đã hoàn tất xác thực.",
    });
  }

  if (isVipActive) {
    badges.push({
      key: "vip",
      label: "Thành viên VIP",
      tone: "accent",
      icon: "crown",
      description: "Tài khoản đang có gói VIP hoạt động.",
    });
  }

  if (Number(reviewSummary.average_rating || 0) >= 4.5 && Number(reviewSummary.total_reviews || 0) >= 3) {
    badges.push({
      key: "trusted",
      label: "Uy tín cao",
      tone: "gold",
      icon: "sparkles",
      description: "Nhận nhiều đánh giá tích cực từ cộng đồng.",
    });
  }

  if (Number(stats.active_listings || 0) >= 3) {
    badges.push({
      key: "active_seller",
      label: "Người bán năng động",
      tone: "primary",
      icon: "store",
      description: "Đang có nhiều tin đăng hoạt động.",
    });
  }

  if (Number(stats.total_friends || 0) >= 10) {
    badges.push({
      key: "connected",
      label: "Kết nối rộng",
      tone: "secondary",
      icon: "users",
      description: "Có mạng lưới bạn bè tích cực trong cộng đồng.",
    });
  }

  if (Number(engagementStats.total_likes_received || 0) >= 50) {
    badges.push({
      key: "popular",
      label: "Được quan tâm",
      tone: "rose",
      icon: "heart",
      description: "Nhận nhiều lượt thích trên các tin đăng cá nhân.",
    });
  }

  if (!badges.length && user?.thoi_gian_tao) {
    badges.push({
      key: "new_member",
      label: "Thành viên mới",
      tone: "neutral",
      icon: "user",
      description: "Vừa tham gia hệ thống.",
    });
  }

  return badges.slice(0, 5);
};

const buildHighlights = ({ stats, reviewSummary, engagementStats, user }) => {
  const joinedDate = user?.thoi_gian_tao ? new Date(user.thoi_gian_tao) : null;
  const joinedText = joinedDate
    ? `${joinedDate.getMonth() + 1}/${joinedDate.getFullYear()}`
    : "Chưa rõ";

  return [
    {
      key: "seller_score",
      label: "Đánh giá",
      value: Number(reviewSummary.average_rating || 0) > 0
        ? `${reviewSummary.average_rating}/5`
        : "Chưa có",
      helper: `${Number(reviewSummary.total_reviews || 0)} lượt đánh giá`,
    },
    {
      key: "engagement",
      label: "Tương tác",
      value: `${Number(engagementStats.total_likes_received || 0)} thích`,
      helper: `${Number(engagementStats.total_comments_received || 0)} bình luận`,
    },
    {
      key: "joined_at",
      label: "Tham gia",
      value: joinedText,
      helper: `${Number(stats.total_friends || 0)} bạn bè`,
    },
  ];
};

const sortActivities = (items) =>
  items
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return rightTime - leftTime;
    });

exports.getProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const viewerId = getAuthenticatedViewerId(req);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Thiếu ID người dùng.",
    });
  }

  const [
    user,
    latestVerification,
    friendPreviewRows,
    totalFriends,
    relationshipRecord,
    mutualFriends,
    listingStats,
    engagementStats,
    listingRows,
    reviewBundle,
    recentPosts,
    recentComments,
    recentPoints,
    recentFriends,
  ] = await Promise.all([
    profileModel.getUserBase(userId),
    profileModel.getLatestVerification(userId),
    profileModel.getFriendPreview(userId, req.query.friendLimit || 6),
    profileModel.getFriendCount(userId),
    profileModel.getFriendshipRecord(viewerId, userId),
    profileModel.getMutualFriendCount(viewerId, userId),
    profileModel.getListingStats(userId),
    profileModel.getEngagementStats(userId),
    profileModel.getListings(userId, req.query.listingLimit || 24),
    getSafeReviewBundle(userId, viewerId, req.query.reviewLimit),
    profileModel.getRecentPostActivities(userId),
    profileModel.getRecentCommentActivities(userId),
    profileModel.getRecentPointActivities(userId),
    profileModel.getRecentFriendActivities(userId),
  ]);

  const {
    reviewFeatureReady,
    reviewSummary,
    reviewDistributionRows,
    reviewRows,
    viewerReview,
    recentReviews,
  } = reviewBundle;

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy người dùng.",
    });
  }

  const relationshipStatus = buildRelationshipStatus(viewerId, userId, relationshipRecord);
  const isOwner = viewerId && viewerId === userId;
  const isVerified = Number(user.da_xac_thuc || 0) === 1 || latestVerification?.trang_thai === "da_duyet";
  const isVipActive =
    Number(user.la_vip || 0) === 1 &&
    (!user.ngay_het_han_vip || new Date(user.ngay_het_han_vip).getTime() > Date.now());

  const stats = {
    total_listings: Number(listingStats?.total_listings || 0),
    active_listings: Number(listingStats?.active_listings || 0),
    reserved_listings: Number(listingStats?.reserved_listings || 0),
    in_transaction_listings: Number(listingStats?.in_transaction_listings || 0),
    sold_listings: Number(listingStats?.sold_listings || 0),
    exchanged_listings: Number(listingStats?.exchanged_listings || 0),
    gifted_listings: Number(listingStats?.gifted_listings || 0),
    total_friends: Number(totalFriends || 0),
    total_points: Number(user.diem_so || 0),
  };

  const engagements = {
    total_likes_received: Number(engagementStats?.total_likes_received || 0),
    total_comments_received: Number(engagementStats?.total_comments_received || 0),
  };

  const mappedListings = listingRows.map(formatListing);
  const featuredListings = [...mappedListings]
    .filter((item) => item.status === "dang_ban")
    .sort((left, right) => {
      const leftScore = left.likeCount * 3 + left.commentCount * 2;
      const rightScore = right.likeCount * 3 + right.commentCount * 2;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .slice(0, 3);

  const reviewDistribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  reviewDistributionRows.forEach((item) => {
    const score = Number(item.diem_so || 0);
    if (reviewDistribution[score] !== undefined) {
      reviewDistribution[score] = Number(item.total || 0);
    }
  });

  const mappedReviews = reviewRows.map((review) => ({
    id: review.ID_DanhGia,
    rating: Number(review.diem_so || 0),
    comment: review.binh_luan || "",
    createdAt: review.thoi_gian_tao,
    author: {
      id: review.ID_NguoiDanhGia,
      name: review.reviewer_name || "Người dùng",
      avatar: normalizeUploadsPath(review.reviewer_avatar),
      school: review.reviewer_school || "",
    },
  }));

  const activities = sortActivities([
    ...recentPosts.map((item) => ({
      id: `post-${item.ID_BaiDang}`,
      type: "post_created",
      title: ACTIVITY_TITLES.post_created,
      description: `Tin "${item.tieu_de}" đã được đăng lên hồ sơ.`,
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
      description: `${item.commenter_name || "Một người dùng"} đã bình luận vào "${item.post_title}".`,
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
      description: `${item.reviewer_name || "Một người dùng"} đã để lại đánh giá ${item.diem_so}/5 sao.`,
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
        ? `${item.ten_hang_muc}: ${item.mo_ta || item.loai_giao_dich || "Cập nhật điểm"}.`
        : `Điểm tài khoản được cập nhật theo giao dịch ${item.loai_giao_dich || "khác"}.`,
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
      description: `Kết nối mới với ${item.partner_name || "một người dùng"}.`,
      createdAt: item.thoi_gian_cap_nhat,
      meta: {
        partnerId: item.partner_id,
      },
    })),
  ]).slice(0, 10);

  const profilePayload = {
    user: {
      id: user.ID_NguoiDung,
      username: user.ten_dang_nhap || "",
      name: user.ho_ten || "Người dùng",
      email: user.email || "",
      avatar: normalizeUploadsPath(user.anh_dai_dien),
      school: user.truong_hoc || "",
      location: user.vi_tri || "",
      hometown: user.que_quan || "",
      phone: user.so_dien_thoai || "",
      bio: user.tieu_su || "",
      joinedAt: user.thoi_gian_tao,
      points: Number(user.diem_so || 0),
      isVerified,
      verificationStatus: latestVerification?.trang_thai || (isVerified ? "da_duyet" : "chua_xac_thuc"),
      isVipActive,
      vipExpiresAt: user.ngay_het_han_vip || null,
    },
    viewer: {
      id: viewerId || null,
      isOwner: Boolean(isOwner),
      relationshipStatus,
      mutualFriends: Number(mutualFriends || 0),
      canMessage: Boolean(viewerId) && viewerId !== userId,
      canReview: Boolean(viewerId) && viewerId !== userId && relationshipStatus === "friends",
    },
    badges: buildBadges({
      user,
      isVerified,
      isVipActive,
      stats,
      reviewSummary: reviewSummary || {},
      engagementStats: engagements,
    }),
    highlights: buildHighlights({
      stats,
      reviewSummary: reviewSummary || {},
      engagementStats: engagements,
      user,
    }),
    stats: {
      ...stats,
      ...engagements,
      average_rating: Number(reviewSummary?.average_rating || 0),
      total_reviews: Number(reviewSummary?.total_reviews || 0),
    },
    friendsPreview: friendPreviewRows.map((friend) => ({
      id: friend.ID_NguoiDung,
      name: friend.ho_ten || "Người dùng",
      avatar: normalizeUploadsPath(friend.anh_dai_dien),
      school: friend.truong_hoc || "",
      hometown: friend.que_quan || "",
      connectedAt: friend.connected_at,
    })),
    listings: {
      total: mappedListings.length,
      featured: featuredListings,
      items: mappedListings,
    },
    reviews: {
      featureReady: reviewFeatureReady,
      summary: {
        averageRating: Number(reviewSummary?.average_rating || 0),
        totalReviews: Number(reviewSummary?.total_reviews || 0),
        distribution: reviewDistribution,
      },
      viewerReview: viewerReview
        ? {
          id: viewerReview.ID_DanhGia,
          rating: Number(viewerReview.diem_so || 0),
          comment: viewerReview.binh_luan || "",
          createdAt: viewerReview.thoi_gian_tao,
        }
        : null,
      items: mappedReviews,
    },
    activity: activities,
  };

  return res.status(200).json({
    success: true,
    data: profilePayload,
  });
});

exports.upsertReview = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const viewerId = getAuthenticatedViewerId(req);
  const { rating, comment } = req.body || {};

  if (!userId || !viewerId) {
    return res.status(400).json({
      success: false,
      message: "Thiếu người đánh giá hoặc người được đánh giá.",
    });
  }

  if (viewerId === userId) {
    return res.status(400).json({
      success: false,
      message: "Bạn không thể tự đánh giá chính mình.",
    });
  }

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({
      success: false,
      message: "Điểm đánh giá phải từ 1 đến 5.",
    });
  }

  const [targetUser, relationshipRecord] = await Promise.all([
    profileModel.getUserBase(userId),
    profileModel.getFriendshipRecord(viewerId, userId),
  ]);

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy người dùng cần đánh giá.",
    });
  }

  if (!relationshipRecord || relationshipRecord.trang_thai !== "da_dong_y") {
    return res.status(403).json({
      success: false,
      message: "Chỉ có thể đánh giá khi hai người đã là bạn bè.",
    });
  }

  const result = await danhgiaModel.upsertUserReview({
    reviewerId: viewerId,
    targetUserId: userId,
    rating: numericRating,
    comment,
  }).catch((error) => {
    if (isMissingReviewTableError(error)) {
      return null;
    }

    throw error;
  });

  if (!result) {
    return res.status(503).json({
      success: false,
      message: "Chức năng đánh giá chưa sẵn sàng vì thiếu bảng danhgia trong database.",
    });
  }

  return res.status(200).json({
    success: true,
    message: result.mode === "created" ? "Đánh giá đã được tạo." : "Đánh giá đã được cập nhật.",
    data: result,
  });
});
