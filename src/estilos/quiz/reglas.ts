// Estilo «Quiz con cuenta atrás»: una pregunta, de dos a cuatro opciones, una cuenta atrás con su tic-tac y la
// respuesta correcta que se ilumina. El que mira juega: por eso funciona en Shorts y TikTok.

import { z } from 'zod';
import { segundosDeLectura } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';

export const escenaQuiz = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('intro'), texto: z.string().min(1) }),
  z.object({
    tipo: z.literal('pregunta'),
    texto: z.string().min(1),
    opciones: z.array(z.string().min(1)).min(2).max(4),
    /** Índice de la opción correcta, desde 0. */
    correcta: z.number().int().min(0),
    /** Un dato corto que aparece con la respuesta. */
    dato: z.string().default(''),
  }),
  z.object({ tipo: z.literal('cierre'), texto: z.string().min(1) }),
]);
export type EscenaQuiz = z.infer<typeof escenaQuiz>;

export const ajustesQuiz = z.object({
  /** El tema, arriba en todas las preguntas («Capitales del mundo»). */
  tema: z.string().default('Quiz'),
  /** Segundos de cuenta atrás por pregunta. */
  cuenta: z.number().int().min(2).max(10).default(5),
});
export type AjustesQuiz = z.infer<typeof ajustesQuiz>;

/** Momentos de una pregunta, en segundos desde su inicio. */
export function tiemposPregunta(
  e: Extract<EscenaQuiz, { tipo: 'pregunta' }>,
  vozDuracion: number | null,
  cuenta: number,
): { opciones: number[]; cuenta: number; revela: number; fin: number } {
  const lectura = vozDuracion === null ? segundosDeLectura(e.texto, 1.4) : vozDuracion + 0.2;
  const opciones = e.opciones.map((_, i) => 0.5 + i * 0.3);
  const inicioCuenta = Math.max(lectura, opciones[opciones.length - 1] + 0.5);
  const revela = inicioCuenta + cuenta;
  const fin = revela + (e.dato.length > 0 ? Math.max(1.8, segundosDeLectura(e.dato, 1.8)) : 1.4);
  return { opciones, cuenta: inicioCuenta, revela, fin };
}

export const reglas: ReglasEstilo<typeof escenaQuiz, typeof ajustesQuiz> = {
  id: 'quiz',
  familia: 'datos',
  nombre: 'Quiz con cuenta atrás',
  descripcion: 'Preguntas con opciones, cuenta atrás con tic-tac y la respuesta que se ilumina; el que mira juega.',
  ideal_para: 'Cultura general, trivia de un nicho, «¿cuánto sabes de…?», retos para comentar.',
  esquemaEscena: escenaQuiz,
  esquemaAjustes: ajustesQuiz,
  textoVoz: (e) => e.texto,
  desfaseVoz: (e) => (e.tipo === 'pregunta' ? 0.1 : 0.2),
  duracion(e, voz, ajustes) {
    if (e.tipo === 'pregunta') return tiemposPregunta(e, voz?.duracion ?? null, ajustes.cuenta).fin;
    const lectura = segundosDeLectura(e.texto, e.tipo === 'intro' ? 2 : 2.4);
    return Math.max(lectura, voz === null ? 0 : voz.duracion + 0.5);
  },
  cola: 0.6,
  admiteSubtitulos: false,
  efectos: ['tic', 'acierto', 'whoosh', 'pop'],
  golpes(escenas, ajustes) {
    const golpes = [];
    for (const e of escenas) {
      golpes.push({ efecto: 'whoosh', segundo: e.inicio, volumen: 0.35 });
      if (e.datos.tipo !== 'pregunta') continue;
      const t = tiemposPregunta(e.datos, e.voz?.duracion ?? null, ajustes.cuenta);
      for (const o of t.opciones) golpes.push({ efecto: 'pop', segundo: e.inicio + o, volumen: 0.35 });
      for (let s = 0; s < ajustes.cuenta; s++) golpes.push({ efecto: 'tic', segundo: e.inicio + t.cuenta + s, volumen: 0.5 });
      golpes.push({ efecto: 'acierto', segundo: e.inicio + t.revela, volumen: 0.7 });
    }
    return golpes;
  },
  textoSobreAcento: () => '#121a2e',
  musica_sugerida: ['energica', 'comica'],
};
