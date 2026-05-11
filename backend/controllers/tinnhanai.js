const path = require('path');
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');

const loadBtlEnvFallback = () => {
    const envPath = path.join(__dirname, '..', '..', 'BTL', '.env');
    dotenv.config({ path: envPath, quiet: true });

    if (process.env.CEREBRAS_API_KEY || !fs.existsSync(envPath)) return;

    const raw = fs.readFileSync(envPath);
    const content = raw[0] === 0xff && raw[1] === 0xfe
        ? raw.toString('utf16le')
        : raw.toString('utf8');
    const parsed = dotenv.parse(content.replace(/^\uFEFF/, ''));

    Object.entries(parsed).forEach(([key, value]) => {
        if (!process.env[key]) process.env[key] = value;
    });
};

loadBtlEnvFallback();

const tinnhanai = require('../models/tinnhanai');

const CEREBRAS_CHAT_URL = process.env.CEREBRAS_CHAT_URL || 'https://api.cerebras.ai/v1/chat/completions';
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'llama3.1-8b';
const STOP_WORDS = new Set([
    'toi', 'minh', 'can', 'tim', 'mua', 'cho', 've', 'voi', 'va', 'la',
    'co', 'khong', 'duoc', 'mot', 'nhung', 'cac', 'nhieu', 'it', 'gia', 'duoi',
    'tren', 'trieu', 'nghin', 'ngan', 'dong', 'vnd', 'den', 'trong', 'o',
    'tai', 'nay', 'kia', 'gi', 'nao', 'hay', 'nhe', 'nha', 'van', 'bai',
    'dang', 'san', 'pham', 'olodo', 'xin', 'chao', 'hello', 'hi', 'hey', 'cam', 'on', 'khoe',
    'hom', 'nen', 'an', 'uong', 'dua', 'lay', 'mon', 'do', 'gan', 'quanh', 'khu', 'vuc',
]);
const EXACT_STOP_TOKENS = new Set([
    'bạn', 'bán', 'cần', 'tìm', 'mua', 'cho', 'về', 'với', 'và', 'là', 'có', 'không',
    'được', 'một', 'những', 'các', 'nhiều', 'ít', 'giá', 'dưới', 'trên', 'triệu',
    'nghìn', 'ngàn', 'đồng', 'từ', 'đến', 'trong', 'ở', 'tại', 'này', 'kia', 'gì',
    'nào', 'hãy', 'nhé', 'nha', 'tư', 'vấn', 'bài', 'đăng', 'sản', 'phẩm', 'xin',
    'chào', 'cảm', 'ơn', 'ạ', 'à', 'đó', 'đây', 'hôm', 'nên', 'ăn', 'uống', 'đưa', 'lấy',
    'món', 'đồ', 'gần', 'quanh', 'khu', 'vực', 'quận', 'huyện', 'phường', 'xã',
]);
const PRODUCT_HINTS = [
    'tu lanh', 'tu dong', 'may giat', 'may lanh', 'dieu hoa', 'laptop', 'macbook',
    'dien thoai', 'iphone', 'ipad', 'may tinh', 'pc', 'man hinh', 'ban phim',
    'chuot', 'tai nghe', 'loa', 'camera', 'may anh', 'sach', 'giao trinh',
    'xe may', 'xe dap', 'balo', 'cap sach', 'tu do', 'ke sach', 'ke trang tri',
    'ghe', 'sofa', 'giuong', 'nem', 'bep', 'noi com', 'quat', 'may khoan',
    'nuoc hoa', 'my pham', 'ao', 'quan', 'giay', 'dep', 'dong ho', 'ssd', 'ram',
    'cpu', 'mainboard', 'card do hoa', 'may in', 'may loc', 'may say',
];
const GENERAL_NAME_PATTERNS = [
    /\b(ban|may|m)\s+(ten|la ai)\b/,
    /\b(ten)\s+(ban|may|m)\b/,
    /\b(who are you|your name)\b/,
];
const GENERAL_SELF_LINK_PATTERNS = [
    /\b(duong link|link|lien ket)\s+(cua\s+)?(ban|may|m|olodo ai)\b/,
    /\b(ban|may|m|olodo ai)\s+(co\s+)?(duong link|link|lien ket)\b/,
];
const LOCATION_CACHE_MS = 5 * 60 * 1000;
const LOCATION_PREFIXES = ['quan', 'q', 'huyen', 'thanh pho', 'tp', 'phuong', 'xa', 'duong'];
const LOCATION_NOISE_TERMS = new Set([
    'viet nam', 'vietnam', 'ho chi minh', 'thanh pho ho chi minh', 'tp ho chi minh',
    'tphcm', 'hcm', 'sai gon',
]);
let locationCatalogCache = {
    expiresAt: 0,
    items: [],
};

