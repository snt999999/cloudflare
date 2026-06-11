function json(body, status = 200) { return new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }); }
function checkAdmin(request, env) {
  const required = env.ADMIN_PASSWORD;
  if (!required) return { ok: false, status: 500, body: { ok: false, error: "ADMIN_PASSWORD is not set" } };
  const provided = (request.headers.get("x-admin-password") || "").trim();
  if (provided !== required) return { ok: false, status: 401, body: { ok: false, error: "Неверный пароль администратора" } };
  return { ok: true };
}
export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = checkAdmin(request, env);
  if (!auth.ok) return json(auth.body, auth.status);
  if (!env.GOOGLE_DRIVE_UPLOAD_URL) return json({ ok: false, error: "GOOGLE_DRIVE_UPLOAD_URL is not set" }, 500);
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const fileId = String(body.fileId || body.id || String(body.key || "").replace(/^drive:/, "")).trim();
  if (!fileId) return json({ ok: false, error: "Не указан fileId" }, 400);
  const payload = { action: "delete", token: env.GOOGLE_DRIVE_UPLOAD_TOKEN || "", fileId };
  const response = await fetch(env.GOOGLE_DRIVE_UPLOAD_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = { ok: false, error: "Apps Script вернул не JSON", raw: text.slice(0, 500) }; }
  if (!response.ok || !data.ok) return json({ ok: false, error: data.error || "Ошибка удаления в Google Drive", details: data }, 500);
  return json({ ok: true, deleted: fileId });
}
export async function onRequest(context) {
  if (context.request.method !== "POST") return json({ ok: false, error: "Only POST" }, 405);
  return onRequestPost(context);
}
