const tinnhanai = require("../models/tinnhanai");
const vertexAdvisor = require("../services/vertexPostAdvisor");

const SEARCH_RESULT_LIMIT = Math.min(20, Math.max(1, Number(process.env.SEARCH_RESULT_LIMIT || 8) || 8));

const compactText = (value, maxLength = 700) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
};

const firstFilled = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();

const formatCurrency = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Chưa có giá";
  return `${numeric.toLocaleString("vi-VN")} VND`;
};

const normalizeAssetUrl = (value, req) => {
  if (!value || typeof value !== "string") return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const origin = `${req.protocol}://${req.get("host")}`;
  const cleaned = value.replace(/^\/+/, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("uploads/")) return `${origin}/${cleaned}`;
  return `${origin}/uploads/${cleaned}`;
};

const getRequestLimit = (value) => Math.max(1, Math.min(Number(value) || SEARCH_RESULT_LIMIT, 20));

const buildReason = (post, intent = {}) => {
  const reasons = [];
  const price = Number(firstFilled(post.gia, post.price, 0) || 0);

  if (intent.maxPrice && price > 0 && price <= Number(intent.maxPrice)) {
    reasons.push("nằm trong ngân sách");
  }

  if (intent.location && normalizeSearchText(post.vi_tri || post.location).includes(normalizeSearchText(intent.location))) {
    reasons.push("đúng khu vực bạn hỏi");
  }

  if (Number(firstFilled(post.relevance_score, post.score, 0) || 0) > 0) {
    reasons.push("khớp từ khóa tìm kiếm");
  }

  return reasons.length ? `Phù hợp vì ${reasons.join(", ")}.` : "Phù hợp với dữ liệu tìm được trong database.";
};

const mapPostForClient = (post, req, intent = {}) => {
  const images = Array.isArray(post.DanhSachAnh) ? post.DanhSachAnh : [];
  const directImage = firstFilled(post.image_url, post.imageUrl, post.image, "");
  const imageUrls = [...images, directImage]
    .map((item) => normalizeAssetUrl(typeof item === "string" ? item : item?.LinkAnh, req))
    .filter(Boolean);
  const rawPrice = firstFilled(post.gia, post.price, post.Gia, null);
  const postType = firstFilled(post.TenLoaiBaiDang, post.loai_bai_dang, post.postType, post.type, "");

  return {
    id: firstFilled(post.ID_BaiDang, post.id, post.post_id, ""),
    authorId: firstFilled(post.ID_NguoiDung, post.seller_id, post.sellerId, ""),
    title: firstFilled(post.tieu_de, post.title, "Bài đăng"),
    description: compactText(firstFilled(post.mo_ta, post.description, ""), 260),
    price: Number(rawPrice || 0),
    priceLabel: firstFilled(post.price_text, post.priceText, post.priceLabel, formatCurrency(rawPrice)),
    priceText: firstFilled(post.price_text, post.priceText, post.priceLabel, formatCurrency(rawPrice)),
    location: firstFilled(post.vi_tri, post.location, "Chưa cập nhật"),
    status: firstFilled(post.trang_thai, post.status, ""),
    category: firstFilled(post.TenDanhMuc, post.danh_muc, post.category, ""),
    postType,
    type: postType,
    author: firstFilled(post.TenNguoiDung, post.author, "Người dùng OLODO"),
    image: imageUrls[0] || "",
    imageUrl: imageUrls[0] || "",
    imageUrls,
    likeCount: Number(post.SoLuongLike || 0),
    commentCount: Number(post.SoLuongBinhLuan || 0),
    createdAt: firstFilled(post.thoi_gian_tao, post.createdAt, post.created_at, null),
    relevanceScore: Number(firstFilled(post.relevance_score, post.score, 0) || 0),
    reason: firstFilled(post.reason, buildReason(post, intent)),
  };
};

const hasListingIntent = (intent = {}, posts = []) => Boolean(
  posts.length ||
  intent.keywords?.length ||
  intent.requiredTerms?.length ||
  intent.category ||
  intent.postType ||
  intent.location ||
  intent.minPrice ||
  intent.maxPrice
);

const buildSafeSearchAnswer = (posts, searchIntent = {}) => {
  if (!posts.length) {
    return searchIntent.needClarification
      ? "Mình chưa đủ tiêu chí để tìm chính xác. Bạn có thể nói rõ món cần tìm, ngân sách hoặc khu vực."
      : "Mình chưa tìm thấy bài đăng phù hợp trong database. Bạn thử đổi từ khóa, nới ngân sách hoặc thêm khu vực nhé.";
  }

  const lines = ["Mình tìm thấy các bài đăng phù hợp trong database:"];
  posts.slice(0, 5).forEach((post) => {
    lines.push(`- ${post.title} (${post.priceLabel}, ${post.location || "không rõ vị trí"}): ${post.reason}`);
  });
  return lines.join("\n");
};

const buildGeneralFallbackAnswer = () =>
  "Mình là OLODO AI. Bạn hãy nói tên món, ngân sách hoặc khu vực; mình sẽ tìm bài đăng thật trong hệ thống và hiện thẻ để mở chi tiết.";

