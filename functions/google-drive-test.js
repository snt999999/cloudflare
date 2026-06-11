function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function checkAdmin(request, env) {
  const required = env.ADMIN_PASSWORD;
  if (!required) return { ok: false, status: 500, body: { ok: false, error: "ADMIN_PASSWORD is not set" } };
  const provided = (request.headers.get("x-admin-password") || new URL(request.url).searchParams.get("password") || "").trim();
  if (provided !== required) return { ok: false, status: 401, body: { ok: false, error: "Неверный пароль администратора. Для проверки откройте /google-drive-test?password=ВАШ_ПАРОЛЬ" } };
  return { ok: true };
}
function stripHtml(text) {
  return String(text || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
}
async function parse(response) {
  const text = await response.text();
  const cleaned = String(text || "").replace(/^\uFEFF/, "").trim();
  try { return JSON.parse(cleaned); }
  catch (_) { return { ok: false, error: "Apps Script вернул не JSON", hint: "Чаще всего это неправильная ссылка, доступ не Anyone или не опубликована новая версия Apps Script.", status: response.status, contentType: response.headers.get("content-type") || "", rawSnippet: /<\s*html|<\s*!doctype/i.test(cleaned) ? stripHtml(cleaned) : cleaned.slice(0, 1200) }; }
}
export async function onRequest(context) {
  const { request, env } = context;
  const auth = checkAdmin(request, env);
  if (!auth.ok) return json(auth.body, auth.status);
  if (!env.GOOGLE_DRIVE_UPLOAD_URL) return json({ ok: false, error: "GOOGLE_DRIVE_UPLOAD_URL is not set" }, 500);
  const payload = { action: "health", token: env.GOOGLE_DRIVE_UPLOAD_TOKEN || "" };
  let response;
  try {
    response = await fetch(env.GOOGLE_DRIVE_UPLOAD_URL, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
  } catch (error) {
    return json({ ok: false, error: "Не удалось обратиться к Apps Script: " + error.message }, 502);
  }
  const data = await parse(response);
  return json({ ok: !!(response.ok && data.ok), status: response.status, appsScript: data, urlLooksOk: String(env.GOOGLE_DRIVE_UPLOAD_URL || "").includes("/exec") }, response.ok && data.ok ? 200 : 500);
}
