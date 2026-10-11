/**
 * Ritmo Híbrido — backend en Google Apps Script (ligado a una Google Sheet).
 *
 * Ficheros: Code.gs (este), Mail.gs (emails), Stats.gs (panel), appsscript.json.
 * Instalación paso a paso: backend/README.md
 *
 * Endpoint (web app, acceso "Cualquiera"): recibe POST con JSON en texto plano.
 *   action: 'signup' | 'confirm' | 'unsub' | 'stats' | 'propuesta'
 */

const TZ = 'Europe/Madrid';

// Etiquetas del texto de consentimiento. Una por texto: la del plan (index y plan/) y la de los avisos (las 11 páginas con #avisos).
// Súbela cuando cambie su texto (y el del email de bienvenida que lo acompaña, consentNote_ en Mail.gs): queda guardada junto a la
// fecha de cada confirmación como prueba de qué aceptó cada persona.
const CONSENT_PLAN = '2026-10-v5-plan';
const CONSENT_ALERTAS = '2026-10-v5-alertas';
const CONSENT_VERSION = CONSENT_PLAN; // alias (handleConfirm_ y tests antiguos)
const CONSENT_KEEP = 20; // pares «etiqueta@fecha» que se guardan por suscriptor

// Tipos de alta que acepta el formulario: `plan` (recibe el PDF y la secuencia) y `alertas` (email de bienvenida de avisos y campañas).
const SIGNUP_LEADS = ['plan', 'alertas'];
// Intereses que puede marcar quien se apunta a las alertas (lista cerrada: lo demás se descarta).
const INTERESTS = ['carreras', 'simulacros', 'gimnasios'];

const T = {
  SUBS: 'Suscriptores',
  LEADS: 'Contactos',
  CAMP: 'Campañas',
  SENDS: 'Envíos',
  CFG: 'Config',
  LOG: 'Registro',
  PROP: 'Propuestas',
};

const COLS = {
  'Suscriptores': ['id', 'fecha_alta', 'email', 'ciudad', 'carrera', 'origen', 'estado', 'marketing',
    'fecha_confirmacion', 'consentimiento', 'fecha_baja', 'token', 'emails_confirmacion', 'secuencia', 'fecha_secuencia', 'intereses', 'lead',
    'bienvenida', // fecha del email de bienvenida de los avisos (vacío = no enviado)
    'consentimientos'], // historial «etiqueta@AAAA-MM-DD HH:mm | …» de los textos aceptados (el último de cada tipo manda en `consentimiento`)
  'Contactos': ['id', 'fecha', 'email', 'nombre', 'telefono', 'ciudad', 'estado', 'centro', 'fecha_cierre', 'comision', 'notas'],
  'Campañas': ['id', 'mes', 'fecha_envio', 'asunto', 'titulo', 'cuerpo', 'publi_activa', 'publi_titulo', 'publi_texto',
    'publi_enlace', 'publi_boton', 'segmento_ciudad', 'estado', 'enviados', 'errores', 'fecha_fin', 'ingreso_publi',
    'segmento_interes'], // vacío = todos; carreras, simulacros, gimnasios separados por comas
  'Envíos': ['fecha', 'campana', 'email', 'resultado'],
  'Registro': ['fecha', 'origen', 'detalle'],
  // Propuestas de eventos o gimnasios que envía quien visita la web (formularios B2B). Aparte de Suscriptores: no apuntan a nadie.
  // `estado`: Nuevo → Verificada → Publicada | Descartada. `web` es la URL de la propuesta (en la petición se llama `url`).
  'Propuestas': ['id', 'fecha', 'tipo', 'nombre', 'organizador', 'email', 'provincia', 'localidad', 'fecha_evento', 'web', 'mensaje',
    'destacado', 'rol', 'origen', 'estado', 'notas', 'fecha_revision', 'notificada', 'version_aviso'],
};

// Provincias (slug sin tildes → nombre). La columna de la hoja se sigue llamando `ciudad`, pero guarda el slug de la provincia.
// Misma lista que PROVINCIAS en assets/js/main.js: si cambias una, cambia la otra.
const PROVINCES = {
  'a-coruna': 'A Coruña', 'alava': 'Álava', 'albacete': 'Albacete', 'alicante': 'Alicante', 'almeria': 'Almería',
  'asturias': 'Asturias', 'avila': 'Ávila', 'badajoz': 'Badajoz', 'illes-balears': 'Illes Balears', 'barcelona': 'Barcelona',
  'bizkaia': 'Bizkaia', 'burgos': 'Burgos', 'caceres': 'Cáceres', 'cadiz': 'Cádiz', 'cantabria': 'Cantabria',
  'castellon': 'Castellón', 'ceuta': 'Ceuta', 'ciudad-real': 'Ciudad Real', 'cordoba': 'Córdoba', 'cuenca': 'Cuenca',
  'gipuzkoa': 'Gipuzkoa', 'girona': 'Girona', 'granada': 'Granada', 'guadalajara': 'Guadalajara', 'huelva': 'Huelva',
  'huesca': 'Huesca', 'jaen': 'Jaén', 'la-rioja': 'La Rioja', 'las-palmas': 'Las Palmas', 'leon': 'León',
  'lleida': 'Lleida', 'lugo': 'Lugo', 'madrid': 'Madrid', 'malaga': 'Málaga', 'melilla': 'Melilla',
  'murcia': 'Murcia', 'navarra': 'Navarra', 'ourense': 'Ourense', 'palencia': 'Palencia', 'pontevedra': 'Pontevedra',
  'salamanca': 'Salamanca', 'santa-cruz-de-tenerife': 'Santa Cruz de Tenerife', 'segovia': 'Segovia', 'sevilla': 'Sevilla',
  'soria': 'Soria', 'tarragona': 'Tarragona', 'teruel': 'Teruel', 'toledo': 'Toledo', 'valencia': 'Valencia',
  'valladolid': 'Valladolid', 'zamora': 'Zamora', 'zaragoza': 'Zaragoza',
  'otra': 'Fuera de España',
};

// Otros nombres que se aceptan y se convierten a la provincia de arriba. `bilbao` es el valor antiguo del formulario
// (suscriptores ya guardados y webs en caché); el resto son formas habituales de escribir el segmento a mano en la hoja.
const PROVINCE_ALIASES = {
  'bilbao': 'bizkaia', 'vizcaya': 'bizkaia', 'guipuzcoa': 'gipuzkoa', 'araba': 'alava',
  'la-coruna': 'a-coruna', 'baleares': 'illes-balears', 'gerona': 'girona', 'lerida': 'lleida', 'orense': 'ourense',
  'tenerife': 'santa-cruz-de-tenerife',
};

/** Texto libre (slug, nombre o alias, con o sin tildes) → slug canónico de provincia, o null si no existe. */
function provinceSlug_(v) {
  const k = slug_(v).replace(/\s+/g, '-');
  const slug = Object.prototype.hasOwnProperty.call(PROVINCE_ALIASES, k) ? PROVINCE_ALIASES[k] : k;
  return Object.prototype.hasOwnProperty.call(PROVINCES, slug) ? slug : null;
}

