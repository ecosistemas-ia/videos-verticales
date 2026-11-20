// Estilo «Noticia tech con pantallas»: la noticia contada palabra por palabra sobre blanco. Cada palabra que dice la
// voz entra escrita, de gris a negro, con tamaños y cursivas mezclados en la misma línea; en medio, pantallas oscuras
// dibujadas (un navegador, un chat, un buscador, una terminal) con una sombra grande, nombres de marca en fichas, un
// personaje pixel y números que suben. Puerto de la variante «schermi» de tipografia-cinetica de MOTION.
//
// Una escena es un tramo de voz con su plano. El texto de la escena es a la vez lo que lee la voz y lo que se escribe
// en pantalla (marcado en marcado.ts). Sin JSX: lo carga Node.

import { z } from 'zod';
import type { EscenaLista, Golpe } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';
import { NOMBRES_ICONOS } from './iconos.ts';
import { INICIO_SIN_VOZ, PASO_SIN_VOZ, buscarPalabra, leerMarcado, textoParaVoz, tiemposDePalabras } from './marcado.ts';

/** Una imagen opcional que aporta el usuario, bajo su responsabilidad, dentro de la carpeta del video. */
const rutaImagen = z
  .string()
  .regex(/^imagenes\/[^\s\\]+\.(png|jpe?g|webp|svg)$/i, 'una imagen va como «imagenes/<archivo>.png» (o .jpg, .webp, .svg)');

const TRANSICIONES = ['corte', 'desenfoque', 'empuje', 'zoom', 'blanco'] as const;
export type Transicion = (typeof TRANSICIONES)[number];

/** Lo común a todas las escenas. */
const comun = {
  /**
   * Lo que dice la voz y se escribe en pantalla, palabra por palabra. Marcado: **grande**, *cursiva*, ***grande
   * cursiva***, ^TITULAR^; «/» corta la línea en pantalla (la voz no lo lee). 3-16 palabras por escena.
   */
  texto: z.string().trim().min(1).max(200),
  /** Cómo entra la escena. Sin indicarla: corte, salvo pantalla tras pantalla (empuje) y tras una persona (desenfoque). */
  transicion: z.enum(TRANSICIONES).optional(),
};

/** Las escenas con un objeto en medio: las primeras `arriba` líneas van encima del objeto y el resto debajo. */
const conObjeto = {
  ...comun,
  arriba: z.number().int().min(0).max(2).default(1),
};

/** La interfaz dibujada de una pantalla. Todo lo que se lee dentro viene de aquí, en español. */
const pantalla = z.discriminatedUnion('tipo', [
  z
    .object({
      tipo: z.literal('navegador'),
      /** La dirección en la barra («openai.com/blog»); vacía = sin dirección. */
      direccion: z.string().trim().max(48).default(''),
      titulo: z.string().trim().min(1).max(90),
      /** 0-4 párrafos cortos de la página. */
      lineas: z.array(z.string().trim().min(1).max(140)).max(4).default([]),
    })
    .strict(),
  z
    .object({
      tipo: z.literal('chat'),
      /** El nombre del asistente en la cabecera (genérico, nunca la marca de otro); vacío = solo el icono. */
      nombre: z.string().trim().max(24).default(''),
      pregunta: z.string().trim().min(1).max(120),
      respuesta: z.string().trim().min(1).max(260),
    })
    .strict(),
  z
    .object({
      tipo: z.literal('buscador'),
      consulta: z.string().trim().min(1).max(60),
      /** Un resumen con IA encima de los resultados; vacío = sin resumen. */
      respuesta: z.string().trim().max(200).default(''),
      /** 0-3 títulos de resultados; sin títulos, resultados de relleno. */
      resultados: z.array(z.string().trim().min(1).max(60)).max(3).default([]),
    })
    .strict(),
  z
    .object({
      tipo: z.literal('terminal'),
      /** Las que empiezan por «$ » se teclean; las demás son la salida. */
      lineas: z.array(z.string().max(48)).min(1).max(8),
    })
    .strict(),
  z
    .object({
      tipo: z.literal('captura'),
      /** Una captura que aporta el usuario; si es más alta que la ventana, se desplaza despacio. */
      imagen: rutaImagen,
      direccion: z.string().trim().max(48).default(''),
    })
    .strict(),
]);

const marca = z
  .object({
    /** El nombre escrito en la ficha. Si la voz lo dice, la ficha entra en esa palabra. */
    nombre: z.string().trim().min(1).max(16),
    /** Un icono genérico de la lista (nunca un logo); sin icono, la inicial. */
    icono: z.enum(NOMBRES_ICONOS).optional(),
    /** El logo, si el usuario lo aporta y tiene derecho a usarlo. */
    imagen: rutaImagen.optional(),
  })
  .strict();

/** Palabras por escena: más, y la pantalla se llena; mejor dos escenas. */
export const MAXIMO_PALABRAS = 24;

