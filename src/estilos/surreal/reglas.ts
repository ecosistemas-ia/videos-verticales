// Surreal en blanco y negro: un mensaje de posicionamiento sobre una hoja cálida con viñeta, con objetos y siluetas en
// blanco y negro (balanza, piezas de ajedrez, una lupa, un hombre que cae), formas cromadas que giran en las esquinas y
// una chincheta en el color de la marca. Las líneas que dice la voz entran desenfocadas y se enfocan. Portado de la
// variante «surreale» del template collage-carta de MOTION.
//
// Para el guionista: cada escena es un trozo de voz con su plano. Las líneas en pantalla son lo que dice la voz (o un
// resumen, si se usa `voz`). Una línea es un texto suelto (pequeño) o {texto, estilo}: pequena · media · grande ·
// clave (la palabra clave en gris, una por bloque).

import { z } from 'zod';
import type { EscenaLista, Golpe } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';
import { OBJETOS } from '../_papel/catalogo.ts';
import { esquemaImagen, esquemaLinea, unir, vozEstimada } from '../_papel/lineas.ts';
import { PASOS_SURREAL, retrasoSurreal } from '../_papel/pasos.ts';

export const ESTILOS_LINEA = ['pequena', 'media', 'grande', 'clave'] as const;
export type EstiloLinea = (typeof ESTILOS_LINEA)[number];

const linea = esquemaLinea(ESTILOS_LINEA, 'pequena', { pequena: 36, media: 22, grande: 14, clave: 13 });
const lineas = z.array(linea).min(1).max(4);
const objeto = z.enum(OBJETOS);
const paso = z.enum(PASOS_SURREAL).optional().describe('Cómo entra la escena (por defecto, desenfoque)');
const voz = z.string().trim().min(1).optional().describe('Lo que dice la voz, si no es exactamente lo que se lee en pantalla');

export const esquemaEscena = z.discriminatedUnion('plano', [
  /** Un objeto en el centro con un bloque arriba y otro abajo. */
  z.object({
    plano: z.literal('objeto'),
    arriba: z.array(linea).max(3).default([]),
    objeto,
    /** Un segundo objeto al lado (dos siluetas que caminan, dos piezas). */
    segundo: objeto.optional(),
    abajo: z.array(linea).max(2).default([]),
    /** aleja: empieza cerca y se aleja · detalle: entra desde un primer plano · cae: el objeto cae desde arriba · quieta. */
    camara: z.enum(['aleja', 'detalle', 'cae', 'quieta']).default('aleja'),
    imagen: esquemaImagen.optional(),
    voz,
    paso,
  }),
  /** Una lista de 2 a 4 puntos que entran uno a uno, con un objeto debajo. */
  z.object({
    plano: z.literal('lista'),
    items: z.array(z.string().trim().min(1).max(26)).min(2).max(4),
    objeto: objeto.optional(),
    imagen: esquemaImagen.optional(),
    voz,
    paso,
  }),
  /** Un tablero de ajedrez en perspectiva con la reina y un peón: competir, estrategia, jugar en otra liga. */
  z.object({ plano: z.literal('tablero'), lineas, voz, paso }),
  /** La chincheta en el color de la marca sobre un título, con un objeto debajo. Varias seguidas: los pasos de un método. */
  z.object({ plano: z.literal('chincheta'), lineas, objeto: objeto.optional(), imagen: esquemaImagen.optional(), voz, paso }),
  /** Personas vistas desde arriba alrededor de una mesa: equipo, reunión, empezar por el cliente. */
  z.object({ plano: z.literal('mesa'), lineas, personas: z.number().int().min(4).max(10).default(8), voz, paso }),
  /** Solo texto sobre la cuadrícula punteada: la frase que remata. */
  z.object({ plano: z.literal('frase'), lineas, voz, paso }),
  /** El cierre oscuro: luz cálida, remolino y el nombre de la marca que se compone. Siempre la última. */
  z.object({ plano: z.literal('cierre'), lineas: z.array(linea).max(2).default([]), web: z.string().trim().max(40).optional(), voz }),
]);
export type EscenaSurreal = z.infer<typeof esquemaEscena>;

