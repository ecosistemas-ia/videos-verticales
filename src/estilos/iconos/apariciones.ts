// En qué segundo de su escena entra cada cosa, para cada tipo de plano. Lo usan el dibujo (Estilo.tsx) y los efectos
// de sonido (reglas.ts → golpes), así que no lleva JSX ni React: lo carga también Node. Todo en segundos desde el
// inicio de la escena.

import type { EscenaLista } from '../../comun/guion.ts';
import type { EscenaIconos } from './reglas.ts';
import { ANTICIPO, buscar, finDelHabla, momentos, normalizar, palabrasDeEscena, trozos, type PalabraEscena } from './tiempos.ts';

/** Una línea en cursiva: cuándo empieza la pluma y cuándo termina de escribir. */
export interface Escritura {
  readonly desde: number;
  readonly hasta: number;
}

export type Tiempos =
  | { tipo: 'titulo'; cursiva: Escritura; titulo: number; subtitulo: number | null; icono: number | null }
  | { tipo: 'orbita'; orbita: number; latido: number | null }
  | { tipo: 'pregunta'; cursiva: Escritura; titulo: number }
  | { tipo: 'figura'; burbujas: number[]; iconoArriba: number | null; latido: number | null }
  | { tipo: 'tarjetas'; tarjetas: { entra: number; items: number[] }[] }
  | { tipo: 'nota'; cursiva: Escritura; palabras: { texto: string; frase: number; entra: number }[] }
  | { tipo: 'cierre'; invitacion: number | null };

/**
 * La cursiva se escribe mientras la voz dice esas mismas palabras, si las dice; si no, desde `desde` a unas 14 letras
 * por segundo. Siempre entre 0,4 y 2,2 s (el original).
 */
function escritura(palabras: readonly PalabraEscena[], texto: string, desde: number): Escritura {
  const n = trozos(texto).length;
  const i = n === 0 ? null : buscar(
    palabras.map((p) => p.texto),
    texto,
    true,
  );
  if (i !== null && i + n - 1 < palabras.length) {
    const a = Math.max(0, palabras[i].inicio - ANTICIPO);
    const b = palabras[i + n - 1].fin;
    return { desde: a, hasta: a + Math.min(2.2, Math.max(0.4, b - a)) };
  }
  return { desde, hasta: desde + Math.min(2.2, Math.max(0.4, [...texto].length / 14)) };
}

/** Las palabras de la nota en pantalla, emparejadas en orden con las de la voz (o repartidas si no se encuentran). */
function palabrasDeNota(e: Extract<EscenaIconos, { tipo: 'nota' }>, palabras: readonly PalabraEscena[], desde: number, hasta: number): { texto: string; frase: number; entra: number }[] {
  const frases = e.frases ?? partirEnFrases(e.texto);
  const lista = frases.flatMap((f, k) => trozos(f).map((t) => ({ texto: t, frase: k })));
  const voz = palabras.map((p) => normalizar(p.texto));
  let cursor = 0;
  const encontrados: (number | null)[] = lista.map((w) => {
    const buscada = normalizar(w.texto);
    for (let i = cursor; i < voz.length && i < cursor + 6; i++) {
      if (voz[i] === buscada) {
        cursor = i + 1;
        return Math.max(desde, palabras[i].inicio - ANTICIPO);
      }
    }
    return null;
  });
  // Huecos: repartidos entre los vecinos encontrados (o entre `desde` y `hasta`).
  const salida: number[] = [];
  let i = 0;
  while (i < encontrados.length) {
    const c = encontrados[i];
    if (c !== null) {
      salida.push(c);
      i++;
      continue;
    }
    let j = i;
    while (j < encontrados.length && encontrados[j] === null) j++;
    const a = i > 0 ? salida[i - 1] : desde;
    const b = j < encontrados.length ? (encontrados[j] as number) : hasta;
    const n = j - i;
    for (let k = 0; k < n; k++) salida.push(a + (Math.max(a, b) - a) * ((k + (i > 0 ? 1 : 0)) / (n + (i > 0 ? 1 : 0))));
    i = j;
  }
  return lista.map((w, k) => ({ ...w, entra: salida[k] }));
}

/** Las frases de un texto (cortadas tras . ! ? …). */
export function partirEnFrases(texto: string): string[] {
  return (texto.match(/[^.!?…]+[.!?…]*/g) ?? [texto]).map((f) => f.trim()).filter((f) => f.length > 0);
}

