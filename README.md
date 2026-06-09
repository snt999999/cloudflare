# СОЛНЦАНЕТ — сайт записи + админ-панель

## Что внутри
- index.html — главная страница с услугами и формой
- zapis.html — отдельная страница онлайн-записи Cal.com
- admin.html — админ-панель
- assets/ — стили, скрипты, логотип, изображения
- functions/ — Cloudflare Pages Functions для NocoDB и Cal.com webhook

## Как загрузить
1. Распаковать архив.
2. В GitHub загрузить содержимое папки в корень репозитория.
3. Должны быть в корне:
   - index.html
   - zapis.html
   - admin.html
   - assets
   - functions
4. Дождаться Deploy в Cloudflare Pages.
5. Проверить:
   /test
   /nocodb-test
   /admin.html

## Переменные Cloudflare
Нужны:
- NOCODB_TOKEN
- ADMIN_PASSWORD

Необязательно:
- NOCODB_ENDPOINT

## Webhook Cal.com
URL:
https://ВАШ-ДОМЕН/cal-nocodb-v5

Триггер:
Бронирование создано