const filterPostsMentionedInAnswer = (posts, answer) => {
  if (!Array.isArray(posts) || posts.length <= 1) return posts;

  const normalizedAnswer = normalizeSearchText(answer);
  if (!normalizedAnswer) return posts;

  const mentionedPosts = posts.filter((post) => {
    const normalizedTitle = normalizeSearchText(post.title);
    return normalizedTitle && normalizedAnswer.includes(normalizedTitle);
  });

  return mentionedPosts.length ? mentionedPosts : posts;
};

const saveAiHistory = async ({ userId, message, reply }) => {
  try {
    await tinnhanai.insert({
      ID_NguoiDung: userId,
      noi_dung_gui: message,
      noi_dung_tra_loi: reply,
    });
  } catch (error) {
    console.error("Cannot save AI chat history:", error.message);
  }
};

exports.chat = async (req, res) => {
  const userId = String(req.user?.id || req.user?.userId || "").trim();
  const message = String(req.body?.message || "").trim();
  const limit = getRequestLimit(req.body?.limit);
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!userId) {
    return res.status(401).json({ success: false, message: "Bạn cần đăng nhập để sử dụng AI gợi ý." });
  }

  if (!message) {
    return res.status(400).json({ success: false, message: "Vui lòng nhập nội dung cần tìm." });
  }

  if (message.length > 1000) {
    return res.status(400).json({ success: false, message: "Nội dung hỏi quá dài, vui lòng rút gọn dưới 1000 ký tự." });
  }

  const searchIntent = await vertexAdvisor.inferSearchIntent(message);
  let relatedRows = [];
  let relatedPosts = [];
  let searchError = null;

  try {
    relatedRows = await tinnhanai.searchRelevantPosts({
      query: message,
      intent: searchIntent,
      limit,
    });
    relatedPosts = relatedRows.map((post) => mapPostForClient(post, req, searchIntent));
  } catch (error) {
    searchError = error instanceof Error ? error.message : "Không thể đọc dữ liệu bài đăng.";
    console.error("AI MySQL search failed:", searchError);
  }

  const hasSearchInput = hasListingIntent(searchIntent, relatedPosts);
  let reply = hasSearchInput ? buildSafeSearchAnswer(relatedPosts, searchIntent) : buildGeneralFallbackAnswer();
  let usage = null;
  let answerError = null;

  try {
    const aiReply = await vertexAdvisor.generatePostAnswer({
      message,
      history,
      posts: relatedPosts,
      searchIntent,
      searchError,
    });
    reply = aiReply.reply || reply;
    usage = aiReply.usage;
  } catch (error) {
    answerError = error instanceof Error ? error.message : "Gemini không phản hồi được.";
    console.error("Vertex AI post advisor failed:", answerError);
  }

  const displayPosts = filterPostsMentionedInAnswer(relatedPosts, reply);

  await saveAiHistory({ userId, message, reply });

  return res.json({
    success: true,
    data: {
      answer: reply,
      posts: displayPosts,
      meta: {
        service: "backend/vertex-service-account",
        model: vertexAdvisor.model,
        location: vertexAdvisor.location,
        databaseMode: "read-only",
        searchIntent,
        searchError,
        answerError,
        usage,
        totalPosts: displayPosts.length,
        sourcePosts: relatedPosts.length,
        hasListingIntent: hasSearchInput,
        showPosts: displayPosts.length > 0,
      },
    },
  });
};

exports.search = async (req, res) => {
  const query = String(req.query?.q || "").trim();
  const limit = getRequestLimit(req.query?.limit);

  if (!query) {
    return res.status(400).json({ success: false, message: "Thiếu từ khóa tìm kiếm." });
  }

  try {
    const intent = await vertexAdvisor.inferSearchIntent(query);
    const rows = await tinnhanai.searchRelevantPosts({ query, intent, limit });
    const posts = rows.map((post) => mapPostForClient(post, req, intent));

    return res.json({
      success: true,
      data: {
        query,
        answer: buildSafeSearchAnswer(posts, intent),
        intent,
        posts,
        database: {
          mode: "read-only",
        },
        aiProvider: "vertex-service-account",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Không thể tìm bài đăng.",
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await tinnhanai.getAll();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await tinnhanai.getById(id);
    if (!data) return res.status(404).json({ message: "tinnhanai không tồn tại" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

exports.insert = async (req, res) => {
  try {
    const insertId = await tinnhanai.insert(req.body);
    res.status(201).json({ id: insertId, message: "Thêm mới thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

exports.update = async (req, res) => {
  try {
    const affectedRows = await tinnhanai.update(req.params.id, req.body);
    if (affectedRows === 0) return res.status(404).json({ message: "tinnhanai không tồn tại" });
    res.json({ message: "Cập nhật thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

exports.delete = async (req, res) => {
  try {
    const affectedRows = await tinnhanai.delete(req.params.id);
    if (affectedRows === 0) return res.status(404).json({ message: "tinnhanai không tồn tại" });
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};
