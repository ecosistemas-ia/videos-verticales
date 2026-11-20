// Los pasos entre escenas de los estilos de papel, medidos en MOTION sobre los fotogramas de los originales (30 fps).
// Números puros para la capa de una escena: opacidad, desenfoque (px a 1080), escala, giro, desplazamiento.
//
// Surreal:
//   - desenfoque: la escena vieja se desenfoca y se desvanece en 5 fotogramas; la nueva entra desenfocada y se enfoca en 7;
//   - detalle: fundido de 3 fotogramas sobre un primer plano desenfocado (el zoom lo hace la cámara de la escena);
//   - remolino: la vieja gira, crece y sale volando en 8 fotogramas, luego 6 de hoja vacía;
//   - destello: un disco blanco nace en un punto y lo cubre todo en 9; el blanco dura 8; la nueva aflora en 9;
//   - caida: la vieja se inclina y cae por abajo en 8;
//   - corte: seco;
//   - luzCalida: el paso al cierre oscuro (un velo rosa-anaranjado desde la esquina de abajo a la izquierda, un gris,
//     el naranja-pardo pleno 4 fotogramas, luego el fondo oscuro).
// Relato:
//   - subir: la escena sube y sale acelerando (~0,5 s); la nueva llega desde abajo frenando (~0,63 s);
//   - desenfoqueLargo: 9 fotogramas de desenfoque, corte, 12 para volver a enfocar;
//   - acercar: el producto se desliza a la izquierda acelerando y, en el corte, el primer plano sigue el movimiento;
//   - destelloMarco: el blanco cálido dentro de una tarjeta (4 fotogramas que blanquean, 3 que afloran);
//   - balanceo: la cámara de la apertura empieza girada 18° y se endereza frenando en ~2 s.

import { CURVAS, anima, animaEtapas } from './curvas.ts';
import { TIEMPOS_RELATO, TIEMPOS_SURREAL } from './pasos.ts';
import type { PasoRelato, PasoSurreal } from './pasos.ts';

export { PASOS_RELATO, PASOS_SURREAL, TIEMPOS_RELATO, TIEMPOS_SURREAL, retrasoSurreal } from './pasos.ts';
export type { PasoRelato, PasoSurreal } from './pasos.ts';


export interface EstadoCapa {
  readonly visible: boolean;
  readonly opacidad: number;
  readonly desenfoque: number;
  readonly escala: number;
  /** Grados, horario positivo. */
  readonly giro: number;
  /** Desplazamientos en fracciones del cuadro. */
  readonly dx: number;
  readonly dy: number;
  /** Verdadero durante el remolino: la escena se dibuja con copias giradas (la estela). */
  readonly estela: boolean;
}

export const CAPA_QUIETA: EstadoCapa = { visible: true, opacidad: 1, desenfoque: 0, escala: 1, giro: 0, dx: 0, dy: 0, estela: false };
const OCULTA: EstadoCapa = { ...CAPA_QUIETA, visible: false, opacidad: 0 };


/** La capa de la escena que sale con el paso `p` hacia la escena que empieza en el fotograma `limite`. */
export function saleSurreal(p: PasoSurreal, f: number, limite: number): EstadoCapa {
  switch (p) {
    case 'corte':
    case 'destello':
      return f < limite ? CAPA_QUIETA : OCULTA;
    case 'detalle':
      return f < limite + TIEMPOS_SURREAL.detalle.entra ? CAPA_QUIETA : OCULTA;
    case 'desenfoque': {
      const desde = limite - TIEMPOS_SURREAL.desenfoque.sale;
      if (f < desde) return CAPA_QUIETA;
      if (f >= limite) return OCULTA;
      const q = anima(f + 1, [desde, limite], [0, 1], CURVAS.salida);
      return { ...CAPA_QUIETA, opacidad: 1 - q, desenfoque: 18 * q, escala: 1 + 0.02 * q };
    }
    case 'remolino': {
      const desde = limite - TIEMPOS_SURREAL.remolino.sale;
      const fin = desde + TIEMPOS_SURREAL.remolino.vuela;
      if (f < desde) return CAPA_QUIETA;
      if (f >= fin) return OCULTA;
      const q = anima(f + 1, [desde, fin], [0, 1], CURVAS.acelera);
      return { ...CAPA_QUIETA, opacidad: 1 - q * q, desenfoque: 3 + 10 * q, escala: 1 + 0.9 * q, giro: -55 * q, estela: true };
    }
    case 'caida': {
      const desde = limite - TIEMPOS_SURREAL.caida.sale;
      if (f < desde) return CAPA_QUIETA;
      if (f >= limite + 1) return OCULTA;
      const q = anima(f + 1, [desde, limite + 1], [0, 1], CURVAS.acelera);
      return { ...CAPA_QUIETA, opacidad: 1 - q * 0.55, desenfoque: 9 * q, giro: 26 * q, dy: 0.85 * q };
    }
  }
}

