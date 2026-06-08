# СОЛНЦАНЕТ CRM — версия для Cloudflare Pages

## Структура

В корне проекта должны лежать:

- `index.html`
- `zapis.html`
- `admin.html`
- `assets/`
- `functions/`
- `README.md`

## Как залить

1. Создай новый GitHub-репозиторий, например `solncanet-crm-cloudflare`.
2. Распакуй архив.
3. Загрузи **содержимое** распакованной папки в GitHub.
4. В Cloudflare открой `Workers & Pages`.
5. Нажми `Create application` → `Pages` → `Connect to Git`.
6. Выбери репозиторий.
7. Настройки:
   - Framework preset: `None`
   - Build command: пусто
   - Build output directory: `/` или `.`
8. Deploy.

## Переменные Cloudflare Pages

В проекте Cloudflare Pages добавь переменные:

- `NOCODB_TOKEN` — токен NocoDB.
- `ADMIN_PASSWORD` — пароль для входа в админку.
- `NOCODB_ENDPOINT` — необязательно, endpoint уже прописан в функциях.

Если добавляешь переменные после первого deploy — сделай новый deploy.

## Адреса после публикации

Допустим Cloudflare дал адрес:

`https://solncanet-crm-cloudflare.pages.dev`

Тогда:

- Главная: `/`
- Онлайн-запись: `/zapis.html`
- Админка: `/admin.html`
- Проверка функций: `/test`
- Проверка NocoDB: `/nocodb-test`
- Проверка Cal webhook: `/cal-nocodb-v5`
- Список заявок: `/list-zayavki`

## Webhook Cal.com

В Cal.com замени URL webhook на:

`https://ВАШ-ПРОЕКТ.pages.dev/cal-nocodb-v5`

Триггер:
`Бронирование создано`

Секретный ключ:
пусто

Custom Payload Template:
выключен

## Поля таблицы Заявки

Обязательные:
- Имя клиента
- Телефон
- Услуга
- Дата записи
- Время записи
- Адрес
- м2
- Комментарий
- Статус
- Cal Booking ID

Желательные для редактирования в админке:
- Итоговый м2
- Ответственный
- Комментарий администратора
- Создан объект

Endpoint заявок:
https://app.nocodb.com/api/v3/data/ptvxn8nmuwc08y3/mgp2zjsuv4id5tp/records
