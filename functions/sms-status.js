const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(body, status = 200) { return new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS }); }
function checkAdmin(request, env) {
  const required = env.ADMIN_PASSWORD;
  if (!required) return { ok: false, status: 500, body: { ok: false, error: "ADMIN_PASSWORD is not set" } };
  const provided = (request.headers.get("x-admin-password") || "").trim();
  if (provided !== required) return { ok: false, status: 401, body: { ok: false, error: "Неверный пароль администратора" } };
  return { ok: true };
}
function endpoint(env) { return env.NOCODB_SMS_ENDPOINT || env.NOCODB_NOTIFICATIONS_ENDPOINT || ""; }
function token(env) { return env.NOCODB_TOKEN || ""; }
function getProstorCredentials(env) {
  const login = env.PROSTOR_LOGIN || env.PROSTOR_API_LOGIN || "";
  const password = env.PROSTOR_PASSWORD || env.PROSTOR_API_PASSWORD || env.SMS_API_KEY || "";
  return { login, password };
}
function prostorBase(env) { return String(env.PROSTOR_API_BASE || "https://api.prostor-sms.ru/messages/v2").replace(/\/+$/, ""); }
function cleanText(value, max = 1800) { return String(value || "").replace(/[<>]/g, "").trim().slice(0, max); }
function compactJson(value, max = 1800) { try { return JSON.stringify(value || {}).slice(0, max); } catch (_) { return String(value || "").slice(0, max); } }
async function patchSms(env, id, fields) {
  if (!id || !endpoint(env) || !token(env)) return { ok: false, skipped: true };
  const payload = [{ id: Number(id) || id, fields }];
  const res = await fetch(endpoint(env), { method: "PATCH", headers: { "Content-Type": "application/json", "xc-token": token(env) }, body: JSON.stringify(payload) });
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch (_) { data = text; }
  return { ok: res.ok, status: res.status, response: data };
}
async function patchSmsSafe(env, id, extended, fallback) {
  const full = await patchSms(env, id, extended);
  if (full.ok || !fallback) return full;
  const fb = await patchSms(env, id, fallback);
  return { ...fb, extendedFailed: full };
}
async function checkProstorStatus(env, smscId) {
  const { login, password } = getProstorCredentials(env);
  if (!login || !password) return { ok: false, error: "Для Prostor нужны PROSTOR_LOGIN и PROSTOR_PASSWORD" };
  if (!smscId) return { ok: false, error: "Не указан ID Prostor / smscId" };
  const url = env.PROSTOR_STATUS_URL || (prostorBase(env) + "/status.json");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", "Accept": "application/json" },
    body: JSON.stringify({ login, password, messages: [{ smscId }] })
  });
  const raw = await response.text(); let data; try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const first = Array.isArray(data.messages) ? data.messages[0] : null;
  const status = first?.status || data.status || "";
  const ok = response.ok && String(data.status || "").toLowerCase() === "ok" && Boolean(first);
  return { ok, provider: "prostor", smscId, status, result: data, error: ok ? "" : (status || data.raw || "Prostor не вернул статус") };
}
async function handle({ request, env }) {
  const auth = checkAdmin(request, env); if (!auth.ok) return json(auth.body, auth.status);
  let body = {};
  if (request.method === "POST") body = await request.json().catch(() => ({}));
  const url = new URL(request.url);
  const smscId = cleanText(body.smscId || body.prostorId || body.id || url.searchParams.get("smscId") || url.searchParams.get("id") || "", 100);
  const nocodbId = cleanText(body.nocodbId || body.recordId || url.searchParams.get("nocodbId") || "", 100);
  const checked = await checkProstorStatus(env, smscId);
  let update = null;
  if (nocodbId && smscId) {
    const base = { "Ошибка": checked.ok ? "" : (checked.error || "Ошибка проверки статуса") };
    const extended = { ...base, "Статус доставки": cleanText(checked.status || "", 120), "Ответ сервиса": compactJson(checked.result || checked), "Дата проверки статуса": new Date().toISOString() };
    if (["delivered"].includes(String(checked.status).toLowerCase())) extended["Статус"] = "Отправлено";
    if (["delivery error", "smsc reject"].includes(String(checked.status).toLowerCase())) extended["Статус"] = "Ошибка";
    update = await patchSmsSafe(env, nocodbId, extended, base);
  }
  return json({ ...checked, nocodbUpdate: update });
}
export async function onRequestGet(context) { return handle(context); }
export async function onRequestPost(context) { return handle(context); }
export async function onRequest(context) {
  if (context.request.method === "GET" || context.request.method === "POST") return handle(context);
  return json({ ok: false, error: "Only GET/POST" }, 405);
}
