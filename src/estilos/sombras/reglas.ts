// Estilo «Teatro de sombras»: siluetas negras articuladas detrás de una pantalla de papel iluminada por una lámpara,
// dentro de un teatrito con telón. Cada escena dice qué figuras salen (de un catálogo cerrado), qué hace cada una (de
// una lista cerrada de acciones), dónde están y qué decorado hay. La voz narra; los subtítulos van en el proscenio.

import { z } from 'zod';
import { segundosDeLectura, type EscenaLista } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';
import { POSICIONES } from '../_marionetas/curvas.ts';

/** Personas: todas comparten el mismo esqueleto con pivotes; cambian proporciones, ropa y tocado. */
export const HUMANOS = ['hombre', 'mujer', 'guerrero', 'caballero', 'rey', 'princesa', 'anciano', 'anciana', 'nino', 'nina', 'bruja'] as const;
/** Animales de cuatro patas: mismo esqueleto, otras proporciones. */
export const CUADRUPEDOS = ['caballo', 'lobo', 'venado', 'jaguar'] as const;
export const OTROS_ANIMALES = ['ave', 'serpiente', 'serpiente_emplumada', 'dragon'] as const;
export const FIGURAS = [...HUMANOS, ...CUADRUPEDOS, ...OTROS_ANIMALES] as const;
export type NombreFigura = (typeof FIGURAS)[number];

export const ACCIONES = [
  'quieto',
  'habla',
  'camina',
  'corre',
  'senala',
  'levanta_brazos',
  'se_inclina',
  'arrodilla',
  'llora',
  'lucha',
  'cae',
  'yace',
  'encabrita',
  'aulla',
  'vuela',
  'repta',
  'ataca',
  'aparece',
  'desaparece',
] as const;
export type Accion = (typeof ACCIONES)[number];

const COMUNES: readonly Accion[] = ['quieto', 'aparece', 'desaparece'];
const DE_HUMANO: readonly Accion[] = [...COMUNES, 'habla', 'camina', 'corre', 'senala', 'levanta_brazos', 'se_inclina', 'arrodilla', 'llora', 'lucha', 'cae', 'yace'];

/** Qué acciones admite cada figura. El esquema rechaza las demás con un mensaje claro. */
export const ACCIONES_DE: Readonly<Record<NombreFigura, readonly Accion[]>> = {
  ...(Object.fromEntries(HUMANOS.map((h) => [h, DE_HUMANO])) as Record<(typeof HUMANOS)[number], readonly Accion[]>),
  caballo: [...COMUNES, 'camina', 'corre', 'encabrita'],
  lobo: [...COMUNES, 'camina', 'corre', 'aulla'],
  venado: [...COMUNES, 'camina', 'corre'],
  jaguar: [...COMUNES, 'camina', 'corre'],
  ave: [...COMUNES, 'vuela'],
  serpiente: [...COMUNES, 'repta', 'ataca'],
  serpiente_emplumada: [...COMUNES, 'repta', 'ataca', 'vuela'],
  dragon: [...COMUNES, 'vuela', 'ataca'],
};

/** Acciones que llevan a la figura de x a «hasta». */
export const DESPLAZAN: readonly Accion[] = ['camina', 'corre', 'vuela', 'repta'];

/** Lo que una persona puede llevar en la mano de delante. */
export const OBJETOS = ['nada', 'antorcha', 'lanza', 'espada', 'baston', 'escoba', 'flor', 'farol'] as const;
export type Objeto = (typeof OBJETOS)[number];

export const DECORADOS = [
  'arbol',
  'pino',
  'palmera',
  'nopal',
  'montana',
  'volcan',
  'montana_dormida',
  'casa',
  'templo',
  'castillo',
  'luna',
  'sol',
  'nube',
  'estrellas',
  'hoguera',
  'rio',
  'pasto',
  'rocas',
] as const;
export type NombreDecorado = (typeof DECORADOS)[number];

/** La luz de la lámpara: cálida (por defecto), fuego (guerra, peligro), noche (luna, tristeza), alba, misterio. */
export const AMBIENTES = ['calido', 'fuego', 'noche', 'alba', 'misterio'] as const;
export type Ambiente = (typeof AMBIENTES)[number];

