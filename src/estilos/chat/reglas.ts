// Estilo «Historia contada en un chat»: la historia avanza mensaje a mensaje en una conversación. Un narrador opcional
// pone el contexto con voz. La interfaz es propia (colores y formas nuestros), nunca la de WhatsApp ni la de iMessage.

import { z } from 'zod';
import { segundosDeLectura } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';

export const escenaChat = z.object({
  /** «yo» va a la derecha; «otro», a la izquierda; «narrador» es una línea de voz en off con su cartel. */
  de: z.enum(['yo', 'otro', 'narrador']),
  texto: z.string().min(1),
  /** Si la voz lee también este mensaje (los del narrador se leen siempre). */
  leer: z.boolean().default(false),
});
export type EscenaChat = z.infer<typeof escenaChat>;

export const ajustesChat = z.object({
  /** El nombre que sale arriba del chat. */
  contacto: z.string().default('Desconocido'),
  /** La frase gancho fija sobre el chat («Mi jefe me escribió esto a las 3 a. m.»). */
  gancho: z.string().default(''),
  tema: z.enum(['oscuro', 'claro']).default('oscuro'),
});
export type AjustesChat = z.infer<typeof ajustesChat>;

/** Lo que dura el «escribiendo…» antes de un mensaje del otro. */
export function escribiendo(e: EscenaChat): number {
  return e.de === 'otro' ? Math.min(1.1, 0.45 + e.texto.length * 0.012) : 0;
}

export const reglas: ReglasEstilo<typeof escenaChat, typeof ajustesChat> = {
  id: 'chat',
  familia: 'historias',
  nombre: 'Historia contada en un chat',
  descripcion: 'La historia avanza mensaje a mensaje, con «escribiendo…», sonidos de notificación y un gancho arriba.',
  ideal_para: 'Historias con giro, conversaciones con clientes, humor, «lo que me escribió…».',
  esquemaEscena: escenaChat,
  esquemaAjustes: ajustesChat,
  textoVoz: (e) => (e.de === 'narrador' || e.leer ? e.texto : ''),
  desfaseVoz: (e) => escribiendo(e) + 0.15,
  duracion(e, voz) {
    const base = escribiendo(e) + 0.15;
    const lectura = segundosDeLectura(e.texto, 1.1) * (e.de === 'narrador' ? 1 : 0.75);
    return base + Math.max(lectura, voz === null ? 0 : voz.duracion + 0.3);
  },
  cola: 1.2,
  admiteSubtitulos: false,
  efectos: ['mensaje-entra', 'mensaje-sale', 'tecleo', 'whoosh'],
  golpes(escenas) {
    const golpes = [];
    for (const e of escenas) {
      if (e.datos.de === 'otro') {
        golpes.push({ efecto: 'tecleo', segundo: e.inicio, volumen: 0.25, duracion: escribiendo(e.datos) });
        golpes.push({ efecto: 'mensaje-entra', segundo: e.inicio + escribiendo(e.datos), volumen: 0.6 });
      } else if (e.datos.de === 'yo') {
        golpes.push({ efecto: 'mensaje-sale', segundo: e.inicio + 0.1, volumen: 0.5 });
      } else {
        golpes.push({ efecto: 'whoosh', segundo: e.inicio, volumen: 0.35 });
      }
    }
    return golpes;
  },
  textoSobreAcento: () => '#0B0F14',
  musica_sugerida: ['tension', 'comica', 'lofi'],
};
