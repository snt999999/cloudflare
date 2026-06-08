const LS_PASSWORD_KEY = "solncanet_admin_password_final_v1";
const $ = (id) => document.getElementById(id);
let records = [];
let currentRecord = null;
let activeTab = "all";

const els = {
  loginPanel: $("loginPanel"), appPanel: $("appPanel"), loginForm: $("loginForm"), passwordInput: $("passwordInput"),
  loginMessage: $("loginMessage"), loginBtn: $("loginBtn"), logoutBtn: $("logoutBtn"), refreshBtn: $("refreshBtn"),
  exportBtn: $("exportBtn"), requestsBody: $("requestsBody"), statusFilter: $("statusFilter"), searchInput: $("searchInput"),
  dateFrom: $("dateFrom"), dateTo: $("dateTo"), message: $("message"), statTotal: $("statTotal"), statNew: $("statNew"),
  statToday: $("statToday"), statWork: $("statWork"), statPaid: $("statPaid"), dialog: $("requestDialog"),
  dialogTitle: $("dialogTitle"), dClient: $("dClient"), dPhone: $("dPhone"), dDate: $("dDate"), dTime: $("dTime"),
  dService: $("dService"), dAddress: $("dAddress"), dComment: $("dComment"), editStatus: $("editStatus"), editM2: $("editM2"),
  editResponsible: $("editResponsible"), editObjectCreated: $("editObjectCreated"), editInstallers: $("editInstallers"),
  editAdminComment: $("editAdminComment"), saveRequestBtn: $("saveRequestBtn")
};

init();

function init() {
  const saved = localStorage.getItem(LS_PASSWORD_KEY);
  if (saved) validateAndEnter(saved, true);

  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwd = els.passwordInput.value.trim();
    if (!pwd) return;
    await validateAndEnter(pwd, false);
  });

  els.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_PASSWORD_KEY);
    records = [];
    els.requestsBody.innerHTML = "";
    showLogin();
  });

  els.refreshBtn.addEventListener("click", loadRequests);
  els.exportBtn.addEventListener("click", exportCsv);

  [els.statusFilter, els.searchInput, els.dateFrom, els.dateTo].forEach(el => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });

  document.querySelectorAll("[data-status-set]").forEach(btn => {
    btn.addEventListener("click", () => {
      els.editStatus.value = btn.dataset.statusSet;
    });
  });

  els.saveRequestBtn.addEventListener("click", saveCurrentRequest);
}

async function validateAndEnter(pwd, silent) {
  hideLoginError();
  els.loginBtn.disabled = true;
  els.loginBtn.textContent = "Проверяю...";

  try {
    const res = await fetch("/list-zayavki", { headers: { "x-admin-password": pwd } });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      localStorage.removeItem(LS_PASSWORD_KEY);
      showLogin();
      showLoginError(data.error || "Неверный пароль администратора");
      return;
    }

    localStorage.setItem(LS_PASSWORD_KEY, pwd);
    records = data.records || [];
    showApp();
    render();
    showMessage("Вход выполнен. Заявки загружены.", "ok");
    setTimeout(hideMessage, 1600);
  } catch (err) {
    localStorage.removeItem(LS_PASSWORD_KEY);
    showLogin();
    showLoginError("Не удалось проверить пароль: " + err.message);
  } finally {
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = "Войти";
  }
}

function showApp() {
  els.loginPanel.style.display = "none";
  els.appPanel.style.display = "block";
  els.logoutBtn.style.display = "inline-flex";
}

function showLogin() {
  els.appPanel.style.display = "none";
  els.logoutBtn.style.display = "none";
  els.loginPanel.style.display = "block";
}

function showLoginError(text) {
  els.loginMessage.style.display = "block";
  els.loginMessage.textContent = text;
}

function hideLoginError() {
  els.loginMessage.style.display = "none";
  els.loginMessage.textContent = "";
}

function password() { return localStorage.getItem(LS_PASSWORD_KEY) || ""; }

