const WORKER_PROFILES = [
  { key: "Никита П", full: "Пахнев Никита", aliases: ["Никита П", "Пахнев Никита", "Пахнев"], defaultRates: { 1: 500, 2: 300, 3: 300, 4: 300, 5: 300 } },
  { key: "Андрей Ш", full: "Шолохов Андрей", aliases: ["Андрей Ш", "Шолохов Андрей", "Шолохов"], defaultRates: { 1: 500, 2: 300, 3: 250, 4: 250, 5: 250 } },
  { key: "Дмитрий П", full: "Петухов Дмитрий", aliases: ["Дмитрий П", "Петухов Дмитрий", "Петухов"], defaultRates: { 1: 400, 2: 200, 3: 200, 4: 200, 5: 200 } },
  { key: "Роман З", full: "Зинченко Роман", aliases: ["Роман З", "Зинченко Роман", "Зинченко"], defaultRates: { 1: 400, 2: 200, 3: 200, 4: 200, 5: 200 } },
  { key: "Никита К", full: "Кислов Никита", aliases: ["Никита К", "Кислов Никита", "Кислов"], defaultRates: { 1: 500, 2: 250, 3: 200, 4: 200, 5: 200 } }
];
const WORKERS = WORKER_PROFILES.map((w) => w.key);
const WORKER_BY_KEY = Object.fromEntries(WORKER_PROFILES.map((w) => [w.key, w]));
const TRASH_STATUSES = new Set(["Отменена", "Удалена", "Отказ"]);
const PAYROLL_STATUSES = new Set(["Выполнено", "Оплачено"]);
const $ = (id) => document.getElementById(id);

let records = [];
let current = null;
let cal = new Date();
let currentReportType = "requests";

const storage = {
  password: "solncanet_admin_password_v8",
  history: "solncanet_history_v8",
  payroll: "solncanet_payroll_settings_v8"
};

const els = {
  loginPanel: $("loginPanel"), appPanel: $("appPanel"), loginForm: $("loginForm"), passwordInput: $("passwordInput"), loginMessage: $("loginMessage"), logoutBtn: $("logoutBtn"), refreshBtn: $("refreshBtn"), listBtn: $("listBtn"), calendarBtn: $("calendarBtn"), listView: $("listView"), calendarView: $("calendarView"), requestsBody: $("requestsBody"), calendarGrid: $("calendarGrid"), monthTitle: $("monthTitle"), prevMonth: $("prevMonth"), nextMonth: $("nextMonth"), searchInput: $("searchInput"), statusFilter: $("statusFilter"), installerFilter: $("installerFilter"), dateFrom: $("dateFrom"), dateTo: $("dateTo"), clearFiltersBtn: $("clearFiltersBtn"), message: $("message"), statTotal: $("statTotal"), statNew: $("statNew"), statToday: $("statToday"), statWork: $("statWork"), statVolume: $("statVolume"), statFiltered: $("statFiltered"),
  dialog: $("requestDialog"), dialogTitle: $("dialogTitle"), requestInfo: $("requestInfo"), editDate: $("editDate"), editTime: $("editTime"), editStatus: $("editStatus"), editM2: $("editM2"), editResponsible: $("editResponsible"), editService: $("editService"), editAddress: $("editAddress"), editAdminComment: $("editAdminComment"), saveRequestBtn: $("saveRequestBtn"), cancelRequestBtn: $("cancelRequestBtn"), cancelReason: $("cancelReason"), requestHistoryBox: $("requestHistoryBox"), exportBtn: $("exportBtn"),
  clientsBody: $("clientsBody"), objectsBody: $("objectsBody"), installersBody: $("installersBody"), trashBody: $("trashBody"), historyBody: $("historyBody"), historySearchInput: $("historySearchInput"), clearHistoryLocalBtn: $("clearHistoryLocalBtn"), filesBody: $("filesBody"), filesSearchInput: $("filesSearchInput"), filesTypeFilter: $("filesTypeFilter"),
  quickAddBtn: $("quickAddBtn"), quickAddDialog: $("quickAddDialog"), quickSaveBtn: $("quickSaveBtn"), quickName: $("quickName"), quickPhone: $("quickPhone"), quickService: $("quickService"), quickDate: $("quickDate"), quickTime: $("quickTime"), quickM2: $("quickM2"), quickAddress: $("quickAddress"), quickComment: $("quickComment"),
  reportDialog: $("reportDialog"), reportTitle: $("reportTitle"), reportDateFrom: $("reportDateFrom"), reportDateTo: $("reportDateTo"), reportStatus: $("reportStatus"), reportFormat: $("reportFormat"), reportAllInstallers: $("reportAllInstallers"), downloadReportBtn: $("downloadReportBtn"), payrollOptions: $("payrollOptions"), payrollSplitMode: $("payrollSplitMode"), payrollStatusMode: $("payrollStatusMode"), payrollSettingsBody: $("payrollSettingsBody"), savePayrollSettingsBtn: $("savePayrollSettingsBtn"), previewPayrollBtn: $("previewPayrollBtn"), reportPreview: $("reportPreview"),
  clientsSearchInput: $("clientsSearchInput"), clientsDateFrom: $("clientsDateFrom"), clientsDateTo: $("clientsDateTo"), clientsServiceFilter: $("clientsServiceFilter"), clientsFilmFilter: $("clientsFilmFilter"), clientsStatusFilter: $("clientsStatusFilter"), clientsClearFiltersBtn: $("clientsClearFiltersBtn"), clientsStatCount: $("clientsStatCount"), clientsStatRequests: $("clientsStatRequests"), clientsStatM2: $("clientsStatM2"), clientsStatRepeat: $("clientsStatRepeat"),
  objectsSearchInput: $("objectsSearchInput"), objectsDateFrom: $("objectsDateFrom"), objectsDateTo: $("objectsDateTo"), objectsServiceFilter: $("objectsServiceFilter"), objectsStatusFilter: $("objectsStatusFilter"), objectsInstallerFilter: $("objectsInstallerFilter"), objectsM2Min: $("objectsM2Min"), objectsM2Max: $("objectsM2Max"), objectsClearFiltersBtn: $("objectsClearFiltersBtn"), objectsStatCount: $("objectsStatCount"), objectsStatM2: $("objectsStatM2"), objectsStatDone: $("objectsStatDone"), objectsStatWork: $("objectsStatWork"),
  installersSearchInput: $("installersSearchInput"), installersDateFrom: $("installersDateFrom"), installersDateTo: $("installersDateTo"), installersStatusFilter: $("installersStatusFilter"), installersServiceFilter: $("installersServiceFilter"), installersClearFiltersBtn: $("installersClearFiltersBtn"), installersStatJobs: $("installersStatJobs"), installersStatM2: $("installersStatM2"), installersStatAmount: $("installersStatAmount"), installersStatTotal: $("installersStatTotal"), payrollGuide: $("payrollGuide")
};

init();