export const esquemaAjustes = z.object({
  /** Cada línea empieza con mayúscula, como en el original. */
  mayusculas: z.boolean().default(true),
  /** Las formas cromadas que giran en las esquinas. */
  cromados: z.boolean().default(true),
  /** El nombre de la marca arriba, en el centro. */
  logo: z.boolean().default(true),
});
export type AjustesSurreal = z.infer<typeof esquemaAjustes>;

/** Lo que se lee en pantalla, en orden. */
export function textoPantalla(e: EscenaSurreal): string[] {
  switch (e.plano) {
    case 'objeto':
      return [...e.arriba, ...e.abajo].map((l) => l.texto);
    case 'lista':
      return e.items;
    default:
      return e.lineas.map((l) => l.texto);
  }
}

export function textoVozSurreal(e: EscenaSurreal): string {
  return e.voz ?? unir(textoPantalla(e));
}

export const DESFASE = 0.22;

/** En qué segundo de la escena empieza la voz: tras el paso de entrada (que se lleva unos fotogramas del principio). */
export function desfaseSurreal(e: EscenaSurreal): number {
  if (e.plano === 'cierre') return 0.45;
  return DESFASE + retrasoSurreal(e.paso ?? 'desenfoque') / 30;
}
/** La pausa tras la voz de cada escena: deja sitio al paso hacia la siguiente. */
const PAUSA = 0.38;
/** Lo que dura el cierre después de su voz: el nombre se compone y se queda. */
const CIERRE = 2.6;

function minimo(e: EscenaSurreal): number {
  switch (e.plano) {
    case 'tablero':
    case 'mesa':
      return 2.6;
    case 'cierre':
      return 3.2;
    case 'objeto':
      return e.camara === 'aleja' ? 2.2 : 1.8;
    default:
      return 1.6;
  }
}

export const reglas: ReglasEstilo<typeof esquemaEscena, typeof esquemaAjustes> = {
  id: 'surreal',
  familia: 'marca',
  nombre: 'Surreal en blanco y negro',
  descripcion: 'Spot de posicionamiento: objetos y siluetas en blanco y negro sobre una hoja cálida, frases que se enfocan, cromados y una chincheta de color',
  ideal_para: 'mensajes de posicionamiento, manifiestos, cómo trabajas y por qué eres distinto; frases cortas con una palabra clave',
  esquemaEscena,
  esquemaAjustes,
  textoVoz: textoVozSurreal,
  desfaseVoz: desfaseSurreal,
  duracion(e, v) {
    const habla = v !== null ? v.duracion : vozEstimada(textoVozSurreal(e));
    return Math.max(minimo(e), desfaseSurreal(e) + habla + (e.plano === 'cierre' ? CIERRE : PAUSA));
  },
  cola: 0.4,
  admiteSubtitulos: false,
  firma: 'ninguna', // la marca ya va arriba, en el propio estilo
  efectos: ['whoosh', 'brillo', 'pop', 'tic', 'glitch', 'impacto'],
  golpes(escenas: readonly EscenaLista<EscenaSurreal>[]): Golpe[] {
    const g: Golpe[] = [];
    escenas.forEach((e, i) => {
      const d = e.datos;
      if (d.plano === 'cierre') {
        g.push({ efecto: 'glitch', segundo: e.inicio + 0.55, volumen: 0.28, duracion: 1 });
        return;
      }
      if (i > 0) {
        const p = d.paso ?? 'desenfoque';
        const s = e.inicio + retrasoSurreal(p) / 30;
        if (p === 'remolino') g.push({ efecto: 'whoosh', segundo: s - 0.35, volumen: 0.45 });
        if (p === 'destello') g.push({ efecto: 'brillo', segundo: s - 0.45, volumen: 0.35 });
        if (p === 'caida') g.push({ efecto: 'whoosh', segundo: s - 0.25, volumen: 0.3 });
      }
      const anterior = i > 0 ? escenas[i - 1].datos : null;
      if (d.plano === 'chincheta' && anterior?.plano !== 'chincheta') g.push({ efecto: 'pop', segundo: e.inicio + 0.12, volumen: 0.4 });
      if (d.plano === 'objeto' && d.camara === 'cae') g.push({ efecto: 'impacto', segundo: e.inicio + 0.75, volumen: 0.25 });
    });
    return g;
  },
  musica_sugerida: ['tension', 'emotiva', 'lofi'],
};