const normalizeVietnamese = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase();

const normalizeSearchText = (value) =>
    normalizeVietnamese(value)
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const compactText = (value, maxLength = 260) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const addUnique = (items, value) => {
    const normalized = normalizeSearchText(value);
    if (!normalized) return;
    if (!items.some((item) => normalizeSearchText(item) === normalized)) {
        items.push(value);
    }
};

const cleanLocationText = (value) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/g, '')
        .trim();

const isUsefulLocationTerm = (value) => {
    const normalized = normalizeSearchText(value);
    if (!normalized) return false;
    if (LOCATION_NOISE_TERMS.has(normalized)) return false;
    if (/^\d+$/.test(normalized)) return false;
    if (normalized.length < 4 && !/^q\d{1,2}$/.test(normalized)) return false;
    return true;
};

const addLocationCandidate = (items, label, term, weight = 1) => {
    const cleanLabel = cleanLocationText(label);
    const cleanTerm = cleanLocationText(term);
    const normalizedTerm = normalizeSearchText(cleanTerm);

    if (!cleanLabel || !isUsefulLocationTerm(cleanTerm)) return;
    if (items.some((item) => item.normalizedTerm === normalizedTerm && item.label === cleanLabel)) return;

    items.push({
        label: cleanLabel,
        term: cleanTerm,
        normalizedTerm,
        tokenCount: normalizedTerm.split(' ').filter(Boolean).length,
        weight,
    });
};

const addPrefixLocationCandidates = (items, segment) => {
    const normalizedSegment = normalizeSearchText(segment);

    LOCATION_PREFIXES.forEach((prefix) => {
        const pattern = new RegExp(`\\b${escapeRegExp(prefix)}\\s+([a-z0-9][a-z0-9\\s]{0,42})\\b`, 'g');

        for (const match of normalizedSegment.matchAll(pattern)) {
            const value = match[1].trim();
            if (!value) continue;

            const prefixLabel = prefix === 'q' ? 'quan' : prefix;
            const term = `${prefixLabel} ${value}`.replace(/\s+/g, ' ').trim();
            const displayLabel = (prefix === 'quan' || prefix === 'q') && /^\d{1,2}$/.test(value)
                ? `Quận ${value}`
                : segment;

            addLocationCandidate(items, displayLabel, term, 5);

            if (!/^\d+$/.test(value)) {
                addLocationCandidate(items, displayLabel, value, 4);
            }

            if ((prefix === 'quan' || prefix === 'q') && /^\d{1,2}$/.test(value)) {
                addLocationCandidate(items, `quan ${value}`, `q${value}`, 5);
                addLocationCandidate(items, `quan ${value}`, `quan${value}`, 5);
            }
        }
    });
};

const deriveLocationCandidatesFromDbValue = (value) => {
    const location = cleanLocationText(value);
    if (!location) return [];

    const candidates = [];
    const segments = location
        .split(/[,\n|]+/)
        .map(cleanLocationText)
        .filter(Boolean);

    [location, ...segments].forEach((segment) => {
        const normalized = normalizeSearchText(segment);
        const tokenCount = normalized.split(' ').filter(Boolean).length;

        if (tokenCount >= 2 && segment.length <= 90) {
            addLocationCandidate(candidates, segment, segment, 2);
        }

        addPrefixLocationCandidates(candidates, segment);
    });

    return candidates;
};

