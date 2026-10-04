/**
 * Datos del panel. buildStats_ es una función pura (recibe filas y una fecha), así que se puede probar sin Google.
 */

function handleStats_(req) {
  const auth = checkPanelAuth_(req.password);
  if (auth !== 'ok') return { ok: false, error: auth };
  const d = {
    subs: table_(T.SUBS).rows,
    leads: table_(T.LEADS).rows,
    camps: table_(T.CAMP).rows,
    sends: table_(T.SENDS).rows,
    log: table_(T.LOG).rows,
    cfg: cfg_(),
  };
  const stats = buildStats_(d, new Date());
  stats.sistema = systemInfo_(d);
  return { ok: true, stats };
}

/** Contraseña en Propiedades del script. 5 fallos seguidos bloquean el acceso 15 minutos. */
function checkPanelAuth_(password) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('pfail') || 0);
  if (fails >= 5) return 'locked';
  const real = PropertiesService.getScriptProperties().getProperty('PANEL_PASSWORD');
  if (!real) return 'noconfig';
  if (typeof password === 'string' && password.length && sameString_(password, real)) {
    cache.remove('pfail');
    return 'ok';
  }
  cache.put('pfail', String(fails + 1), 900);
  return 'bad';
}

function sameString_(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function monthKey_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM'); }

function buildStats_(d, nowDate) {
  const DAY = 864e5;
  const now = +nowDate;
  const a30 = new Date(now - 30 * DAY), a60 = new Date(now - 60 * DAY), end = new Date(now + 1);
  const inR = (v, a, b) => { const x = toDate_(v); return !!x && x >= a && x < b; };
  const count = (rows, field, a, b, f) => rows.filter(r => (!f || f(r)) && inR(r[field], a, b)).length;
  const sum = rows => rows.reduce((t, r) => t + (Number(r.comision) || 0), 0);

  const subs = d.subs, leads = d.leads, camps = d.camps;
  const sendsOk = d.sends.filter(r => r.resultado === 'OK');
  const active = subs.filter(s => s.estado === 'Confirmado');
  const confirmedEver = subs.filter(s => toDate_(s.fecha_confirmacion));
  const closed = leads.filter(l => l.estado === 'Cerrado');

  const thisMonth = monthKey_(nowDate);
  const prevMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 15);
  const prevMonth = monthKey_(prevMonthDate);
  const closedIn = key => closed.filter(l => toDate_(l.fecha_cierre) && monthKey_(toDate_(l.fecha_cierre)) === key);

  const altas30 = count(subs, 'fecha_confirmacion', a30, end);
  const bajas30 = count(subs, 'fecha_baja', a30, end);
  const enviados30 = count(sendsOk, 'fecha', a30, end);

  const kpis = {
    activos: { value: active.length, delta: altas30 - bajas30 },
    enviados: { value: enviados30, prev: count(sendsOk, 'fecha', a60, a30) },
    contactos: { value: count(leads, 'fecha', a30, end), prev: count(leads, 'fecha', a60, a30) },
    tasaBaja: { value: enviados30 > 0 ? bajas30 / Math.max(1, active.length + bajas30) : null, bajas: bajas30 },
    cierres: { value: closedIn(thisMonth).length, prev: closedIn(prevMonth).length },
    comision: { value: sum(closedIn(thisMonth)), prev: sum(closedIn(prevMonth)) },
  };

  const semanas = [];
  for (let i = 0; i < 12; i++) {
    const to = new Date(now - (11 - i) * 7 * DAY), from = new Date(+to - 7 * DAY);
    const toX = i === 11 ? end : to;
    semanas.push({
      label: 'S' + (i + 1),
      desde: Utilities.formatDate(from, TZ, 'dd/MM'),
      altas: count(subs, 'fecha_confirmacion', from, toX),
      bajas: count(subs, 'fecha_baja', from, toX),
    });
  }

  const marketingOn = confirmedEver.filter(s => s.marketing === 'SI').length;
  const contacted = leads.filter(l => l.estado === 'Contactado' || l.estado === 'Cerrado').length;
  const embudo = [
    { k: 'registros', label: 'Formularios enviados', value: subs.length, base: null },
    { k: 'confirmados', label: 'Email confirmado', value: confirmedEver.length, base: 0, baseLabel: 'formularios' },
    { k: 'marketing', label: 'Aceptan el email mensual', value: marketingOn, base: 1, baseLabel: 'confirmados' },
    { k: 'contactos', label: 'Piden clase de prueba', value: leads.length, base: 1, baseLabel: 'confirmados' },
    { k: 'contactados', label: 'Contactados por el centro', value: contacted, base: 3, baseLabel: 'peticiones' },
    { k: 'cierres', label: 'Cierres (altas en el centro)', value: closed.length, base: 4, baseLabel: 'contactados' },
    { k: 'comision', label: 'Comisión acumulada (€)', value: sum(closed), base: null, euros: true },
  ];

  const group = (rows, keyFn) => {
    const m = {};
    rows.forEach(r => { const k = keyFn(r) || '—'; (m[k] = m[k] || []).push(r); });
    return m;
  };
  const byCity = group(subs, s => s.ciudad), leadsByCity = group(leads, l => l.ciudad);
  const ciudades = Object.keys(byCity).map(k => ({
    ciudad: CITIES[k] || k,
    registros: byCity[k].length,
    activos: byCity[k].filter(s => s.estado === 'Confirmado').length,
    contactos: (leadsByCity[k] || []).length,
    cierres: (leadsByCity[k] || []).filter(l => l.estado === 'Cerrado').length,
  })).sort((a, b) => b.registros - a.registros);

  const byRace = group(subs.filter(s => s.estado === 'Confirmado'), s => s.carrera);
  const carreras = Object.keys(byRace).map(k => ({ carrera: k === '—' ? 'Sin elegir' : k, activos: byRace[k].length }))
    .sort((a, b) => b.activos - a.activos);

  const byOrigin = group(subs, s => s.origen);
  const origenes = Object.keys(byOrigin).map(k => {
    const reg = byOrigin[k].length, conf = byOrigin[k].filter(s => toDate_(s.fecha_confirmacion)).length;
    return { origen: k, registros: reg, confirmados: conf, conversion: reg ? conf / reg : 0 };
  }).sort((a, b) => b.registros - a.registros);

  const campSent = id => sendsOk.filter(r => r.campana === id).length;
  const emails = camps.map(c => {
    const seg = slug_(c.segmento_ciudad);
    const dest = active.filter(s => s.marketing === 'SI' && (!seg || s.ciudad === seg)).length;
    const sent = c.estado === 'Enviada' || c.estado === 'En curso' ? campSent(c.id) : 0;
    return {
      id: c.id, mes: c.mes, asunto: c.asunto, estado: c.estado, publi: String(c.publi_activa).toUpperCase() === 'SI',
      segmento: c.segmento_ciudad ? (CITIES[seg] || c.segmento_ciudad) : 'Todas',
      fecha: toDate_(c.fecha_envio) ? Utilities.formatDate(toDate_(c.fecha_envio), TZ, 'dd/MM/yyyy') : '',
      destinatarios: dest, enviados: sent, errores: Number(c.errores) || 0,
      pendientes: c.estado === 'Enviada' ? 0 : Math.max(0, dest - sent),
    };
  }).sort((a, b) => String(b.fecha.split('/').reverse().join('')).localeCompare(String(a.fecha.split('/').reverse().join(''))));

  const planned = camps.filter(c => c.estado !== 'Enviada' && toDate_(c.fecha_envio))
    .sort((a, b) => toDate_(a.fecha_envio) - toDate_(b.fecha_envio))
    .map(c => ({ fecha: Utilities.formatDate(toDate_(c.fecha_envio), TZ, 'dd/MM/yyyy'), asunto: c.asunto, estado: c.estado, publi: String(c.publi_activa).toUpperCase() === 'SI' }));
  const huecos = [];
  for (let i = 0; i < 3; i++) {
    const m = new Date(nowDate.getFullYear(), nowDate.getMonth() + i, 15);
    const key = monthKey_(m);
    const has = camps.some(c => toDate_(c.fecha_envio) && monthKey_(toDate_(c.fecha_envio)) === key);
    if (!has) huecos.push(key);
  }

  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 15);
    const key = monthKey_(m);
    const com = sum(closedIn(key));
    const pub = camps.filter(c => toDate_(c.fecha_envio) && monthKey_(toDate_(c.fecha_envio)) === key)
      .reduce((t, c) => t + (Number(c.ingreso_publi) || 0), 0);
    meses.push({ mes: key, comision: com, publi: pub, total: com + pub });
  }

  return {
    generado: nowDate.toISOString(),
    kpis, semanas, embudo, ciudades, carreras, origenes, emails,
    calendario: { proximas: planned, huecos },
    dinero: { meses, total: meses.reduce((t, m) => t + m.total, 0), cierresTotal: closed.length, comisionTotal: sum(closed) },
  };
}

