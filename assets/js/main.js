// Ritmo Híbrido — comportamiento común

// Calendario oficial en España, temporada 26/27. Actualizar aquí y en /calendario/.
const RACES = [
  { id: 'valencia',  city: 'Valencia',  start: '2026-10-15', label: '15–18 oct 2026' },
  { id: 'barcelona', city: 'Barcelona', start: '2026-11-11', label: '11–15 nov 2026' },
  { id: 'bilbao',    city: 'Bilbao',    start: '2027-02-06', label: '6–7 feb 2027' },
  { id: 'madrid',    city: 'Madrid',    start: '2027-03-17', label: '17–21 mar 2027' },
  { id: 'malaga',    city: 'Málaga',    start: '2027-04-14', label: '14–18 abr 2027' },
];
// Provincias (slug sin tildes → nombre) para el selector de los formularios. Misma lista que PROVINCES en backend/Code.gs:
// si cambias una, cambia la otra. `otra` va siempre al final del selector.
const PROVINCIAS = {
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
const DAY = 864e5, PLAN_WEEKS = 16;
const raceDate = r => new Date(r.start + 'T08:00:00');
const upcoming = () => RACES.filter(r => raceDate(r) > new Date());

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) { return null; }
}

// Menú móvil
document.querySelectorAll('.menu-btn').forEach(btn => btn.addEventListener('click', () => {
  const nav = document.querySelector('.nav');
  btn.setAttribute('aria-expanded', nav.classList.toggle('open'));
}));

// Tarjeta del plan: carrera elegida, semana actual y cuenta atrás
const card = document.querySelector('.plan-card');
if (card) {
  const select = card.querySelector('.race-select');
  const list = upcoming();
  select.innerHTML = list.map(r => `<option value="${r.id}">${r.city} · ${r.label}</option>`).join('');
  const saved = store('rh-race');
  // Por defecto, la primera carrera para la que aún se puede hacer el plan completo
  const def = list.find(r => raceDate(r) - new Date() > PLAN_WEEKS * 7 * DAY) || list[0];
  select.value = list.some(r => r.id === saved) ? saved : def.id;

  const render = () => {
    const race = RACES.find(r => r.id === select.value);
    const start = new Date(raceDate(race) - PLAN_WEEKS * 7 * DAY);
    const wk = Math.floor((new Date() - start) / (7 * DAY)) + 1;
    card.querySelector('[data-week]').textContent = wk < 1
      ? `Empieza en ${Math.ceil((start - new Date()) / DAY)} días`
      : `Semana ${Math.min(wk, PLAN_WEEKS)} de ${PLAN_WEEKS}`;
    card.querySelector('.bar div').style.width = Math.min(100, Math.max(4, wk / PLAN_WEEKS * 100)) + '%';
    const phase = wk < 1 ? 0 : wk <= 4 ? 1 : wk <= 8 ? 2 : wk <= 13 ? 3 : 4;
    card.querySelectorAll('.wk').forEach((el, i) => el.classList.toggle('now', i + 1 === phase));
    card.querySelector('[data-race]').textContent = `${race.city} · ${race.label}`;
  };

  const tick = () => {
    const race = RACES.find(r => r.id === select.value);
    const s = Math.max(0, (raceDate(race) - new Date()) / 1000);
    const v = [s / 86400, s % 86400 / 3600, s % 3600 / 60, s % 60].map(Math.floor);
    card.querySelector('.digits').innerHTML = v.map((n, i) =>
      `<div><b>${String(n).padStart(2, '0')}</b><small>${['días', 'horas', 'min', 'seg'][i]}</small></div>`).join('');
  };

  select.addEventListener('change', () => { store('rh-race', select.value); render(); tick(); });
  render(); tick(); setInterval(tick, 1000);
}

// Marca la próxima carrera y atenúa las pasadas en los listados
document.querySelectorAll('[data-race-date]').forEach(el => {
  if (new Date(el.dataset.raceDate + 'T23:59:59') < new Date()) el.classList.add('past');
});
const next = upcoming()[0];
if (next) document.querySelectorAll(`[data-race-date="${next.start}"]`).forEach(el => el.classList.add('next'));

// Filtro del directorio de gimnasios
document.querySelectorAll('.filters').forEach(group => group.addEventListener('click', e => {
  const f = e.target.closest('.f');
  if (!f) return;
  group.querySelectorAll('.f').forEach(x => x.classList.toggle('on', x === f));
  document.querySelectorAll('[data-city]:not(.f)').forEach(el =>
    el.hidden = !(f.dataset.city === 'all' || el.dataset.city === f.dataset.city));
}));

