// Estilo «Órganos con cara»: divulgación de salud con humor. Los órganos son personajes de diseño propio (contorno
// grueso ciruela, sombra plana, ojos brillantes, brazos de goma y piernitas), sobre un fondo plano con detalles del
// interior del cuerpo. En cada escena habla un personaje (su boca se mueve con la voz) o el narrador.

import { z } from 'zod';
import { segundosDeLectura, type EscenaLista } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';
import { POSICIONES } from '../_marionetas/curvas.ts';

export const PERSONAJES = ['corazon', 'cerebro', 'estomago', 'pulmones', 'higado', 'rinon', 'intestino', 'piel', 'hueso', 'globulo_rojo', 'globulo_blanco'] as const;
export type NombrePersonaje = (typeof PERSONAJES)[number];

export const EMOCIONES = ['feliz', 'neutral', 'triste', 'cansado', 'enojado', 'asustado', 'sorprendido', 'mareado', 'orgulloso'] as const;
export type Emocion = (typeof EMOCIONES)[number];

export const ACCIONES_ORGANO = ['quieto', 'saluda', 'senala', 'salta', 'celebra', 'tiembla', 'bosteza', 'duerme', 'corre', 'entra', 'sale', 'se_desmaya', 'suda', 'trabaja'] as const;
export type AccionOrgano = (typeof ACCIONES_ORGANO)[number];

export const FONDOS = ['cuerpo', 'cerebro', 'sangre', 'estomago', 'pulmones', 'noche'] as const;
export type Fondo = (typeof FONDOS)[number];

const posicion = z.union([z.enum(POSICIONES), z.number().min(0).max(1)]);

export const personajeOrgano = z.strictObject({
  personaje: z.enum(PERSONAJES),
  x: posicion.default('centro'),
  emocion: z.enum(EMOCIONES).default('feliz'),
  accion: z.enum(ACCIONES_ORGANO).default('quieto'),
  /** Adónde llega con «corre». */
  hasta: posicion.optional(),
  /** Hacia dónde mira (pupilas y brazo que señala). Si falta: hacia quien habla o al frente. */
  mira: z.enum(['izquierda', 'derecha', 'frente']).optional(),
  escala: z.number().min(0.5).max(1.6).default(1),
  /** Globo de diálogo corto en pantalla (opcional; la voz lee «texto», no el globo). */
  globo: z.string().max(42).optional(),
  /** Segundos que espera antes de empezar su acción. */
  retraso: z.number().min(0).max(8).default(0),
});
export type PersonajeOrgano = z.infer<typeof personajeOrgano>;

export const escenaOrganos = z
  .strictObject({
    /** Lo que se oye: la voz del narrador o del personaje que habla. */
    texto: z.string().min(1),
    /** Quién dice el texto: «narrador» o el nombre de un personaje de la escena (mueve la boca). */
    habla: z.union([z.literal('narrador'), z.enum(PERSONAJES)]).default('narrador'),
    personajes: z.array(personajeOrgano).min(1).max(3),
    /** Rótulo grande arriba («24 HORAS SIN DORMIR»). */
    rotulo: z.string().max(40).optional(),
    /** Una cifra o dato corto en una pegatina («7-9 h», «x4»). */
    dato: z.string().max(14).optional(),
    /** La fuente del dato, en letra pequeña («NHLBI, NIH 2022»). */
    fuente: z.string().max(70).optional(),
    /** El fondo de esta escena; si falta, el de los ajustes. */
    fondo: z.enum(FONDOS).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.habla !== 'narrador' && !e.personajes.some((p) => p.personaje === e.habla)) {
      ctx.addIssue({ code: 'custom', path: ['habla'], message: `«${e.habla}» habla pero no está en «personajes». Añádelo o usa «narrador».` });
    }
    e.personajes.forEach((p, i) => {
      if (p.accion === 'corre' && p.hasta === undefined) ctx.addIssue({ code: 'custom', path: ['personajes', i, 'hasta'], message: '«corre» necesita «hasta».' });
    });
  });
export type EscenaOrganos = z.infer<typeof escenaOrganos>;

export const ajustesOrganos = z.strictObject({
  /** Fondo por defecto. */
  fondo: z.enum(FONDOS).default('cuerpo'),
  /** Color del contorno de los personajes y los rótulos, #RRGGBB. */
  contorno: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#2E1A3F'),
  /** Mostrar la fuente de cada escena en pantalla cuando la escena la trae. */
  mostrar_fuente: z.boolean().default(true),
});
export type AjustesOrganos = z.infer<typeof ajustesOrganos>;

const DESFASE = 0.2;

export const reglas: ReglasEstilo<typeof escenaOrganos, typeof ajustesOrganos> = {
  id: 'organos',
  familia: 'historias',
  nombre: 'Órganos con cara',
  descripcion: 'Órganos convertidos en personajes con cara que hablan, reaccionan y explican lo que pasa en tu cuerpo.',
  ideal_para: 'Salud y hábitos con humor: sueño, comida, deporte, estrés. Clínicas, nutricionistas y gimnasios. Siempre con fuentes serias.',
  esquemaEscena: escenaOrganos,
  esquemaAjustes: ajustesOrganos,
  textoVoz: (e) => e.texto,
  desfaseVoz: () => DESFASE,
  duracion(e, voz) {
    if (voz === null) return Math.max(3.2, segundosDeLectura(e.texto, 3.2) + 0.4);
    return Math.max(3.2, DESFASE + voz.duracion + 0.55);
  },
  cola: 0.8,
  admiteSubtitulos: true,
  // Sin whoosh ni subidas: debajo de la voz sonaban a avión (revisión del 22/11/2026).
  efectos: ['pop', 'brillo', 'impacto', 'burbuja'],
  golpes(escenas: readonly EscenaLista<EscenaOrganos>[]) {
    const golpes: { efecto: string; segundo: number; volumen?: number }[] = [];
    escenas.forEach((e, i) => {
      const antes = new Set((escenas[i - 1]?.datos.personajes ?? []).map((p) => p.personaje));
      e.datos.personajes.forEach((p) => {
        const base = e.inicio + p.retraso;
        if (!antes.has(p.personaje) || p.accion === 'entra') golpes.push({ efecto: 'pop', segundo: base + 0.05, volumen: 0.4 });
        if (p.accion === 'celebra') golpes.push({ efecto: 'brillo', segundo: base + 0.3, volumen: 0.35 });
        if (p.accion === 'se_desmaya') golpes.push({ efecto: 'impacto', segundo: base + 1.15, volumen: 0.45 });
        if (p.accion === 'salta') golpes.push({ efecto: 'burbuja', segundo: base + 0.15, volumen: 0.18 });
      });
      if (e.datos.rotulo !== undefined && e.datos.rotulo !== escenas[i - 1]?.datos.rotulo) golpes.push({ efecto: 'pop', segundo: e.inicio + 0.12, volumen: 0.3 });
    });
    return golpes;
  },
  textoSobreAcento: (a) => a.contorno,
  musica_sugerida: ['comica', 'lofi'],
};
