import { createClient, type SanityClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import { SANITY_DATASET, SANITY_PROJECT_ID } from 'astro:env/server';

const API_VERSION = '2026-03-01';

let cliente: SanityClient | undefined;

/**
 * Cliente de Sanity para el servidor. El dataset del plan gratuito es público,
 * así que las lecturas no necesitan token: no hay secretos en el build.
 */
export function getSanity(): SanityClient {
  if (!SANITY_PROJECT_ID) {
    throw new Error(
      'Falta SANITY_PROJECT_ID. Copia .env.example a .env y añade el ID del ' +
        'proyecto, o defínelo en Netlify → Site configuration → Environment variables.',
    );
  }

  cliente ??= createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: API_VERSION,
    useCdn: true,
  });

  return cliente;
}

type FuenteImagen = Parameters<ReturnType<typeof createImageUrlBuilder>['image']>[0];

/**
 * URL de una imagen de Sanity recortada a 3:2 y convertida a WebP/AVIF por el
 * CDN del CMS. Si el evento no tiene imagen, cae al cartel genérico local.
 */
export function urlImagen(imagen: FuenteImagen | null | undefined, ancho = 1200): string {
  if (!imagen) return '/images/hero-sala.jpg';

  return createImageUrlBuilder(getSanity())
    .image(imagen)
    .width(ancho)
    .height(Math.round((ancho * 2) / 3))
    .fit('crop')
    .auto('format')
    .url();
}
