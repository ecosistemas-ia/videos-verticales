// Los estilos instalados: cada carpeta de src/estilos/ con reglas.ts (exporta `reglas`) y Estilo.tsx (exporta
// `Estilo`). Para el catálogo:  node scripts/estilos.ts            → lista
//                               node scripts/estilos.ts --json     → lo mismo en JSON (lo leen las skills)

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FAMILIAS, type Familia, type ReglasEstilo } from '../src/comun/reglas.ts';

export const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ESTILOS = join(APP, 'src', 'estilos');

export function idsDeEstilos(): string[] {
  return readdirSync(ESTILOS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(ESTILOS, d.name, 'reglas.ts')) && existsSync(join(ESTILOS, d.name, 'Estilo.tsx')))
    .map((d) => d.name)
    .sort();
}

export async function cargarReglas(id: string): Promise<ReglasEstilo> {
  if (!/^[a-z0-9-]+$/.test(id) || !idsDeEstilos().includes(id)) {
    throw new Error(`El estilo «${id}» no existe. Estilos: ${idsDeEstilos().join(', ')}`);
  }
  const modulo = (await import(pathToFileURL(join(ESTILOS, id, 'reglas.ts')).href)) as { reglas: ReglasEstilo };
  if (modulo.reglas.id !== id) throw new Error(`src/estilos/${id}/reglas.ts declara id «${modulo.reglas.id}»: tiene que ser «${id}».`);
  return modulo.reglas;
}

/** Los estilos agrupados por familia, en el orden de FAMILIAS. */
export function porFamilia<R extends { familia: Familia }>(lista: readonly R[]): Array<{ familia: Familia; nombre: string; para: string; estilos: R[] }> {
  return (Object.keys(FAMILIAS) as Familia[])
    .map((f) => ({ familia: f, nombre: FAMILIAS[f].nombre, para: FAMILIAS[f].para, estilos: lista.filter((r) => r.familia === f) }))
    .filter((g) => g.estilos.length > 0);
}

/** Escribe src/entradas/<nombre>.ts, la entrada de Remotion con los estilos pedidos, y devuelve su ruta. */
export function escribirEntrada(nombre: string, ids: readonly string[]): string {
  const carpeta = join(APP, 'src', 'entradas');
  mkdirSync(carpeta, { recursive: true });
  const ruta = join(carpeta, `${nombre}.ts`);
  const lineas = [
    '// Generado por scripts/estilos.ts: no se edita a mano.',
    "import { registerRoot } from 'remotion';",
    "import { crearRaiz } from '../comun/Raiz.tsx';",
    ...ids.map((id, i) => `import { reglas as r${i} } from '../estilos/${id}/reglas.ts';\nimport { Estilo as E${i} } from '../estilos/${id}/Estilo.tsx';`),
    `registerRoot(crearRaiz([${ids.map((_, i) => `{ reglas: r${i}, Estilo: E${i} }`).join(', ')}]));`,
    '',
  ];
  writeFileSync(ruta, lineas.join('\n'), 'utf-8');
  return ruta;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const lista = await Promise.all(idsDeEstilos().map(async (id) => cargarReglas(id)));
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(lista.map((r) => ({ id: r.id, nombre: r.nombre, familia: r.familia, familia_nombre: FAMILIAS[r.familia].nombre, descripcion: r.descripcion, ideal_para: r.ideal_para, musica_sugerida: r.musica_sugerida, subtitulos: r.admiteSubtitulos })), null, 2));
  } else {
    for (const g of porFamilia(lista)) {
      console.log(`\n${g.nombre}: ${g.para}`);
      for (const r of g.estilos) console.log(`  ${r.id.padEnd(12)} ${r.nombre} · ${r.descripcion}`);
    }
  }
}
