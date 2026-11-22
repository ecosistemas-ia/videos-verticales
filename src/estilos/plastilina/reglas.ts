// Estilo «Personajes de plastilina»: personajes de formas redondas, lisas y brillantes, como de plastilina o vinilo,
// sin brazos ni piernas. Cada personaje se arma con una forma ligada al tema (un diente, una moneda, una bombilla), un
// color y un accesorio. En cada escena habla un personaje (su boca se mueve con la voz) o el narrador, y los demás le
// miran. Sirve para casi cualquier tema: el tema está en las formas que eliges.

import { z } from 'zod';
import { segundosDeLectura, type EscenaLista } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';
import { POSICIONES } from '../_marionetas/curvas.ts';
import { COLORES, FORMAS } from './formas.ts';

export const EMOCIONES = ['feliz', 'neutral', 'triste', 'cansado', 'enojado', 'asustado', 'sorprendido', 'orgulloso'] as const;
export type Emocion = (typeof EMOCIONES)[number];

export const ACCIONES = ['quieto', 'entra', 'sale', 'salta', 'celebra', 'tiembla', 'asiente', 'niega', 'gira', 'duerme', 'corre'] as const;
export type Accion = (typeof ACCIONES)[number];

export const ACCESORIOS = ['ninguno', 'gafas', 'gafas_sol', 'boina', 'gorro_fiesta', 'corona', 'lazo', 'auriculares', 'casco', 'espejo', 'sombrero', 'gorro_chef', 'bigote'] as const;
export type Accesorio = (typeof ACCESORIOS)[number];

export const FONDOS = ['estudio', 'noche', 'crema', 'menta', 'cielo', 'lavanda', 'melocoton'] as const;

/** Lugares dibujados detrás de los personajes, para que el fondo acompañe lo que se dice. */
export const ESCENARIOS = ['consultorio', 'boca', 'oficina', 'tienda', 'cocina', 'salon', 'calle', 'parque', 'gimnasio', 'aula', 'finanzas'] as const;
export type Escenario = (typeof ESCENARIOS)[number];
export type Fondo = (typeof FONDOS)[number];

const posicion = z.union([z.enum(POSICIONES), z.number().min(0).max(1)]);
const nombreColor = z.enum(Object.keys(COLORES) as [keyof typeof COLORES, ...(keyof typeof COLORES)[]]);

export const personajePlastilina = z.strictObject({
  /** Quién es, para seguirlo entre escenas y para «habla»: minúsculas, números y guion bajo («diente», «cliente_2»). */
  id: z.string().regex(/^[a-z0-9_]{1,20}$/, 'id en minúsculas, sin tildes ni espacios (por ejemplo «diente»)'),
  forma: z.enum(FORMAS),
  /** Si falta, el color propio de la forma. */
  color: nombreColor.optional(),
  accesorio: z.enum(ACCESORIOS).default('ninguno'),
  /** Ojos de punto (como un muñeco) o saltones (blancos con pupila). */
  ojos: z.enum(['puntos', 'saltones']).default('puntos'),
  x: posicion.default('centro'),
  emocion: z.enum(EMOCIONES).default('feliz'),
  accion: z.enum(ACCIONES).default('quieto'),
  /** Adónde llega con «corre». */
  hasta: posicion.optional(),
  /** Hacia dónde mira. Si falta: hacia quien habla o al frente. */
  mira: z.enum(['izquierda', 'derecha', 'frente']).optional(),
  escala: z.number().min(0.5).max(1.6).default(1),
  /** Globo de diálogo corto en pantalla (opcional; la voz lee «texto», no el globo). */
  globo: z.string().max(42).optional(),
  /** Segundos que espera antes de empezar su acción. */
  retraso: z.number().min(0).max(8).default(0),
});
export type PersonajePlastilina = z.infer<typeof personajePlastilina>;