async function loadRequests() {
  showMessage("Загружаю заявки...", "ok");

  try {
    const res = await fetch("/list-zayavki", { headers: { "x-admin-password": password() } });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      if (res.status === 401) {
        localStorage.removeItem(LS_PASSWORD_KEY);
        showLogin();
        return showLoginError(data.error || "Неверный пароль администратора");
      }
      throw new Error(detailedError(data, "Не удалось загрузить заявки"));
    }

    records = data.records || [];
    render();
    showMessage("Заявки обновлены", "ok");
    setTimeout(hideMessage, 1500);
  } catch (err) {
    showMessage(err.message, "error");
  }
}

function render() {
  const filtered = filterRecords(records);
  els.requestsBody.innerHTML = filtered.map(rowHtml).join("") || `<tr><td colspan="9">Заявок по текущим фильтрам нет.</td></tr>`;
  updateStats(records);
  document.querySelectorAll("[data-open-id]").forEach(btn => btn.addEventListener("click", () => openDialog(btn.dataset.openId)));
}

function filterRecords(items) {
  const status = els.statusFilter.value;
  const search = els.searchInput.value.trim().toLowerCase();
  const from = els.dateFrom.value;
  const to = els.dateTo.value;
  const today = todayYmd();
  const tomorrow = offsetYmd(1);

  return items.filter(r => {
    const f = r.fields || {};
    const date = String(f["Дата записи"] || "");

    if (activeTab === "new" && String(f["Статус"] || "") !== "Новая заявка") return false;
    if (activeTab === "today" && date !== today) return false;
    if (activeTab === "tomorrow" && date !== tomorrow) return false;
    if (activeTab === "work" && String(f["Статус"] || "") !== "В работе") return false;
    if (activeTab === "paid" && String(f["Статус"] || "") !== "Оплачено") return false;

    if (status && String(f["Статус"] || "") !== status) return false;
    if (from && date && date < from) return false;
    if (to && date && date > to) return false;

    if (search) {
      const haystack = [
        f["Имя клиента"], f["Телефон"], f["Услуга"], f["Адрес"], f["Комментарий клиента"], f["Комментарий"],
        f["Комментарий администратора"], f["Статус"], f["Монтажники"], f["Ответственный"]
      ].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  }).sort((a, b) => {
    const af = a.fields || {};
    const bf = b.fields || {};
    const ad = String(af["Дата записи"] || "") + " " + String(af["Время записи"] || "");
    const bd = String(bf["Дата записи"] || "") + " " + String(bf["Время записи"] || "");
    return bd.localeCompare(ad);
  });
}

function rowHtml(r) {
  const f = r.fields || {};
  return `<tr>
    <td>${esc(f["Дата записи"] || "—")}</td>
    <td>${esc(f["Время записи"] || "—")}</td>
    <td><b>${esc(f["Имя клиента"] || "—")}</b></td>
    <td>${phoneLink(f["Телефон"])}</td>
    <td>${esc(f["Услуга"] || "—")}</td>
    <td>${esc(shorten(f["Адрес"], 72) || "—")}</td>
    <td>${esc(f["Итоговый м2"] || f["м2"] || "—")}</td>
    <td><span class="status" data-status="${attr(f["Статус"] || "")}">${esc(f["Статус"] || "—")}</span></td>
    <td><button class="mini-btn" data-open-id="${attr(r.id)}">Открыть</button></td>
  </tr>`;
}

function updateStats(items) {
  const today = todayYmd();
  els.statTotal.textContent = items.length;
  els.statNew.textContent = items.filter(r => (r.fields || {})["Статус"] === "Новая заявка").length;
  els.statToday.textContent = items.filter(r => String((r.fields || {})["Дата записи"] || "") === today).length;
  els.statWork.textContent = items.filter(r => (r.fields || {})["Статус"] === "В работе").length;
  els.statPaid.textContent = items.filter(r => (r.fields || {})["Статус"] === "Оплачено").length;
}

function openDialog(id) {
  currentRecord = records.find(r => String(r.id) === String(id));
  if (!currentRecord) return;

  const f = currentRecord.fields || {};
  els.dialogTitle.textContent = `Заявка #${currentRecord.id}`;
  els.dClient.textContent = f["Имя клиента"] || "—";
  els.dPhone.textContent = f["Телефон"] || "—";
  els.dDate.textContent = f["Дата записи"] || "—";
  els.dTime.textContent = f["Время записи"] || "—";
  els.dService.textContent = f["Услуга"] || "—";
  els.dAddress.textContent = f["Адрес"] || "—";
  els.dComment.textContent = f["Комментарий клиента"] || f["Комментарий"] || "—";

  els.editStatus.value = f["Статус"] || "Новая заявка";
  els.editM2.value = f["Итоговый м2"] || f["м2"] || "";
  els.editResponsible.value = f["Ответственный"] || "";
  els.editObjectCreated.value = truthy(f["Создан объект"]) ? "true" : "false";
  els.editInstallers.value = f["Монтажники"] || "";
  els.editAdminComment.value = f["Комментарий администратора"] || "";

  els.dialog.showModal();
}

async function saveCurrentRequest() {
  if (!currentRecord) return;

  const fields = {
    "Статус": els.editStatus.value,
    "Ответственный": els.editResponsible.value.trim(),
    "Комментарий администратора": els.editAdminComment.value.trim(),
    "Монтажники": els.editInstallers.value.trim(),
    "Создан объект": els.editObjectCreated.value === "true"
  };

  const m2 = numOrNull(els.editM2.value);
  if (m2 !== null) fields["Итоговый м2"] = m2;

  els.saveRequestBtn.disabled = true;
  els.saveRequestBtn.textContent = "Сохраняю...";

  try {
    const res = await fetch("/update-zayavka", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password() },
      body: JSON.stringify({ id: currentRecord.id, fields })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(detailedError(data, "Не удалось сохранить заявку"));

    els.dialog.close();
    await loadRequests();
  } catch (err) {
    showMessage(err.message, "error");
  } finally {
    els.saveRequestBtn.disabled = false;
    els.saveRequestBtn.textContent = "Сохранить";
  }
}

function exportCsv() {
  const rows = filterRecords(records);
  const headers = [
    "Дата записи","Время записи","Имя клиента","Телефон","Услуга","Адрес","м2","Итоговый м2",
    "Статус","Монтажники","Ответственный","Создан объект","Комментарий клиента","Комментарий администратора","Cal Booking ID"
  ];

  const csv = [
    headers.join(";"),
    ...rows.map(r => {
      const f = r.fields || {};
      return headers.map(h => csvCell(f[h] ?? "")).join(";");
    })
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `solncanet_zayavki_${todayYmd()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function detailedError(data, fallback) {
  if (!data) return fallback;
  if (data.nocodbResponse) return `${data.error || fallback}: ${JSON.stringify(data.nocodbResponse)}`;
  return data.error || fallback;
}

function showMessage(text, type) { els.message.style.display = "block"; els.message.className = `message message--${type}`; els.message.textContent = text; }
function hideMessage() { els.message.style.display = "none"; }

function esc(v){ return String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c])); }
function attr(v){ return esc(v).replace(/`/g,"&#096;"); }
function shorten(v,max){ const s=String(v||""); return s.length>max ? s.slice(0,max-1)+"…" : s; }
function phoneLink(v){ const p=String(v||"").trim(); return p ? `<a href="tel:${attr(p)}">${esc(p)}</a>` : "—"; }
function numOrNull(v){ if(v==="" || v===null || v===undefined) return null; const n=Number(String(v).replace(",",".")); return Number.isFinite(n) ? n : null; }
function truthy(v){ return v === true || v === "true" || v === 1 || v === "1" || v === "Да"; }
function csvCell(v){ const s = String(v ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""'); return `"${s}"`; }
function todayYmd(){ return new Date().toISOString().slice(0,10); }
function offsetYmd(days){ const d = new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
