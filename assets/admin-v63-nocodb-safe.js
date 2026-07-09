/* СОЛНЦАНЕТ v63: безопасный клиент Cloudflare Functions -> NocoDB */
(function () {
  "use strict";

  const VERSION = "v63-nocodb-safe";
  const TRASH_STATUSES = new Set(["Отменена", "Удалена", "Отказ", "В корзине", "Удаление", "Событие (удаление)", "Событие удалено"]);
  const PAYROLL_STATUSES = new Set(["Выполнено", "Оплачено"]);

  let queue = Promise.resolve();

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function message(text, isError) {
    const el = document.getElementById("message") || document.getElementById("requestGoogleStatus") || document.getElementById("notificationStatus");
    if (el) {
      el.textContent = text || "";
      el.style.color = isError ? "#991b1b" : "#0b2a66";
    }
    if (text) console[isError ? "error" : "info"]("СОЛНЦАНЕТ v63:", text);
  }

  function idempotencyKey(prefix) {
    const random = Math.random().toString(36).slice(2);
    return `${prefix || "op"}-${Date.now()}-${random}`;
  }

  function request(path, options, attempt) {
    attempt = attempt || 0;
    options = options || {};
    const headers = Object.assign({ "content-type": "application/json" }, options.headers || {});

    return fetch(path, Object.assign({}, options, { headers, cache: "no-store" }))
      .then(async (res) => {
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

        const retryable = res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504;
        if (!res.ok && retryable && attempt < 5) {
          const retryAfter = Number(res.headers.get("retry-after"));
          const delay = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : Math.min(10000, 700 * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
          message(`NocoDB занят, повтор через ${Math.round(delay / 1000)} сек...`, false);
          await wait(delay);
          return request(path, options, attempt + 1);
        }

        if (!res.ok || data?.ok === false) {
          const err = new Error(data?.error || data?.message || data?.msg || data?.raw || res.statusText || "Ошибка сохранения");
          err.status = res.status;
          err.data = data;
          throw err;
        }

        return data;
      });
  }

  function enqueue(label, fn) {
    const task = queue.then(async () => {
      try {
        message(label ? `${label}...` : "Сохраняю...", false);
        const result = await fn();
        message(label ? `${label}: готово` : "Готово", false);
        return result;
      } catch (error) {
        const text = error.message && error.message.includes("Too Many Requests")
          ? "NocoDB ограничил частоту запросов. Операция повторена, но сервер всё равно вернул Too Many Requests. Попробуйте еще раз через несколько секунд."
          : error.message || "Ошибка операции";
        message(text, true);
        throw error;
      }
    });

    queue = task.catch(() => null);
    return task;
  }

  function list(params) {
    const qs = new URLSearchParams(params || {});
    return enqueue("Загрузка NocoDB", () => request(`/list-records?${qs.toString()}`, { method: "GET" }));
  }

  function create(data) {
    const key = data?.IdempotencyKey || idempotencyKey("create");
    return enqueue("Создание заявки", () => request("/create-record", {
      method: "POST",
      headers: { "idempotency-key": key },
      body: JSON.stringify({ data: Object.assign({}, data, { IdempotencyKey: key }) })
    }));
  }

  function update(id, data) {
    if (!id) return Promise.reject(new Error("Не передан ID записи для обновления"));
    return enqueue("Сохранение заявки", () => request("/update-record", {
      method: "POST",
      body: JSON.stringify({ id, data })
    }));
  }

  function trash(id, reason) {
    if (!id) return Promise.reject(new Error("Не передан ID записи для удаления"));
    return enqueue("Удаление в корзину", () => request("/delete-record", {
      method: "POST",
      body: JSON.stringify({ id, reason: reason || "Удалено из админки" })
    }));
  }

  function batch(operations) {
    return enqueue("Пакетная операция", () => request("/batch-records", {
      method: "POST",
      body: JSON.stringify({ operations: operations || [] })
    }));
  }

  function normalizeRecord(payload) {
    if (!payload) return payload;
    if (payload.record) return payload.record;
    return payload;
  }

  function normalizeList(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.list)) return payload.list;
    if (Array.isArray(payload?.records)) return payload.records;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  function recordId(record) {
    return record?.Id ?? record?.id ?? record?.ID ?? record?.ncRecordId;
  }

  function recordStatus(record) {
    return record?.Статус || record?.status || record?.Status || "";
  }

  function isTrash(record) {
    return TRASH_STATUSES.has(recordStatus(record));
  }

  function isPayroll(record) {
    return PAYROLL_STATUSES.has(recordStatus(record)) && !isTrash(record);
  }

  function patchArrayById(array, savedPayload) {
    const saved = normalizeRecord(savedPayload);
    const id = String(recordId(saved));
    if (!id || !Array.isArray(array)) return array;
    let replaced = false;
    const next = array.map((item) => {
      if (String(recordId(item)) === id) {
        replaced = true;
        return saved;
      }
      return item;
    });
    if (!replaced) next.unshift(saved);
    return next;
  }

  function clearDeletedCalendarState(record) {
    const id = String(recordId(record) || "");
    const googleId = String(record?.["Google Calendar ID"] || record?.GoogleCalendarId || record?.googleEventId || record?.google_event_id || "");
    const keys = [
      "solncanet_calendar_hidden_v22",
      "solncanet_calendar_moved_v22",
      "solncanet_calendar_imported_v22",
      "solncanet_calendar_deleted_v22"
    ];

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        let value = JSON.parse(raw);
        if (Array.isArray(value)) {
          value = value.filter((x) => String(x) !== id && String(x) !== googleId);
        } else if (value && typeof value === "object") {
          delete value[id];
          delete value[googleId];
        }
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        localStorage.removeItem(key);
      }
    }
  }

  function setButtonBusy(button, busy, busyText) {
    if (!button) return;
    if (busy) {
      button.dataset.v63OldText = button.textContent;
      button.disabled = true;
      button.textContent = busyText || "Сохраняю...";
    } else {
      button.disabled = false;
      if (button.dataset.v63OldText) button.textContent = button.dataset.v63OldText;
      delete button.dataset.v63OldText;
    }
  }

  window.SOLNCANET_V63 = window.SOLNCANET_V63 || {};
  Object.assign(window.SOLNCANET_V63, {
    version: VERSION,
    sets: { TRASH_STATUSES, PAYROLL_STATUSES },
    nocodb: { list, create, update, trash, batch, request, enqueue },
    normalize: { record: normalizeRecord, list: normalizeList, patchArrayById, recordId, recordStatus, isTrash, isPayroll },
    calendar: { clearDeletedState: clearDeletedCalendarState },
    ui: { message, setButtonBusy, idempotencyKey }
  });

  console.info("СОЛНЦАНЕТ", VERSION, "installed");
})();
