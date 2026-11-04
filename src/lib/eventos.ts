import type { CollectionEntry } from 'astro:content';

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

export type Evento = CollectionEntry<'eventos'>;

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
