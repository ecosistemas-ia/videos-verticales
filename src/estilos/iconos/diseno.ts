// Colores y posiciones del estilo en 9:16 (1080 × 1920). Los colores y las proporciones vienen del original (medidos
// sobre el video de referencia en 720 px de ancho; aquí u = 1,5 lleva esas medidas a 1080). Las posiciones cambian:
//   - todo lo importante va dentro de ZONA_SEGURA (arriba 220, abajo 420, derecha 160);
//   - la franja de los subtítulos comunes (1270-1490) queda libre en todos los planos: el contenido termina en 1260;
//   - por eso las tarjetas son algo más chicas que en el original (u = 1,4) y el círculo de la apertura sube.
// Sin JSX: lo puede cargar Node.

import { mezclarColores } from './curvas.ts';
import type { AjustesIconos } from './reglas.ts';

export interface Colores {
  /** Figuras, íconos de la órbita, círculo de la apertura. */
  readonly acento: string;
  /** Cursiva y asteriscos. */
  readonly cursiva: string;
  /** Línea roja bajo el título y la invitación del cierre. */
  readonly lineaRoja: string;
  /** Halo del círculo. */
  readonly halo: string;
  /** Azul de las figuras. */
  readonly azul: string;
  /** Relleno de las tarjetas (con opacidad de 0,28 a 0,63). */
  readonly tarjeta: string;
  /** Color de abajo del degradado del fondo. */
  readonly fondoBajo: string;
}

/** Los colores del original. */
export const CARMESI: Colores = {
  acento: '#EE4A58',
  cursiva: '#DC4B5C',
  lineaRoja: '#E2505E',
  halo: '#E56170',
  azul: '#34475C',
  tarjeta: '#DE454D',
  fondoBajo: '#942C35',
};

/** Los colores de un video: los del original, o los derivados del acento de la marca. */
export function coloresDelVideo(ajustes: AjustesIconos, acentoMarca: string): Colores {
  const base: Colores =
    ajustes.color === 'marca'
      ? {
          ...CARMESI,
          acento: acentoMarca,
          cursiva: mezclarColores(acentoMarca, '#000000', 0.07),
          lineaRoja: mezclarColores(acentoMarca, '#FFFFFF', 0.03),
          halo: mezclarColores(acentoMarca, '#FFFFFF', 0.12),
          tarjeta: mezclarColores(acentoMarca, '#000000', 0.06),
          fondoBajo: mezclarColores(acentoMarca, '#000000', 0.45),
        }
      : CARMESI;
  return ajustes.fondo === undefined ? base : { ...base, fondoBajo: ajustes.fondo };
}

/** Las etapas del degradado del fondo (medidas): negro hasta el 42 % y una subida que acelera hacia el carmesí. */
const ETAPAS: readonly { readonly cuota: number; readonly color: string }[] = [
  { cuota: 0, color: '#000000' },
  { cuota: 0.42, color: '#000000' },
  { cuota: 0.46, color: '#130404' },
  { cuota: 0.56, color: '#230C0D' },
  { cuota: 0.65, color: '#391214' },
  { cuota: 0.74, color: '#4F181C' },
  { cuota: 0.83, color: '#6A2026' },
  { cuota: 0.93, color: '#81272E' },
  { cuota: 1, color: '#942C35' },
];

/** Las etapas para otro color de abajo: cada canal escala en la misma proporción que el #942C35 original. */
export function etapasFondo(fondoBajo: string): { cuota: number; color: string }[] {
  const canales = (c: string): number[] => [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16));
  const base = canales(CARMESI.fondoBajo);
  const nuevo = canales(fondoBajo);
  return ETAPAS.map((e) => {
    const c = canales(e.color).map((v, k) => Math.round(Math.min(255, (v / Math.max(1, base[k])) * nuevo[k])));
    return { cuota: e.cuota, color: `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}` };
  });
}

/** Un papel de texto: familia, tamaño en px de 720, mínimo relativo, scaleX, espaciado y alto de las mayúsculas. */
export interface Papel {
  readonly familia: 'titulo' | 'cursiva' | 'pesada' | 'etiqueta';
  readonly peso: number;
  readonly tamano: number;
  readonly escalaX: number;
  readonly espaciado: number;
  readonly mayusculas?: number;
}

/** Los papeles de texto (medidos en el original). */
export const PAPELES = {
  cursivaTitulo: { familia: 'cursiva', peso: 400, tamano: 92, escalaX: 1, espaciado: 0 },
  titulo: { familia: 'titulo', peso: 400, tamano: 244, escalaX: 0.78, espaciado: 0, mayusculas: 0.859 },
  lineaRoja: { familia: 'titulo', peso: 400, tamano: 78, escalaX: 0.81, espaciado: 0, mayusculas: 0.859 },
  cursivaPregunta: { familia: 'cursiva', peso: 400, tamano: 103, escalaX: 1, espaciado: 0 },
  encabezado: { familia: 'titulo', peso: 400, tamano: 88.5, escalaX: 0.68, espaciado: 0.005, mayusculas: 0.859 },
  nota: { familia: 'pesada', peso: 900, tamano: 37, escalaX: 1.055, espaciado: 0.04, mayusculas: 0.7 },
  cursivaNota: { familia: 'cursiva', peso: 400, tamano: 160, escalaX: 1, espaciado: 0 },
} as const satisfies Record<string, Papel>;

/** Las posiciones en 9:16. */
export const DISENO = {
  cx: 540,
  /** Ancho máximo de títulos y líneas. */
  anchoTexto: 860,
  titulo: {
    u: 1.5,
    cursiva: { x: 540, y: 292 },
    /** Centro de las mayúsculas del título y de la línea roja. */
    titulo: { x: 540, y: 500 },
    linea: { x: 540, y: 730 },
    anchoTitulo: 820,
    circulo: { cx: 540, cy: 1030, r: 250 },
    /** La imagen sobre el círculo: centro, borde de arriba de su caja y ancho. */
    sujeto: { cx: 540, cabeza: 790, ancho: 600 },
  },
  orbita: { cx: 540, cy: 760, radio: 330, ladoIcono: 118, u: 1.6 },
  /** El encabezado: centro de las mayúsculas en la pregunta y con la figura (centro) o sobre las tarjetas (alto). */
  encabezado: { x: 540, centro: 560, alto: 330, ancho: 860, u: 1.75 },
  figura: { x: 540, pies: 1206, escala: 1.6 },
  tarjetas: {
    u: 1.4,
    /** Esquina de arriba a la izquierda de cada tarjeta. */
    una: { x: 540 - (494 * 1.4) / 2, y: 452 },
    dos: [
      { x: 540 - (494 * 1.4) / 2, y: 452 },
      { x: 540 - (494 * 1.4) / 2, y: 452 + 277 * 1.4 + 34 },
    ],
  },
  nota: { u: 1.8, ancho: 880, x: 540, centro: 740, corsivaSobre: 128 },
  cierre: { invitacion: 800, icono: 610, u: 1.5 },
} as const;

/** Medidas de la tarjeta en px del original (720 de ancho). */
export const TARJETA = {
  ancho: 494,
  alto: 277,
  titulo: { x: 32, centro: 36, tamano: 28 },
  linea: { y: 62, desde: 20, hasta: 477, grosor: 1.6 },
  icono: { centro: 142, lado: 114 },
  etiqueta: { centro: 222, tamano: 28 },
  paso: 150,
} as const;
