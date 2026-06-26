// SOLNCANET Google Calendar Apps Script v30
// Поддерживает проверку связи, импорт событий и создание события из быстрой записи.

const IMPORT_TOKEN = 'SOLNCANET_CALENDAR_2026_4C7A9D2E';
const CALENDAR_ID = 'primary';
const DEFAULT_DURATION_MINUTES = 60;
const TIMEZONE = 'Asia/Yekaterinburg';

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try { return JSON.parse(e.postData.contents); } catch (err) { return {}; }
}
function checkToken_(data) {
  return String(data.token || '') === String(IMPORT_TOKEN);
}
function getCalendar_() {
  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error('Не удалось открыть календарь: ' + CALENDAR_ID);
  return cal;
}
function doGet(e) {
  try {
    return json_({ ok: true, success: true, service: 'SOLNCANET Google Calendar v30', message: 'Apps Script работает. Для админки используйте POST через Cloudflare.', calendarId: CALENDAR_ID });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}
function doPost(e) {
  try {
    const data = parseBody_(e);
    if (!checkToken_(data)) return json_({ ok: false, error: 'Неверный token' });
    const action = String(data.action || 'health');
    if (action === 'health') return health_();
    if (action === 'list') return listEvents_(data);
    if (action === 'create' || action === 'createEvent') return createEvent_(data);
    return json_({ ok: false, error: 'Неизвестное действие: ' + action });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}
function health_() {
  const cal = getCalendar_();
  return json_({ ok: true, success: true, message: 'Google Календарь доступен', calendarName: cal.getName(), calendarId: CALENDAR_ID });
}
function isoDate_(s, fallback) {
  s = String(s || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}
function listEvents_(data) {
  const cal = getCalendar_();
  const now = new Date();
  const today = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
  const from = isoDate_(data.dateFrom, today);
  const to = isoDate_(data.dateTo, from);
  const start = new Date(from + 'T00:00:00+05:00');
  const end = new Date(to + 'T23:59:59+05:00');
  const events = cal.getEvents(start, end).map(function(ev) {
    const st = ev.getStartTime();
    const en = ev.getEndTime();
    return {
      id: ev.getId(),
      title: ev.getTitle(),
      description: ev.getDescription(),
      location: ev.getLocation(),
      start: st.toISOString(),
      end: en.toISOString(),
      date: Utilities.formatDate(st, TIMEZONE, 'yyyy-MM-dd'),
      time: Utilities.formatDate(st, TIMEZONE, 'HH:mm'),
      startText: Utilities.formatDate(st, TIMEZONE, 'dd.MM.yyyy HH:mm'),
      endText: Utilities.formatDate(en, TIMEZONE, 'dd.MM.yyyy HH:mm'),
      htmlLink: '',
      creator: '',
      organizer: ''
    };
  });
  return json_({ ok: true, events: events, total: events.length, dateFrom: from, dateTo: to });
}
function createEvent_(data) {
  const cal = getCalendar_();
  const f = data.fields || {};
  const name = String(f.name || '').trim();
  const phone = String(f.phone || '').trim();
  const service = String(f.service || 'Запись').trim();
  const date = String(f.date || '').slice(0, 10);
  const time = String(f.time || '').slice(0, 5);
  if (!name || !phone || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return json_({ ok: false, error: 'Не хватает данных для создания события: ФИО, телефон, дата, время' });
  }
  const start = new Date(date + 'T' + time + ':00+05:00');
  const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60000);
  const title = 'СОЛНЦАНЕТ — ' + name + (service ? ' — ' + service : '');
  const desc = [
    'Источник: быстрая запись сайта СОЛНЦАНЕТ',
    data.recordId ? 'ID заявки: ' + data.recordId : '',
    'Клиент: ' + name,
    f.company ? 'Компания: ' + f.company : '',
    'Телефон: ' + phone,
    service ? 'Услуга: ' + service : '',
    f.m2 ? 'м²: ' + f.m2 : '',
    f.comment ? 'Комментарий: ' + f.comment : ''
  ].filter(Boolean).join('\n');
  const ev = cal.createEvent(title, start, end, { description: desc, location: String(f.address || '').trim() });
  return json_({ ok: true, created: true, eventId: ev.getId(), htmlLink: '', title: ev.getTitle(), start: start.toISOString(), end: end.toISOString(), calendarName: cal.getName() });
}
