# Academia La Clave

Sitio de prácticas para entrenar un despliegue real en Netlify. La academia es
ficticia; la arquitectura no: es la que usarías para un cliente pequeño que
quiere editar su agenda sin tocar código.

**Stack**

| Pieza | Uso |
| --- | --- |
| [Astro 7](https://docs.astro.build) | Generación estática, content collections y rutas por evento |
| [Decap CMS 3](https://decapcms.org) | Panel `/admin` para editar eventos en Markdown |
| [Netlify Forms](https://docs.netlify.com/manage/forms/setup/) | Recepción del formulario de contacto sin backend propio |
| Git + GitHub | Control de versiones y origen de los builds de Netlify |
| CSS a medida + Fontsource | Sistema de diseño cálido, sin framework de UI |

No se usa adaptador de Astro para Netlify porque el sitio es 100 % estático:
Netlify publica `dist/` tal cual.

---

## Puesta en marcha

Requisitos: Node 22 o superior y npm.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # astro check + build estático en dist/
npm run preview    # sirve dist/ en local
```

El build ejecuta `astro check` antes de compilar: si un evento tiene el
frontmatter incompleto o mal tipado, el despliegue falla en vez de publicar una
página rota.

---

## Estructura

```text
src/
├── components/          Header, Footer y tarjeta de evento
├── content/
│   └── eventos/         Un .md por evento (los edita Decap)
├── content.config.ts    Esquema Zod de la colección `eventos`
├── layouts/BaseLayout   Metadatos, fuentes y estructura del documento
├── lib/eventos.ts       Formateo de fechas y orden próximo/pasado
├── pages/
│   ├── admin/index.astro Página mínima que monta Decap
│   ├── index.astro
│   ├── clases.astro
│   ├── profesores.astro
│   ├── contacto.astro   Formulario de Netlify Forms
│   ├── gracias.astro    Destino tras enviar el formulario
│   ├── 404.astro
│   └── eventos/
│       ├── index.astro  Agenda: próximos + archivo
│       └── [slug].astro Ficha generada por evento
└── styles/global.css    Tokens, componentes y responsive
public/
├── admin/config.yml     Colección y backend de Decap
├── images/              Fotos locales
└── favicon.svg, robots.txt
netlify.toml             Build, publish, cabeceras y Node
```

---

## Eventos con Decap CMS

Cada evento es un archivo Markdown en `src/content/eventos/`. El frontmatter se
valida en `src/content.config.ts`:

```yaml
titulo: 'Concierto de invierno: Raíces'
fecha: 2026-12-12        # se usa para ordenar y separar el archivo
hora: '19:30'
lugar: 'Auditorio La Clave'
categoria: 'Concierto'   # Concierto | Clase magistral | Taller | Audición | Encuentro | Puertas abiertas
resumen: '...'           # máximo 200 caracteres
imagen: '/images/eventos/concierto-de-invierno.jpg'
imagen_alt: '...'
precio: '12 € · 8 € estudiantes'
destacado: true
borrador: false
```

- `borrador: true` excluye el evento del sitio publicado (en desarrollo sí se ve,
  con un aviso).
- La portada enlaza el próximo evento; la agenda separa próximos y pasados.
- La URL de cada evento sale del nombre del archivo (`id` de la entrada), así
  que renombrar un `.md` cambia su URL.

### Editar en local (sin OAuth)

En dos terminales:

```bash
npm run dev    # Astro en :4321
npm run cms    # decap-server en :8081
```

Abre <http://localhost:4321/admin>. `local_backend: true` en
`public/admin/config.yml` hace que Decap escriba directamente en el sistema de
archivos: no hay login ni repositorio remoto. Es la forma más rápida de
practicar el flujo editorial.

### Editar en producción (GitHub OAuth)

Decap necesita un pequeño proxy OAuth para hablar con GitHub; Netlify Identity
y Git Gateway no se usan en este proyecto. Pasos:

1. **Crea una GitHub OAuth App** (Settings → Developer settings → OAuth Apps):
   - *Homepage URL*: la URL del sitio en Netlify.
   - *Authorization callback URL*: `https://TU-PROXY.netlify.app/callback`.
   - Guarda `Client ID` y genera un `Client Secret`.
2. **Despliega el proxy** con el botón de despliegue de
   [`vencax/netlify-cms-github-oauth-provider`](https://github.com/vencax/netlify-cms-github-oauth-provider)
   en una cuenta de Netlify aparte y define sus variables de entorno:
   `OAUTH_CLIENT_ID` y `OAUTH_CLIENT_SECRET`.
3. **Actualiza `public/admin/config.yml`**:
   - `base_url: https://TU-PROXY.netlify.app` (sustituye el marcador por la URL
     del proxy).
   - `repo` y `site_url` ya apuntan a este proyecto; cámbialos si renombras el
     repositorio o el sitio.
4. Haz commit y push: Netlify reconstruye y `/admin/` ya permite iniciar sesión.

`publish_mode: editorial_workflow` está activo: al guardar, Decap crea una rama
y un *pull request* en lugar de escribir en `main`. Al pulsar **Publicar** se
hace merge, Netlify detecta el cambio y reconstruye. Ese es el ciclo completo
que conviene practicar:

```text
editar en /admin → PR en GitHub → publicar → rebuild de Netlify → evento en la web
```

### Quién puede publicar

El backend de GitHub no tiene usuarios propios: **la autorización la decide
GitHub**. Decap usa el token de la persona que inicia sesión y no puede hacer
nada que esa persona no pueda hacer ya en el repositorio.

- Invita en GitHub solo a quien deba administrar el contenido, con permiso
  **Write** o **Admin**. Un usuario sin acceso al repo puede autenticarse, pero
  Decap no podrá leer ni escribir nada.
- Con `editorial_workflow`, guardar crea una rama y un *pull request*;
  **publicar es hacer merge**. Quien pueda mergear en `main`, publica.
- Si quieres editores que propongan cambios sin publicar, dales **Write** y
  protege `main` con un *ruleset*: exigir pull request, exigir aprobación y
  bloquear force pushes. Así pueden crear PRs, pero el merge lo hace un
  administrador.
- Ocultar botones en el panel no es control de acceso: la seguridad está en los
  permisos del repositorio y en las reglas de la rama.

---

## Formulario de contacto (Netlify Forms)

El formulario vive en `src/pages/contacto.astro` y cumple los requisitos de
Netlify Forms:

- `name="contacto"` y `data-netlify="true"`.
- Campo oculto `form-name` con el mismo nombre (necesario fuera del HTML plano).
- Honeypot `bot-field` declarado con `netlify-honeypot="bot-field"`.
- `method="POST"` y `action="/gracias/"` como página de confirmación.

Netlify detecta el formulario durante el primer despliegue porque está presente
en el HTML estático de `dist/contacto/index.html`. Después:

- Las respuestas aparecen en **Netlify → Forms → contacto**.
- Configura una notificación por correo en esa misma pantalla.
- Se puede añadir reCAPTCHA si llega spam, además del honeypot.
- **En local no se procesa**: `astro dev` no ejecuta el runtime de Netlify.
  Para probarlo, usa un deploy preview o `netlify dev` con la CLI de Netlify.
- La protección **Edge Access** del sitio debe estar desactivada: si el sitio
  pide login, los visitantes externos no pueden enviar el formulario.

El límite de formularios y envíos del plan gratuito de Netlify cambia con el
tiempo; revísalo antes de un proyecto real.

---

## Despliegue en Netlify

1. Crea el repositorio en GitHub y sube el proyecto (rama `main`).
2. En Netlify: **Add new site → Import an existing project** y elige el repo.
3. Netlify lee `netlify.toml`: build `npm run build`, publish `dist`, Node 22.
4. Revisa las URLs si cambias de dominio:
   - `site` en `astro.config.mjs` (canonical y Open Graph absolutos).
   - `site_url` y `display_url` en `public/admin/config.yml`.
5. Configura el OAuth de Decap (sección anterior) y publica al menos un evento
   de prueba.
6. Revisa el checklist.

### Checklist de aceptación

- [ ] `npm run build` termina sin errores en local y en Netlify.
- [ ] Portada, clases, profesores, agenda, ficha de evento y contacto cargan.
- [ ] `/admin` pide login en producción y permite editar un evento.
- [ ] Publicar desde Decap genera commit/merge y un rebuild automático.
- [ ] Un evento con `borrador: true` no aparece en el sitio publicado.
- [ ] El formulario enviado desde el deploy aparece en Netlify Forms y redirige
      a `/gracias/`.
- [ ] La página 404 propia se sirve para rutas inexistentes.
- [ ] `robots.txt` bloquea `/admin/` y no hay páginas de prueba indexables.
- [ ] El sitio es público (Edge Access desactivado) y se abre desde el móvil.
- [ ] El formulario `contacto` aparece en Netlify → Forms tras el deploy.

---

## Si algo falla en el despliegue

### Todo el sitio devuelve 401 o pide login

No es el código: es **Netlify Edge Access**. La URL responde `401` y redirige a
`app.netlify.com/edge-access`. Desactívalo en Netlify → **Site configuration →
Access & security → Visitor access** (protección por contraseña o Edge Access).
Mientras esté activo, los móviles y cualquier visitante externo no pueden
entrar, y el POST del formulario también queda bloqueado.

### `/admin` devuelve 404

1. Confirma que el deploy es el último commit y que el build generó
   `dist/admin/index.html`.
2. Entra con barra final, `/admin/`; `netlify.toml` redirige `/admin`.
3. Aunque la página cargue, el login no funciona hasta desplegar el proxy OAuth
   y poner su URL en `base_url`.
4. Edge Access también protege `/admin/`: desactívalo para probar.

### El formulario devuelve 404

`/gracias/` existe (`src/pages/gracias.astro` genera `dist/gracias/index.html`),
así que el 404 suele venir de Netlify Forms, no de la ruta:

- Netlify → **Forms**: si no aparece `contacto`, activa **Form detection** en
  Site configuration → Forms y lanza **Deploys → Trigger deploy → Clear cache
  and deploy site**.
- Comprueba que el formulario está en el HTML desplegado de `/contacto/`.
- No lo pruebes con `npm run dev`: ahí el POST siempre devuelve 404.
- Con Edge Access activo, el POST también puede fallar.

---

## Flujo de Git

El repositorio usa `main` como rama desplegable:

```bash
git switch -c contenido/agenda-primavera
# cambios
git add -A && git commit -m "contenido: añade la agenda de primavera"
git push -u origin contenido/agenda-primavera
```

Los borradores del flujo editorial de Decap crean ramas `cms/...` con sus
propios pull requests. Conviene revisar los PRs antes de publicar: un error de
fecha o una imagen sin `alt` se detecta ahí, no en producción.

---

## Limitaciones conocidas (y siguientes pasos)

- **Próximos vs. pasados se calcula en el build.** Sin un rebuild, un evento
  sigue apareciendo como próximo después de su fecha. Netlify reconstruye al
  publicar en Decap; si la agenda debe actualizarse sola, añade un *build hook*
  programado (por ejemplo, una vez al día).
- **Sin buscador, filtros ni paginación.** Con siete eventos de muestra no hace
  falta; al crecer, valdría la pena filtrar por categoría.
- **Sin imágenes optimizadas por Astro.** Las fotos de eventos viven en
  `public/` porque Decap debe poder subirlas; se sirven tal cual. Si el peso
  importa, conviene un paso de optimización o un servicio de imágenes.
- **Datos ficticios.** Correos en `.example`, teléfono inventado y fotos de
  Unsplash; sustitúyelos antes de usar la plantilla con un cliente real.
- **Sin analítica, sitemap ni RSS.** Son independientes del objetivo de
  entrenamiento y se añaden cuando el despliegue base esté validado.
