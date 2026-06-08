
const DEFAULT_NOCODB_ENDPOINT = "https://app.nocodb.com/api/v3/data/ptvxn8nmuwc08y3/mgp2zjsuv4id5tp/records";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function parseJson(text) {
  try { return JSON.parse(text); } catch(e) { return text; }
}

function checkAdminPassword(request, env) {
  const required = env.ADMIN_PASSWORD;
  if (!required) {
    return { ok:false, status:500, body:{ ok:false, error:"ADMIN_PASSWORD is not set in Cloudflare environment variables" } };
  }
  const provided = (request.headers.get("x-admin-password") || "").trim();
  if (provided !== required) {
    return { ok:false, status:401, body:{ ok:false, error:"Неверный пароль администратора" } };
  }
  return { ok:true };
}

function normalizeRecord(rec) {
  const fields = rec.fields || rec;
  const id = rec.id || (rec.id_fields && (rec.id_fields.Id || rec.id_fields.id)) || fields.Id || fields.id || "";
  return { id:String(id), id_fields: rec.id_fields || { Id: Number(id) || id }, fields };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const auth = checkAdminPassword(request, env);
  if (!auth.ok) return json(auth.body, auth.status);

  const token = env.NOCODB_TOKEN;
  if (!token) return json({ ok:false, error:"NOCODB_TOKEN is missing" }, 500);

  let body;
  try { body = await request.json(); } catch(error) { return json({ ok:false, error:"Invalid JSON" }, 400); }

  const id = body.id;
  if (!id) return json({ ok:false, error:"Record id is required" }, 400);

  const allowed = ["Статус","Итоговый м2","Ответственный","Комментарий администратора","Создан объект","Монтажник 1","Монтажник 2","Монтажник 3","Монтажник 4"];
  const fields = {};
  for (const key of allowed) {
    if (body.fields && Object.prototype.hasOwnProperty.call(body.fields, key)) fields[key] = body.fields[key];
  }

  const payload = [{ id_fields: { Id: Number(id) || id }, fields }];

  try {
    const res = await fetch(env.NOCODB_ENDPOINT || DEFAULT_NOCODB_ENDPOINT, {
      method: "PATCH",
      headers: { "Content-Type":"application/json", "xc-token": token },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    const data = parseJson(text);

    if (!res.ok) return json({ ok:false, error:"NocoDB update error", status:res.status, nocodbResponse:data, sentPayload:payload }, 500);

    return json({ ok:true, updated:true, nocodbResponse:data });
  } catch(error) {
    return json({ ok:false, error:error.message }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== "POST") return json({ ok:false, error:"Only POST is allowed" }, 405);
  return onRequestPost(context);
}