function provinceName_(slug) {
  return Object.prototype.hasOwnProperty.call(PROVINCES, slug) ? PROVINCES[slug] : slug;
}

/**
 * Segmento de una campaña: lista de provincias separadas por comas (`sevilla, cadiz, huelva`). Vacío = todos.
 * Un nombre que no se reconoce se ignora y se devuelve en `unknown`; si no queda ninguna provincia válida,
 * `empty` es true (nunca se interpreta como "todos").
 */
function parseSegment_(raw) {
  const parts = String(raw === undefined || raw === null ? '' : raw).split(/[,;]/).map(p => p.trim()).filter(Boolean);
  if (!parts.length) return { all: true, set: {}, unknown: [], empty: false };
  const set = {}, unknown = [];
  parts.forEach(p => { const k = provinceSlug_(p); if (k) set[k] = true; else unknown.push(p); });
  return { all: false, set, unknown, empty: !Object.keys(set).length };
}

function inSegment_(seg, ciudad) {
  if (seg.all) return true;
  const k = provinceSlug_(ciudad);
  return !!k && seg.set[k] === true;
}

/** Texto libre (plural o singular, con o sin tildes y mayúsculas) → interés canónico de INTERESTS, o null. */
function interestSlug_(v) {
  const k = slug_(v);
  return INTERESTS.find(i => i === k || i === k + 's') || null;
}

/**
 * Segmento de intereses de una campaña (`segmento_interes`): lista separada por comas (`carreras, simulacros`). Vacío = todos.
 * Igual que parseSegment_: lo que no se reconoce se ignora y se devuelve en `unknown`; si no queda ningún interés válido,
 * `empty` es true. Nunca se interpreta «todos» como «todos»: es una errata más (y la campaña no se envía).
 */
function parseInterestSegment_(raw) {
  const parts = String(raw === undefined || raw === null ? '' : raw).split(/[,;]/).map(p => p.trim()).filter(Boolean);
  if (!parts.length) return { all: true, set: {}, unknown: [], empty: false };
  const set = {}, unknown = [];
  parts.forEach(p => { const k = interestSlug_(p); if (k) set[k] = true; else unknown.push(p); });
  return { all: false, set, unknown, empty: !Object.keys(set).length };
}

/**
 * ¿Entra este suscriptor en el segmento de intereses? Con intereses marcados, basta con que coincida alguno.
 * Sin intereses: quien pidió el plan (o tiene `lead` vacío) recibe también las campañas dirigidas; una alta de alertas
 * sin intereses solo recibe las campañas sin `segmento_interes`.
 */
function inInterestSegment_(seg, sub) {
  if (seg.all) return true;
  const mine = parseInterests_(sub.intereses);
  if (mine.length) return mine.some(i => seg.set[i] === true);
  return wantsPlan_(sub);
}

const CFG_DEFAULTS = [
  ['SENDER_NAME', 'Ritmo Híbrido', 'Nombre que ve quien recibe los emails'],
  ['REPLY_TO', '', 'Dirección a la que llegan las respuestas (vacío = la cuenta de Google)'],
  ['CONTACT_EMAIL', 'info@ritmohibrido.com', 'Contacto que aparece en el pie de los emails'],
  ['SITE_URL', 'https://ritmohibrido.com', 'URL de la web, sin barra final (los enlaces de los emails salen de aquí)'],
  ['PLAN_URL', 'https://ritmohibrido.com/recursos/ritmo-hibrido-plan-16-semanas.pdf', 'PDF del plan de 16 semanas'],
  ['COMISION_CIERRE', '30', 'Comisión por defecto (€) al marcar un contacto como Cerrado'],
  ['CUOTA_RESERVA', '10', 'Emails diarios que nunca se gastan en campañas (confirmaciones, avisos)'],
  ['SECUENCIA_ACTIVA', 'SI', 'SI = cada alta recibe los 4 emails de bienvenida (días 2, 7, 14 y 28). NO = pausada'],
  ['EMAIL_PROPUESTAS', '', 'Donde llegan los avisos de propuestas nuevas (vacío = CONTACT_EMAIL; si no vale, la cuenta de Google)'],
  ['PROPUESTAS_MAX_DIA', '20', 'Tope de avisos de propuestas por día (0 = no avisar; las filas se guardan igual)'],
];

// Carreras del formulario (mismo `id` y fecha que RACES en assets/js/main.js: si cambias una, cambia la otra).
// `page` es la página de la carrera en la web (alojamiento y logística); vacío si no tiene.
const RACES = {
  'valencia': { city: 'Valencia', start: '2026-10-15', label: '15–18 oct 2026', page: '' },
  'barcelona': { city: 'Barcelona', start: '2026-11-11', label: '11–15 nov 2026', page: '/carreras/barcelona-2026/' },
  'bilbao': { city: 'Bilbao', start: '2027-02-06', label: '6–7 feb 2027', page: '/carreras/bilbao-2027/' },
  'madrid': { city: 'Madrid', start: '2027-03-17', label: '17–21 mar 2027', page: '/carreras/madrid-2027/' },
  'malaga': { city: 'Málaga', start: '2027-04-14', label: '14–18 abr 2027', page: '/carreras/malaga-2027/' },
};

// Secuencia de bienvenida: emails automáticos tras el plan, para no dejar semanas de silencio hasta la campaña del mes.
// `dia` = días desde el alta. Los textos están en Mail.gs (sequenceEmail_).
const SEQUENCE = [
  { paso: 1, dia: 2, tema: 'Primera semana: cómo empezar sin quemarse' },
  { paso: 2, dia: 7, tema: 'Estaciones con material real → centro colaborador o gimnasios de su provincia' },
  { paso: 3, dia: 14, tema: 'Su carrera: inicio del plan, alojamiento y logística (o elegir carrera)' },
  { paso: 4, dia: 28, tema: 'Semana 4: test de 1 km, ritmo de carrera y simulacros' },
];
const SEQ_MIN_GAP_DAYS = 3; // días mínimos entre dos emails de la secuencia, o entre una campaña y la secuencia

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
      case 'propuesta': out = handleProposal_(req); break;
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

/**
 * Alta de un solo paso, para el plan y para las alertas: quien pulsa el botón del formulario acepta recibir
 * comunicaciones (el aviso que lo acompaña lo dice) y se guardan la fecha y la etiqueta del texto (CONSENT_PLAN o CONSENT_ALERTAS,
 * según el tipo de alta; el historial completo queda en `consentimientos`).
 * `lead` = 'plan' (por defecto, web en caché) o 'alertas'. El plan envía un email en el acto, con el PDF;
 * las alertas envían un único email de bienvenida (sin PDF, sin secuencia) la primera vez, y reciben las campañas.
 * `intereses` es una lista cerrada (INTERESTS). La columna `emails_confirmacion` cuenta los emails con el plan enviados
 * (nombre heredado); `bienvenida` guarda la fecha del email de bienvenida de los avisos. La carrera solo la fija el plan.
 */
