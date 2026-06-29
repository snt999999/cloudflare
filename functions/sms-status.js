const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(body, status = 200) { return new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS }); }
function parseJson(text) { try { return JSON.parse(text); } catch (_) { return text; } }
function cleanText(value, max = 900) { return String(value || "").replace(/[<>]/g, "").trim().slice(0, max); }
function endpoint(env) { return env.NOCODB_SMS_ENDPOINT || env.NOCODB_NOTIFICATIONS_ENDPOINT || ""; }
function token(env) { return env.NOCODB_TOKEN || ""; }
async function patchSms(env, id, fields) {
  if (!endpoint(env) || !token(env)) return { ok: false, skipped: true, error: "NOCODB_SMS_ENDPOINT/NOCODB_TOKEN не заданы" };
  const payload = [{ id: Number(id) || id, fields }];
  const res = await fetch(endpoint(env), { method: "PATCH", headers: { "Content-Type": "application/json", "xc-token": token(env) }, body: JSON.stringify(payload) });
  const text = await res.text();
  return { ok: res.ok, status: res.status, response: parseJson(text), payload };
}
async function patchSmsSafe(env, id, extendedFields, fallbackFields) {
  const full = await patchSms(env, id, extendedFields);
  if (full.ok || !fallbackFields) return full;
  const fallback = await patchSms(env, id, fallbackFields);
  return { ...fallback, extendedFailed: full };
}
function compactJson(value, max = 1800) { try { return JSON.stringify(value || {}).slice(0, max); } catch (_) { return String(value || "").slice(0, max); } }
async function checkSmsRuStatus(env, smsId) {
  const apiId = env.SMSRU_API_ID || env.SMS_API_KEY || "";
  if (!apiId) return { ok: false, provider: "smsru", error: "Не задан SMSRU_API_ID" };
  if (!smsId) return { ok: false, provider: "smsru", error: "Не указан ID SMS.ru" };
  const url = new URL("https://sms.ru/sms/status");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("sms_id", smsId);
  url.searchParams.set("json", "1");
  const res = await fetch(url.toString(), { method: "GET" });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const item = data.sms && (data.sms[smsId] || Object.values(data.sms)[0]);
  const ok = res.ok && data.status === "OK" && item && item.status === "OK";
  return { ok, provider: "smsru", smsId, statusCode: item?.status_code || data.status_code || "", statusText: item?.status_text || data.status_text || "", cost: item?.cost ?? "", result: data, error: ok ? "" : (item?.status_text || data.status_text || "SMS.ru не вернул статус") };
}
export async function onRequestPost({ request, env }) {
  const password = request.headers.get("x-admin-password") || "";
  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) return json({ ok: false, error: "Неверный пароль администратора" }, 401);
  let body; try { body = await request.json(); } catch (_) { body = {}; }
  const url = new URL(request.url);
  const smsId = cleanText(body.smsId || body.sms_id || body.id || url.searchParams.get("smsId") || url.searchParams.get("id") || "", 100);
  const nocodbId = cleanText(body.nocodbId || body.recordId || "", 100);
  const checked = await checkSmsRuStatus(env, smsId);
  if (nocodbId && smsId) {
    const statusCode = Number(checked.statusCode || 0);
    const base = { "Статус доставки": cleanText(checked.statusText || checked.statusCode || "", 120), "Дата проверки статуса": new Date().toISOString() };
    if (checked.ok && statusCode === 103) base["Статус"] = "Доставлено";
    if ([104,105,106,107,108,150].includes(statusCode)) base["Статус"] = "Ошибка";
    const extended = { ...base, "ID SMS.ru": smsId, "Стоимость SMS": String(checked.cost ?? ""), "Ответ сервиса": compactJson(checked.result || checked) };
    const patched = await patchSmsSafe(env, nocodbId, extended, base);
    checked.nocodbUpdate = patched;
  }
  return json(checked, checked.ok ? 200 : 502);
}
export async function onRequestGet(ctx) { return onRequestPost(ctx); }
export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Only GET/POST" }, 405);
}
