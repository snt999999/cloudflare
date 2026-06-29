const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

export async function onRequestPost({ request, env }) {
  try {
    const password = request.headers.get("x-admin-password") || "";
    if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
      return json({ ok: false, error: "Неверный пароль администратора" }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const channel = String(body.channel || "sms").toLowerCase();
    const message = cleanText(body.message || body.text || "");
    const to = normalizePhone(body.to || body.phone || body.chatId || "");

    if (!message) return json({ ok: false, error: "Пустой текст уведомления" }, 400);

    if (channel === "sms") {
      if (!to) return json({ ok: false, error: "Не указан номер телефона клиента" }, 400);
      const smsResponse = await sendSmsRu({ env, to, message });
      const smsPayload = await smsResponse.clone().json().catch(() => ({}));
      if (!body.skipSmsLog && !body.queueId) await logDirectSms({ env, body, to, message, smsPayload });
      return smsResponse;
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
    sms: Boolean(env.SMSRU_API_ID || env.SMS_API_KEY),
    telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID),
    provider: "smsru",
    sender: env.SMSRU_SENDER || env.SMS_SENDER || ""
  });
}

function smsEndpoint(env) { return env.NOCODB_SMS_ENDPOINT || env.NOCODB_NOTIFICATIONS_ENDPOINT || ""; }
function nocodbToken(env) { return env.NOCODB_TOKEN || ""; }
function yDateTimeParts() {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Yekaterinburg", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
function compactJson(value, max = 1800) {
  try { return JSON.stringify(value || {}).slice(0, max); } catch (_) { return String(value || "").slice(0, max); }
}
async function createSmsLog(env, fields) {
  if (!smsEndpoint(env) || !nocodbToken(env)) return { ok: false, skipped: true, error: "NOCODB_SMS_ENDPOINT/NOCODB_TOKEN не заданы" };
  const res = await fetch(smsEndpoint(env), {
    method: "POST",
    headers: { "Content-Type": "application/json", "xc-token": nocodbToken(env) },
    body: JSON.stringify([{ fields }])
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch (_) { data = text; }
  return { ok: res.ok, status: res.status, response: data };
}
async function logDirectSms({ env, body, to, message, smsPayload }) {
  if (!smsEndpoint(env) || !nocodbToken(env)) return;
  const now = yDateTimeParts();
  const baseFields = {
    "ID заявки": cleanText(body.recordId || body.requestId || "TEST-" + Date.now(), 80),
    "ФИО": cleanText(body.client || body.name || "Тестовая отправка", 160),
    "Компания": cleanText(body.company || "", 160),
    "Телефон": normalizePhone(to),
    "Канал": "sms",
    "Тип уведомления": cleanText(body.type || "Тестовая / ручная отправка", 120),
    "Текст SMS": message,
    "Дата отправки": now.date,
    "Время отправки": now.time,
    "Статус": smsPayload?.ok ? "Отправлено" : "Ошибка",
    "Ошибка": smsPayload?.ok ? "" : cleanText(smsPayload?.error || "Ошибка отправки", 400),
    "Дата фактической отправки": smsPayload?.ok ? new Date().toISOString() : "",
    "Создано": new Date().toISOString()
  };
  const extendedFields = {
    ...baseFields,
    "ID SMS.ru": cleanText(smsPayload?.smsId || smsPayload?.sms_id || "", 100),
    "Статус доставки": cleanText(smsPayload?.status || "accepted", 120),
    "Ответ сервиса": compactJson(smsPayload?.result || smsPayload),
    "Баланс после отправки": cleanText(smsPayload?.balance ?? "", 80),
    "Дата проверки статуса": new Date().toISOString()
  };
  const full = await createSmsLog(env, extendedFields);
  if (!full.ok) await createSmsLog(env, baseFields);
}

async function sendSmsRu({ env, to, message }) {
  const apiId = env.SMSRU_API_ID || env.SMS_API_KEY || "";
  if (!apiId) return json({ ok: false, provider: "smsru", error: "Не задан SMSRU_API_ID в Cloudflare" }, 400);
  const phone = normalizePhone(to);
  const url = new URL("https://sms.ru/sms/send");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("to", phone);
  url.searchParams.set("msg", message);
  url.searchParams.set("json", "1");
  const sender = env.SMSRU_SENDER || env.SMS_SENDER || "";
  if (sender) url.searchParams.set("from", sender);
  if (env.SMSRU_TEST === "1") url.searchParams.set("test", "1");

  const response = await fetch(url.toString(), { method: "GET" });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const smsResult = data.sms && (data.sms[phone] || data.sms[to] || Object.values(data.sms)[0]);
  const ok = response.ok && (data.status === "OK" || smsResult?.status === "OK" || smsResult?.status_code === 100);
  return json({
    ok,
    provider: "smsru",
    to: phone,
    smsId: smsResult?.sms_id || "",
    status: smsResult?.status || data.status || "",
    statusCode: smsResult?.status_code || data.status_code || "",
    balance: data.balance ?? "",
    result: data,
    error: ok ? "" : (smsResult?.status_text || data.status_text || "SMS.ru не подтвердил отправку")
  }, ok ? 200 : 502);
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

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("9")) digits = "7" + digits;
  return digits;
}
function cleanText(value, max = 900) { return String(value || "").replace(/[<>]/g, "").trim().slice(0, max); }
function json(data, status = 200) { return new Response(JSON.stringify(data, null, 2), { status, headers: JSON_HEADERS }); }