const posicion = z.union([z.enum(POSICIONES), z.number().min(0).max(1)]);

export const figuraSombras = z.strictObject({
  figura: z.enum(FIGURAS),
  x: posicion.default('centro'),
  accion: z.enum(ACCIONES).default('quieto'),
  /** Adónde llega con camina, corre, vuela o repta. */
  hasta: posicion.optional(),
  /** Hacia dónde mira. Si falta: hacia donde se mueve o hacia el centro. */
  mira: z.enum(['izquierda', 'derecha']).optional(),
  /** 0 = en el suelo, 1 = arriba del todo. Por defecto, en el suelo; las que vuelan, a media altura. */
  altura: z.number().min(0).max(1).optional(),
  escala: z.number().min(0.4).max(2).default(1),
  /** Lo que lleva en la mano (solo personas). Si falta, el de su figura (lanza el guerrero, bastón el anciano…). */
  objeto: z.enum(OBJETOS).optional(),
  /** Segundos que espera, dentro de la escena, antes de empezar su acción. */
  retraso: z.number().min(0).max(8).default(0),
});
export type FiguraSombras = z.infer<typeof figuraSombras>;

export const decoradoSombras = z.strictObject({
  elemento: z.enum(DECORADOS),
  x: posicion.default('centro'),
  /** fondo = lejos de la pantalla (borroso y claro); medio; frente = pegado a la pantalla (nítido). */
  capa: z.enum(['fondo', 'medio', 'frente']).default('medio'),
  escala: z.number().min(0.3).max(2.5).default(1),
  /** Solo para luna, sol, nube y estrellas: 0 = cerca del horizonte, 1 = arriba del todo. */
  altura: z.number().min(0).max(1).optional(),
});
export type DecoradoSombras = z.infer<typeof decoradoSombras>;

export const escenaSombras = z
  .strictObject({
    /** Lo que cuenta la voz (no sale en pantalla: lo muestran los subtítulos). */
    texto: z.string().min(1),
    /** Un cartel recortado arriba de la pantalla (título de la leyenda, «Fin»…). Corto. */
    titulo: z.string().max(60).optional(),
    /** La luz de la lámpara en esta escena; si falta, la de los ajustes. */
    ambiente: z.enum(AMBIENTES).optional(),
    /** Cómo se pasa a esta escena desde la anterior. */
    transicion: z.enum(['fundido', 'telon', 'luz', 'corte']).default('fundido'),
    decorado: z.array(decoradoSombras).max(8).default([]),
    figuras: z.array(figuraSombras).max(5).default([]),
  })
  .superRefine((e, ctx) => {
    e.figuras.forEach((f, i) => {
      if (!ACCIONES_DE[f.figura].includes(f.accion)) {
        ctx.addIssue({
          code: 'custom',
          path: ['figuras', i, 'accion'],
          message: `«${f.figura}» no puede «${f.accion}». Acciones válidas: ${ACCIONES_DE[f.figura].join(', ')}`,
        });
      }
      if (DESPLAZAN.includes(f.accion) && f.hasta === undefined) {
        ctx.addIssue({ code: 'custom', path: ['figuras', i, 'hasta'], message: `«${f.accion}» necesita «hasta» (adónde llega).` });
      }
      if (f.objeto !== undefined && f.objeto !== 'nada' && !(HUMANOS as readonly string[]).includes(f.figura)) {
        ctx.addIssue({ code: 'custom', path: ['figuras', i, 'objeto'], message: 'Solo las personas llevan objetos.' });
      }
    });
    e.decorado.forEach((d, i) => {
      if (d.altura !== undefined && !['luna', 'sol', 'nube', 'estrellas'].includes(d.elemento)) {
        ctx.addIssue({ code: 'custom', path: ['decorado', i, 'altura'], message: '«altura» solo vale para luna, sol, nube y estrellas.' });
      }
    });
  });
export type EscenaSombras = z.infer<typeof escenaSombras>;

