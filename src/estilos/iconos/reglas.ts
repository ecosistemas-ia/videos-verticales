// Estilo «Explicación con íconos» (iconos), portado de la plantilla M3 de MOTION («spiegazione-icone»): explica un
// concepto o compara dos cosas sobre un fondo negro que pasa a carmesí con cuadrícula, con una figura plana en el
// centro, íconos que giran en órbita, tarjetas «Tiene / No tiene» y notas que se escriben palabra por palabra.
//
// Cómo se escribe un guion (cada escena es un tramo de voz con su tipo de plano):
//   - `texto`: lo que dice la voz en ese tramo (y los subtítulos).
//   - Cada cosa que aparece entra cuando la voz dice su palabra: si el texto en pantalla se dice («Velocidad»), entra
//     solo al decirlo; si no, se le pone `en` (o `<cosa>_en`) con una palabra o frase corta del `texto` de la escena
//     («palabra#2» = la segunda vez que sale). Lo que no tiene palabra se reparte por la escena.
//   - Los íconos van por su nombre de Phosphor (https://phosphoricons.com, en inglés: «rocket-launch», «coins»).
//     Para buscarlos: node src/estilos/iconos/buscar.ts <palabra en inglés>. Un nombre que no existe no rompe el
//     video: se cambia por «sparkle» y preparar.ts avisa con los nombres más parecidos.
//   - `figura`: una de las dibujadas (bombilla, persona, grupo, megafono, portatil, duda) o el nombre de cualquier
//     ícono de Phosphor, que se dibuja grande en el color de acento.
//   - El encabezado: el `titulo` de una «pregunta» queda arriba como encabezado en las escenas «figura» y «tarjetas»
//     que la siguen; `encabezado` lo cambia («» lo quita).
// Orden típico (30-60 s): titulo → orbita → pregunta A → figura → tarjetas → pregunta B → figura → tarjetas → nota →
// cierre. Para explicar una sola cosa basta con una pregunta.

import { z } from 'zod';
import { segundosDeLectura, type EscenaLista, type Golpe, type VozEscena } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';
import { iconoValido } from './catalogo.ts';
import { tiemposDeEscena } from './apariciones.ts';
import { estaEnTexto } from './tiempos.ts';

/** Las figuras dibujadas con código, en el estilo plano del original (acento, azul y blanco). */
export const FIGURAS_DIBUJADAS = ['bombilla', 'persona', 'grupo', 'megafono', 'portatil', 'duda'] as const;
export type FiguraDibujada = (typeof FIGURAS_DIBUJADAS)[number];

const sinTildes = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Un ícono de Phosphor por nombre; si no existe, el de reserva (con aviso). */
const icono = z.string().min(1).transform((v) => iconoValido(v));

/** Una figura: dibujada (por su nombre en español) o un ícono de Phosphor. */
const figura = z
  .string()
  .min(1)
  .transform((v) => {
    const n = sinTildes(v);
    return (FIGURAS_DIBUJADAS as readonly string[]).includes(n) ? n : iconoValido(v);
  });

/** Una palabra o frase corta del `texto` de la escena sobre la que entra algo («palabra#2» = la segunda vez). */
const ancla = z.string().min(1).optional();

/** Una imagen opcional dentro de la carpeta del video («imagenes/yo.png»), recortada y con fondo transparente. */
const imagen = z
  .string()
  .regex(/^imagenes\/[^/\\]+\.(png|webp|jpe?g)$/i, 'la imagen va en la carpeta imagenes/ del video: «imagenes/archivo.png»')
  .optional();

const texto = z.string().min(1);

/** Un encabezado (Anton, en mayúsculas). Omitido = sigue el anterior; «» = sin encabezado. */
const encabezado = z.string().max(20).optional();

