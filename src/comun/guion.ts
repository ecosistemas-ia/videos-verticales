// El guion de un video y la línea de tiempo que sale de él. Este archivo no tiene JSX: lo usan los componentes de
// Remotion y también los scripts de Node (scripts/preparar.ts), que lo cargan con la eliminación de tipos de Node.

import { z } from 'zod';

export const FPS = 30;
export const ANCHO = 1080;
export const ALTO = 1920;

/**
 * Zonas seguras del 9:16, en píxeles. Las aplicaciones tapan arriba el nombre de la cuenta, abajo el texto del video
 * y a la derecha los botones. Lo importante va dentro.
 */
export const ZONA_SEGURA = { arriba: 220, abajo: 420, izquierda: 60, derecha: 160 } as const;

export const esquemaPalabra = z.object({
  texto: z.string(),
  inicio: z.number(),
  fin: z.number(),
});
export type Palabra = z.infer<typeof esquemaPalabra>;

export const esquemaMarca = z.object({
  /** Nombre o @ del canal; vacío = sin firma. */
  nombre: z.string().default(''),
  /** Color de acento, #RRGGBB. */
  acento: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#C8F031'),
});
export type Marca = z.infer<typeof esquemaMarca>;

export const esquemaFuente = z.object({
  titulo: z.string(),
  url: z.string(),
  fecha: z.string().optional(),
});

/** Lo que escribe el guionista en guion.json. Las escenas las valida cada estilo con su propio esquema. */
export const esquemaGuion = z.object({
  estilo: z.string(),
  titulo: z.string(),
  /** Cómo se ven los subtítulos: palabra a palabra, por frases o sin subtítulos. */
  subtitulos: z.enum(['palabra', 'frase', 'ninguno']).default('frase'),
  /** Pista de recursos/musica (sin carpeta), o null para ir sin música. */
  musica: z.string().nullable().default(null),
  volumen_musica: z.number().min(0).max(1).default(0.16),
  efectos: z.boolean().default(true),
  marca: esquemaMarca.default({ nombre: '', acento: '#C8F031' }),
  /** Ajustes propios del estilo (los valida su esquemaAjustes). */
  ajustes: z.record(z.string(), z.unknown()).default({}),
  escenas: z.array(z.record(z.string(), z.unknown())).min(1),
  fuentes: z.array(esquemaFuente).default([]),
});
export type Guion = z.infer<typeof esquemaGuion>;

/** La voz de una escena: un archivo propio por escena, con los tiempos de cada palabra desde el inicio del archivo. */
export const esquemaVozEscena = z.object({
  archivo: z.string(),
  duracion: z.number().positive(),
  palabras: z.array(esquemaPalabra),
});
export type VozEscena = z.infer<typeof esquemaVozEscena>;

/** voz/voz.json: una entrada por escena (null si la escena no tiene voz). */
export const esquemaVoz = z.object({
  motor: z.string(),
  voz: z.string(),
  escenas: z.array(esquemaVozEscena.nullable()),
});

/** Una escena colocada en la línea de tiempo, en segundos. */
export interface EscenaLista<D = Record<string, unknown>> {
  readonly indice: number;
  readonly inicio: number;
  readonly duracion: number;
  readonly datos: D;
  /** La voz de la escena y en qué segundo, dentro de la escena, empieza a sonar. */
  readonly voz: (VozEscena & { desfase: number }) | null;
}

/** Un sonido puntual: un efecto en un segundo del video. */
export interface Golpe {
  readonly efecto: string;
  readonly segundo: number;
  readonly volumen?: number;
  /** Cuánto suena como máximo, en segundos (por defecto, 3). */
  readonly duracion?: number;
}

/** Lo que recibe la composición (props.json). */
export type PropsVideo = {
  readonly guion: Guion;
  /** Los ajustes del estilo ya validados y con sus valores por defecto. */
  readonly ajustes: Readonly<Record<string, unknown>>;
  readonly escenas: readonly EscenaLista[];
  readonly duracion: number;
  /** Archivo de música dentro de la carpeta del video, o null. */
  readonly musica: string | null;
  /** Nombre lógico del efecto → archivo dentro de la carpeta del video. Solo los que existen. */
  readonly efectos: Readonly<Record<string, string>>;
};

/**
 * Sin voz, los subtítulos reparten las palabras del texto de cada escena a lo largo de la escena, al ritmo de lectura.
 * Con voz se usan los tiempos reales.
 */
export function palabrasParaSubtitulos(escenas: readonly EscenaLista[], textoVoz: (datos: Record<string, unknown>) => string): Palabra[] {
  const todas: Palabra[] = [];
  for (const e of escenas) {
    if (e.voz !== null) {
      const base = e.inicio + e.voz.desfase;
      for (const p of e.voz.palabras) todas.push({ texto: p.texto, inicio: base + p.inicio, fin: base + p.fin });
      continue;
    }
    const trozos = textoVoz(e.datos).trim().split(/\s+/).filter(Boolean);
    if (trozos.length === 0) continue;
    const desde = e.inicio + 0.2;
    const paso = Math.max(0.2, (e.duracion - 0.5) / trozos.length);
    trozos.forEach((texto, i) => todas.push({ texto, inicio: desde + i * paso, fin: desde + (i + 1) * paso - 0.04 }));
  }
  return unirSignos(todas);
}

/** Un signo suelto («%», «€», «°») va con la palabra anterior: «0,05 %» no se parte entre dos subtítulos. */
function unirSignos(palabras: Palabra[]): Palabra[] {
  const salida: Palabra[] = [];
  for (const p of palabras) {
    const anterior = salida[salida.length - 1];
    if (anterior !== undefined && /^[%‰€$°ºª]+[.,;:!?…»)]*$/.test(p.texto)) {
      salida[salida.length - 1] = { texto: `${anterior.texto} ${p.texto}`, inicio: anterior.inicio, fin: Math.max(anterior.fin, p.fin) };
    } else salida.push(p);
  }
  return salida;
}

/** Segundos que se tarda en leer un texto en pantalla, para cuando no hay voz. */
export function segundosDeLectura(texto: string, minimo = 1.2): number {
  const palabras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(minimo, 0.5 + palabras / 3.2);
}
