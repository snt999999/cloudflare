import { authHeaders, buildQueryUrl, errorJson, handleOptions, json, ncFetch, recordsEndpoint } from "./_nocodb.js";

export async function onRequest(context) {
  const options = handleOptions(context.request);
  if (options) return options;
  if (context.request.method !== "GET") return json({ ok: false, error: "Метод не поддерживается" }, 405);

  try {
    const endpoint = recordsEndpoint(context.env);
    const input = new URL(context.request.url).searchParams;
    const params = new URLSearchParams();

    params.set("limit", input.get("limit") || "1000");
    if (input.get("offset")) params.set("offset", input.get("offset"));
    if (input.get("where")) params.set("where", input.get("where"));
    if (input.get("sort")) params.set("sort", input.get("sort"));
    if (input.get("fields")) params.set("fields", input.get("fields"));
    if (input.get("viewId")) params.set("viewId", input.get("viewId"));

    const result = await ncFetch(context, buildQueryUrl(endpoint, params), {
      method: "GET",
      headers: authHeaders(context.env)
    });

    return json({ ok: true, ...result.data, meta: { attempts: result.attempts, durationMs: result.durationMs } });
  } catch (error) {
    return errorJson(error);
  }
}
