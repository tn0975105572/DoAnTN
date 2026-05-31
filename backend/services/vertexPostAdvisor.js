const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const axios = require("axios");

const MODEL_ID = process.env.VERTEX_MODEL || "gemini-2.5-flash";
const LOCATION = process.env.VERTEX_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "global";
const AI_INTENT_ENABLED = process.env.AI_INTENT_ENABLED !== "false";
const DEFAULT_CREDENTIAL_PATH = path.join(__dirname, "..", "config", "ngochuyenn-64b70897936d.json");

const SEARCH_STOPWORDS = new Set([
  "ai", "anh", "ban", "bang", "bao", "bi", "bai", "cai", "can", "cho",
  "co", "cua", "duoc", "duoi", "gi", "gia", "giup", "goi", "goiy",
  "hay", "hoi", "hoac", "ket", "khong", "kiem", "la", "lam", "lon",
  "max", "minh", "min", "mot", "mua", "nao", "nay", "ngan", "nghin",
  "nhung", "nho", "post", "qua", "ra", "re", "search", "toi", "tim",
  "trong", "tr", "tren", "trieu", "tu", "van", "ve", "voi", "xin",
  "chao", "hello", "hi", "hey",
]);

let serviceAccount = null;
let tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

const compactText = (value, maxLength = 700) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
};

const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();

const base64UrlJson = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const signJwt = (payload, privateKey) => {
  const header = { alg: "RS256", typ: "JWT" };
  const unsignedJwt = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  return `${unsignedJwt}.${signer.sign(privateKey, "base64url")}`;
};

const readJsonFile = async (filePath) => JSON.parse(await fs.readFile(filePath, "utf8"));

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const findServiceAccountFile = async () => {
  const explicitPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.SERVICE_ACCOUNT_FILE ||
    process.env.CREDENTIAL_FILE ||
    process.env.VERTEX_SERVICE_ACCOUNT_FILE;

  if (explicitPath) return path.resolve(explicitPath);
  if (await fileExists(DEFAULT_CREDENTIAL_PATH)) return DEFAULT_CREDENTIAL_PATH;

  throw new Error("Không tìm thấy service account JSON trong backend/config.");
};

const loadServiceAccount = async () => {
  if (serviceAccount) return serviceAccount;

  const credentialPath = await findServiceAccountFile();
  const json = await readJsonFile(credentialPath);

  for (const key of ["client_email", "private_key", "project_id"]) {
    if (!json[key]) throw new Error(`Credential file thiếu ${key}.`);
  }

  serviceAccount = {
    clientEmail: json.client_email,
    privateKey: json.private_key,
    projectId: json.project_id,
    tokenUri: json.token_uri || "https://oauth2.googleapis.com/token",
    credentialPath,
  };

  return serviceAccount;
};

const getAccessToken = async () => {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.accessToken && tokenCache.expiresAt - 60 > now) {
    return tokenCache.accessToken;
  }

  const account = await loadServiceAccount();
  const assertion = signJwt(
    {
      iss: account.clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: account.tokenUri,
      iat: now,
      exp: now + 3600,
    },
    account.privateKey
  );

  const response = await axios.post(
    account.tokenUri,
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 30000,
    }
  );

  tokenCache = {
    accessToken: response.data.access_token,
    expiresAt: now + Number(response.data.expires_in || 3600),
  };

  return tokenCache.accessToken;
};

const getVertexEndpoint = (projectId) => {
  const host = LOCATION === "global"
    ? "https://aiplatform.googleapis.com"
    : `https://${LOCATION}-aiplatform.googleapis.com`;

  return `${host}/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(LOCATION)}/publishers/google/models/${encodeURIComponent(MODEL_ID)}:generateContent`;
};

const numberInRange = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const getThinkingBudget = () => {
  if (process.env.VERTEX_THINKING_BUDGET === "") return null;
  if (process.env.VERTEX_THINKING_BUDGET !== undefined) {
    return Math.round(numberInRange(process.env.VERTEX_THINKING_BUDGET, 0, 0, 24576));
  }
  return /gemini-2\.5-flash/i.test(MODEL_ID) ? 0 : null;
};

const buildGenerationConfig = (options = {}) => {
  const generationConfig = {
    temperature: numberInRange(options.temperature, 0.7, 0, 2),
    maxOutputTokens: Math.round(numberInRange(options.maxOutputTokens, 900, 128, 8192)),
  };
  const thinkingBudget = getThinkingBudget();
  if (thinkingBudget !== null) generationConfig.thinkingConfig = { thinkingBudget };
  return generationConfig;
};

const pickReplyText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((part) => part && !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
};

