/**
 * Plantillas y envío de emails. Diseño en tablas con estilos en línea (lo que aguantan los clientes de correo).
 */

const MAIL_C = { bg: '#0E1013', ink: '#14171C', mut: '#5E6773', acc: '#FF5A1F', teal: '#2EC4B6', line: '#E2E5EA', soft: '#F5F6F8' };
const FONT = "'Barlow Condensed','Arial Narrow',Arial,sans-serif";
const BODY_FONT = "Barlow,Arial,Helvetica,sans-serif";

function mail_(to, subject, html) {
  const c = cfg_();
  const opts = { to, subject, htmlBody: html, body: htmlToText_(html), name: c.SENDER_NAME || 'Ritmo Híbrido' };
  if (c.REPLY_TO) opts.replyTo = c.REPLY_TO;
  MailApp.sendEmail(opts);
}

function esc_(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Texto de la hoja → HTML: párrafos, listas con "- " y enlaces [texto](https://...). Todo escapado antes. */
function richText_(src) {
  const blocks = String(src || '').replace(/\r/g, '').split(/\n{2,}/);
  const inline = t => esc_(t).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (m, text, url) => '<a href="' + url + '" style="color:' + MAIL_C.acc + ';font-weight:700">' + text + '</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return blocks.map(b => {
    const lines = b.split('\n').filter(l => l.trim());
    if (!lines.length) return '';
    if (lines.every(l => /^\s*-\s+/.test(l))) {
      return '<ul style="margin:0 0 16px;padding-left:20px">' +
        lines.map(l => '<li style="margin-bottom:6px">' + inline(l.replace(/^\s*-\s+/, '')) + '</li>').join('') + '</ul>';
    }
    return '<p style="margin:0 0 16px">' + lines.map(inline).join('<br>') + '</p>';
  }).join('');
}

