// Los íconos de Phosphor (MIT, @phosphor-icons/core 2.1.1) dibujados como SVG en línea y coloreados por el estilo.
// Los archivos .svg del paquete instalado entran en el paquete de Remotion con import.meta.webpackContext (cada uno
// como archivo propio, igual que las fuentes); antes del primer fotograma se leen solo los que usa el guion y se
// guardan sus trazados, así cada fotograma dibuja al momento. Nada sale a la red: se leen del servidor local del render.
// Dos pesos, nunca mezclados dentro de un mismo papel (regla del original, «íconos limpios»):
//   - «lleno» (fill), de un color: las tarjetas, el ícono sobre la cabeza, la figura central;
//   - «duotono» (duotone), a dos colores: la parte clara (al 20 % en Phosphor) se pinta llena con el color de fondo y
//     el trazo con el principal: los íconos de la órbita y el del título.

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';
import { ICONO_DE_RESERVA } from './catalogo.ts';

interface Contexto {
  keys(): string[];
  (clave: string): unknown;
}
type ConContexto = { webpackContext(ruta: string, opciones: { recursive: boolean; regExp: RegExp }): Contexto };

// Ruta relativa a node_modules (no el nombre del paquete): su campo «exports» no expone las carpetas, solo los archivos.
const LLENOS = (import.meta as unknown as ConContexto).webpackContext('../../../node_modules/@phosphor-icons/core/assets/fill', {
  recursive: false,
  regExp: /-fill\.svg$/,
});
const DUOTONOS = (import.meta as unknown as ConContexto).webpackContext('../../../node_modules/@phosphor-icons/core/assets/duotone', {
  recursive: false,
  regExp: /-duotone\.svg$/,
});

export interface Trazado {
  readonly d: string;
  /** La parte que en Phosphor va al 20 % (el «relleno» del duotono). */
  readonly fondo: boolean;
}

export interface DatosIcono {
  readonly lleno: readonly Trazado[];
  readonly duotono: readonly Trazado[];
}

export type Iconos = ReadonlyMap<string, DatosIcono>;

function direccion(contexto: Contexto, clave: string): string | null {
  if (!contexto.keys().includes(clave)) return null;
  const m = contexto(clave);
  if (typeof m === 'string') return m;
  if (m !== null && typeof m === 'object' && 'default' in m && typeof (m as { default: unknown }).default === 'string') return (m as { default: string }).default;
  return null;
}

/** Los trazados de un SVG de Phosphor (en 2.1.1 todo son <path>). */
function leerSvg(svg: string): Trazado[] {
  const trazados: Trazado[] = [];
  const re = /<path\b([^>]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const d = /\sd="([^"]+)"/.exec(m[1]);
    if (d !== null) trazados.push({ d: d[1], fondo: /opacity="0?\.2"/.test(m[1]) });
  }
  return trazados;
}

async function leer(contexto: Contexto, clave: string): Promise<Trazado[] | null> {
  const url = direccion(contexto, clave);
  if (url === null) return null;
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo leer el ícono ${clave} del paquete (HTTP ${respuesta.status})`);
  return leerSvg(await respuesta.text());
}

const memoria = new Map<string, DatosIcono>();

async function cargarIcono(nombre: string): Promise<DatosIcono | null> {
  const ya = memoria.get(nombre);
  if (ya !== undefined) return ya;
  const [lleno, duotono] = await Promise.all([leer(LLENOS, `./${nombre}-fill.svg`), leer(DUOTONOS, `./${nombre}-duotone.svg`)]);
  if (lleno === null || duotono === null) return null;
  const datos = { lleno, duotono };
  memoria.set(nombre, datos);
  return datos;
}

/** Carga los íconos pedidos (y el de reserva) antes del primer fotograma. Devuelve null mientras carga. */
export function useIconos(nombres: readonly string[]): Iconos | null {
  const clave = [...new Set([...nombres, ICONO_DE_RESERVA])].sort().join(',');
  const [iconos, setIconos] = useState<Iconos | null>(null);
  const [espera] = useState(() => delayRender('Íconos de Phosphor del estilo iconos'));
  useEffect(() => {
    const lista = clave.split(',');
    Promise.all(lista.map(async (n) => [n, await cargarIcono(n)] as const))
      .then((pares) => {
        const mapa = new Map<string, DatosIcono>();
        for (const [n, d] of pares) if (d !== null) mapa.set(n, d);
        if (!mapa.has(ICONO_DE_RESERVA)) throw new Error(`Falta el ícono de reserva «${ICONO_DE_RESERVA}» en @phosphor-icons/core`);
        setIconos(mapa);
        continueRender(espera);
      })
      .catch((error: unknown) => cancelRender(error instanceof Error ? error : new Error(String(error))));
  }, [clave, espera]);
  return iconos;
}

export interface PropsIcono {
  readonly iconos: Iconos;
  readonly nombre: string;
  readonly estilo: 'lleno' | 'duotono';
  /** Lado del cuadro en px (el glifo ocupa ~80 % del cuadro de 256). */
  readonly lado: number;
  /** Color principal (lleno: todo; duotono: el trazo). */
  readonly color: string;
  /** Duotono: color de la parte de relleno. */
  readonly colorFondo?: string;
  readonly style?: CSSProperties;
}

/** Un ícono en línea. Si el nombre no se cargó (no debería pasar: reglas.ts valida), dibuja el de reserva. */
export function Icono({ iconos, nombre, estilo, lado, color, colorFondo, style }: PropsIcono): ReactNode {
  const datos = iconos.get(nombre) ?? iconos.get(ICONO_DE_RESERVA);
  if (datos === undefined) return null;
  const trazados = estilo === 'lleno' ? datos.lleno : datos.duotono;
  return (
    <svg width={lado} height={lado} viewBox="0 0 256 256" style={{ display: 'block', overflow: 'visible', ...style }}>
      {trazados.map((t, i) => (
        <path key={i} d={t.d} fill={estilo === 'duotono' && t.fondo ? (colorFondo ?? color) : color} opacity={estilo === 'lleno' && t.fondo ? 0.2 : 1} />
      ))}
    </svg>
  );
}
