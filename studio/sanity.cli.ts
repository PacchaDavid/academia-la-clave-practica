import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? '',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // Subdominio del Studio: https://academia-la-clave.sanity.studio
  // Cámbialo aquí y en la redirección /admin de netlify.toml si usas otro.
  studioHost: 'academia-la-clave',
  deployment: {
    autoUpdates: true,
  },
});