export const escenaPlastilina = z
  .strictObject({
    /** Lo que se oye: la voz del narrador o del personaje que habla. */
    texto: z.string().min(1),
    /** Quién dice el texto: «narrador» o el id de un personaje de la escena (mueve la boca). */
    habla: z.string().default('narrador'),
    personajes: z.array(personajePlastilina).min(1).max(3),
    /** Rótulo grande arriba («3 SEÑALES»). */
    rotulo: z.string().max(40).optional(),
    /** Una cifra o dato corto en una pegatina («7-9 h», «x4»). */
    dato: z.string().max(14).optional(),
    /** La fuente del dato, en letra pequeña («NHS, 2024»). */
    fuente: z.string().max(70).optional(),
    /** El lugar de esta escena, según lo que se dice: el consultorio cuando se habla de la visita, la boca cuando se
     *  habla de los dientes, la tienda cuando se habla de comprar. Si falta, el de los ajustes. */
    escenario: z.enum(ESCENARIOS).optional(),
    /** Fondo liso de estudio para esta escena (solo si no hay escenario). */
    fondo: z.enum(FONDOS).optional(),
  })
  .superRefine((e, ctx) => {
    const ids = e.personajes.map((p) => p.id);
    if (e.habla !== 'narrador' && !ids.includes(e.habla)) {
      ctx.addIssue({ code: 'custom', path: ['habla'], message: `«${e.habla}» habla pero no está en «personajes». Usa el id de uno de ellos o «narrador».` });
    }
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['personajes'], message: 'Dos personajes de la escena tienen el mismo id.' });
    e.personajes.forEach((p, i) => {
      if (p.accion === 'corre' && p.hasta === undefined) ctx.addIssue({ code: 'custom', path: ['personajes', i, 'hasta'], message: '«corre» necesita «hasta».' });
    });
  });
export type EscenaPlastilina = z.infer<typeof escenaPlastilina>;

export const ajustesPlastilina = z.strictObject({
  /** Escenario por defecto de las escenas que no dicen uno. Sin él, se usa «fondo». */
  escenario: z.enum(ESCENARIOS).optional(),
  /** Fondo liso por defecto cuando no hay escenario: «estudio» es oscuro, los demás claros. */
  fondo: z.enum(FONDOS).default('estudio'),
  /** Color del texto de rótulos, pegatinas y globos, #RRGGBB. */
  tinta: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#1E1B2E'),
  /** Mostrar la fuente de cada escena en pantalla cuando la escena la trae. */
  mostrar_fuente: z.boolean().default(true),
});
export type AjustesPlastilina = z.infer<typeof ajustesPlastilina>;

const DESFASE = 0.2;

export const reglas: ReglasEstilo<typeof escenaPlastilina, typeof ajustesPlastilina> = {
  id: 'plastilina',
  familia: 'historias',
  nombre: 'Personajes de plastilina',
  descripcion: 'Personajes redondos y brillantes, sin brazos ni piernas, con la forma del tema (un diente, una moneda, una bombilla), que hablan por turnos.',
  ideal_para: 'Casi cualquier tema explicado con simpatía: salud, dinero, consejos de un negocio, preguntas frecuentes. Clínicas, tiendas, servicios. Cada escena puede tener su lugar (consultorio, boca, oficina, tienda, cocina, salón, calle, parque, gimnasio, aula, finanzas).',
  esquemaEscena: escenaPlastilina,
  esquemaAjustes: ajustesPlastilina,
  textoVoz: (e) => e.texto,
  desfaseVoz: () => DESFASE,
  duracion(e, voz) {
    if (voz === null) return Math.max(3.2, segundosDeLectura(e.texto, 3.2) + 0.4);
    return Math.max(3.2, DESFASE + voz.duracion + 0.55);
  },
  cola: 0.8,
  admiteSubtitulos: true,
  // Solo sonidos cortos y suaves: nada de whoosh ni subidas largas, que suenan a avión debajo de la voz.
  efectos: ['pop', 'brillo', 'burbuja'],
  golpes(escenas: readonly EscenaLista<EscenaPlastilina>[]) {
    const golpes: { efecto: string; segundo: number; volumen?: number }[] = [];
    escenas.forEach((e, i) => {
      const antes = new Set((escenas[i - 1]?.datos.personajes ?? []).map((p) => p.id));
      e.datos.personajes.forEach((p) => {
        const base = e.inicio + p.retraso;
        if (!antes.has(p.id) || p.accion === 'entra') golpes.push({ efecto: 'pop', segundo: base + (p.accion === 'entra' ? 0.42 : 0.05), volumen: 0.28 });
        if (p.accion === 'celebra') golpes.push({ efecto: 'brillo', segundo: base + 0.3, volumen: 0.25 });
        if (p.accion === 'salta') golpes.push({ efecto: 'burbuja', segundo: base + 0.15, volumen: 0.18 });
      });
      if (e.datos.dato !== undefined && e.datos.dato !== escenas[i - 1]?.datos.dato) golpes.push({ efecto: 'pop', segundo: e.inicio + 0.4, volumen: 0.22 });
    });
    return golpes;
  },
  textoSobreAcento: (a) => a.tinta,
  musica_sugerida: ['lofi', 'comica'],
};
