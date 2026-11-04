import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const eventos = defineCollection({
  loader: glob({ base: './src/content/eventos', pattern: '**/*.md' }),
  schema: z.object({
    titulo: z.string(),
    fecha: z.coerce.date(),
    hora: z.string().regex(/^\d{2}:\d{2}$/, 'Usa el formato HH:MM'),
    lugar: z.string(),
    categoria: z.enum([
      'Concierto',
      'Clase magistral',
      'Taller',
      'Audición',
      'Encuentro',
      'Puertas abiertas',
    ]),
    resumen: z.string().max(200),
    imagen: z.string(),
    imagen_alt: z.string(),
    precio: z.string().default('Entrada libre'),
    destacado: z.boolean().default(false),
    borrador: z.boolean().default(false),
  }),
});

export const collections = { eventos };
