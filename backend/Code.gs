/**
 * Ritmo Híbrido — backend en Google Apps Script (ligado a una Google Sheet).
 *
 * Ficheros: Code.gs (este), Mail.gs (emails), Stats.gs (panel), appsscript.json.
 * Instalación paso a paso: backend/README.md
 *
 * Endpoint (web app, acceso "Cualquiera"): recibe POST con JSON en texto plano.
 *   action: 'signup' | 'confirm' | 'unsub' | 'stats'
 */

const TZ = 'Europe/Madrid';

// Versión del texto de consentimiento (aviso del formulario + email de confirmación). Súbela cada vez que lo cambies:
// queda guardada junto a la fecha de cada confirmación como prueba de qué aceptó cada persona.
const CONSENT_VERSION = '2026-10-v1';

const T = {
  SUBS: 'Suscriptores',
  LEADS: 'Contactos',
  CAMP: 'Campañas',
  SENDS: 'Envíos',
  CFG: 'Config',
  LOG: 'Registro',
};

const COLS = {
  'Suscriptores': ['id', 'fecha_alta', 'email', 'ciudad', 'carrera', 'origen', 'estado', 'marketing',
    'fecha_confirmacion', 'consentimiento', 'fecha_baja', 'token', 'emails_confirmacion'],
  'Contactos': ['id', 'fecha', 'email', 'nombre', 'telefono', 'ciudad', 'estado', 'centro', 'fecha_cierre', 'comision', 'notas'],
  'Campañas': ['id', 'mes', 'fecha_envio', 'asunto', 'titulo', 'cuerpo', 'publi_activa', 'publi_titulo', 'publi_texto',
    'publi_enlace', 'publi_boton', 'segmento_ciudad', 'estado', 'enviados', 'errores', 'fecha_fin', 'ingreso_publi'],
  'Envíos': ['fecha', 'campana', 'email', 'resultado'],
  'Registro': ['fecha', 'origen', 'detalle'],
};

const CITIES = {
  sevilla: 'Sevilla', madrid: 'Madrid', malaga: 'Málaga', valencia: 'Valencia',
  barcelona: 'Barcelona', bilbao: 'Bilbao', otra: 'Otra ciudad',
};

const CFG_DEFAULTS = [
  ['SENDER_NAME', 'Ritmo Híbrido', 'Nombre que ve quien recibe los emails'],
  ['REPLY_TO', '', 'Dirección a la que llegan las respuestas (vacío = la cuenta de Google)'],
  ['CONTACT_EMAIL', 'hola@ritmohibrido.com', 'Contacto que aparece en el pie de los emails'],
  ['SITE_URL', 'https://ritmohibrido.com', 'URL de la web, sin barra final (los enlaces de los emails salen de aquí)'],
  ['PLAN_URL', 'https://ritmohibrido.com/recursos/ritmo-hibrido-plan-16-semanas.pdf', 'PDF del plan de 16 semanas'],
  ['COMISION_CIERRE', '30', 'Comisión por defecto (€) al marcar un contacto como Cerrado'],
  ['CUOTA_RESERVA', '10', 'Emails diarios que nunca se gastan en campañas (confirmaciones, avisos)'],
];

// ---------------------------------------------------------------- Entrada web

function doGet() {
  return json_({ ok: true, service: 'ritmohibrido' });
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (req.action) {
      case 'signup': out = handleSignup_(req); break;
      case 'confirm': out = handleConfirm_(req); break;
      case 'unsub': out = handleUnsub_(req); break;
      case 'stats': out = handleStats_(req); break;
      default: out = { ok: false, error: 'accion' };
    }
  } catch (err) {
    logError_('doPost', err);
    out = { ok: false, error: 'server' };
  }
  return json_(out);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------- Alta

