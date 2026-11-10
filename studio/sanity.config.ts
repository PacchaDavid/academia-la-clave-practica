import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

if (!projectId) {
  throw new Error(
    'Falta SANITY_STUDIO_PROJECT_ID. Copia studio/.env.example a studio/.env ' +
      'y pega el ID de tu proyecto de sanity.io/manage.',
  );
}

export default defineConfig({
  name: 'default',
  title: 'Academia La Clave',
  projectId,
  dataset,
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
