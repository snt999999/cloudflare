import { authHeaders, errorJson, handleOptions, json, ncFetch, readJson, recordsEndpoint, safeTrashPayload, withIdempotency } from "./_nocodb.js";

const MAX_BATCH = 30;

export async function onRequest(context) {
  const options = handleOptions(context.request);
  if (options) return options;
  if (context.request.method !== "POST") return json({ ok: false, error: "Метод не поддерживается" }, 405);

  try {
    const body = await readJson(context.request);
    const operations = Array.isArray(body.operations) ? body.operations : [];
    if (!operations.length) return json({ ok: false, error: "Нет операций" }, 400);
    if (operations.length > MAX_BATCH) return json({ ok: false, error: `Слишком много операций. Максимум ${MAX_BATCH}` }, 400);

    const endpoint = recordsEndpoint(context.env);
    const results = [];

    for (const [index, op] of operations.entries()) {
      const type = String(op.type || op.action || "").toLowerCase();
      try {
        let result;
        if (type === "create") {
          const data = withIdempotency(op.data || op.record || {}, context.request);
          result = await ncFetch(context, endpoint, {
            method: "POST",
            headers: authHeaders(context.env),
            body: JSON.stringify(data)
          });
        } else if (type === "update") {
          if (!op.id) throw new Error("В операции update не передан id");
          result = await ncFetch(context, `${endpoint}/${encodeURIComponent(op.id)}`, {
            method: "PATCH",
            headers: authHeaders(context.env),
            body: JSON.stringify(op.data || op.record || {})
          });
        } else if (type === "trash" || type === "delete") {
          if (!op.id) throw new Error("В операции delete/trash не передан id");
          result = await ncFetch(context, `${endpoint}/${encodeURIComponent(op.id)}`, {
            method: "PATCH",
            headers: authHeaders(context.env),
            body: JSON.stringify(safeTrashPayload(op.reason))
          });
        } else {
          throw new Error(`Неизвестная операция: ${type}`);
        }

        results.push({ ok: true, index, type, record: result.data, attempts: result.attempts });
      } catch (error) {
        results.push({ ok: false, index, type, error: error.message, details: error.details || null });
      }

      await new Promise((resolve) => setTimeout(resolve, 180));
    }

    return json({ ok: results.every((r) => r.ok), results });
  } catch (error) {
    return errorJson(error);
  }
}
