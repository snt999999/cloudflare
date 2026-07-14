Установка СОЛНЦАНЕТ CRM v69

1. Полностью очистите старые файлы в GitHub или создайте новый пустой репозиторий.
2. Загрузите содержимое папки SOLNCANET_CRM_V69_SMS_QUEUE_DESIGN_RESTORE в корень репозитория.
   В корне должны лежать index.html, zapis.html, admin.html, assets, functions, docs, .github, service-worker.js, manifest.webmanifest.
3. Не загружайте саму папку как вложенную.
4. В Cloudflare Pages проверьте переменные окружения NocoDB и SMS.
5. После публикации откройте /admin.html и нажмите Проверка -> Очистить кеш браузера.

В v69 возвращено оформление из v67, но сохранена SMS-очередь v68.
