const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export async function onRequestPost({ request, env }) {
  try {
    const password = request.headers.get("x-admin-password") || "";
    if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
      return json({ ok: false, error: "Неверный пароль администратора" }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const channel = String(body.channel || "sms").toLowerCase();
    const message = cleanText(body.message || body.text || "");
    const to = normalizeTo(body.to || body.phone || body.chatId || "");

    if (!message) return json({ ok: false, error: "Пустой текст уведомления" }, 400);

    if (channel === "sms") {
      if (!to) return json({ ok: false, error: "Не указан номер телефона клиента" }, 400);
      return await sendSms({ env, to, message });
    }

    if (channel === "telegram" || channel === "admin_telegram") {
      const chatId = to || env.TELEGRAM_ADMIN_CHAT_ID || "";
      if (!chatId) return json({ ok: false, error: "Не указан TELEGRAM_ADMIN_CHAT_ID" }, 400);
      return await sendTelegram({ env, chatId, message });
    }

    return json({ ok: false, error: "Неизвестный канал уведомлений: " + channel }, 400);
  } catch (error) {
    return json({ ok: false, error: error.message || String(error) }, 500);
  }
}

export async function onRequestGet({ request, env }) {
  const password = request.headers.get("x-admin-password") || "";
  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "Неверный пароль администратора" }, 401);
  }
  return json({
    ok: true,
    sms: Boolean(env.SMS_API_KEY || env.SMSRU_API_ID || (env.PROSTOR_LOGIN && env.PROSTOR_PASSWORD)),
    telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID),
    provider: env.SMS_PROVIDER || "smsru"
  });
}

async function sendSms({ env, to, message }) {
  const provider = String(env.SMS_PROVIDER || "smsru").toLowerCase();
  if (provider === "smsru") return await sendSmsRu({ env, to, message });
  if (provider === "smsc") return await sendSmsc({ env, to, message });
  if (provider === "prostor") return await sendProstor({ env, to, message });
  return json({ ok: false, error: "SMS_PROVIDER должен быть smsru, smsc или prostor" }, 400);
}

function prostorBase(env) {
  const base = String(env.PROSTOR_API_BASE || "https://api.prostor-sms.ru/messages/v2").replace(/\/+$/, "");
  return base;
}
function getProstorCredentials(env) {
  const login = env.PROSTOR_LOGIN || env.PROSTOR_API_LOGIN || "";
  const password = env.PROSTOR_PASSWORD || env.PROSTOR_API_PASSWORD || env.SMS_API_KEY || "";
  return { login, password };
}
function makeProstorClientId() {
  return ("SC" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase().slice(0, 72);
}
async function sendProstor({ env, to, message }) {
  const { login, password } = getProstorCredentials(env);
  if (!login || !password) return json({ ok: false, provider: "prostor", error: "Для Prostor нужны PROSTOR_LOGIN и PROSTOR_PASSWORD" }, 400);
  const sender = env.PROSTOR_SENDER || env.SMS_SENDER || "";
  const url = env.PROSTOR_SEND_URL || (prostorBase(env) + "/send.json");
  const clientId = makeProstorClientId();
  const sms = { phone: plusPhone(to), clientId, text: message };
  if (sender) sms.sender = sender;
  const payload = { login, password, messages: [sms] };
  if (env.PROSTOR_STATUS_QUEUE_NAME) payload.statusQueueName = env.PROSTOR_STATUS_QUEUE_NAME;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", "Accept": "application/json" },
    body: JSON.stringify(payload)
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const first = Array.isArray(data.messages) ? data.messages[0] : null;
  const firstStatus = String(first?.status || "").toLowerCase();
  const ok = response.ok && String(data.status || "").toLowerCase() === "ok" && firstStatus === "accepted";
  return json({
    ok,
    provider: "prostor",
    to,
    clientId,
    smscId: first?.smscId || "",
    result: data,
    error: ok ? "" : (first?.status || data.status || data.raw || "Prostor не подтвердил отправку")
  }, ok ? 200 : 502);
}

async function sendSmsRu({ env, to, message }) {
  const apiId = env.SMSRU_API_ID || env.SMS_API_KEY || "";
  if (!apiId) return json({ ok: false, error: "Не задан SMSRU_API_ID или SMS_API_KEY в Cloudflare" }, 400);
  const url = new URL("https://sms.ru/sms/send");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("to", to);
  url.searchParams.set("msg", message);
  url.searchParams.set("json", "1");
  if (env.SMS_SENDER) url.searchParams.set("from", env.SMS_SENDER);

  const response = await fetch(url.toString(), { method: "GET" });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const smsResult = data.sms && (data.sms[to] || Object.values(data.sms)[0]);
  const ok = data.status === "OK" || smsResult?.status === "OK" || smsResult?.status_code === 100;
  return json({ ok, provider: "smsru", to, result: data, error: ok ? "" : (smsResult?.status_text || data.status_text || "SMS.ru не подтвердил отправку") }, ok ? 200 : 502);
}

async function sendSmsc({ env, to, message }) {
  const login = env.SMSC_LOGIN || "";
  const password = env.SMSC_PASSWORD || env.SMS_API_KEY || "";
  if (!login || !password) return json({ ok: false, error: "Для SMSC нужны SMSC_LOGIN и SMSC_PASSWORD" }, 400);
  const url = new URL("https://smsc.ru/sys/send.php");
  url.searchParams.set("login", login);
  url.searchParams.set("psw", password);
  url.searchParams.set("phones", to);
  url.searchParams.set("mes", message);
  url.searchParams.set("fmt", "3");
  if (env.SMS_SENDER) url.searchParams.set("sender", env.SMS_SENDER);

  const response = await fetch(url.toString(), { method: "GET" });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const ok = Boolean(data.id || data.cnt);
  return json({ ok, provider: "smsc", to, result: data, error: ok ? "" : (data.error || "SMSC не подтвердил отправку") }, ok ? 200 : 502);
}

async function sendTelegram({ env, chatId, message }) {
  const token = env.TELEGRAM_BOT_TOKEN || "";
  if (!token) return json({ ok: false, error: "Не задан TELEGRAM_BOT_TOKEN в Cloudflare" }, 400);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true })
  });
  const data = await response.json().catch(() => ({}));
  return json({ ok: Boolean(data.ok), provider: "telegram", chatId, result: data, error: data.ok ? "" : (data.description || "Telegram не подтвердил отправку") }, data.ok ? 200 : 502);
}

function normalizeTo(value) {
  const s = String(value || "").trim();
  if (s.startsWith("-") || /^\d{5,}$/.test(s)) return s;
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("8")) return "7" + digits.slice(1);
  if (digits.length === 10) return "7" + digits;
  return digits;
}

function plusPhone(value) {
  const digits = normalizeTo(value).replace(/\D/g, "");
  return digits ? "+" + digits : "";
}

function cleanText(value) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, 900);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: JSON_HEADERS });
}
