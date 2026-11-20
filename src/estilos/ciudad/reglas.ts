// Estilo «Maqueta 3D de videojuego»: una ciudad viva en maqueta, con el aspecto de un juego de construir ciudades. La
// cámara recorre la maqueta con luz cálida y sombras suaves, la gente camina, las barcas navegan, el humo sube, y la
// ciudad puede crecer edificio a edificio. Portado del kit VIDEO_3D (minuto de Tiwanaku, 5/5) con mundos generados por
// código en lugar de mundos hechos a mano: el guion elige el mundo y, en cada escena, el plano y el lugar.

import { z } from 'zod';
import type { ReglasEstilo } from '../../comun/reglas.ts';
import { camposEscena, duracionEscena, golpesMundo, LUCES, type EscenaMundo } from '../_mundo/esquemas.ts';
import { AGUAS, MUNDOS } from '../_mundo/tipos.ts';

/**
 * Los planos de cámara:
 * - general: toda la ciudad desde lejos, con una vuelta lenta;
 * - aereo: desde muy alto sobre el lugar, deslizándose;
 * - acercamiento: de lejos a cerca del lugar;
 * - alejamiento: de cerca del lugar a ver la ciudad entera;
 * - recorrido: a poca altura, pasando junto al lugar (como un dron bajo);
 * - orbita: dando la vuelta alrededor del lugar;
 * - detalle: muy cerca y bajo, para ver gente y casas;
 * - cenital: desde arriba, como un mapa que gira.
 */
export const PLANOS_CIUDAD = ['general', 'aereo', 'acercamiento', 'alejamiento', 'recorrido', 'orbita', 'detalle', 'cenital'] as const;

export const escenaCiudad = z.object({
  ...camposEscena,
  plano: z.enum(PLANOS_CIUDAD).default('general'),
  /** De qué lado mira la cámara, en grados (0 = desde el sur, 90 = desde el este). Sin dato: uno distinto en cada escena. */
  angulo: z.number().min(0).max(360).optional(),
});
export type EscenaCiudad = z.infer<typeof escenaCiudad>;

export const ajustesCiudad = z.object({
  /** El mundo: ciudad_antigua (pirámides, adobe, canales, chinampas), ciudad_moderna (rascacielos, avenidas, coches),
   * pueblo (iglesia, tejados, campos, molino) o puerto (bahía, muelles, faro, barcas). */
  mundo: z.enum(MUNDOS).default('ciudad_antigua'),
  /** Otra semilla = otra ciudad del mismo tipo. */
  semilla: z.number().int().min(1).max(9999).default(7),
  /** El agua: lago (la ciudad en una isla), rio, mar o ninguna. Sin dato: la típica del mundo. */
  agua: z.enum(AGUAS).optional(),
  /** Colores de la tierra y las casas: altiplano (ocre y seco), tropical (verde y turquesa), mediterranea (cal y
   * teja), templada (prados y piedra gris), urbana (hormigón y vidrio). Sin dato: la del mundo. */
  paleta: z.enum(['altiplano', 'tropical', 'mediterranea', 'templada', 'urbana']).optional(),
  /** La luz de la primera escena. */
  luz: z.enum(LUCES).default('manana'),
  /** La etiqueta fija arriba a la izquierda («RECONSTRUCCIÓN», «CIUDAD IMAGINADA»); vacía = sin etiqueta. */
  etiqueta: z.string().max(28).default(''),
  /** Cuánta gente, barcas y coches. */
  vida: z.enum(['poca', 'normal', 'mucha']).default('normal'),
});
export type AjustesCiudad = z.infer<typeof ajustesCiudad>;

export const reglas: ReglasEstilo<typeof escenaCiudad, typeof ajustesCiudad> = {
  id: 'ciudad',
  familia: 'lugares',
  nombre: 'Maqueta 3D de videojuego',
  descripcion: 'Una ciudad viva en maqueta 3D, como un juego de construir ciudades: cámara que recorre, luz cálida, gente y barcas que se mueven, y la ciudad que crece.',
  ideal_para: 'Historia de ciudades y civilizaciones (Tenochtitlan, Tiwanaku, una ciudad medieval), cómo era un lugar, cómo creció, urbanismo y «qué pasaría si».',
  esquemaEscena: escenaCiudad,
  esquemaAjustes: ajustesCiudad,
  textoVoz: (e) => e.texto,
  desfaseVoz: () => 0.15,
  duracion: (e, voz) => duracionEscena(e, voz),
  cola: 1.2,
  admiteSubtitulos: true,
  subtitulosArriba: 1270,
  efectos: ['whoosh', 'pop', 'impacto', 'subida'],
  golpes: (escenas) => golpesMundo(escenas as unknown as Parameters<typeof golpesMundo>[0]),
  musica_sugerida: ['epica', 'emotiva'],
};

export type { EscenaMundo };
