function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function checkAdmin(request, env) {
  const required = env.ADMIN_PASSWORD;
  if (!required) return { ok: false, status: 500, body: { ok: false, error: "ADMIN_PASSWORD is not set" } };
  const provided = (request.headers.get("x-admin-password") || "").trim();
  if (provided !== required) return { ok: false, status: 401, body: { ok: false, error: "Неверный пароль администратора" } };
  return { ok: true };
}
function safeText(value, max = 300) { return String(value || "").replace(/[<>]/g, "").trim().slice(0, max); }
function fileTypeByMime(mime, name) {
  const m = String(mime || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  if (m.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(n)) return "фото";
  if (m.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm)$/i.test(n)) return "видео";
  if (m.includes("pdf") || /\.pdf$/i.test(n)) return "pdf";
  return "документ";
}
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = checkAdmin(request, env);
  if (!auth.ok) return json(auth.body, auth.status);
  if (!env.GOOGLE_DRIVE_UPLOAD_URL) return json({ ok: false, error: "GOOGLE_DRIVE_UPLOAD_URL is not set. Подключите Google Apps Script Web App." }, 500);

  let form;
  try { form = await request.formData(); } catch (_) { return json({ ok: false, error: "Нужен multipart/form-data" }, 400); }
  const requestId = safeText(form.get("requestId"), 80);
  if (!requestId) return json({ ok: false, error: "Не указан номер заявки" }, 400);
  const formFiles = form.getAll("files").filter((x) => x && typeof x === "object" && "name" in x);
  if (!formFiles.length) return json({ ok: false, error: "Файлы не выбраны" }, 400);

  const payload = {
    action: "upload",
    token: env.GOOGLE_DRIVE_UPLOAD_TOKEN || "",
    requestId,
    client: safeText(form.get("client"), 200),
    phone: safeText(form.get("phone"), 80),
    address: safeText(form.get("address"), 300),
    service: safeText(form.get("service"), 200),
    status: safeText(form.get("status"), 80),
    uploadedAt: new Date().toISOString(),
    files: []
  };

  for (const file of formFiles) {
    const originalName = safeText(file.name || "file", 180) || "file";
    const contentType = file.type || "application/octet-stream";
    payload.files.push({
      name: originalName,
      originalName,
      contentType,
      fileType: fileTypeByMime(contentType, originalName),
      size: file.size || 0,
      base64: arrayBufferToBase64(await file.arrayBuffer())
    });
  }

  let driveResponse;
  try {
    driveResponse = await fetch(env.GOOGLE_DRIVE_UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return json({ ok: false, error: "Не удалось отправить файл в Google Apps Script: " + error.message }, 502);
  }

  const text = await driveResponse.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = { ok: false, error: "Apps Script вернул не JSON", raw: text.slice(0, 500) }; }
  if (!driveResponse.ok || !data.ok) return json({ ok: false, error: data.error || "Ошибка Google Drive", details: data }, 500);
  return json({ ok: true, uploaded: data.uploaded || [], warning: data.warning || "" });
}
export async function onRequest(context) {
  if (context.request.method !== "POST") return json({ ok: false, error: "Only POST" }, 405);
  return onRequestPost(context);
}
