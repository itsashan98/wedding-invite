/**
 * Wedding RSVP backend: a Google Sheet plus this script, deployed as a web app.
 *
 * Setup (once):
 *   1. Create a Google Sheet, then Extensions ▸ Apps Script.
 *   2. Replace everything in Code.gs with this file and change ADMIN_PASSWORD.
 *   3. Deploy ▸ New deployment ▸ Web app. Execute as: Me. Who has access: Anyone.
 *   4. Copy the web app URL into config.js (scriptUrl) on the website.
 *
 * Every guest is one row in the "Guests" sheet. Guests never see the sheet;
 * the website only asks this script for their own row.
 */

const ADMIN_PASSWORD = 'change-this-password';   // the password for admin.html
const SHEET_NAME = 'Guests';
const HEADERS = ['Token', 'Name', 'Answer', 'Guests', 'Message', 'Replied at', 'Invited at'];
const COL = { token: 1, name: 2, answer: 3, count: 4, message: 5, repliedAt: 6, createdAt: 7 };

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (body.action) {
      case 'guest':  return json_(guest_(body));
      case 'rsvp':   return json_(rsvp_(body));
      case 'list':   requireAdmin_(body); return json_({ ok: true, guests: allGuests_() });
      case 'invite': requireAdmin_(body); return json_(invite_(body));
      case 'remove': requireAdmin_(body); return json_(remove_(body));
      default:       return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: err && err.code ? err.code : 'server_error' });
  }
}

// A plain visit to the script URL just says it is running.
function doGet() {
  return json_({ ok: true, service: 'floral-invite-rsvp' });
}

// ---- Guest actions (no password) ----

/** A guest's own invitation, found by the token in their personal link. */
function guest_(body) {
  const g = findByToken_(String(body.token || ''));
  if (!g) return { ok: false, error: 'not_found' };
  return { ok: true, guest: publicGuest_(g) };
}

/** Save or update a reply. With a known token it fills in that guest's row;
 *  without one (the general link) it adds a new row and returns its token. */
function rsvp_(body) {
  const name = clean_(body.name, 80);
  const answer = body.answer === 'no' ? 'no' : 'yes';
  const count = answer === 'yes' ? Math.max(1, Math.min(20, parseInt(body.count, 10) || 1)) : 0;
  const message = clean_(body.message, 1000);
  if (!name) return { ok: false, error: 'name_required' };

  return withLock_(() => {
    const sheet = sheet_();
    const now = new Date();
    let g = findByToken_(String(body.token || ''));
    if (!g) {
      const token = newToken_();
      sheet.appendRow([token, name, answer, count, message, now, '']);
      return { ok: true, token };
    }
    sheet.getRange(g.row, COL.answer, 1, 4).setValues([[answer, count, message, now]]);
    if (!g.name) sheet.getRange(g.row, COL.name).setValue(name);
    return { ok: true, token: g.token };
  });
}

// ---- Admin actions (password) ----

function invite_(body) {
  const name = clean_(body.name, 80);
  if (!name) return { ok: false, error: 'name_required' };
  return withLock_(() => {
    const token = newToken_();
    sheet_().appendRow([token, name, '', '', '', '', new Date()]);
    return { ok: true, token };
  });
}

function remove_(body) {
  return withLock_(() => {
    const g = findByToken_(String(body.token || ''));
    if (g) sheet_().deleteRow(g.row);
    return { ok: true };
  });
}

function requireAdmin_(body) {
  if (String(body.key || '') !== ADMIN_PASSWORD) throw { code: 'wrong_password' };
}

// ---- Sheet helpers ----

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function allGuests_() {
  const values = sheet_().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r[0]) continue;
    out.push(Object.assign({ token: String(r[0]) }, publicGuest_(rowToGuest_(r, i + 1))));
  }
  return out;
}

function findByToken_(token) {
  if (!token) return null;
  const values = sheet_().getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === token) return rowToGuest_(values[i], i + 1);
  }
  return null;
}

function rowToGuest_(r, row) {
  return {
    row, token: String(r[0]), name: String(r[1] || ''), answer: String(r[2] || ''),
    count: Number(r[3]) || 0, message: String(r[4] || ''),
    repliedAt: iso_(r[5]), createdAt: iso_(r[6]),
  };
}

function publicGuest_(g) {
  return { name: g.name, answer: g.answer, count: g.count, message: g.message, repliedAt: g.repliedAt, createdAt: g.createdAt };
}

function newToken_() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let t = '';
  for (let i = 0; i < 10; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

/** Trim, cap the length, and stop text being read as a spreadsheet formula. */
function clean_(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function iso_(v) {
  return v instanceof Date ? v.toISOString() : (v ? String(v) : '');
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
