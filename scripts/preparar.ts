// Arma la línea de tiempo de un video: lee guion.json (y voz/voz.json si hay voz), valida las escenas con el estilo,
// calcula cuándo empieza y cuánto dura cada escena, copia la música y los efectos a la carpeta del video y escribe
// props.json, que es lo que recibe la composición de Remotion.
//
// Uso: node scripts/preparar.ts videos/<carpeta>
// Funciona igual en Windows y en Mac: solo Node, rutas con path.join y archivos en UTF-8.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esquemaGuion, esquemaVoz, type EscenaLista, type PropsVideo, type VozEscena } from '../src/comun/guion.ts';
import { cargarReglas } from './estilos.ts';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function leerJson(ruta: string): unknown {
  return JSON.parse(readFileSync(ruta, 'utf-8'));
}

/** Contraste entre dos colores #RRGGBB según WCAG 2 (de 1 a 21). */
export function contraste(a: string, b: string): number {
  const luz = (hex: string): number => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [claro, oscuro] = [luz(a), luz(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

function fallar(mensaje: string): never {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

export async function preparar(carpeta: string): Promise<PropsVideo> {
  const rutaGuion = join(carpeta, 'guion.json');
  if (!existsSync(rutaGuion)) fallar(`No encuentro ${rutaGuion}`);
  const leido = esquemaGuion.safeParse(leerJson(rutaGuion));
  if (!leido.success) fallar(`guion.json no es válido:\n${leido.error.message}`);
  const guion = leido.data;

  let reglas;
  try {
    reglas = await cargarReglas(guion.estilo);
  } catch (error) {
    fallar(error instanceof Error ? error.message : String(error));
  }

  const ajustesLeidos = reglas.esquemaAjustes.safeParse(guion.ajustes);
  if (!ajustesLeidos.success) fallar(`Los ajustes del estilo no son válidos:\n${ajustesLeidos.error.message}`);
  const ajustes = ajustesLeidos.data as Record<string, unknown>;

  const rutaVoz = join(carpeta, 'voz', 'voz.json');
  const voces: (VozEscena | null)[] = existsSync(rutaVoz) ? esquemaVoz.parse(leerJson(rutaVoz)).escenas : [];
  if (voces.length > 0 && voces.length !== guion.escenas.length) {
    fallar(`voz/voz.json tiene ${voces.length} escenas y el guion ${guion.escenas.length}: vuelve a generar la voz.`);
  }

  const escenas: EscenaLista[] = [];
  let t = 0;
  guion.escenas.forEach((cruda, i) => {
    const r = reglas.esquemaEscena.safeParse(cruda);
    if (!r.success) fallar(`La escena ${i + 1} no es válida para «${guion.estilo}»:\n${r.error.message}`);
    const datos = r.data;
    const voz = voces[i] ?? null;
    if (voz !== null && !existsSync(join(carpeta, voz.archivo))) fallar(`Falta el audio ${voz.archivo}`);
    const duracion = Math.round(reglas.duracion(datos, voz, ajustes) * 1000) / 1000;
    escenas.push({
      indice: i,
      inicio: Math.round(t * 1000) / 1000,
      duracion,
      datos: datos as Record<string, unknown>,
      voz: voz === null ? null : { ...voz, desfase: reglas.desfaseVoz(datos) },
    });
    t += duracion;
  });
  const duracion = Math.round((t + reglas.cola) * 1000) / 1000;

  // Música: se copia a la carpeta del video, que es la carpeta pública del render.
  let musica: string | null = null;
  if (guion.musica !== null) {
    const origen = join(APP, 'recursos', 'musica', guion.musica);
    if (!existsSync(origen)) fallar(`No existe la música recursos/musica/${guion.musica}`);
    mkdirSync(join(carpeta, 'audio'), { recursive: true });
    copyFileSync(origen, join(carpeta, 'audio', basename(origen)));
    musica = `audio/${basename(origen)}`;
  }

  // Efectos: nombre lógico → archivo, según recursos/efectos.json. Los que falten se omiten sin romper el video.
  const efectos: Record<string, string> = {};
  const indiceEfectos = join(APP, 'recursos', 'efectos.json');
  if (guion.efectos && existsSync(indiceEfectos)) {
    const indice = leerJson(indiceEfectos) as Record<string, string>;
    for (const nombre of reglas.efectos) {
      const archivo = indice[nombre];
      if (archivo === undefined) continue;
      const origen = join(APP, 'recursos', 'efectos', archivo);
      if (!existsSync(origen)) continue;
      mkdirSync(join(carpeta, 'audio'), { recursive: true });
      copyFileSync(origen, join(carpeta, 'audio', archivo));
      efectos[nombre] = `audio/${archivo}`;
    }
  }

  // El texto que el estilo escribe sobre el color de acento tiene que leerse (evaluación del 20/11/2026: en órganos un
  // acento oscuro dejó los rótulos ilegibles). Solo avisa: el guion sigue siendo válido.
  const encima = reglas.textoSobreAcento?.(ajustes as never);
  if (encima !== undefined && /^#[0-9a-fA-F]{6}$/.test(encima)) {
    const c = contraste(guion.marca.acento, encima);
    if (c < 4.5) {
      console.log(
        `! El color de acento ${guion.marca.acento} contrasta ${c.toFixed(1)}:1 con el texto que «${guion.estilo}» escribe encima (${encima}); ` +
          `hace falta 4.5:1 para leerse. Usa un acento más claro, como el de ejemplos/${guion.estilo}.json.`,
      );
    }
  }

  const props: PropsVideo = { guion, ajustes, escenas, duracion, musica, efectos };
  writeFileSync(join(carpeta, 'props.json'), JSON.stringify(props, null, 2) + '\n', 'utf-8');
  return props;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const carpeta = process.argv[2];
  if (carpeta === undefined) fallar('Uso: node scripts/preparar.ts videos/<carpeta>');
  const props = await preparar(resolve(carpeta));
  const conVoz = props.escenas.filter((e) => e.voz !== null).length;
  console.log(
    `✓ ${props.guion.estilo} · ${props.escenas.length} escenas · ${props.duracion.toFixed(1)} s · voz en ${conVoz} · ` +
      `música ${props.musica ?? 'no'} · efectos ${Object.keys(props.efectos).length}`,
  );
  if (props.duracion > 60) console.log(`! Dura ${props.duracion.toFixed(1)} s: pasa del minuto. Recorta el guion.`);
}
