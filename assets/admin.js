const LS_PASSWORD_KEY = "solncanet_admin_password_cloudflare_v2";
const $ = (id) => document.getElementById(id);
let records = [];
let currentRecord = null;

const els = {
  loginPanel: $("loginPanel"), appPanel: $("appPanel"), loginForm: $("loginForm"), passwordInput: $("passwordInput"),
  loginMessage: $("loginMessage"), logoutBtn: $("logoutBtn"), refreshBtn: $("refreshBtn"), requestsBody: $("requestsBody"),
  statusFilter: $("statusFilter"), searchInput: $("searchInput"), dateFrom: $("dateFrom"), dateTo: $("dateTo"),
  message: $("message"), statTotal: $("statTotal"), statNew: $("statNew"), statWork: $("statWork"), statPaid: $("statPaid"),
  dialog: $("requestDialog"), dialogTitle: $("dialogTitle"), dClient: $("dClient"), dPhone: $("dPhone"), dDate: $("dDate"), dTime: $("dTime"),
  dService: $("dService"), dAddress: $("dAddress"), dComment: $("dComment"), editStatus: $("editStatus"), editM2: $("editM2"),
  editResponsible: $("editResponsible"), editAdminComment: $("editAdminComment"), saveRequestBtn: $("saveRequestBtn")
};

init();

function init() {
  if (localStorage.getItem(LS_PASSWORD_KEY)) { showApp(); loadRequests(); }

  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwd = els.passwordInput.value.trim();
    if (!pwd) return;
    localStorage.setItem(LS_PASSWORD_KEY, pwd);
    showApp();
    await loadRequests();
  });

  els.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_PASSWORD_KEY);
    records = [];
    els.requestsBody.innerHTML = "";
    els.loginPanel.style.display = "block";
    els.appPanel.style.display = "none";
    els.logoutBtn.style.display = "none";
  });

  els.refreshBtn.addEventListener("click", loadRequests);
  [els.statusFilter, els.searchInput, els.dateFrom, els.dateTo].forEach(el => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });
  els.saveRequestBtn.addEventListener("click", saveCurrentRequest);
}

function showApp() {
  els.loginMessage.style.display = "none";
  els.loginPanel.style.display = "none";
  els.appPanel.style.display = "block";
  els.logoutBtn.style.display = "inline-flex";
}

function showLoginError(text) {
  localStorage.removeItem(LS_PASSWORD_KEY);
  els.appPanel.style.display = "none";
  els.logoutBtn.style.display = "none";
  els.loginPanel.style.display = "block";
  els.loginMessage.style.display = "block";
  els.loginMessage.textContent = text;
}

function password() { return localStorage.getItem(LS_PASSWORD_KEY) || ""; }

async function loadRequests() {
  showMessage("Загружаю заявки...", "ok");
  try {
    const res = await fetch("/list-zayavki", { headers: { "x-admin-password": password() } });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      if (res.status === 401) return showLoginError(data.error || "Неверный пароль");
      throw new Error(detailedError(data, "Не удалось загрузить заявки"));
    }
    records = data.records || [];
    render();
    showMessage("Заявки загружены", "ok");
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
  const status = els.statusFilter.value, search = els.searchInput.value.trim().toLowerCase(), from = els.dateFrom.value, to = els.dateTo.value;
  return items.filter(r => {
    const f = r.fields || {};
    const date = String(f["Дата записи"] || "");
    if (status && String(f["Статус"] || "") !== status) return false;
    if (from && date && date < from) return false;
    if (to && date && date > to) return false;
    if (search) {
      const haystack = [f["Имя клиента"], f["Телефон"], f["Услуга"], f["Адрес"], f["Комментарий"], f["Комментарий клиента"], f["Статус"]].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  }).sort((a, b) => String((b.fields||{})["Дата записи"] || "").localeCompare(String((a.fields||{})["Дата записи"] || "")));
}

function rowHtml(r) {
  const f = r.fields || {};
  return `<tr>
    <td>${esc(f["Дата записи"] || "—")}</td><td>${esc(f["Время записи"] || "—")}</td>
    <td><b>${esc(f["Имя клиента"] || "—")}</b></td><td>${phoneLink(f["Телефон"])}</td>
    <td>${esc(f["Услуга"] || "—")}</td><td>${esc(shorten(f["Адрес"], 70) || "—")}</td>
    <td>${esc(f["Итоговый м2"] || f["м2"] || "—")}</td>
    <td><span class="status" data-status="${attr(f["Статус"] || "")}">${esc(f["Статус"] || "—")}</span></td>
    <td><button class="mini-btn" data-open-id="${attr(r.id)}">Открыть</button></td>
  </tr>`;
}

function updateStats(items) {
  els.statTotal.textContent = items.length;
  els.statNew.textContent = items.filter(r => (r.fields||{})["Статус"] === "Новая заявка").length;
  els.statWork.textContent = items.filter(r => (r.fields||{})["Статус"] === "В работе").length;
  els.statPaid.textContent = items.filter(r => (r.fields||{})["Статус"] === "Оплачено").length;
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
  els.dComment.textContent = f["Комментарий"] || f["Комментарий клиента"] || "—";
  els.editStatus.value = f["Статус"] || "Новая заявка";
  els.editM2.value = f["Итоговый м2"] || f["м2"] || "";
  els.editResponsible.value = f["Ответственный"] || "";
  els.editAdminComment.value = f["Комментарий администратора"] || "";
  els.dialog.showModal();
}

async function saveCurrentRequest() {
  if (!currentRecord) return;

  const fields = {
    "Статус": els.editStatus.value,
    "Ответственный": els.editResponsible.value.trim(),
    "Комментарий администратора": els.editAdminComment.value.trim()
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
    if (!res.ok || !data.ok) {
      throw new Error(detailedError(data, "Не удалось сохранить заявку"));
    }

    els.dialog.close();
    await loadRequests();
  } catch (err) {
    showMessage(err.message, "error");
  } finally {
    els.saveRequestBtn.disabled = false;
    els.saveRequestBtn.textContent = "Сохранить";
  }
}

function detailedError(data, fallback) {
  if (!data) return fallback;
  if (data.nocodbResponse) return `${data.error || fallback}: ${JSON.stringify(data.nocodbResponse)}`;
  return data.error || fallback;
}

function showMessage(text, type){ els.message.style.display="block"; els.message.className=`message message--${type}`; els.message.textContent=text; }
function hideMessage(){ els.message.style.display="none"; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c])); }
function attr(v){ return esc(v).replace(/`/g,"&#096;"); }
function shorten(v,max){ const s=String(v||""); return s.length>max ? s.slice(0,max-1)+"…" : s; }
function phoneLink(v){ const p=String(v||"").trim(); return p ? `<a href="tel:${attr(p)}">${esc(p)}</a>` : "—"; }
function numOrNull(v){ if(v==="" || v===null || v===undefined) return null; const n=Number(String(v).replace(",",".")); return Number.isFinite(n) ? n : null; }
