const DEFAULT_SMS_LIMIT = 500;
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(body, status = 200) { return new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS }); }
function parseJson(text) { try { return JSON.parse(text); } catch (_) { return text; } }
function endpoint(env) { return env.NOCODB_SMS_ENDPOINT || env.NOCODB_NOTIFICATIONS_ENDPOINT || ""; }
function token(env) { return env.NOCODB_TOKEN || ""; }
function normRecord(rec) { const fields = rec.fields || rec; const id = rec.id || (rec.id_fields && (rec.id_fields.Id || rec.id_fields.id)) || fields.Id || fields.id || ""; return { id: String(id), fields }; }
function checkCronAuth(request, env) {
  const secret = env.SMS_CRON_SECRET || "";
  if (!secret) return { ok: false, status: 500, body: { ok: false, error: "SMS_CRON_SECRET is not set" } };
  const provided = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret") || "";
  if (provided !== secret) return { ok: false, status: 401, body: { ok: false, error: "Неверный SMS_CRON_SECRET" } };
  return { ok: true };
}
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
async function sendSms(env, to, message) {
  const provider = String(env.SMS_PROVIDER || "smsru").toLowerCase();
  if (provider === "smsru") return sendSmsRu(env, to, message);
  if (provider === "smsc") return sendSmsc(env, to, message);
  if (provider === "prostor") return sendProstor(env, to, message);
  return { ok: false, error: "SMS_PROVIDER должен быть smsru, smsc или prostor" };
}
function prostorBase(env) {
  const base = String(env.PROSTOR_API_BASE || "https://api.prostor-sms.ru/messages/v2").replace(/\/+$/, "");
  return base;
}
function prostorPhone(value) {
  const digits = normalizePhone(value);
  return digits ? "+" + digits : "";
}
function makeProstorClientId() {
  return ("SC" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase().slice(0, 72);
}
function getProstorCredentials(env) {
  const login = env.PROSTOR_LOGIN || env.PROSTOR_API_LOGIN || "";
  const password = env.PROSTOR_PASSWORD || env.PROSTOR_API_PASSWORD || env.SMS_API_KEY || "";
  return { login, password };
}
async function sendProstor(env, to, message) {
  const { login, password } = getProstorCredentials(env);
  if (!login || !password) return { ok: false, provider: "prostor", error: "Для Prostor нужны PROSTOR_LOGIN и PROSTOR_PASSWORD" };
  const sender = env.PROSTOR_SENDER || env.SMS_SENDER || "";
  const url = env.PROSTOR_SEND_URL || (prostorBase(env) + "/send.json");
  const clientId = makeProstorClientId();
  const sms = { phone: prostorPhone(to), clientId, text: message };
  if (sender) sms.sender = sender;
  const payload = { login, password, messages: [sms] };
  if (env.PROSTOR_STATUS_QUEUE_NAME) payload.statusQueueName = env.PROSTOR_STATUS_QUEUE_NAME;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", "Accept": "application/json" },
    body: JSON.stringify(payload)
  });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const first = Array.isArray(data.messages) ? data.messages[0] : null;
  const firstStatus = String(first?.status || "").toLowerCase();
  const ok = res.ok && String(data.status || "").toLowerCase() === "ok" && firstStatus === "accepted";
  const error = ok ? "" : (first?.status || data.status || data.raw || "Prostor не подтвердил отправку");
  return { ok, provider: "prostor", clientId, smscId: first?.smscId || "", status: first?.status || data.status || "", result: data, error };
}

async function sendSmsRu(env, to, message) {
  const apiId = env.SMSRU_API_ID || env.SMS_API_KEY || "";
  if (!apiId) return { ok: false, error: "Не задан SMSRU_API_ID или SMS_API_KEY" };
  const url = new URL("https://sms.ru/sms/send");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("to", to);
  url.searchParams.set("msg", message);
  url.searchParams.set("json", "1");
  if (env.SMS_SENDER) url.searchParams.set("from", env.SMS_SENDER);
  const res = await fetch(url.toString(), { method: "GET" });
  const raw = await res.text(); let data; try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const smsResult = data.sms && (data.sms[to] || Object.values(data.sms)[0]);
  const ok = data.status === "OK" || smsResult?.status === "OK" || smsResult?.status_code === 100;
  return { ok, provider: "smsru", result: data, error: ok ? "" : (smsResult?.status_text || data.status_text || "SMS.ru не подтвердил отправку") };
}
async function sendSmsc(env, to, message) {
  const login = env.SMSC_LOGIN || "";
  const password = env.SMSC_PASSWORD || env.SMS_API_KEY || "";
  if (!login || !password) return { ok: false, error: "Для SMSC нужны SMSC_LOGIN и SMSC_PASSWORD" };
  const url = new URL("https://smsc.ru/sys/send.php");
  url.searchParams.set("login", login);
  url.searchParams.set("psw", password);
  url.searchParams.set("phones", to);
  url.searchParams.set("mes", message);
  url.searchParams.set("fmt", "3");
  if (env.SMS_SENDER) url.searchParams.set("sender", env.SMS_SENDER);
  const res = await fetch(url.toString(), { method: "GET" });
  const raw = await res.text(); let data; try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const ok = Boolean(data.id || data.cnt);
  return { ok, provider: "smsc", result: data, error: ok ? "" : (data.error || "SMSC не подтвердил отправку") };
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
    const sent = await sendSms(env, to, message);
    if (sent.ok) {
      await patchSms(env, record.id, { "Статус": "Отправлено", "Дата фактической отправки": new Date().toISOString(), "Ошибка": "" });
    } else {
      await patchSms(env, record.id, { "Статус": "Ошибка", "Ошибка": sent.error || "Ошибка отправки" });
    }
    results.push({ id: record.id, to, ok: sent.ok, error: sent.error || "", provider: sent.provider || "" });
  }
  return json({ ok: true, source, now, checked: listed.records.length, due: due.length, processed: results.length, results });
}
export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ ok: false, error: "Only GET/POST" }, 405);
}
