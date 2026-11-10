#!/usr/bin/env node
/**
 * Migra los eventos de src/content/eventos a Sanity.
 *
 *   node --env-file=.env scripts/migrar-a-sanity.mjs            # migra de verdad
 *   node scripts/migrar-a-sanity.mjs --dry-run                  # solo simula
 *
 * Necesita SANITY_PROJECT_ID, SANITY_DATASET y SANITY_WRITE_TOKEN (token con
 * rol Editor, creado en sanity.io/manage → API → Tokens). Es idempotente: usa
 * un _id derivado del slug, así que volver a ejecutarlo actualiza los mismos
 * documentos en lugar de duplicarlos.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

const RAIZ = process.cwd();
const DIR_CONTENIDO = path.join(RAIZ, 'src/content/eventos');
const DIR_PUBLICO = path.join(RAIZ, 'public');
const dryRun = process.argv.includes('--dry-run');

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_WRITE_TOKEN;

if (!dryRun && (!projectId || !token)) {
  console.error(
    'Faltan SANITY_PROJECT_ID o SANITY_WRITE_TOKEN.\n' +
      'Crea el token en sanity.io/manage → API → Tokens y ejecuta:\n' +
      '  node --env-file=.env scripts/migrar-a-sanity.mjs',
  );
  process.exit(1);
}

const cliente = dryRun
  ? null
  : (await import('@sanity/client')).createClient({
      projectId,
      dataset,
      apiVersion: '2026-03-01',
      token,
      useCdn: false,
    });

let contadorClaves = 0;
const clave = () => `k${++contadorClaves}`;

/** Convierte tokens inline de Markdown en spans de Portable Text. */
function spans(tokens = [], marcas = [], markDefs = []) {
  return tokens.flatMap((token) => {
    switch (token.type) {
      case 'strong':
        return spans(token.tokens, [...marcas, 'strong'], markDefs);
      case 'em':
        return spans(token.tokens, [...marcas, 'em'], markDefs);
      case 'codespan':
        return [{ _type: 'span', _key: clave(), text: token.text, marks: [...marcas, 'code'] }];
      case 'br':
        return [{ _type: 'span', _key: clave(), text: '\n', marks: marcas }];
      case 'link': {
        const key = clave();
        markDefs.push({ _key: key, _type: 'link', href: token.href });
        return spans(token.tokens, [...marcas, key], markDefs);
      }
      case 'text':
        if (token.tokens?.length) return spans(token.tokens, marcas, markDefs);
        return token.text ? [{ _type: 'span', _key: clave(), text: token.text, marks: marcas }] : [];
      default:
        return token.raw
          ? [{ _type: 'span', _key: clave(), text: token.raw, marks: marcas }]
          : [];
    }
  });
}

function bloque(estilo, tokens, extra = {}) {
  const markDefs = [];
  const children = spans(tokens, [], markDefs);
  if (!children.length) return null;
  return { _type: 'block', _key: clave(), style: estilo, markDefs, children, ...extra };
}

/** Convierte el Markdown del cuerpo a Portable Text (lo que edita el Studio). */
function portableText(markdown) {
  const bloques = [];

  for (const token of marked.lexer(markdown)) {
    if (token.type === 'heading') {
      const b = bloque(`h${Math.min(token.depth, 4)}`, token.tokens);
      if (b) bloques.push(b);
    } else if (token.type === 'paragraph') {
      const b = bloque('normal', token.tokens);
      if (b) bloques.push(b);
    } else if (token.type === 'blockquote') {
      for (const hijo of token.tokens) {
        const b = bloque('blockquote', hijo.tokens ?? []);
        if (b) bloques.push(b);
      }
    } else if (token.type === 'list') {
      for (const item of token.items) {
        const inline = item.tokens?.length ? item.tokens.flatMap((t) => t.tokens ?? []) : [];
        const b = bloque('normal', inline, {
          listItem: token.ordered ? 'number' : 'bullet',
          level: 1,
        });
        if (b) bloques.push(b);
      }
    } else if (token.type === 'code') {
      // El esquema solo admite bloques de texto: se conserva como cita.
      const b = bloque('blockquote', [{ type: 'text', text: token.text }]);
      if (b) bloques.push(b);
    }
  }

  return bloques;
}

const subidas = new Map();

async function subirImagen(rutaRelativa) {
  if (!rutaRelativa) return null;

  const absoluta = path.join(DIR_PUBLICO, rutaRelativa.replace(/^\//, ''));
  if (!fs.existsSync(absoluta)) {
    console.warn(`  ! No existe la imagen ${rutaRelativa}; el evento quedará sin foto.`);
    return null;
  }

  if (subidas.has(absoluta)) return subidas.get(absoluta);

  if (dryRun) {
    const falso = { _id: `image-falsa-${subidas.size}` };
    subidas.set(absoluta, falso);
    return falso;
  }

  const asset = await cliente.assets.upload('image', fs.createReadStream(absoluta), {
    filename: path.basename(absoluta),
  });
  subidas.set(absoluta, asset);
  console.log(`  · imagen subida: ${path.basename(absoluta)} (${asset._id})`);
  return asset;
}

const archivos = fs
  .readdirSync(DIR_CONTENIDO)
  .filter((nombre) => nombre.endsWith('.md'))
  .sort();

if (!archivos.length) {
  console.error(`No hay eventos en ${DIR_CONTENIDO}.`);
  process.exit(1);
}

console.log(`${dryRun ? 'Simulando' : 'Migrando'} ${archivos.length} eventos...`);

for (const archivo of archivos) {
  const slug = archivo.replace(/\.md$/, '');
  const { data, content } = matter(fs.readFileSync(path.join(DIR_CONTENIDO, archivo), 'utf8'));
  const body = portableText(content);
  const asset = await subirImagen(data.imagen);

  const fecha =
    data.fecha instanceof Date
      ? data.fecha.toISOString().slice(0, 10)
      : String(data.fecha).slice(0, 10);

  const documento = {
    _id: `evento-${createHash('sha1').update(slug).digest('hex').slice(0, 16)}`,
    _type: 'evento',
    titulo: String(data.titulo),
    slug: { _type: 'slug', current: slug },
    fecha,
    hora: String(data.hora),
    lugar: String(data.lugar),
    categoria: String(data.categoria),
    resumen: String(data.resumen).trim(),
    ...(asset
      ? {
          imagen: {
            _type: 'image',
            asset: { _type: 'reference', _ref: asset._id },
          },
        }
      : {}),
    imagen_alt: String(data.imagen_alt),
    precio: data.precio ? String(data.precio) : 'Entrada libre',
    destacado: Boolean(data.destacado),
    borrador: Boolean(data.borrador),
    body,
  };

  if (dryRun) {
    console.log(
      `  · ${slug}\n    "${documento.titulo}" · ${fecha} · ${body.length} bloques de contenido`,
    );
  } else {
    await cliente.createOrReplace(documento);
    console.log(`  ✓ ${slug}`);
  }
}

console.log(
  dryRun
    ? '\nSimulación correcta. Ejecuta sin --dry-run para escribir en Sanity.'
    : `\nListo. ${archivos.length} eventos migrados a ${projectId}/${dataset}.`,
);