function systemInfo_(d) {
  const week = Date.now() - 7 * 864e5;
  const triggers = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  const cfg = d.cfg;
  const checks = [
    { k: 'Disparador diario de envíos', ok: triggers.indexOf('runDailyJob') >= 0, msg: 'Falta: ejecuta "setup" otra vez' },
    { k: 'Contraseña del panel', ok: !!PropertiesService.getScriptProperties().getProperty('PANEL_PASSWORD'), msg: 'Falta PANEL_PASSWORD' },
    { k: 'Email del centro para avisar de contactos', ok: !!cfg.LEAD_NOTIFY_EMAIL, msg: 'Config > LEAD_NOTIFY_EMAIL vacío: no se avisa al centro' },
    { k: 'URL de la web', ok: /^https:\/\//.test(cfg.SITE_URL || ''), msg: 'Config > SITE_URL debe empezar por https://' },
  ];
  const pend = d.subs.filter(s => s.estado === 'Pendiente');
  return {
    cuotaRestante: MailApp.getRemainingDailyQuota(),
    triggers,
    ultimaEjecucion: toDate_(cfg.ULTIMA_EJECUCION) ? toDate_(cfg.ULTIMA_EJECUCION).toISOString() : null,
    pendientesConfirmar: pend.length,
    sinEmailConfirmacion: pend.filter(s => !Number(s.emails_confirmacion || 0)).length,
    checks,
    filas: { suscriptores: d.subs.length, contactos: d.leads.length, campanas: d.camps.length, envios: d.sends.length },
    errores: d.log.filter(r => toDate_(r.fecha) && +toDate_(r.fecha) > week).slice(-15).reverse()
      .map(r => ({ fecha: Utilities.formatDate(toDate_(r.fecha), TZ, 'dd/MM HH:mm'), origen: r.origen, detalle: r.detalle })),
  };
}
