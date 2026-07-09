/* СОЛНЦАНЕТ v63: авто-отчет с суммами и расчетом ЗП */
(function () {
  "use strict";

  const VERSION = "v63-auto-report";

  const AUTO_SERVICE_RATES = [
    { keys: ["задняя полусфера", "зад.полусфера", "зад полусфера"], title: "Задняя полусфера", pay: 3000 },
    { keys: ["передняя полусфера", "пер.полусфера", "передние боковые", "пер боковые"], title: "Передняя полусфера", pay: 4000 },
    { keys: ["боковые стекла", "боковые", "задние боковые"], title: "Боковые стекла", pay: 2000 },
    { keys: ["1 боковое", "одно боковое"], title: "1 боковое стекло", pay: 1000 },
    { keys: ["заднее стекло", "зад стекло"], title: "Заднее стекло", pay: 1500 },
    { keys: ["лобовое атерм", "атермальное лобовое", "обычное лобовое", "лобовое стекло", "лобовое"], title: "Лобовое стекло", pay: 2000 },
    { keys: ["полоса на крышу", "полоса крыша"], title: "Полоса на крышу", pay: 2000 },
    { keys: ["полоса на лоб", "полоса лоб", "полоса лобовое"], title: "Полоса на лобовое", pay: 1200 },
    { keys: ["панорамная крыша", "панорама"], title: "Панорамная крыша", pay: 4000 },
    { keys: ["люк"], title: "Люк", pay: 1000 },
    { keys: ["демонтаж пленки", "демонтаж плёнки"], title: "Демонтаж пленки", pay: 0.5, mode: "half" },
    { keys: ["демонтаж клея"], title: "Демонтаж клея", pay: 0.5, mode: "half" },
    { keys: ["бронирование лобового", "брон. лобового", "брон лобового"], title: "Бронирование лобового", pay: 6000 },
    { keys: ["бронирование фар", "брон. фар", "брон фар"], title: "Бронирование фар", pay: 2000 },
    { keys: ["бронирование 1 фары", "брон. 1 фары", "1 фары"], title: "Бронирование 1 фары", pay: 1000 },
    { keys: ["туманок", "противотуманных"], title: "Бронирование туманок", pay: 500 },
    { keys: ["порогов", "пороги"], title: "Бронирование порогов", pay: 500 },
    { keys: ["антиблик", "антибликовая пленка", "антибликовая плёнка"], title: "Антиблик на монитор", pay: 700 }
  ];

  function get(obj, names) {
    for (const name of names) {
      if (obj && obj[name] !== undefined && obj[name] !== null && obj[name] !== "") return obj[name];
    }
    return "";
  }

  function money(value) {
    if (typeof value === "number") return value;
    const text = String(value || "").replace(/\s/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
    const num = Number(text);
    return Number.isFinite(num) ? num : 0;
  }

  function normalizeText(text) {
    return String(text || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  }

  function parseServices(raw) {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw.flatMap(parseServices);
    }

    if (typeof raw === "object") {
      const title = raw.title || raw.name || raw.service || raw["Услуга"] || raw["Название"] || "";
      const amount = money(raw.amount || raw.price || raw.sum || raw["Сумма"] || raw["Стоимость"] || 0);
      return title ? [{ title: String(title), amount }] : [];
    }

    const text = String(raw).trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      return parseServices(parsed);
    } catch {}

    return text
      .split(/\n|\+|;|,/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/(.+?)(?:[:=\-–—]\s*)?([0-9][0-9\s.,]*)\s*(?:₽|руб)?$/i);
        if (match && match[1].trim().length > 2) return { title: match[1].trim(), amount: money(match[2]) };
        return { title: part, amount: 0 };
      });
  }

  function matchRate(serviceTitle) {
    const normalized = normalizeText(serviceTitle);
    return AUTO_SERVICE_RATES.find((rate) => rate.keys.some((key) => normalized.includes(normalizeText(key))));
  }

  function calculateServicePayroll(service) {
    const rate = matchRate(service.title);
    if (!rate) return { pay: 0, rateTitle: "Не найдено в ставках", needsCheck: true };
    if (rate.mode === "half") {
      const amount = money(service.amount);
      return { pay: amount ? Math.round(amount * rate.pay) : 0, rateTitle: `${rate.title}: 50/50`, needsCheck: !amount };
    }
    return { pay: rate.pay, rateTitle: rate.title, needsCheck: false };
  }

  function calculateRecord(record) {
    const direction = get(record, ["Направление", "direction", "Direction"]);
    const auto = get(record, ["Авто", "auto", "car", "Автомобиль"]);
    const film = get(record, ["Пленка", "Плёнка", "film", "Материал"]);
    const servicesRaw = get(record, ["Авто услуги", "Авто услуги JSON", "autoServices", "Услуги", "service", "Услуга"]);
    const total = money(get(record, ["Общая стоимость", "Сумма", "sum", "amount", "Стоимость", "Цена"]));
    const services = parseServices(servicesRaw);
    const calculated = services.map((service) => ({ ...service, ...calculateServicePayroll(service) }));
    const payroll = calculated.reduce((sum, service) => sum + money(service.pay), 0);

    return {
      id: get(record, ["Id", "id", "ID"]),
      date: get(record, ["Дата", "date", "Date"]),
      time: get(record, ["Время", "time", "Time"]),
      status: get(record, ["Статус", "status", "Status"]),
      client: get(record, ["Имя", "ФИО", "Клиент", "name", "client"]),
      phone: get(record, ["Телефон", "phone", "Phone"]),
      direction,
      auto,
      film,
      services,
      calculated,
      total,
      payroll,
      needsCheck: calculated.some((s) => s.needsCheck) || !services.length
    };
  }

  function isAutoRecord(record) {
    const direction = normalizeText(get(record, ["Направление", "direction", "Direction"]));
    const auto = get(record, ["Авто", "auto", "car", "Автомобиль"]);
    const services = get(record, ["Авто услуги", "Авто услуги JSON", "autoServices"]);
    return direction.includes("авто") || Boolean(auto) || Boolean(services);
  }

  function inPeriod(row, options) {
    const date = String(row.date || "").slice(0, 10);
    if (options?.dateFrom && date && date < options.dateFrom) return false;
    if (options?.dateTo && date && date > options.dateTo) return false;
    if (options?.status && options.status !== "Все" && row.status !== options.status) return false;
    return true;
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCsv(filename, rows) {
    const csv = "\ufeff" + rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  }

  async function loadRecordsFromServer() {
    if (!window.SOLNCANET_V63?.nocodb?.list) throw new Error("Не подключен admin-v63-nocodb-safe.js");
    const payload = await window.SOLNCANET_V63.nocodb.list({ limit: 1000 });
    return window.SOLNCANET_V63.normalize.list(payload);
  }

  async function downloadFromServer(options) {
    const records = await loadRecordsFromServer();
    return download(records, options);
  }

  function download(records, options) {
    const rows = (records || [])
      .filter(isAutoRecord)
      .map(calculateRecord)
      .filter((row) => inPeriod(row, options || {}));

    const header = [
      "ID", "Дата", "Время", "Статус", "Клиент", "Телефон", "Авто", "Пленка", "Услуги", "Сумма заказа, ₽", "Начислено ЗП, ₽", "Проверить"
    ];

    const body = rows.map((row) => [
      row.id,
      row.date,
      row.time,
      row.status,
      row.client,
      row.phone,
      row.auto,
      row.film,
      row.calculated.map((s) => `${s.title} / ${s.rateTitle} / ЗП ${s.pay}`).join("; "),
      row.total,
      row.payroll,
      row.needsCheck ? "Да" : ""
    ]);

    const totalAmount = rows.reduce((sum, row) => sum + row.total, 0);
    const totalPayroll = rows.reduce((sum, row) => sum + row.payroll, 0);
    const footer = [["", "", "", "", "", "", "", "ИТОГО", "", totalAmount, totalPayroll, ""]];

    const filename = `solncanet_auto_zp_v63_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, [header, ...body, ...footer]);

    if (window.SOLNCANET_V63?.ui?.message) {
      window.SOLNCANET_V63.ui.message(`Авто-отчет v63 скачан. Строк: ${rows.length}. Сумма: ${totalAmount} ₽. ЗП: ${totalPayroll} ₽.`, false);
    }

    return { rows, totalAmount, totalPayroll };
  }

  function installButton() {
    const target = document.getElementById("downloadReportBtn") || document.getElementById("exportBtn") || document.querySelector(".actions");
    if (!target || document.getElementById("downloadAutoReportV63Btn")) return;

    const button = document.createElement("button");
    button.id = "downloadAutoReportV63Btn";
    button.type = "button";
    button.textContent = "Авто-отчет ЗП v63";
    button.style.marginLeft = "8px";
    button.addEventListener("click", async () => {
      try {
        button.disabled = true;
        button.textContent = "Скачиваю...";
        const dateFrom = document.getElementById("reportDateFrom")?.value || document.getElementById("dateFrom")?.value || "";
        const dateTo = document.getElementById("reportDateTo")?.value || document.getElementById("dateTo")?.value || "";
        const status = document.getElementById("reportStatus")?.value || "";
        await downloadFromServer({ dateFrom, dateTo, status });
      } catch (error) {
        if (window.SOLNCANET_V63?.ui?.message) window.SOLNCANET_V63.ui.message(error.message, true);
        else alert(error.message);
      } finally {
        button.disabled = false;
        button.textContent = "Авто-отчет ЗП v63";
      }
    });

    if (target.tagName === "BUTTON") target.insertAdjacentElement("afterend", button);
    else target.appendChild(button);
  }

  window.SOLNCANET_V63 = window.SOLNCANET_V63 || {};
  window.SOLNCANET_V63.autoReport = {
    version: VERSION,
    rates: AUTO_SERVICE_RATES,
    parseServices,
    calculateRecord,
    download,
    downloadFromServer,
    installButton
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installButton);
  } else {
    installButton();
  }

  console.info("СОЛНЦАНЕТ", VERSION, "installed");
})();