function handleSignup_(req) {
  const email = String(req.email || '').trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return { ok: false, error: 'email' };

  // Bots: campo trampa relleno o formulario enviado demasiado rápido. Respondemos "ok" sin hacer nada.
  if (req.web) return { ok: true };
  if (Number(req.ms) < 1500) return { ok: true };

  // El campo se sigue llamando `ciudad` en la petición (compatibilidad con la web anterior); contiene la provincia.
  // Acepta los valores antiguos (p. ej. `bilbao`) y guarda siempre el slug actual (`bizkaia`).
  const ciudad = provinceSlug_(req.ciudad);
  if (!ciudad) return { ok: false, error: 'ciudad' };
  const lead = parseLead_(req.lead);
  if (!lead) return { ok: false, error: 'lead' };
  const intereses = parseInterests_(req.intereses);
  const carrera = lead === 'plan' && /^[a-z0-9-]{1,20}$/.test(String(req.carrera || '')) ? req.carrera : ''; // las alertas ignoran la carrera
  const origen = String(req.origen || '').slice(0, 40);

  // La clave lleva el tipo de alta: pedir el plan justo después de apuntarse a las alertas no queda bloqueado
  const cache = CacheService.getScriptCache();
  const key = 'sg:' + lead + ':' + email;
  if (cache.get(key)) return lead === 'plan' ? { ok: true, plan: cfg_().PLAN_URL } : { ok: true };
  if (rateLimited_()) return { ok: false, error: 'busy' };
  cache.put(key, '1', 60);

  return withLock_(() => {
    // Cierra la ventana entre desplegar el código nuevo y ejecutar ensureSchema_: sin las columnas, la hoja descartaría lead e intereses
    ensureColumns_(T.SUBS);
    const now = new Date();
    const found = table_(T.SUBS).rows.find(s => String(s.email).toLowerCase() === email);
    const data = { ciudad, carrera, origen };
    const label = consentFor_(lead); // la etiqueta del texto que vio quien se apunta la pone el servidor según el tipo de alta
    const consent = { estado: 'Confirmado', marketing: 'SI', fecha_confirmacion: now, consentimiento: label };
    let sub, row;

    if (!found) {
      sub = Object.assign({ id: shortId_(), fecha_alta: now, email, token: token_(), emails_confirmacion: 0, secuencia: 0 }, data, consent,
        { intereses: intereses.join(','), lead, consentimientos: addConsent_({}, label, now) });
      appendObj_(T.SUBS, sub);
      row = lastRow_(T.SUBS);
    } else {
      // Ya estaba en la lista: se actualizan sus datos. Si estaba de baja (o pendiente), vuelve a darse de alta.
      const reset = found.estado === 'Baja';
      const hadPlan = wantsPlan_(found); // antes del patch: las filas antiguas, con `lead` vacío, cuentan como plan
      const patch = { ciudad };
      if (lead === 'plan' || reset) {
        patch.carrera = carrera;
        patch.origen = origen;
      } // las alertas sobre una fila existente no tocan ni la carrera ni el origen
      patch.intereses = (reset ? intereses : mergeInterests_(found.intereses, intereses)).join(',');
      // `lead` es monótono: plan > alertas. Quien ya pidió el plan no baja a alertas; tras una baja se parte de cero
      patch.lead = reset ? lead : ((lead === 'plan' || hadPlan) ? 'plan' : 'alertas');
      // Baja o pendiente: siempre se reescribe el consentimiento y vuelve a recibir la bienvenida de avisos
      if (found.estado !== 'Confirmado') Object.assign(patch, consent, { fecha_alta: now, bienvenida: '', consentimientos: addConsent_(found, label, now) });
      // Confirmado: solo se reescribe si no consta que haya aceptado ESTE texto (una vez por texto; alternar formularios no la repite)
      else if (!hasConsent_(found, label)) Object.assign(patch, consent, { consentimientos: addConsent_(found, label, now) });
      if (reset || !found.token) patch.token = token_();
      if (reset) {
        // Petición nueva tras una baja: vuelve a poder recibir el plan y la secuencia empieza de cero
        Object.assign(patch, { emails_confirmacion: 0, secuencia: 0, fecha_secuencia: '' });
      } else if (lead === 'plan' && !hadPlan) {
        // De alertas a plan: la secuencia de bienvenida cuenta desde que pide el plan
        Object.assign(patch, { fecha_alta: now, secuencia: 0, fecha_secuencia: '' });
      }
      updateObj_(T.SUBS, found._row, patch);
      sub = Object.assign(found, patch);
      row = found._row;
    }

    if (lead === 'plan') {
      sendPlan_(sub, row);
      return { ok: true, plan: cfg_().PLAN_URL };
    }
    sendAlertsWelcome_(sub, row);
    return { ok: true };
  });
}

/** Etiqueta del texto de consentimiento que acepta cada tipo de alta: los avisos tienen el suyo; el plan (y lo desconocido) el del plan. */
function consentFor_(lead) { return lead === 'alertas' ? CONSENT_ALERTAS : CONSENT_PLAN; }
/** Etiquetas (sin fecha) del historial «etiqueta@fecha | etiqueta@fecha». */
function consentLabels_(hist) { return String(hist || '').split('|').map(x => x.trim().split('@')[0]).filter(Boolean); }
/** ¿Consta ya la aceptación de este texto? Sin historial (fila anterior a la columna) vale la etiqueta de `consentimiento`. */
function hasConsent_(sub, label) {
  const l = consentLabels_(sub.consentimientos);
  return l.length ? l.indexOf(label) >= 0 : String(sub.consentimiento) === label;
}
/** Historial nuevo con esta aceptación al final. Una fila previa sin historial conserva lo que ya constaba (etiqueta@fecha_confirmacion). */
function addConsent_(sub, label, now) {
  const f = d => Utilities.formatDate(d, TZ, 'yyyy-MM-dd HH:mm');
  const pairs = String(sub.consentimientos || '').split('|').map(x => x.trim()).filter(Boolean);
  if (!pairs.length && sub.consentimiento) { const d = toDate_(sub.fecha_confirmacion); pairs.push(sub.consentimiento + (d ? '@' + f(d) : '')); }
  pairs.push(label + '@' + f(now));
  return pairs.slice(-CONSENT_KEEP).join(' | ');
}

/** Tipo de alta de la petición: ausente = 'plan' (web en caché). Un valor que no es 'plan' ni 'alertas' (o no es texto) es inválido (null). */
function parseLead_(raw) {
  if (raw === undefined || raw === null) return 'plan';
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return SIGNUP_LEADS.indexOf(v) >= 0 ? v : null;
}

