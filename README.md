# Academia La Clave

Sitio de prácticas para entrenar un despliegue real en Netlify. La academia es
ficticia; la arquitectura no: es la que usarías para un cliente pequeño que
quiere editar su agenda sin tocar código y sin pagar builds por cada cambio.

**Stack**

| Pieza | Uso |
| --- | --- |
| [Astro 7](https://docs.astro.build) | Renderizado híbrido: páginas fijas estáticas y agenda bajo demanda |
| [Sanity](https://www.sanity.io) | CMS headless: contenido, Studio de edición y CDN de imágenes |
| [@astrojs/netlify](https://docs.astro.build/en/guides/integrations-guide/netlify/) | Adaptador de Netlify para las rutas en servidor |
| [Netlify Forms](https://docs.netlify.com/manage/forms/setup/) | Recepción del formulario de contacto sin backend propio |
| Git + GitHub | Control de versiones del **código** (el contenido ya no vive aquí) |
| CSS a medida + Fontsource | Sistema de diseño cálido, sin framework de UI |

El contenido se edita en un Studio alojado en `*.sanity.studio` y se lee de la
API en cada petición. Publicar un evento **no genera un commit ni un build**:
la home y la agenda se cachean 60 segundos en el CDN de Netlify.

---

## Puesta en marcha

Requisitos: Node 22 o superior y npm.

```bash
npm install
cp .env.example .env        # pega tu SANITY_PROJECT_ID
npm run dev                 # http://localhost:4321
npm run build               # astro check + build híbrido
npm run preview             # sirve el resultado en local
```

Para el panel de edición:

```bash
cp studio/.env.example studio/.env   # mismo project ID
cd studio && npm install             # una sola vez
npm run dev                          # Studio en http://localhost:3333
```

Desde la raíz, `npm run studio` hace lo mismo sin cambiar de carpeta.

### Crear el proyecto de Sanity (una vez)

1. Entra en <https://sanity.io/manage> y crea un proyecto gratuito.
2. Crea el dataset `production` (visibilidad pública: las lecturas del sitio no
   usan token).
3. Copia el **Project ID** en `.env` y en `studio/.env`.
4. Publica el Studio:

   ```bash
   npm run studio:deploy    # usa el subdominio de studio/sanity.cli.ts
   ```

   El subdominio configurado es `academia-la-clave`; si ya está ocupado,
   cámbialo en `studio/sanity.cli.ts` y en `netlify.toml`.

5. Ajusta el destino de `/admin` en `netlify.toml` si el subdominio no es
   `academia-la-clave.sanity.studio`.
6. En Netlify → **Site configuration → Environment variables**, define
   `SANITY_PROJECT_ID` y `SANITY_DATASET`. Se leen en tiempo de ejecución: no
   hay que reconstruir el sitio, pero Netlify las aplica al siguiente despliegue.

Los editores se invitan desde **Sanity → Members**. En el plan gratuito solo
existen los roles **Admin** y **Viewer**: quien edite tendrá permisos totales
sobre el contenido.

---

## Estructura

```text
src/
├── components/          Header, Footer y tarjeta de evento
├── layouts/BaseLayout   Metadatos, fuentes y estructura del documento
├── lib/
│   ├── sanity.ts        Cliente, variables de entorno y URLs de imagen
│   └── eventos.ts       Consultas GROQ, adaptador a Evento y fechas
├── middleware.ts        Cabeceras de caché CDN para / y /eventos
├── pages/
│   ├── index.astro      Portada (SSR, cacheada) con el próximo evento
│   ├── clases.astro
│   ├── profesores.astro
│   ├── contacto.astro   Formulario de Netlify Forms
│   ├── gracias.astro    Destino tras enviar el formulario
│   ├── 404.astro
│   └── eventos/
│       ├── index.astro  Agenda: próximos + archivo (SSR)
│       └── [slug].astro Ficha por evento (SSR)
└── styles/global.css    Tokens, componentes y responsive
studio/                  Studio de Sanity (React, se despliega aparte)
├── sanity.config.ts
└── schemas/evento.ts    Campos y validaciones del evento
scripts/
└── migrar-a-sanity.mjs  Migración única desde los .md antiguos
public/                  Fotos fijas del sitio, favicon y robots.txt
netlify.toml             Build, publish, redirect de /admin y cabeceras
```

Las rutas marcadas con `export const prerender = true` (clases, profesores,
contacto y gracias) se generan en el build. `/`, `/eventos/*` y `/404` se
renderizan bajo demanda: Astro no permite reescribir una ruta en servidor hacia
una página prerenderizada.

---

## Eventos con Sanity

Cada evento es un documento `evento` con estos campos:

| Campo | Tipo | Notas |
| --- | --- | --- |
| `titulo` | string | Obligatorio |
| `slug` | slug | Define la URL: `/eventos/<slug>/` |
| `fecha` | date | Ordena la agenda y separa próximos/pasados |
| `hora` | string | Formato `HH:MM` |
| `lugar` | string | Por defecto, Auditorio La Clave |
| `categoria` | string | Concierto, Clase magistral, Taller, Audición, Encuentro, Puertas abiertas |
| `resumen` | text | Máximo 200 caracteres |
| `imagen` | image | Horizontal; Sanity la recorta y la sirve en WebP/AVIF |
| `imagen_alt` | string | Obligatorio |
| `precio` | string | Por defecto, «Entrada libre» |
| `destacado` | boolean | Reservado para futuros destacados |
| `borrador` | boolean | Si está activo, el evento no aparece en la web |
| `body` | Portable Text | Contenido de la ficha |

- Las validaciones están en `studio/schemas/evento.ts`: el editor no puede
  guardar un evento sin título, sin hora válida o con un resumen de más de 200
  caracteres.
- La URL sale de `slug`. Al migrar se conservó el nombre de archivo original,
  así que los enlaces antiguos siguen funcionando.
- `borrador: true` lo oculta en la web sin borrarlo del CMS.
- Las imágenes se sirven desde `cdn.sanity.io` con `?w=1200&auto=format`: no
  consumen ancho de banda de Netlify ni se guardan en git.

### Publicar y ver el cambio

1. Edita o crea el evento en el Studio y pulsa **Publish**.
2. La home y la agenda lo muestran en un máximo de **60 segundos** (lo que dura
   la caché del CDN). No hay deploy ni build de Netlify.
3. Si necesitas verlo al instante, abre la URL con `?v=2` o espera ese minuto.

### Migrar los eventos antiguos (una vez)

La migración ya se ejecutó: los 8 eventos y sus fotos están en Sanity, y los
`.md` y `public/images/eventos` se borraron del repo (siguen en el historial de
git). El script se conserva por si hay que rehacerla desde el historial; sube
las fotos, convierte el Markdown a Portable Text y es idempotente (repetirlo
actualiza los mismos documentos):

```bash
# 1. Simula y revisa la salida
node scripts/migrar-a-sanity.mjs --dry-run

# 2. Crea un token con rol Editor en sanity.io/manage → API → Tokens
#    y guárdalo en .env como SANITY_WRITE_TOKEN
npm run migrar
```

Para relanzarlo hay que restaurar antes `src/content/eventos` desde git
(`git checkout <commit> -- src/content/eventos public/images/eventos`).

---

## Formulario de contacto (Netlify Forms)

`contacto.astro` se prerenderiza, así que el formulario sigue presente en el
HTML de `dist/contacto/index.html`. Netlify lo detecta en el primer despliegue.

- `name="contacto"` y `data-netlify="true"`.
- Campo oculto `form-name` con el mismo nombre.
- Honeypot `bot-field` declarado con `netlify-honeypot="bot-field"`.
- `action="/gracias/"` como página de confirmación.

Las respuestas aparecen en **Netlify → Forms → contacto**. Configura allí la
notificación por correo. En local no se procesa: usa un deploy preview o
`netlify dev`.

---

## Despliegue en Netlify

1. Sube el proyecto a GitHub (rama `main`).
2. En Netlify: **Add new site → Import an existing project**.
3. Netlify lee `netlify.toml`: build `npm run build`, publish `dist`, Node 22.
4. Define `SANITY_PROJECT_ID` y `SANITY_DATASET` en las variables de entorno.
5. Ajusta `site` en `astro.config.mjs` si cambias de dominio (canonical y Open
   Graph absolutos).
6. Despliega. La primera visita a `/` y `/eventos` ejecuta la función; las
   siguientes salen del CDN.

No hay proxy OAuth, ni Identity, ni credenciales de GitHub en el sitio.

### Checklist de aceptación

- [ ] `npm run build` termina sin errores en local y en Netlify.
- [ ] Portada, clases, profesores, agenda, ficha de evento y contacto cargan.
- [ ] Las imágenes de evento apuntan a `cdn.sanity.io` y pesan menos que el original.
- [ ] Publicar un evento en el Studio se ve en la web en ≤ 60 s sin nuevo deploy.
- [ ] Un evento con `borrador` activo no aparece ni en la agenda ni por URL directa.
- [ ] Una URL de evento inexistente devuelve la 404 propia con estado 404.
- [ ] `/admin` redirige al Studio.
- [ ] El formulario enviado aparece en Netlify Forms y redirige a `/gracias/`.
- [ ] `robots.txt` bloquea `/admin/`.
- [ ] El sitio es público (Edge Access desactivado) y se abre desde el móvil.

---

## Si algo falla

### `Falta SANITY_PROJECT_ID`

La variable no está en `.env` (local) o en Netlify. Después de añadirla en
Netlify, lanza **Deploys → Trigger deploy → Clear cache and deploy site** para
que la función la reciba.

### `/eventos` devuelve 500

Suele ser el dataset: comprueba que existe, que se llama como
`SANITY_DATASET` y que es público. Revisa también el log de la función en
Netlify → **Functions**. El proyecto y el dataset se pueden consultar en
`sanity.io/manage`.

### `/admin` da 404

La redirección apunta a `https://academia-la-clave.sanity.studio`. Si al
desplegar el Studio elegiste otro subdominio, cámbialo en `netlify.toml`.

### Un cambio no aparece

La caché del CDN dura 60 s. Comprueba la cabecera `Netlify-CDN-Cache-Control`
en la respuesta y espera ese minuto. Si el evento es un borrador, no aparecerá.

### El formulario devuelve 404

- Confirma que `contacto` aparece en **Netlify → Forms**; si no, activa **Form
  detection** y redespliega sin caché.
- No lo pruebes con `npm run dev`: ahí el POST no tiene backend.
- Con Edge Access activo, el POST también falla.

---

## Flujo de Git

El repositorio versiona **código y configuración**, no contenido:

```bash
git switch -c funcionalidad/agenda-por-categoria
# cambios
git add -A && git commit -m "feat: filtra la agenda por categoría"
git push -u origin funcionalidad/agenda-por-categoria
```

Los cambios de contenido no pasan por PRs: quedan registrados en el historial
de documentos de Sanity (History). Para una revisión editorial formal, el plan
gratuito no incluye *Content Releases* ni roles de editor.

---

## Limitaciones conocidas (y siguientes pasos)

- **Plan gratuito de Sanity con topes duros**: 2 datasets públicos, 10 000
  documentos, 100 GB de assets, 1 M peticiones CDN/mes y 250 k de API/mes. Al
  superar peticiones, la API pública se bloquea. Para esta agenda sobra.
- **Solo roles Admin y Viewer** en el plan gratuito: todos los editores pueden
  borrar contenido. Si hace falta un rol Editor, hay que pasar a Growth.
- **Dependencia de un tercero.** El contenido es exportable con
  `npx sanity dataset export production backup.tar.gz`; guarda una copia antes
  de cambios grandes.
- **Caché de 60 s**: es el precio de no reconstruir. Se puede bajar `s-maxage`
  en `src/middleware.ts`, a costa de más invocaciones de función.
- **Sin buscador, filtros ni paginación.** Con ocho eventos no hace falta.
- **Sin vista previa de borradores.** El evento debe publicarse para verse.
- **Datos ficticios.** Correos en `.example`, teléfono inventado y fotos de
  Unsplash; sustitúyelos antes de usar la plantilla con un cliente real.
- **Sin analítica, sitemap ni RSS.** Independientes del objetivo de
  entrenamiento.
