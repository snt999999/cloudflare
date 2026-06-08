
const DEFAULT_NOCODB_ENDPOINT = "https://app.nocodb.com/api/v3/data/ptvxn8nmuwc08y3/mgp2zjsuv4id5tp/records";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
function parseJson(text) { try { return JSON.parse(text); } catch(e) { return text; } }

export async function onRequest(context) {
  const { env } = context;
  const token = env.NOCODB_TOKEN;
  if (!token) return json({ ok:false, error:"NOCODB_TOKEN отсутствует" }, 500);

  const testRecord = {
    "Имя клиента": "ТЕСТ CLOUDFLARE",
    "Телефон": "+79999999999",
    "Услуга": "Проверка связи Cloudflare → NocoDB",
    "Дата записи": "2026-06-05",
    "Время записи": "12:00",
    "Адрес": "Тестовый адрес",
    "м2": "10",
    "Комментарий клиента": "Если эта строка появилась, связь с NocoDB работает",
    "Статус": "Новая заявка",
    "Cal Booking ID": "manual-cf-test-" + Date.now()
  };

  try {
    const response = await fetch(env.NOCODB_ENDPOINT || DEFAULT_NOCODB_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type":"application/json", "xc-token": token },
      body: JSON.stringify([{ fields: testRecord }])
    });
    const text = await response.text();
    return json({ ok: response.ok, status: response.status, sentRecord: testRecord, nocodbResponse: parseJson(text) }, response.ok ? 200 : 500);
  } catch (error) {
    return json({ ok:false, error:error.message, sentRecord:testRecord }, 500);
  }
}
