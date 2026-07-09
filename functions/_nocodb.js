const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY_MS = 700;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(),
      ...extraHeaders
    }
  });
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-requested-with,idempotency-key"
  };
}

export function handleOptions(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  return null;
}

export async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Некорректный JSON в теле запроса");
  }
}

export function recordsEndpoint(env) {
  if (env.NOCODB_RECORDS_ENDPOINT) return trimSlash(env.NOCODB_RECORDS_ENDPOINT);

  const apiUrl = trimSlash(env.NOCODB_API_URL || "");
  const tableId = env.NOCODB_TABLE_ID || env.NOCODB_REQUESTS_TABLE_ID;

  if (!apiUrl) throw new Error("Не задан NOCODB_API_URL или NOCODB_RECORDS_ENDPOINT");
  if (!tableId) throw new Error("Не задан NOCODB_TABLE_ID / NOCODB_REQUESTS_TABLE_ID");

  if (apiUrl.includes("/api/v2/tables/") && apiUrl.endsWith("/records")) return apiUrl;
  return `${apiUrl}/api/v2/tables/${encodeURIComponent(tableId)}/records`;
}

export function authHeaders(env, extra = {}) {
  const token = env.NOCODB_API_TOKEN || env.NOCODB_TOKEN || env.XC_TOKEN;
  if (!token) throw new Error("Не задан NOCODB_API_TOKEN / NOCODB_TOKEN / XC_TOKEN");
  return {
    "accept": "application/json",
    "content-type": "application/json",
    "xc-token": token,
    ...extra
  };
}

export function normalizeListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function getRecordId(record) {
  return record?.Id ?? record?.id ?? record?.ID ?? record?.ncRecordId;
}

export async function ncFetch(context, url, options = {}, attempt = 0) {
  const env = context.env || {};
  const maxRetries = toInt(env.NOCODB_MAX_RETRIES, DEFAULT_MAX_RETRIES);
  const baseDelay = toInt(env.NOCODB_RETRY_BASE_MS, DEFAULT_BASE_DELAY_MS);

  const started = Date.now();
  let response;
  let text = "";

  try {
    response = await fetch(url, options);
    text = await response.text();
  } catch (error) {
    if (attempt < maxRetries) {
      await sleep(delayMs(baseDelay, attempt));
      return ncFetch(context, url, options, attempt + 1);
    }
    throw new Error(`Ошибка сети NocoDB: ${error.message}`);
  }

  const retryable = response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504;
  if (!response.ok && retryable && attempt < maxRetries) {
    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    await sleep(retryAfter || delayMs(baseDelay, attempt));
    return ncFetch(context, url, options, attempt + 1);
  }

  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }

  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error || data?.raw || response.statusText || "Ошибка NocoDB";
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    error.durationMs = Date.now() - started;
    throw error;
  }

  return {
    status: response.status,
    data,
    durationMs: Date.now() - started,
    attempts: attempt + 1
  };
}

export async function findByIdempotencyKey(context, key) {
  if (!key) return null;
  const endpoint = recordsEndpoint(context.env);
  const where = encodeURIComponent(`(IdempotencyKey,eq,${String(key).replaceAll(",", "")})`);
  const url = `${endpoint}?limit=1&where=${where}`;
  try {
    const result = await ncFetch(context, url, { method: "GET", headers: authHeaders(context.env) });
    return normalizeListPayload(result.data)[0] || null;
  } catch {
    return null;
  }
}

export function withIdempotency(data, request) {
  const headerKey = request.headers.get("idempotency-key");
  const key = data?.IdempotencyKey || data?.idempotencyKey || headerKey;
  if (!key) return data;
  return { ...data, IdempotencyKey: key };
}

export function safeTrashPayload(reason = "Удалено из админки") {
  const now = new Date().toISOString();
  return {
    "Статус": "Удалена",
    "DeletedAt": now,
    "Дата удаления": now,
    "Причина удаления": reason || "Удалено из админки"
  };
}

export function buildQueryUrl(endpoint, params) {
  const url = new URL(endpoint);
  for (const [key, value] of params.entries()) {
    if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, value);
  }
  return url.toString();
}

export function errorJson(error, fallbackStatus = 500) {
  const status = Number(error.status || fallbackStatus || 500);
  return json({
    ok: false,
    error: error.message || "Ошибка сервера",
    details: error.details || null
  }, status >= 400 && status < 600 ? status : 500);
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayMs(baseDelay, attempt) {
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(10000, baseDelay * Math.pow(2, attempt)) + jitter;
}

function parseRetryAfter(value) {
  if (!value) return 0;
  const sec = Number(value);
  if (Number.isFinite(sec)) return Math.max(0, sec * 1000);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return 0;
}
