// El catálogo de íconos de Phosphor (MIT, @phosphor-icons/core 2.1.1): qué nombres existen, sus alias antiguos y
// sugerencias para un nombre mal escrito. Sin JSX ni React: lo usan reglas.ts (Node, al preparar) y el estilo (Chrome).
//   - Un nombre válido pasa tal cual («magnifying-glass»).
//   - Se aceptan el nombre en PascalCase («MagnifyingGlass»), con el sufijo de peso («magnifying-glass-fill») y los
//     alias que Phosphor conserva de versiones viejas («archive-box» → «box-arrow-down»).
//   - Un nombre que no existe se cambia por ICONO_DE_RESERVA y se avisa en la consola con los más parecidos: el video
//     sale igual y el guionista sabe qué corregir.

import { icons } from '@phosphor-icons/core';

/** El ícono que se pone cuando el guion pide uno que no existe. */
export const ICONO_DE_RESERVA = 'sparkle';

const NOMBRES = new Set<string>(icons.map((i) => i.name));
const ALIAS = new Map<string, string>();
const ETIQUETAS = new Map<string, readonly string[]>();
for (const i of icons) {
  ETIQUETAS.set(i.name, i.tags);
  const alias = (i as { alias?: { name: string } }).alias;
  if (alias !== undefined) ALIAS.set(alias.name, i.name);
}

/** De «MagnifyingGlass», «magnifying_glass» o «magnifying-glass-fill» a «magnifying-glass». */
function limpiar(nombre: string): string {
  return nombre
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-(fill|duotone|bold|light|thin|regular)$/, '');
}

/** Distancia de edición (para sugerir el nombre más parecido). */
function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const arriba = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = arriba;
    }
  }
  return fila[b.length];
}

/** El nombre real de Phosphor para lo que escribió el guionista, o null si no existe. */
export function nombreReal(nombre: string): string | null {
  const limpio = limpiar(nombre);
  if (NOMBRES.has(limpio)) return limpio;
  return ALIAS.get(limpio) ?? null;
}

/** Hasta `n` nombres parecidos: por las letras y por las etiquetas de Phosphor (en inglés). */
export function sugerencias(nombre: string, n = 5): string[] {
  const limpio = limpiar(nombre);
  const partes = limpio.split('-').filter((p) => p.length >= 3);
  const puntos = [...NOMBRES].map((candidato) => {
    let p = distancia(limpio, candidato);
    if (candidato.includes(limpio) || limpio.includes(candidato)) p -= 4;
    const etiquetas = ETIQUETAS.get(candidato) ?? [];
    for (const parte of partes) if (candidato.split('-').includes(parte) || etiquetas.includes(parte)) p -= 3;
    return { candidato, p };
  });
  return puntos
    .sort((a, b) => a.p - b.p || a.candidato.localeCompare(b.candidato))
    .slice(0, n)
    .map((x) => x.candidato);
}

/** Busca íconos por palabra (en inglés, sobre nombres y etiquetas). Para el guionista: node src/estilos/iconos/buscar.ts */
export function buscarIconos(consulta: string, n = 20): string[] {
  const q = consulta.trim().toLowerCase();
  if (q === '') return [];
  const exactos: string[] = [];
  const otros: string[] = [];
  for (const nombre of NOMBRES) {
    const etiquetas = ETIQUETAS.get(nombre) ?? [];
    if (nombre === q || nombre.split('-').includes(q)) exactos.push(nombre);
    else if (nombre.includes(q) || etiquetas.some((e) => e.includes(q))) otros.push(nombre);
  }
  return [...exactos.sort(), ...otros.sort()].slice(0, n);
}

const avisados = new Set<string>();

/**
 * El nombre que se dibuja: el real si existe; si no, ICONO_DE_RESERVA, con un aviso en la consola (una vez por nombre)
 * que propone los más parecidos.
 */
export function iconoValido(nombre: string): string {
  const real = nombreReal(nombre);
  if (real !== null) return real;
  if (!avisados.has(nombre)) {
    avisados.add(nombre);
    console.warn(
      `! El ícono «${nombre}» no existe en Phosphor: uso «${ICONO_DE_RESERVA}». ¿Quisiste decir ${sugerencias(nombre)
        .map((s) => `«${s}»`)
        .join(', ')}? Lista completa: https://phosphoricons.com`,
    );
  }
  return ICONO_DE_RESERVA;
}
