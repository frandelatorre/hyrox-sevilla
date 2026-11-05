// Afiliación de alojamiento (Booking.com, vía CJ).
// Los enlaces con data-booking apuntan a una búsqueda normal de Booking.com. Este script los envuelve en el enlace
// de clic de CJ (PID 101899038) con el destino en url= y, como sid, el nombre de la página (p. ej. bilbao-2027).
// Sin JavaScript los enlaces siguen funcionando como búsquedas normales, sin comisión.
const BOOKING_CJ_CLICK = "https://www.kqzyfj.com/click-101899038-15734352";

(function () {
  if (!BOOKING_CJ_CLICK) return;
  var m = location.pathname.match(/\/carreras\/([^\/]+)\//);
  var sid = m ? m[1] : '';
  document.querySelectorAll('a[data-booking]').forEach(function (a) {
    var u = new URL(a.href);
    if (u.hostname.indexOf('booking.com') === -1) return;
    var c = new URL(BOOKING_CJ_CLICK);
    if (sid) c.searchParams.set('sid', sid);
    c.searchParams.set('url', u.toString());
    a.href = c.toString();
    a.rel = 'sponsored nofollow noopener';
  });
})();
