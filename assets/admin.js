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
let selectedInstaller = null;
let filesCache = [];

const storage = {
  password: "solncanet_admin_password_v9",
  history: "solncanet_history_v9",
  payroll: "solncanet_payroll_settings_v9"
};

const els = {
  loginPanel: $("loginPanel"), appPanel: $("appPanel"), loginForm: $("loginForm"), passwordInput: $("passwordInput"), loginMessage: $("loginMessage"), logoutBtn: $("logoutBtn"), refreshBtn: $("refreshBtn"), listBtn: $("listBtn"), calendarBtn: $("calendarBtn"), listView: $("listView"), calendarView: $("calendarView"), requestsBody: $("requestsBody"), calendarGrid: $("calendarGrid"), monthTitle: $("monthTitle"), prevMonth: $("prevMonth"), nextMonth: $("nextMonth"), searchInput: $("searchInput"), statusFilter: $("statusFilter"), installerFilter: $("installerFilter"), dateFrom: $("dateFrom"), dateTo: $("dateTo"), clearFiltersBtn: $("clearFiltersBtn"), message: $("message"), statTotal: $("statTotal"), statNew: $("statNew"), statToday: $("statToday"), statWork: $("statWork"), statVolume: $("statVolume"), statFiltered: $("statFiltered"),
  dialog: $("requestDialog"), dialogTitle: $("dialogTitle"), requestInfo: $("requestInfo"), editDate: $("editDate"), editTime: $("editTime"), editStatus: $("editStatus"), editM2: $("editM2"), editResponsible: $("editResponsible"), editService: $("editService"), editAddress: $("editAddress"), editAdminComment: $("editAdminComment"), saveRequestBtn: $("saveRequestBtn"), cancelRequestBtn: $("cancelRequestBtn"), cancelReason: $("cancelReason"), requestHistoryBox: $("requestHistoryBox"), exportBtn: $("exportBtn"),
  clientsBody: $("clientsBody"), objectsBody: $("objectsBody"), installersBody: $("installersBody"), trashBody: $("trashBody"), historyBody: $("historyBody"), historySearchInput: $("historySearchInput"), clearHistoryLocalBtn: $("clearHistoryLocalBtn"), filesBody: $("filesBody"), filesSearchInput: $("filesSearchInput"), filesTypeFilter: $("filesTypeFilter"),
  quickAddBtn: $("quickAddBtn"), quickAddDialog: $("quickAddDialog"), quickSaveBtn: $("quickSaveBtn"), quickName: $("quickName"), quickPhone: $("quickPhone"), quickService: $("quickService"), quickDate: $("quickDate"), quickTime: $("quickTime"), quickM2: $("quickM2"), quickAddress: $("quickAddress"), quickComment: $("quickComment"),
  reportDialog: $("reportDialog"), reportTitle: $("reportTitle"), reportDateFrom: $("reportDateFrom"), reportDateTo: $("reportDateTo"), reportStatus: $("reportStatus"), reportFormat: $("reportFormat"), reportAllInstallers: $("reportAllInstallers"), downloadReportBtn: $("downloadReportBtn"), payrollOptions: $("payrollOptions"), payrollSplitMode: $("payrollSplitMode"), payrollStatusMode: $("payrollStatusMode"), payrollSettingsBody: $("payrollSettingsBody"), savePayrollSettingsBtn: $("savePayrollSettingsBtn"), previewPayrollBtn: $("previewPayrollBtn"), reportPreview: $("reportPreview"),
  clientsSearchInput: $("clientsSearchInput"), clientsDateFrom: $("clientsDateFrom"), clientsDateTo: $("clientsDateTo"), clientsServiceFilter: $("clientsServiceFilter"), clientsFilmFilter: $("clientsFilmFilter"), clientsStatusFilter: $("clientsStatusFilter"), clientsClearFiltersBtn: $("clientsClearFiltersBtn"), clientsStatCount: $("clientsStatCount"), clientsStatRequests: $("clientsStatRequests"), clientsStatM2: $("clientsStatM2"), clientsStatRepeat: $("clientsStatRepeat"),
  objectsSearchInput: $("objectsSearchInput"), objectsDateFrom: $("objectsDateFrom"), objectsDateTo: $("objectsDateTo"), objectsServiceFilter: $("objectsServiceFilter"), objectsStatusFilter: $("objectsStatusFilter"), objectsInstallerFilter: $("objectsInstallerFilter"), objectsM2Min: $("objectsM2Min"), objectsM2Max: $("objectsM2Max"), objectsClearFiltersBtn: $("objectsClearFiltersBtn"), objectsStatCount: $("objectsStatCount"), objectsStatM2: $("objectsStatM2"), objectsStatDone: $("objectsStatDone"), objectsStatWork: $("objectsStatWork"),
  installersSearchInput: $("installersSearchInput"), installersDateFrom: $("installersDateFrom"), installersDateTo: $("installersDateTo"), installersStatusFilter: $("installersStatusFilter"), installersServiceFilter: $("installersServiceFilter"), installersClearFiltersBtn: $("installersClearFiltersBtn"), installersStatJobs: $("installersStatJobs"), installersStatM2: $("installersStatM2"), installersStatAmount: $("installersStatAmount"), installersStatTotal: $("installersStatTotal"), payrollGuide: $("payrollGuide"),
  installerDetailsPanel: $("installerDetailsPanel"), installerDetailsTitle: $("installerDetailsTitle"), installerDetailsInfo: $("installerDetailsInfo"), installerDetailsCloseBtn: $("installerDetailsCloseBtn"), installerDetailsSearchInput: $("installerDetailsSearchInput"), installerDetailsDateFrom: $("installerDetailsDateFrom"), installerDetailsDateTo: $("installerDetailsDateTo"), installerDetailsStatusFilter: $("installerDetailsStatusFilter"), installerDetailsServiceFilter: $("installerDetailsServiceFilter"), installerDetailsM2Min: $("installerDetailsM2Min"), installerDetailsM2Max: $("installerDetailsM2Max"), installerDetailsClearBtn: $("installerDetailsClearBtn"), installerDetailsStatJobs: $("installerDetailsStatJobs"), installerDetailsStatM2: $("installerDetailsStatM2"), installerDetailsStatAmount: $("installerDetailsStatAmount"), installerDetailsStatRate: $("installerDetailsStatRate"), installerDetailsBody: $("installerDetailsBody")
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
  initFileServiceEvents();
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

  [els.installerDetailsSearchInput, els.installerDetailsDateFrom, els.installerDetailsDateTo, els.installerDetailsStatusFilter, els.installerDetailsServiceFilter, els.installerDetailsM2Min, els.installerDetailsM2Max].forEach((el) => el && el.addEventListener("input", renderInstallerDetails));
  [els.installerDetailsDateFrom, els.installerDetailsDateTo, els.installerDetailsStatusFilter, els.installerDetailsServiceFilter].forEach((el) => el && el.addEventListener("change", renderInstallerDetails));
  if (els.installerDetailsClearBtn) els.installerDetailsClearBtn.addEventListener("click", clearInstallerDetailsFilters);
  if (els.installerDetailsCloseBtn) els.installerDetailsCloseBtn.addEventListener("click", closeInstallerDetails);

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
    await loadFiles(true);
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
    await loadFiles(true);
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

function renderAll() { render(); renderClients(); renderObjects(); renderInstallers(); renderInstallerDetails(); renderTrash(); renderFiles(); renderHistorySection(); }
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
function bindActionButtons() {
  document.querySelectorAll("[data-open]").forEach((button) => button.onclick = () => openRequest(button.dataset.open));
  document.querySelectorAll("[data-restore]").forEach((button) => button.onclick = () => restoreRequest(button.dataset.restore));
  document.querySelectorAll("[data-file-preview]").forEach((button) => button.onclick = () => openFilePreview(button.dataset.filePreview));
  document.querySelectorAll("[data-file-open]").forEach((button) => button.onclick = () => openFileInDrive(button.dataset.fileOpen));
  document.querySelectorAll("[data-file-download]").forEach((button) => button.onclick = () => downloadAdminFile(button.dataset.fileDownload));
  document.querySelectorAll("[data-file-delete]").forEach((button) => button.onclick = () => deleteAdminFile(button.dataset.fileDelete));
}

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
  renderRequestFiles(current.id);
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
  els.installersBody.innerHTML = summaryRows.map((x) => `<tr class="installer-row ${selectedInstaller === x.worker ? "selected" : ""}" data-installer-row="${e(x.worker)}"><td><button class="installer-open-name" data-installer="${e(x.worker)}" type="button"><b>${e(workerLabel(x.worker))}</b><br><small>${e(x.worker)}</small></button></td><td>${x.jobs}</td><td>${moneyNumber(x.m2)}</td><td>${money(x.amount)}</td><td>${money(x.bonus)}</td><td>${money(x.advance)}</td><td><b>${money(x.total)}</b></td><td>${e(x.last || "—")}</td><td><button class="open-btn" data-installer="${e(x.worker)}" type="button">История работ</button></td></tr>`).join("");
  bindInstallerButtons();
}
function bindInstallerButtons() {
  document.querySelectorAll("[data-installer]").forEach((button) => button.onclick = () => openInstallerDetails(button.dataset.installer));
  document.querySelectorAll("[data-installer-row]").forEach((row) => row.ondblclick = () => openInstallerDetails(row.dataset.installerRow));
}
function openInstallerDetails(worker) {
  selectedInstaller = canonicalWorker(worker);
  if (els.installerDetailsPanel) els.installerDetailsPanel.style.display = "block";
  renderInstallers();
  renderInstallerDetails();
  setTimeout(() => els.installerDetailsPanel?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
}
function closeInstallerDetails() {
  selectedInstaller = null;
  if (els.installerDetailsPanel) els.installerDetailsPanel.style.display = "none";
  renderInstallers();
}
function clearInstallerDetailsFilters() {
  [els.installerDetailsSearchInput, els.installerDetailsDateFrom, els.installerDetailsDateTo, els.installerDetailsM2Min, els.installerDetailsM2Max].forEach((el) => { if (el) el.value = ""; });
  [els.installerDetailsStatusFilter, els.installerDetailsServiceFilter].forEach((el) => { if (el) el.value = ""; });
  renderInstallerDetails();
}
function installerDetailRows() {
  if (!selectedInstaller) return [];
  return records.filter((r) => {
    const f = r.fields || {};
    const names = splitInstallers(f["Монтажники"]);
    if (!names.includes(selectedInstaller)) return false;
    const q = norm(els.installerDetailsSearchInput?.value || "");
    const from = els.installerDetailsDateFrom?.value || "";
    const to = els.installerDetailsDateTo?.value || "";
    const status = els.installerDetailsStatusFilter?.value || "";
    const service = els.installerDetailsServiceFilter?.value || "";
    const m2 = getM2(f);
    const date = String(f["Дата записи"] || "");
    const hay = recordHay(f, r.id);
    if (from && date && date < from) return false;
    if (to && date && date > to) return false;
    if (status && f["Статус"] !== status) return false;
    if (service && f["Услуга"] !== service) return false;
    if (els.installerDetailsM2Min?.value !== "" && m2 < num(els.installerDetailsM2Min.value)) return false;
    if (els.installerDetailsM2Max?.value !== "" && m2 > num(els.installerDetailsM2Max.value)) return false;
    if (q && !hay.includes(q)) return false;
    return true;
  }).sort(sortByDateDesc);
}
function payrollDetailsForInstaller(rows) {
  const payroll = buildPayroll(rows, { useUi: false, selectedWorkers: [selectedInstaller], statusModeOverride: "report-filter" });
  const detailsById = new Map();
  payroll.details.filter((d) => d.worker === selectedInstaller).forEach((d) => detailsById.set(String(d.id), d));
  return { payroll, detailsById };
}
function renderInstallerDetails() {
  if (!els.installerDetailsPanel || !selectedInstaller) return;
  const rows = installerDetailRows();
  const { detailsById } = payrollDetailsForInstaller(rows);
  const detailRows = rows.map((r) => {
    const f = r.fields || {};
    const calc = detailsById.get(String(r.id));
    const status = e(f["Статус"] || "");
    return `<tr><td>${e(f["Дата записи"] || "")}<br><small>${e(f["Время записи"] || "")}</small></td><td><b>${e(f["Имя клиента"] || "—")}</b></td><td>${phoneLink(f["Телефон"])}</td><td>${e(f["Адрес"] || "—")}</td><td>${e(f["Услуга"] || "—")}</td><td>${moneyNumber(getM2(f))}</td><td>${e(displayInstallers(f["Монтажники"]) || "—")}</td><td>${calc ? moneyNumber(calc.rate) : "—"}</td><td>${calc ? money(calc.amount) : "—"}</td><td class="status-cell"><span class="status" data-status="${status}">${status || "—"}</span></td><td><button class="open-btn" data-open="${e(r.id)}">Открыть / редактировать</button></td></tr>`;
  });
  const amount = [...detailsById.values()].reduce((s, d) => s + d.amount, 0);
  const m2 = rows.reduce((s, r) => s + getM2(r.fields || {}), 0);
  const rateAvg = m2 ? amount / m2 : 0;
  els.installerDetailsTitle.textContent = `История работ: ${workerLabel(selectedInstaller)}`;
  els.installerDetailsInfo.textContent = `Найдено объектов: ${rows.length}. Можно искать по клиенту, телефону, адресу, услуге, статусу и м².`;
  if (els.installerDetailsStatJobs) els.installerDetailsStatJobs.textContent = rows.length;
  if (els.installerDetailsStatM2) els.installerDetailsStatM2.textContent = moneyNumber(m2);
  if (els.installerDetailsStatAmount) els.installerDetailsStatAmount.textContent = money(amount);
  if (els.installerDetailsStatRate) els.installerDetailsStatRate.textContent = money(rateAvg);
  els.installerDetailsBody.innerHTML = detailRows.join("") || '<tr><td colspan="11">По этому монтажнику ничего не найдено</td></tr>';
  bindActionButtons();
}
function renderTrash() { const arr = records.filter(isTrashRecord).sort(sortByDateDesc); els.trashBody.innerHTML = arr.map((r) => { const f = r.fields || {}; return `<tr><td>${e(f["Дата записи"] || "")}</td><td><b>${e(f["Имя клиента"] || "—")}</b></td><td>${phoneLink(f["Телефон"])}</td><td>${e(f["Услуга"] || "")}</td><td>${e(f["Адрес"] || "")}</td><td>${nl2br(f["Причина отмены"] || lastCancelReason(f) || f["Комментарий администратора"] || "")}</td><td class="status-cell"><span class="status" data-status="${e(f["Статус"] || "")}">${e(f["Статус"] || "—")}</span></td><td><button class="open-btn" data-open="${e(r.id)}">Открыть</button> <button class="restore-btn" data-restore="${e(r.id)}">Восстановить</button></td></tr>`; }).join("") || '<tr><td colspan="8">Корзина пустая</td></tr>'; bindActionButtons(); }
function renderFiles() {
  renderFilesRequestSelect();
  const q = norm(els.filesSearchInput?.value || ""), type = norm(els.filesTypeFilter?.value || "");
  const byRequest = groupFilesByRequest(filesCache);
  const ids = new Set([...records.map((r) => String(r.id)), ...Object.keys(byRequest)]);
  const rows = [...ids].map((id) => ({ record: records.find((r) => String(r.id) === String(id)), id, files: byRequest[id] || [] }))
    .filter(({ record, id, files }) => {
      const f = record?.fields || {};
      const filesText = files.map((file) => [file.originalName, file.fileType, file.contentType, file.client, file.phone, file.address, file.service].join(" ")).join(" ");
      const hay = norm(["#" + id, f["Имя клиента"], f["Телефон"], f["Адрес"], f["Услуга"], f["Статус"], f["Комментарий клиента"], f["Комментарий администратора"], f["Файлы"], filesText].join(" "));
      if (q && !hay.includes(q)) return false;
      if (type && !files.some((file) => fileMatchesType(file, type)) && !norm(f["Файлы"] || "").includes(type)) return false;
      return true;
    })
    .sort((a, b) => String(b.id).localeCompare(String(a.id), "ru", { numeric: true }));

  els.filesBody.innerHTML = rows.map(({ record, id, files }) => {
    const f = record?.fields || {};
    const fileHtml = files.length ? files.map(fileMiniHtml).join("") : e(f["Файлы"] || "Пока нет файлов");
    return `<tr><td>#${e(id)}</td><td>${e(f["Имя клиента"] || files[0]?.client || "—")}</td><td>${phoneLink(f["Телефон"] || files[0]?.phone || "")}</td><td>${e(f["Адрес"] || files[0]?.address || "—")}</td><td>${fileHtml}</td><td class="status-cell"><span class="status" data-status="${e(f["Статус"] || files[0]?.status || "")}">${e(f["Статус"] || files[0]?.status || "—")}</span></td><td>${record ? `<button class="open-btn" data-open="${e(id)}">Открыть</button>` : "—"}</td></tr>`;
  }).join("") || '<tr><td colspan="7">Файлы не найдены</td></tr>';
  bindActionButtons();
}

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
  return { splitMode: "equal-m2", statusMode: "completed", rates };
}
function migratePayrollSettings(saved) {
  const base = defaultPayrollSettings();
  if (!saved || typeof saved !== "object") return base;
  base.splitMode = "equal-m2";
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
  if (els.payrollSplitMode) els.payrollSplitMode.value = "equal-m2";
  if (els.payrollStatusMode) els.payrollStatusMode.value = settings.statusMode || "completed";
  if (!els.payrollSettingsBody) return;
  els.payrollSettingsBody.innerHTML = WORKER_PROFILES.map((w) => { const r = settings.rates?.[w.key] || {}; return `<tr><td><b>${e(w.full)}</b><br><small>${e(w.key)}</small></td><td><input data-payroll-rate="${w.key}" data-crew="1" type="number" step="1" value="${e(r[1] ?? 0)}"></td><td><input data-payroll-rate="${w.key}" data-crew="2" type="number" step="1" value="${e(r[2] ?? 0)}"></td><td><input data-payroll-rate="${w.key}" data-crew="3" type="number" step="1" value="${e(r[3] ?? 0)}"></td><td><input data-payroll-rate="${w.key}" data-crew="4" type="number" step="1" value="${e(r[4] ?? 0)}"></td><td><input data-payroll-rate="${w.key}" data-crew="5" type="number" step="1" value="${e(r[5] ?? 0)}"></td><td><input data-payroll-bonus="${w.key}" type="number" step="1" value="${e(r.bonus || 0)}"></td><td><input data-payroll-advance="${w.key}" type="number" step="1" value="${e(r.advance || 0)}"></td><td><input data-payroll-comment="${w.key}" value="${e(r.comment || "")}"></td></tr>`; }).join("");
}
function savePayrollSettingsFromForm() {
  const settings = defaultPayrollSettings();
  settings.splitMode = "equal-m2";
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
  const mode = "equal-m2";
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
      const shareM2 = totalM2 / Math.max(allNames.length || names.length, 1);
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
  const summaryHtml = summaryRows.length ? `<h3>Итого к выплате: ${money(total)}</h3><div class="table-mini-wrap"><table class="table-mini"><thead><tr><th>Монтажник</th><th>Объектов</th><th>м² к оплате</th><th>Начислено</th><th>Доплата</th><th>Аванс/удерж.</th><th>Итого</th></tr></thead><tbody>${summaryRows.map((x) => `<tr><td><b>${e(workerLabel(x.worker))}</b></td><td>${x.jobs}</td><td>${moneyNumber(x.m2)}</td><td>${money(x.amount)}</td><td>${money(x.bonus)}</td><td>${money(x.advance)}</td><td><b>${money(x.total)}</b></td></tr>`).join("")}</tbody></table></div>` : '<p class="modal-note">По выбранным условиям нет работ для расчёта зарплаты.</p>';
  const detailsHtml = payroll.details.length ? `<h3>Детализация</h3><div class="table-mini-wrap"><table class="table-mini"><thead><tr><th>Дата</th><th>Заявка</th><th>Клиент</th><th>Объект</th><th>Бригада</th><th>Монтажник</th><th>м² к оплате</th><th>Ставка</th><th>Сумма</th></tr></thead><tbody>${payroll.details.slice(0, 120).map((d) => `<tr><td>${e(d.date)}</td><td>#${e(d.id)}</td><td>${e(d.client)}</td><td>${e(d.address)}</td><td>${d.crewSize}</td><td>${e(d.workerFull)}</td><td>${moneyNumber(d.shareM2)}</td><td>${moneyNumber(d.rate)}</td><td>${money(d.amount)}</td></tr>`).join("")}</tbody></table></div>` : "";
  els.reportPreview.innerHTML = summaryHtml + detailsHtml;
}
function downloadPayrollReport() {
  savePayrollSettingsFromForm();
  const format = els.reportFormat?.value || "xls";
  if (format === "csv") return downloadPayrollCsvReport();
  downloadPayrollSmartWorkbook();
  els.reportDialog.close();
}
function downloadPayrollCsvReport() {
  const { summary, details, settings, mode } = buildPayroll();
  const summaryRows = WORKERS.map((w) => summary[w]).filter((x) => x.jobs || x.bonus || x.advance);
  const summaryTable = { title: "Сводка к выплате", headers: ["Сотрудник", "Кратко", "Объектов", "м² к оплате", "Начислено", "Доплата", "Аванс/удержание", "Итого к выплате", "Комментарий"], rows: summaryRows.map((x) => [workerLabel(x.worker), x.worker, x.jobs, moneyNumber(x.m2), moneyNumber(x.amount), moneyNumber(x.bonus), moneyNumber(x.advance), moneyNumber(x.total), x.comment]) };
  const detailsTable = { title: "Детализация по объектам", headers: ["Дата", "Время", "Заявка", "Клиент", "Телефон", "Адрес", "Услуга", "Статус", "Бригада, чел", "Монтажник", "Все монтажники", "Общий м² объекта", "м² к оплате", "Ставка по бригаде", "Сумма"], rows: details.map((d) => [d.date, d.time, "#" + d.id, d.client, d.phone, d.address, d.service, d.status, d.crewSize, d.workerFull, d.installers, moneyNumber(d.totalM2), moneyNumber(d.shareM2), moneyNumber(d.rate), moneyNumber(d.amount)]) };
  const ratesTable = { title: "Ставки за м²", headers: ["Сотрудник", "1 чел", "2 чел", "3 чел", "4 чел", "5 чел", "Доплата", "Аванс/удержание", "Комментарий"], rows: WORKER_PROFILES.map((w) => { const r = settings.rates[w.key] || {}; return [w.full, r[1], r[2], r[3], r[4], r[5], r.bonus, r.advance, r.comment || ""]; }) };
  const metaTable = { title: "Параметры отчёта", headers: ["Параметр", "Значение"], rows: [["Период", `${els.reportDateFrom.value} — ${els.reportDateTo.value}`], ["Метод расчёта", payrollModeText(mode)], ["Статусы", payrollStatusText(els.payrollStatusMode?.value || settings.statusMode)], ["Создан", dateTimeY()]] };
  const lines = [];
  [metaTable, ratesTable, summaryTable, detailsTable].forEach((tbl) => { lines.push([tbl.title].join(";")); lines.push(tbl.headers.join(";")); tbl.rows.forEach((row) => lines.push(row.map(csvCell).join(";"))); lines.push(""); });
  downloadText("solncanet_report_payroll.csv", "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
  els.reportDialog.close();
}
function downloadPayrollSmartWorkbook() {
  const data = buildPayrollWorkbookData();
  const xml = buildPayrollSpreadsheetXml(data);
  const period = `${data.from || "start"}_${data.to || "end"}`.replace(/[^0-9a-zA-Zа-яА-Я_-]+/g, "_");
  downloadText(`solncanet_zp_smart_${period}.xls`, "\uFEFF" + xml, "application/vnd.ms-excel;charset=utf-8");
}
function buildPayrollWorkbookData() {
  const settings = getPayrollSettings();
  const mode = "equal-m2";
  const selected = reportSelectedInstallers();
  const rows = payrollRecordsForReport().slice().sort((a, b) => String((a.fields || {})["Дата записи"] || "").localeCompare(String((b.fields || {})["Дата записи"] || "")) || String(a.id).localeCompare(String(b.id)));
  const mainRows = rows.map((r) => {
    const f = r.fields || {};
    const installers = splitInstallers(f["Монтажники"]);
    return {
      id: String(r.id || ""),
      date: String(f["Дата записи"] || ""),
      time: String(f["Время записи"] || ""),
      status: String(f["Статус"] || ""),
      client: String(f["Имя клиента"] || ""),
      phone: String(f["Телефон"] || ""),
      address: String(f["Адрес"] || ""),
      service: String(f["Услуга"] || ""),
      m2: moneyNumber(getM2(f)),
      installers: installers.map(workerLabel).filter(Boolean).join(", "),
      comment: String(f["Комментарий администратора"] || f["Комментарий"] || "")
    };
  });
  const workers = selected.length ? selected : WORKERS;
  const maxRows = Math.max(mainRows.length + 100, 300);
  return {
    generatedAt: dateTimeY(),
    from: els.reportDateFrom.value || "",
    to: els.reportDateTo.value || "",
    statusText: payrollStatusText(els.payrollStatusMode?.value || settings.statusMode),
    mode,
    modeText: payrollModeText(mode),
    settings,
    workers,
    mainRows,
    maxRows,
    mainHeaderRow: 1,
    mainDataStartRow: 2,
    employeeDataStartRow: 6
  };
}
function buildPayrollSpreadsheetXml(data) {
  const workbookStyles = `
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
    <Style ss:ID="Title"><Font ss:FontName="Arial" ss:Size="16" ss:Bold="1" ss:Color="#0B2A66"/></Style>
    <Style ss:ID="SubTitle"><Font ss:FontName="Arial" ss:Size="10" ss:Color="#4B5563"/><Alignment ss:WrapText="1"/></Style>
    <Style ss:ID="Header"><Interior ss:Color="#0B7A75" ss:Pattern="Solid"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/></Borders></Style>
    <Style ss:ID="Cell"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
    <Style ss:ID="Editable"><Interior ss:Color="#FFF7ED" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDBA74"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDBA74"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDBA74"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDBA74"/></Borders><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
    <Style ss:ID="Formula"><Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/></Borders><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
    <Style ss:ID="Money"><NumberFormat ss:Format="# ##0 ₽"/><Alignment ss:Horizontal="Right"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="Number"><NumberFormat ss:Format="0.00"/><Alignment ss:Horizontal="Right"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
    <Style ss:ID="Kpi"><Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/><Font ss:FontName="Arial" ss:Bold="1" ss:Size="11"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/></Borders></Style>
    <Style ss:ID="Warn"><Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/><Font ss:FontName="Arial" ss:Color="#991B1B" ss:Bold="1"/><Alignment ss:WrapText="1"/></Style>
  </Styles>`;
  const sheets = [
    buildPayrollRatesSheet(data),
    buildPayrollMainSheet(data),
    buildPayrollSummarySheet(data),
    ...data.workers.map((w) => buildPayrollEmployeeSheet(data, w))
  ];
  return `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">\n<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>СОЛНЦАНЕТ</Author><Company>СОЛНЦАНЕТ</Company><Title>Зарплатный отчёт монтажников</Title><Created>${new Date().toISOString()}</Created></DocumentProperties>\n<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel"><WindowHeight>9000</WindowHeight><WindowWidth>16000</WindowWidth><ProtectStructure>False</ProtectStructure><ProtectWindows>False</ProtectWindows></ExcelWorkbook>\n${workbookStyles}\n${sheets.join("\n")}\n</Workbook>`;
}
function buildPayrollRatesSheet(data) {
  const rows = [];
  rows.push(xRow(["Кратко", "Сотрудник", "1 чел", "2 чел", "3 чел", "4 чел", "5 чел", "Доплата", "Аванс / удержание", "Комментарий"].map((h) => xCell(h, "Header"))));
  WORKER_PROFILES.forEach((w) => {
    const r = data.settings.rates?.[w.key] || {};
    rows.push(xRow([
      xCell(w.key, "Cell"), xCell(w.full, "Cell"),
      xCell(num(r[1]), "Editable", "Number"), xCell(num(r[2]), "Editable", "Number"), xCell(num(r[3]), "Editable", "Number"), xCell(num(r[4]), "Editable", "Number"), xCell(num(r[5]), "Editable", "Number"),
      xCell(num(r.bonus), "Editable", "Number"), xCell(num(r.advance), "Editable", "Number"), xCell(r.comment || "", "Editable")
    ]));
  });
  return xWorksheet("Ставки", [16, 24, 12, 12, 12, 12, 12, 14, 18, 36], rows, 1);
}
function buildPayrollMainSheet(data) {
  const rows = [];
  rows.push(xRow(["ID", "Дата", "Время", "Статус", "Клиент", "Телефон", "Адрес / объект", "Услуга", "Общий м²", "Монтажники", "Кол-во монтажников", "Комментарий"].map((h) => xCell(h, "Header"))));
  for (let i = 0; i < data.maxRows; i++) {
    const r = data.mainRows[i] || {};
    rows.push(xRow([
      xCell(r.id || "", "Editable"),
      xCell(r.date || "", "Editable"),
      xCell(r.time || "", "Editable"),
      xCell(r.status || "", "Editable"),
      xCell(r.client || "", "Editable"),
      xCell(r.phone || "", "Editable"),
      xCell(r.address || "", "Editable"),
      xCell(r.service || "", "Editable"),
      xCell(r.m2 || 0, "Editable", "Number"),
      xCell(r.installers || "", "Editable"),
      xCell(0, "Formula", "Number", `=IF(RC[-1]="","",LEN(RC[-1])-LEN(SUBSTITUTE(RC[-1],",",""))+1)`),
      xCell(r.comment || "", "Editable")
    ]));
  }
  return xWorksheet("Монтажи", [12, 12, 10, 18, 24, 18, 42, 28, 12, 46, 14, 46], rows, 1);
}
function buildPayrollSummarySheet(data) {
  const rows = [];
  const start = data.employeeDataStartRow;
  const end = data.employeeDataStartRow + data.maxRows - 1;
  rows.push(xRow(["Сотрудник", "Объектов", "м² к оплате", "Начислено", "Ручные корректировки", "Доплата", "Аванс / удержание", "Итого к выплате", "Комментарий"].map((h) => xCell(h, "Header"))));
  data.workers.forEach((key) => {
    const full = workerLabel(key);
    const rateRow = 2 + WORKERS.indexOf(key);
    const sh = xlSheet(full);
    rows.push(xRow([
      xCell(full, "Cell"),
      xCell(0, "Formula", "Number", `=COUNTIF('${sh}'!R${start}C2:R${end}C2,"<>")`),
      xCell(0, "Formula", "Number", `=SUM('${sh}'!R${start}C11:R${end}C11)`),
      xCell(0, "Formula", "Number", `=SUM('${sh}'!R${start}C13:R${end}C13)`),
      xCell(0, "Formula", "Number", `=SUM('${sh}'!R${start}C14:R${end}C14)`),
      xCell(0, "Formula", "Number", `='Ставки'!R${rateRow}C8`),
      xCell(0, "Formula", "Number", `='Ставки'!R${rateRow}C9`),
      xCell(0, "Formula", "Number", `=RC[-4]+RC[-3]+RC[-2]-RC[-1]`),
      xCell("", "Formula", "String", `='Ставки'!R${rateRow}C10`)
    ]));
  });
  rows.push(xRow([xCell("ИТОГО", "Kpi"), xCell(0, "Kpi", "Number", `=SUM(R[-${data.workers.length}]C:R[-1]C)`), xCell(0, "Kpi", "Number", `=SUM(R[-${data.workers.length}]C:R[-1]C)`), xCell(0, "Kpi", "Number", `=SUM(R[-${data.workers.length}]C:R[-1]C)`), xCell(0, "Kpi", "Number", `=SUM(R[-${data.workers.length}]C:R[-1]C)`), xCell(0, "Kpi", "Number", `=SUM(R[-${data.workers.length}]C:R[-1]C)`), xCell(0, "Kpi", "Number", `=SUM(R[-${data.workers.length}]C:R[-1]C)`), xCell(0, "Kpi", "Number", `=SUM(R[-${data.workers.length}]C:R[-1]C)`), xCell("", "Kpi")]));
  return xWorksheet("Сводка", [28, 12, 14, 16, 20, 14, 18, 18, 32], rows, 1);
}
function buildPayrollEmployeeSheet(data, workerKey) {
  const full = workerLabel(workerKey);
  const key = workerKey;
  const rows = [];
  const start = data.employeeDataStartRow;
  const end = data.employeeDataStartRow + data.maxRows - 1;
  const rateRow = 2 + WORKERS.indexOf(workerKey);
  rows.push(xRow([xCell(full, "Title")], 22));
  rows.push(xRow(["Объектов", "м² к оплате", "Начислено", "Корректировки", "Доплата", "Аванс", "Итого"].map((h) => xCell(h, "Header"))));
  rows.push(xRow([
    xCell(0, "Formula", "Number", `=COUNTIF(R${start}C2:R${end}C2,"<>")`),
    xCell(0, "Formula", "Number", `=SUM(R${start}C11:R${end}C11)`),
    xCell(0, "Formula", "Number", `=SUM(R${start}C13:R${end}C13)`),
    xCell(0, "Formula", "Number", `=SUM(R${start}C14:R${end}C14)`),
    xCell(0, "Formula", "Number", `='Ставки'!R${rateRow}C8`),
    xCell(0, "Formula", "Number", `='Ставки'!R${rateRow}C9`),
    xCell(0, "Formula", "Number", `=RC[-4]+RC[-3]+RC[-2]-RC[-1]`)
  ]));
  rows.push(xRow([xCell("", "Cell")], 6));
  rows.push(xRow(["№", "ID", "Дата", "Статус", "Клиент", "Телефон", "Адрес", "Услуга", "Общий м²", "Бригада", "м² к оплате", "Ставка", "Начислено", "Корректировка", "Итого", "Комментарий"].map((h) => xCell(h, "Header"))));
  for (let i = 0; i < data.maxRows; i++) {
    const mainRow = data.mainDataStartRow + i;
    const test = workerInMainFormula(full, key, mainRow);
    const rateIndex = `MAX(1,MIN(5,'Монтажи'!R${mainRow}C11))`;
    const m2Formula = `=IF(${test},IF('Монтажи'!R${mainRow}C11=0,0,'Монтажи'!R${mainRow}C9/'Монтажи'!R${mainRow}C11),"")`;
    rows.push(xRow([
      xCell(0, "Formula", "Number", `=IF(RC[1]="","",ROW()-${start - 1})`),
      xCell("", "Formula", "String", `=IF(${test},'Монтажи'!R${mainRow}C1,"")`),
      xCell("", "Formula", "String", `=IF(${test},'Монтажи'!R${mainRow}C2,"")`),
      xCell("", "Formula", "String", `=IF(${test},'Монтажи'!R${mainRow}C4,"")`),
      xCell("", "Formula", "String", `=IF(${test},'Монтажи'!R${mainRow}C5,"")`),
      xCell("", "Formula", "String", `=IF(${test},'Монтажи'!R${mainRow}C6,"")`),
      xCell("", "Formula", "String", `=IF(${test},'Монтажи'!R${mainRow}C7,"")`),
      xCell("", "Formula", "String", `=IF(${test},'Монтажи'!R${mainRow}C8,"")`),
      xCell(0, "Formula", "Number", `=IF(${test},'Монтажи'!R${mainRow}C9,"")`),
      xCell(0, "Formula", "Number", `=IF(${test},'Монтажи'!R${mainRow}C11,"")`),
      xCell(0, "Formula", "Number", m2Formula),
      xCell(0, "Formula", "Number", `=IF(RC[-10]="","",INDEX('Ставки'!R2C3:R6C7,MATCH("${xlFormulaText(full)}",'Ставки'!R2C2:R6C2,0),${rateIndex}))`),
      xCell(0, "Formula", "Number", `=IF(RC[-11]="","",RC[-2]*RC[-1])`),
      xCell(0, "Editable", "Number"),
      xCell(0, "Formula", "Number", `=IF(RC[-13]="","",RC[-2]+RC[-1])`),
      xCell("", "Editable")
    ]));
  }
  return xWorksheet(full, [8, 12, 12, 16, 24, 18, 42, 28, 12, 10, 12, 12, 14, 16, 14, 32], rows, 5);
}
function workerInMainFormula(full, key, mainRow) {
  return `OR(ISNUMBER(SEARCH(\"${xlFormulaText(full)}\",'Монтажи'!R${mainRow}C10)),ISNUMBER(SEARCH(\"${xlFormulaText(key)}\",'Монтажи'!R${mainRow}C10)))`;
}
function xWorksheet(name, widths, rows, freezeRow = 0) {
  const cols = widths.map((w) => `<Column ss:Width="${Number(w) * 6}"/>`).join("");
  return `<Worksheet ss:Name="${xmlAttr(xlSheet(name))}"><Table>${cols}${rows.join("")}</Table>${worksheetOptions(freezeRow)}</Worksheet>`;
}
function worksheetOptions(freezeRow) {
  if (!freezeRow) return `<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><PageSetup><Layout x:Orientation="Landscape"/></PageSetup></WorksheetOptions>`;
  return `<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><PageSetup><Layout x:Orientation="Landscape"/></PageSetup><FreezePanes/><FrozenNoSplit/><SplitHorizontal>${freezeRow}</SplitHorizontal><TopRowBottomPane>${freezeRow}</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions>`;
}
function xRow(cells, height) {
  const h = height ? ` ss:Height="${height}"` : "";
  return `<Row${h}>${cells.join("")}</Row>`;
}
function xCell(value, style = "Cell", type = "String", formula = "") {
  const isNumber = type === "Number";
  const dataValue = isNumber ? String(Number(value) || 0) : xmlText(value);
  const formulaAttr = formula ? ` ss:Formula="${xmlAttr(formula)}"` : "";
  return `<Cell ss:StyleID="${style}"${formulaAttr}><Data ss:Type="${isNumber ? "Number" : "String"}">${dataValue}</Data></Cell>`;
}
function xmlText(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function xmlAttr(value) { return xmlText(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
function xlSheet(name) { return String(name || "Лист").replace(/[\\/?*\[\]:]/g, " ").slice(0, 31); }
function xlFormulaText(value) { return String(value || "").replace(/"/g, "\"\""); }
function payrollModeText(mode) { return "м² объекта делится на всех монтажников, ставка берётся по количеству монтажников"; }
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


// === V13: бесплатное файловое хранилище через Google Drive + Apps Script ===
function initFileServiceEvents() {
  const uploadBtn = $("filesUploadBtn");
  const refreshBtn = $("filesRefreshBtn");
  const testBtn = $("googleDriveTestBtn");
  const testBtnSettings = $("googleDriveTestBtnSettings");
  const requestUploadBtn = $("requestUploadBtn");
  const requestFilesRefreshBtn = $("requestFilesRefreshBtn");
  const zone = $("filesDropZone");
  if (uploadBtn) uploadBtn.addEventListener("click", () => uploadFilesFromPanel());
  if (refreshBtn) refreshBtn.addEventListener("click", () => loadFiles(false));
  if (testBtn) testBtn.addEventListener("click", openGoogleDriveTest);
  if (testBtnSettings) testBtnSettings.addEventListener("click", openGoogleDriveTest);
  if (requestUploadBtn) requestUploadBtn.addEventListener("click", () => uploadFilesForCurrentRequest());
  if (requestFilesRefreshBtn) requestFilesRefreshBtn.addEventListener("click", () => loadFiles(false).then(() => current && renderRequestFiles(current.id)));
  if (zone) {
    zone.addEventListener("dragover", (event) => { event.preventDefault(); zone.classList.add("is-dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("is-dragover");
      const input = $("filesUploadInput");
      if (input && event.dataTransfer?.files?.length) input.files = event.dataTransfer.files;
    });
  }
}
async function loadFiles(silent = false) {
  filesCache = parseFilesFromRecords(records);
  renderFiles();
  if (current) renderRequestFiles(current.id);
  if (!silent) setFilesStatus(`Файлов в заявках: ${filesCache.length}`);
}
function setFilesStatus(text) {
  const el = $("filesStatus");
  if (el) el.textContent = text || "";
}

function openGoogleDriveTest() {
  const password = encodeURIComponent(pwd());
  window.open(`/google-drive-test?password=${password}`, "_blank", "noopener");
}
function renderFilesRequestSelect() {
  const select = $("filesRequestSelect");
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = records.slice().sort(sortByDateDesc).map((r) => {
    const f = r.fields || {};
    const label = `#${r.id} — ${f["Имя клиента"] || "без имени"} — ${f["Адрес"] || f["Услуга"] || "без адреса"}`;
    return `<option value="${e(r.id)}">${e(label)}</option>`;
  }).join("") || '<option value="">Нет заявок</option>';
  if (currentValue && [...select.options].some((o) => o.value === currentValue)) select.value = currentValue;
}
function parseRecordFiles(record) {
  const f = record?.fields || {};
  const raw = f["Файлы"] || "";
  if (!raw) return [];
  let list = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) list = parsed;
    else if (parsed && typeof parsed === "object") list = [parsed];
  } catch (_) {
    list = String(raw).split(/\n+/).map((line) => ({ originalName: line.trim(), url: line.trim() })).filter((x) => x.originalName);
  }
  return list.map((file) => normalizeFileMeta(file, record.id, f));
}
function parseFilesFromRecords(sourceRecords) {
  return (sourceRecords || []).flatMap((record) => parseRecordFiles(record)).sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")));
}
function normalizeFileMeta(file, requestId, fields = {}) {
  const id = file.id || file.fileId || String(file.key || "").replace(/^drive:/, "");
  const key = file.key || (id ? `drive:${id}` : `${requestId}-${file.originalName || file.name || Date.now()}`);
  return {
    ...file,
    id,
    key,
    requestId: String(file.requestId || requestId || ""),
    originalName: file.originalName || file.name || "Файл",
    name: file.name || file.originalName || "Файл",
    contentType: file.contentType || file.mimeType || "",
    fileType: file.fileType || fileTypeByMime(file.contentType || file.mimeType || "", file.originalName || file.name || ""),
    size: Number(file.size || 0),
    uploadedAt: file.uploadedAt || "",
    client: file.client || fields["Имя клиента"] || "",
    phone: file.phone || fields["Телефон"] || "",
    address: file.address || fields["Адрес"] || "",
    service: file.service || fields["Услуга"] || "",
    status: file.status || fields["Статус"] || "",
    url: file.url || file.webViewLink || "",
    downloadUrl: file.downloadUrl || file.webContentLink || file.url || file.webViewLink || ""
  };
}
function groupFilesByRequest(files) {
  return (files || []).reduce((acc, file) => {
    const id = String(file.requestId || "");
    if (!id) return acc;
    (acc[id] ||= []).push(file);
    return acc;
  }, {});
}
function fileTypeByMime(mime, name) {
  const m = String(mime || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  if (m.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(n)) return "фото";
  if (m.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm)$/i.test(n)) return "видео";
  if (m.includes("pdf") || /\.pdf$/i.test(n)) return "pdf";
  return "документ";
}
function fileMatchesType(file, type) {
  const t = norm(type);
  const hay = norm([file.fileType, file.contentType, file.originalName, file.name].join(" "));
  if (t === "фото") return hay.includes("фото") || hay.includes("image") || /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(file.originalName || "");
  if (t === "видео") return hay.includes("видео") || hay.includes("video") || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.originalName || "");
  if (t === "pdf") return hay.includes("pdf") || /\.pdf$/i.test(file.originalName || "");
  return hay.includes(t);
}
function fileMiniHtml(file) {
  const isImage = fileMatchesType(file, "фото") && (file.url || file.downloadUrl);
  const thumb = isImage
    ? `<button type="button" class="file-thumb file-thumb-btn" data-file-preview="${e(file.key)}" title="Посмотреть файл"><img src="${e(file.downloadUrl || file.url)}" alt="${e(file.originalName || "Файл")}" loading="lazy"></button>`
    : `<button type="button" class="file-thumb file-thumb-btn file-thumb-icon" data-file-preview="${e(file.key)}" title="Посмотреть файл">${fileIcon(file)}</button>`;
  return `<div class="file-chip"><div class="file-chip__main">${thumb}<span><button type="button" class="file-title-button" data-file-preview="${e(file.key)}">${e(file.originalName || file.name || "Файл")}</button><small>${e(file.fileType || "файл")} · ${formatFileSize(file.size)} · ${e(formatDateTime(file.uploadedAt))}</small></span></div><div class="file-chip__actions"><button type="button" data-file-preview="${e(file.key)}">Посмотреть</button><button type="button" data-file-open="${e(file.key)}">Drive</button><button type="button" data-file-download="${e(file.key)}">Скачать</button><button type="button" class="danger-mini" data-file-delete="${e(file.key)}">Удалить</button></div></div>`;
}
function renderRequestFiles(requestId) {
  const box = $("requestFilesBox");
  if (!box) return;
  const files = filesCache.filter((file) => String(file.requestId) === String(requestId));
  box.innerHTML = files.length ? files.map(fileMiniHtml).join("") : '<p class="muted-text">К этой заявке файлы пока не загружены.</p>';
  bindActionButtons();
}
async function uploadFilesFromPanel() {
  const requestId = $("filesRequestSelect")?.value;
  const input = $("filesUploadInput");
  if (!requestId) return setFilesStatus("Выберите заявку для привязки файлов");
  await uploadFiles(requestId, input?.files, input, setFilesStatus);
}
async function uploadFilesForCurrentRequest() {
  if (!current) return;
  const input = $("requestFileInput");
  await uploadFiles(current.id, input?.files, input, (text) => {
    const box = $("requestFilesBox");
    if (box) box.innerHTML = `<p class="muted-text">${e(text)}</p>`;
  });
}
async function uploadFiles(requestId, fileList, input, statusFn = setFilesStatus) {
  const files = [...(fileList || [])];
  if (!files.length) return statusFn("Выберите файлы для загрузки");
  const record = records.find((r) => String(r.id) === String(requestId));
  if (!record) return statusFn("Заявка не найдена. Обновите список заявок.");
  const f = record.fields || {};
  const form = new FormData();
  form.append("requestId", String(requestId));
  form.append("client", f["Имя клиента"] || "");
  form.append("phone", f["Телефон"] || "");
  form.append("address", f["Адрес"] || "");
  form.append("service", f["Услуга"] || "");
  form.append("status", f["Статус"] || "");
  files.forEach((file) => form.append("files", file, file.name));
  statusFn(`Загружаю в Google Drive: ${files.length}...`);
  try {
    const response = await fetch("/upload-file", { method: "POST", headers: { "x-admin-password": pwd() }, body: form });
    const data = await response.json().catch(() => ({ ok: false, error: "Cloudflare Function вернула не JSON" }));
    if (!response.ok || !data.uploaded?.length) {
      const details = [data.hint, data.details?.hint, data.details?.rawSnippet].filter(Boolean).join(" | ");
      throw new Error((data.error || "Ошибка загрузки") + (details ? " — " + details : ""));
    }
    const uploaded = data.uploaded.map((file) => normalizeFileMeta(file, requestId, f));
    const merged = [...parseRecordFiles(record), ...uploaded];
    let history = getHistoryForRecord(record);
    history = addHistory(record, "Загрузка файлов в Google Drive", uploaded.map((x) => x.originalName).join(", "), history);
    await updateRecord(requestId, { "Файлы": JSON.stringify(merged), "История изменений": JSON.stringify(history) }, "Файлы загружены");
    if (input) input.value = "";
    await load();
    statusFn(`Загружено файлов: ${uploaded.length}. Данные сохранены в заявке.`);
  } catch (error) {
    statusFn("Ошибка загрузки: " + error.message);
  }
}

function fileIcon(file) {
  const type = String(file.fileType || "").toLowerCase();
  if (type.includes("pdf")) return "PDF";
  if (type.includes("видео")) return "▶";
  if (type.includes("фото")) return "IMG";
  return "DOC";
}
function getDriveFileId(file) {
  return String(file.id || file.fileId || String(file.key || "").replace(/^drive:/, "") || "").trim();
}
function fileDrivePreviewUrl(file) {
  const id = getDriveFileId(file);
  if (file.previewUrl) return file.previewUrl;
  if (id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  return file.url || file.webViewLink || file.downloadUrl || "";
}
function fileOpenUrl(file) {
  return file.url || file.webViewLink || fileDrivePreviewUrl(file) || file.downloadUrl || "";
}
function fileDownloadUrl(file) {
  const id = getDriveFileId(file);
  return file.downloadUrl || (id ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}` : fileOpenUrl(file));
}
function openFileInDrive(key) {
  const file = filesCache.find((x) => x.key === key);
  if (!file) return msg("Файл не найден. Обновите страницу.");
  const url = fileOpenUrl(file);
  if (!url) return msg("У файла нет ссылки Google Drive");
  window.open(url, "_blank", "noopener");
}
function openFilePreview(key) {
  const file = filesCache.find((x) => x.key === key);
  if (!file) return msg("Файл не найден. Обновите страницу.");
  const dialog = $("filePreviewDialog");
  const title = $("filePreviewTitle");
  const meta = $("filePreviewMeta");
  const content = $("filePreviewContent");
  const openLink = $("filePreviewOpenLink");
  const downloadLink = $("filePreviewDownloadLink");
  if (!dialog || !title || !content) return openFileInDrive(key);

  title.textContent = file.originalName || file.name || "Просмотр файла";
  meta.innerHTML = `Заявка: <b>#${e(file.requestId || "—")}</b> · Клиент: <b>${e(file.client || "—")}</b> · Тип: <b>${e(file.fileType || "файл")}</b> · Размер: <b>${formatFileSize(file.size)}</b><br>Адрес: ${e(file.address || "—")}`;

  const previewUrl = fileDrivePreviewUrl(file);
  const downloadUrl = fileDownloadUrl(file);
  const openUrl = fileOpenUrl(file);
  if (openLink) openLink.href = openUrl || previewUrl || "#";
  if (downloadLink) downloadLink.href = downloadUrl || openUrl || previewUrl || "#";

  if (fileMatchesType(file, "фото")) {
    content.innerHTML = `<img src="${e(downloadUrl || openUrl || previewUrl)}" alt="${e(file.originalName || "Файл")}">`;
  } else if (fileMatchesType(file, "видео")) {
    if (getDriveFileId(file)) content.innerHTML = `<iframe class="file-preview-frame" src="${e(previewUrl)}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    else content.innerHTML = `<video class="file-preview-video" controls src="${e(downloadUrl || openUrl)}"></video>`;
  } else if (fileMatchesType(file, "pdf") || getDriveFileId(file)) {
    content.innerHTML = `<iframe class="file-preview-frame" src="${e(previewUrl)}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  } else {
    content.innerHTML = `<div class="file-preview-empty">Предпросмотр для этого типа файла может быть недоступен.<br><br><a class="dialog-link-button" href="${e(openUrl || downloadUrl)}" target="_blank" rel="noopener">Открыть файл</a></div>`;
  }

  dialog.showModal();
}

async function downloadAdminFile(key) {
  const file = filesCache.find((x) => x.key === key);
  if (!file) return msg("Файл не найден в заявках. Обновите страницу.");
  const url = fileDownloadUrl(file);
  if (!url) return msg("У файла нет ссылки Google Drive");
  window.open(url, "_blank", "noopener");
}
async function deleteAdminFile(key) {
  const file = filesCache.find((x) => x.key === key);
  if (!file) return msg("Файл не найден в заявках. Обновите страницу.");
  if (!confirm("Удалить файл из Google Drive и убрать его из заявки?")) return;
  try {
    const response = await fetch("/delete-file", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pwd() }, body: JSON.stringify({ fileId: file.id, key: file.key }) });
    const data = await response.json().catch(() => ({ ok: false, error: "Cloudflare Function вернула не JSON" }));
    if (!response.ok || !data.ok) {
      const details = [data.hint, data.details?.hint, data.details?.rawSnippet].filter(Boolean).join(" | ");
      throw new Error((data.error || "Не удалось удалить файл") + (details ? " — " + details : ""));
    }
    const record = records.find((r) => String(r.id) === String(file.requestId));
    if (record) {
      const kept = parseRecordFiles(record).filter((x) => x.key !== key);
      let history = getHistoryForRecord(record);
      history = addHistory(record, "Удаление файла", file.originalName || file.name || "Файл", history);
      await updateRecord(record.id, { "Файлы": JSON.stringify(kept), "История изменений": JSON.stringify(history) }, "Файл удалён");
    }
    await load();
  } catch (error) { msg(error.message); }
}
function formatFileSize(bytes) {
  const n = Number(bytes || 0);
  if (!n) return "0 Б";
  if (n < 1024) return n + " Б";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1).replace(".", ",") + " КБ";
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1).replace(".", ",") + " МБ";
  return (n / 1024 / 1024 / 1024).toFixed(1).replace(".", ",") + " ГБ";
}
function formatDateTime(value) {
  if (!value) return "";
  try { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Yekaterinburg" }).format(new Date(value)); } catch (_) { return value; }
}
