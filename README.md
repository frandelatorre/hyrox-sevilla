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
- **Nuevo gimnasio o ciudad:** cada ciudad tiene su página en `gimnasios/<ciudad>/index.html` (Madrid, Barcelona, Valencia, Málaga y Sevilla; rutas relativas con `../../`). Las fichas gratuitas (`.gym`) van en el `.grid3` de esa página, por orden alfabético y con su enlace «¿Es tu centro?»; añádelas también al JSON-LD `ItemList` del `<head>` y actualiza el nº de centros en la tarjeta de `gimnasios/index.html`, en las tarjetas «Otras ciudades» de las demás páginas de ciudad y en la portada. Una ciudad nueva se copia de otra página de ciudad (cambiando título, descripción, `canonical`, `og:*`, introducción y «Otras ciudades») y se añade a `sitemap.xml`. Antes de añadir un centro, comprueba en su web que sigue abierto y ofrece clases de HYROX o carrera híbrida (la lista del `.md` de la carpeta raíz no es fiable).
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
- **Páginas de carrera (`carreras/`):** copia una existente para añadir otra. Datos (fechas, recinto, dirección) siempre de la web oficial del evento y coherentes con `calendario/` y `RACES` de `main.js`; no usar el esquema `Event` (no somos la organización) ni la palabra «hyrox» en la URL. Al terminar la carrera, actualiza o retira la página y quita su tarjeta del calendario. La sección de gimnasios copia la ficha destacada (o el «puesto libre») de `gimnasios/<ciudad>/`: si cambias allí el patrocinador, cámbialo también aquí.
- **Booking.com:** los botones «Ver alojamientos en…» llevan `data-booking` y enlazan a una búsqueda normal con `rel="nofollow noopener"`. Cuando tengas cuenta de afiliado, pon tu `aid` en `BOOKING_AID` de `assets/js/afiliados.js` (sube el `?v=` de ese script en las páginas de `carreras/`): se añadirá `aid=` a todos los enlaces y el `rel` pasará a `sponsored nofollow noopener`. Sin precios, puntuaciones ni fotos de Booking.
- **ID de Amazon:** el ID de afiliado (`delatorre07-21`) va en el parámetro `tag=` de los enlaces de `material/index.html`; para cambiarlo, buscar y reemplazar el ID anterior en ese archivo. Los enlaces son búsquedas sin precios, valoraciones ni imágenes de Amazon (las condiciones lo prohíben si no vienen de su API) y no deben ir en emails ni en el PDF del plan.
- **Formularios y panel:** hablan con el backend de `backend/` a través de la URL de `assets/js/config.js` (vacía = modo demostración). Instalación en `backend/README.md`.

## Ver en local

Abrir `index.html` en el navegador, o servir la carpeta:

```bash
npx serve .
```

## Publicación

Funciona en GitHub Pages (rama `main`, carpeta raíz) o subiendo la carpeta a cualquier hosting. Para usar `ritmohibrido.com` en GitHub Pages, añadir un archivo `CNAME` con el dominio y configurar el DNS.
