const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(body, status = 200) { return new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS }); }
export async function onRequest({ request, env }) {
  const password = request.headers.get("x-admin-password") || "";
  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) return json({ ok: false, error: "Неверный пароль администратора" }, 401);
  const apiId = env.SMSRU_API_ID || env.SMS_API_KEY || "";
  if (!apiId) return json({ ok: false, error: "Не задан SMSRU_API_ID" }, 400);
  const url = new URL("https://sms.ru/my/balance");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("json", "1");
  const res = await fetch(url.toString(), { method: "GET" });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  const ok = res.ok && data.status === "OK";
  return json({ ok, provider: "smsru", balance: data.balance ?? "", result: data, error: ok ? "" : (data.status_text || "SMS.ru не вернул баланс") }, ok ? 200 : 502);
}
