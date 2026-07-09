Установка СОЛНЦАНЕТ CRM v63

Что исправлено в v63 по карточке заявки:
1. Если выбрано направление "Авто", поле "Итоговый м²" полностью скрывается и очищается.
2. Если выбрано направление "Авто", поле "Адрес" скрывается и очищается.
3. В верхнем блоке "Авто" скрывается общий материал/плёнка справа.
4. Поле "Материал" в строках "Услуги и стоимость" НЕ удаляется — материал указывается отдельно к каждой услуге.

Установка:
1. Сделать резервную копию текущего сайта.
2. Загрузить папку functions в корень проекта Cloudflare Pages.
3. Загрузить файлы из assets в assets проекта:
   - assets/admin-v63-dialog-safe.js
   - assets/admin-v63-nocodb-safe.js
   - assets/admin-v63-auto-report.js
   - assets/admin-v63-auto-fields-clean.js
4. В admin.html подключить эти файлы после основного assets/admin.js:

<script src="assets/admin-v63-dialog-safe.js?v=63"></script>
<script src="assets/admin-v63-nocodb-safe.js?v=63"></script>
<script src="assets/admin-v63-auto-report.js?v=63"></script>
<script src="assets/admin-v63-auto-fields-clean.js?v=63"></script>

5. В service-worker.js заменить CACHE_NAME на:
const CACHE_NAME = 'solncanet-v63';

6. После деплоя открыть админку через Ctrl+F5 или инкогнито и проверить:
   - открыть заявку;
   - выбрать направление "Авто";
   - "Итоговый м²" должен исчезнуть;
   - "Адрес" должен исчезнуть;
   - общий материал/плёнка в верхней части блока "Авто" должен исчезнуть;
   - материал внутри строки услуги должен остаться.