function init() {
  const saved = localStorage.getItem(storage.password);
  if (saved) login(saved);

  els.loginForm.addEventListener("submit", (e) => { e.preventDefault(); login(els.passwordInput.value.trim()); });
  els.logoutBtn.addEventListener("click", () => { localStorage.removeItem(storage.password); records = []; showLogin(); });
  els.refreshBtn.addEventListener("click", load);
  els.listBtn.addEventListener("click", () => setView("list"));
  els.calendarBtn.addEventListener("click", () => setView("calendar"));
  els.prevMonth.addEventListener("click", () => { cal.setMonth(cal.getMonth() - 1); render(); });
  els.nextMonth.addEventListener("click", () => { cal.setMonth(cal.getMonth() + 1); render(); });

  [els.searchInput, els.statusFilter, els.installerFilter, els.dateFrom, els.dateTo].forEach((el) => {
    el.addEventListener("input", renderAll);
    el.addEventListener("change", renderAll);
  });

  els.clearFiltersBtn.addEventListener("click", clearFilters);
  els.saveRequestBtn.addEventListener("click", saveRequest);
  els.cancelRequestBtn.addEventListener("click", cancelCurrentRequest);
  els.exportBtn.addEventListener("click", () => setSection("reports"));
  els.quickAddBtn.addEventListener("click", openQuickAdd);
  els.quickSaveBtn.addEventListener("click", saveQuickAdd);
  els.filesSearchInput.addEventListener("input", renderFiles);
  els.filesTypeFilter.addEventListener("change", renderFiles);
  els.historySearchInput.addEventListener("input", renderHistorySection);
  els.clearHistoryLocalBtn.addEventListener("click", clearLocalHistory);

  [els.clientsSearchInput, els.clientsDateFrom, els.clientsDateTo, els.clientsServiceFilter, els.clientsFilmFilter, els.clientsStatusFilter].forEach((el) => el && el.addEventListener("input", renderClients));
  [els.clientsDateFrom, els.clientsDateTo, els.clientsServiceFilter, els.clientsStatusFilter].forEach((el) => el && el.addEventListener("change", renderClients));
  if (els.clientsClearFiltersBtn) els.clientsClearFiltersBtn.addEventListener("click", clearClientFilters);

  [els.objectsSearchInput, els.objectsDateFrom, els.objectsDateTo, els.objectsServiceFilter, els.objectsStatusFilter, els.objectsInstallerFilter, els.objectsM2Min, els.objectsM2Max].forEach((el) => el && el.addEventListener("input", renderObjects));
  [els.objectsDateFrom, els.objectsDateTo, els.objectsServiceFilter, els.objectsStatusFilter, els.objectsInstallerFilter].forEach((el) => el && el.addEventListener("change", renderObjects));
  if (els.objectsClearFiltersBtn) els.objectsClearFiltersBtn.addEventListener("click", clearObjectFilters);

  [els.installersSearchInput, els.installersDateFrom, els.installersDateTo, els.installersStatusFilter, els.installersServiceFilter].forEach((el) => el && el.addEventListener("input", renderInstallers));
  [els.installersDateFrom, els.installersDateTo, els.installersStatusFilter, els.installersServiceFilter].forEach((el) => el && el.addEventListener("change", renderInstallers));
  if (els.installersClearFiltersBtn) els.installersClearFiltersBtn.addEventListener("click", clearInstallerFilters);

  document.querySelectorAll("[data-section]").forEach((link) => link.addEventListener("click", (e) => { e.preventDefault(); setSection(link.dataset.section); }));
  document.querySelectorAll("[data-report]").forEach((button) => button.addEventListener("click", () => openReport(button.dataset.report)));

  els.reportAllInstallers.addEventListener("change", () => {
    if (els.reportAllInstallers.checked) document.querySelectorAll('[name="reportInstaller"]').forEach((c) => c.checked = false);
    updateReportPreview();
  });
  document.querySelectorAll('[name="reportInstaller"]').forEach((c) => c.addEventListener("change", () => {
    if ([...document.querySelectorAll('[name="reportInstaller"]')].some((x) => x.checked)) els.reportAllInstallers.checked = false;
    updateReportPreview();
  }));
  [els.reportDateFrom, els.reportDateTo, els.reportStatus, els.reportFormat, els.payrollSplitMode, els.payrollStatusMode].forEach((el) => el && el.addEventListener("change", updateReportPreview));

  els.savePayrollSettingsBtn.addEventListener("click", () => { savePayrollSettingsFromForm(); msg("Ставки зарплаты сохранены в браузере"); updateReportPreview(); });
  els.previewPayrollBtn.addEventListener("click", updateReportPreview);
  els.downloadReportBtn.addEventListener("click", downloadReport);
  if (els.payrollSettingsBody) els.payrollSettingsBody.addEventListener("input", () => { savePayrollSettingsFromForm(); updateReportPreview(); });

  setDefaultDates();
  renderPayrollSettings();
}

function setDefaultDates() {
  const t = today();
  if (els.quickDate) els.quickDate.value = t;
  if (els.quickTime) els.quickTime.value = "10:00";
}

async function login(password) {
  els.loginMessage.textContent = "";
  if (!password) { els.loginMessage.textContent = "Введите пароль"; return; }
  try {
    const response = await fetch("/list-zayavki", { headers: { "x-admin-password": password } });
    const data = await response.json();
    if (!response.ok || !data.ok) { els.loginMessage.textContent = data.error || "Неверный пароль"; return showLogin(); }
    localStorage.setItem(storage.password, password);
    records = data.records || [];
    showApp();
    renderAll();
  } catch (error) {
    els.loginMessage.textContent = "Ошибка входа: " + error.message;
    showLogin();
  }
}

function showApp() { document.body.classList.remove("logged-out"); document.body.classList.add("logged-in"); els.loginPanel.style.display = "none"; els.appPanel.style.display = "block"; }
function showLogin() { document.body.classList.remove("logged-in"); document.body.classList.add("logged-out"); els.appPanel.style.display = "none"; els.loginPanel.style.display = "block"; }
function pwd() { return localStorage.getItem(storage.password) || ""; }

async function load() {
  msg("Загружаю...");
  try {
    const response = await fetch("/list-zayavki", { headers: { "x-admin-password": pwd() } });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Ошибка загрузки");
    records = data.records || [];
    renderAll();
    msg("Готово");
  } catch (error) { msg(error.message); }
}

function setSection(section) {
  document.querySelectorAll("[data-section]").forEach((a) => a.classList.toggle("active", a.dataset.section === section));
  document.querySelectorAll(".workspace-section").forEach((s) => s.style.display = "none");

  if (section === "calendar") { $("requestsSection").style.display = "block"; setView("calendar", false); }
  else if (section === "requests") { $("requestsSection").style.display = "block"; setView("list", false); }
  else { const target = $(section + "Section"); if (target) target.style.display = "block"; }

  renderAll();
}
function setView(view, doRender = true) { els.listView.style.display = view === "list" ? "block" : "none"; els.calendarView.style.display = view === "calendar" ? "block" : "none"; els.listBtn.classList.toggle("active", view === "list"); els.calendarBtn.classList.toggle("active", view === "calendar"); if (doRender) render(); }
function clearFilters() { els.searchInput.value = ""; els.statusFilter.value = ""; els.installerFilter.value = ""; els.dateFrom.value = ""; els.dateTo.value = ""; renderAll(); }