export const escenaPantallas = z.discriminatedUnion('plano', [
  /** Solo el texto, centrado. `destello`: la forma de rayos del color de acento encima, girando. */
  z.object({ ...comun, plano: z.literal('frase'), destello: z.boolean().default(false) }).strict(),
  /** Una pantalla oscura dibujada, con el texto encima y debajo. */
  z.object({ ...conObjeto, plano: z.literal('pantalla'), pantalla }).strict(),
  /** 1-4 fichas con nombres de marca (empresas, productos), que entran cuando la voz los nombra. */
  z.object({ ...conObjeto, plano: z.literal('marcas'), marcas: z.array(marca).min(1).max(4) }).strict(),
  /** Una persona: ficha con su foto (si el usuario la aporta) o sus iniciales, el nombre y el cargo. */
  z
    .object({
      ...conObjeto,
      plano: z.literal('persona'),
      nombre: z.string().trim().min(1).max(32),
      cargo: z.string().trim().max(40).default(''),
      imagen: rutaImagen.optional(),
    })
    .strict(),
  /** El personaje pixel: uno grande (cantidad 1) o una cuadrícula que se llena (2-16: «decenas de agentes»). */
  z.object({ ...conObjeto, plano: z.literal('personaje'), cantidad: z.number().int().min(1).max(16).default(1) }).strict(),
  /** Un número grande que sube de 0 al valor. Solo números verdaderos, con su fuente en `fuentes`. */
  z
    .object({
      ...conObjeto,
      plano: z.literal('numero'),
      valor: z.number().finite().min(0).max(1e12),
      decimales: z.number().int().min(0).max(2).default(0),
      prefijo: z.string().max(3).default(''),
      sufijo: z.string().max(4).default(''),
    })
    .strict(),
  /** Una lista con estrellas: cada línea («/») es un punto; con `encabezado`, la primera línea va arriba sin estrella. */
  z.object({ ...comun, plano: z.literal('lista'), encabezado: z.boolean().default(true) }).strict(),
  /** El cierre: el nombre de la marca en grande (o el logo, si lo aporta el usuario), con el texto encima y debajo. */
  z
    .object({
      ...conObjeto,
      plano: z.literal('cierre'),
      /** Vacío = el nombre de la marca del guion; sin nombre, el personaje pixel. */
      nombre: z.string().trim().max(24).default(''),
      imagen: rutaImagen.optional(),
    })
    .strict(),
]).superRefine((e, ctx) => {
  const m = leerMarcado(e.texto);
  if (m.sinCerrar) ctx.addIssue({ code: 'custom', path: ['texto'], message: 'Hay un marcado sin cerrar: cada «**», «*», «***» y «^» necesita su pareja.' });
  if (m.palabras.length > MAXIMO_PALABRAS)
    ctx.addIssue({ code: 'custom', path: ['texto'], message: `La escena tiene ${m.palabras.length} palabras: divídela en dos (máximo ${MAXIMO_PALABRAS}).` });
  if (e.plano === 'lista') {
    const puntos = e.encabezado ? m.lineas.length - 1 : m.lineas.length;
    if (puntos < 2 || puntos > 4)
      ctx.addIssue({ code: 'custom', path: ['texto'], message: `La lista necesita de 2 a 4 puntos separados con «/»${e.encabezado ? ', más la línea del encabezado' : ''}; tiene ${Math.max(0, puntos)}.` });
  }
});
export type EscenaPantallas = z.infer<typeof escenaPantallas>;
export type Plano = EscenaPantallas['plano'];

export const ajustesPantallas = z
  .object({
    /** Color del personaje pixel y del destello; sin indicarlo, el acento de la marca. */
    color_personaje: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    /** Color de los ojos del personaje. */
    color_ojos: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#141414'),
    /** Cómo se escriben los números: «es-ES» (1.000,5) o «es-MX» (1,000.5). */
    numeros: z.enum(['es-ES', 'es-MX']).default('es-ES'),
  })
  .strict();
export type AjustesPantallas = z.infer<typeof ajustesPantallas>;

/** Desfase de la voz dentro de la escena: el primer corte cae justo antes de la primera palabra. */
export const DESFASE_VOZ = 0.12;
/** Cola de cada escena tras su última palabra. */
const COLA_ESCENA = 0.3;

/** Duración mínima por plano: lo que necesita su objeto para verse (el contador sube en 2,4 s, el chat escribe…). */
const MINIMOS: Record<Plano, number> = {
  frase: 1.2,
  pantalla: 2.6,
  marcas: 1.6,
  persona: 1.8,
  personaje: 1.6,
  numero: 2.4,
  lista: 2.0,
  cierre: 2.2,
};

