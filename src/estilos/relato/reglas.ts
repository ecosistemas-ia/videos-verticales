// Relato de un negocio: la historia de un negocio contada como un collage de papel. La hoja se tiñe con el color claro
// del negocio, su producto (una bolsa de papel kraft con su medallón, una taza, un pan) entra girando, una cinta de su
// color cruza el cuadro, las palabras grandes van en cursiva con serifa y las pequeñas en una grotesca fina inclinada.
// Tarjetas con escenas de papel recortado, un dato con su fuente y una pregunta final. Portado de la variante
// «racconto» del template collage-carta de MOTION.
//
// Para el guionista: cada escena es un trozo de voz con su plano. Lo que se lee en pantalla es lo que dice la voz (o un
// resumen, si se usa `voz`). Una línea es un texto suelto (pequeño, gris) o {texto, estilo}: pequena · media · grande
// (cursiva con serifa, la palabra que importa). Si el negocio es inventado, el guion lo dice.

import { z } from 'zod';
import type { EscenaLista, Golpe } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';
import { ESCENAS, PRODUCTOS, SIMBOLOS } from '../_papel/catalogo.ts';
import { esquemaImagen, esquemaLinea, unir, vozEstimada } from '../_papel/lineas.ts';
import { PASOS_RELATO } from '../_papel/pasos.ts';
import type { PasoRelato } from '../_papel/pasos.ts';

export const ESTILOS_LINEA = ['pequena', 'media', 'grande'] as const;
export type EstiloLinea = (typeof ESTILOS_LINEA)[number];

const linea = esquemaLinea(ESTILOS_LINEA, 'pequena', { pequena: 36, media: 18, grande: 16 });
const lineas = z.array(linea).min(1).max(4);
const producto = z.enum(PRODUCTOS);
const paso = z.enum(PASOS_RELATO).optional().describe('Cómo entra la escena (por defecto: sube desde abajo)');
const voz = z.string().trim().min(1).optional().describe('Lo que dice la voz, si no es exactamente lo que se lee en pantalla');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'un color #RRGGBB');

export const esquemaEscena = z.discriminatedUnion('plano', [
  /** La apertura: el producto entra girando, la cinta cruza el cuadro y la cámara se endereza. Siempre la primera. */
  z.object({ plano: z.literal('apertura'), arriba: z.array(linea).min(1).max(2), abajo: z.array(linea).max(2).default([]), producto: producto.optional(), voz, paso }),
  /** El producto (y hasta dos acompañantes) dentro de un círculo punteado, con líneas arriba y abajo. */
  z.object({
    plano: z.literal('producto'),
    arriba: z.array(linea).max(2).default([]),
    abajo: z.array(linea).max(2).default([]),
    productos: z.array(producto).min(1).max(3).optional(),
    voz,
    paso,
  }),
  /** Una tarjeta con su título encima y una escena de papel (o una imagen). Varias seguidas: la tarjeta se queda y cambia con un destello. */
  z.object({ plano: z.literal('tarjeta'), titulo: z.string().trim().min(1).max(34), dibujo: z.enum([...ESCENAS, ...PRODUCTOS]).optional(), imagen: esquemaImagen.optional(), voz, paso }),
  /** El producto gigante cortado a la izquierda y las líneas en escalera a la derecha. */
  z.object({ plano: z.literal('primer_plano'), lineas, producto: producto.optional(), voz, paso }),
  /** Un dato verdadero en una tarjeta: el número cuenta hasta su valor. La fuente se ve en pequeño y va también en guion.fuentes. */
  z.object({
    plano: z.literal('dato'),
    titulo: z.string().trim().min(1).max(34).optional(),
    numero: z.string().trim().regex(/\d/, 'el número lleva cifras: «21,4%», «3 de 10», «+40»').max(10),
    etiqueta: z.string().trim().min(1).max(40),
    fuente: z.string().trim().min(3).max(60),
    voz,
    paso,
  }),
  /** Solo texto sobre el símbolo del negocio, desvaído: la pregunta o la frase que remata. */
  z.object({ plano: z.literal('frase'), lineas, voz, paso }),
  /** El cierre: una línea, el nombre de la marca y la web. Siempre la última. */
  z.object({ plano: z.literal('cierre'), lineas: z.array(linea).max(2).default([]), web: z.string().trim().max(40).optional(), voz }),
]);
export type EscenaRelato = z.infer<typeof esquemaEscena>;

