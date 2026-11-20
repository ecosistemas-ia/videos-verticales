// Estilo «Ilustración isométrica rica»: la ciudad como maqueta isométrica sobre un cubo cortado por delante (se ve el
// subsuelo), dibujada en vectores sin contorno con colores saturados sobre fondos índigo y violeta, cada cara con su
// degradado, nubes, lluvia y cifras blancas en cartelas magenta. Portado del estilo «ricco» del kit VIDEO_3D (5/5,
// la «città spugna»): en lugar de una maqueta dibujada a mano por tema, usa los mismos mundos generados por código que
// la maqueta 3D, y el guion elige en cada escena el plano, el lugar, la luz, el clima y el nivel del agua bajo tierra.

import { z } from 'zod';
import type { EscenaLista } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';
import { camposEscena, duracionEscena, golpesMundo, LUCES, type EscenaMundo } from '../_mundo/esquemas.ts';
import { AGUAS, MUNDOS } from '../_mundo/tipos.ts';

/**
 * Los planos (la maqueta no gira: la cámara se acerca, se aleja y se desliza):
 * - general: la maqueta entera, con un empuje lento;
 * - acercamiento: de la maqueta entera al lugar;
 * - alejamiento: del lugar a la maqueta entera;
 * - detalle: muy cerca del lugar, para ver casas, gente y coches;
 * - paneo: a media distancia, deslizándose de izquierda a derecha por el lugar;
 * - corte: la esquina de delante del cubo, para ver el subsuelo (capas de tierra y el depósito de agua).
 */
export const PLANOS_ISO = ['general', 'acercamiento', 'alejamiento', 'detalle', 'paneo', 'corte'] as const;

/** Cuánta agua hay en el depósito bajo la ciudad (0 a 1); [desde, hasta] = se llena o se vacía durante la escena. */
export const esquemaNivel = z.union([z.number().min(0).max(1), z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])]);

export const escenaIso = z.object({
  ...camposEscena,
  plano: z.enum(PLANOS_ISO).default('general'),
  /** El agua guardada bajo la ciudad, que se ve en el corte. Si ninguna escena la usa, el subsuelo es de roca. */
  nivel: esquemaNivel.optional(),
});
export type EscenaIso = z.infer<typeof escenaIso>;

export const ajustesIso = z.object({
  /** El mundo: ciudad_moderna (torres de colores, avenidas, coches, parque), ciudad_antigua (pirámides, adobe,
   * canales), pueblo (iglesia, tejados, campos, molino) o puerto (bahía, muelles, faro, barcas). */
  mundo: z.enum(MUNDOS).default('ciudad_moderna'),
  /** Otra semilla = otra ciudad del mismo tipo. */
  semilla: z.number().int().min(1).max(9999).default(7),
  /** El agua: lago, rio, mar o ninguna. Sin dato: la típica del mundo. */
  agua: z.enum(AGUAS).optional(),
  /** El fondo: indigo (el clásico), violeta o azul. */
  fondo: z.enum(['indigo', 'violeta', 'azul']).default('indigo'),
  /** La luz de la primera escena: cambia el halo del cielo y, de noche, se encienden las ventanas. */
  luz: z.enum(LUCES).default('tarde'),
  /** La etiqueta fija arriba a la izquierda; vacía = sin etiqueta. */
  etiqueta: z.string().max(28).default(''),
});
export type AjustesIso = z.infer<typeof ajustesIso>;

export const reglas: ReglasEstilo<typeof escenaIso, typeof ajustesIso> = {
  id: 'isometrico',
  familia: 'explicar',
  nombre: 'Ilustración isométrica rica',
  descripcion: 'Una ciudad en maqueta isométrica sobre un cubo cortado, en vectores de colores saturados sobre fondo índigo, con lluvia, subsuelo y cifras en cartelas magenta.',
  ideal_para: 'Ciudades, urbanismo, clima y agua, ciencia explicada con una imagen (lo que pasa bajo tierra, una ciudad que crece), datos grandes de un lugar.',
  esquemaEscena: escenaIso,
  esquemaAjustes: ajustesIso,
  textoVoz: (e) => e.texto,
  desfaseVoz: () => 0.15,
  duracion: (e, voz) => duracionEscena(e, voz),
  cola: 1.2,
  admiteSubtitulos: true,
  subtitulosArriba: 1290,
  efectos: ['whoosh', 'pop', 'impacto', 'subida'],
  golpes: (escenas) => golpesMundo(escenas as unknown as readonly EscenaLista<EscenaMundo>[]),
  musica_sugerida: ['tech', 'lofi', 'emotiva'],
};