function isTrashRecord(record) { const status = (record.fields || {})["Статус"] || ""; return TRASH_STATUSES.has(status); }
function activeRecords() { return records.filter((r) => !isTrashRecord(r)); }
function filtered(includeTrash = false) {
  const q = norm(els.searchInput.value);
  const status = els.statusFilter.value;
  const installer = els.installerFilter.value;
  const from = els.dateFrom.value;
  const to = els.dateTo.value;
  const base = includeTrash ? records : activeRecords();

  return base.filter((r) => {
    const f = r.fields || {};
    const date = String(f["Дата записи"] || "");
    const installers = splitInstallers(f["Монтажники"]);
    const hay = norm(["#" + r.id, f["Имя клиента"], f["Телефон"], f["Услуга"], f["Адрес"], f["Монтажники"], f["Статус"], f["Комментарий клиента"], f["Комментарий администратора"], f["Cal Booking ID"]].join(" "));
    if (status && f["Статус"] !== status) return false;
    if (installer && !installers.includes(installer)) return false;
    if (from && date && date < from) return false;
    if (to && date && date > to) return false;
    if (q && !hay.includes(q)) return false;
    return true;
  }).sort(sortByDateDesc);
}
function sortByDateDesc(a, b) { const af = a.fields || {}, bf = b.fields || {}; return (String(bf["Дата записи"] || "") + " " + String(bf["Время записи"] || "")).localeCompare(String(af["Дата записи"] || "") + " " + String(af["Время записи"] || "")); }

function renderAll() { render(); renderClients(); renderObjects(); renderInstallers(); renderTrash(); renderFiles(); renderHistorySection(); }
function render() { const arr = filtered(false); els.requestsBody.innerHTML = arr.map(requestRow).join("") || '<tr><td colspan="10">Нет заявок</td></tr>'; bindActionButtons(); renderCalendar(arr); renderStats(records, arr); }
function requestRow(r) { const f = r.fields || {}, status = e(f["Статус"] || ""); return `<tr><td>${e(f["Дата записи"])}</td><td>${e(f["Время записи"])}</td><td><b>${e(f["Имя клиента"])}</b></td><td>${phoneLink(f["Телефон"])}</td><td>${e(f["Услуга"])}</td><td>${e(f["Адрес"])}</td><td>${e(f["Итоговый м2"] || f["м2"])}</td><td>${e(f["Монтажники"])}</td><td class="status-cell"><span class="status" data-status="${status}">${status || "—"}</span></td><td><button class="open-btn" data-open="${e(r.id)}">Открыть</button></td></tr>`; }

function renderCalendar(arr) {
  els.monthTitle.textContent = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cal);
  const y = cal.getFullYear(), m = cal.getMonth(), first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, start = new Date(y, m, 1 - offset);
  const byDate = {};
  arr.forEach((r) => { const d = (r.fields || {})["Дата записи"] || ""; (byDate[d] ||= []).push(r); });
  let html = "";
  const todayStr = today();
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ymd = ymdLocal(d), items = byDate[ymd] || [];
    html += `<div class="day ${d.getMonth() !== m ? "muted" : ""} ${ymd === todayStr ? "today" : ""}"><b>${d.getDate()}</b>${items.slice(0, 5).map((r) => `<button class="event" data-open="${e(r.id)}">${e((r.fields || {})["Время записи"] || "")} ${e((r.fields || {})["Имя клиента"] || "")}<small>${e((r.fields || {})["Статус"] || "")}</small></button>`).join("")}</div>`;
  }
  els.calendarGrid.innerHTML = html;
  bindActionButtons();
}
function renderStats(all, arr) { const t = today(); const active = activeRecords(); els.statTotal.textContent = active.length; els.statNew.textContent = active.filter((r) => (r.fields || {})["Статус"] === "Новая заявка").length; els.statToday.textContent = active.filter((r) => (r.fields || {})["Дата записи"] === t).length; els.statWork.textContent = active.filter((r) => (r.fields || {})["Статус"] === "В работе").length; els.statFiltered.textContent = arr.length; els.statVolume.textContent = moneyNumber(arr.reduce((s, r) => s + getM2(r.fields || {}), 0)); }
function bindActionButtons() { document.querySelectorAll("[data-open]").forEach((button) => button.onclick = () => openRequest(button.dataset.open)); document.querySelectorAll("[data-restore]").forEach((button) => button.onclick = () => restoreRequest(button.dataset.restore)); }

function openRequest(id) {
  current = records.find((r) => String(r.id) === String(id));
  if (!current) return;
  const f = current.fields || {};
  els.dialogTitle.textContent = "Заявка #" + current.id;
  els.requestInfo.innerHTML = `<b>${e(f["Имя клиента"] || "—")}</b><br>${phoneLink(f["Телефон"])}<br>${e(f["Дата записи"] || "")} ${e(f["Время записи"] || "")}<br>${e(f["Услуга"] || "")}<br>${e(f["Адрес"] || "")}<br><br>${nl2br(f["Комментарий клиента"] || f["Комментарий"] || "")}`;
  els.editDate.value = f["Дата записи"] || "";
  els.editTime.value = f["Время записи"] || "";
  els.editStatus.value = f["Статус"] || "Новая заявка";
  els.editM2.value = f["Итоговый м2"] || f["м2"] || "";
  els.editResponsible.value = f["Ответственный"] || "";
  els.editService.value = f["Услуга"] || "";
  els.editAddress.value = f["Адрес"] || "";
  els.editAdminComment.value = f["Комментарий администратора"] || "";
  els.cancelReason.value = "";
  const names = splitInstallers(f["Монтажники"]);
  document.querySelectorAll('[name="installer"]').forEach((c) => c.checked = names.includes(c.value));
  renderRequestHistory(current);
  els.dialog.showModal();
}

function currentEditFields() {
  return {
    "Дата записи": els.editDate.value,
    "Время записи": els.editTime.value,
    "Статус": els.editStatus.value,
    "Итоговый м2": els.editM2.value,
    "Ответственный": els.editResponsible.value.trim(),
    "Услуга": els.editService.value.trim(),
    "Адрес": els.editAddress.value.trim(),
    "Комментарий администратора": els.editAdminComment.value.trim(),
    "Монтажники": [...document.querySelectorAll('[name="installer"]:checked')].map((x) => x.value).join(", ")
  };
}
async function saveRequest() {
  if (!current) return;
  const oldFields = current.fields || {};
  const fields = currentEditFields();
  const changes = diffFields(oldFields, fields);
  let history = getHistoryForRecord(current);
  if (changes.length) history = addHistory(current, "Изменение заявки", changes.join("; "), history);
  fields["История изменений"] = JSON.stringify(history);
  await updateRecord(current.id, fields, "Заявка сохранена");
  els.dialog.close();
  await load();
}
async function cancelCurrentRequest() {
  if (!current) return;
  const reason = els.cancelReason.value.trim() || "Причина не указана";
  if (!confirm("Перенести заявку в корзину отмен?")) return;
  const oldFields = current.fields || {};
  const adminComment = [oldFields["Комментарий администратора"] || "", `ОТМЕНА: ${dateTimeY()} — ${reason}`].filter(Boolean).join("\n");
  let history = getHistoryForRecord(current);
  history = addHistory(current, "Отмена / удаление в корзину", `Причина: ${reason}`, history);
  const fields = { "Статус": "Отменена", "Комментарий администратора": adminComment, "Дата отмены": today(), "Причина отмены": reason, "История изменений": JSON.stringify(history) };
  await updateRecord(current.id, fields, "Заявка перенесена в корзину отмен");
  els.dialog.close();
  await load();
}
async function restoreRequest(id) {
  const record = records.find((r) => String(r.id) === String(id));
  if (!record) return;
  let history = getHistoryForRecord(record);
  history = addHistory(record, "Восстановление заявки", "Статус изменён на Новая заявка", history);
  await updateRecord(id, { "Статус": "Новая заявка", "История изменений": JSON.stringify(history) }, "Заявка восстановлена");
  await load();
}
async function updateRecord(id, fields, successText) {
  try {
    const response = await fetch("/update-zayavka", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pwd() }, body: JSON.stringify({ id, fields }) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Ошибка сохранения");
    if (data.warning) msg(successText + ". " + data.warning); else msg(successText);
  } catch (error) { msg(error.message); throw error; }
}

