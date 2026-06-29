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
function compactJson(value, max = 3000) { try { return JSON.stringify(value || {}).slice(0, max); } catch (_) { return String(value || "").slice(0, max); } }
function deliveryStatusName(code, text) {
  const n = Number(code || 0);
  if (n === 100) return text || "Сообщение принято SMS.ru";
  if (n === 101) return text || "Передано оператору";
  if (n === 102) return text || "Доставлено";
  if (n === 103) return text || "Не доставлено";
  if (n === 104) return text || "Истек срок доставки";
  if (n === 105) return text || "Удалено оператором";
  if (n === 106) return text || "Ошибка доставки";
  if (n === 107) return text || "Неверный номер";
  if (n === 108) return text || "Отклонено";
  return text || String(code || "Неизвестный статус");
}
async function checkSmsRuStatus(env, smsId) {
  const apiId = env.SMSRU_API_ID || env.SMS_API_KEY || "";
  if (!apiId) return { ok: false, apiOk: false, provider: "smsru", error: "Не задан SMSRU_API_ID" };
  if (!smsId) return { ok: false, apiOk: false, provider: "smsru", error: "Не указан ID SMS.ru" };
  const url = new URL("https://sms.ru/sms/status");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("sms_id", smsId);
  url.searchParams.set("json", "1");
  const res = await fetch(url.toString(), { method: "GET" });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const item = data.sms && (data.sms[smsId] || Object.values(data.sms)[0]);
  const apiOk = res.ok && data.status === "OK" && Boolean(item);
  const statusCode = Number(item?.status_code || data.status_code || 0);
  const statusText = item?.status_text || data.status_text || "";
  const delivered = statusCode === 102 || /достав/i.test(statusText || "");
  const failed = !apiOk || [103,104,105,106,107,108,150].includes(statusCode) || /не может|ошиб|отклон|не достав/i.test(statusText || "");
  return { ok: apiOk, apiOk, delivered, failed, provider: "smsru", smsId, statusCode: statusCode || "", statusText: deliveryStatusName(statusCode, statusText), rawStatusText: statusText, cost: item?.cost ?? "", result: data, error: apiOk ? "" : (statusText || data.status_text || "SMS.ru не вернул статус") };
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
    const base = { "Статус доставки": cleanText(checked.statusText || checked.statusCode || "", 160), "Дата проверки статуса": new Date().toISOString() };
    if (checked.delivered) base["Статус"] = "Доставлено";
    if (checked.failed && !checked.delivered) base["Статус"] = "Ошибка";
    const extended = { ...base, "ID SMS.ru": smsId, "Стоимость SMS": String(checked.cost ?? ""), "Ответ сервиса": compactJson(checked.result || checked) };
    const patched = await patchSmsSafe(env, nocodbId, extended, base);
    checked.nocodbUpdate = patched;
  }
  return json(checked, checked.apiOk ? 200 : 502);
}
export async function onRequestGet(ctx) { return onRequestPost(ctx); }
export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Only GET/POST" }, 405);
}