export const ajustesSombras = z.strictObject({
  /** La luz de la lámpara por defecto. */
  ambiente: z.enum(AMBIENTES).default('calido'),
  /** Las varillas finas con las que se mueven las marionetas. */
  varillas: z.boolean().default(true),
  /** Los calados (agujeros decorativos) de las siluetas. */
  calados: z.boolean().default(true),
  /** Color del telón y de la cenefa. */
  telon: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#7A1622'),
  /** Abrir el telón al empezar y cerrarlo al terminar. */
  abrir_y_cerrar: z.boolean().default(true),
});
export type AjustesSombras = z.infer<typeof ajustesSombras>;

/** Tiempos de las transiciones, en segundos (los usan el dibujo y los efectos de sonido). */
export const TRANSICION = { cierra: 0.5, abre: 0.6, fundido: 0.7, apertura: 1.1, cierre: 1.0 } as const;
/** «cae»: espera, dura la caída. */
export const CAIDA = { espera: 0.45, dura: 0.65 } as const;
/** «lucha»: un golpe cada tanto, el primero a este segundo tras el retraso. */
export const LUCHA = { periodo: 0.95, primero: 0.45 } as const;

const DESFASE = 0.25;

export const reglas: ReglasEstilo<typeof escenaSombras, typeof ajustesSombras> = {
  id: 'sombras',
  familia: 'historias',
  nombre: 'Teatro de sombras',
  descripcion: 'Siluetas articuladas tras una pantalla de papel iluminada por una lámpara, con decorados recortados y telón.',
  ideal_para: 'Mitos, leyendas, fábulas, historia antigua y cuentos narrados; también «el origen de…».',
  esquemaEscena: escenaSombras,
  esquemaAjustes: ajustesSombras,
  textoVoz: (e) => e.texto,
  desfaseVoz: () => DESFASE,
  duracion(e, voz) {
    const titulo = e.titulo !== undefined ? 0.5 : 0;
    if (voz === null) return Math.max(3.4, segundosDeLectura(e.texto, 3.4) + 0.4 + titulo);
    return Math.max(3.4, DESFASE + voz.duracion + 0.65 + titulo);
  },
  cola: 1.4,
  admiteSubtitulos: true,
  subtitulosArriba: 1300,
  efectos: ['whoosh', 'transicion', 'impacto', 'brillo'],
  golpes(escenas: readonly EscenaLista<EscenaSombras>[], ajustes) {
    const golpes: { efecto: string; segundo: number; volumen?: number }[] = [];
    if (ajustes.abrir_y_cerrar) golpes.push({ efecto: 'whoosh', segundo: 0.05, volumen: 0.35 });
    escenas.forEach((e, i) => {
      if (i > 0 && e.datos.transicion === 'telon') golpes.push({ efecto: 'whoosh', segundo: e.inicio - TRANSICION.cierra, volumen: 0.3 });
      if (i > 0 && e.datos.transicion === 'luz') golpes.push({ efecto: 'transicion', segundo: e.inicio - 0.35, volumen: 0.3 });
      for (const f of e.datos.figuras) {
        const base = e.inicio + f.retraso;
        if (f.accion === 'aparece') golpes.push({ efecto: 'brillo', segundo: base + 0.1, volumen: 0.25 });
        if (f.accion === 'cae') golpes.push({ efecto: 'impacto', segundo: base + CAIDA.espera + CAIDA.dura, volumen: 0.45 });
        if (f.accion === 'lucha') {
          for (let s = LUCHA.primero; s < e.duracion - f.retraso - 0.3; s += LUCHA.periodo * 2) {
            golpes.push({ efecto: 'impacto', segundo: base + s + 0.18, volumen: 0.22 });
          }
        }
      }
    });
    const ultima = escenas[escenas.length - 1];
    if (ajustes.abrir_y_cerrar && ultima !== undefined) golpes.push({ efecto: 'whoosh', segundo: ultima.inicio + ultima.duracion + 0.1, volumen: 0.3 });
    return golpes;
  },
  musica_sugerida: ['emotiva', 'epica', 'tension'],
};
