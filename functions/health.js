import { handleOptions, json } from "./_nocodb.js";

export async function onRequest(context) {
  const options = handleOptions(context.request);
  if (options) return options;
  return json({
    ok: true,
    version: "v63",
    service: "solncanet-crm-cloudflare-functions",
    time: new Date().toISOString(),
    hasNocodbEndpoint: Boolean(context.env.NOCODB_RECORDS_ENDPOINT || (context.env.NOCODB_API_URL && (context.env.NOCODB_TABLE_ID || context.env.NOCODB_REQUESTS_TABLE_ID))),
    hasToken: Boolean(context.env.NOCODB_API_TOKEN || context.env.NOCODB_TOKEN || context.env.XC_TOKEN)
  });
}
