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
function shortNocodbError(result) {
  const r = result && result.response;
  if (!r) return "";
  if (typeof r === "string") return r.slice(0, 500);
  return String(r.msg || r.message || r.error || JSON.stringify(r)).slice(0, 700);
}
async function tryPatchVariants(env, id, variants) {
  const attempts = [];
  for (const fields of variants) {
    if (!fields || !Object.keys(fields).length) continue;
    const result = await patchRecord(env, id, fields);
    attempts.push({ status: result.status, fields, response: result.response });
    if (result.ok) return { ok: true, result, savedFields: fields, attempts };
  }
  return { ok: false, attempts };
}
function makeTrashVariants(fields) {
  const comment = fields["Комментарий администратора"] || "";
  const variants = [];
  variants.push(fields);
  // На разных таблицах NocoDB могут отсутствовать дополнительные колонки или варианты single select.
  // Поэтому пробуем безопасные варианты: сначала полноценная корзина, потом минимальный статус.
  variants.push({ "Статус": "Отменена", "Комментарий администратора": comment });
  variants.push({ "Статус": "Удалена", "Комментарий администратора": comment });
  variants.push({ "Статус": "Отказ", "Комментарий администратора": comment });
  variants.push({ "Статус": "Отменена" });
  variants.push({ "Статус": "Удалена" });
  variants.push({ "Статус": "Отказ" });
  return variants;
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
    "Дата записи", "Время записи", "Услуга", "Адрес", "м2", "Имя клиента", "Компания", "Телефон", "Файлы", "Google Calendar Event ID", "Ссылка на событие", "Источник"
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
    const isTrashMove = requested.__moveToTrash === true || ["Отменена", "Удалена", "Отказ"].includes(String(fields["Статус"] || ""));
    const variants = [];
    if (isTrashMove) {
      variants.push(...makeTrashVariants(fields));
    } else {
      variants.push(fields);
      const fallback = {};
      for (const key of safeKeys) if (Object.prototype.hasOwnProperty.call(fields, key)) fallback[key] = fields[key];
      if (Object.keys(fallback).length && Object.keys(fallback).length !== Object.keys(fields).length) variants.push(fallback);
    }

    const attempt = await tryPatchVariants(env, body.id, variants);
    if (attempt.ok) {
      const warning = Object.keys(attempt.savedFields).length !== Object.keys(fields).length
        ? "Часть дополнительных полей не сохранена. Добавьте недостающие колонки в NocoDB, если они нужны в истории."
        : "";
      return json({ ok: true, nocodbResponse: attempt.result.response, savedFields: attempt.savedFields, warning, attempts: attempt.attempts });
    }

    return json({
      ok: false,
      error: "NocoDB update error",
      hint: "Не удалось обновить запись даже минимальным набором полей. Проверьте, что в таблице есть колонка Статус и в single select добавлены варианты: Отменена, Удалена или Отказ. Также проверьте права API-токена на обновление записей.",
      attempts: attempt.attempts,
      lastError: attempt.attempts.length ? shortNocodbError(attempt.attempts[attempt.attempts.length - 1]) : ""
    }, 500);
  } catch (error) {
    return json({ ok: false, error: error.message }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== "POST") return json({ ok: false, error: "Only POST" }, 405);
  return onRequestPost(context);
}