function openQuickAdd() { setDefaultDates(); els.quickName.value = ""; els.quickPhone.value = ""; els.quickAddress.value = ""; els.quickComment.value = ""; els.quickM2.value = ""; els.quickAddDialog.showModal(); }
async function saveQuickAdd() {
  const record = { "Имя клиента": els.quickName.value.trim(), "Телефон": els.quickPhone.value.trim(), "Услуга": els.quickService.value, "Дата записи": els.quickDate.value, "Время записи": els.quickTime.value, "Адрес": els.quickAddress.value.trim(), "м2": els.quickM2.value ? String(els.quickM2.value) : "", "Комментарий клиента": els.quickComment.value.trim(), "Статус": "Новая заявка", "Cal Booking ID": "manual-" + Date.now() };
  if (!record["Имя клиента"] || !record["Телефон"] || !record["Дата записи"] || !record["Время записи"]) { msg("Заполните ФИО, телефон, дату и время"); return; }
  try {
    const response = await fetch("/create-zayavka", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pwd() }, body: JSON.stringify({ fields: record }) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Ошибка создания заявки");
    els.quickAddDialog.close();
    await load();
    msg("Быстрая заявка создана");
  } catch (error) { msg(error.message); }
}


function recordHay(f, id = "") {
  return norm(["#" + id, f["Имя клиента"], f["Телефон"], f["Услуга"], f["Адрес"], f["Монтажники"], f["Статус"], f["Комментарий клиента"], f["Комментарий администратора"], f["Файлы"], f["Cal Booking ID"]].join(" "));
}
function sectionRecords(opts = {}) {
  const { q = "", from = "", to = "", service = "", status = "", installer = "", film = "", m2Min = "", m2Max = "", includeTrash = false } = opts;
  return (includeTrash ? records : activeRecords()).filter((r) => {
    const f = r.fields || {};
    const date = String(f["Дата записи"] || "");
    const m2 = getM2(f);
    const hay = recordHay(f, r.id);
    const installers = splitInstallers(f["Монтажники"]);
    if (from && date && date < from) return false;
    if (to && date && date > to) return false;
    if (service && f["Услуга"] !== service) return false;
    if (status && f["Статус"] !== status) return false;
    if (installer && !installers.includes(installer)) return false;
    if (film && !hay.includes(norm(film))) return false;
    if (m2Min !== "" && m2 < num(m2Min)) return false;
    if (m2Max !== "" && m2 > num(m2Max)) return false;
    if (q && !hay.includes(norm(q))) return false;
    return true;
  }).sort(sortByDateDesc);
}
function clearClientFilters() { [els.clientsSearchInput, els.clientsDateFrom, els.clientsDateTo, els.clientsFilmFilter].forEach((el) => { if (el) el.value = ""; }); [els.clientsServiceFilter, els.clientsStatusFilter].forEach((el) => { if (el) el.value = ""; }); renderClients(); }
function clearObjectFilters() { [els.objectsSearchInput, els.objectsDateFrom, els.objectsDateTo, els.objectsM2Min, els.objectsM2Max].forEach((el) => { if (el) el.value = ""; }); [els.objectsServiceFilter, els.objectsStatusFilter, els.objectsInstallerFilter].forEach((el) => { if (el) el.value = ""; }); renderObjects(); }
function clearInstallerFilters() { [els.installersSearchInput, els.installersDateFrom, els.installersDateTo].forEach((el) => { if (el) el.value = ""; }); [els.installersStatusFilter, els.installersServiceFilter].forEach((el) => { if (el) el.value = ""; }); renderInstallers(); }

