const DEFAULT_MAX_RETRIES = 6;
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
    "access-control-allow-headers": "content-type,authorization,x-requested-with,idempotency-key,x-admin-password"
  };
}

export function handleOptions(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  return null;
}

export async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { throw new Error("Некорректный JSON в теле запроса"); }
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
  return { "accept": "application/json", "content-type": "application/json", "xc-token": token, ...extra };
}

export async function ncFetch(context, url, options = {}, attempt = 0) {
  const env = context.env || {};
  const maxRetries = toInt(env.NOCODB_MAX_RETRIES, DEFAULT_MAX_RETRIES);
  const baseDelay = toInt(env.NOCODB_RETRY_BASE_MS, DEFAULT_BASE_DELAY_MS);
  const started = Date.now();
  let response, text = "";
  try {
    response = await fetch(url, options);
    text = await response.text();
  } catch (error) {
    if (attempt < maxRetries) { await sleep(delayMs(baseDelay, attempt)); return ncFetch(context, url, options, attempt + 1); }
    throw new Error(`Ошибка сети NocoDB: ${error.message}`);
  }
  const retryable = [429, 500, 502, 503, 504].includes(response.status);
  if (!response.ok && retryable && attempt < maxRetries) {
    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    await sleep(retryAfter || delayMs(baseDelay, attempt));
    return ncFetch(context, url, options, attempt + 1);
  }
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }
  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error || data?.raw || response.statusText || "Ошибка NocoDB";
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    error.durationMs = Date.now() - started;
    throw error;
  }
  return { status: response.status, data, durationMs: Date.now() - started, attempts: attempt + 1 };
}

export function normalizeRecordPayload(payload, fallbackId = "") {
  const row = payload?.record || payload?.data || payload?.item || payload;
  if (!row || typeof row !== "object") return { id: String(fallbackId || ""), fields: {} };
  if (row.fields && typeof row.fields === "object") return { id: String(row.id ?? row.Id ?? fallbackId ?? ""), fields: { ...row.fields } };
  const id = row.id ?? row.Id ?? row.ID ?? row.ncRecordId ?? fallbackId ?? "";
  const fields = { ...row };
  delete fields.id; delete fields.Id; delete fields.ID; delete fields.ncRecordId;
  return { id: String(id), fields };
}

export function errorJson(error, fallbackStatus = 500) {
  const status = Number(error.status || fallbackStatus || 500);
  return json({ ok: false, error: error.message || "Ошибка сервера", details: error.details || null }, status >= 400 && status < 600 ? status : 500);
}

function trimSlash(value) { return String(value || "").replace(/\/+$/, ""); }
function toInt(value, fallback) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) ? parsed : fallback; }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function delayMs(baseDelay, attempt) { return Math.min(12000, baseDelay * Math.pow(2, attempt)) + Math.floor(Math.random() * 350); }
function parseRetryAfter(value) {
  if (!value) return 0;
  const sec = Number(value);
  if (Number.isFinite(sec)) return Math.max(0, sec * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}