const generateVertexText = async (contents, systemInstruction, options = {}) => {
  const account = await loadServiceAccount();
  const accessToken = await getAccessToken();
  const response = await axios.post(
    getVertexEndpoint(account.projectId),
    {
      contents,
      systemInstruction: {
        parts: [{ text: String(systemInstruction || "Bạn là trợ lý AI hữu ích.") }],
      },
      generationConfig: buildGenerationConfig(options),
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      timeout: 45000,
    }
  );

  const reply = pickReplyText(response.data);
  if (!reply) {
    const error = new Error("Gemini trả về phản hồi rỗng.");
    error.details = { finishReason: response.data?.candidates?.[0]?.finishReason };
    throw error;
  }

  return { reply, data: response.data };
};

const normalizeMessage = (message) => {
  const content = compactText(message?.content, 20000);
  if (!content) return null;
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: content }],
  };
};

const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-8)
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: compactText(item?.content, 700),
    }))
    .filter((item) => item.content);
};

const parsePriceValue = (amount, unit) => {
  const numericText = String(amount || "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(numericText);
  if (!Number.isFinite(value)) return null;

  const normalizedUnit = normalizeSearchText(unit);
  if (["tr", "trieu", "trieu dong"].includes(normalizedUnit)) return Math.round(value * 1000000);
  if (["k", "nghin", "ngan"].includes(normalizedUnit)) return Math.round(value * 1000);
  return Math.round(value);
};

const parsePriceFilter = (query) => {
  const text = normalizeSearchText(query);
  const amountPattern = "([0-9][0-9.,]*)\\s*(trieu dong|trieu|tr|nghin|ngan|k)?";
  const maxMatch = text.match(new RegExp(`(?:duoi|toi da|khong qua|nho hon|<=|max|gia re hon)\\s*${amountPattern}`, "i"));
  const minMatch = text.match(new RegExp(`(?:tren|tu|lon hon|>=|min)\\s*${amountPattern}`, "i"));

  return {
    maxPrice: maxMatch ? parsePriceValue(maxMatch[1], maxMatch[2]) : null,
    minPrice: minMatch ? parsePriceValue(minMatch[1], minMatch[2]) : null,
  };
};

const extractSearchTerms = (query) => {
  const seen = new Set();
  const matches = String(query || "").match(/[\p{L}\p{N}]{2,}/gu) || [];
  const terms = [];

  for (const match of matches) {
    const normalized = normalizeSearchText(match);
    if (
      seen.has(normalized) ||
      SEARCH_STOPWORDS.has(normalized) ||
      /^\d+$/.test(normalized) ||
      /^\d+(tr|trieu|k|nghin|ngan)$/.test(normalized)
    ) {
      continue;
    }

    seen.add(normalized);
    terms.push(match);
    if (terms.length >= 8) break;
  }

  return terms;
};

const cleanIntentText = (value, maxLength = 90) =>
  String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);

const uniqueTextValues = (values, maxItems = 10) => {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const text = cleanIntentText(value);
    const normalized = normalizeSearchText(text);
    if (!text || seen.has(normalized) || SEARCH_STOPWORDS.has(normalized)) continue;

    seen.add(normalized);
    output.push(text);
    if (output.length >= maxItems) break;
  }

  return output;
};

const parseJsonObject = (text) => {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1));
    throw new Error("AI intent response is not valid JSON.");
  }
};

const buildFallbackIntent = (query) => {
  const priceFilter = parsePriceFilter(query);
  return {
    keywords: extractSearchTerms(query),
    requiredTerms: [],
    excludeTerms: [],
    category: "",
    postType: "",
    location: "",
    minPrice: priceFilter.minPrice,
    maxPrice: priceFilter.maxPrice,
    sort: "relevance",
    needClarification: false,
    source: "rules",
  };
};

const normalizeIntent = (rawIntent, query) => {
  const fallback = buildFallbackIntent(query);
  const intent = rawIntent && typeof rawIntent === "object" ? rawIntent : {};
  const minPrice = Number(intent.minPrice ?? intent.min_price);
  const maxPrice = Number(intent.maxPrice ?? intent.max_price);

  return {
    keywords: uniqueTextValues([
      ...(Array.isArray(intent.keywords) ? intent.keywords : []),
      ...(Array.isArray(intent.requiredTerms) ? intent.requiredTerms : []),
      ...(Array.isArray(intent.required_terms) ? intent.required_terms : []),
      intent.category,
      intent.postType,
      intent.post_type,
      ...fallback.keywords,
    ], 14),
    requiredTerms: uniqueTextValues(
      Array.isArray(intent.requiredTerms) ? intent.requiredTerms : intent.required_terms || [],
      8
    ),
    excludeTerms: uniqueTextValues(
      Array.isArray(intent.excludeTerms) ? intent.excludeTerms : intent.exclude_terms || [],
      8
    ),
    category: cleanIntentText(intent.category),
    postType: cleanIntentText(intent.postType ?? intent.post_type),
    location: cleanIntentText(intent.location),
    minPrice: Number.isFinite(minPrice) ? minPrice : fallback.minPrice,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : fallback.maxPrice,
    sort: ["relevance", "newest", "price_asc", "price_desc"].includes(intent.sort) ? intent.sort : fallback.sort,
    needClarification: Boolean(intent.needClarification ?? intent.need_clarification),
    source: intent.source || "vertex",
  };
};