function htmlToText_(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h1>|<\/tr>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function button_(url, label) {
  return '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 20px"><tr><td style="background:' + MAIL_C.acc +
    ';border-radius:4px"><a href="' + url + '" style="display:inline-block;padding:13px 26px;font-family:' + FONT +
    ';font-size:18px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none">' + esc_(label) + '</a></td></tr></table>';
}

/** Estructura común: cabecera de marca, contenido, bloque de publicidad opcional y pie legal. */
function layout_(o) {
  const c = cfg_();
  const footer = [
    o.reason,
    'Responsable: Ritmo Híbrido.com, El Bierzo, Sevilla (' + esc_(c.CONTACT_EMAIL) + '). <a href="' + c.SITE_URL + '/privacidad/" style="color:' + MAIL_C.mut + '">Política de privacidad</a>.',
    o.unsubUrl ? '<a href="' + o.unsubUrl + '" style="color:' + MAIL_C.mut + '">Darme de baja con un clic</a>' : '',
  ].filter(Boolean).join('<br>');
  return '<!doctype html><html lang="es"><body style="margin:0;padding:0;background:' + MAIL_C.soft + '">' +
    '<span style="display:none;max-height:0;overflow:hidden;opacity:0">' + esc_(o.preheader || '') + '</span>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:' + MAIL_C.soft + '"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden">' +
    '<tr><td style="background:' + MAIL_C.bg + ';padding:20px 28px;font-family:' + FONT + ';font-size:26px;font-weight:800;font-style:italic;text-transform:uppercase;color:#ffffff;letter-spacing:.5px">' +
    'Ritmo<span style="color:' + MAIL_C.acc + '">/</span>Híbrido</td></tr>' +
    '<tr><td style="padding:32px 28px 8px;font-family:' + BODY_FONT + ';font-size:16px;line-height:1.55;color:' + MAIL_C.ink + '">' +
    '<h1 style="margin:0 0 18px;font-family:' + FONT + ';font-size:34px;line-height:1;font-weight:800;font-style:italic;text-transform:uppercase;color:' + MAIL_C.ink + '">' + esc_(o.title) + '</h1>' +
    o.bodyHtml + '</td></tr>' +
    (o.adHtml ? '<tr><td style="padding:0 28px 24px">' + o.adHtml + '</td></tr>' : '') +
    '<tr><td style="padding:20px 28px 28px;border-top:1px solid ' + MAIL_C.line + ';font-family:' + BODY_FONT + ';font-size:12px;line-height:1.6;color:' + MAIL_C.mut + '">' + footer + '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function welcomeEmail_(sub) {
  const c = cfg_();
  const consent = '<p style="margin:0 0 16px;font-size:14px;color:' + MAIL_C.mut + '">Al pedir el plan aceptaste recibir, de vez en cuando, comunicaciones informativas y comerciales de Ritmo Híbrido y de centros colaboradores (novedades, consejos y ofertas). Si no te interesa, o no fuiste tú quien lo pidió, puedes darte de baja con un clic al pie de este email.</p>';
  return layout_({
    preheader: 'Aquí tienes tu plan de 16 semanas.',
    title: 'Aquí tienes tu plan',
    bodyHtml: '<p style="margin:0 0 16px">Gracias por pedirlo. Este es tu plan completo de 16 semanas, sesión a sesión, con ritmos, estrategia de carrera y registro de progreso.</p>' +
      button_(c.PLAN_URL, 'Descargar el plan (PDF)') +
      '<p style="margin:0 0 16px">Un consejo para empezar: cuenta 16 semanas hacia atrás desde tu carrera y marca en el calendario el día de inicio. Tienes las fechas en <a href="' +
      c.SITE_URL + '/calendario/" style="color:' + MAIL_C.acc + ';font-weight:700">el calendario</a>.</p>' + consent,
    reason: 'Recibes este email porque alguien pidió el plan con esta dirección en ritmohibrido.com. Si no has sido tú, date de baja con un clic y no recibirás nada más.',
    unsubUrl: sub.token ? c.SITE_URL + '/baja/?t=' + sub.token : '',
  });
}

function campaignEmail_(camp, sub) {
  const c = cfg_();
  const ad = String(camp.publi_activa).toUpperCase() === 'SI' && (camp.publi_titulo || camp.publi_texto)
    ? adBox_('Publicidad', camp.publi_titulo, camp.publi_texto, camp.publi_enlace, camp.publi_boton) : '';
  return layout_({
    preheader: camp.titulo || camp.asunto,
    title: camp.titulo || camp.asunto,
    bodyHtml: richText_(camp.cuerpo),
    adHtml: ad,
    reason: 'Recibes este email porque te apuntaste a ritmohibrido.com y aceptaste recibir información y ofertas por email.',
    unsubUrl: c.SITE_URL + '/baja/?t=' + sub.token,
  });
}

/** Recuadro de publicidad o de centro colaborador, siempre con su etiqueta visible. `text` admite el formato de la hoja. */
function adBox_(label, title, text, url, button) {
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ' + MAIL_C.line + ';border-radius:6px"><tr><td style="padding:16px 18px;font-family:' + BODY_FONT + ';font-size:15px;line-height:1.5;color:' + MAIL_C.ink + '">' +
    '<div style="font-size:11px;letter-spacing:2px;font-weight:700;text-transform:uppercase;color:' + MAIL_C.mut + ';margin-bottom:6px">' + esc_(label) + '</div>' +
    (title ? '<div style="font-family:' + FONT + ';font-size:22px;font-weight:800;text-transform:uppercase;margin-bottom:6px">' + esc_(title) + '</div>' : '') +
    (text ? '<div style="margin-bottom:10px">' + richText_(text).replace(/margin:0 0 16px/g, 'margin:0 0 8px') + '</div>' : '') +
    (/^https?:\/\//.test(String(url)) ? '<a href="' + esc_(url) + '" style="color:' + MAIL_C.acc + ';font-weight:700">' + esc_(button || 'Más información') + ' →</a>' : '') +
    '</td></tr></table>';
}

// ------------------------------------------------- Secuencia de bienvenida

// Centro colaborador destacado por provincia: sale en los emails 2 y 4 de la secuencia a quien vive en esa provincia.
// El texto de WhatsApp dice que viene del email, para que el centro sepa a quién apuntar en la hoja «Contactos».
const SEQ_PARTNERS = {
  'sevilla': {
    nombre: 'Good Training', zona: 'Dos Hermanas · Utrera',
    texto: 'Clases de carrera híbrida a diario, con trineo, SkiErg, remo y wall balls, y entrenadores que corrigen la técnica. La primera clase es de prueba y sin compromiso.',
    enlace: 'https://wa.me/34632340674?text=' + encodeURIComponent('Hola, os he conocido por el email de Ritmo Híbrido y me gustaría probar una clase de entrenamiento para HYROX.'),
    boton: 'Pedir clase de prueba por WhatsApp',
  },
};
// Provincias con página de directorio en /gimnasios/<provincia>/ (el resto va al índice /gimnasios/)
const SEQ_DIRECTORY = ['madrid', 'barcelona', 'valencia', 'malaga', 'sevilla'];

const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Fechas como días de calendario (medianoche UTC), para contar semanas sin líos de horario de verano. */
function dayUTC_(ymd) { const p = String(ymd).split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }
function todayUTC_() { return dayUTC_(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd')); }
function longDay_(d) { return DIAS_ES[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + MESES_ES[d.getUTCMonth()]; }

/** Carrera del suscriptor, si es futura: fecha, semanas que faltan y lunes en que empieza el plan de 16 semanas. */
function raceInfo_(sub) {
  const r = Object.prototype.hasOwnProperty.call(RACES, sub.carrera) ? RACES[sub.carrera] : null;
  if (!r) return null;
  const race = dayUTC_(r.start), today = todayUTC_();
  if (race <= today) return null;
  const start = new Date(race - 112 * 864e5);
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7); // el lunes de esa semana
  return {
    city: r.city, label: r.label, page: r.page, start,
    weeksLeft: Math.floor((race - today) / (7 * 864e5)),
    week: Math.floor((today - start) / (7 * 864e5)) + 1, // semana del plan en la que debería estar hoy (<1: aún no empieza)
  };
}

/** Bloque de «entrena con material real»: el centro colaborador de su provincia, o el directorio. */
function gymBlock_(sub, c) {
  const prov = provinceSlug_(sub.ciudad);
  const p = prov && Object.prototype.hasOwnProperty.call(SEQ_PARTNERS, prov) ? SEQ_PARTNERS[prov] : null;
  if (p) return { body: '', ad: adBox_('Centro colaborador · ' + provinceName_(prov), p.nombre + ' · ' + p.zona, p.texto, p.enlace, p.boton) };
  const has = SEQ_DIRECTORY.indexOf(prov) >= 0;
  const url = c.SITE_URL + '/gimnasios/' + (has ? prov + '/' : '');
  return {
    body: '<p style="margin:0 0 16px">' + (has
      ? 'Hemos revisado uno a uno los centros de ' + esc_(provinceName_(prov)) + ' que tienen clases o material de carrera híbrida.'
      : 'En el directorio tienes, ciudad a ciudad, los centros que confirman en su web clases o material de carrera híbrida.') + '</p>' +
      button_(url, has ? 'Gimnasios en ' + provinceName_(prov) : 'Ver el directorio de gimnasios'),
    ad: '',
  };
}

/** Email `paso` (1–4) de la secuencia de bienvenida. Devuelve { subject, html }. */
function sequenceEmail_(paso, sub) {
  const c = cfg_();
  const race = raceInfo_(sub);
  const link = (text, path) => '[' + text + '](' + c.SITE_URL + path + ')';
  const reply = '<p style="margin:0 0 16px">¿Alguna duda con el plan? Responde a este email y te contestamos.</p>';
  let o;

  if (paso === 1) {
    let when;
    if (!race) {
      when = 'Si todavía no tienes carrera, elige una en ' + link('el calendario', '/calendario/') + ' y cuenta 16 semanas hacia atrás: ese lunes es tu semana 1. Y si quieres empezar ya, adelante: las semanas 1 a 4 son de base y valen para cualquier fecha.';
    } else if (race.week < 1) {
      when = 'Preparas **' + race.city + '** (' + race.label + '). Para hacer el plan completo, tu semana 1 empieza el **' + longDay_(race.start) + '**. Hasta entonces, dos o tres rodajes suaves por semana y llegarás con base.';
    } else if (race.week <= 12) {
      when = 'Preparas **' + race.city + '** (' + race.label + ') y quedan ' + race.weeksLeft + ' semanas: empieza esta semana por la **semana ' + race.week + '** del plan. Si nunca has entrenado las estaciones, haz antes una semana de la fase 1 aunque recortes otra del final.';
    } else {
      when = 'Preparas **' + race.city + '** (' + race.label + ') y quedan solo ' + race.weeksLeft + ' semanas. No intentes recuperar lo que falta: haz las semanas de puesta a punto (14 a 16) y estudia la estrategia de carrera del plan, que es donde más tiempo se gana la primera vez.';
    }
    o = {
      subject: 'Tu primera semana: 4 sesiones y una regla',
      preheader: 'Cómo empezar el plan sin pasarte el primer día.',
      title: 'Empieza sin quemarte',
      body: richText_(when + '\n\n' +
        'Así es una semana tipo del plan:\n\n' +
        '- **Lunes · A Carrera:** rodaje suave o series.\n- **Martes · B Fuerza:** básicos con carga.\n' +
        '- **Jueves · C Híbrido:** carrera y estaciones. La más importante: no te la saltes.\n- **Sábado · D Fondo:** carrera larga y suave.\n\n' +
        'La regla: **la constancia gana a la intensidad**. Cuatro sesiones correctas valen más que dos heroicas. Si solo puedes tres días, haz A, C y D. Y deja 48 horas entre la sesión B y la C.') +
        button_(c.PLAN_URL, 'Abrir mi plan (PDF)') + reply,
    };
  } else if (paso === 2) {
    const g = gymBlock_(sub, c);
    o = {
      subject: 'Lo que el plan no puede hacer por ti',
      preheader: 'Las estaciones se aprenden con material real y alguien que te corrija.',
      title: 'Las estaciones no se improvisan',
      body: richText_('Llevas una semana con el plan. Lo que más tiempo hace perder el día de la carrera no es correr: son las estaciones. Un trineo empujado con mala técnica, unas wall balls sin series planificadas o un remo a tirones te cuestan minutos.\n\n' +
        'El plan trae alternativas sin material para entrenar en casa o en un gimnasio normal. Funcionan, pero el trineo y el SkiErg se aprenden mejor con el material real y alguien que te corrija. Aunque sea una vez a la semana, haz la **sesión C** en un centro preparado.') +
        g.body,
      ad: g.ad,
    };
  } else if (paso === 3) {
    if (race) {
      const started = race.week >= 1;
      o = {
        subject: race.city + ': tu carrera en ' + race.weeksLeft + ' semanas',
        preheader: 'Fechas, inicio del plan y lo que conviene dejar reservado.',
        title: race.city + ', en ' + race.weeksLeft + ' semanas',
        body: richText_('Tu carrera es el ' + race.label + '. ' + (started
          ? 'Esta semana te toca la **semana ' + Math.min(race.week, 16) + '** del plan.'
          : 'El plan completo empieza el **' + longDay_(race.start) + '**: apúntalo en el calendario.') + '\n\n' +
          'Tres cosas que conviene no dejar para el final:\n\n' +
          '- **Inscripción:** las tandas tienen plazas limitadas; cuanto antes, más horarios para elegir.\n' +
          '- **Alojamiento:** el fin de semana de carrera, lo que está cerca del recinto suele llenarse pronto.\n' +
          '- **Material:** zapatillas y guantes, probados en los entrenamientos, nunca estrenados el día D.') +
          (race.page ? button_(c.SITE_URL + race.page, 'Guía de ' + race.city + ': hotel y logística') : button_(c.SITE_URL + '/calendario/', 'Ver el calendario')) +
          richText_('Y para el material, nuestra ' + link('lista de lo que llevar', '/material/') + '.'),
      };
    } else {
      o = {
        subject: '¿Ya tienes carrera?',
        preheader: 'Una fecha en el calendario es lo que hace que el plan funcione.',
        title: 'Ponle fecha al plan',
        body: richText_('Entrenar sin fecha es fácil de abandonar. Con una carrera apuntada, cada semana del plan tiene sentido.\n\n' +
          '- **Carreras oficiales:** las fechas de la temporada en España, en el calendario.\n' +
          '- **Simulacros y carreras híbridas locales:** más cortas y baratas, perfectas como primer objetivo o como test a mitad del plan.') +
          button_(c.SITE_URL + '/calendario/', 'Ver el calendario') +
          richText_('Y aquí, los ' + link('simulacros y otras carreras híbridas', '/simulacros/') + ' que hay cerca de ti.'),
      };
    }
    o.body += reply;
  } else {
    const g = gymBlock_(sub, c);
    o = {
      subject: 'Semana 4: el test que marca tu ritmo',
      preheader: 'Con un test de 1 km sabrás a qué ritmo correr tu carrera.',
      title: 'Tu primer test',
      body: richText_('La semana 4 del plan cierra la fase de base con un test. Si empezaste al recibir el plan, es ahora; si no, guárdate este email.\n\n' +
        '- **1 km a tope** después del calentamiento.\n- **1.000 m de remo** y **1.000 m de SkiErg**, si tienes acceso.\n\n' +
        'Con el tiempo del kilómetro calculas tu **ritmo de carrera (RC)**: súmale entre un 20 y un 30 %. Si haces el km en 4:30, tu RC está entre 5:25 y 5:50 min/km. Anótalo en el registro del final del plan: volverás a medirlo en las semanas 8 y 12.\n\n' +
        'El mejor test de todos es hacer un simulacro antes de la carrera: estaciones reales, cronómetro y gente al lado.') +
        button_(c.SITE_URL + '/simulacros/', 'Simulacros cerca de ti') + g.body +
        richText_('A partir de ahora te escribimos una vez al mes, con el calendario y un consejo de entrenamiento.'),
      ad: g.ad,
    };
  }

  return {
    subject: o.subject,
    html: layout_({
      preheader: o.preheader, title: o.title, bodyHtml: o.body, adHtml: o.ad || '',
      reason: 'Recibes este email porque pediste el plan de 16 semanas en ritmohibrido.com y aceptaste recibir información y ofertas por email.',
      unsubUrl: c.SITE_URL + '/baja/?t=' + sub.token,
    }),
  };
}