function handleSignup_(req) {
  const email = String(req.email || '').trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return { ok: false, error: 'email' };

  // Bots: campo trampa relleno o formulario enviado demasiado rápido. Respondemos "ok" sin hacer nada.
  if (req.web) return { ok: true };
  if (Number(req.ms) < 1500) return { ok: true };

  const ciudad = CITIES[req.ciudad] ? req.ciudad : null;
  if (!ciudad) return { ok: false, error: 'ciudad' };
  const carrera = /^[a-z0-9-]{1,20}$/.test(String(req.carrera || '')) ? req.carrera : '';
  const origen = String(req.origen || '').slice(0, 40);

  const cache = CacheService.getScriptCache();
  if (cache.get('sg:' + email)) return { ok: true };
  cache.put('sg:' + email, '1', 60);

  return withLock_(() => {
    const subs = table_(T.SUBS).rows;
    const found = subs.find(s => String(s.email).toLowerCase() === email);
    const data = { ciudad, carrera, origen, marketing: 'SI' };

    if (!found) {
      const sub = Object.assign({
        id: shortId_(), fecha_alta: new Date(), email, estado: 'Pendiente', token: token_(), emails_confirmacion: 0,
      }, data);
      appendObj_(T.SUBS, sub);
      const row = lastRow_(T.SUBS);
      sendConfirmation_(sub, row);
      return { ok: true };
    }

    if (found.estado === 'Confirmado') {
      // Ya estaba apuntado: actualizamos preferencias y le reenviamos el plan (sin revelar nada en la respuesta)
      updateObj_(T.SUBS, found._row, data);
      Object.assign(found, data);
      if (Number(found.emails_confirmacion || 0) < 6 && canSend_(1)) {
        sendWelcome_(found);
        updateObj_(T.SUBS, found._row, { emails_confirmacion: Number(found.emails_confirmacion || 0) + 1 });
      }
      return { ok: true };
    }

    // Pendiente o dada de baja: se vuelve a pedir confirmación
    const patch = Object.assign({ estado: 'Pendiente', fecha_alta: new Date() }, data);
    if (found.estado === 'Baja' || !found.token) patch.token = token_();
    updateObj_(T.SUBS, found._row, patch);
    Object.assign(found, patch);
    if (Number(found.emails_confirmacion || 0) < 3) sendConfirmation_(found, found._row);
    return { ok: true };
  });
}

function sendWelcome_(sub) {
  mail_(sub.email, "Tu plan de 16 semanas", welcomeEmail_(sub));
}

function sendConfirmation_(sub, row) {
  if (!canSend_(1)) { logError_('confirmacion', 'Sin cuota de email: ' + sub.email); return; }
  try {
    mail_(sub.email, 'Confirma tu email para recibir el plan', confirmEmail_(sub));
    updateObj_(T.SUBS, row, { emails_confirmacion: Number(sub.emails_confirmacion || 0) + 1 });
    sub.emails_confirmacion = Number(sub.emails_confirmacion || 0) + 1;
  } catch (err) {
    logError_('confirmacion', err);
  }
}

// ---------------------------------------------------- Confirmación y baja

function handleConfirm_(req) {
  const t = String(req.token || '');
  if (!/^[a-f0-9]{32}$/.test(t)) return { ok: false, error: 'token' };
  return withLock_(() => {
    const sub = table_(T.SUBS).rows.find(s => s.token === t);
    if (!sub || sub.estado === 'Baja') return { ok: false, error: 'token' };
    const c = cfg_();
    if (sub.estado === 'Pendiente') {
      updateObj_(T.SUBS, sub._row, { estado: 'Confirmado', marketing: 'SI', fecha_confirmacion: new Date(), consentimiento: CONSENT_VERSION });
      sub.estado = 'Confirmado';
      try { if (canSend_(1)) sendWelcome_(sub); } catch (err) { logError_('bienvenida', err); }
    }
    return { ok: true, plan: c.PLAN_URL };
  });
}

function handleUnsub_(req) {
  const t = String(req.token || '');
  if (!/^[a-f0-9]{32}$/.test(t)) return { ok: false, error: 'token' };
  return withLock_(() => {
    const sub = table_(T.SUBS).rows.find(s => s.token === t);
    if (!sub) return { ok: false, error: 'token' };
    if (sub.estado !== 'Baja') updateObj_(T.SUBS, sub._row, { estado: 'Baja', marketing: 'NO', fecha_baja: new Date() });
    return { ok: true };
  });
}

// -------------------------------------------------------- Envío de campañas

/** Se ejecuta cada día (disparador). Reintenta confirmaciones pendientes y envía la campaña que toque. */
function runDailyJob() {
  const t0 = Date.now();
  try {
    retryConfirmations_();
    sendDueCampaign_(t0);
    setCfg_('ULTIMA_EJECUCION', new Date());
  } catch (err) {
    logError_('runDailyJob', err);
  }
}

function retryConfirmations_() {
  const limit = Date.now() - 7 * 864e5;
  table_(T.SUBS).rows
    .filter(s => s.estado === 'Pendiente' && !Number(s.emails_confirmacion || 0) && s.token && +toDate_(s.fecha_alta) > limit)
    .slice(0, 20)
    .forEach(s => sendConfirmation_(s, s._row));
}

