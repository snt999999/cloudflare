const IMPORT_TOKEN = 'SOLNCANET_CALENDAR_2026_4C7A9D2E';
const CALENDAR_ID = 'primary';
const MAX_EVENTS = 120;

function doGet(e) {
  try {
    const token = getParam_(e, 'token');
    if (token && token !== IMPORT_TOKEN) {
      return json_({ ok: false, error: 'Неверный GOOGLE_CALENDAR_IMPORT_TOKEN' });
    }
    const calendar = getCalendar_();
    return json_({
      ok: true,
      success: true,
      service: 'SOLNCANET Google Calendar import',
      message: 'Apps Script календаря работает. Календарь доступен.',
      calendarName: calendar.getName()
    });
  } catch (err) {
    return json_({ ok: false, success: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const body = readBody_(e);
    if (body.token !== IMPORT_TOKEN) {
      return json_({ ok: false, success: false, error: 'Неверный GOOGLE_CALENDAR_IMPORT_TOKEN' });
    }

    const calendar = getCalendar_();
    const action = body.action || 'health';

    if (action === 'health' || action === 'test' || action === 'check') {
      return json_({
        ok: true,
        success: true,
        service: 'SOLNCANET Google Calendar import',
        message: 'Проверка прошла успешно. Google Календарь доступен.',
        calendarName: calendar.getName()
      });
    }

    if (action !== 'list') {
      return json_({ ok: false, success: false, error: 'Неизвестное действие: ' + action });
    }

    const dateFrom = validDate_(body.dateFrom) || today_();
    const dateTo = validDate_(body.dateTo) || addDays_(dateFrom, 7);
    const start = new Date(dateFrom + 'T00:00:00');
    const end = new Date(dateTo + 'T23:59:59');

    const events = calendar.getEvents(start, end).slice(0, MAX_EVENTS).map(function(ev) {
      const s = ev.getStartTime();
      const e = ev.getEndTime();
      return {
        id: ev.getId(),
        title: ev.getTitle(),
        description: ev.getDescription(),
        location: ev.getLocation(),
        start: s.toISOString(),
        end: e.toISOString(),
        date: Utilities.formatDate(s, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        startTime: Utilities.formatDate(s, Session.getScriptTimeZone(), 'HH:mm'),
        endTime: Utilities.formatDate(e, Session.getScriptTimeZone(), 'HH:mm'),
        startText: Utilities.formatDate(s, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm'),
        endText: Utilities.formatDate(e, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm'),
        htmlLink: getCalendarEventLink_(ev),
        creator: '',
        organizer: ''
      };
    });

    return json_({
      ok: true,
      success: true,
      message: 'События календаря загружены',
      calendarName: calendar.getName(),
      dateFrom: dateFrom,
      dateTo: dateTo,
      count: events.length,
      events: events
    });
  } catch (err) {
    return json_({ ok: false, success: false, error: String(err && err.message ? err.message : err), stack: String(err && err.stack ? err.stack : '') });
  }
}

function getCalendar_() {
  if (CALENDAR_ID && CALENDAR_ID !== 'primary') {
    const cal = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!cal) throw new Error('Не удалось открыть календарь по CALENDAR_ID: ' + CALENDAR_ID);
    return cal;
  }
  return CalendarApp.getDefaultCalendar();
}

function getCalendarEventLink_(ev) {
  try {
    const id = Utilities.base64EncodeWebSafe(ev.getId()).replace(/=+$/, '');
    return 'https://calendar.google.com/calendar/u/0/r/eventedit/' + id;
  } catch (_) {
    return '';
  }
}

function readBody_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (err) { throw new Error('Apps Script не смог разобрать JSON: ' + err.message); }
}
function getParam_(e, name) { return e && e.parameter ? (e.parameter[name] || '') : ''; }
function validDate_(v) { const s = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function addDays_(dateStr, days) { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + days); return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj, null, 2)).setMimeType(ContentService.MimeType.JSON); }
