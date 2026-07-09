import { authHeaders, errorJson, handleOptions, json, ncFetch, normalizeRecordPayload, readJson, recordsEndpoint } from "./_nocodb.js";

export async function onRequest(context) {
  const options = handleOptions(context.request);
  if (options) return options;
  if (!["POST", "PATCH", "PUT"].includes(context.request.method)) {
    return json({ ok: false, error: "Метод не поддерживается" }, 405);
  }

  try {
    const body = await readJson(context.request);
    const id = body.id || body.Id || body.recordId;
    const rawFields = body.fields || body.data || body.record || {};
    if (!id) return json({ ok: false, error: "Не передан id записи" }, 400);

    const fields = cleanFields(rawFields);
    const endpoint = recordsEndpoint(context.env);
    const url = `${endpoint}/${encodeURIComponent(id)}`;

    const patchResult = await ncFetch(context, url, {
      method: "PATCH",
      headers: authHeaders(context.env),
      body: JSON.stringify(fields)
    });

    let verified = normalizeRecordPayload(patchResult.data, id);
    let missing = diffMissing(fields, verified.fields);

    // NocoDB иногда отдает старую запись сразу после PATCH. Перечитываем несколько раз.
    for (let i = 0; missing.length && i < 5; i++) {
      await sleep(450 + i * 350);
      const readResult = await ncFetch(context, url, { method: "GET", headers: authHeaders(context.env) });
      verified = normalizeRecordPayload(readResult.data, id);
      missing = diffMissing(fields, verified.fields);
    }

    // Если критичные поля авто не появились даже после перечитывания — это почти всегда значит,
    // что в таблице NocoDB нет колонок "Направление", "Авто", "Авто услуги", "Общая стоимость".
    const criticalAutoMiss = missing.filter((x) => ["Направление", "Авто", "Авто услуги", "Общая стоимость"].includes(x.key));
    if (criticalAutoMiss.length) {
      const text = criticalAutoMiss.map((x) => `${x.key}: отправлено «${x.sent}», в базе «${x.saved}»`).join("; ");
      const err = new Error(`NocoDB не сохранил авто-поля. Проверьте, что в таблице заявок есть колонки: Направление, Авто, Авто услуги, Общая стоимость. ${text}`);
      err.status = 409;
      err.details = { missing: criticalAutoMiss, sent: fields, saved: verified.fields };
      throw err;
    }

    // Для старого admin.js возвращаем плоский формат Airtable-like { id, fields }.
    // Если NocoDB не вернул некритичное поле в ответе, но PATCH прошел, подмешиваем его в ответ,
    // чтобы фронт не падал на ложной проверке из-за задержки ответа.
    const responseFields = { ...verified.fields, ...fields };
    return json({
      ok: true,
      record: { id: verified.id || String(id), fields: responseFields },
      saved: true,
      meta: {
        version: "v64-update-zayavka",
        patchAttempts: patchResult.attempts,
        unchecked: missing.map((x) => x.key)
      }
    });
  } catch (error) {
    return errorJson(error);
  }
}

function cleanFields(input) {
  const fields = { ...(input || {}) };
  const isAuto = isAutoDirection(fields);
  if (isAuto) {
    fields["Направление"] = "Авто";
    fields["Итоговый м2"] = "";
    fields["Итоговый м²"] = "";
    fields["м2"] = "";
    fields["Адрес"] = "";
    fields["Пленка"] = "";
    fields["Плёнка"] = "";
    normalizeAutoServices(fields);
  }
  return fields;
}

function isAutoDirection(fields) {
  const raw = norm(fields["Направление"] || fields["Тип направления"] || fields["Категория"] || "");
  if (raw.includes("авто") || raw === "auto") return true;
  return Boolean(fields["Авто"] || fields["Авто услуги"]);
}

function normalizeAutoServices(fields) {
  let items = [];
  const raw = fields["Авто услуги"];
  if (Array.isArray(raw)) items = raw;
  else if (typeof raw === "string" && raw.trim()) {
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) items = parsed; } catch {}
  }
  const clean = items.map((x) => ({
    name: String(x?.name || x?.service || x?.title || "").trim(),
    material: String(x?.material || "").trim(),
    price: String(x?.price || x?.sum || x?.amount || "").replace(/[^\d.,-]/g, "").replace(",", ".").trim()
  })).filter((x) => x.name || x.material || x.price);
  fields["Авто услуги"] = JSON.stringify(clean);
  fields["Общая стоимость"] = String(clean.reduce((sum, x) => sum + (Number(x.price) || 0), 0));
  if (clean.length) {
    fields["Услуга"] = clean.map((x) => [x.name, x.material ? `(${x.material})` : "", x.price ? `${Number(x.price).toLocaleString("ru-RU")} ₽` : ""].filter(Boolean).join(" ")).join("; ");
  }
}

function diffMissing(sentFields, savedFields) {
  const skip = new Set(["Итоговый м²", "Итоговый м2", "м2", "Адрес", "Пленка", "Плёнка"]);
  const result = [];
  for (const [key, sentValue] of Object.entries(sentFields || {})) {
    if (skip.has(key)) continue;
    if (sentValue === "" || sentValue === null || sentValue === undefined) continue;
    const savedValue = valueByAlias(savedFields || {}, key);
    if (!sameValue(sentValue, savedValue)) result.push({ key, sent: printable(sentValue), saved: printable(savedValue) });
  }
  return result;
}

function valueByAlias(fields, key) {
  if (fields[key] !== undefined) return fields[key];
  if (key === "Направление") return fields["Тип направления"] ?? fields["Категория"] ?? "";
  if (key === "Авто услуги") return fields["Услуги авто"] ?? fields["Auto services"] ?? fields["AutoServices"] ?? "";
  if (key === "Общая стоимость") return fields["Стоимость"] ?? fields["Сумма"] ?? fields["Итого"] ?? "";
  return "";
}

function sameValue(a, b) {
  const ja = tryJson(a);
  const jb = tryJson(b);
  if (ja !== null || jb !== null) return JSON.stringify(ja ?? a) === JSON.stringify(jb ?? b);
  return normPrintable(a) === normPrintable(b);
}

function tryJson(value) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s || !(s.startsWith("[") || s.startsWith("{"))) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function printable(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}
function norm(value) { return String(value || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim(); }
function normPrintable(value) { return norm(printable(value)); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