export const escenaIconos = z
  .discriminatedUnion('tipo', [
    z.strictObject({
      /** Apertura: cursiva arriba, título enorme con un ícono pegado, línea roja debajo y una figura sobre un círculo. */
      tipo: z.literal('titulo'),
      texto,
      cursiva: z.string().max(30).default(''),
      titulo: z.string().min(1).max(14),
      titulo_en: ancla,
      subtitulo: z.string().max(26).default(''),
      subtitulo_en: ancla,
      icono: icono.optional(),
      figura: figura.default('persona'),
      /** Si está, ocupa el lugar de la figura (en blanco y negro). */
      imagen,
      imagen_color: z.boolean().default(false),
    }),
    z.strictObject({
      /** Una figura al centro con 3 a 8 íconos que giran en órbita. */
      tipo: z.literal('orbita'),
      texto,
      figura: figura.default('bombilla'),
      iconos: z.array(icono).min(3).max(8),
      /** Palabra sobre la que aparece la órbita (por defecto, a un tercio de la escena). */
      orbita_en: ancla,
      /** Palabra sobre la que todo late una vez. */
      latido_en: ancla,
    }),
    z.strictObject({
      /** Una pregunta: cursiva («¿Qué es el») y título («SEO»), que luego queda como encabezado. */
      tipo: z.literal('pregunta'),
      texto,
      cursiva: z.string().max(30).default(''),
      titulo: z.string().min(1).max(20),
      titulo_en: ancla,
    }),
    z.strictObject({
      /** La figura que cae grande y se posa, con hasta tres burbujas y un ícono sobre la cabeza. */
      tipo: z.literal('figura'),
      texto,
      encabezado,
      figura: figura.default('persona'),
      burbujas: z
        .array(
          z.strictObject({
            tipo: z.enum(['mensaje', 'corazon', 'check', 'pregunta', 'exclamacion']),
            lado: z.enum(['izquierda', 'derecha', 'arriba']),
            en: ancla,
          }),
        )
        .max(3)
        .default([]),
      icono_arriba: icono.optional(),
      icono_arriba_en: ancla,
      latido_en: ancla,
    }),
    z.strictObject({
      /** Una o dos tarjetas («Tiene:» / «No tiene:») con 1 a 4 íconos con etiqueta, que entran uno a uno. */
      tipo: z.literal('tarjetas'),
      texto,
      encabezado,
      tarjetas: z
        .array(
          z.strictObject({
            titulo: z.string().min(1).max(16),
            en: ancla,
            items: z
              .array(
                z.strictObject({
                  icono,
                  /** Etiqueta corta bajo el ícono (1 o 2 palabras). */
                  texto: z.string().min(1).max(14),
                  en: ancla,
                }),
              )
              .min(1)
              .max(4),
          }),
        )
        .min(1)
        .max(2),
    }),
    z.strictObject({
      /** «nota…» en cursiva y frases en mayúsculas que se escriben palabra por palabra mientras la voz las dice. */
      tipo: z.literal('nota'),
      texto,
      cursiva: z.string().max(20).default('nota…'),
      /** Lo que se escribe; por defecto, las frases del `texto`. Hasta 3 frases y unas 30 palabras. */
      frases: z.array(z.string().min(1)).min(1).max(3).optional(),
    }),
    z.strictObject({
      /** Cierre: una invitación en rojo («SÍGUENOS») y un ícono opcional; al final todo se desenfoca a negro. */
      tipo: z.literal('cierre'),
      texto,
      invitacion: z.string().max(22).default(''),
      icono: icono.optional(),
    }),
  ])
  .superRefine((e, ctx) => {
    const revisar = (consulta: string | undefined, camino: (string | number)[]): void => {
      if (consulta === undefined) return;
      if (!estaEnTexto(e.texto, consulta)) {
        ctx.addIssue({ code: 'custom', path: camino, message: `«${consulta}» no está en el texto de la escena: «${e.texto}»` });
      }
    };
    switch (e.tipo) {
      case 'titulo':
        revisar(e.titulo_en, ['titulo_en']);
        revisar(e.subtitulo_en, ['subtitulo_en']);
        break;
      case 'orbita':
        revisar(e.orbita_en, ['orbita_en']);
        revisar(e.latido_en, ['latido_en']);
        break;
      case 'pregunta':
        revisar(e.titulo_en, ['titulo_en']);
        break;
      case 'figura': {
        e.burbujas.forEach((b, i) => revisar(b.en, ['burbujas', i, 'en']));
        revisar(e.icono_arriba_en, ['icono_arriba_en']);
        revisar(e.latido_en, ['latido_en']);
        const lados = e.burbujas.map((b) => b.lado);
        if (new Set(lados).size !== lados.length) ctx.addIssue({ code: 'custom', path: ['burbujas'], message: 'dos burbujas en el mismo lado se tapan: una por lado' });
        if (e.icono_arriba !== undefined && lados.includes('arriba'))
          ctx.addIssue({ code: 'custom', path: ['icono_arriba'], message: 'el ícono de arriba y una burbuja «arriba» se tapan: usa uno de los dos' });
        break;
      }
      case 'tarjetas':
        e.tarjetas.forEach((t, i) => {
          revisar(t.en, ['tarjetas', i, 'en']);
          t.items.forEach((it, j) => revisar(it.en, ['tarjetas', i, 'items', j, 'en']));
        });
        break;
      case 'nota': {
        const palabras = (e.frases ?? [e.texto]).join(' ').split(/\s+/).filter(Boolean).length;
        if (palabras > 32) ctx.addIssue({ code: 'custom', path: ['frases'], message: `la nota tiene ${palabras} palabras: hasta 32 caben bien` });
        break;
      }
      case 'cierre':
        break;
    }
  });