const inferSearchIntent = async (query) => {
  const fallback = buildFallbackIntent(query);
  if (!AI_INTENT_ENABLED || !String(query || "").trim()) return fallback;

  const systemInstruction = [
    "You extract search intent for a Vietnamese marketplace.",
    "Return JSON only. Do not write SQL. Do not invent posts.",
    "Convert prices to VND numbers. Examples: 2tr = 2000000, 500k = 500000.",
    "Schema:",
    '{"keywords":["product words"],"requiredTerms":[],"excludeTerms":[],"category":"","postType":"","location":"","minPrice":null,"maxPrice":null,"sort":"relevance","needClarification":false}',
  ].join("\n");

  try {
    const { reply } = await generateVertexText(
      [{ role: "user", parts: [{ text: String(query).slice(0, 2000) }] }],
      systemInstruction,
      { temperature: 0, maxOutputTokens: 512 }
    );
    return normalizeIntent(parseJsonObject(reply), query);
  } catch (error) {
    return {
      ...fallback,
      intentError: error instanceof Error ? error.message : "Không trích xuất được intent bằng Gemini.",
    };
  }
};

const buildSearchContext = (posts, latestUserText, searchIntent, searchError) => {
  if (searchError) {
    return `Trang thai tim kiem MySQL: loi khi doc du lieu (${searchError}).`;
  }

  if (!posts.length) {
    return [
      "Che do CSDL: read-only.",
      `Intent tim kiem: ${JSON.stringify(searchIntent || {})}.`,
      `Ket qua tim kiem MySQL cho cau hoi moi nhat "${latestUserText}": khong co bai dang phu hop.`,
    ].join("\n");
  }

  const compactPosts = posts.map((item, index) => ({
    rank: index + 1,
    id: item.id,
    title: item.title,
    price: item.price,
    priceText: item.priceLabel || item.priceText,
    location: item.location,
    category: item.category,
    type: item.postType || item.type,
    status: item.status,
    reason: item.reason,
    description: compactText(item.description, 220),
  }));

  return [
    "Che do CSDL: read-only.",
    `Intent tim kiem: ${JSON.stringify(searchIntent || {})}.`,
    `Ket qua tim kiem MySQL cho cau hoi moi nhat "${latestUserText}" la JSON sau:`,
    JSON.stringify(compactPosts, null, 2),
  ].join("\n");
};

const buildGroundedSystemPrompt = (posts, latestUserText, searchIntent, searchError) => [
  "Ban la tro ly AI cho chuc nang tim kiem bai dang trong ung dung cho/do cu.",
  "Tra loi bang tieng Viet tu nhien, ngan gon, uu tien goi y cac bai dang phu hop nhat.",
  "MySQL la nguon du lieu duy nhat. Khong duoc bia ID, gia, vi tri hoac bai dang khac.",
  "Neu ket qua it hoac khong phu hop, noi ro va hoi them tieu chi nhu danh muc, gia, vi tri.",
  "Khi goi y bai dang, hay neu tieu de, gia, vi tri va ly do phu hop.",
  "",
  buildSearchContext(posts, latestUserText, searchIntent, searchError),
].join("\n");

const generatePostAnswer = async ({ message, history, posts, searchIntent, searchError }) => {
  const contents = [
    ...sanitizeHistory(history).map(normalizeMessage).filter(Boolean),
    { role: "user", parts: [{ text: compactText(message, 2000) }] },
  ];

  const { reply, data } = await generateVertexText(
    contents,
    buildGroundedSystemPrompt(posts, message, searchIntent, searchError),
    { temperature: posts.length ? 0.35 : 0.55, maxOutputTokens: posts.length ? 900 : 420 }
  );

  return {
    reply,
    usage: data.usageMetadata || null,
    model: MODEL_ID,
    location: LOCATION,
  };
};

module.exports = {
  buildFallbackIntent,
  generatePostAnswer,
  inferSearchIntent,
  model: MODEL_ID,
  location: LOCATION,
};