function sendDueCampaign_(t0) {
  const now = new Date();
  const camp = table_(T.CAMP).rows.find(c =>
    (c.estado === 'Programada' || c.estado === 'En curso') && toDate_(c.fecha_envio) && toDate_(c.fecha_envio) <= now);
  if (!camp) return;

  const seg = slug_(camp.segmento_ciudad);
  const recipients = table_(T.SUBS).rows.filter(s =>
    s.estado === 'Confirmado' && s.marketing === 'SI' && (!seg || s.ciudad === seg));

  const sendsSh = sheet_(T.SENDS);
  const prev = table_(T.SENDS).rows.filter(r => r.campana === camp.id);
  const done = {}, fails = {};
  prev.forEach(r => {
    if (r.resultado === 'OK') done[r.email] = true;
    else fails[r.email] = (fails[r.email] || 0) + 1;
  });

  const pending = recipients.filter(s => !done[s.email] && (fails[s.email] || 0) < 2);
  let budget = canSendBudget_();
  const log = [];
  let ok = 0, ko = 0;

  const flush = () => {
    if (!log.length) return;
    sendsSh.getRange(sendsSh.getLastRow() + 1, 1, log.length, 4).setValues(log.splice(0, log.length));
  };

  for (const sub of pending) {
    if (budget <= 0 || Date.now() - t0 > 4.5 * 60 * 1000) break;
    try {
      mail_(sub.email, camp.asunto, campaignEmail_(camp, sub));
      log.push([new Date(), camp.id, sub.email, 'OK']);
      done[sub.email] = true;
      ok++;
    } catch (err) {
      log.push([new Date(), camp.id, sub.email, 'ERROR']);
      fails[sub.email] = (fails[sub.email] || 0) + 1;
      logError_('envio ' + camp.id, err);
      ko++;
    }
    budget--;
    if (log.length >= 25) flush();
  }
  flush();

  // Terminada solo cuando ya no queda nadie por enviar ni por reintentar (cada dirección se intenta 2 veces como máximo)
  const left = recipients.filter(s => !done[s.email] && (fails[s.email] || 0) < 2).length;
  const finished = left === 0;
  updateObj_(T.CAMP, camp._row, {
    estado: finished ? 'Enviada' : 'En curso',
    enviados: Object.keys(done).length,
    errores: prev.filter(r => r.resultado !== 'OK').length + ko,
    fecha_fin: finished ? new Date() : '',
  });
}

// -------------------------------------------------------- Menú y utilidades

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Ritmo Híbrido')
    .addItem('Configurar (primera vez)', 'setup')
    .addItem('Enviar email de prueba a mi cuenta', 'sendTestCampaign')
    .addItem('Ejecutar el envío ahora', 'runDailyJob')
    .addToUi();
}

/** Cuando un contacto pasa a "Cerrado" se rellenan la fecha de cierre y la comisión por defecto. */
function onEdit(e) {
  try {
    const sh = e.range.getSheet();
    if (sh.getName() !== T.LEADS || e.range.getRow() < 2) return;
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    if (e.range.getColumn() !== head.indexOf('estado') + 1 || String(e.value) !== 'Cerrado') return;
    const r = e.range.getRow();
    const cF = sh.getRange(r, head.indexOf('fecha_cierre') + 1);
    const cC = sh.getRange(r, head.indexOf('comision') + 1);
    if (!cF.getValue()) cF.setValue(new Date());
    if (cC.getValue() === '') cC.setValue(Number(cfg_().COMISION_CIERRE || 0));
  } catch (err) { /* un onEdit nunca debe molestar al editar */ }
}

function sendTestCampaign() {
  const camp = table_(T.CAMP).rows.find(c => ['Borrador', 'Programada', 'En curso'].indexOf(c.estado) >= 0);
  if (!camp) throw new Error('No hay ninguna campaña en Borrador/Programada para probar.');
  const me = Session.getEffectiveUser().getEmail();
  mail_(me, '[PRUEBA] ' + camp.asunto, campaignEmail_(camp, { email: me, token: '0'.repeat(32) }));
  Logger.log('Email de prueba enviado a ' + me);
}