/** La capa de la escena que entra con el paso `p` en el `limite`, vista en el fotograma `f`. */
export function entraSurreal(p: PasoSurreal, f: number, limite: number): EstadoCapa {
  if (f < limite) return OCULTA;
  switch (p) {
    case 'corte':
    case 'destello':
      return CAPA_QUIETA;
    case 'detalle': {
      const q = anima(f, [limite, limite + TIEMPOS_SURREAL.detalle.entra], [0, 1], CURVAS.suave);
      const qf = anima(f, [limite, limite + TIEMPOS_SURREAL.detalle.foco], [0, 1], CURVAS.frena);
      return { ...CAPA_QUIETA, opacidad: q, desenfoque: 12 * (1 - qf) };
    }
    case 'caida': {
      const q = anima(f, [limite, limite + TIEMPOS_SURREAL.caida.entra], [0, 1], CURVAS.frena);
      return { ...CAPA_QUIETA, opacidad: q };
    }
    case 'desenfoque':
    case 'remolino': {
      const n = p === 'desenfoque' ? TIEMPOS_SURREAL.desenfoque.entra : TIEMPOS_SURREAL.remolino.entra;
      const q = anima(f, [limite, limite + n], [0, 1], CURVAS.frena);
      return { ...CAPA_QUIETA, opacidad: Math.min(1, q * 1.15), desenfoque: 16 * (1 - q) };
    }
  }
}


/** Hasta qué fotograma (excluido) se ve la escena que sale, con el paso hacia la siguiente. */
export function finVisibleSurreal(p: PasoSurreal, limite: number): number {
  switch (p) {
    case 'detalle':
      return limite + TIEMPOS_SURREAL.detalle.entra;
    case 'remolino':
      return limite - TIEMPOS_SURREAL.remolino.sale + TIEMPOS_SURREAL.remolino.vuela;
    case 'caida':
      return limite + 1;
    default:
      return limite;
  }
}

/** El destello alrededor del límite: radio del disco blanco (fracción de la diagonal) y velo blanco sobre todo. */
export function destello(f: number, limite: number): { readonly radio: number; readonly velo: number } {
  const t = TIEMPOS_SURREAL.destello;
  const inicio = limite - t.crece - t.blanco + 2;
  if (f < inicio || f >= limite + 2 + t.aflora) return { radio: 0, velo: 0 };
  const radio = anima(f, [inicio, inicio + t.crece], [0.02, 1.15], CURVAS.acelera);
  const velo = f < limite + 2 ? anima(f, [inicio + t.crece - 2, inicio + t.crece], [0, 1], CURVAS.suave) : 1 - anima(f, [limite + 2, limite + 2 + t.aflora], [0, 1], CURVAS.suave);
  return { radio, velo };
}