/** Lista de intereses (array o cadena «a,b») → array ordenado, sin repetidos y solo con los de INTERESTS. Lee como mucho 20 elementos. */
function parseInterests_(raw) {
  const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',') : []);
  const out = [];
  list.slice(0, 20).forEach(x => {
    if (typeof x !== 'string') return;
    const k = x.trim().toLowerCase();
    if (INTERESTS.indexOf(k) >= 0 && out.indexOf(k) < 0) out.push(k);
  });
  return out.sort();
}

/** Une los intereses ya guardados en la hoja (cadena «a,b») con los nuevos. */
function mergeInterests_(current, add) {
  return parseInterests_(parseInterests_(current).concat(add || []));
}

/** ¿Pidió el plan? Las filas antiguas (`lead` vacío) sí. Cualquier otro valor distinto de 'plan' no recibe nunca el PDF ni la secuencia. */
function wantsPlan_(sub) {
  const l = String(sub && sub.lead !== undefined && sub.lead !== null ? sub.lead : '').trim().toLowerCase();
  return l === '' || l === 'plan';
}

/** Envía el email con el plan (máximo 6 por persona para que el formulario no sirva para enviar spam). Solo a quien lo pidió. */
function sendPlan_(sub, row) {
  if (!wantsPlan_(sub)) return;
  const sent = Number(sub.emails_confirmacion || 0);
  if (sent >= 6) return;
  if (!canSend_(1)) { logError_('plan', 'Sin cuota de email: ' + sub.email); return; }
  try {
    mail_(sub.email, 'Tu plan de 16 semanas', welcomeEmail_(sub));
    updateObj_(T.SUBS, row, { emails_confirmacion: sent + 1 });
    sub.emails_confirmacion = sent + 1;
  } catch (err) {
    logError_('plan', err);
  }
}

/** ¿Es un alta de solo avisos? (`lead` = alertas; el plan y las filas antiguas con `lead` vacío no lo son.) */
function isAlertsLead_(sub) {
  return String(sub && sub.lead !== undefined && sub.lead !== null ? sub.lead : '').trim().toLowerCase() === 'alertas';
}

/**
 * Email de bienvenida de los avisos: uno por alta (la fecha queda en `bienvenida`; vacío = no enviado). Solo a altas de
 * alertas Confirmadas, con consentimiento y token. No escribe en «Envíos» (no cuenta como campaña ni como secuencia) ni
 * toca `emails_confirmacion` (eso es del plan). Devuelve true si lo ha enviado ahora.
 */
function sendAlertsWelcome_(sub, row) {
  if (!isAlertsLead_(sub) || sub.estado !== 'Confirmado' || sub.marketing !== 'SI' || !sub.token || toDate_(sub.bienvenida)) return false;
  if (!canSend_(1)) { logError_('bienvenida', 'Sin cuota de email: ' + sub.email); return false; }
  try {
    const m = alertsWelcomeEmail_(sub);
    mail_(sub.email, m.subject, m.html);
    const ahora = new Date();
    updateObj_(T.SUBS, row, { bienvenida: ahora });
    sub.bienvenida = ahora;
    return true;
  } catch (err) {
    logError_('bienvenida', err);
    return false;
  }
}

/** Reenvía la bienvenida de avisos a quien no la recibió (sin cuota o error), solo a altas de los últimos 7 días (máx. 20 por ejecución). */
function retryAlertsWelcome_() {
  const limit = Date.now() - 7 * 864e5;
  table_(T.SUBS).rows
    .filter(s => s.estado === 'Confirmado' && s.marketing === 'SI' && s.token && isAlertsLead_(s) && !toDate_(s.bienvenida) && +toDate_(s.fecha_alta) > limit)
    .slice(0, 20)
    .forEach(s => sendAlertsWelcome_(s, s._row));
}

/** Máximo `max` llamadas por hora en total para el contador `key`: 40 altas por hora (`hr`, por defecto) evitan que alguien agote la cuota diaria de emails con el formulario; las propuestas tienen el suyo (`hb`). */
function rateLimited_(key = 'hr', max = 40) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get(key);
  let o = raw ? JSON.parse(raw) : { n: 0, t: Date.now() };
  if (Date.now() - o.t > 36e5) o = { n: 0, t: Date.now() };
  o.n++;
  cache.put(key, JSON.stringify(o), 3600);
  return o.n > max;
}

// ------------------------------------------------------ Propuestas (B2B)

// Propuestas de eventos o gimnasios (formularios `data-b2b` de simulacros/ y gimnasios/). Van a la hoja «Propuestas», NO a Suscriptores:
// no apuntan a nadie a ninguna lista, no hay token ni confirmación, y el único email es el aviso al titular (notifyProposal_).
// Cada formulario lleva su aviso informativo con una etiqueta (una por texto): su `data-aviso` debe ser igual a B2B_AVISOS[tipo]. Súbela si cambia el texto.
const B2B_AVISOS = { simulacro: '2026-10-b2b-sim-v1', gimnasio: '2026-10-b2b-gym-v1' };
const PROP_LIMITS = { nombre: 120, organizador: 120, localidad: 120, url: 200, mensaje: 500, email: 120 };
const PROP_TIPOS = ['simulacro', 'gimnasio'];
const PROP_ROLES = ['titular', 'equipo', 'otro'];
const PROP_ESTADOS = ['Nuevo', 'Verificada', 'Publicada', 'Descartada'];
const PROP_EMAIL_RE = /^[^\s@,;:<>"()\[\]\\]{1,64}@[^\s@,;:<>"()\[\]\\]+\.[^\s@,;:<>"()\[\]\\]{2,}$/; // más estricta que la del alta: sin separadores (va a replyTo)
const PROP_TEXT_COLS = ['nombre', 'organizador', 'email', 'localidad', 'fecha_evento', 'web', 'mensaje', 'notas', 'origen', 'version_aviso'];
const CTRL_ = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Una línea: solo acepta cadenas; quita saltos, controles y marcas bidi; null si no es texto o pasa de `max`. */
function cleanLine_(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\r\n\t]+/g, ' ').replace(CTRL_, '').replace(/\s+/g, ' ').trim();
  return s.length > max ? null : s;
}
/** Texto con saltos de línea (\n): sin \r, sin tabuladores ni controles. */
function cleanText_(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(CTRL_, '').replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return s.length > max ? null : s;
}
/** 'AAAA-MM-DD' real, desde hoy (Madrid) hasta dentro de 2 años; '' si no vale. */
function validEventDate_(v) {
  const m = typeof v === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return '';
  const t = todayUTC_(), max = new Date(Date.UTC(t.getUTCFullYear() + 2, t.getUTCMonth(), t.getUTCDate()));
  return d >= t && d <= max ? v : '';
}

/**
 * Recibe una propuesta de simulacro o gimnasio. Orden de validación: email → bots → tipo → nombre → organizador → provincia →
 * localidad → fecha → url → mensaje → rol. Bots, duplicados y fallos del aviso por email responden {ok:true} (nunca se le dice
 * al visitante que no llegó el aviso). No toca Suscriptores ni Envíos y no escribe nunca al proponente.
 */
