import { toHTML } from '@portabletext/to-html';
import { getSanity, urlImagen } from './sanity';

const fechaLarga = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const fechaCorta = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});

export const CATEGORIAS = [
  'Concierto',
  'Clase magistral',
  'Taller',
  'Audición',
  'Encuentro',
  'Puertas abiertas',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export interface EventoData {
  titulo: string;
  fecha: Date;
  hora: string;
  lugar: string;
  categoria: Categoria;
  resumen: string;
  imagen: string;
  imagen_alt: string;
  precio: string;
  destacado: boolean;
  borrador: boolean;
}

export interface Evento {
  id: string;
  data: EventoData;
  bodyHtml: string;
}

interface DocumentoEvento {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  lugar: string;
  categoria: Categoria;
  resumen: string;
  imagen: { asset?: { _ref?: string } } | null;
  imagen_alt: string;
  precio?: string;
  destacado?: boolean;
  borrador?: boolean;
  body?: Parameters<typeof toHTML>[0];
}

/** Campos que se piden a Sanity, con el slug como `id` para conservar las URLs. */
const PROYECCION = `{
  "id": slug.current,
  titulo,
  fecha,
  hora,
  lugar,
  categoria,
  resumen,
  imagen,
  imagen_alt,
  precio,
  destacado,
  borrador,
  body
}`;

function aEvento(doc: DocumentoEvento): Evento {
  return {
    id: doc.id,
    data: {
      titulo: doc.titulo,
      fecha: new Date(`${doc.fecha}T00:00:00Z`),
      hora: doc.hora,
      lugar: doc.lugar,
      categoria: doc.categoria,
      resumen: doc.resumen,
      imagen: urlImagen(doc.imagen),
      imagen_alt: doc.imagen_alt,
      precio: doc.precio || 'Entrada libre',
      destacado: doc.destacado ?? false,
      borrador: doc.borrador ?? false,
    },
    bodyHtml: toHTML(doc.body ?? []),
  };
}

export async function getEventos(): Promise<Evento[]> {
  const documentos = await getSanity().fetch<DocumentoEvento[]>(
    `*[_type == "evento" && !(borrador == true)] | order(fecha asc) ${PROYECCION}`,
  );

  return documentos.map(aEvento);
}

export async function getEvento(slug: string): Promise<Evento | undefined> {
  const documento = await getSanity().fetch<DocumentoEvento | null>(
    `*[_type == "evento" && slug.current == $slug && !(borrador == true)][0] ${PROYECCION}`,
    { slug },
  );

  return documento ? aEvento(documento) : undefined;
}

export function formatearFecha(fecha: Date): string {
  return fechaLarga.format(fecha);
}

export function formatearFechaCorta(fecha: Date): string {
  return fechaCorta.format(fecha).replace('.', '');
}

export function esPasado(fecha: Date): boolean {
  const ahora = new Date();
  const inicioDeHoy = Date.UTC(
    ahora.getUTCFullYear(),
    ahora.getUTCMonth(),
    ahora.getUTCDate(),
  );
  return fecha.getTime() < inicioDeHoy;
}

export function porFechaAscendente(a: Evento, b: Evento): number {
  return a.data.fecha.getTime() - b.data.fecha.getTime();
}

export function porFechaDescendente(a: Evento, b: Evento): number {
  return b.data.fecha.getTime() - a.data.fecha.getTime();
}
