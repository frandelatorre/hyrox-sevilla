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
| `gimnasios/` | Directorio por ciudad |
| `legal/` | Aviso legal (provisional) |
| `confirmar/`, `baja/` | Páginas a las que llegan los enlaces de los emails (confirmar y darse de baja) |
| `panel-1e97356f51be/` | Panel de estadísticas con contraseña (no indexado) |
| `backend/` | Google Apps Script: formulario, emails y datos. Ver `backend/README.md` |
| `recursos/` | Plan de 16 semanas (PDF y su fuente) |
| `assets/css/styles.css` | Estilos comunes |
| `assets/js/main.js` | Calendario (`RACES`), cuenta atrás, plan, filtros y formularios |
| `propuestas/` | Propuestas de diseño iniciales (no indexadas) |

## Mantenimiento

- **Caché:** al cambiar `assets/css/` o `assets/js/` sube el número `?v=` de las líneas que cargan esos archivos (en todas las páginas), para que los navegadores no sigan usando la versión antigua.
- **Nueva carrera o cambio de fechas:** actualizar `RACES` en `assets/js/main.js` y las tarjetas de `index.html` y `calendario/index.html`.
- **Nuevo gimnasio o ciudad:** añadir la ficha en `gimnasios/index.html` (un bloque `data-city` por ciudad y su botón de filtro).
- **Formularios y panel:** hablan con el backend de `backend/` a través de la URL de `assets/js/config.js` (vacía = modo demostración). Instalación en `backend/README.md`.

## Ver en local

Abrir `index.html` en el navegador, o servir la carpeta:

```bash
npx serve .
```

## Publicación

Funciona en GitHub Pages (rama `main`, carpeta raíz) o subiendo la carpeta a cualquier hosting. Para usar `ritmohibrido.com` en GitHub Pages, añadir un archivo `CNAME` con el dominio y configurar el DNS.
