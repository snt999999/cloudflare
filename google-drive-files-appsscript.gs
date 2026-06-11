// Google Apps Script для бесплатного хранения файлов сайта СОЛНЦАНЕТ в Google Drive.
// 1) Создайте папку на Google Drive, например: SOLNCANET_FILES.
// 2) Скопируйте ID папки из ссылки Google Drive и вставьте ниже в FILES_FOLDER_ID.
// 3) Придумайте секретный токен и вставьте в UPLOAD_TOKEN.
// 4) Apps Script → Deploy → New deployment → Web app.
//    Execute as: Me. Who has access: Anyone.
// 5) Скопируйте Web App URL в Cloudflare Pages Variable: GOOGLE_DRIVE_UPLOAD_URL.
// 6) Этот же токен добавьте в Cloudflare Pages Variable: GOOGLE_DRIVE_UPLOAD_TOKEN.

const FILES_FOLDER_ID = 'PASTE_GOOGLE_DRIVE_FOLDER_ID_HERE';
const UPLOAD_TOKEN = 'PASTE_SECRET_TOKEN_HERE';
const MAKE_FILES_AVAILABLE_BY_LINK = true;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (UPLOAD_TOKEN && body.token !== UPLOAD_TOKEN) {
      return json_({ ok: false, error: 'Неверный GOOGLE_DRIVE_UPLOAD_TOKEN' });
    }

    if (body.action === 'delete') {
      return deleteFile_(body);
    }

    return uploadFiles_(body);
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function uploadFiles_(body) {
  if (!FILES_FOLDER_ID || FILES_FOLDER_ID === 'PASTE_GOOGLE_DRIVE_FOLDER_ID_HERE') {
    return json_({ ok: false, error: 'В Apps Script не указан FILES_FOLDER_ID' });
  }

  const root = DriveApp.getFolderById(FILES_FOLDER_ID);
  const requestId = clean_(body.requestId || 'no-request');
  const client = clean_(body.client || 'Без клиента');
  const address = clean_(body.address || 'Без адреса');
  const service = clean_(body.service || '');
  const status = clean_(body.status || '');
  const phone = clean_(body.phone || '');
  const folderName = clean_('Заявка ' + requestId + ' — ' + client + ' — ' + address).slice(0, 180);
  const folder = getOrCreateFolder_(root, folderName);
  const uploaded = [];
  const files = Array.isArray(body.files) ? body.files : [];

  files.forEach(function(file) {
    const name = clean_(file.originalName || file.name || 'file');
    const contentType = file.contentType || 'application/octet-stream';
    const bytes = Utilities.base64Decode(file.base64 || '');
    const blob = Utilities.newBlob(bytes, contentType, name);
    const driveFile = folder.createFile(blob);

    if (MAKE_FILES_AVAILABLE_BY_LINK) {
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    const id = driveFile.getId();
    uploaded.push({
      id: id,
      key: 'drive:' + id,
      requestId: String(requestId),
      originalName: name,
      name: name,
      contentType: contentType,
      fileType: file.fileType || detectType_(contentType, name),
      size: Number(file.size || bytes.length || 0),
      uploadedAt: new Date().toISOString(),
      client: client,
      phone: phone,
      address: address,
      service: service,
      status: status,
      url: driveFile.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id),
      previewUrl: 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view'
    });
  });

  return json_({ ok: true, uploaded: uploaded });
}

function deleteFile_(body) {
  const fileId = String(body.fileId || '').replace(/^drive:/, '').trim();
  if (!fileId) return json_({ ok: false, error: 'Не указан fileId' });
  DriveApp.getFileById(fileId).setTrashed(true);
  return json_({ ok: true, deleted: fileId });
}

function getOrCreateFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function clean_(value) {
  return String(value || '')
    .replace(/[\\/\0<>:"|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'Без названия';
}

function detectType_(mime, name) {
  const m = String(mime || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  if (m.indexOf('image/') === 0 || /\.(jpg|jpeg|png|webp|gif|heic)$/.test(n)) return 'фото';
  if (m.indexOf('video/') === 0 || /\.(mp4|mov|avi|mkv|webm)$/.test(n)) return 'видео';
  if (m.indexOf('pdf') !== -1 || /\.pdf$/.test(n)) return 'pdf';
  return 'документ';
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
