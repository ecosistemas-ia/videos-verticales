// La galería de los estilos: una página local con la portada y un video de muestra de cada estilo.
// Uso: node scripts/galeria.ts                 → crea galeria/index.html y la abre
//      node scripts/galeria.ts --generar [ids]  → renderiza antes las muestras (a media resolución) desde ejemplos/

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { abrirEnNavegador } from './abrir.ts';
import { APP, cargarReglas, idsDeEstilos, porFamilia } from './estilos.ts';
import { ESTILO_PAGINA, e } from './pagina.ts';
import { renderizar } from './renderizar.ts';

const GALERIA = join(APP, 'galeria');
mkdirSync(GALERIA, { recursive: true });
const args = process.argv.slice(2);
const ids = idsDeEstilos();

if (args.includes('--generar')) {
  const pedidos = args.filter((a) => !a.startsWith('--'));
  for (const id of pedidos.length > 0 ? pedidos : ids) {
    const ejemplo = join(APP, 'ejemplos', `${id}.json`);
    if (!existsSync(ejemplo)) {
      console.log(`· ${id}: sin ejemplos/${id}.json, se salta`);
      continue;
    }
    const carpeta = join(APP, '.cache', 'galeria', id);
    mkdirSync(carpeta, { recursive: true });
    copyFileSync(ejemplo, join(carpeta, 'guion.json'));
    const inicio = Date.now();
    await renderizar(carpeta, { escala: 0.5, crf: 28, salida: 'muestra.mp4' });
    copyFileSync(join(carpeta, 'muestra.mp4'), join(GALERIA, `${id}.mp4`));
    copyFileSync(join(carpeta, 'portada.jpg'), join(GALERIA, `${id}.jpg`));
    console.log(`✓ ${id} en ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
  }
}

// Una sección por familia (src/comun/reglas.ts → FAMILIAS), con una tarjeta por estilo.
const secciones: string[] = [];
for (const grupo of porFamilia(await Promise.all(ids.map((id) => cargarReglas(id))))) {
  const tarjetas = grupo.estilos.map((r) => {
    const id = r.id;
    const video = existsSync(join(GALERIA, `${id}.mp4`));
    const portada = existsSync(join(GALERIA, `${id}.jpg`));
    const medio = video
      ? `<video src="${e(id)}.mp4"${portada ? ` poster="${e(id)}.jpg"` : ''} controls muted loop playsinline preload="none"></video>`
      : portada
        ? `<img src="${e(id)}.jpg" alt="">`
        : `<div class="vacio">Sin muestra todavía:<br>node scripts/galeria.ts --generar ${e(id)}</div>`;
    return `<article class="tarjeta">${medio}<div class="cuerpo"><span class="id">${e(id)}</span><h3>${e(r.nombre)}</h3><p>${e(r.descripcion)}</p><p><b>Ideal para:</b> ${e(r.ideal_para)}</p></div></article>`;
  });
  secciones.push(`<h2>${e(grupo.nombre)}</h2><p class="sub">Para ${e(grupo.para)}.</p><div class="rejilla">${tarjetas.join('\n')}</div>`);
}
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Los estilos de video</title><style>${ESTILO_PAGINA}</style></head><body><main>
<h1>Los ${ids.length} estilos de video</h1><p class="sub">Todos en vertical 9:16, de 30 a 60 segundos. Pulsa un video para verlo con sonido. Para usar uno, pídeselo al asistente: «hazme un video con el estilo quiz sobre…».</p>
${secciones.join('\n')}</main></body></html>`;
writeFileSync(join(GALERIA, 'index.html'), html, 'utf-8');
if (!args.includes('--sin-abrir')) abrirEnNavegador(join(GALERIA, 'index.html'));
