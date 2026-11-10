import { defineConfig, envField } from 'astro/config';
import netlify from '@astrojs/netlify';

// Renderizado híbrido: la home y la agenda se generan bajo demanda (y se
// cachean en el CDN de Netlify) para no reconstruir el sitio al publicar un
// evento. Clases, profesores, contacto y gracias siguen siendo estáticas.
export default defineConfig({
  site: 'https://beautiful-khapse-aacccf.netlify.app',
  output: 'server',
  adapter: netlify({
    // El proyecto no tiene Netlify Edge Functions; el emulador local solo
    // añade ruido (y falla según la versión de Deno instalada).
    devFeatures: { environmentVariables: false, images: true, edgeFunctions: false },
  }),
  build: {
    format: 'directory',
  },
  env: {
    schema: {
      // Se leen en tiempo de ejecución: cambiarlas en Netlify no exige rebuild.
      SANITY_PROJECT_ID: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      SANITY_DATASET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        default: 'production',
      }),
    },
  },
});
