import { defineField, defineType } from 'sanity';

export const CATEGORIAS = [
  'Concierto',
  'Clase magistral',
  'Taller',
  'Audición',
  'Encuentro',
  'Puertas abiertas',
] as const;

export const evento = defineType({
  name: 'evento',
  title: 'Evento',
  type: 'document',
  fields: [
    defineField({
      name: 'titulo',
      title: 'Título',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'URL',
      type: 'slug',
      description:
        'Se genera del título. Cámbialo solo si el evento es nuevo: la URL pública depende de él.',
      options: { source: 'titulo', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'fecha',
      title: 'Fecha',
      type: 'date',
      options: { dateFormat: 'YYYY-MM-DD' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'hora',
      title: 'Hora',
      type: 'string',
      description: 'Formato 24 h, por ejemplo 19:30.',
      validation: (rule) =>
        rule.required().regex(/^\d{2}:\d{2}$/, { name: 'HH:MM' }),
    }),
    defineField({
      name: 'lugar',
      title: 'Lugar',
      type: 'string',
      initialValue: 'Auditorio La Clave',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'categoria',
      title: 'Categoría',
      type: 'string',
      options: { list: [...CATEGORIAS], layout: 'dropdown' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'resumen',
      title: 'Resumen',
      type: 'text',
      rows: 3,
      description: 'Máximo 200 caracteres. Aparece en la tarjeta y en Google.',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'imagen',
      title: 'Imagen',
      type: 'image',
      options: { hotspot: true },
      description: 'Horizontal, al menos 1200 × 800 px. Sanity la recorta y la optimiza.',
    }),
    defineField({
      name: 'imagen_alt',
      title: 'Texto alternativo',
      type: 'string',
      description: 'Describe la foto para quien no puede verla.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'precio',
      title: 'Entrada',
      type: 'string',
      initialValue: 'Entrada libre',
    }),
    defineField({
      name: 'destacado',
      title: 'Destacar',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'borrador',
      title: 'Borrador (oculto en la web)',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'body',
      title: 'Contenido',
      type: 'array',
      of: [{ type: 'block' }],
    }),
  ],
  preview: {
    select: { title: 'titulo', subtitle: 'fecha', media: 'imagen' },
    prepare({ title, subtitle, media }) {
      return {
        title: title || 'Evento sin título',
        subtitle: subtitle ? new Date(`${subtitle}T00:00:00Z`).toLocaleDateString('es-ES') : 'Sin fecha',
        media,
      };
    },
  },
  orderings: [
    {
      title: 'Fecha, más reciente primero',
      name: 'fechaDesc',
      by: [{ field: 'fecha', direction: 'desc' }],
    },
    {
      title: 'Fecha, más antiguo primero',
      name: 'fechaAsc',
      by: [{ field: 'fecha', direction: 'asc' }],
    },
  ],
});