const buildLocationCatalog = (rows) => {
    const byTerm = new Map();

    rows.forEach((row) => {
        const total = Number(row.total || 0);

        deriveLocationCandidatesFromDbValue(row.vi_tri).forEach((candidate) => {
            const existing = byTerm.get(candidate.normalizedTerm);

            if (existing) {
                existing.total += total;
                if (candidate.weight > existing.weight) existing.weight = candidate.weight;
                return;
            }

            byTerm.set(candidate.normalizedTerm, {
                ...candidate,
                total,
            });
        });
    });

    return [...byTerm.values()].sort((left, right) => (
        right.normalizedTerm.length - left.normalizedTerm.length ||
        right.weight - left.weight ||
        right.total - left.total
    ));
};

const getLocationCatalog = async () => {
    const now = Date.now();
    if (locationCatalogCache.expiresAt > now) return locationCatalogCache.items;

    const rows = await tinnhanai.getLocationCatalog(900);
    const items = buildLocationCatalog(rows);

    locationCatalogCache = {
        expiresAt: now + LOCATION_CACHE_MS,
        items,
    };

    return items;
};

const containsLocationTerm = (normalizedMessage, normalizedTerm) => {
    const pattern = escapeRegExp(normalizedTerm).replace(/\s+/g, '\\s+');
    return new RegExp(`(^|\\s)${pattern}(?=\\s|$)`).test(normalizedMessage);
};

const hasProductHint = (message) => {
    const normalized = normalizeVietnamese(message).replace(/\s+/g, ' ').trim();
    return PRODUCT_HINTS.some((hint) => normalized.includes(hint));
};

const isNameQuestion = (message) => {
    const normalized = normalizeVietnamese(message).replace(/\s+/g, ' ').trim();
    return GENERAL_NAME_PATTERNS.some((pattern) => pattern.test(normalized));
};

const isSelfLinkQuestion = (message) => {
    const normalized = normalizeVietnamese(message).replace(/\s+/g, ' ').trim();
    return GENERAL_SELF_LINK_PATTERNS.some((pattern) => pattern.test(normalized));
};

const formatDetectedLocationLabel = (label) => {
    const cleaned = cleanLocationText(label);
    const normalized = normalizeSearchText(cleaned);
    const districtMatch = normalized.match(/^quan\s*(\d{1,2})$/);

    if (districtMatch) return `Quận ${districtMatch[1]}`;
    return cleaned;
};

const extractLocationTerms = async (message) => {
    const normalized = normalizeSearchText(message);
    if (!normalized) return [];

    const hasLocationCue = /\b(o|tai|gan|quanh|khu vuc|quan|q\d{1,2}|huyen|phuong|xa|duong|tp|thanh pho)\b/.test(normalized);
    const catalog = await getLocationCatalog();
    const matches = [];

    catalog.forEach((item) => {
        if (!containsLocationTerm(normalized, item.normalizedTerm)) return;

        const isCompactDistrict = /^q\d{1,2}$/.test(item.normalizedTerm) || /^quan\d{1,2}$/.test(item.normalizedTerm);
        const isStrongLocationTerm = item.weight >= 4 || item.tokenCount >= 2 || isCompactDistrict;
        if (!hasLocationCue && !isStrongLocationTerm) return;

        matches.push({
            ...item,
            score:
                (item.tokenCount * 12) +
                (item.weight * 10) +
                Math.min(item.normalizedTerm.length, 60) +
                Math.min(item.total, 80) / 4,
        });
    });

    return matches
        .sort((left, right) => right.score - left.score || right.total - left.total)
        .reduce((items, item) => {
            addUnique(items, formatDetectedLocationLabel(item.label));
            return items;
        }, [])
        .slice(0, 3);
};

