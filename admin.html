<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Админ-панель — СОЛНЦАНЕТ CRM</title>
  <link rel="stylesheet" href="assets/admin.css" />
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <span class="brand__logo">С</span>
      <div><b>СОЛНЦАНЕТ CRM</b><small>админ-панель заявок</small></div>
    </div>
    <div class="topbar__actions">
      <a href="zapis.html" target="_blank">Онлайн-запись</a>
      <button id="logoutBtn" class="btn btn--ghost" style="display:none;">Выйти</button>
    </div>
  </header>

  <main class="layout">
    <section id="loginPanel" class="login-card">
      <h1>Вход в админ-панель</h1>
      <p>Введите пароль администратора. Токен NocoDB в браузере не хранится.</p>
      <form id="loginForm">
        <label>Пароль администратора
          <input id="passwordInput" type="password" placeholder="Введите пароль" required />
        </label>
        <button class="btn" type="submit">Войти</button>
      </form>
      <div id="loginMessage" class="message message--error" style="display:none;"></div>
      <p class="hint">В Cloudflare Pages нужно добавить переменную <b>ADMIN_PASSWORD</b>.</p>
    </section>

    <section id="appPanel" class="app" style="display:none;">
      <div class="page-head">
        <div>
          <h1>Заявки</h1>
          <p>Заявки из NocoDB. Фильтры, карточка заявки и смена статуса.</p>
        </div>
        <button id="refreshBtn" class="btn">Обновить</button>
      </div>

      <section class="stats">
        <div><small>Всего</small><b id="statTotal">0</b></div>
        <div><small>Новые</small><b id="statNew">0</b></div>
        <div><small>В работе</small><b id="statWork">0</b></div>
        <div><small>Оплачено</small><b id="statPaid">0</b></div>
      </section>

      <section class="filters">
        <label>Статус
          <select id="statusFilter">
            <option value="">Все статусы</option>
            <option>Новая заявка</option>
            <option>Связались</option>
            <option>Замер</option>
            <option>Согласовано</option>
            <option>В работе</option>
            <option>Выполнено</option>
            <option>Оплачено</option>
            <option>Отказ</option>
          </select>
        </label>
        <label>Поиск<input id="searchInput" placeholder="Клиент, телефон, адрес, услуга" /></label>
        <label>С даты<input id="dateFrom" type="date" /></label>
        <label>По дату<input id="dateTo" type="date" /></label>
      </section>

      <div id="message" class="message" style="display:none;"></div>

      <section class="table-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Дата</th><th>Время</th><th>Клиент</th><th>Телефон</th><th>Услуга</th><th>Адрес</th><th>м²</th><th>Статус</th><th></th>
              </tr>
            </thead>
            <tbody id="requestsBody"></tbody>
          </table>
        </div>
      </section>
    </section>
  </main>

  <dialog id="requestDialog" class="dialog">
    <form method="dialog" class="dialog__content">
      <div class="dialog__head">
        <h2 id="dialogTitle">Заявка</h2>
        <button class="icon-btn" value="cancel" aria-label="Закрыть">×</button>
      </div>

      <div class="dialog-grid">
        <div><small>Клиент</small><b id="dClient">—</b></div>
        <div><small>Телефон</small><b id="dPhone">—</b></div>
        <div><small>Дата</small><b id="dDate">—</b></div>
        <div><small>Время</small><b id="dTime">—</b></div>
        <div class="wide"><small>Услуга</small><b id="dService">—</b></div>
        <div class="wide"><small>Адрес</small><b id="dAddress">—</b></div>
        <div class="wide"><small>Комментарий клиента</small><p id="dComment">—</p></div>
      </div>

      <div class="edit-grid">
        <label>Статус
          <select id="editStatus">
            <option>Новая заявка</option><option>Связались</option><option>Замер</option><option>Согласовано</option>
            <option>В работе</option><option>Выполнено</option><option>Оплачено</option><option>Отказ</option>
          </select>
        </label>
        <label>Итоговый м²<input id="editM2" type="number" step="0.01" placeholder="Например, 42" /></label>
        <label>Ответственный<input id="editResponsible" placeholder="Например, Сергей" /></label>
        <label class="wide">Комментарий администратора<textarea id="editAdminComment" placeholder="Внутренние заметки"></textarea></label>
      </div>

      <div class="dialog__actions">
        <button id="saveRequestBtn" class="btn" type="button">Сохранить</button>
        <button class="btn btn--ghost" value="cancel">Закрыть</button>
      </div>
    </form>
  </dialog>

  <script src="assets/admin.js"></script>
</body>
</html>
