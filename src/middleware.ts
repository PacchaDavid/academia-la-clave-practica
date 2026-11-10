import { defineMiddleware } from 'astro:middleware';

const CACHEABLES = /^\/(eventos(\/.*)?)?$/;

/**
 * Las rutas con contenido de Sanity se renderizan bajo demanda, pero se cachean
 * en el CDN de Netlify: la función se ejecuta como mucho una vez por minuto y el
 * resto de visitas las sirve el edge. `durable` reduce invocaciones entre nodos.
 * La portada y la agenda pueden tardar hasta 60 s en reflejar una publicación.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  if (CACHEABLES.test(context.url.pathname) && response.status === 200) {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    response.headers.set(
      'Netlify-CDN-Cache-Control',
      'public, durable, s-maxage=60, stale-while-revalidate=86400',
    );
  }

  return response;
});