export function tiemposDeEscena(escena: EscenaLista<EscenaIconos>): Tiempos {
  const e = escena.datos;
  const palabras = palabrasDeEscena(escena, e.texto);
  const habla = finDelHabla(escena, e.texto);
  switch (e.tipo) {
    case 'titulo': {
      const cursiva = escritura(palabras, e.cursiva, 0.05);
      const subtituloSinBarra = e.subtitulo.replace(/[/|·•-]/g, ' ').trim();
      const pistas = [{ en: e.titulo_en, texto: e.titulo }, ...(e.subtitulo !== '' ? [{ en: e.subtitulo_en, texto: subtituloSinBarra }] : [])];
      const desde = e.cursiva === '' ? 0.1 : Math.min(cursiva.hasta, 0.6);
      const [titulo, subtitulo] = momentos(escena, e.texto, pistas, desde, Math.max(desde + 0.8, Math.min(habla, desde + 2.4)));
      const sub = e.subtitulo === '' ? null : Math.max(subtitulo, titulo + 0.45);
      return { tipo: 'titulo', cursiva, titulo, subtitulo: sub, icono: e.icono === undefined ? null : titulo + 0.07 };
    }
    case 'orbita': {
      const porDefecto = Math.max(0.9, habla * 0.32);
      const [orbita, latido] = momentos(escena, e.texto, [{ en: e.orbita_en }, { en: e.latido_en }], 0.6, habla);
      return {
        tipo: 'orbita',
        orbita: e.orbita_en === undefined ? porDefecto : Math.max(0.5, orbita),
        latido: e.latido_en === undefined ? null : Math.max(latido, (e.orbita_en === undefined ? porDefecto : orbita) + 0.5),
      };
    }
    case 'pregunta': {
      const cursiva = escritura(palabras, e.cursiva, 0.05);
      const desde = e.cursiva === '' ? 0.05 : Math.min(cursiva.hasta, 0.9);
      const [titulo] = momentos(escena, e.texto, [{ en: e.titulo_en, texto: e.titulo }], desde, habla);
      return { tipo: 'pregunta', cursiva, titulo };
    }
    case 'figura': {
      const pistas = [...e.burbujas.map((b) => ({ en: b.en })), ...(e.icono_arriba !== undefined ? [{ en: e.icono_arriba_en }] : [])];
      const t = momentos(escena, e.texto, pistas, 0.7, habla);
      // Sin ancla, las burbujas se reparten entre el aterrizaje y el final de la voz (no se amontonan al principio).
      const n = pistas.length;
      const repartidos = t.map((x, i) => (pistas[i].en === undefined ? 0.7 + ((habla - 0.7) * (i + 0.5)) / Math.max(1, n) : x));
      const [lat] = momentos(escena, e.texto, [{ en: e.latido_en }], 0.7, habla);
      return {
        tipo: 'figura',
        burbujas: repartidos.slice(0, e.burbujas.length),
        iconoArriba: e.icono_arriba === undefined ? null : repartidos[e.burbujas.length],
        latido: e.latido_en === undefined ? null : lat,
      };
    }
    case 'tarjetas': {
      const pistas = e.tarjetas.flatMap((t) => [{ en: t.en, texto: t.titulo, estricta: true }, ...t.items.map((it) => ({ en: it.en, texto: it.texto }))]);
      const t = momentos(escena, e.texto, pistas, 0.15, Math.max(0.6, habla - 0.2));
      let k = 0;
      const tarjetas = e.tarjetas.map((tj) => {
        const entra = t[k++];
        const items = tj.items.map(() => t[k++]);
        const primero = Math.min(...items);
        return { entra: Math.max(0, Math.min(entra, primero - 0.25)), items };
      });
      return { tipo: 'tarjetas', tarjetas };
    }
    case 'nota': {
      const cursiva = { desde: 0.05, hasta: 0.05 + Math.min(1.2, Math.max(0.4, [...e.cursiva].length / 10)) };
      return { tipo: 'nota', cursiva, palabras: palabrasDeNota(e, palabras, 0.3, Math.max(0.5, habla - 0.2)) };
    }
    case 'cierre': {
      if (e.invitacion === '') return { tipo: 'cierre', invitacion: null };
      const [inv] = momentos(escena, e.texto, [{ texto: e.invitacion }], 0.3, habla);
      return { tipo: 'cierre', invitacion: inv };
    }
  }
}
