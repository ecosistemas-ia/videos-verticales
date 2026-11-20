// Lo que cada estilo declara para que scripts/preparar.ts arme la línea de tiempo. Sin JSX: lo carga Node.

import type { z } from 'zod';
import type { EscenaLista, Golpe, Guion, VozEscena } from './guion.ts';

/** Las familias de estilos, en el orden en que se enseñan. Las leen scripts/estilos.ts, la galería y las skills. */
export const FAMILIAS = {
  explicar: { nombre: 'Explicar', para: 'un tema, un concepto o una noticia, con datos y pasos' },
  historias: { nombre: 'Contar historias', para: 'una anécdota, un caso o lo que pasa por dentro, con personajes' },
  datos: { nombre: 'Datos y juego', para: 'cifras que cambian con los años, o un juego para quien mira' },
  marca: { nombre: 'Marca', para: 'una idea o un posicionamiento con imágenes que se recuerdan' },
  lugares: { nombre: 'Lugares y épocas', para: 'la historia de un sitio y cómo cambia con el tiempo' },
} as const;
export type Familia = keyof typeof FAMILIAS;

export interface ReglasEstilo<E extends z.ZodType = z.ZodType, A extends z.ZodType = z.ZodType> {
  readonly id: string;
  readonly nombre: string;
  /** Su familia en el catálogo (FAMILIAS). */
  readonly familia: Familia;
  /** Una línea para el catálogo de /estilos. */
  readonly descripcion: string;
  /** Para qué contenido sirve mejor. */
  readonly ideal_para: string;
  readonly esquemaEscena: E;
  /** Ajustes del estilo en guion.json → ajustes, con valores por defecto. */
  readonly esquemaAjustes: A;
  /** El texto que lee la voz en esa escena (vacío = escena sin voz). */
  textoVoz(escena: z.infer<E>): string;
  /** En qué segundo de la escena empieza la voz. */
  desfaseVoz(escena: z.infer<E>): number;
  /** Duración de la escena en segundos, sabiendo cuánto dura su voz (null = sin voz). */
  duracion(escena: z.infer<E>, voz: VozEscena | null, ajustes: z.infer<A>): number;
  /** Segundos de cola al final del video, sin voz. */
  readonly cola: number;
  /** Si el texto ya está en pantalla, los subtítulos sobran. */
  readonly admiteSubtitulos: boolean;
  /** Si una escena lleva subtítulos (por defecto, todas): apágalos donde el texto de la voz ya se lee en pantalla. */
  subtitulosEn?(escena: z.infer<E>): boolean;
  /** Dónde empieza la franja de los subtítulos (px desde arriba); por defecto, justo encima de la zona tapada. */
  readonly subtitulosArriba?: number;
  /** La firma de la marca abajo a la izquierda: clara (por defecto, para fondos oscuros), oscura (fondos claros) o
   *  ninguna (el estilo ya dibuja la marca). */
  readonly firma?: 'clara' | 'oscura' | 'ninguna';
  /** Nombres lógicos de los efectos que usa (los resuelve recursos/efectos.json). */
  readonly efectos: readonly string[];
  /** Los efectos puntuales del video, una vez armada la línea de tiempo. */
  golpes(escenas: readonly EscenaLista<z.infer<E>>[], ajustes: z.infer<A>, guion: Guion): Golpe[];
  /** El color del texto que el estilo escribe encima del color de acento (rótulos, burbujas), si lo hace: preparar.ts
   *  avisa cuando contrastan poco. */
  textoSobreAcento?(ajustes: z.infer<A>): string;
  /** Ambiente de música recomendado (ver recursos/licencias.json). */
  readonly musica_sugerida: readonly string[];
}