export type EscenaIconos = z.infer<typeof escenaIconos>;

export const ajustesIconos = z.strictObject({
  /** «carmesi»: el rojo del original; «marca»: el color de acento de la marca (guion → marca.acento). */
  color: z.enum(['carmesi', 'marca']).default('carmesi'),
  /** Color de abajo del degradado del fondo (#RRGGBB); por defecto, un tono oscuro del acento. */
  fondo: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export type AjustesIconos = z.infer<typeof ajustesIconos>;

/** Duración mínima de cada tipo de plano, para que sus animaciones respiren. */
function minimo(e: EscenaIconos): number {
  switch (e.tipo) {
    case 'titulo':
      return 3.2;
    case 'orbita':
      return 3.6;
    case 'pregunta':
      return 1.8;
    case 'figura':
      return 2.6;
    case 'tarjetas':
      return 1.4 + 0.5 * e.tarjetas.reduce((s, t) => s + t.items.length, 0);
    case 'nota':
      return segundosDeLectura((e.frases ?? [e.texto]).join(' '), 2.5) + 0.6;
    case 'cierre':
      return 2.6;
  }
}

/** Segundos de aire después de la voz (las salidas ocurren ahí). */
function aire(e: EscenaIconos): number {
  if (e.tipo === 'tarjetas') return 0.9;
  if (e.tipo === 'cierre') return 0.9;
  if (e.tipo === 'pregunta') return 0.25;
  return 0.4;
}

const DESFASE = 0.15;

export const reglas: ReglasEstilo<typeof escenaIconos, typeof ajustesIconos> = {
  id: 'iconos',
  familia: 'explicar',
  nombre: 'Explicación con íconos',
  descripcion: 'Explica un concepto con íconos que giran alrededor de una figura, tarjetas «tiene / no tiene» y notas escritas palabra por palabra.',
  ideal_para: 'Diferencias entre dos cosas (SEO o anuncios), qué incluye un servicio, definiciones y «un concepto en 40 segundos».',
  esquemaEscena: escenaIconos,
  esquemaAjustes: ajustesIconos,
  textoVoz: (e) => e.texto,
  desfaseVoz: () => DESFASE,
  duracion(e, voz: VozEscena | null) {
    const habla = voz === null ? segundosDeLectura(e.texto, 1.2) : DESFASE + voz.duracion;
    return Math.max(minimo(e), habla + aire(e));
  },
  cola: 0.5,
  admiteSubtitulos: true,
  // En la nota y en la pregunta el texto de la voz ya se escribe en pantalla: sin subtítulos, para no leerlo dos veces.
  subtitulosEn: (e) => e.tipo !== 'nota' && e.tipo !== 'pregunta',
  efectos: ['whoosh', 'pop', 'clic', 'brillo', 'transicion', 'subida'],
  golpes(escenas: readonly EscenaLista<EscenaIconos>[]): Golpe[] {
    const golpes: Golpe[] = [];
    const g = (efecto: string, segundo: number, volumen: number): void => {
      golpes.push({ efecto, segundo, volumen });
    };
    for (const e of escenas) {
      const t = tiemposDeEscena(e);
      const a = e.inicio;
      switch (t.tipo) {
        case 'titulo':
          g('whoosh', a + t.titulo, 0.4);
          if (t.icono !== null) g('pop', a + t.icono + 0.1, 0.4);
          if (t.subtitulo !== null) g('whoosh', a + t.subtitulo, 0.2);
          break;
        case 'orbita':
          g('whoosh', a, 0.3);
          g('transicion', a + t.orbita, 0.35);
          if (t.latido !== null) g('pop', a + t.latido, 0.3);
          break;
        case 'pregunta':
          g('whoosh', a + t.titulo, 0.3);
          break;
        case 'figura':
          g('whoosh', a, 0.25);
          for (const b of t.burbujas) g('pop', a + b, 0.35);
          if (t.iconoArriba !== null) g('brillo', a + t.iconoArriba, 0.35);
          break;
        case 'tarjetas':
          t.tarjetas.forEach((tj) => {
            g('clic', a + tj.entra, 0.3);
            for (const it of tj.items) g('pop', a + it, 0.3);
          });
          break;
        case 'nota':
          g('brillo', a, 0.3);
          break;
        case 'cierre':
          if (t.invitacion !== null) g('subida', a + t.invitacion, 0.3);
          break;
      }
    }
    return golpes;
  },
  musica_sugerida: ['tech', 'lofi', 'energica'],
};
