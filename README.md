# СОЛНЦАНЕТ CRM — финальная тестовая версия для показа

## Что добавлено

- Ровное оформление главной страницы.
- Улучшенная страница онлайн-записи.
- Обновленная админ-панель.
- Проверка пароля без перехода в заявки при неверном пароле.
- Быстрые статусы в карточке заявки.
- Фильтры по статусу, дате, поиску.
- Быстрые вкладки: все / новые / сегодня / в работе / оплачено.
- Редактирование:
  - статус;
  - итоговый м2;
  - ответственный;
  - монтажники;
  - комментарий администратора;
  - создан объект.
- Экспорт текущей выборки в CSV для Excel.
- Исправлен PATCH для NocoDB v3: используется `id`, а не `id_fields`.
- Webhook Cal.com записывает комментарий в поле `Комментарий клиента`.

## Структура

- index.html
- zapis.html
- admin.html
- assets/site.css
- assets/admin.css
- assets/admin.js
- functions/test.js
- functions/nocodb-test.js
- functions/cal-nocodb-v5.js
- functions/list-zayavki.js
- functions/update-zayavka.js

## Переменные Cloudflare Pages

Нужны переменные:

- NOCODB_TOKEN
- ADMIN_PASSWORD

Необязательно:

- NOCODB_ENDPOINT

## Проверка после deploy

1. /test
2. /nocodb-test
3. /cal-nocodb-v5
4. /admin.html

## Webhook Cal.com

URL:
https://ВАШ-ПРОЕКТ.pages.dev/cal-nocodb-v5

Триггер:
Бронирование создано

Секретный ключ:
пусто

Custom Payload Template:
выключен

## Поля NocoDB

Эта версия рассчитана на текущие поля:

- Имя клиента
- Телефон
- Услуга
- Дата записи
- Время записи
- Адрес
- м2
- Комментарий клиента
- Комментарий администратора
- Статус
- Cal Booking ID
- Монтажники
- Итоговый м2
- Создан объект
- Ответственный

Endpoint:
https://app.nocodb.com/api/v3/data/ptvxn8nmuwc08y3/mgp2zjsuv4id5tp/records
