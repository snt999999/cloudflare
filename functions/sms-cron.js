const DEFAULT_SMS_LIMIT = 500;
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(body, status = 200) { return new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS }); }
function parseJson(text) { try { return JSON.parse(text); } catch (_) { return text; } }
function endpoint(env) { return env.NOCODB_SMS_ENDPOINT || env.NOCODB_NOTIFICATIONS_ENDPOINT || ""; }
function token(env) { return env.NOCODB_TOKEN || ""; }
function checkCronAuth(request, env) {
  const secret = env.SMS_CRON_SECRET || "";
  if (!secret) return { ok: false, status: 500, body: { ok: false, error: "SMS_CRON_SECRET is not set" } };
  const provided = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret") || "";
  if (provided !== secret) return { ok: false, status: 401, body: { ok: false, error: "Неверный SMS_CRON_SECRET" } };
  return { ok: true };
}
function normRecord(rec) { const fields = rec.fields || rec; const id = rec.id || (rec.id_fields && (rec.id_fields.Id || rec.id_fields.id)) || fields.Id || fields.id || ""; return { id: String(id), fields }; }
async function listSms(env) {
  if (!endpoint(env)) return { ok: false, setupRequired: true, records: [], error: "Не задан NOCODB_SMS_ENDPOINT" };
  const url = new URL(endpoint(env));
  url.searchParams.set("limit", String(DEFAULT_SMS_LIMIT));
  const res = await fetch(url.toString(), { headers: { "xc-token": token(env) } });
  const text = await res.text(); const data = parseJson(text);
  if (!res.ok) return { ok: false, error: "NocoDB SMS list error", status: res.status, nocodbResponse: data };
  const raw = Array.isArray(data) ? data : (data.records || data.list || []);
  return { ok: true, records: raw.map(normRecord) };
}
async function patchSms(env, id, fields) {
  const payload = [{ id: Number(id) || id, fields }];
  const res = await fetch(endpoint(env), { method: "PATCH", headers: { "Content-Type": "application/json", "xc-token": token(env) }, body: JSON.stringify(payload) });
  const text = await res.text(); const data = parseJson(text);
  return { ok: res.ok, status: res.status, response: data, payload };
}
async function patchSmsSafe(env, id, extendedFields, fallbackFields) {
  const full = await patchSms(env, id, extendedFields);
  if (full.ok || !fallbackFields) return full;
  const fallback = await patchSms(env, id, fallbackFields);
  return { ...fallback, extendedFailed: full };
}
function compactJson(value, max = 1800) { try { return JSON.stringify(value || {}).slice(0, max); } catch (_) { return String(value || "").slice(0, max); } }
function nowYekaterinburgParts() {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yekaterinburg", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
function isDue(fields, now) {
  const status = String(fields["Статус"] || "");
  if (status !== "Запланировано") return false;
  const d = String(fields["Дата отправки"] || "").slice(0, 10);
  const t = String(fields["Время отправки"] || "00:00").slice(0, 5);
  if (!d || !t) return false;
  return `${d} ${t}` <= `${now.date} ${now.time}`;
}
function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("9")) digits = "7" + digits;
  return digits;
}
function cleanText(value) { return String(value || "").replace(/[<>]/g, "").trim().slice(0, 900); }
async function sendSmsRu(env, to, message) {
  const apiId = env.SMSRU_API_ID || env.SMS_API_KEY || "";
  if (!apiId) return { ok: false, provider: "smsru", error: "Не задан SMSRU_API_ID" };
  const phone = normalizePhone(to);
  const url = new URL("https://sms.ru/sms/send");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("to", phone);
  url.searchParams.set("msg", message);
  url.searchParams.set("json", "1");
  const sender = env.SMSRU_SENDER || env.SMS_SENDER || "";
  if (sender) url.searchParams.set("from", sender);
  if (env.SMSRU_TEST === "1") url.searchParams.set("test", "1");
  const res = await fetch(url.toString(), { method: "GET" });
  const raw = await res.text(); let data; try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const smsResult = data.sms && (data.sms[phone] || data.sms[to] || Object.values(data.sms)[0]);
  const ok = res.ok && (data.status === "OK" || smsResult?.status === "OK" || smsResult?.status_code === 100);
  return { ok, provider: "smsru", smsId: smsResult?.sms_id || "", status: smsResult?.status || data.status || "", statusCode: smsResult?.status_code || data.status_code || "", balance: data.balance ?? "", result: data, error: ok ? "" : (smsResult?.status_text || data.status_text || "SMS.ru не подтвердил отправку") };
}
export async function onRequestGet({ request, env }) { return runSmsCron({ request, env, source: "http" }); }
export async function onRequestPost({ request, env }) { return runSmsCron({ request, env, source: "http" }); }
async function runSmsCron({ request, env, source }) {
  const auth = checkCronAuth(request, env); if (!auth.ok) return json(auth.body, auth.status);
  if (!token(env)) return json({ ok: false, error: "NOCODB_TOKEN is missing" }, 500);
  if (!endpoint(env)) return json({ ok: false, setupRequired: true, error: "Не задан NOCODB_SMS_ENDPOINT" }, 200);
  const listed = await listSms(env);
  if (!listed.ok) return json(listed, 500);
  const now = nowYekaterinburgParts();
  const due = listed.records.filter((r) => isDue(r.fields || {}, now));
  const results = [];
  for (const record of due.slice(0, 25)) {
    const f = record.fields || {};
    const to = normalizePhone(f["Телефон"] || "");
    const message = cleanText(f["Текст SMS"] || "");
    if (!to || !message) {
      const error = !to ? "Нет телефона" : "Нет текста SMS";
      await patchSms(env, record.id, { "Статус": "Ошибка", "Ошибка": error });
      results.push({ id: record.id, ok: false, error });
      continue;
    }
    await patchSms(env, record.id, { "Статус": "Отправляется", "Ошибка": "" });
    const sent = await sendSmsRu(env, to, message);
    if (sent.ok) {
      const base = { "Статус": "Отправлено", "Дата фактической отправки": new Date().toISOString(), "Ошибка": "" };
      const extended = { ...base, "ID SMS.ru": sent.smsId || "", "Статус доставки": sent.status || "OK", "Ответ сервиса": compactJson(sent.result || sent), "Баланс после отправки": String(sent.balance ?? ""), "Дата проверки статуса": new Date().toISOString() };
      await patchSmsSafe(env, record.id, extended, base);
    } else {
      const base = { "Статус": "Ошибка", "Ошибка": sent.error || "Ошибка отправки" };
      const extended = { ...base, "Статус доставки": sent.status || "ERROR", "Ответ сервиса": compactJson(sent.result || sent), "Дата проверки статуса": new Date().toISOString() };
      await patchSmsSafe(env, record.id, extended, base);
    }
    results.push({ id: record.id, to, ok: sent.ok, error: sent.error || "", provider: "smsru", smsId: sent.smsId || "", deliveryStatus: sent.status || "" });
  }
  return json({ ok: true, source, provider: "smsru", now, checked: listed.records.length, due: due.length, processed: results.length, results });
}
export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Only GET/POST" }, 405);
}