// API del backend (Google Apps Script). Las peticiones van como texto plano para evitar el preflight de CORS.
async function rhApi(payload) {
  const endpoint = (window.RH_CONFIG || {}).endpoint;
  if (!endpoint) return null; // modo demostración
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return res.json();
}
window.rhApi = rhApi;

// Provincia sugerida por la página: data-provincia en el <body> (páginas de ciudad y de carrera) o en el <form>, o ?provincia=
// en la URL. Los enlaces al plan de esas páginas la llevan consigo, porque ahí no hay formulario.
const pageProvince = () => {
  const p = document.body.dataset.provincia || new URLSearchParams(location.search).get('provincia');
  return p && Object.prototype.hasOwnProperty.call(PROVINCIAS, p) ? p : '';
};
if (document.body.dataset.provincia && pageProvince()) document.querySelectorAll('a[href]').forEach(a => {
  const [path, hash] = a.getAttribute('href').split('#');
  if (/(^|\/)plan\/$/.test(path)) a.setAttribute('href', path + '?provincia=' + pageProvince() + (hash ? '#' + hash : ''));
});

// Formularios de alta
document.querySelectorAll('form[data-signup]').forEach(form => {
  const t0 = Date.now();
  const $ = sel => form.querySelector(sel);
  const prov = $('select[name="provincia"]');
  if (prov) {
    // El HTML trae unas pocas opciones de respaldo; con JS se sustituyen por la lista completa, ordenada A–Z.
    const sorted = Object.keys(PROVINCIAS).filter(k => k !== 'otra').sort((a, b) => PROVINCIAS[a].localeCompare(PROVINCIAS[b], 'es'));
    prov.innerHTML = '<option value="">Elige tu provincia</option>' +
      sorted.map(k => `<option value="${k}">${PROVINCIAS[k]}</option>`).join('') +
      `<option value="otra">${PROVINCIAS.otra}</option>`;
    const pre = Object.prototype.hasOwnProperty.call(PROVINCIAS, form.dataset.provincia) ? form.dataset.provincia : pageProvince();
    if (pre) prov.value = pre;
  }
  const races = $('select[name="carrera"]');
  if (races) races.innerHTML = '<option value="">¿Qué carrera preparas?</option>' +
    upcoming().map(r => `<option value="${r.id}">${r.city} · ${r.label}</option>`).join('') +
    '<option value="ninguna">Todavía ninguna</option>';

  const msg = $('.form-msg');
  const say = (text, bad) => { msg.textContent = text; msg.dataset.bad = bad ? '1' : ''; msg.hidden = !text; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form).entries());
    if (!f.provincia) return say('Elige tu provincia.', true);

    const btn = $('button[type="submit"]'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Enviando…'; say('');
    try {
      const out = await rhApi({
        // El backend sigue llamando `ciudad` al campo (así lo entienden también las versiones antiguas); lleva la provincia.
        action: 'signup', email: f.email, ciudad: f.provincia, carrera: f.carrera || '',
        web: f.ritmo_extra || '', ms: Date.now() - t0, origen: location.pathname.replace(/\/$/, '') || '/',
      });
      if (out === null) { // demostración: sin backend
        form.innerHTML = '<p class="form-ok">¡Hecho! (modo demostración)</p>' +
          '<a class="btn" href="' + (form.dataset.plan || '') + '" download>Descargar el plan (PDF)</a>';
      } else if (out.ok) {
        const pdf = out.plan || form.dataset.plan;
        form.innerHTML = '<p class="form-ok">¡Listo! Ya tienes el plan.</p>' +
          (pdf ? '<a class="btn" href="' + pdf + '" download>Descargar el plan (PDF)</a>' : '') +
          '<p class="form-sub">También te lo hemos enviado por email. Si no lo ves en unos minutos, mira en spam o promociones.</p>';
      } else {
        const errs = { email: 'Revisa el email: no parece válido.', ciudad: 'Elige tu provincia.', busy: 'Hay mucha demanda ahora mismo. Inténtalo de nuevo en unos minutos.' };
        say(errs[out.error] || 'No hemos podido enviarlo. Inténtalo de nuevo en un momento.', true);
        btn.disabled = false; btn.textContent = label;
      }
    } catch (err) {
      say('No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo.', true);
      btn.disabled = false; btn.textContent = label;
    }
  });
});


document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