function handleProposal_(req) {
  const val = k => (req[k] === undefined || req[k] === null ? '' : req[k]);
  const email = typeof req.email === 'string' ? req.email.trim().toLowerCase() : '';
  if (email.length > PROP_LIMITS.email || !PROP_EMAIL_RE.test(email)) return { ok: false, error: 'email' };
  // Bots: respondemos ok sin hacer nada. `!(x >= 3000)` rechaza también ms ausente o NaN.
  if (req.hp) return { ok: true };
  if (!(Number(req.ms) >= 3000)) return { ok: true };

  const tipo = typeof req.tipo === 'string' ? req.tipo.trim().toLowerCase() : '';
  if (PROP_TIPOS.indexOf(tipo) < 0) return { ok: false, error: 'tipo' };
  const nombre = cleanLine_(val('nombre'), PROP_LIMITS.nombre);
  if (!nombre) return { ok: false, error: 'nombre' };
  const organizador = cleanLine_(val('organizador'), PROP_LIMITS.organizador);
  if (organizador === null || (tipo === 'simulacro' && !organizador)) return { ok: false, error: 'organizador' };
  const provincia = typeof req.provincia === 'string' ? provinceSlug_(req.provincia) : null;
  if (!provincia) return { ok: false, error: 'provincia' };
  const localidad = cleanLine_(val('localidad'), PROP_LIMITS.localidad);
  if (!localidad) return { ok: false, error: 'localidad' };
  let fecha_evento = '';
  if (tipo === 'simulacro') { fecha_evento = validEventDate_(req.fecha_evento); if (!fecha_evento) return { ok: false, error: 'fecha' }; }
  const web = typeof req.url === 'string' ? req.url.trim() : '';
  if (web.length > PROP_LIMITS.url || !/^https?:\/\/[^\s\u0000-\u001F\u007F"<>]+$/i.test(web)) return { ok: false, error: 'url' };
  const mensaje = cleanText_(val('mensaje'), PROP_LIMITS.mensaje);
  if (mensaje === null) return { ok: false, error: 'mensaje' };
  const rol = typeof req.rol === 'string' ? req.rol.trim().toLowerCase() : (val('rol') === '' ? '' : null);
  if (rol === null || (rol && PROP_ROLES.indexOf(rol) < 0)) return { ok: false, error: 'rol' };
  const destacado = tipo === 'simulacro' && req.destacado === true ? 'SI' : 'NO';
  const origen = cleanLine_(String(val('origen')).slice(0, 40), 40) || '';
  const version_aviso = req.aviso === B2B_AVISOS[tipo] ? req.aviso : ''; // desconocida o del otro tipo: se guarda vacía y se avisa

  // Una clave por propuesta (60 s) y un límite propio (10/h) que no comparte contador con las altas (hr)
  const cache = CacheService.getScriptCache();
  const key = 'pb:' + tipo.charAt(0) + ':' + email + ':' + slug_(nombre).replace(/\s+/g, ' ').slice(0, 60); // < 250 caracteres
  if (cache.get(key)) return { ok: true };
  if (rateLimited_('hb', 10)) return { ok: false, error: 'busy' };
  cache.put(key, '1', 60);

  return withLock_(() => {
    ensureHeader_(T.PROP); // hoja ausente o vacía: crea la cabecera antes de añadir la fila
    const nslug = slug_(nombre).replace(/\s+/g, ' ');
    const dup = table_(T.PROP).rows.find(r => String(r.email).toLowerCase() === email && r.tipo === tipo &&
      slug_(r.nombre).replace(/\s+/g, ' ') === nslug && (!r.estado || r.estado === 'Nuevo' || r.estado === 'Verificada'));
    if (dup) return { ok: true };
    // Los prefijos «P» evitan que Sheets convierta el id en número. appendObj_ ya neutraliza las fórmulas (isRisky_).
    const p = { id: 'P' + shortId_(), fecha: new Date(), tipo, nombre, organizador, email, provincia, localidad, fecha_evento,
      web, mensaje, destacado, rol, origen, estado: 'Nuevo', notas: '', fecha_revision: '', notificada: '', version_aviso };
    appendObj_(T.PROP, p);
    if (!version_aviso) logError_('propuesta', 'Versión de aviso desconocida en ' + p.id);
    notifyProposal_(p, lastRow_(T.PROP));
    return { ok: true };
  });
}

/** Destinatario del aviso: EMAIL_PROPUESTAS → CONTACT_EMAIL → cuenta de Google. Solo sale de la hoja Config, nunca de la petición.
 *  OJO: cfg_() sustituye un CONTACT_EMAIL vacío por su valor por defecto (info@ritmohibrido.com); el tercer nivel solo se alcanza con un valor no vacío e inválido.
 *  `warn`=true anota en el Registro un valor inválido (los chequeos del panel lo llaman con false). */
function proposalRecipient_(warn) {
  const c = cfg_();
  const ok = v => typeof v === 'string' && v.length <= 120 && PROP_EMAIL_RE.test(v);
  for (const k of ['EMAIL_PROPUESTAS', 'CONTACT_EMAIL']) {
    const v = String(c[k] === undefined || c[k] === null ? '' : c[k]).trim();
    if (!v) continue;
    if (ok(v)) return v;
    if (warn) logError_('propuesta', 'Config ' + k + ' no es un email válido');
  }
  try { const me = String(Session.getEffectiveUser().getEmail() || '').trim(); if (ok(me)) return me; } catch (e) { /* sin cuenta */ }
  return '';
}
/** Enlace a la hoja Propuestas para el email, o '' si no se puede obtener (el email sale igual, sin el botón). */
function sheetUrl_() {
  try {
    const ss = SpreadsheetApp.getActive(), u = String(ss.getUrl());
    const sh = sheet_(T.PROP);
    const gid = typeof sh.getSheetId === 'function' ? '#gid=' + sh.getSheetId() : '';
    return /^https:\/\/docs\.google\.com\/[^\s"<>]*$/.test(u) ? u.replace(/#.*$/, '') + gid : '';
  } catch (e) { return ''; }
}
function redact_(s) { return String(s || '').replace(/[^\s@,;<>"]+@[^\s@,;<>"]+/g, '[email]').slice(0, 200); }
function proposalDailyCap_() { const n = Number(cfg_().PROPUESTAS_MAX_DIA); return isNaN(n) ? 20 : Math.max(0, Math.floor(n)); }

/** Avisa al titular de una propuesta. Nunca escribe al proponente. Si no hay destinatario, cuota o tope diario, no envía:
 *  la fila queda con `notificada` vacía, se anota en el Registro SOLO el id (jamás email ni nombre) y runDailyJob lo reintenta. */
function notifyProposal_(p, row) {
  if (toDate_(p.notificada)) return false;
  const to = proposalRecipient_(true);
  if (!to) { logError_('propuesta', 'Sin destinatario válido para avisar de ' + p.id); return false; }
  if (canSendBudget_() <= 0) { logError_('propuesta', 'Sin cuota de email para avisar de ' + p.id); return false; }
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const sentToday = table_(T.PROP).rows.filter(r => toDate_(r.notificada) && Utilities.formatDate(toDate_(r.notificada), TZ, 'yyyy-MM-dd') === today).length;
  if (sentToday >= proposalDailyCap_()) { logError_('propuesta', 'Tope diario de avisos alcanzado: ' + p.id + ' queda sin avisar'); return false; }
  try {
    const m = proposalEmail_(p, sheetUrl_());
    mail_(to, m.subject, m.html, { replyTo: p.email });
    const now = new Date();
    updateObj_(T.PROP, row, { notificada: now });
    p.notificada = now;
    return true;
  } catch (err) {
    logError_('propuesta', 'Fallo al enviar el aviso de ' + p.id + ': ' + redact_(err && err.message));
    return false;
  }
}
/** Reenvía los avisos pendientes de las propuestas Nuevas de los últimos 7 días (máx. 10 por ejecución). */
function retryProposalNotices_() {
  const limit = Date.now() - 7 * 864e5;
  const pend = table_(T.PROP).rows.filter(r => !toDate_(r.notificada) && (!r.estado || r.estado === 'Nuevo') && toDate_(r.fecha) && +toDate_(r.fecha) > limit).slice(0, 10);
  if (!pend.length) return;
  if (canSendBudget_() <= 0) { logError_('propuesta', pend.length + ' propuestas siguen sin aviso por falta de cuota'); return; }
  for (const p of pend) if (!notifyProposal_(p, p._row)) break; // sin destinatario, cuota o tope: no insiste con el resto
}

/**
 * Menú (manual): vacía `email`, `mensaje` y `notas` de las propuestas ya resueltas hace más de 12 meses (Descartada, Publicada o
 * Verificada, con `fecha_revision` anterior). Cumple el plazo de conservación de la política de privacidad. No borra filas y no
 * toca id, fecha, tipo, nombre ni estado; las propuestas Nuevas (sin resolver) y las sin fecha_revision no se tocan. En el Registro
 * solo queda el número de filas. Devuelve ese número.
 */
function purgeOldProposals() {
  const limit = new Date(); limit.setMonth(limit.getMonth() - 12);
  return withLock_(() => {
    ensureHeader_(T.PROP);
    const old = table_(T.PROP).rows.filter(r => ['Descartada', 'Publicada', 'Verificada'].indexOf(r.estado) >= 0 &&
      toDate_(r.fecha_revision) && toDate_(r.fecha_revision) < limit && (String(r.email) !== '' || String(r.mensaje) !== '' || String(r.notas) !== ''));
    old.forEach(r => updateObj_(T.PROP, r._row, { email: '', mensaje: '', notas: '' }));
    logError_('propuestas', 'Purga de propuestas antiguas: ' + old.length + ' filas');
    Logger.log('Propuestas vaciadas (email, mensaje y notas): ' + old.length);
    try { SpreadsheetApp.getActive().toast('Propuestas vaciadas: ' + old.length); } catch (e) { /* sin interfaz */ }
    return old.length;
  });
}

// ---------------------------------------------------- Enlaces antiguos y baja

/** Solo para enlaces de confirmación enviados antes del alta de un solo paso: activa la alta pendiente. */
function handleConfirm_(req) {
  const t = String(req.token || '');
  if (!/^[a-f0-9]{32}$/.test(t)) return { ok: false, error: 'token' };
  return withLock_(() => {
    const sub = table_(T.SUBS).rows.find(s => s.token === t);
    if (!sub || sub.estado === 'Baja') return { ok: false, error: 'token' };
    if (sub.estado === 'Pendiente') {
      const now = new Date();
      const patch = { estado: 'Confirmado', marketing: 'SI', fecha_confirmacion: now, consentimiento: CONSENT_PLAN, consentimientos: addConsent_(sub, CONSENT_PLAN, now) };
      updateObj_(T.SUBS, sub._row, patch);
      Object.assign(sub, patch);
      sendPlan_(sub, sub._row);
    }
    return { ok: true, plan: cfg_().PLAN_URL };
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

/**
 * Se ejecuta cada día (disparador). Reenvía los planes, las bienvenidas de avisos y los avisos de propuestas que no salieron (sin cuota), envía los emails de la secuencia
 * de bienvenida que toquen (van primero porque dependen del día exacto) y la campaña que toque.
 */
function runDailyJob() {
  const t0 = Date.now();
  try {
    ensureSchema_();
    const retried = retryPlanEmails_();
    retryAlertsWelcome_();
    try { retryProposalNotices_(); } catch (err) { logError_('propuestas', err); } // aislado: un fallo de propuestas no bloquea la secuencia ni las campañas
    sendSequence_(t0, retried);
    sendDueCampaign_(t0);
    setCfg_('ULTIMA_EJECUCION', new Date());
  } catch (err) {
    logError_('runDailyJob', err);
  }
}

/** Reenvía el plan a quien no lo recibió (sin cuota). Devuelve { email: true } de los reintentados. */
function retryPlanEmails_() {
  const limit = Date.now() - 7 * 864e5;
  const out = {};
  table_(T.SUBS).rows
    .filter(s => s.estado === 'Confirmado' && !Number(s.emails_confirmacion || 0) && s.token && +toDate_(s.fecha_alta) > limit && wantsPlan_(s))
    .slice(0, 20)
    .forEach(s => { out[s.email] = true; sendPlan_(s, s._row); });
  return out;
}

function sendDueCampaign_(t0) {
  const now = new Date();
  const due = table_(T.CAMP).rows.filter(c =>
    (c.estado === 'Programada' || c.estado === 'En curso') && toDate_(c.fecha_envio) && toDate_(c.fecha_envio) <= now);

  // Segmento por provincias e intereses. Si hay un segmento escrito pero ninguna provincia (o ningún interés) se reconoce
  // (una errata), no se envía a nadie ni se da la campaña por enviada: queda como está, el aviso sale en el panel (Registro)
  // y se pasa a la siguiente campaña vencida (una errata no bloquea las demás). Solo se procesa UNA campaña por ejecución.
  let camp = null, seg = null, iseg = null;
  for (const c of due) {
    const s1 = parseSegment_(c.segmento_ciudad), s2 = parseInterestSegment_(c.segmento_interes);
    if (s1.unknown.length) logError_('segmento ' + c.id, 'Provincia no reconocida: ' + s1.unknown.join(', '));
    if (s2.unknown.length) logError_('segmento ' + c.id, 'Interés no reconocido: ' + s2.unknown.join(', '));
    if (s1.empty || s2.empty) continue;
    camp = c; seg = s1; iseg = s2;
    break;
  }
  if (!camp) return;
  const recipients = table_(T.SUBS).rows.filter(s =>
    s.estado === 'Confirmado' && s.marketing === 'SI' && inSegment_(seg, s.ciudad) && inInterestSegment_(iseg, s));

  const sendsSh = sheet_(T.SENDS);
  const prev = table_(T.SENDS).rows.filter(r => r.campana === camp.id);
  const done = {}, fails = {};
  prev.forEach(r => {
    if (r.resultado === 'OK') done[r.email] = true;
    else fails[r.email] = (fails[r.email] || 0) + 1;
  });

  // Quien ha recibido hoy un email de la secuencia recibe la campaña otro día (sigue En curso): nunca dos emails el mismo día
  const today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const seqToday = s => !!toDate_(s.fecha_secuencia) && Utilities.formatDate(toDate_(s.fecha_secuencia), TZ, 'yyyy-MM-dd') === today;
  const pending = recipients.filter(s => !done[s.email] && (fails[s.email] || 0) < 2 && !seqToday(s));
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

// ------------------------------------------------- Secuencia de bienvenida

/**
 * Envía a cada suscriptor activo que pidió el plan (no a las altas de solo alertas) el siguiente email de SEQUENCE que le toque por los días desde su alta.
 * - Si se le han pasado varios (p. ej. unos días sin cuota), recibe solo el más reciente y los anteriores se saltan:
 *   nunca le llega el email del día 2 en la semana 4.
 * - Entre dos emails de la secuencia, o tras una campaña, pasan al menos SEQ_MIN_GAP_DAYS días.
 * - Solo para altas desde SECUENCIA_DESDE (se fija sola la primera vez, una semana atrás): la lista antigua no la recibe.
 * - Cada envío queda en «Envíos» como `secuencia-N` y en el suscriptor (`secuencia` = último paso, `fecha_secuencia`).
 */
function sendSequence_(t0, skip) {
  const c = cfg_();
  if (String(c.SECUENCIA_ACTIVA).toUpperCase() !== 'SI') return;
  const since = toDate_(c.SECUENCIA_DESDE);
  if (!since) return;
  const now = new Date();
  const gap = SEQ_MIN_GAP_DAYS * 864e5;

  const recentCamp = {};
  table_(T.SENDS).rows.forEach(r => {
    const d = toDate_(r.fecha);
    if (r.resultado === 'OK' && d && now - d < gap && String(r.campana).indexOf('secuencia-') !== 0) recentCamp[r.email] = true;
  });

  const due = [];
  table_(T.SUBS).rows.forEach(s => {
    const alta = toDate_(s.fecha_alta);
    if (s.estado !== 'Confirmado' || s.marketing !== 'SI' || !s.token || !alta || alta < since) return;
    if (!wantsPlan_(s)) return; // quien nunca pidió el plan no recibe una secuencia que habla del plan (sí las campañas del mes)
    if (!Number(s.emails_confirmacion || 0)) return; // antes tiene que haberle llegado el plan
    const last = toDate_(s.fecha_secuencia);
    if ((last && now - last < gap) || recentCamp[s.email] || (skip && skip[s.email])) return; // `skip`: hoy ya le llegó el plan
    const days = Math.floor((now - alta) / 864e5);
    const step = SEQUENCE.filter(x => x.paso > Number(s.secuencia || 0) && x.dia <= days).pop();
    if (step) due.push({ s, step });
  });
  if (!due.length) return;

  const sendsSh = sheet_(T.SENDS);
  const log = [];
  let budget = canSendBudget_();
  for (const { s, step } of due) {
    if (budget <= 0 || Date.now() - t0 > 2.5 * 60 * 1000) break;
    const id = 'secuencia-' + step.paso;
    let ok = true;
    try {
      const m = sequenceEmail_(step.paso, s);
      mail_(s.email, m.subject, m.html);
    } catch (err) {
      ok = false;
      logError_(id, err);
    }
    // Un fallo no se reintenta: se da el paso por hecho para no insistir cada día con una dirección que no funciona
    updateObj_(T.SUBS, s._row, { secuencia: step.paso, fecha_secuencia: new Date() });
    log.push([new Date(), id, s.email, ok ? 'OK' : 'ERROR']);
    budget--;
  }
  if (log.length) sendsSh.getRange(sendsSh.getLastRow() + 1, 1, log.length, 4).setValues(log);
}

/** Escribe la cabecera de COLS en una hoja vacía (o añade las columnas que falten). Lo llaman setup y el manejador de propuestas. */
function ensureHeader_(name) {
  const sh = sheet_(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, COLS[name].length).setValues([COLS[name]]).setFontWeight('bold').setBackground('#0E1013').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  } else ensureColumns_(name);
  return sh;
}

/** Añade al final de una hoja existente las columnas de COLS que le falten, sin tocar los datos. Una hoja vacía no se toca. */
function ensureColumns_(name) {
  const sh = sheet_(name);
  if (sh.getLastRow() === 0) return;
  const head = headOf_(sh);
  const missing = COLS[name].filter(col => head.indexOf(col) < 0);
  if (missing.length) {
    sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing])
      .setFontWeight('bold').setBackground('#0E1013').setFontColor('#FFFFFF');
  }
}

/**
 * Pone al día una hoja creada con una versión anterior: añade al final las columnas nuevas de COLS y los ajustes nuevos
 * de CFG_DEFAULTS, sin tocar los datos. La primera vez fija SECUENCIA_DESDE. Lo llaman setup y runDailyJob.
 */
function ensureSchema_() {
  Object.keys(COLS).forEach(ensureColumns_);
  const cfg = sheet_(T.CFG);
  if (cfg.getLastRow() === 0) return;
  const keys = table_(T.CFG).rows.map(r => r.clave);
  CFG_DEFAULTS.filter(([k]) => keys.indexOf(k) < 0).forEach(row => cfg.appendRow(row));
  if (keys.indexOf('SECUENCIA_DESDE') < 0) {
    cfg.appendRow(['SECUENCIA_DESDE', new Date(Date.now() - 7 * 864e5),
      'Solo reciben la secuencia de bienvenida las altas desde esta fecha (se fijó sola al activarla)']);
  }
}

/** Menú: manda a tu cuenta los emails de la secuencia con datos de ejemplo (provincia de Sevilla y carrera de Málaga). */
function sendTestSequence() {
  const me = Session.getEffectiveUser().getEmail();
  const sub = { email: me, token: '0'.repeat(32), ciudad: 'sevilla', carrera: 'malaga' };
  SEQUENCE.forEach(x => {
    const m = sequenceEmail_(x.paso, sub);
    mail_(me, '[PRUEBA ' + x.paso + '/' + SEQUENCE.length + '] ' + m.subject, m.html);
  });
  Logger.log('Secuencia de prueba enviada a ' + me);
}

/** Menú: manda a tu cuenta el email de bienvenida de los avisos con datos de ejemplo (Sevilla, carreras y simulacros). No toca la hoja. */
function sendTestAlertsWelcome() {
  const me = Session.getEffectiveUser().getEmail();
  const m = alertsWelcomeEmail_({ email: me, token: '0'.repeat(32), ciudad: 'sevilla', intereses: 'carreras,simulacros' });
  mail_(me, '[PRUEBA] ' + m.subject, m.html);
  Logger.log('Bienvenida de avisos de prueba enviada a ' + me);
}

/** Menú: manda a tu cuenta (no al destinatario de Config) un aviso de propuesta con datos de ejemplo. No toca ninguna hoja. */
function sendTestProposal() {
  const me = Session.getEffectiveUser().getEmail();
  const m = proposalEmail_({
    id: 'PPRUEBA', fecha: new Date(), tipo: 'simulacro', nombre: 'Simulacro de ejemplo', organizador: 'Club de ejemplo', email: me,
    provincia: 'sevilla', localidad: 'Dos Hermanas · Pabellón', fecha_evento: Utilities.formatDate(new Date(Date.now() + 30 * 864e5), TZ, 'yyyy-MM-dd'),
    web: 'https://example.com/simulacro', mensaje: 'Mensaje de ejemplo.\nSegunda línea.', rol: 'titular', destacado: 'SI',
  }, sheetUrl_());
  mail_(me, '[PRUEBA] ' + m.subject, m.html, { replyTo: me });
  Logger.log('Aviso de propuesta de prueba enviado a ' + me);
}

// -------------------------------------------------------- Menú y utilidades

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Ritmo Híbrido')
    .addItem('Configurar (primera vez)', 'setup')
    .addItem('Enviar email de prueba a mi cuenta', 'sendTestCampaign')
    .addItem('Enviarme la secuencia de bienvenida (prueba)', 'sendTestSequence')
    .addItem('Enviarme el email de bienvenida de avisos (prueba)', 'sendTestAlertsWelcome')
    .addItem('Enviarme un aviso de propuesta (prueba)', 'sendTestProposal')
    .addItem('Ejecutar el envío ahora', 'runDailyJob')
    .addItem('Borrar emails de propuestas antiguas', 'purgeOldProposals')
    .addToUi();
}

/** Cuando un contacto pasa a "Cerrado" se rellenan la fecha de cierre y la comisión por defecto. En Propuestas, la fecha de revisión. */
function onEdit(e) {
  try {
    const sh = e.range.getSheet();
    if (sh.getName() === T.PROP) { propEdit_(e, sh); return; }
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

/** Al pasar una propuesta a Verificada, Publicada o Descartada se rellena la fecha de revisión (sin pisar una que ya exista). */
function propEdit_(e, sh) {
  if (e.range.getRow() < 2) return;
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (e.range.getColumn() !== head.indexOf('estado') + 1) return;
  if (['Verificada', 'Publicada', 'Descartada'].indexOf(String(e.value)) < 0) return;
  const c = sh.getRange(e.range.getRow(), head.indexOf('fecha_revision') + 1);
  if (!c.getValue()) c.setValue(new Date());
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

  Object.keys(COLS).forEach(ensureHeader_);

  const cfg = sheet_(T.CFG);
  if (cfg.getLastRow() === 0) {
    cfg.getRange(1, 1, 1, 3).setValues([['clave', 'valor', 'nota']]).setFontWeight('bold').setBackground('#0E1013').setFontColor('#FFFFFF');
    cfg.getRange(2, 1, CFG_DEFAULTS.length, 3).setValues(CFG_DEFAULTS);
    cfg.setFrozenRows(1);
    cfg.setColumnWidth(1, 190); cfg.setColumnWidth(2, 420); cfg.setColumnWidth(3, 520);
  }
  ensureSchema_();

  const list = (sheetName, col, values) => {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
    sheet_(sheetName).getRange(2, COLS[sheetName].indexOf(col) + 1, 1000, 1).setDataValidation(rule);
  };
  list(T.LEADS, 'estado', ['Nuevo', 'Contactado', 'Cerrado', 'Descartado']);
  list(T.CAMP, 'estado', ['Borrador', 'Programada', 'En curso', 'Enviada']);
  list(T.CAMP, 'publi_activa', ['SI', 'NO']);
  // Propuestas: solo desplegables (requireValueInList). Nada de validaciones con fórmula (REGEXMATCH no vale en la hoja del usuario).
  list(T.PROP, 'estado', PROP_ESTADOS);
  list(T.PROP, 'tipo', PROP_TIPOS);
  // Texto plano en las columnas que escribe el visitante (también cubre lo que no parece una fórmula pero Sheets convertiría, p. ej. fechas)
  // El rango se limita a las filas que tiene la hoja (una hoja nueva trae 1000): formatear fuera de ellas puede dar error.
  const propSh = sheet_(T.PROP);
  const propRows = Math.max(1, Math.min(4999, (typeof propSh.getMaxRows === 'function' ? propSh.getMaxRows() : 1000) - 1));
  PROP_TEXT_COLS.forEach(col => propSh.getRange(2, COLS[T.PROP].indexOf(col) + 1, propRows, 1).setNumberFormat('@'));

  // segmento_interes admite una lista separada por comas, así que no sirve un desplegable (requireValueInList). Tampoco una
  // validación con fórmula: Google Sheets la rechaza según el idioma de la hoja. Se explica en la nota de la cabecera y un valor
  // erróneo se avisa en el Registro al enviar (parseInterestSegment_). Solo se aplica al ejecutar setup, no con ensureSchema_.
  const ci = COLS[T.CAMP].indexOf('segmento_interes') + 1;
  sheet_(T.CAMP).getRange(1, ci).setNote('Vacío = todos. carreras, simulacros, gimnasios separados por comas. Se combina (Y) con segmento_ciudad.');

  const camp = sheet_(T.CAMP);
  if (camp.getLastRow() < 2) {
    const next = new Date(); next.setMonth(next.getMonth() + 1, 5); next.setHours(0, 0, 0, 0);
    appendObj_(T.CAMP, {
      id: shortId_(), mes: Utilities.formatDate(next, TZ, 'yyyy-MM'), fecha_envio: next,
      asunto: 'Calendario HYROX y plan del mes',
      titulo: 'Tu resumen del mes',
      cuerpo: 'Hola,\n\nEstas son las novedades del mes en el mundo de las carreras híbridas:\n\n- Calendario de carreras actualizado.\n- Un consejo de entrenamiento.\n\nTodo el detalle en [nuestra guía](https://ritmohibrido.com/calendario/).\n\nNos vemos en la meta.',
      publi_activa: 'NO', publi_titulo: '', publi_texto: '', publi_enlace: '', publi_boton: 'Más información',
      segmento_ciudad: '', segmento_interes: '', estado: 'Borrador', enviados: 0, errores: 0,
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

/** Número de columna (1 = A) → letra de columna de la hoja (27 = AA). */
function colLetter_(n) {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
  return s;
}

function canSend_(n) { return MailApp.getRemainingDailyQuota() >= n; }
function canSendBudget_() {
  return Math.max(0, MailApp.getRemainingDailyQuota() - Number(cfg_().CUOTA_RESERVA || 10));
}
