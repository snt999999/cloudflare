const UPLOAD_TOKEN = 'SOLNCANET_FILES_2026_8F9D3B7A';
const ROOT_FOLDER_NAME = 'SOLNCANET — файлы заявок';
const MAKE_FILES_AVAILABLE_BY_LINK = true;

function doGet(e) {
  try {
    const token = getParam_(e, 'token');

    if (token && token !== UPLOAD_TOKEN) {
      return json_({
        ok: false,
        error: 'Неверный GOOGLE_DRIVE_UPLOAD_TOKEN'
      });
    }

    const folder = getRootFolder_();

    return json_({
      ok: true,
      success: true,
      service: 'SOLNCANET Google Drive files',
      method: 'GET',
      message: 'Apps Script работает. Google Drive доступен.',
      folderId: folder.getId(),
      folderName: folder.getName()
    });

  } catch (err) {
    return json_({
      ok: false,
      success: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}

function doPost(e) {
  try {
    const body = readBody_(e);

    if (body.token !== UPLOAD_TOKEN) {
      return json_({
        ok: false,
        success: false,
        error: 'Неверный GOOGLE_DRIVE_UPLOAD_TOKEN'
      });
    }

    if (body.action === 'health' || body.action === 'test' || body.action === 'check') {
      return health_();
    }

    if (body.action === 'delete') {
      return deleteFile_(body);
    }

    return uploadFiles_(body);

  } catch (err) {
    return json_({
      ok: false,
      success: false,
      error: String(err && err.message ? err.message : err),
      stack: String(err && err.stack ? err.stack : '')
    });
  }
}

function readBody_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('Apps Script не смог разобрать JSON: ' + err.message);
  }
}

function health_() {
  const folder = getRootFolder_();
  return json_({
    ok: true,
    success: true,
    service: 'SOLNCANET Google Drive files',
    method: 'POST',
    message: 'Проверка прошла успешно. Google Drive доступен.',
    folderId: folder.getId(),
    folderName: folder.getName()
  });
}

function uploadFiles_(body) {
  const root = getRootFolder_();
  const requestId = safeName_(body.requestId || body.leadId || body.zayavkaId || 'Без номера заявки');
  const client = safeName_(body.client || body.clientName || body.name || 'Без клиента');
  const phone = safeName_(body.phone || '');
  const address = safeName_(body.address || 'Без адреса');
  const service = safeName_(body.service || '');
  const status = safeName_(body.status || '');

  let files = [];
  if (Array.isArray(body.files)) files = body.files;

  if (!files.length && (body.base64 || body.fileBase64)) {
    files = [{
      name: body.fileName || body.filename || 'file',
      originalName: body.fileName || body.filename || 'file',
      contentType: body.mimeType || body.type || 'application/octet-stream',
      size: body.size || 0,
      base64: body.base64 || body.fileBase64
    }];
  }

  if (!files.length) {
    return json_({ ok: false, success: false, error: 'Файлы не переданы в Apps Script' });
  }

  const folderName = safeName_('Заявка ' + requestId + ' — ' + client + ' — ' + address).slice(0, 180);
  const folder = getOrCreateChildFolder_(root, folderName);
  const uploaded = [];
  const warnings = [];

  files.forEach(function(file) {
    const name = safeName_(file.originalName || file.name || file.fileName || 'file');
    const contentType = file.contentType || file.mimeType || file.type || 'application/octet-stream';
    let base64 = file.base64 || file.fileBase64 || '';

    if (!base64) throw new Error('У файла "' + name + '" нет base64');

    base64 = String(base64).replace(/^data:[^;]+;base64,/, '');
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, contentType, name);
    const driveFile = folder.createFile(blob);

    if (MAKE_FILES_AVAILABLE_BY_LINK) {
      try {
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        warnings.push('Файл загружен, но доступ по ссылке не включился: ' + shareErr.message);
      }
    }

    const id = driveFile.getId();
    const uploadedAt = new Date().toISOString();

    uploaded.push({
      id: id,
      key: 'drive:' + id,
      requestId: String(requestId),
      originalName: name,
      name: name,
      contentType: contentType,
      mimeType: driveFile.getMimeType(),
      fileType: file.fileType || detectType_(contentType, name),
      size: Number(file.size || bytes.length || 0),
      uploadedAt: uploadedAt,
      client: client,
      phone: phone,
      address: address,
      service: service,
      status: status,
      url: driveFile.getUrl(),
      webViewLink: driveFile.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id),
      previewUrl: 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview',
      folderId: folder.getId(),
      folderName: folder.getName()
    });
  });

  return json_({
    ok: true,
    success: true,
    message: 'Файлы успешно загружены в Google Drive',
    uploaded: uploaded,
    warning: warnings.join(' | ')
  });
}

function deleteFile_(body) {
  const fileId = String(body.fileId || body.id || '').replace(/^drive:/, '').trim();
  if (!fileId) return json_({ ok: false, success: false, error: 'Не указан fileId' });
  DriveApp.getFileById(fileId).setTrashed(true);
  return json_({ ok: true, success: true, deleted: fileId });
}

function getRootFolder_() {
  const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

function getOrCreateChildFolder_(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(folderName);
}

function getParam_(e, name) {
  if (!e || !e.parameter) return '';
  return e.parameter[name] || '';
}

function safeName_(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|#%{}~&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'Без названия';
}

function detectType_(mime, name) {
  const m = String(mime || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  if (m.indexOf('image/') === 0 || /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(n)) return 'фото';
  if (m.indexOf('video/') === 0 || /\.(mp4|mov|avi|mkv|webm)$/i.test(n)) return 'видео';
  if (m.indexOf('pdf') !== -1 || /\.pdf$/i.test(n)) return 'pdf';
  return 'документ';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