function renderClients() {
  const rows = sectionRecords({ q: els.clientsSearchInput?.value || "", from: els.clientsDateFrom?.value || "", to: els.clientsDateTo?.value || "", service: els.clientsServiceFilter?.value || "", status: els.clientsStatusFilter?.value || "", film: els.clientsFilmFilter?.value || "" });
  const map = new Map();
  rows.forEach((r) => {
    const f = r.fields || {}, name = f["Имя клиента"] || "Без имени", phone = f["Телефон"] || "", key = norm(name + "|" + phone);
    const item = map.get(key) || { name, phone, count: 0, last: "", id: r.id, m2: 0, service: "", address: "" };
    item.count++; item.m2 += getM2(f);
    if (String(f["Дата записи"] || "") >= String(item.last || "")) { item.last = f["Дата записи"] || ""; item.id = r.id; item.service = f["Услуга"] || ""; item.address = f["Адрес"] || ""; }
    map.set(key, item);
  });
  const clients = [...map.values()].sort((a, b) => String(b.last).localeCompare(String(a.last)));
  if (els.clientsStatCount) els.clientsStatCount.textContent = clients.length;
  if (els.clientsStatRequests) els.clientsStatRequests.textContent = rows.length;
  if (els.clientsStatM2) els.clientsStatM2.textContent = moneyNumber(rows.reduce((s, r) => s + getM2(r.fields || {}), 0));
  if (els.clientsStatRepeat) els.clientsStatRepeat.textContent = clients.filter((x) => x.count > 1).length;
  els.clientsBody.innerHTML = clients.map((x) => `<tr><td><b>${e(x.name)}</b></td><td>${phoneLink(x.phone)}</td><td>${x.count}</td><td>${e(x.service || "—")}</td><td>${e(x.address || "—")}</td><td>${moneyNumber(x.m2)}</td><td>${e(x.last)}</td><td><button class="open-btn" data-open="${e(x.id)}">Открыть</button></td></tr>`).join("") || '<tr><td colspan="8">Клиенты не найдены</td></tr>';
  bindActionButtons();
}
function renderObjects() {
  const rows = sectionRecords({ q: els.objectsSearchInput?.value || "", from: els.objectsDateFrom?.value || "", to: els.objectsDateTo?.value || "", service: els.objectsServiceFilter?.value || "", status: els.objectsStatusFilter?.value || "", installer: els.objectsInstallerFilter?.value || "", m2Min: els.objectsM2Min?.value || "", m2Max: els.objectsM2Max?.value || "" });
  if (els.objectsStatCount) els.objectsStatCount.textContent = rows.length;
  if (els.objectsStatM2) els.objectsStatM2.textContent = moneyNumber(rows.reduce((s, r) => s + getM2(r.fields || {}), 0));
  if (els.objectsStatDone) els.objectsStatDone.textContent = rows.filter((r) => PAYROLL_STATUSES.has((r.fields || {})["Статус"] || "")).length;
  if (els.objectsStatWork) els.objectsStatWork.textContent = rows.filter((r) => (r.fields || {})["Статус"] === "В работе").length;
  els.objectsBody.innerHTML = rows.map((r) => { const f = r.fields || {}; return `<tr><td>${e(f["Дата записи"] || "")}</td><td><b>${e(f["Имя клиента"] || "—")}</b><br>${phoneLink(f["Телефон"])}</td><td>${e(f["Адрес"] || "—")}</td><td>${e(f["Услуга"] || "—")}</td><td>${moneyNumber(getM2(f))}</td><td>${e(displayInstallers(f["Монтажники"]) || "—")}</td><td class="status-cell"><span class="status" data-status="${e(f["Статус"] || "")}">${e(f["Статус"] || "—")}</span></td><td><button class="open-btn" data-open="${e(r.id)}">Открыть</button></td></tr>`; }).join("") || '<tr><td colspan="8">Объекты не найдены</td></tr>';
  bindActionButtons();
}
function installerRowsForSection() {
  return sectionRecords({ q: els.installersSearchInput?.value || "", from: els.installersDateFrom?.value || "", to: els.installersDateTo?.value || "", service: els.installersServiceFilter?.value || "", status: els.installersStatusFilter?.value || "" });
}
function renderInstallers() {
  const rows = installerRowsForSection();
  const payroll = buildPayroll(rows, { useUi: false, selectedWorkers: WORKERS, statusModeOverride: els.installersStatusFilter?.value ? "report-filter" : "all-active" });
  const summary = payroll.summary;
  const summaryRows = WORKERS.map((w) => summary[w] || emptyPayrollSummary(w));
  if (els.installersStatJobs) els.installersStatJobs.textContent = summaryRows.reduce((s, x) => s + x.jobs, 0);
  if (els.installersStatM2) els.installersStatM2.textContent = moneyNumber(summaryRows.reduce((s, x) => s + x.m2, 0));
  if (els.installersStatAmount) els.installersStatAmount.textContent = money(summaryRows.reduce((s, x) => s + x.amount, 0));
  if (els.installersStatTotal) els.installersStatTotal.textContent = money(summaryRows.reduce((s, x) => s + x.total, 0));
  els.installersBody.innerHTML = summaryRows.map((x) => `<tr><td><b>${e(workerLabel(x.worker))}</b><br><small>${e(x.worker)}</small></td><td>${x.jobs}</td><td>${moneyNumber(x.m2)}</td><td>${money(x.amount)}</td><td>${money(x.bonus)}</td><td>${money(x.advance)}</td><td><b>${money(x.total)}</b></td><td>${e(x.last || "—")}</td></tr>`).join("");
}
function renderTrash() { const arr = records.filter(isTrashRecord).sort(sortByDateDesc); els.trashBody.innerHTML = arr.map((r) => { const f = r.fields || {}; return `<tr><td>${e(f["Дата записи"] || "")}</td><td><b>${e(f["Имя клиента"] || "—")}</b></td><td>${phoneLink(f["Телефон"])}</td><td>${e(f["Услуга"] || "")}</td><td>${e(f["Адрес"] || "")}</td><td>${nl2br(f["Причина отмены"] || lastCancelReason(f) || f["Комментарий администратора"] || "")}</td><td class="status-cell"><span class="status" data-status="${e(f["Статус"] || "")}">${e(f["Статус"] || "—")}</span></td><td><button class="open-btn" data-open="${e(r.id)}">Открыть</button> <button class="restore-btn" data-restore="${e(r.id)}">Восстановить</button></td></tr>`; }).join("") || '<tr><td colspan="8">Корзина пустая</td></tr>'; bindActionButtons(); }
function renderFiles() { const q = norm(els.filesSearchInput?.value || ""), type = norm(els.filesTypeFilter?.value || ""); const rows = records.filter((r) => { const f = r.fields || {}, files = String(f["Файлы"] || ""); const hay = norm(["#" + r.id, f["Имя клиента"], f["Телефон"], f["Адрес"], f["Услуга"], f["Статус"], f["Комментарий клиента"], f["Комментарий администратора"], files].join(" ")); if (q && !hay.includes(q)) return false; if (type && !norm(files).includes(type)) return false; return true; }); els.filesBody.innerHTML = rows.map((r) => { const f = r.fields || {}; return `<tr><td>#${e(r.id)}</td><td>${e(f["Имя клиента"] || "—")}</td><td>${phoneLink(f["Телефон"])}</td><td>${e(f["Адрес"] || "—")}</td><td>${e(f["Файлы"] || "Пока нет файлов")}</td><td class="status-cell"><span class="status" data-status="${e(f["Статус"] || "")}">${e(f["Статус"] || "—")}</span></td><td><button class="open-btn" data-open="${e(r.id)}">Открыть</button></td></tr>`; }).join("") || '<tr><td colspan="7">Файлы не найдены</td></tr>'; bindActionButtons(); }

