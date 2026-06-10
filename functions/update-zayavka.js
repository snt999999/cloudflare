const DEFAULT_NOCODB_ENDPOINT = "https://app.nocodb.com/api/v3/data/ptvxn8nmuwc08y3/mgp2zjsuv4id5tp/records";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function parseJson(t) { try { return JSON.parse(t); } catch (_) { return t; } }
function checkAdmin(request, env) {
  const required = env.ADMIN_PASSWORD;
  if (!required) return { ok: false, status: 500, body: { ok: false, error: "ADMIN_PASSWORD is not set" } };
  const provided = (request.headers.get("x-admin-password") || "").trim();
  if (provided !== required) return { ok: false, status: 401, body: { ok: false, error: "Неверный пароль администратора" } };
  return { ok: true };
}
function normalizeValue(key, value) {
  if (key === "Итоговый м2" || key === "м2") {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return value;
}
async function patchRecord(env, id, fields) {
  const payload = [{ id: Number(id) || id, fields }];
  const res = await fetch(env.NOCODB_ENDPOINT || DEFAULT_NOCODB_ENDPOINT, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "xc-token": env.NOCODB_TOKEN },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, response: parseJson(text), payload };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = checkAdmin(request, env);
  if (!auth.ok) return json(auth.body, auth.status);
  if (!env.NOCODB_TOKEN) return json({ ok: false, error: "NOCODB_TOKEN is missing" }, 500);

  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "Invalid JSON" }, 400); }
  if (!body.id) return json({ ok: false, error: "Record id is required" }, 400);

  const safeKeys = [
    "Статус", "Итоговый м2", "Ответственный", "Комментарий администратора", "Создан объект", "Монтажники",
    "Дата записи", "Время записи", "Услуга", "Адрес", "м2", "Имя клиента", "Телефон"
  ];
  const extendedKeys = ["История изменений", "Дата отмены", "Причина отмены", "Удалено", "Дата удаления"];
  const requested = body.fields || {};
  const fields = {};

  for (const key of [...safeKeys, ...extendedKeys]) {
    if (Object.prototype.hasOwnProperty.call(requested, key)) {
      const v = normalizeValue(key, requested[key]);
      if (v !== undefined) fields[key] = v;
    }
  }

  if (!Object.keys(fields).length) return json({ ok: false, error: "Нет данных для сохранения" }, 400);

  try {
    let result = await patchRecord(env, body.id, fields);
    if (result.ok) return json({ ok: true, nocodbResponse: result.response, savedFields: fields });

    const fallback = {};
    for (const key of safeKeys) if (Object.prototype.hasOwnProperty.call(fields, key)) fallback[key] = fields[key];
    if (Object.keys(fallback).length && Object.keys(fallback).length !== Object.keys(fields).length) {
      const retry = await patchRecord(env, body.id, fallback);
      if (retry.ok) {
        return json({
          ok: true,
          nocodbResponse: retry.response,
          savedFields: fallback,
          warning: "Часть дополнительных полей не сохранена. Если нужна общая история на всех устройствах, добавьте в NocoDB колонки: История изменений, Дата отмены, Причина отмены."
        });
      }
      return json({ ok: false, error: "NocoDB update error", status: retry.status, nocodbResponse: retry.response, sentPayload: retry.payload }, 500);
    }

    return json({ ok: false, error: "NocoDB update error", status: result.status, nocodbResponse: result.response, sentPayload: result.payload }, 500);
  } catch (error) {
    return json({ ok: false, error: error.message }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== "POST") return json({ ok: false, error: "Only POST" }, 405);
  return onRequestPost(context);
}
