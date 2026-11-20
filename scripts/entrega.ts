// La página de entrega de un video: el video, la portada, títulos, descripción con fuentes, hashtags, licencias de la
// música y coste. Lee guion.json, props.json, publicacion.json (si existe) y voz/voz.json (si existe).
// Uso: node scripts/entrega.ts videos/<carpeta> [--sin-abrir]

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { abrirEnNavegador } from './abrir.ts';
import { APP } from './estilos.ts';
import { ESTILO_PAGINA, e } from './pagina.ts';

const carpetaArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (carpetaArg === undefined) {
  console.error('Uso: node scripts/entrega.ts videos/<carpeta>');
  process.exit(1);
}
const carpeta = resolve(carpetaArg);
const leer = (ruta: string): any => (existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf-8')) : null);
const guion = leer(join(carpeta, 'guion.json'));
const props = leer(join(carpeta, 'props.json'));
if (guion === null || props === null || !existsSync(join(carpeta, 'video.mp4'))) {
  console.error('Falta guion.json, props.json o video.mp4: renderiza primero con  node scripts/render.ts ' + carpetaArg);
  process.exit(1);
}
const pub = leer(join(carpeta, 'publicacion.json')) ?? {};
const voz = leer(join(carpeta, 'voz', 'voz.json'));
const licencias: any[] = leer(join(APP, 'recursos', 'licencias.json')) ?? [];

const titulos: string[] = pub.titulos ?? [guion.titulo];
const fuentes: Array<{ titulo: string; url: string; fecha?: string }> = guion.fuentes ?? [];
const pista = guion.musica ? licencias.find((l) => String(l.archivo).endsWith(guion.musica)) : null;
const lineasFuentes = fuentes.map((f) => `· ${f.titulo}${f.fecha ? ` (${f.fecha})` : ''}: ${f.url}`);
const descripcion = [pub.descripcion ?? '', fuentes.length > 0 ? `\nFuentes:\n${lineasFuentes.join('\n')}` : '', pista ? `\nMúsica: «${pista.titulo}» de ${pista.autor} (${pista.licencia})` : '']
  .join('')
  .trim();
// Una sola «#» delante de cada hashtag, venga escrito como venga, y sin espacios dentro.
const hashtags: string[] = (pub.hashtags ?? [])
  .map((h: unknown) => String(h).trim().replace(/^#+/, '').replace(/\s+/g, ''))
  .filter((h: string) => h !== '')
  .map((h: string) => `#${h}`);
const coste = voz?.motor === 'elevenlabs' ? `unos ${voz.creditos ?? '?'} créditos de ElevenLabs` : '0 USD';

const copiable = (titulo: string, texto: string): string =>
  `<h2>${e(titulo)}</h2><div class="bloque"><button onclick="navigator.clipboard.writeText(this.parentElement.dataset.t)">Copiar</button>${e(texto)}</div>`.replace(
    '<div class="bloque">',
    `<div class="bloque" data-t="${e(texto)}">`,
  );

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(guion.titulo)}</title><style>${ESTILO_PAGINA} .dos{display:grid;grid-template-columns:minmax(260px,380px) 1fr;gap:28px} @media(max-width:760px){.dos{grid-template-columns:1fr}} video{width:100%;border-radius:16px;background:#000}</style></head><body><main>
<h1>${e(guion.titulo)}</h1><p class="sub">Estilo ${e(guion.estilo)} · ${Number(props.duracion).toFixed(1)} s · coste ${e(coste)} · archivo: video.mp4 en esta carpeta</p>
<div class="dos"><div><video src="video.mp4" poster="portada.jpg" controls playsinline></video><p class="sub">Portada: portada.jpg</p></div><div>
${titulos.map((t, i) => copiable(`Título ${i + 1}`, t)).join('')}
${copiable('Descripción', descripcion)}
${hashtags.length > 0 ? copiable('Hashtags', hashtags.join(' ')) : ''}
<h2>Antes de publicar</h2><div class="bloque">· Míralo entero con sonido.
· Comprueba que cada dato coincide con su fuente.
· Si usaste imágenes propias o de stock, revisa su licencia.${pista ? `
· Música CC0: si YouTube la reclama, impugna con la licencia de arriba y este enlace: ${e(pista.fuente ?? '')}` : ''}</div>
</div></div></main></body></html>`;
writeFileSync(join(carpeta, 'entrega.html'), html, 'utf-8');
const duracion = Number(props.duracion);
console.log(`✓ entrega.html en ${carpetaArg} · ${duracion.toFixed(1)} s · coste ${coste}`);

// Un título o la descripción que citan una duración distinta de la real («en 40 segundos» en un video de 46).
const textos: Array<[string, string]> = [...titulos.map((t, i): [string, string] => [`El título ${i + 1}`, String(t)]), ['La descripción', String(pub.descripcion ?? '')]];
for (const [donde, texto] of textos) {
  for (const m of texto.matchAll(/(\d+)\s*(segundos|seg\b|s\b)/gi)) {
    if (Math.abs(Number(m[1]) - duracion) > 2) {
      console.log(`! ${donde} dice «${m[0]}» y el video dura ${duracion.toFixed(1)} s: corrígelo en publicacion.json.`);
    }
  }
}
if (!process.argv.includes('--sin-abrir')) abrirEnNavegador(join(carpeta, 'entrega.html'));
