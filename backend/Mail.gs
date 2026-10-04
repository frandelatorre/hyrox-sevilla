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
    'Responsable: ' + esc_(c.SENDER_NAME) + ' (' + esc_(c.CONTACT_EMAIL) + ').',
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

function confirmEmail_(sub) {
  const url = cfg_().SITE_URL + '/confirmar/?t=' + sub.token;
  return layout_({
    preheader: 'Un clic y te mandamos el plan de 16 semanas.',
    title: 'Confirma tu email',
    bodyHtml: '<p style="margin:0 0 16px">Gracias por apuntarte. Pulsa el botón para confirmar tu email y recibir el <strong>plan de 16 semanas</strong>.</p>' +
      button_(url, 'Confirmar y recibir el plan') +
      '<p style="margin:0 0 16px;color:' + MAIL_C.mut + ';font-size:14px">Si el botón no funciona, copia este enlace en tu navegador:<br>' + esc_(url) + '</p>',
    reason: 'Has recibido este mensaje porque alguien pidió el plan con esta dirección en ritmohibrido.com. Si no has sido tú, ignóralo: no recibirás nada más.',
  });
}

function welcomeEmail_(sub) {
  const c = cfg_();
  const monthly = sub.marketing === 'SI'
    ? '<p style="margin:0 0 16px">Además, cada mes te escribiremos con el calendario de carreras y novedades. Si en algún momento no te interesa, te das de baja con un clic al pie de cualquier email.</p>'
    : '<p style="margin:0 0 16px">Como nos indicaste, no te enviaremos nada más que este mensaje.</p>';
  return layout_({
    preheader: 'Aquí tienes tu plan de 16 semanas.',
    title: 'Aquí tienes tu plan',
    bodyHtml: '<p style="margin:0 0 16px">Email confirmado. Este es tu plan completo de 16 semanas, sesión a sesión, con ritmos, estrategia de carrera y registro de progreso.</p>' +
      button_(c.PLAN_URL, 'Descargar el plan (PDF)') +
      '<p style="margin:0 0 16px">Un consejo para empezar: cuenta 16 semanas hacia atrás desde tu carrera y marca en el calendario el día de inicio. Tienes las fechas en <a href="' +
      c.SITE_URL + '/calendario/" style="color:' + MAIL_C.acc + ';font-weight:700">el calendario</a>.</p>' + monthly,
    reason: 'Recibes este email porque lo pediste en ritmohibrido.com.',
    unsubUrl: sub.token ? c.SITE_URL + '/baja/?t=' + sub.token : '',
  });
}

function campaignEmail_(camp, sub) {
  const c = cfg_();
  let ad = '';
  if (String(camp.publi_activa).toUpperCase() === 'SI' && (camp.publi_titulo || camp.publi_texto)) {
    ad = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ' + MAIL_C.line + ';border-radius:6px"><tr><td style="padding:16px 18px;font-family:' + BODY_FONT + ';font-size:15px;line-height:1.5;color:' + MAIL_C.ink + '">' +
      '<div style="font-size:11px;letter-spacing:2px;font-weight:700;text-transform:uppercase;color:' + MAIL_C.mut + ';margin-bottom:6px">Publicidad</div>' +
      (camp.publi_titulo ? '<div style="font-family:' + FONT + ';font-size:22px;font-weight:800;text-transform:uppercase;margin-bottom:6px">' + esc_(camp.publi_titulo) + '</div>' : '') +
      (camp.publi_texto ? '<div style="margin-bottom:10px">' + richText_(camp.publi_texto).replace(/margin:0 0 16px/g, 'margin:0 0 8px') + '</div>' : '') +
      (/^https?:\/\//.test(String(camp.publi_enlace)) ? '<a href="' + esc_(camp.publi_enlace) + '" style="color:' + MAIL_C.acc + ';font-weight:700">' + esc_(camp.publi_boton || 'Más información') + ' →</a>' : '') +
      '</td></tr></table>';
  }
  return layout_({
    preheader: camp.titulo || camp.asunto,
    title: camp.titulo || camp.asunto,
    bodyHtml: richText_(camp.cuerpo),
    adHtml: ad,
    reason: 'Recibes este email porque te apuntaste a ritmohibrido.com y aceptaste recibir información y ofertas por email.',
    unsubUrl: c.SITE_URL + '/baja/?t=' + sub.token,
  });
}