const buildIgnoredSearchTokens = (locationTerms) => {
    const ignored = {
        raw: new Set(['món', 'đồ', 'gần', 'quanh', 'khu', 'vực', 'quận', 'huyện', 'phường', 'xã']),
        normalized: new Set(['mon', 'do', 'gan', 'quanh', 'khu', 'vuc']),
        normalizedWhenRawEquals: new Set(),
    };

    locationTerms.forEach((term) => {
        const rawTokens = String(term || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
        const districtMatch = normalizeVietnamese(term).match(/^quan\s*(\d{1,2})$/);

        rawTokens.forEach((token) => {
            ignored.raw.add(token);
            ignored.normalizedWhenRawEquals.add(normalizeVietnamese(token));
        });

        if (districtMatch) {
            ignored.raw.add(`q${districtMatch[1]}`);
            ignored.raw.add(`quan${districtMatch[1]}`);
            ignored.normalizedWhenRawEquals.add(`q${districtMatch[1]}`);
            ignored.normalizedWhenRawEquals.add(`quan${districtMatch[1]}`);
        }
    });

    return ignored;
};

const getMeaningfulTokens = (message, ignoredTokens = {}) => {
    const tokens = String(message || '').match(/[\p{L}\p{N}]+/gu) || [];
    const ignoredRaw = ignoredTokens.raw || new Set();
    const ignoredNormalized = ignoredTokens.normalized || new Set();
    const ignoredNormalizedWhenRawEquals = ignoredTokens.normalizedWhenRawEquals || new Set();

    return tokens
        .map((token) => ({
            raw: token.toLowerCase(),
            normalized: normalizeVietnamese(token),
        }))
        .filter(({ raw, normalized }) => {
            if (normalized.length < 2) return false;
            if (/^\d+$/.test(normalized)) return false;
            if (EXACT_STOP_TOKENS.has(raw)) return false;
            if (STOP_WORDS.has(normalized)) return false;
            if (ignoredRaw.has(raw)) return false;
            if (ignoredNormalized.has(normalized)) return false;
            if (raw === normalized && ignoredNormalizedWhenRawEquals.has(normalized)) return false;
            return true;
        });
};

const extractKeywords = (message, ignoredTokens) => {
    const keywords = [];

    getMeaningfulTokens(message, ignoredTokens).forEach(({ raw, normalized }) => {
        if (!keywords.some((item) => normalizeVietnamese(item) === normalized)) {
            keywords.push(raw);
        }
    });

    return keywords.slice(0, 8);
};

const extractPhrases = (message, ignoredTokens) => {
    const tokens = getMeaningfulTokens(message, ignoredTokens).map((item) => item.raw);
    const phrases = [];

    for (let size = 3; size >= 2; size -= 1) {
        for (let index = 0; index <= tokens.length - size; index += 1) {
            const phrase = tokens.slice(index, index + size).join(' ');
            if (!phrases.some((item) => normalizeVietnamese(item) === normalizeVietnamese(phrase))) {
                phrases.push(phrase);
            }
        }
    }

    return phrases.slice(0, 5);
};

const hasListingIntent = ({ message, keywords, phrases, maxPrice, locationTerms }) => {
    const normalized = normalizeVietnamese(message);
    const productHint = hasProductHint(message);
    const hasPrice = Number.isFinite(maxPrice) && maxPrice > 0;
    const hasSearchSignal = /\b(tim|kiem|mua|gia|duoi|tren|bai dang|san pham|thanh ly|pass|can mua|muon mua)\b/.test(normalized);
    const hasMarketplaceNoun = /\b(mon|do|hang|bai dang|san pham)\b/.test(normalized);
    const hasSoftAdviceSignal = /\b(goi y|tu van|chon|nen mua)\b/.test(normalized);
    const hasMarketplaceBrowseSignal = /\b(co mon|mon nao|do nao|hang nao|bai dang nao|san pham nao)\b/.test(normalized);
    const hasLocationBrowseSignal = locationTerms.length > 0 && (hasMarketplaceNoun || hasSearchSignal || hasMarketplaceBrowseSignal);

    if (productHint) return true;
    if (hasLocationBrowseSignal) return true;
    if (hasMarketplaceBrowseSignal) return true;
    if (hasPrice && (hasSearchSignal || keywords.length > 0 || phrases.length > 0)) return true;
    if (hasSearchSignal && (keywords.length > 0 || phrases.length > 0)) return true;
    if (hasSoftAdviceSignal && productHint) return true;

    return false;
};

const buildGeneralFallbackAnswer = (message) => {
    if (isNameQuestion(message)) {
        return 'Mình là OLODO AI, trợ lý tư vấn của chợ sinh viên OLODO. Mình có thể trò chuyện bình thường và khi bạn cần mua bán, mình sẽ tìm bài đăng phù hợp trong hệ thống.';
    }

    if (isSelfLinkQuestion(message)) {
        return 'Mình không có đường link riêng. Nếu bạn muốn xem bài đăng, hãy nói tên món, ngân sách hoặc khu vực; mình sẽ gợi ý bài phù hợp và hiện nút "Mở bài" để bạn vào chi tiết.';
    }

    return 'Mình là OLODO AI. Mình có thể trò chuyện bình thường; khi bạn muốn tìm món đồ, hãy nói tên món, ngân sách hoặc khu vực để mình tra bài đăng trong hệ thống.';
};

const buildGeneralChatMessages = ({ message, history }) => [
    {
        role: 'system',
        content:
            'Ban la OLODO AI, tro ly cua cho sinh vien OLODO. ' +
            'Tra loi tieng Viet tu nhien cho cac cau hoi doi song binh thuong. ' +
            'Neu nguoi dung hoi ten/ban la ai, noi ban la OLODO AI. ' +
            'Khong tu y dua danh sach san pham, gia, link hoac bai dang neu nguoi dung khong hoi mua ban.',
    },
    ...history,
    { role: 'user', content: message },
];

const formatLocationText = (locationTerms) => {
    if (!locationTerms.length) return '';
    if (locationTerms.length === 1) return locationTerms[0];
    return locationTerms.slice(0, 2).join(' hoặc ');
};

const buildNoResultAnswer = ({ keywords, phrases, maxPrice, locationTerms }) => {
    const searchText = phrases[0] || keywords.join(' ') || 'yêu cầu này';
    const budgetText = maxPrice ? ` trong ngân sách ${formatCurrency(maxPrice)}` : '';
    const locationText = formatLocationText(locationTerms);

    if (!phrases.length && !keywords.length && locationText) {
        return `Mình chưa tìm được bài đăng nào ở ${locationText}${budgetText}. Bạn thử chọn khu vực lân cận hoặc thêm tên món cụ thể để mình tìm lại chính xác hơn.`;
    }

    return `Mình chưa tìm được bài đăng phù hợp với "${searchText}"${budgetText}. Bạn thử nới ngân sách, đổi từ khóa ngắn hơn hoặc thêm khu vực để mình tìm lại chính xác hơn.`;
};

const buildListingAnswer = ({ keywords, phrases, maxPrice, locationTerms }) => {
    const searchText = phrases[0] || keywords.join(' ');
    const locationText = formatLocationText(locationTerms);
    const locationSuffix = locationText ? ` ở ${locationText}` : '';
    const budgetText = maxPrice ? ` trong khoảng ${formatCurrency(maxPrice)}` : '';
    const lead = searchText
        ? `Mình gợi ý cho bạn một số bài đăng phù hợp với "${searchText}"${locationSuffix}${budgetText}.`
        : `Mình gợi ý cho bạn một số bài đăng đang có${locationSuffix}${budgetText}.`;

    return [
        lead,
        'Bạn xem nhanh các thẻ bên dưới; bấm "Mở bài" để vào chi tiết, xem ảnh và liên hệ người đăng.',
    ].join('\n\n');
};

const extractMaxPrice = (message) => {
    const normalized = normalizeVietnamese(message).replace(/\s+/g, ' ');
    const pricePatterns = [
        /(\d+(?:[.,]\d+)?)\s*(trieu|tr|m)\b/,
        /(\d+(?:[.,]\d+)?)\s*(nghin|ngan|k)\b/,
        /(\d[\d.,]*)\s*(vnd|dong|d)\b/,
    ];

    for (const pattern of pricePatterns) {
        const match = normalized.match(pattern);
        if (!match) continue;

        const rawNumber = match[1];
        const looksLikeThousands = /^[\d]+([.,]\d{3})+$/.test(rawNumber);
        const value = looksLikeThousands
            ? Number(rawNumber.replace(/[.,]/g, ''))
            : Number(rawNumber.replace(',', '.'));
        if (!Number.isFinite(value) || value <= 0) continue;

        const unit = match[2];
        if (unit === 'trieu' || unit === 'tr' || unit === 'm') return Math.round(value * 1000000);
        if (unit === 'nghin' || unit === 'ngan' || unit === 'k') return Math.round(value * 1000);
        return Math.round(value);
    }

    return null;
};

const formatCurrency = (value) => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return 'Lien he';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(numeric);
};