function getHistoryForRecord(record) {
  const f = record.fields || {};
  const fromField = parseHistoryField(f["История изменений"]);
  const local = getLocalHistory()[String(record.id)] || [];
  const merged = [...fromField, ...local];
  const byKey = new Map();
  merged.forEach((item) => byKey.set([item.at, item.action, item.details].join("|"), item));
  return [...byKey.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
function addHistory(record, action, details, currentHistory = null) { const history = currentHistory || getHistoryForRecord(record); const entry = { at: dateTimeY(), id: String(record.id), client: (record.fields || {})["Имя клиента"] || "", phone: (record.fields || {})["Телефон"] || "", action, details }; saveLocalHistory(record.id, entry); return [entry, ...history].slice(0, 200); }
function saveLocalHistory(id, entry) { const all = getLocalHistory(); all[String(id)] ||= []; all[String(id)].unshift(entry); all[String(id)] = all[String(id)].slice(0, 200); localStorage.setItem(storage.history, JSON.stringify(all)); }
function getLocalHistory() { try { return JSON.parse(localStorage.getItem(storage.history) || "{}"); } catch (_) { return {}; } }
function parseHistoryField(value) { if (!value) return []; if (Array.isArray(value)) return value; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (_) { return String(value).split("\n").filter(Boolean).map((line) => ({ at: "", action: "Запись", details: line })); } }
function renderRequestHistory(record) { const history = getHistoryForRecord(record); els.requestHistoryBox.innerHTML = history.length ? history.map((h) => `<div class="history-item"><b>${e(h.at || "—")}</b><span>${e(h.action || "")}</span><p>${e(h.details || "")}</p></div>`).join("") : '<p class="muted-text">Истории изменений пока нет.</p>'; }
function renderHistorySection() { const q = norm(els.historySearchInput?.value || ""); const rows = []; records.forEach((r) => getHistoryForRecord(r).forEach((h) => rows.push({ record: r, h }))); rows.sort((a, b) => String(b.h.at).localeCompare(String(a.h.at))); const filteredRows = rows.filter(({ record, h }) => { const f = record.fields || {}; const hay = norm([h.at, h.action, h.details, record.id, f["Имя клиента"], f["Телефон"]].join(" ")); return !q || hay.includes(q); }); els.historyBody.innerHTML = filteredRows.map(({ record, h }) => `<tr><td>${e(h.at || "—")}</td><td>#${e(record.id)}</td><td>${e((record.fields || {})["Имя клиента"] || h.client || "—")}</td><td><b>${e(h.action || "")}</b></td><td>${e(h.details || "")}</td><td><button class="open-btn" data-open="${e(record.id)}">Открыть</button></td></tr>`).join("") || '<tr><td colspan="6">Истории пока нет</td></tr>'; bindActionButtons(); }
function clearLocalHistory() { if (!confirm("Очистить локальную историю изменений в этом браузере? Данные в NocoDB не удаляются.")) return; localStorage.removeItem(storage.history); renderHistorySection(); msg("Локальная история очищена"); }


function openReport(type) {
  currentReportType = type;
  const titles = { requests: "Отчёт по заявкам", payroll: "Отчёт по зарплате монтажников", objects: "Отчёт по объектам и объёму", clients: "Отчёт по клиентам" };
  els.reportTitle.textContent = titles[type] || "Настройка отчёта";
  els.reportDateFrom.value = els.dateFrom.value || monthStart();
  els.reportDateTo.value = els.dateTo.value || today();
  els.reportStatus.value = type === "payroll" ? "" : (els.statusFilter.value || "");
  if (els.reportFormat) els.reportFormat.value = type === "payroll" ? "xls" : (els.reportFormat.value || "xls");
  els.reportAllInstallers.checked = true;
  document.querySelectorAll('[name="reportInstaller"]').forEach((c) => c.checked = false);
  els.payrollOptions.style.display = type === "payroll" ? "block" : "none";
  renderPayrollSettings();
  updateReportPreview();
  els.reportDialog.showModal();
}
function reportSelectedInstallers() { return els.reportAllInstallers.checked ? WORKERS : [...document.querySelectorAll('[name="reportInstaller"]:checked')].map((x) => x.value); }
function reportFiltered() {
  const from = els.reportDateFrom.value, to = els.reportDateTo.value, status = els.reportStatus.value, selected = reportSelectedInstallers();
  return records.filter((r) => {
    const f = r.fields || {}, date = String(f["Дата записи"] || ""), names = splitInstallers(f["Монтажники"]);
    if (from && date < from) return false;
    if (to && date > to) return false;
    if (status && f["Статус"] !== status) return false;
    if (!els.reportAllInstallers.checked && (!names.length || !names.some((n) => selected.includes(n)))) return false;
    return true;
  }).sort(sortByDateDesc);
}
function updateReportPreview() {
  if (!els.reportPreview) return;
  if (currentReportType === "payroll") renderPayrollPreview();
  else {
    const rows = reportFiltered();
    const m2 = rows.reduce((s, r) => s + getM2(r.fields || {}), 0);
    els.reportPreview.innerHTML = `<p class="modal-note">В отчёт попадёт строк: <b>${rows.length}</b>. Общий объём: <b>${moneyNumber(m2)} м²</b>. Формат: <b>${els.reportFormat?.value === "xls" ? "Excel .xls" : "CSV"}</b>.</p>`;
  }
}
function downloadReport() {
  if (currentReportType === "payroll") return downloadPayrollReport();
  const rows = reportFiltered();
  const format = els.reportFormat?.value || "xls";
  let fields, title, filename;
  if (currentReportType === "objects") { title = "Отчёт по объектам"; filename = "solncanet_report_objects"; fields = ["Дата записи", "Время записи", "Имя клиента", "Телефон", "Адрес", "Услуга", "Итоговый м2", "м2", "Статус", "Монтажники"]; }
  else if (currentReportType === "clients") { title = "Отчёт по клиентам"; filename = "solncanet_report_clients"; fields = ["Имя клиента", "Телефон", "Дата записи", "Услуга", "Адрес", "Статус", "Итоговый м2", "м2"]; }
  else { title = "Отчёт по заявкам"; filename = "solncanet_report_requests"; fields = ["Дата записи", "Время записи", "Имя клиента", "Телефон", "Услуга", "Адрес", "Итоговый м2", "м2", "Монтажники", "Статус", "Комментарий администратора"]; }
  if (format === "csv") downloadCsv(filename + ".csv", rows, fields);
  else downloadExcel(filename + ".xls", title, [{ title: "Данные", headers: fields, rows: rows.map((r) => { const f = r.fields || {}; return fields.map((k) => f[k] || ""); }) }]);
  els.reportDialog.close();
}
function downloadCsv(filename, rows, fields) { const csv = [fields.join(";"), ...rows.map((r) => { const f = r.fields || {}; return fields.map((k) => csvCell(f[k])).join(";"); })].join("\n"); downloadText(filename, "\uFEFF" + csv, "text/csv;charset=utf-8"); }


function defaultPayrollSettings() {
  const rates = {};
  WORKER_PROFILES.forEach((w) => rates[w.key] = { ...w.defaultRates, bonus: 0, advance: 0, comment: "" });
  return { splitMode: "crew-rate", statusMode: "completed", rates };
}
function migratePayrollSettings(saved) {
  const base = defaultPayrollSettings();
  if (!saved || typeof saved !== "object") return base;
  base.splitMode = saved.splitMode === "equal" ? "equal-m2" : saved.splitMode === "full" ? "one-rate-full" : (saved.splitMode || base.splitMode);
  base.statusMode = saved.statusMode || base.statusMode;
  WORKERS.forEach((w) => {
    const old = saved.rates?.[w] || {};
    const target = base.rates[w];
    [1,2,3,4,5].forEach((n) => { if (old[n] !== undefined && old[n] !== "") target[n] = num(old[n]); });
    if (old.rate) target[1] = num(old.rate);
    target.bonus = num(old.bonus);
    target.advance = num(old.advance);
    target.comment = old.comment || "";
  });
  return base;
}
function getPayrollSettings() { try { return migratePayrollSettings(JSON.parse(localStorage.getItem(storage.payroll) || "{}")); } catch (_) { return defaultPayrollSettings(); } }
function savePayrollSettings(settings) { localStorage.setItem(storage.payroll, JSON.stringify(settings)); }
function renderPayrollSettings() {
  const settings = getPayrollSettings();
  if (els.payrollSplitMode) els.payrollSplitMode.value = settings.splitMode || "crew-rate";
  if (els.payrollStatusMode) els.payrollStatusMode.value = settings.statusMode || "completed";
  if (!els.payrollSettingsBody) return;
  els.payrollSettingsBody.innerHTML = WORKER_PROFILES.map((w) => { const r = settings.rates?.[w.key] || {}; return `<tr><td><b>${e(w.full)}</b><br><small>${e(w.key)}</small></td><td><input data-payroll-rate="${w.key}" data-crew="1" type="number" step="1" value="${e(r[1] ?? 0)}"></td><td><input data-payroll-rate="${w.key}" data-crew="2" type="number" step="1" value="${e(r[2] ?? 0)}"></td><td><input data-payroll-rate="${w.key}" data-crew="3" type="number" step="1" value="${e(r[3] ?? 0)}"></td><td><input data-payroll-rate="${w.key}" data-crew="4" type="number" step="1" value="${e(r[4] ?? 0)}"></td><td><input data-payroll-rate="${w.key}" data-crew="5" type="number" step="1" value="${e(r[5] ?? 0)}"></td><td><input data-payroll-bonus="${w.key}" type="number" step="1" value="${e(r.bonus || 0)}"></td><td><input data-payroll-advance="${w.key}" type="number" step="1" value="${e(r.advance || 0)}"></td><td><input data-payroll-comment="${w.key}" value="${e(r.comment || "")}"></td></tr>`; }).join("");
}
function savePayrollSettingsFromForm() {
  const settings = defaultPayrollSettings();
  settings.splitMode = els.payrollSplitMode?.value || "crew-rate";
  settings.statusMode = els.payrollStatusMode?.value || "completed";
  WORKERS.forEach((w) => {
    const current = settings.rates[w];
    [1,2,3,4,5].forEach((n) => current[n] = num(document.querySelector(`[data-payroll-rate="${w}"][data-crew="${n}"]`)?.value));
    current.bonus = num(document.querySelector(`[data-payroll-bonus="${w}"]`)?.value);
    current.advance = num(document.querySelector(`[data-payroll-advance="${w}"]`)?.value);
    current.comment = document.querySelector(`[data-payroll-comment="${w}"]`)?.value || "";
  });
  savePayrollSettings(settings);
  return settings;
}
function emptyPayrollSummary(worker) { return { worker, jobs: 0, m2: 0, amount: 0, bonus: 0, advance: 0, total: 0, last: "", comment: "" }; }
function payrollRecordsForReport() {
  const settings = getPayrollSettings();
  const rows = reportFiltered();
  const statusMode = els.payrollStatusMode?.value || settings.statusMode || "completed";
  if (statusMode === "report-filter") return rows;
  if (statusMode === "all-active") return rows.filter((r) => !TRASH_STATUSES.has((r.fields || {})["Статус"] || ""));
  return rows.filter((r) => PAYROLL_STATUSES.has((r.fields || {})["Статус"] || ""));
}
function getWorkerRate(settings, worker, crewSize, mode) {
  const size = mode === "one-rate-full" ? 1 : Math.min(Math.max(Number(crewSize) || 1, 1), 5);
  return num(settings.rates?.[worker]?.[size]);
}
function buildPayroll(sourceRows = payrollRecordsForReport(), options = {}) {
  const settings = getPayrollSettings();
  const mode = options.splitModeOverride || (options.useUi === false ? settings.splitMode : (els.payrollSplitMode?.value || settings.splitMode || "crew-rate"));
  const selected = options.selectedWorkers || reportSelectedInstallers();
  const statusMode = options.statusModeOverride || (options.useUi === false ? "all-active" : (els.payrollStatusMode?.value || settings.statusMode || "completed"));
  const source = statusMode === "completed" ? sourceRows.filter((r) => PAYROLL_STATUSES.has((r.fields || {})["Статус"] || "")) : statusMode === "all-active" ? sourceRows.filter((r) => !TRASH_STATUSES.has((r.fields || {})["Статус"] || "")) : sourceRows;
  const summary = Object.fromEntries(WORKERS.map((w) => [w, emptyPayrollSummary(w)]));
  const details = [];
  source.forEach((r) => {
    const f = r.fields || {};
    const allNames = splitInstallers(f["Монтажники"]);
    const names = allNames.filter((n) => selected.includes(n));
    if (!names.length) return;
    const totalM2 = getM2(f);
    const crewSize = Math.min(Math.max(allNames.length || names.length || 1, 1), 5);
    names.forEach((name) => {
      const shareM2 = mode === "equal-m2" ? totalM2 / Math.max(allNames.length || names.length, 1) : totalM2;
      const rate = getWorkerRate(settings, name, crewSize, mode);
      const amount = shareM2 * rate;
      const item = summary[name] || emptyPayrollSummary(name);
      item.jobs++;
      item.m2 += shareM2;
      item.amount += amount;
      if (String(f["Дата записи"] || "") >= String(item.last || "")) item.last = f["Дата записи"] || "";
      summary[name] = item;
      details.push({ id: r.id, date: f["Дата записи"] || "", time: f["Время записи"] || "", client: f["Имя клиента"] || "", phone: f["Телефон"] || "", address: f["Адрес"] || "", service: f["Услуга"] || "", status: f["Статус"] || "", worker: name, workerFull: workerLabel(name), installers: displayInstallers(allNames.join(", ")), crewSize, totalM2, shareM2, rate, amount });
    });
  });
  WORKERS.forEach((w) => { const r = settings.rates?.[w] || {}; summary[w].bonus = num(r.bonus); summary[w].advance = num(r.advance); summary[w].comment = r.comment || ""; summary[w].total = summary[w].amount + summary[w].bonus - summary[w].advance; });
  return { summary, details, settings, mode };
}
function renderPayrollPreview() {
  savePayrollSettingsFromForm();
  const payroll = buildPayroll();
  const summaryRows = WORKERS.map((w) => payroll.summary[w]).filter((x) => x.jobs || x.bonus || x.advance);
  const total = summaryRows.reduce((s, x) => s + x.total, 0);
  const modeText = payrollModeText(payroll.mode);
  const summaryHtml = summaryRows.length ? `<h3>Итого к выплате: ${money(total)}</h3><p class="modal-note"><b>Метод:</b> ${e(modeText)}. В детализации показана ставка по количеству монтажников на каждом объекте.</p><div class="table-mini-wrap"><table class="table-mini"><thead><tr><th>Монтажник</th><th>Объектов</th><th>м² к оплате</th><th>Начислено</th><th>Доплата</th><th>Аванс/удерж.</th><th>Итого</th></tr></thead><tbody>${summaryRows.map((x) => `<tr><td><b>${e(workerLabel(x.worker))}</b></td><td>${x.jobs}</td><td>${moneyNumber(x.m2)}</td><td>${money(x.amount)}</td><td>${money(x.bonus)}</td><td>${money(x.advance)}</td><td><b>${money(x.total)}</b></td></tr>`).join("")}</tbody></table></div>` : '<p class="modal-note">По выбранным условиям нет работ для расчёта зарплаты.</p>';
  const detailsHtml = payroll.details.length ? `<h3>Детализация</h3><div class="table-mini-wrap"><table class="table-mini"><thead><tr><th>Дата</th><th>Заявка</th><th>Клиент</th><th>Объект</th><th>Бригада</th><th>Монтажник</th><th>м² к оплате</th><th>Ставка</th><th>Сумма</th></tr></thead><tbody>${payroll.details.slice(0, 120).map((d) => `<tr><td>${e(d.date)}</td><td>#${e(d.id)}</td><td>${e(d.client)}</td><td>${e(d.address)}</td><td>${d.crewSize}</td><td>${e(d.workerFull)}</td><td>${moneyNumber(d.shareM2)}</td><td>${moneyNumber(d.rate)}</td><td>${money(d.amount)}</td></tr>`).join("")}</tbody></table></div>` : "";
  els.reportPreview.innerHTML = summaryHtml + detailsHtml;
}
function downloadPayrollReport() {
  savePayrollSettingsFromForm();
  const { summary, details, settings, mode } = buildPayroll();
  const summaryRows = WORKERS.map((w) => summary[w]).filter((x) => x.jobs || x.bonus || x.advance);
  const format = els.reportFormat?.value || "xls";
  const summaryTable = { title: "Сводка к выплате", headers: ["Сотрудник", "Кратко", "Объектов", "м² к оплате", "Начислено", "Доплата", "Аванс/удержание", "Итого к выплате", "Комментарий"], rows: summaryRows.map((x) => [workerLabel(x.worker), x.worker, x.jobs, moneyNumber(x.m2), moneyNumber(x.amount), moneyNumber(x.bonus), moneyNumber(x.advance), moneyNumber(x.total), x.comment]) };
  const detailsTable = { title: "Детализация по объектам", headers: ["Дата", "Время", "Заявка", "Клиент", "Телефон", "Адрес", "Услуга", "Статус", "Бригада, чел", "Монтажник", "Все монтажники", "Общий м² объекта", "м² к оплате", "Ставка по бригаде", "Сумма"], rows: details.map((d) => [d.date, d.time, "#" + d.id, d.client, d.phone, d.address, d.service, d.status, d.crewSize, d.workerFull, d.installers, moneyNumber(d.totalM2), moneyNumber(d.shareM2), moneyNumber(d.rate), moneyNumber(d.amount)]) };
  const ratesTable = { title: "Ставки за м²", headers: ["Сотрудник", "1 чел", "2 чел", "3 чел", "4 чел", "5 чел", "Доплата", "Аванс/удержание", "Комментарий"], rows: WORKER_PROFILES.map((w) => { const r = settings.rates[w.key] || {}; return [w.full, r[1], r[2], r[3], r[4], r[5], r.bonus, r.advance, r.comment || ""]; }) };
  const metaTable = { title: "Параметры отчёта", headers: ["Параметр", "Значение"], rows: [["Период", `${els.reportDateFrom.value} — ${els.reportDateTo.value}`], ["Метод расчёта", payrollModeText(mode)], ["Статусы", payrollStatusText(els.payrollStatusMode?.value || settings.statusMode)], ["Создан", dateTimeY()]] };
  if (format === "csv") {
    const lines = [];
    [metaTable, ratesTable, summaryTable, detailsTable].forEach((tbl) => { lines.push([tbl.title].join(";")); lines.push(tbl.headers.join(";")); tbl.rows.forEach((row) => lines.push(row.map(csvCell).join(";"))); lines.push(""); });
    downloadText("solncanet_report_payroll.csv", "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
  } else {
    downloadExcel("solncanet_report_payroll.xls", "Отчёт по зарплате монтажников", [metaTable, ratesTable, summaryTable, detailsTable]);
  }
  els.reportDialog.close();
}
function payrollModeText(mode) { return mode === "equal-m2" ? "м² делится поровну, ставка зависит от числа монтажников" : mode === "one-rate-full" ? "полный м² каждому, ставка как за 1 человека" : "полный м² каждому, ставка зависит от числа монтажников"; }
function payrollStatusText(mode) { return mode === "all-active" ? "Все, кроме Отказ / Отменена" : mode === "report-filter" ? "Как выбран статус в фильтре отчёта" : "Только Выполнено и Оплачено"; }
function downloadExcel(filename, title, tables) {
  const style = `<style>body{font-family:Arial}h1{color:#0b2a66}h2{margin-top:22px;color:#0b2a66}table{border-collapse:collapse;margin-bottom:20px}th{background:#0b7a75;color:#fff;font-weight:bold}th,td{border:1px solid #d0d7de;padding:7px 9px}td.num{text-align:right} .total{font-weight:bold;background:#f1f5f9}</style>`;
  const body = `<h1>${escapeHtml(title)}</h1>` + tables.map((tbl) => `<h2>${escapeHtml(tbl.title)}</h2><table><thead><tr>${tbl.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${tbl.rows.map((row) => `<tr>${row.map((cell) => `<td${typeof cell === "number" ? ' class="num"' : ""}>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>${body}</body></html>`;
  downloadText(filename, "\uFEFF" + html, "application/vnd.ms-excel;charset=utf-8");
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function diffFields(oldF, newF) { const labels = { "Дата записи": "дата", "Время записи": "время", "Статус": "статус", "Итоговый м2": "м²", "Ответственный": "ответственный", "Услуга": "услуга", "Адрес": "адрес", "Комментарий администратора": "комментарий администратора", "Монтажники": "монтажники" }; const changes = []; for (const key of Object.keys(newF)) { const oldVal = String(oldF[key] || (key === "Итоговый м2" ? oldF["м2"] || "" : "")).trim(); const newVal = String(newF[key] || "").trim(); if (oldVal !== newVal) changes.push(`${labels[key] || key}: «${oldVal || "—"}» → «${newVal || "—"}»`); } return changes; }
function lastCancelReason(f) { const text = String(f["Комментарий администратора"] || ""); const lines = text.split("\n").filter((x) => x.includes("ОТМЕНА:")); return lines.at(-1) || ""; }
function msg(text) { els.message.textContent = text; }
function e(value) { return String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
function nl2br(value) { return e(value).replace(/\n/g, "<br>"); }
function phoneLink(value) { const phone = String(value || "").trim(); return phone ? `<a href="tel:${e(phone)}">${e(phone)}</a>` : "—"; }
function ymdLocal(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function today() { return dateY(new Date()); }
function monthStart() { return today().slice(0, 8) + "01"; }
function dateY(d) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Yekaterinburg", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d); return parts.find((p) => p.type === "year").value + "-" + parts.find((p) => p.type === "month").value + "-" + parts.find((p) => p.type === "day").value; }
function timeY(d) { return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Yekaterinburg", hour: "2-digit", minute: "2-digit", hour12: false }).format(d); }
function dateTimeY() { const d = new Date(); return dateY(d) + " " + timeY(d); }
function csvCell(value) { return `"${String(value || "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`; }
function canonicalWorker(value) { const raw = String(value || "").trim(); if (!raw) return ""; const n = norm(raw); const found = WORKER_PROFILES.find((w) => w.aliases.some((a) => norm(a) === n) || norm(w.key) === n || norm(w.full) === n); return found ? found.key : raw; }
function workerLabel(key) { return WORKER_BY_KEY[key]?.full || key || ""; }
function displayInstallers(value) { return splitInstallers(value).map(workerLabel).join(", "); }
function splitInstallers(value) { return String(value || "").split(/[,;]+/).map((x) => canonicalWorker(x)).filter(Boolean); }
function getM2(f) { return Number(String(f["Итоговый м2"] || f["м2"] || 0).replace(",", ".")) || 0; }
function num(value) { return Number(String(value || 0).replace(",", ".")) || 0; }
function moneyNumber(value) { return Math.round((Number(value) || 0) * 100) / 100; }
function money(value) { return moneyNumber(value).toLocaleString("ru-RU") + " ₽"; }
function norm(value) { return String(value || "").toLowerCase().replace(/ё/g, "е").trim(); }
function downloadText(filename, content, type = "text/plain;charset=utf-8") { const blob = new Blob([content], { type }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }
