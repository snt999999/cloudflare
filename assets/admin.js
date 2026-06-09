const LS_PASSWORD_KEY = "solncanet_admin_password_showcase_v3";
const WORKERS = ["Никита П", "Андрей Ш", "Никита К", "Дмитрий П", "Роман З"];
const WORKER_FULL_NAMES = {
  "Никита П": "Пахнев Никита",
  "Андрей Ш": "Шолохов Андрей",
  "Никита К": "Кислов Никита",
  "Дмитрий П": "Петухов Дмитрий",
  "Роман З": "Зинченко Роман"
};
const $ = (id) => document.getElementById(id);
let records = [];
let currentRecord = null;
let activeTab = "all";

const els = {
  loginPanel: $("loginPanel"), appPanel: $("appPanel"), loginForm: $("loginForm"), passwordInput: $("passwordInput"),
  loginMessage: $("loginMessage"), loginBtn: $("loginBtn"), logoutBtn: $("logoutBtn"), refreshBtn: $("refreshBtn"),
  exportOpenBtn: $("exportOpenBtn"), exportDialog: $("exportDialog"), exportExcelBtn: $("exportExcelBtn"),
  exportFrom: $("exportFrom"), exportTo: $("exportTo"), exportAllWorkers: $("exportAllWorkers"),
  requestsBody: $("requestsBody"), statusFilter: $("statusFilter"), searchInput: $("searchInput"),
  dateFrom: $("dateFrom"), dateTo: $("dateTo"), message: $("message"), statTotal: $("statTotal"), statNew: $("statNew"),
  statToday: $("statToday"), statWork: $("statWork"), statPaid: $("statPaid"), dialog: $("requestDialog"),
  dialogTitle: $("dialogTitle"), dClient: $("dClient"), dPhone: $("dPhone"), dDate: $("dDate"), dTime: $("dTime"),
  dService: $("dService"), dAddress: $("dAddress"), dComment: $("dComment"), editStatus: $("editStatus"), editM2: $("editM2"),
  editResponsible: $("editResponsible"), editObjectCreated: $("editObjectCreated"), editAdminComment: $("editAdminComment"),
  saveRequestBtn: $("saveRequestBtn")
};

init();

function init() {
  const saved = localStorage.getItem(LS_PASSWORD_KEY);
  if (saved) validateAndEnter(saved);

  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwd = els.passwordInput.value.trim();
    if (!pwd) return;
    await validateAndEnter(pwd);
  });

  els.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_PASSWORD_KEY);
    records = [];
    els.requestsBody.innerHTML = "";
    showLogin();
  });

  els.refreshBtn.addEventListener("click", loadRequests);
  els.exportOpenBtn.addEventListener("click", openExportDialog);
  els.exportExcelBtn.addEventListener("click", exportExcel);
  els.exportAllWorkers.addEventListener("change", toggleExportWorkers);

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
    btn.addEventListener("click", () => { els.editStatus.value = btn.dataset.statusSet; });
  });

  document.querySelectorAll('input[name="exportWorker"]').forEach(cb => {
    cb.addEventListener("change", () => {
      if ([...document.querySelectorAll('input[name="exportWorker"]')].some(x => x.checked)) {
        els.exportAllWorkers.checked = false;
      }
    });
  });

  els.saveRequestBtn.addEventListener("click", saveCurrentRequest);
}

async function validateAndEnter(pwd) {
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
    setTimeout(hideMessage, 1400);
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
    setTimeout(hideMessage, 1300);
  } catch (err) {
    showMessage(err.message, "error");
  }
}

function render() {
  const filtered = filterRecords(records);
  els.requestsBody.innerHTML = filtered.map(rowHtml).join("") || `<tr><td colspan="10">Заявок по текущим фильтрам нет.</td></tr>`;
  updateStats(records);
  document.querySelectorAll("[data-open-id]").forEach(btn => btn.addEventListener("click", () => openDialog(btn.dataset.openId)));
}

function filterRecords(items) {
  const status = els.statusFilter.value;
  const search = els.searchInput.value.trim().toLowerCase();
  const from = els.dateFrom.value;
  const to = els.dateTo.value;
  const today = todayYmd();

  return items.filter(r => {
    const f = r.fields || {};
    const date = String(f["Дата записи"] || "");

    if (activeTab === "new" && String(f["Статус"] || "") !== "Новая заявка") return false;
    if (activeTab === "today" && date !== today) return false;
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
    <td>${esc(shorten(f["Адрес"], 68) || "—")}</td>
    <td>${esc(f["Итоговый м2"] || f["м2"] || "—")}</td>
    <td>${esc(f["Монтажники"] || "—")}</td>
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
  els.editAdminComment.value = f["Комментарий администратора"] || "";

  setInstallerCheckboxes(splitInstallers(f["Монтажники"] || ""));

  els.dialog.showModal();
}

async function saveCurrentRequest() {
  if (!currentRecord) return;

  const fields = {
    "Статус": els.editStatus.value,
    "Ответственный": els.editResponsible.value.trim(),
    "Комментарий администратора": els.editAdminComment.value.trim(),
    "Монтажники": getSelectedInstallers().join(", "),
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

function getSelectedInstallers() {
  return [...document.querySelectorAll('input[name="installer"]:checked')].map(cb => cb.value);
}

function setInstallerCheckboxes(names) {
  document.querySelectorAll('input[name="installer"]').forEach(cb => {
    cb.checked = names.includes(cb.value);
  });
}

function splitInstallers(value) {
  return String(value || "")
    .split(/[,;]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

function openExportDialog() {
  const today = todayYmd();
  if (!els.exportFrom.value) els.exportFrom.value = today.slice(0, 8) + "01";
  if (!els.exportTo.value) els.exportTo.value = today;
  els.exportDialog.showModal();
}

function toggleExportWorkers() {
  if (els.exportAllWorkers.checked) {
    document.querySelectorAll('input[name="exportWorker"]').forEach(cb => cb.checked = false);
  }
}

function selectedExportWorkers() {
  if (els.exportAllWorkers.checked) return WORKERS.slice();
  const selected = [...document.querySelectorAll('input[name="exportWorker"]:checked')].map(cb => cb.value);
  return selected.length ? selected : WORKERS.slice();
}

function exportExcel() {
  const from = els.exportFrom.value;
  const to = els.exportTo.value;
  const allowedWorkers = selectedExportWorkers();
  const rows = recordsToObjectRows(records, from, to, allowedWorkers);

  if (!rows.length) {
    showMessage("Нет данных для выгрузки по выбранным условиям.", "error");
    return;
  }

  const files = buildXlsxFiles(rows, allowedWorkers);
  const blobBytes = zipStore(files);
  const blob = new Blob([blobBytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `solncanet_zp_${from || "start"}_${to || "end"}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  els.exportDialog.close();
}

function recordsToObjectRows(items, from, to, allowedWorkers) {
  const out = [];

  items.forEach(r => {
    const f = r.fields || {};
    const date = String(f["Дата записи"] || "");
    if (from && date && date < from) return;
    if (to && date && date > to) return;

    const installers = splitInstallers(f["Монтажники"] || "");
    const hasAllowed = installers.some(name => allowedWorkers.includes(name));
    if (!hasAllowed) return;

    out.push({
      date,
      time: String(f["Время записи"] || ""),
      client: String(f["Имя клиента"] || ""),
      phone: String(f["Телефон"] || ""),
      address: String(f["Адрес"] || ""),
      service: String(f["Услуга"] || ""),
      objectM2: normalizeNumber(f["Итоговый м2"] || f["м2"] || ""),
      installers,
      status: String(f["Статус"] || ""),
      adminComment: String(f["Комментарий администратора"] || ""),
      bookingId: String(f["Cal Booking ID"] || "")
    });
  });

  return out;
}

/* -----------------------------
   НАСТОЯЩИЙ .XLSX: Объекты + Ставки + Итоги
   ----------------------------- */

function buildXlsxFiles(rows, selectedWorkers) {
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    "docProps/core.xml": coreXml(),
    "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>СОЛНЦАНЕТ CRM</Application></Properties>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Объекты" sheetId="1" r:id="rId1"/>
    <sheet name="Ставки" sheetId="2" r:id="rId2"/>
    <sheet name="Итоги" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    "xl/styles.xml": stylesXml(),
    "xl/worksheets/sheet1.xml": objectsSheetXml(rows),
    "xl/worksheets/sheet2.xml": ratesSheetXml(),
    "xl/worksheets/sheet3.xml": totalsSheetXml(selectedWorkers)
  };
}

function coreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>СОЛНЦАНЕТ ЗП</dc:title><dc:creator>СОЛНЦАНЕТ CRM</dc:creator><cp:lastModifiedBy>СОЛНЦАНЕТ CRM</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE11D2E"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`;
}

function objectsSheetXml(rows) {
  const headers = ["Дата","Время","Клиент","Телефон","Адрес / объект","Услуга","Общий м2","Никита П","Андрей Ш","Никита К","Дмитрий П","Роман З","Кол-во монтажников","М2 на человека","Ставка Никита П","Сумма Никита П","Ставка Андрей Ш","Сумма Андрей Ш","Ставка Никита К","Сумма Никита К","Ставка Дмитрий П","Сумма Дмитрий П","Ставка Роман З","Сумма Роман З","Статус","Комментарий","Cal Booking ID"];
  const rateSum = {"Никита П":["O","P","H"],"Андрей Ш":["Q","R","I"],"Никита К":["S","T","J"],"Дмитрий П":["U","V","K"],"Роман З":["W","X","L"]};
  const xmlRows = [rowXmlCells(1, headers.map(v => ({ v, type:"s", style:1 })))];
  rows.forEach((r, idx) => {
    const n = idx + 2;
    const cells = [{v:r.date,type:"s"},{v:r.time,type:"s"},{v:r.client,type:"s"},{v:r.phone,type:"s"},{v:r.address,type:"s"},{v:r.service,type:"s"},{v:r.objectM2,type:"n",style:2}];
    WORKERS.forEach(w => cells.push({ v:r.installers.includes(w) ? "Да" : "Нет", type:"s" }));
    cells.push({ formula:`COUNTIF(H${n}:L${n},"Да")`, v:0, type:"n", style:4 });
    cells.push({ formula:`IF(M${n}>0,G${n}/M${n},0)`, v:0, type:"n", style:2 });
    WORKERS.forEach(w => {
      const [rateCol, sumCol, workerCol] = rateSum[w];
      cells.push({ formula:`IF(${workerCol}${n}="Да",VLOOKUP("${w}",Ставки!$A$2:$G$6,$M${n}+2,FALSE),0)`, v:0, type:"n", style:2 });
      cells.push({ formula:`IF(${workerCol}${n}="Да",$N${n}*${rateCol}${n},0)`, v:0, type:"n", style:2 });
    });
    cells.push({v:r.status,type:"s"},{v:r.adminComment,type:"s"},{v:r.bookingId,type:"s"});
    xmlRows.push(rowXmlCells(n, cells));
  });
  const lastRow = rows.length + 1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:AA${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>
  <cols><col min="1" max="2" width="12" customWidth="1"/><col min="3" max="6" width="22" customWidth="1"/><col min="7" max="7" width="12" customWidth="1"/><col min="8" max="12" width="13" customWidth="1"/><col min="13" max="24" width="16" customWidth="1"/><col min="25" max="27" width="20" customWidth="1"/></cols>
  <sheetData>${xmlRows.join("")}</sheetData><autoFilter ref="A1:AA${lastRow}"/>
  <dataValidations count="5"><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="H2:H1048576"><formula1>"Да,Нет"</formula1></dataValidation><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="I2:I1048576"><formula1>"Да,Нет"</formula1></dataValidation><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="J2:J1048576"><formula1>"Да,Нет"</formula1></dataValidation><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="K2:K1048576"><formula1>"Да,Нет"</formula1></dataValidation><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="L2:L1048576"><formula1>"Да,Нет"</formula1></dataValidation></dataValidations>
</worksheet>`;
}

function ratesSheetXml() {
  const headers = ["Монтажник", "ФИО", "Ставка 1 чел, ₽/м2", "Ставка 2 чел, ₽/м2", "Ставка 3 чел, ₽/м2", "Ставка 4 чел, ₽/м2", "Ставка 5 чел, ₽/м2"];
  const rates = [["Никита П","Пахнев Никита",500,300,300,300,300],["Андрей Ш","Шолохов Андрей",500,300,250,250,250],["Никита К","Кислов Никита",500,250,200,200,200],["Дмитрий П","Петухов Дмитрий",400,200,200,200,200],["Роман З","Зинченко Роман",400,200,200,200,200]];
  const xmlRows = [rowXmlCells(1, headers.map(v => ({v,type:"s",style:3})))];
  rates.forEach((row, idx) => xmlRows.push(rowXmlCells(idx + 2, row.map((v, i) => ({v, type:i < 2 ? "s" : "n", style:i < 2 ? 0 : 2})))));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:G6"/><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="2" width="20" customWidth="1"/><col min="3" max="7" width="20" customWidth="1"/></cols><sheetData>${xmlRows.join("")}</sheetData><autoFilter ref="A1:G6"/></worksheet>`;
}

function totalsSheetXml(selectedWorkers) {
  const cols = {"Никита П":["H","N","P"],"Андрей Ш":["I","N","R"],"Никита К":["J","N","T"],"Дмитрий П":["K","N","V"],"Роман З":["L","N","X"]};
  const xmlRows = [rowXmlCells(1, [{v:"Монтажник",type:"s",style:1},{v:"ФИО",type:"s",style:1},{v:"Кол-во объектов",type:"s",style:1},{v:"Итого м2 к оплате",type:"s",style:1},{v:"Итого сумма",type:"s",style:1}])];
  selectedWorkers.forEach((w, idx) => {
    const n = idx + 2, [workerCol, m2Col, sumCol] = cols[w];
    xmlRows.push(rowXmlCells(n, [{v:w,type:"s"},{v:WORKER_FULL_NAMES[w] || w,type:"s"},{formula:`COUNTIF(Объекты!${workerCol}:${workerCol},"Да")`,v:0,type:"n"},{formula:`SUMIF(Объекты!${workerCol}:${workerCol},"Да",Объекты!${m2Col}:${m2Col})`,v:0,type:"n",style:2},{formula:`SUM(Объекты!${sumCol}:${sumCol})`,v:0,type:"n",style:2}]));
  });
  const lastRow = selectedWorkers.length + 1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:E${lastRow}"/><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="2" width="20" customWidth="1"/><col min="3" max="5" width="18" customWidth="1"/></cols><sheetData>${xmlRows.join("")}</sheetData><autoFilter ref="A1:E${lastRow}"/></worksheet>`;
}

function rowXmlCells(rowNumber, cells) {
  return `<row r="${rowNumber}">` + cells.map((c, i) => cellXml(colName(i + 1) + rowNumber, c)).join("") + `</row>`;
}

function cellXml(ref, c) {
  const style = c.style ? ` s="${c.style}"` : "";
  const formula = c.formula ? `<f>${xml(c.formula)}</f>` : "";
  if (c.type === "n") {
    const val = Number.isFinite(Number(c.v)) ? Number(c.v) : 0;
    return `<c r="${ref}"${style}>${formula}<v>${val}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${style}>${formula}<is><t>${xml(c.v)}</t></is></c>`;
}

function colName(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

/* ZIP STORE */
function zipStore(files) {
  const encoder = new TextEncoder();
  const fileEntries = [];
  let offset = 0;
  const chunks = [];

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    chunks.push(local, data);
    fileEntries.push({ nameBytes, dataLength: data.length, crc, offset });
    offset += local.length + data.length;
  });

  const centralOffset = offset;
  fileEntries.forEach(entry => {
    const central = new Uint8Array(46 + entry.nameBytes.length);
    const dv = new DataView(central.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true);
    dv.setUint16(14, 0, true);
    dv.setUint32(16, entry.crc, true);
    dv.setUint32(20, entry.dataLength, true);
    dv.setUint32(24, entry.dataLength, true);
    dv.setUint16(28, entry.nameBytes.length, true);
    dv.setUint16(30, 0, true);
    dv.setUint16(32, 0, true);
    dv.setUint16(34, 0, true);
    dv.setUint16(36, 0, true);
    dv.setUint32(38, 0, true);
    dv.setUint32(42, entry.offset, true);
    central.set(entry.nameBytes, 46);
    chunks.push(central);
    offset += central.length;
  });

  const centralSize = offset - centralOffset;
  const end = new Uint8Array(22);
  const edv = new DataView(end.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, fileEntries.length, true);
  edv.setUint16(10, fileEntries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, centralOffset, true);
  edv.setUint16(20, 0, true);
  chunks.push(end);

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  chunks.forEach(chunk => { out.set(chunk, pos); pos += chunk.length; });
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
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
function xml(v){ return String(v ?? "").replace(/[<>&"']/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;" }[c])); }
function shorten(v,max){ const s=String(v||""); return s.length>max ? s.slice(0,max-1)+"…" : s; }
function phoneLink(v){ const p=String(v||"").trim(); return p ? `<a href="tel:${attr(p)}">${esc(p)}</a>` : "—"; }
function numOrNull(v){ if(v==="" || v===null || v===undefined) return null; const n=Number(String(v).replace(",",".")); return Number.isFinite(n) ? n : null; }
function normalizeNumber(v){ const n=Number(String(v || "").replace(",", ".")); return Number.isFinite(n) ? n : 0; }
function truthy(v){ return v === true || v === "true" || v === 1 || v === "1" || v === "Да"; }
function todayYmd(){ return new Date().toISOString().slice(0,10); }
