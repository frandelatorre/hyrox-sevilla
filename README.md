# Ritmo Híbrido

Guía independiente para preparar carreras de fitness híbrido (HYROX) en España: calendario, plan de 16 semanas, estaciones explicadas y directorio de gimnasios por ciudad.

Web estática: HTML, CSS y JavaScript sin dependencias ni paso de compilación.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html` | Portada |
| `guia/` | Formato, estaciones, pesos y categorías |
| `calendario/` | Carreras de la temporada en España |
| `plan/` | Plan de 16 semanas y alta por email |
| `gimnasios/` | Directorio por ciudad (`gimnasios/<ciudad>/`) |
| `simulacros/` | Listado de simulacros y carreras híbridas locales, y formulario para proponer uno |
| `carreras/` | Una guía por carrera (`carreras/<ciudad>-<año>/`): plan, gimnasios, alojamiento, material y logística |
| `material/` | Material recomendado, con enlaces de afiliado de Amazon.es |
| `aviso-legal/`, `privacidad/`, `cookies/` | Páginas legales (titular, privacidad y cookies) |
| `confirmar/`, `baja/` | Páginas a las que llegan los enlaces de los emails (confirmar y darse de baja) |
| `panel-1e97356f51be/` | Panel de estadísticas con contraseña (no indexado) |
| `backend/` | Google Apps Script: formulario, emails y datos. Ver `backend/README.md` |
| `recursos/` | Plan de 16 semanas (PDF y su fuente) |
| `assets/css/styles.css` | Estilos comunes |
| `assets/fonts/` | Tipografías Barlow alojadas aquí (sin Google Fonts) |
| `assets/img/` | Favicon y `gimnasios/` (fotos WebP de las fichas destacadas) |
| `assets/js/main.js` | Calendario (`RACES`), cuenta atrás, plan, filtros y formularios |
| `assets/js/afiliados.js` | `BOOKING_AID` (afiliación de alojamiento) y el script que lo aplica a los enlaces de Booking.com |

## Mantenimiento

- **Caché:** al cambiar `assets/css/` o `assets/js/` sube el número `?v=` de las líneas que cargan esos archivos (en todas las páginas), para que los navegadores no sigan usando la versión antigua.
- **Nueva carrera o cambio de fechas:** actualizar `RACES` en `assets/js/main.js` y las tarjetas de `index.html` y `calendario/index.html`.
- **Nuevo gimnasio o ciudad:** cada ciudad tiene su página en `gimnasios/<ciudad>/index.html` (Madrid, Barcelona, Valencia, Málaga y Sevilla; rutas relativas con `../../`). Las fichas gratuitas (`.gym`) van en el `.grid3` de esa página, por orden alfabético y con su enlace «¿Es tu centro?»; añádelas también al JSON-LD `ItemList` del `<head>` y actualiza el nº de centros en la tarjeta de `gimnasios/index.html`, en las tarjetas «Otras ciudades» de las demás páginas de ciudad y en la portada. Una ciudad nueva se copia de otra página de ciudad (cambiando título, descripción, `canonical`, `og:*`, introducción y «Otras ciudades») y se añade a `sitemap.xml`. Copia también el bloque `#avisos` (fuente: `calendario/index.html`, con `../../` en la ruta de privacidad; ver «Formularios y consentimiento»). Antes de añadir un centro, comprueba en su web que sigue abierto y ofrece clases de HYROX o carrera híbrida (la lista del `.md` de la carpeta raíz no es fiable).
- **Ficha destacada (de pago):** va en `<div class="gyms-feat">` de la página de su ciudad, **antes** del `.grid3` de las gratuitas. Las ciudades sin patrocinador llevan ahí una tarjeta «Este puesto está libre» (con un comentario `puesto libre`): sustitúyela por la ficha del centro. Si hay una sola, ocupa la fila entera (foto a la izquierda); si hay dos o más, van de dos en dos con la foto arriba (la última impar vuelve a ocupar fila entera). Si el centro paga, copia esta plantilla dentro de `.gyms-feat`:

  ```html
  <article class="gym-feat">
    <!-- destacado hasta AAAA-MM-DD -->
    <div class="gf-media">
      <span class="gf-ini" aria-hidden="true">XX</span>
      <img src="../../assets/img/gimnasios/SLUG.webp" width="1200" height="675" loading="lazy" decoding="async" alt="Descripción de la foto: qué se ve en ella y de qué centro es">
    </div>
    <div class="gf-body">
      <div class="gf-tags"><span class="badge">Destacado</span><small>Ficha patrocinada</small></div>
      <h3>Nombre del centro</h3>
      <p class="gf-zone">Zona · Dirección</p>
      <p class="gf-desc">1-2 líneas: clases de carrera híbrida, horarios, sesiones abiertas.</p>
      <div class="gf-actions">
        <a class="btn" href="https://wa.me/34NUMERO?text=Hola%2C%20os%20he%20visto%20en%20Ritmo%20H%C3%ADbrido%20y%20me%20gustar%C3%ADa%20probar%20una%20clase%20de%20entrenamiento%20para%20HYROX." rel="sponsored noopener" target="_blank"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>Clase de prueba por WhatsApp</a>
        <a class="gf-web" href="https://WEB-DEL-CENTRO/" rel="sponsored noopener" target="_blank">Web del centro →</a>
      </div>
    </div>
  </article>
  ```

  - `XX`: iniciales del centro (se ven mientras no haya foto). **Sin foto, borra la línea `<img>`**: queda el degradado con las iniciales. No dejes un `<img>` apuntando a un archivo que no existe.
  - `34NUMERO`: teléfono con prefijo y sin `+` ni espacios (`34600111222`). El texto del mensaje ya va codificado: no lo cambies a mano (las tildes se escriben `%C3%AD`, etc.); así el centro sabe que el contacto viene de Ritmo Híbrido y podemos demostrarle el valor al renovar.
  - **Foto:** la aporta el centro (no se descargan de sus webs). Horizontal, 16:9, **WebP, 1200 px de ancho (1200×675) y menos de 120 KB**; por ejemplo, con [Squoosh](https://squoosh.app) (redimensionar a 1200 px, WebP, calidad ~75). Se guarda como `assets/img/gimnasios/<slug>.webp` (slug = nombre en minúsculas y con guiones, sin tildes). El `alt` debe describir lo que se ve.
  - **Fecha de fin:** el comentario `<!-- destacado hasta AAAA-MM-DD -->` va dentro de la tarjeta. Para revisar renovaciones, busca todas las fechas con `grep -rn "destacado hasta" gimnasios/` y mira las que ya han pasado o vencen este mes. Si el centro renueva, cambia la fecha; si no, mueve su tarjeta al `.grid3` como ficha gratuita (`.gym`, sin foto ni WhatsApp) o elimínala.
  - Las fichas destacadas son publicidad: mantén siempre la etiqueta «Destacado», la mención «Ficha patrocinada» y `rel="sponsored noopener"` (ver «Contenido patrocinado» en `aviso-legal/`).
- **Páginas de carrera (`carreras/`):** copia una existente para añadir otra. Datos (fechas, recinto, dirección) siempre de la web oficial del evento y coherentes con `calendario/` y `RACES` de `main.js`; no usar el esquema `Event` (no somos la organización) ni la palabra «hyrox» en la URL. Al terminar la carrera, actualiza o retira la página y quita su tarjeta del calendario. La sección de gimnasios copia la ficha destacada (o el «puesto libre») de `gimnasios/<ciudad>/`: si cambias allí el patrocinador, cámbialo también aquí. Copia también el bloque `#avisos` (ver «Formularios y consentimiento»).
- **Booking.com:** los botones «Ver alojamientos en…» llevan `data-booking` y enlazan a una búsqueda normal con `rel="nofollow noopener"`. Cuando tengas cuenta de afiliado, pon tu `aid` en `BOOKING_AID` de `assets/js/afiliados.js` (sube el `?v=` de ese script en las páginas de `carreras/`): se añadirá `aid=` a todos los enlaces y el `rel` pasará a `sponsored nofollow noopener`. Sin precios, puntuaciones ni fotos de Booking.
- **ID de Amazon:** el ID de afiliado (`delatorre07-21`) va en el parámetro `tag=` de los enlaces de `material/index.html`; para cambiarlo, buscar y reemplazar el ID anterior en ese archivo. Los enlaces son búsquedas sin precios, valoraciones ni imágenes de Amazon (las condiciones lo prohíben si no vienen de su API) y no deben ir en emails ni en el PDF del plan.
- **Formularios y panel:** hablan con el backend de `backend/` a través de la URL de `assets/js/config.js` (vacía = modo demostración). Instalación en `backend/README.md`.

## Formularios y consentimiento

- **`data-lead`:** cada `form[data-signup]` indica su tipo de alta con `data-lead` (por defecto `plan`).
  - `plan`: se descarga el PDF y se envía el email del plan. Lleva selector de carrera.
  - `alertas`: alta en los avisos por provincia. El backend envía un email de bienvenida (con el enlace de baja) la primera vez que alguien se apunta. No hay PDF ni selector de carrera, y el frontend envía `carrera` vacía. Exige al menos un interés marcado (lo valida `assets/js/main.js`; el backend es permisivo y no lo exige).
  - El formulario envía `lead` e `intereses` (checkboxes `name="intereses"`, valores `carreras`, `simulacros`, `gimnasios`) al backend.
- **Los intereses se acumulan:** si la misma persona se apunta más veces, los intereses se van sumando. Desde la web no se pueden quitar: para cambiarlos hay que escribir a info@ritmohibrido.com o darse de baja y volver a apuntarse (lo dice `privacidad/`).
- **Aviso de consentimiento:** el `<p class="fine" data-consent="…">` que acompaña al botón es el texto canónico y su atributo es la versión de ese texto (debe coincidir con `CONSENT_PLAN` o `CONSENT_ALERTAS` de `backend/Code.gs`, según el texto). `index.html` y `plan/` llevan `CONSENT_PLAN` (`2026-10-v5-plan`); las 11 páginas del bloque de avisos, `CONSENT_ALERTAS` (`2026-10-v5-alertas`). Los textos de v5 son idénticos a los de v4: solo cambia la etiqueta. Sin casilla premarcada. Va seguido de `id`, porque el test anti-deriva lo busca con el patrón `<p class="fine" data-consent="…"`.
  - **Plan** (botón «Enviarme el plan»; en `plan/` el enlace es `../privacidad/`):

    > Al pulsar «Enviarme el plan», aceptas que Ritmo Híbrido use tu email, tu provincia y, si la eliges, tu carrera para enviarte el plan por email y, además, para enviarte comunicaciones informativas y comerciales por email (novedades, consejos, calendario y ofertas propias y de centros colaboradores, a los que no cedemos tus datos). Puedes retirar tu consentimiento y darte de baja con un clic desde cualquier mensaje. Responsable: Ritmo Híbrido (info@ritmohibrido.com). Más información y tus derechos en la política de privacidad.

  - **Avisos** (botón «Apuntarme a los avisos»; ajusta la ruta de `privacidad/` según la profundidad de la página: `../` en `calendario/` y `simulacros/`, `../../` en las demás):

    > Al pulsar «Apuntarme a los avisos», aceptas que Ritmo Híbrido use tu email y tu provincia para avisarte por email de novedades de carreras, simulacros y gimnasios de tu provincia según los intereses que marques y, además, para enviarte comunicaciones informativas y comerciales por email (novedades, consejos, calendario y ofertas propias y de centros colaboradores, a los que no cedemos tus datos). Puedes retirar tu consentimiento y darte de baja con un clic desde cualquier mensaje. Responsable: Ritmo Híbrido (info@ritmohibrido.com). Más información y tus derechos en la política de privacidad.

- **Bloque de avisos (`<section id="avisos">`):** está en 11 páginas: `calendario/`, `simulacros/`, `gimnasios/{barcelona,madrid,malaga,sevilla,valencia}/` y `carreras/{barcelona-2026,bilbao-2027,madrid-2027,malaga-2027}/`. La fuente para copiarlo es `calendario/index.html`. Reglas:
  - Como mucho un `form[data-signup]` y un `form[data-b2b]` por página, y nunca en el mismo `<form>`. En `simulacros/` conviven los dos; `gimnasios/index.html` solo lleva el B2B. En esas páginas no escribas en comentarios los literales `data-signup`, `data-consent`, `name="intereses"` ni `<form`: el test anti-deriva cuenta texto.
  - Ids `avisos`, `avisos-titulo` y `avisos-aviso`. No usar `#alta` (es el del plan) ni `#plan`.
  - Prohibido `data-provincia` en el `<body>` de `calendario/` y `simulacros/`: `main.js` reescribiría los enlaces a `/plan/` con una provincia que no corresponde. Las otras 9 páginas ya lo llevan (`bilbao-2027` = `bizkaia`).
  - Sin casillas premarcadas (`checked`) y sin selector `carrera`.
  - Dentro de `.cta` no usar texto blanco pequeño ni la clase `.link`: el contraste sobre el naranja no llega a 4,5:1 (el texto pequeño va en `var(--bg)`; ver `.cta` en `assets/css/styles.css`).
- **Al cambiar el texto del plan o el de los avisos**, sube la etiqueta que corresponda en `backend/Code.gs` (`CONSENT_PLAN` o `CONSENT_ALERTAS`) y actualiza los `data-consent` correspondientes (`grep -rn data-consent` devuelve 13 páginas: las 11 del bloque de avisos más `index.html` y `plan/`), la fecha de `privacidad/` y el archivo privado de consentimiento.
- **Orden de despliegue:** primero el backend (pegar el `.gs` nuevo, ejecutar `setup()` y crear una Nueva versión de la implementación), probar con un email propio que el alta, el email de bienvenida y la baja funcionan, y **solo entonces** hacer el push de la web. Ni los formularios de avisos ni el de propuestas deben publicarse antes de que el backend esté desplegado. Una prueba local con el `config.js` real escribe una fila REAL en la hoja `Propuestas` y envía un correo real al titular: usa un email propio y marca la fila `Descartada`.

## Formularios B2B (propuestas)

Dos formularios con `form[data-b2b]` permiten que un tercero proponga un simulacro (`simulacros/`, `#publicar`) o un gimnasio (`gimnasios/`, `#proponer`). Van a la acción `propuesta` del backend y a la hoja `Propuestas`; no suscriben a nadie.

- **Flujo:** recibir la propuesta, verificarla en la web del organizador o del gimnasio, publicarla a mano y marcarla `Publicada` en la hoja `Propuestas`. **Nunca se inventan datos** y nunca se publica solo con lo que escribe el proponente.
- **Ids:** `publicar`, `publicar-titulo` y `publicar-aviso` (simulacros); `proponer`, `proponer-titulo` y `proponer-aviso` (gimnasios). `#alta` de `gimnasios/` se mantiene (lo enlazan `index.html` y `carreras/bilbao-2027`).
- **Campos y reglas:** casilla `destacado` (solo en simulacros) sin marcar, honeypot `name="hp"`, la web en `name="url"`, y `data-aviso` del `<p class="b2b-aviso">` igual a la etiqueta de `B2B_AVISOS` en `backend/Code.gs` (`2026-10-b2b-sim-v1` y `2026-10-b2b-gym-v1`; una por texto).
- **Prohibido en los B2B:** `data-signup`, `data-lead`, `data-consent`, `name="intereses"`, `name="carrera"` y `checked`. No llevan consentimiento comercial.
- **Estilos:** clases propias `.b2b*` en `assets/css/styles.css`; no usar `.cta`.
- Mantén los `mailto` como alternativa y no uses la marca HYROX como si fuera oficial.
- **Copy:** nada que prometa inclusión incondicional («lo revisamos y, si encaja, lo publicamos»).

## Ver en local

Abrir `index.html` en el navegador, o servir la carpeta:

```bash
npx serve .
```

## Publicación

Producción: `https://ritmohibrido.com` (Hostinger, se despliega desde la rama `main` de GitHub). Al ser web estática también funciona en GitHub Pages o en cualquier hosting.
