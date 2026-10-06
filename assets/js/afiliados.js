// Afiliación de alojamiento (Booking.com).
// BOOKING_AID vacío: los enlaces a Booking.com van sin parámetros de afiliado (búsqueda normal).
// Con un valor: añade aid=<valor> a todos los enlaces marcados con data-booking y los etiqueta como patrocinados.
// Sin JavaScript los enlaces siguen funcionando como búsquedas normales.
const BOOKING_AID = "";

(function () {
  if (!BOOKING_AID) return;
  document.querySelectorAll('a[data-booking]').forEach(function (a) {
    var u = new URL(a.href);
    u.searchParams.set('aid', BOOKING_AID);
    a.href = u.toString();
    a.rel = 'sponsored nofollow noopener';
  });
})();
