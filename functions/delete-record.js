import { authHeaders, errorJson, handleOptions, json, ncFetch, readJson, recordsEndpoint, safeTrashPayload } from "./_nocodb.js";

export async function onRequest(context) {
  const options = handleOptions(context.request);
  if (options) return options;
  if (!["POST", "PATCH", "DELETE"].includes(context.request.method)) return json({ ok: false, error: "Метод не поддерживается" }, 405);

  try {
    const body = await readJson(context.request).catch(() => ({}));
    const id = body.id || body.Id || body.recordId || new URL(context.request.url).searchParams.get("id");
    const reason = body.reason || body["Причина удаления"] || "Удалено из админки";
    if (!id) return json({ ok: false, error: "Не передан id записи" }, 400);

    const result = await ncFetch(context, `${recordsEndpoint(context.env)}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authHeaders(context.env),
      body: JSON.stringify(safeTrashPayload(reason))
    });

    return json({ ok: true, trashed: true, record: result.data, meta: { attempts: result.attempts, durationMs: result.durationMs } });
  } catch (error) {
    return errorJson(error);
  }
}