/** La transición con la que entra cada escena (la primera, siempre con corte). */
export function transiciones(escenas: readonly EscenaPantallas[]): Transicion[] {
  return escenas.map((e, i) => {
    if (i === 0) return 'corte';
    if (e.transicion !== undefined) return e.transicion;
    const antes = escenas[i - 1];
    if (e.plano === 'pantalla' && antes.plano === 'pantalla') return 'empuje';
    if (antes.plano === 'persona') return 'desenfoque';
    return 'corte';
  });
}

/** Las líneas de la lista: la cabecera (si hay) y los puntos. */
export function partesLista(e: Extract<EscenaPantallas, { plano: 'lista' }>): { cabecera: readonly number[] | null; puntos: readonly (readonly number[])[] } {
  const { lineas } = leerMarcado(e.texto);
  if (e.encabezado && lineas.length > 1) return { cabecera: lineas[0], puntos: lineas.slice(1) };
  return { cabecera: null, puntos: lineas };
}

/** En qué palabra entra cada ficha de marca: la que la nombra o, si la voz no la nombra, repartidas al principio. */
export function palabrasDeMarcas(e: Extract<EscenaPantallas, { plano: 'marcas' }>): number[] {
  const { palabras } = leerMarcado(e.texto);
  let desde = 0;
  return e.marcas.map((m, i) => {
    const k = buscarPalabra(palabras, m.nombre, desde);
    if (k >= 0) {
      desde = k + 1;
      return k;
    }
    return Math.min(palabras.length - 1, i);
  });
}

export const reglas: ReglasEstilo<typeof escenaPantallas, typeof ajustesPantallas> = {
  id: 'pantallas',
  familia: 'explicar',
  nombre: 'Noticia tech con pantallas',
  descripcion:
    'La noticia palabra por palabra sobre blanco: pantallas oscuras dibujadas que entran y se desplazan, fichas de marcas, un personaje pixel y números que suben.',
  ideal_para: 'Noticias de tecnología e IA, lanzamientos de herramientas, «cómo funciona», comparativas, cifras de una novedad.',
  esquemaEscena: escenaPantallas,
  esquemaAjustes: ajustesPantallas,
  textoVoz: (e) => textoParaVoz(e.texto),
  desfaseVoz: () => DESFASE_VOZ,
  duracion(e, voz) {
    const n = leerMarcado(e.texto).palabras.length;
    const base = voz === null ? INICIO_SIN_VOZ + n * PASO_SIN_VOZ + 0.45 : DESFASE_VOZ + voz.duracion + COLA_ESCENA;
    return Math.max(MINIMOS[e.plano], base);
  },
  cola: 1.0,
  admiteSubtitulos: false,
  firma: 'oscura',
  efectos: ['whoosh', 'pop', 'tecleo', 'mensaje-sale', 'mensaje-entra', 'subida', 'brillo'],
  golpes(escenas) {
    const golpes: Golpe[] = [];
    const pasos = transiciones(escenas.map((e) => e.datos));
    escenas.forEach((e: EscenaLista<EscenaPantallas>, i) => {
      const d = e.datos;
      const t = tiemposDePalabras(leerMarcado(d.texto).palabras, e.voz);
      const en = (k: number): number => e.inicio + Math.max(0, (t[k] ?? 0) - 0.2);
      if (i > 0 && pasos[i] !== 'corte') golpes.push({ efecto: 'whoosh', segundo: e.inicio - 0.08, volumen: 0.3 });
      else if (d.plano === 'pantalla' || d.plano === 'persona') golpes.push({ efecto: 'whoosh', segundo: e.inicio, volumen: 0.2 });
      switch (d.plano) {
        case 'marcas':
          for (const k of palabrasDeMarcas(d)) golpes.push({ efecto: 'pop', segundo: en(k), volumen: 0.35 });
          break;
        case 'lista':
          for (const p of partesLista(d).puntos) golpes.push({ efecto: 'pop', segundo: en(p[0]), volumen: 0.3 });
          break;
        case 'personaje':
          golpes.push({ efecto: 'pop', segundo: e.inicio + 0.05, volumen: 0.4 });
          break;
        case 'numero':
          golpes.push({ efecto: 'subida', segundo: e.inicio + 0.1, volumen: 0.3 });
          break;
        case 'cierre':
          golpes.push({ efecto: 'brillo', segundo: e.inicio + 0.05, volumen: 0.35 });
          break;
        case 'pantalla':
          if (d.pantalla.tipo === 'chat') {
            golpes.push({ efecto: 'mensaje-sale', segundo: e.inicio + 0.25, volumen: 0.35 });
            golpes.push({ efecto: 'mensaje-entra', segundo: e.inicio + 0.95, volumen: 0.35 });
          } else if (d.pantalla.tipo === 'buscador' || d.pantalla.tipo === 'terminal') {
            golpes.push({ efecto: 'tecleo', segundo: e.inicio + 0.2, volumen: 0.22 });
          }
          break;
        default:
          break;
      }
    });
    return golpes;
  },
  musica_sugerida: ['tech', 'energica'],
};