export const esquemaAjustes = z.object({
  negocio: z
    .object({
      /** El nombre que se lee en la bolsa, en el cartel y en el medallón. */
      nombre: z.string().trim().max(22).default(''),
      /** El color del negocio (la cinta, el medallón). Si falta, el acento de la marca. */
      color: color.optional(),
      /** El tono claro de la hoja. Si falta, se mezcla el color del negocio con un gris muy claro. */
      claro: color.optional(),
      simbolo: z.enum(SIMBOLOS).default('espiga'),
      /** Verdadero si el negocio no existe: la apertura lo dice en pequeño («Negocio inventado»). */
      inventado: z.boolean().default(true),
    })
    .default({ nombre: '', simbolo: 'espiga', inventado: true }),
  /** El producto de la apertura y del primer plano, si la escena no dice otro. */
  producto: producto.default('bolsa'),
  /** Las flores negras desenfocadas que giran en las esquinas. */
  flores: z.boolean().default(true),
  /** El nombre de la marca arriba a la izquierda. */
  logo: z.boolean().default(true),
});
export type AjustesRelato = z.infer<typeof esquemaAjustes>;

/** Lo que se lee en pantalla, en orden. */
export function textoPantalla(e: EscenaRelato): string[] {
  switch (e.plano) {
    case 'apertura':
    case 'producto':
      return [...e.arriba, ...e.abajo].map((l) => l.texto);
    case 'tarjeta':
      return [e.titulo];
    case 'dato':
      return [e.titulo ?? '', e.etiqueta, e.numero].filter((t) => t !== '');
    default:
      return e.lineas.map((l) => l.texto);
  }
}

export function textoVozRelato(e: EscenaRelato): string {
  return e.voz ?? unir(textoPantalla(e));
}

/** El paso de entrada de una escena cuando el guion no dice otro. */
export function pasoPorDefecto(e: EscenaRelato): PasoRelato {
  if (e.plano === 'cierre') return 'desenfoque';
  if (e.paso !== undefined) return e.paso;
  return e.plano === 'primer_plano' ? 'acercar' : 'subir';
}

/** En qué segundo de la escena empieza la voz: cuando la escena ya llegó. */
export function desfaseRelato(e: EscenaRelato): number {
  if (e.plano === 'apertura') return 0.3;
  if (e.plano === 'cierre') return 0.45;
  return { subir: 0.4, desenfoque: 0.3, acercar: 0.28, corte: 0.15 }[pasoPorDefecto(e)];
}

/** La pausa tras la voz: la escena sale en el último medio segundo. */
const PAUSA = 0.5;

function minimo(e: EscenaRelato): number {
  switch (e.plano) {
    case 'apertura':
      return 3;
    case 'dato':
      return 3.2;
    case 'cierre':
      return 3.4;
    default:
      return 1.8;
  }
}

export const reglas: ReglasEstilo<typeof esquemaEscena, typeof esquemaAjustes> = {
  id: 'relato',
  familia: 'historias',
  nombre: 'Relato de un negocio',
  descripcion: 'La historia de un negocio contada en collage de papel: su producto, una cinta de su color, tarjetas, un dato con fuente y una pregunta',
  ideal_para: 'casos de negocio (reales con permiso o inventados y dichos), cómo un comercio construyó una costumbre, antes y después de una idea',
  esquemaEscena,
  esquemaAjustes,
  textoVoz: textoVozRelato,
  desfaseVoz: desfaseRelato,
  duracion(e, v) {
    const habla = v !== null ? v.duracion : vozEstimada(textoVozRelato(e));
    return Math.max(minimo(e), desfaseRelato(e) + habla + (e.plano === 'cierre' ? 2.2 : PAUSA));
  },
  cola: 0.3,
  admiteSubtitulos: false,
  firma: 'ninguna', // la marca ya va arriba, en el propio estilo
  efectos: ['whoosh', 'pop', 'brillo', 'tic', 'subida'],
  golpes(escenas: readonly EscenaLista<EscenaRelato>[]): Golpe[] {
    const g: Golpe[] = [];
    escenas.forEach((e, i) => {
      const d = e.datos;
      const anterior = i > 0 ? escenas[i - 1].datos : null;
      if (d.plano === 'apertura') g.push({ efecto: 'whoosh', segundo: e.inicio + 0.1, volumen: 0.35 });
      else if (d.plano === 'tarjeta' && anterior?.plano === 'tarjeta') g.push({ efecto: 'brillo', segundo: e.inicio - 0.1, volumen: 0.22 });
      else if (i > 0 && pasoPorDefecto(d) === 'subir') g.push({ efecto: 'whoosh', segundo: e.inicio - 0.3, volumen: 0.2 });
      if (d.plano === 'producto') g.push({ efecto: 'tic', segundo: e.inicio + 0.45, volumen: 0.25 });
      if (d.plano === 'dato') g.push({ efecto: 'subida', segundo: e.inicio + 0.3, volumen: 0.25, duracion: 1.4 });
      if (d.plano === 'cierre') g.push({ efecto: 'pop', segundo: e.inicio + 0.6, volumen: 0.3 });
    });
    return g;
  },
  musica_sugerida: ['emotiva', 'lofi'],
};
