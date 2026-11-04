import { defineConfig } from 'astro/config';

// Sitio totalmente estático: Netlify sirve `dist/` y detecta el formulario
// de contacto en el HTML generado. Cambia `site` por tu dominio final.
export default defineConfig({
  site: 'https://academia-la-clave.netlify.app',
  output: 'static',
  build: {
    format: 'directory',
  },
});
