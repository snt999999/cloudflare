Установка СОЛНЦАНЕТ CRM v62

1. Сделать резервную копию текущего сайта перед заменой файлов.

2. В Cloudflare Pages → проект сайта → Settings → Environment variables добавить/проверить:

NOCODB_API_URL=https://ВАШ_NOCODB_ДОМЕН
NOCODB_API_TOKEN=ВАШ_NOCODB_TOKEN
NOCODB_TABLE_ID=ID_ТАБЛИЦЫ_ЗАЯВОК

Если у вас уже есть готовая API-ссылка прямо на records, можно вместо NOCODB_API_URL + NOCODB_TABLE_ID указать:
NOCODB_RECORDS_ENDPOINT=https://.../api/v2/tables/XXXX/records

Дополнительно желательно:
NOCODB_MAX_RETRIES=5
NOCODB_RETRY_BASE_MS=700

3. Загрузить папку functions в корень проекта Cloudflare Pages.
Должны появиться эндпоинты:
/list-records
/create-record
/update-record
/delete-record
/batch-records
/health

4. Загрузить файлы из assets в assets проекта:
assets/admin-v62-nocodb-safe.js
assets/admin-v62-dialog-safe.js
assets/admin-v62-auto-report.js

5. В admin.html подключить эти файлы ПОСЛЕ assets/admin.js:

<script src="assets/admin-v62-dialog-safe.js?v=62"></script>
<script src="assets/admin-v62-nocodb-safe.js?v=62"></script>
<script src="assets/admin-v62-auto-report.js?v=62"></script>

Готовый фрагмент лежит в docs/ADMIN_HTML_INSERT_V62.txt.

6. В service-worker.js заменить CACHE_NAME на:
const CACHE_NAME = 'solncanet-v62';

И убедиться, что API-пути не кешируются:
/list-
/create-
/update-
/delete-
/batch-
/upload-
/send-
/calendar-
/sms-
/google-drive-
/health

7. В admin.js заменить прямые fetch к NocoDB на вызовы SOLNCANET_V62.nocodb:
- загрузка: await SOLNCANET_V62.nocodb.list()
- создание: await SOLNCANET_V62.nocodb.create(data)
- обновление: await SOLNCANET_V62.nocodb.update(id, data)
- удаление: await SOLNCANET_V62.nocodb.trash(id, reason)
- пакетные действия: await SOLNCANET_V62.nocodb.batch(operations)

Точки замены описаны в docs/ADMIN_JS_PATCH_POINTS_V62.txt.

8. После деплоя:
- открыть сайт в режиме инкогнито;
- в админке нажать обновить;
- создать тестовую заявку;
- открыть, изменить дату/статус/сумму, сохранить;
- проверить, что в NocoDB данные реально поменялись;
- удалить тестовую заявку и проверить, что она получила статус «Удалена», а не исчезла физически;
- скачать авто-отчет v62.

9. Если после деплоя старая версия все равно открывается:
- в браузере открыть DevTools → Application → Service Workers → Unregister;
- очистить Cache Storage;
- обновить страницу Ctrl+F5;
- на телефоне удалить PWA-иконку и добавить заново.