/** Primera vez: crea hojas, ajustes, contraseña del panel y el disparador diario. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);

  Object.keys(COLS).forEach(name => {
    const sh = sheet_(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, COLS[name].length).setValues([COLS[name]])
        .setFontWeight('bold').setBackground('#0E1013').setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
    }
  });

  const cfg = sheet_(T.CFG);
  if (cfg.getLastRow() === 0) {
    cfg.getRange(1, 1, 1, 3).setValues([['clave', 'valor', 'nota']]).setFontWeight('bold').setBackground('#0E1013').setFontColor('#FFFFFF');
    cfg.getRange(2, 1, CFG_DEFAULTS.length, 3).setValues(CFG_DEFAULTS);
    cfg.setFrozenRows(1);
    cfg.setColumnWidth(1, 190); cfg.setColumnWidth(2, 420); cfg.setColumnWidth(3, 520);
  }

  const list = (sheetName, col, values) => {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
    sheet_(sheetName).getRange(2, COLS[sheetName].indexOf(col) + 1, 1000, 1).setDataValidation(rule);
  };
  list(T.LEADS, 'estado', ['Nuevo', 'Contactado', 'Cerrado', 'Descartado']);
  list(T.CAMP, 'estado', ['Borrador', 'Programada', 'En curso', 'Enviada']);
  list(T.CAMP, 'publi_activa', ['SI', 'NO']);

  const camp = sheet_(T.CAMP);
  if (camp.getLastRow() < 2) {
    const next = new Date(); next.setMonth(next.getMonth() + 1, 5); next.setHours(0, 0, 0, 0);
    appendObj_(T.CAMP, {
      id: shortId_(), mes: Utilities.formatDate(next, TZ, 'yyyy-MM'), fecha_envio: next,
      asunto: 'Calendario HYROX y plan del mes',
      titulo: 'Tu resumen del mes',
      cuerpo: 'Hola,\n\nEstas son las novedades del mes en el mundo de las carreras híbridas:\n\n- Calendario de carreras actualizado.\n- Un consejo de entrenamiento.\n\nTodo el detalle en [nuestra guía](https://ritmohibrido.com/calendario/).\n\nNos vemos en la meta.',
      publi_activa: 'NO', publi_titulo: '', publi_texto: '', publi_enlace: '', publi_boton: 'Más información',
      segmento_ciudad: '', estado: 'Borrador', enviados: 0, errores: 0,
    });
  }

  const props = PropertiesService.getScriptProperties();
  let pw = props.getProperty('PANEL_PASSWORD');
  const created = !pw;
  if (!pw) { pw = token_().slice(0, 14); props.setProperty('PANEL_PASSWORD', pw); }

  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'runDailyJob') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runDailyJob').timeBased().everyDays(1).atHour(9).create();

  const dflt = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (dflt && dflt.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(dflt);

  Logger.log('Listo. ' + (created ? 'Contraseña del panel: ' + pw + '  (cámbiala en Configuración del proyecto > Propiedades del script > PANEL_PASSWORD)'
    : 'La contraseña del panel ya existía y no se ha tocado.'));
}

// ----------------------------------------------------------- Helpers de hoja

function sheet_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function table_(name) {
  const sh = sheet_(name);
  const v = sh.getDataRange().getValues();
  const head = v[0] || [];
  const rows = [];
  for (let i = 1; i < v.length; i++) {
    if (v[i].every(x => x === '' || x === null)) continue;
    const o = { _row: i + 1 };
    head.forEach((h, j) => { o[h] = v[i][j]; });
    rows.push(o);
  }
  return { sh, head, rows };
}

function headOf_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

function lastRow_(name) {
  return sheet_(name).getLastRow();
}

function appendObj_(name, obj) {
  const sh = sheet_(name);
  const head = headOf_(sh);
  const risky = [];
  const values = head.map((h, i) => {
    const v = obj[h];
    if (isRisky_(v)) { risky.push([i, v]); return ''; }
    return v === undefined || v === null ? '' : v;
  });
  sh.appendRow(values);
  const row = sh.getLastRow();
  risky.forEach(([i, v]) => writeCell_(sh.getRange(row, i + 1), v));
}

function updateObj_(name, row, patch) {
  const sh = sheet_(name);
  const head = headOf_(sh);
  Object.keys(patch).forEach(k => {
    const c = head.indexOf(k);
    if (c >= 0) writeCell_(sh.getRange(row, c + 1), patch[k]);
  });
}

/** Un texto que empieza por = + - @ lo escribiría un usuario como fórmula: se guarda como texto plano. */
function isRisky_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v); }

function writeCell_(range, v) {
  if (v === undefined || v === null) v = '';
  if (isRisky_(v)) range.setNumberFormat('@');
  range.setValue(v);
}

function cfg_() {
  const out = {};
  table_(T.CFG).rows.forEach(r => { if (r.clave) out[r.clave] = r.valor === undefined ? '' : r.valor; });
  CFG_DEFAULTS.forEach(([k, v]) => { if (out[k] === undefined || out[k] === '') out[k] = (k === 'REPLY_TO') ? '' : (out[k] || v); });
  return out;
}

function setCfg_(key, value) {
  const r = table_(T.CFG).rows.find(x => x.clave === key);
  if (r) updateObj_(T.CFG, r._row, { valor: value });
  else sheet_(T.CFG).appendRow([key, value, '']);
}

function logError_(origen, err) {
  try {
    sheet_(T.LOG).appendRow([new Date(), String(origen).slice(0, 40), String(err && err.message || err).slice(0, 300)]);
  } catch (e) { /* sin registro posible */ }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function token_() { return Utilities.getUuid().replace(/-/g, ''); }
function shortId_() { return Utilities.getUuid().slice(0, 8); }

function toDate_(v) {
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (v === '' || v === null || v === undefined) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function slug_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function canSend_(n) { return MailApp.getRemainingDailyQuota() >= n; }
function canSendBudget_() {
  return Math.max(0, MailApp.getRemainingDailyQuota() - Number(cfg_().CUOTA_RESERVA || 10));
}