const normalizeAssetUrl = (value, req) => {
    if (!value || typeof value !== 'string') return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;

    const origin = `${req.protocol}://${req.get('host')}`;
    const cleaned = value.replace(/^\/+/, '');
    if (cleaned.startsWith('uploads/')) return `${origin}/${cleaned}`;
    return `${origin}/uploads/${cleaned}`;
};

const mapPostForClient = (post, req) => {
    const images = Array.isArray(post.DanhSachAnh) ? post.DanhSachAnh : [];

    return {
        id: post.ID_BaiDang,
        authorId: post.ID_NguoiDung,
        title: post.tieu_de || 'Bài đăng',
        description: post.mo_ta || '',
        price: Number(post.gia || 0),
        priceLabel: formatCurrency(post.gia),
        location: post.vi_tri || 'Chưa cập nhật',
        status: post.trang_thai || '',
        category: post.TenDanhMuc || '',
        postType: post.TenLoaiBaiDang || '',
        author: post.TenNguoiDung || 'Người dùng OLODO',
        image: normalizeAssetUrl(images[0], req),
        imageUrls: images.map((item) => normalizeAssetUrl(item, req)).filter(Boolean),
        likeCount: Number(post.SoLuongLike || 0),
        commentCount: Number(post.SoLuongBinhLuan || 0),
        createdAt: post.thoi_gian_tao,
        relevanceScore: Number(post.relevance_score || 0),
    };
};

