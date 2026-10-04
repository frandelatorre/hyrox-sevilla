// Ritmo Híbrido — comportamiento común

// Calendario oficial en España, temporada 26/27. Actualizar aquí y en /calendario/.
const RACES = [
  { id: 'valencia',  city: 'Valencia',  start: '2026-10-15', label: '15–18 oct 2026' },
  { id: 'barcelona', city: 'Barcelona', start: '2026-11-11', label: '11–15 nov 2026' },
  { id: 'bilbao',    city: 'Bilbao',    start: '2027-02-06', label: '6–7 feb 2027' },
  { id: 'madrid',    city: 'Madrid',    start: '2027-03-17', label: '17–21 mar 2027' },
  { id: 'malaga',    city: 'Málaga',    start: '2027-04-14', label: '14–18 abr 2027' },
];
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

// Formularios de alta
// TODO: conectar con la herramienta de email (MailerLite/Brevo) cambiando el action del formulario.
document.querySelectorAll('form[data-signup]').forEach(form => {
  const races = form.querySelector('select[name="carrera"]');
  if (races) races.innerHTML = '<option value="">¿Qué carrera preparas?</option>' +
    upcoming().map(r => `<option value="${r.id}">${r.city} · ${r.label}</option>`).join('') +
    '<option value="ninguna">Todavía ninguna</option>';
  form.addEventListener('submit', e => {
    if (form.getAttribute('action')) return;
    e.preventDefault();
    const pdf = form.dataset.signup;
    form.innerHTML = '<p class="form-ok">¡Hecho! Revisa tu email.</p>' +
      (pdf ? `<a class="btn" href="${pdf}" download>Descargar el plan (PDF)</a>` : '');
  });
});

document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
