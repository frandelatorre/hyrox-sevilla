// Panel de Ritmo Híbrido. Sin endpoint configurado funciona con datos de demostración.
(() => {
  const CFG = window.RH_CONFIG || {};
  const TABS = [
    ['resumen', 'Resumen'], ['embudo', 'Embudo'], ['emails', 'Emails'], ['comparativas', 'Comparativas'],
    ['calendario', 'Calendario'], ['salud', 'Salud técnica'], ['dinero', 'Dinero'],
  ];
  const $ = id => document.getElementById(id);
  const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = new Intl.NumberFormat('es-ES');
  const eur = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
  const pct = x => (x === null || x === undefined ? '—' : Math.round(x * 1000) / 10 + ' %');
  const store = (k, v) => { try { return v === undefined ? sessionStorage.getItem(k) : (v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v)); } catch (e) { return null; } };
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthLabel = key => { const [y, m] = key.split('-'); return MONTHS[+m - 1] + ' ' + y.slice(2); };

  let stats = null, tables = [], demo = !CFG.endpoint;

  // ------------------------------------------------------------------ Datos
  async function load(pw) {
    if (demo) return demoStats();
    const res = await fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'stats', password: pw }) });
    const out = await res.json();
    if (!out.ok) { const e = new Error(out.error || 'server'); e.code = out.error; throw e; }
    return out.stats;
  }

  function demoStats() {
    const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
    const semanas = Array.from({ length: 12 }, (_, i) => ({ label: 'S' + (i + 1), desde: '', altas: i < 5 ? rnd(0, 1) : rnd(1, 6) + (i > 9 ? 2 : 0), bajas: i > 6 && Math.random() > .6 ? 1 : 0 }));
    const meses = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const com = i < 3 ? [0, 60, 90][2 - i] : 0, pub = i < 2 ? [0, 120][1 - i] : 0;
      meses.push({ mes: key, comision: com, publi: pub, total: com + pub });
    }
    const next = d => { const x = new Date(now.getFullYear(), now.getMonth() + d, 5); return x.toLocaleDateString('es-ES'); };
    return {
      generado: now.toISOString(),
      kpis: {
        activos: { value: 148, delta: 17 }, enviados: { value: 132, prev: 96 }, contactos: { value: 11, prev: 7 },
        tasaBaja: { value: 0.012, bajas: 2 }, cierres: { value: 2, prev: 1 }, comision: { value: 60, prev: 30 },
      },
      semanas,
      embudo: [
        { k: 'registros', label: 'Altas (planes pedidos)', value: 231, base: null },
        { k: 'activos', label: 'Siguen suscritos (sin baja)', value: 214, base: 0, baseLabel: 'altas' },
        { k: 'contactos', label: 'Contactos con el centro', value: 28, base: 1, baseLabel: 'suscritos' },
        { k: 'contactados', label: 'Contactados por el centro', value: 24, base: 2, baseLabel: 'contactos' },
        { k: 'cierres', label: 'Cierres (altas en el centro)', value: 6, base: 3, baseLabel: 'contactados' },
        { k: 'comision', label: 'Comisión acumulada (€)', value: 180, base: null, euros: true },
      ],
      ciudades: [
        { ciudad: 'Sevilla', registros: 118, activos: 84, contactos: 28, cierres: 6 }, { ciudad: 'Madrid', registros: 49, activos: 31, contactos: 0, cierres: 0 },
        { ciudad: 'Málaga', registros: 33, activos: 22, contactos: 0, cierres: 0 }, { ciudad: 'Valencia', registros: 19, activos: 8, contactos: 0, cierres: 0 },
        { ciudad: 'Otra ciudad', registros: 12, activos: 3, contactos: 0, cierres: 0 },
      ],
      carreras: [{ carrera: 'malaga', activos: 74 }, { carrera: 'madrid', activos: 38 }, { carrera: 'bilbao', activos: 15 }, { carrera: 'Sin elegir', activos: 21 }],
      origenes: [
        { origen: '/plan', registros: 140, activos: 131, bajas: 9 }, { origen: '/', registros: 91, activos: 83, bajas: 8 },
      ],
      emails: [
        { id: 'a1', mes: '2026-12', asunto: 'Empieza ya el plan para Málaga', estado: 'Borrador', publi: true, segmento: 'Todas', fecha: next(2), destinatarios: 121, enviados: 0, errores: 0, pendientes: 121 },
        { id: 'a2', mes: '2026-11', asunto: 'Calendario HYROX y consejos de noviembre', estado: 'Programada', publi: false, segmento: 'Todas', fecha: next(1), destinatarios: 121, enviados: 0, errores: 0, pendientes: 121 },
        { id: 'a3', mes: '2026-10', asunto: 'Bienvenida: así será Ritmo Híbrido', estado: 'Enviada', publi: true, segmento: 'Sevilla', fecha: '05/10/2026', destinatarios: 84, enviados: 84, errores: 0, pendientes: 0 },
      ],
      calendario: {
        proximas: [
          { fecha: next(1), asunto: 'Calendario HYROX y consejos de noviembre', estado: 'Programada', publi: false },
          { fecha: next(2), asunto: 'Empieza ya el plan para Málaga', estado: 'Borrador', publi: true },
        ],
        huecos: [],
      },
      dinero: { meses, total: meses.reduce((t, m) => t + m.total, 0), cierresTotal: 6, comisionTotal: 180 },
      sistema: {
        cuotaRestante: 87, triggers: ['runDailyJob'], ultimaEjecucion: now.toISOString(), sinEmailPlan: 0,
        checks: [
          { k: 'Disparador diario de envíos', ok: true }, { k: 'Contraseña del panel', ok: true },
          { k: 'URL de la web', ok: true },
        ],
        filas: { suscriptores: 231, contactos: 28, campanas: 3, envios: 132 },
        errores: [{ fecha: '03/10 09:02', origen: 'envio a3', detalle: 'Dirección inválida (ejemplo)' }],
      },
    };
  }

  // ----------------------------------------------------------------- Piezas
  function delta(cur, prev, { invert } = {}) {
    const d = cur - prev;
    if (d === 0) return '<span class="chip">sin cambios</span>';
    const good = invert ? d < 0 : d > 0;
    return `<span class="chip ${good ? 'up' : 'down'}">${d > 0 ? '+' : ''}${nf.format(d)}</span>`;
  }

  function kpi(label, value, chip) {
    return `<div class="kpi"><span class="k">${esc(label)}</span><span class="v">${value}</span>${chip || ''}</div>`;
  }

  function table(title, head, rows, { numeric = [] } = {}) {
    tables.push({ title, head, rows });
    if (!rows.length) return `<div class="card"><h3>${esc(title)}</h3><p class="empty">Todavía no hay datos.</p></div>`;
    return `<div class="card"><h3>${esc(title)}</h3><div class="tw"><table><thead><tr>${head.map((h, i) => `<th class="${numeric.includes(i) ? 'n' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
      rows.map(r => `<tr>${r.map((c, i) => `<td class="${numeric.includes(i) ? 'n' : ''}">${c.html !== undefined ? c.html : esc(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div></div>';
  }

  const stateChip = s => `<span class="st ${s === 'Enviada' ? 'ok' : s === 'En curso' ? 'warn' : ''}">${esc(s)}</span>`;

  function lineChart(weeks) {
    const W = 900, H = 260, L = 40, R = 20, T = 14, B = 34;
    const max = Math.max(4, ...weeks.map(w => Math.max(w.altas, w.bajas)));
    const step = Math.max(1, Math.ceil(max / 4)), top = step * Math.ceil(max / step);
    const x = i => L + (W - L - R) * i / (weeks.length - 1), y = v => T + (H - T - B) * (1 - v / top);
    let g = '';
    for (let v = 0; v <= top; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#2A2F37"/><text x="${L - 10}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    const line = key => weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i)} ${y(w[key])}`).join(' ');
    const dots = (key, c) => weeks.map((w, i) => `<circle cx="${x(i)}" cy="${y(w[key])}" r="4" fill="${c}"><title>${w.label}${w.desde ? ' (desde ' + w.desde + ')' : ''}: ${w[key]}</title></circle>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Altas y bajas por semana">${g}` +
      weeks.map((w, i) => `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${w.label}</text>`).join('') +
      `<path d="${line('bajas')}" fill="none" stroke="#FF6B6B" stroke-width="2" stroke-dasharray="6 5"/><path d="${line('altas')}" fill="none" stroke="#F2F4F7" stroke-width="3"/>` +
      dots('bajas', '#FF6B6B') + dots('altas', '#F2F4F7') + '</svg>' +
      '<div class="legend"><span><i></i>Nuevas altas</span><span><i class="d"></i>Bajas</span></div>';
  }

  // ---------------------------------------------------------------- Vistas
  const VIEWS = {
    resumen(s) {
      const k = s.kpis;
      return '<h2>Resumen</h2><p class="sub">Últimos 30 días frente a los 30 anteriores.</p><div class="kpis">' +
        kpi('Suscriptores activos', nf.format(k.activos.value), delta(k.activos.delta, 0)) +
        kpi('Emails enviados', nf.format(k.enviados.value), delta(k.enviados.value, k.enviados.prev)) +
        kpi('Contactos con el centro', nf.format(k.contactos.value), delta(k.contactos.value, k.contactos.prev)) +
        kpi('Tasa de baja', k.tasaBaja.value === null ? '—' : pct(k.tasaBaja.value), k.tasaBaja.value === null ? '<span class="chip">Sin envíos</span>' : `<span class="chip">${k.tasaBaja.bajas} bajas</span>`) +
        kpi('Cierres del mes', nf.format(k.cierres.value), delta(k.cierres.value, k.cierres.prev)) +
        kpi('Comisión del mes', eur(k.comision.value), delta(k.comision.value, k.comision.prev)) +
        '</div><div class="card"><h3>Altas y bajas por semana (últimas 12)</h3>' + lineChart(s.semanas) + '</div>';
    },

    embudo(s) {
      const first = s.embudo[0].value || 1;
      return '<h2>Embudo</h2><p class="sub">De la alta a la comisión, en personas únicas. El porcentaje es respecto al paso indicado debajo de la cifra.</p><div class="card"><div class="funnel">' +
        s.embudo.map(e => {
          const base = e.base === null ? null : s.embudo[e.base].value;
          const w = e.euros ? 0 : Math.max(0, Math.min(100, e.value / first * 100));
          return `<div class="step"><span class="lab">${esc(e.label)}</span><div class="bar">${e.euros ? '' : `<span style="width:${w}%"></span>`}</div>` +
            `<span class="num">${e.euros ? eur(e.value) : nf.format(e.value)}<small>${base !== null ? (base ? pct(e.value / base) : '—') + ' de ' + esc(e.baseLabel) : '&nbsp;'}</small></span></div>`;
        }).join('') + '</div></div>';
    },

    emails(s) {
      return '<h2>Emails</h2><p class="sub">Campañas de email. Se editan en la hoja «Campañas» de Google Sheets.</p>' +
        table('Campañas', ['Fecha', 'Asunto', 'Estado', 'Segmento', 'Publi', 'Destinatarios', 'Enviados', 'Pendientes', 'Errores'],
          s.emails.map(e => [e.fecha, e.asunto, { html: stateChip(e.estado) }, e.segmento, e.publi ? 'Sí' : 'No', e.destinatarios, e.enviados, e.pendientes, e.errores]), { numeric: [5, 6, 7, 8] });
    },

    comparativas(s) {
      const bars = (rows, label, val) => { const m = Math.max(1, ...rows.map(r => r[val])); return rows.length ? rows.map(r => `<div class="hbar"><span>${esc(r[label])}</span><div class="b"><span style="width:${r[val] / m * 100}%"></span></div><span class="n">${r[val]}</span></div>`).join('') : '<p class="empty">Todavía no hay datos.</p>'; };
      return '<h2>Comparativas</h2><p class="sub">Dónde y por qué página llegan las personas.</p>' +
        table('Por ciudad', ['Ciudad', 'Formularios', 'Activos', 'Contactos', 'Cierres'], s.ciudades.map(c => [c.ciudad, c.registros, c.activos, c.contactos, c.cierres]), { numeric: [1, 2, 3, 4] }) +
        table('Por página de alta', ['Página', 'Altas', 'Siguen suscritos', 'Bajas'], s.origenes.map(o => [o.origen, o.registros, o.activos, o.bajas]), { numeric: [1, 2, 3] }) +
        `<div class="card"><h3>Carrera que preparan (suscriptores activos)</h3>${bars(s.carreras, 'carrera', 'activos')}</div>`;
    },

    calendario(s) {
      const c = s.calendario;
      return '<h2>Calendario</h2><p class="sub">Próximos envíos. El envío se ejecuta cada día a las 9:00 y respeta la cuota de Gmail.</p>' +
        (c.huecos.length ? `<div class="card"><h3>Meses sin campaña</h3><p>${c.huecos.map(h => `<span class="st warn">${monthLabel(h)}</span>`).join(' ')}</p><p class="sub" style="margin:10px 0 0">Añade una fila en la hoja «Campañas» con la fecha de envío.</p></div>` : '') +
        table('Envíos previstos', ['Fecha', 'Asunto', 'Estado', 'Publicidad'], c.proximas.map(p => [p.fecha, p.asunto, { html: stateChip(p.estado) }, p.publi ? 'Sí' : 'No']));
    },

    salud(s) {
      const y = s.sistema;
      const when = y.ultimaEjecucion ? new Date(y.ultimaEjecucion).toLocaleString('es-ES') : 'Aún no se ha ejecutado';
      return '<h2>Salud técnica</h2><p class="sub">Lo que tiene que funcionar para que los emails salgan.</p>' +
        '<div class="grid2"><div class="card"><h3>Comprobaciones</h3><ul class="checks">' +
        y.checks.map(c => `<li><span class="dot ${c.ok ? '' : 'warn'}"></span><span>${esc(c.k)}${c.ok ? '' : `<br><span class="mono">${esc(c.msg)}</span>`}</span></li>`).join('') + '</ul></div>' +
        '<div class="card"><h3>Estado</h3><ul class="checks">' +
        `<li><span class="dot ${y.cuotaRestante > 10 ? '' : 'warn'}"></span><span>Cuota de email restante hoy: <b>${nf.format(y.cuotaRestante)}</b></span></li>` +
        `<li><span class="dot"></span><span>Último envío automático: <b>${esc(when)}</b></span></li>` +
        `<li><span class="dot ${y.sinEmailPlan ? 'ko' : ''}"></span><span>Altas sin email del plan enviado: <b>${y.sinEmailPlan}</b> (se reintentan cada día)</span></li>` +
        `<li><span class="dot"></span><span>Filas: ${y.filas.suscriptores} suscriptores · ${y.filas.contactos} contactos · ${y.filas.campanas} campañas · ${y.filas.envios} envíos</span></li></ul></div></div>` +
        table('Errores de los últimos 7 días', ['Cuándo', 'Dónde', 'Detalle'], y.errores.map(e => [e.fecha, e.origen, e.detalle]));
    },

    dinero(s) {
      const d = s.dinero, max = Math.max(1, ...d.meses.map(m => m.total));
      return '<h2>Dinero</h2><p class="sub">Comisiones por cierres en el centro e ingresos por publicidad, últimos 6 meses.</p>' +
        '<div class="kpis">' + kpi('Total 6 meses', eur(d.total)) + kpi('Cierres (total)', nf.format(d.cierresTotal)) + kpi('Comisión acumulada', eur(d.comisionTotal)) + '</div>' +
        '<div class="card"><h3>Por mes</h3><div class="months">' +
        d.meses.map(m => `<div class="m"><b>${m.total ? eur(m.total) : ''}</b><div class="stack" style="height:${m.total / max * 130}px"><div class="com" style="height:${m.total ? m.comision / m.total * 100 : 0}%"></div><div class="pub" style="height:${m.total ? m.publi / m.total * 100 : 0}%"></div></div><small>${monthLabel(m.mes)}</small></div>`).join('') +
        '</div><div class="legend"><span><span class="sw" style="background:#FF5A1F"></span>Comisiones</span><span><span class="sw" style="background:#2EC4B6"></span>Publicidad</span></div></div>' +
        table('Detalle', ['Mes', 'Comisiones', 'Publicidad', 'Total'], d.meses.map(m => [monthLabel(m.mes), eur(m.comision), eur(m.publi), eur(m.total)]), { numeric: [1, 2, 3] });
    },
  };

  // ------------------------------------------------------------- Navegación
  function route() { const h = location.hash.slice(1); return VIEWS[h] ? h : 'resumen'; }

  function render() {
    if (!stats) return;
    const r = route();
    tables = [];
    $('tabs').innerHTML = TABS.map(([k, l]) => `<a href="#${k}" class="${k === r ? 'on' : ''}">${l}</a>`).join('');
    $('view').innerHTML = VIEWS[r](stats);
    $('updated').textContent = 'Actualizado: ' + new Date(stats.generado).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    $('banner').hidden = !demo;
    $('banner').textContent = 'Datos de demostración: el panel aún no está conectado a la hoja de Google (falta el endpoint en assets/js/config.js).';
  }

  async function refresh(pw) {
    const btn = $('refresh');
    btn.disabled = true; btn.textContent = 'Actualizando…';
    try { stats = await load(pw); render(); return true; }
    finally { btn.disabled = false; btn.textContent = 'Actualizar'; }
  }

  function exportCsv() {
    const q = v => '"' + String(v && v.html !== undefined ? v.html.replace(/<[^>]+>/g, '') : v).replace(/"/g, '""') + '"';
    const csv = tables.map(t => [q(t.title), t.head.map(q).join(';'), ...t.rows.map(r => r.map(q).join(';'))].join('\n')).join('\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'ritmohibrido-' + route() + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click(); URL.revokeObjectURL(a.href);
  }

  // ------------------------------------------------------------------ Acceso
  const gate = $('gate'), msg = $('loginMsg');
  const errors = { bad: 'Contraseña incorrecta.', locked: 'Demasiados intentos. Prueba de nuevo en 15 minutos.', noconfig: 'El panel no tiene contraseña configurada en el servidor.', server: 'Error del servidor. Inténtalo de nuevo.' };

  async function enter(pw) {
    try { await refresh(pw); gate.hidden = true; store('rh-pw', demo ? null : pw); return true; }
    catch (e) { msg.textContent = errors[e.code] || 'No se ha podido conectar con el servidor.'; msg.hidden = false; store('rh-pw', null); return false; }
  }

  $('login').addEventListener('submit', async e => { e.preventDefault(); msg.hidden = true; await enter($('pw').value); });
  $('refresh').addEventListener('click', () => refresh(store('rh-pw') || '').catch(() => { gate.hidden = false; }));
  $('export').addEventListener('click', exportCsv);
  $('logout').addEventListener('click', () => { store('rh-pw', null); stats = null; $('view').innerHTML = ''; $('pw').value = ''; gate.hidden = false; });
  window.addEventListener('hashchange', render);

  if (demo) enter('');
  else if (store('rh-pw')) enter(store('rh-pw'));
})();