const sanitizeHistory = (history) => {
    if (!Array.isArray(history)) return [];

    return history
        .slice(-8)
        .map((item) => ({
            role: item?.role === 'assistant' ? 'assistant' : 'user',
            content: compactText(item?.content, 700),
        }))
        .filter((item) => item.content);
};

exports.chat = async (req, res) => {
    const userId = String(req.user?.id || req.user?.userId || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Ban can dang nhap de su dung AI tu van',
        });
    }

    if (!message) {
        return res.status(400).json({
            success: false,
            message: 'Vui long nhap noi dung can tu van',
        });
    }

    if (message.length > 1000) {
        return res.status(400).json({
            success: false,
            message: 'Noi dung hoi qua dai, vui long rut gon duoi 1000 ky tu',
        });
    }

    if (!process.env.CEREBRAS_API_KEY) {
        return res.status(500).json({
            success: false,
            message: 'Chua cau hinh CEREBRAS_API_KEY cho backend',
        });
    }

    try {
        const locationTerms = await extractLocationTerms(message);
        const ignoredSearchTokens = buildIgnoredSearchTokens(locationTerms);
        const keywords = extractKeywords(message, ignoredSearchTokens);
        const phrases = extractPhrases(message, ignoredSearchTokens);
        const maxPrice = extractMaxPrice(message);
        const listingIntent = hasListingIntent({ message, keywords, phrases, maxPrice, locationTerms });
        const bodyHistory = sanitizeHistory(req.body?.history);

        if (!listingIntent) {
            let reply = buildGeneralFallbackAnswer(message);

            try {
                if (isNameQuestion(message) || isSelfLinkQuestion(message)) {
                    throw new Error('skip_provider_for_fixed_general_answer');
                }

                const generalResponse = await axios.post(
                    CEREBRAS_CHAT_URL,
                    {
                        model: CEREBRAS_MODEL,
                        messages: buildGeneralChatMessages({ message, history: bodyHistory }),
                        temperature: 0.55,
                        max_tokens: 360,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000,
                    }
                );

                reply = generalResponse.data?.choices?.[0]?.message?.content?.trim() || reply;
            } catch (providerError) {
                if (providerError.message !== 'skip_provider_for_fixed_general_answer') {
                    console.error('Cerebras general chat failed:', providerError.response?.data?.error?.message || providerError.message);
                }
            }

            try {
                await tinnhanai.insert({
                    ID_NguoiDung: userId,
                    noi_dung_gui: message,
                    noi_dung_tra_loi: reply,
                });
            } catch (historyError) {
                console.error('Cannot save AI chat history:', historyError.message);
            }

            return res.json({
                success: true,
                data: {
                    answer: reply,
                    posts: [],
                    meta: {
                        model: CEREBRAS_MODEL,
                        keywords,
                        phrases,
                        locationTerms,
                        maxPrice,
                        totalPosts: 0,
                        hasListingIntent: false,
                        showPosts: false,
                    },
                },
            });
        }

        const relatedRows = listingIntent
            ? await tinnhanai.searchRelevantPosts({ keywords, phrases, locationTerms, maxPrice, limit: 8 })
            : [];
        const orderedRows = Number.isFinite(maxPrice) && maxPrice > 0
            ? [...relatedRows].sort((left, right) => Number(left.gia || 0) - Number(right.gia || 0))
            : relatedRows;
        const relatedPosts = orderedRows.map((post) => mapPostForClient(post, req));
        const shouldCallProvider = listingIntent && relatedPosts.length > 0;

        if (!shouldCallProvider) {
            const reply = buildNoResultAnswer({ keywords, phrases, locationTerms, maxPrice });

            try {
                await tinnhanai.insert({
                    ID_NguoiDung: userId,
                    noi_dung_gui: message,
                    noi_dung_tra_loi: reply,
                });
            } catch (historyError) {
                console.error('Cannot save AI chat history:', historyError.message);
            }

            return res.json({
                success: true,
                data: {
                    answer: reply,
                    posts: [],
                    meta: {
                        model: null,
                        keywords,
                        phrases,
                        locationTerms,
                        maxPrice,
                        totalPosts: 0,
                        hasListingIntent: listingIntent,
                        showPosts: false,
                    },
                },
            });
        }

        const reply = buildListingAnswer({ keywords, phrases, locationTerms, maxPrice });

        try {
            await tinnhanai.insert({
                ID_NguoiDung: userId,
                noi_dung_gui: message,
                noi_dung_tra_loi: reply,
            });
        } catch (historyError) {
            console.error('Cannot save AI chat history:', historyError.message);
        }

        res.json({
            success: true,
            data: {
                answer: reply,
                posts: relatedPosts,
                meta: {
                    model: CEREBRAS_MODEL,
                    keywords,
                    phrases,
                    locationTerms,
                    maxPrice,
                    totalPosts: relatedPosts.length,
                    hasListingIntent: listingIntent,
                    showPosts: relatedPosts.length > 0,
                },
            },
        });
    } catch (error) {
        const status = error.response?.status || 500;
        const providerMessage = error.response?.data?.error?.message || error.response?.data?.message;
        console.error('Cerebras chat failed:', providerMessage || error.message);

        res.status(status >= 400 && status < 600 ? status : 500).json({
            success: false,
            message: providerMessage || 'Khong the ket noi AI tu van luc nay',
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const data = await tinnhanai.getAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await tinnhanai.getById(id);
        if (!data) {
            return res.status(404).json({ message: 'tinnhanai không tồn tại' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.insert = async (req, res) => {
    try {
        const newData = req.body;
        const insertId = await tinnhanai.insert(newData);
        res.status(201).json({ id: insertId, message: 'Thêm mới thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        const affectedRows = await tinnhanai.update(id, updatedData);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'tinnhanai không tồn tại' });
        }
        res.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const affectedRows = await tinnhanai.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'tinnhanai không tồn tại' });
        }
        res.json({ message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};
