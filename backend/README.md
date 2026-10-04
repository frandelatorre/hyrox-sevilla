# Backend de Ritmo Híbrido (Google Sheets + Apps Script)

Recoge las altas del formulario, da de alta **en un solo paso** (el plan sale por email al instante), manda las **campañas de email** y alimenta el panel.

```
Formulario (web) ──POST──▶ Apps Script ──▶ Google Sheet (datos)
                                │
                                ├─▶ Gmail: confirmación, plan, campañas, aviso al centro
                                └─▶ Panel (/panel-…/) lee las estadísticas con contraseña
```

## Instalación (una sola vez, unos 15 minutos)

1. **Cuenta de Google.** Los emails salen de la cuenta que despliega el script. Recomendado crear una dedicada, p. ej. `ritmohibrido@gmail.com`, y no usar la personal.
2. **Hoja.** En [sheets.new](https://sheets.new) crea una hoja llamada *Ritmo Híbrido · Datos*.
3. **Script.** *Extensiones → Apps Script*. Crea tres archivos (`Code.gs`, `Mail.gs`, `Stats.gs`) y pega el contenido de los de esta carpeta. En *Configuración del proyecto* activa «Mostrar el archivo de manifiesto appsscript.json» y pega también [appsscript.json](appsscript.json).
4. **Preparar.** Elige la función `setup` y pulsa *Ejecutar*. Autoriza los permisos (Google avisará de «app no verificada»: *Avanzado → Ir a… (no seguro)*; es tu propio script). Al terminar, en el *Registro de ejecución* verás la **contraseña del panel**. Crea las hojas, el menú *Ritmo Híbrido*, los desplegables y el disparador diario de las 9:00.
5. **Ajustes.** En la hoja `Config` revisa:
   - `SITE_URL` y `PLAN_URL`: la web real. Mientras pruebas, usa la de GitHub Pages.
   - `CONTACT_EMAIL`, `REPLY_TO` y `COMISION_CIERRE`.
6. **Publicar.** *Implementar → Nueva implementación → Aplicación web*. *Ejecutar como:* yo. *Quién tiene acceso:* cualquier persona. Copia la URL que termina en `/exec`.
7. **Conectar la web.** Pega esa URL en [assets/js/config.js](../assets/js/config.js) (`endpoint`) y sube el cambio. Mientras esté vacía, formularios y panel funcionan en modo demostración.
8. **Probar.** Apúntate con tu email desde la web, confirma desde el correo y comprueba que aparece en la hoja `Suscriptores`. Abre el panel e introduce la contraseña.

Si cambias el código más adelante: *Implementar → Gestionar implementaciones → editar → Nueva versión*. La URL no cambia.

## Uso diario

| Quiero… | Hago… |
|---|---|
| Enviar la campaña del mes | Hoja `Campañas`: edita la fila (asunto, título, cuerpo), pon `estado = Programada` y la `fecha_envio`. El disparador diario la envía. |
| Probarla antes | Menú *Ritmo Híbrido → Enviar email de prueba a mi cuenta* (usa la primera campaña en Borrador o Programada). |
| Incluir publicidad | `publi_activa = SI` y rellena título, texto, enlace y botón. Sale con la etiqueta «Publicidad». Anota lo cobrado en `ingreso_publi` para el panel. |
| Enviar solo a una ciudad | `segmento_ciudad` = `sevilla`, `madrid`… (vacío = todas). |
| Apuntar a quien llega a Good Training por tus emails | Hoja `Contactos` (se rellena a mano con lo que te comunique el centro): añade la fila y cambia `estado` (Nuevo → Contactado → Cerrado). Al poner *Cerrado* se rellenan solos la fecha y la comisión por defecto; edítala si es distinta. |

**Formato del cuerpo:** párrafos separados por una línea en blanco; líneas con `- ` forman una lista; `[texto](https://…)` es un enlace; `**negrita**`. El HTML se escapa, no hace falta (ni funciona) escribir etiquetas.

## Cómo funciona por dentro

- **Alta de un solo paso.** Al pulsar «Enviarme el plan» la persona queda dada de alta, recibe el plan por email al momento y puede descargarlo en la propia página. El aviso junto al botón y el primer email explican que acepta comunicaciones informativas y comerciales; ese email lleva el enlace de baja y un «si no has sido tú, date de baja». Las páginas `/confirmar/` solo sirven para enlaces antiguos.
- **Baja con un clic** desde cualquier email (`/baja/?t=…`). Una persona dada de baja no recibe nada más.
- **Consentimiento en el propio alta:** al pulsar el botón se guardan `fecha_confirmacion` (momento del alta) y `consentimiento` (versión del texto, `CONSENT_VERSION` en `Code.gs`). Si cambias el aviso del formulario o el texto del primer email, sube esa versión. Los datos de nadie se envían a terceros: Good Training aparece como oferta dentro de los emails.
- **Cuota de Gmail.** Una cuenta normal envía 100 emails al día (Workspace, 1.500). Las campañas se reparten solas en varios días, dejan 10 de reserva para confirmaciones y no repiten a nadie. Cada dirección que falla se reintenta una vez.
- **Antiabuso:** campo trampa oculto, tiempo mínimo de rellenado, 1 envío por minuto y email, máximo 6 emails del plan por persona, **máximo 40 altas por hora en total** (para que nadie agote la cuota de Gmail con el formulario) y los textos se guardan como texto (no como fórmulas).
- **Panel.** Contraseña en *Configuración del proyecto → Propiedades del script → `PANEL_PASSWORD`*. Cinco fallos seguidos lo bloquean 15 minutos.

## Pruebas

`backend/test/tests.html` ejecuta los tres archivos contra un simulador de las APIs de Google (hojas, correo, caché…) y comprueba el flujo completo: alta, confirmación, baja, campañas con cuota, segmentos, estadísticas y panel. Ábrelo con el servidor local en marcha; debe indicar *50/50 pruebas correctas*. Ejecútalo tras cualquier cambio en el código.

## Límites y siguientes pasos

- **No hay seguimiento de aperturas ni clics** (poco fiable por las protecciones de privacidad del correo y más simple en términos legales).
- Los emails salen de una cuenta de Gmail, sin dominio propio: válido para empezar. Por encima de unos 1.000 suscriptores conviene migrar a Brevo o MailerLite y mantener esta hoja como registro.
- **Pendiente de legal** (lo dejamos para más adelante): titular, NIF y domicilio en el aviso legal; política de privacidad (finalidad, base legal, derechos de las personas, y que Good Training solo figura como oferta, sin cesión de datos); política de cookies; y revisar con un profesional que el texto de consentimiento y la política de privacidad encajan con este alta (la versión del texto aceptada ya queda guardada).
