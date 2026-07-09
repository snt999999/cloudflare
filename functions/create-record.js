import { authHeaders, errorJson, findByIdempotencyKey, handleOptions, json, ncFetch, recordsEndpoint, readJson, withIdempotency } from "./_nocodb.js";

export async function onRequest(context) {
  const options = handleOptions(context.request);
  if (options) return options;
  if (context.request.method !== "POST") return json({ ok: false, error: "Метод не поддерживается" }, 405);

  try {
    const body = await readJson(context.request);
    const data = withIdempotency(body.data || body.record || body, context.request);
    const key = data.IdempotencyKey;

    const existing = await findByIdempotencyKey(context, key);
    if (existing) return json({ ok: true, duplicatePrevented: true, record: existing });

    const result = await ncFetch(context, recordsEndpoint(context.env), {
      method: "POST",
      headers: authHeaders(context.env, key ? { "idempotency-key": key } : {}),
      body: JSON.stringify(data)
    });

    return json({ ok: true, record: result.data, meta: { attempts: result.attempts, durationMs: result.durationMs } });
  } catch (error) {
    return errorJson(error);
  }
}