/** La luz cálida desde el fotograma `desde`: velo rosa, gris, naranja-pardo pleno, luego el oscuro (0-1). */
export function luzCalida(f: number, desde: number): { readonly rosa: number; readonly pleno: string | null; readonly opacidadPleno: number; readonly oscuro: number } {
  if (f < desde) return { rosa: 0, pleno: null, opacidadPleno: 0, oscuro: 0 };
  const k = f - desde;
  const rosa = anima(f, [desde, desde + 4], [0, 1], CURVAS.suave);
  const etapas: readonly (readonly [number, string, number])[] = [
    [4, '#999494', 0.85],
    [5, '#6E5A4C', 1],
    [6, '#794C2B', 1],
    [7, '#85512D', 1],
    [8, '#85512D', 1],
    [9, '#6B4329', 1],
    [10, '#553926', 1],
  ];
  if (k < 4) return { rosa, pleno: null, opacidadPleno: 0, oscuro: 0 };
  const e = etapas.find(([n]) => n === k);
  if (e) return { rosa, pleno: e[1], opacidadPleno: e[2], oscuro: 0 };
  return { rosa: 0, pleno: null, opacidadPleno: 0, oscuro: anima(f, [desde + 10, desde + 13], [0.6, 1], CURVAS.suave) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Relato.


/** La escena que sale hacia la escena que empieza en el fotograma `limite`. */
export function saleRelato(p: PasoRelato, f: number, limite: number): EstadoCapa {
  if (f >= limite) return OCULTA;
  const t = TIEMPOS_RELATO[p].sale;
  if (t === 0 || f < limite - t) return CAPA_QUIETA;
  const q = anima(f + 1, [limite - t, limite], [0, 1], CURVAS.salida);
  switch (p) {
    case 'subir':
      return { ...CAPA_QUIETA, dy: -0.38 * q, desenfoque: 5 * q * q };
    case 'desenfoque':
      return { ...CAPA_QUIETA, desenfoque: 15 * q };
    case 'acercar':
      return { ...CAPA_QUIETA, dx: -0.05 * q, desenfoque: 2 * q };
    default:
      return CAPA_QUIETA;
  }
}

/** La escena que entra con el paso `p` en el límite, vista en el fotograma `f`. */
export function entraRelato(p: PasoRelato, f: number, limite: number): EstadoCapa {
  if (f < limite) return OCULTA;
  const t = TIEMPOS_RELATO[p].entra;
  if (t === 0 || f >= limite + t) return CAPA_QUIETA;
  const q = anima(f, [limite, limite + t], [0, 1], CURVAS.frena);
  switch (p) {
    case 'subir':
      return { ...CAPA_QUIETA, dy: 0.49 * (1 - q), escala: 1 + 0.02 * (1 - q), desenfoque: 6 * Math.max(0, 1 - q * 2.2) };
    case 'desenfoque':
      return { ...CAPA_QUIETA, desenfoque: 13 * (1 - q) };
    case 'acercar':
      return { ...CAPA_QUIETA, dx: 0.1 * (1 - q), desenfoque: 3 * (1 - q) };
    default:
      return CAPA_QUIETA;
  }
}

/** El destello dentro de una tarjeta alrededor del cambio `limite`: la opacidad del blanco cálido. */
export function destelloMarco(f: number, limite: number): number {
  if (f < limite - 4 || f >= limite + 3) return 0;
  if (f < limite) return [0.45, 0.72, 0.83, 0.92][f - (limite - 4)];
  return [0.42, 0.2, 0.06][f - limite];
}

/** El balanceo de la apertura: girada 18° y enderezándose frenando hasta 0° a ~2 s. */
export function balanceo(f: number, inicio: number, fps: number, grados = 18): number {
  const s = (x: number): number => inicio + Math.round(x * fps);
  const k = grados / 18;
  return animaEtapas(f, [
    { f: s(0.27), v: 18 * k },
    { f: s(0.53), v: 15 * k, curva: CURVAS.respira },
    { f: s(0.8), v: 9 * k, curva: CURVAS.respira },
    { f: s(1.07), v: 6 * k, curva: CURVAS.respira },
    { f: s(1.47), v: 3 * k, curva: CURVAS.respira },
    { f: s(1.97), v: 0, curva: CURVAS.frena },
  ]);
}
