// El plan del video, portado de MOTION (plantilla M3, piano.ts): de las escenas ya colocadas en el tiempo, todo lo que
// hace falta para dibujar un fotograma.
//   - escenas: tramo en fotogramas y salida (como en el original: corte seco tras la apertura y la órbita; la figura
//     crece y desaparece; las tarjetas resbalan hacia abajo con estela; la nota se desvanece);
//   - encabezados: el título de una pregunta queda como encabezado en las escenas que siguen; uno igual al anterior
//     se queda quieto, uno nuevo entra desenfocado. Abajo (con la figura) o arriba (con las tarjetas), y sube cuando
//     cambia de sitio; la cursiva y la línea de debajo solo se ven abajo;
//   - cuadrícula: fina durante la apertura y la órbita; el corte a la ancha cae al empezar la primera escena de otro
//     tipo.
// Sin JSX: lo puede cargar Node.

import type { EscenaLista } from '../../comun/guion.ts';
import { tiemposDeEscena, type Tiempos } from './apariciones.ts';
import { FIGURAS_DIBUJADAS, type EscenaIconos } from './reglas.ts';

export type Salida = 'corte' | 'abajo' | 'crece' | 'desvanece' | 'ninguna';
export type PosicionEncabezado = 'centro' | 'alto';

export interface EscenaPlan {
  readonly escena: EscenaLista<EscenaIconos>;
  readonly datos: EscenaIconos;
  readonly indice: number;
  /** Primer fotograma (incluido) y fotograma siguiente al último. */
  readonly inicio: number;
  readonly fin: number;
  readonly salida: Salida;
  /** Fotogramas de la salida (antes de `fin`). */
  readonly duracionSalida: number;
  readonly tiempos: Tiempos;
  /** El encabezado activo en esta escena (null = ninguno). */
  readonly encabezado: string | null;
}

export interface EncabezadoPlan {
  readonly texto: string;
  /** Fotograma de entrada del encabezado. */
  readonly entra: number;
  /** La cursiva de la pregunta que lo acompaña (solo abajo). */
  readonly cursiva: { readonly texto: string; readonly desde: number; readonly hasta: number } | null;
  readonly inicio: number;
  readonly fin: number;
  readonly salida: Salida;
  readonly duracionSalida: number;
  /** Para cada escena del grupo: dónde empieza y en qué posición va el encabezado. */
  readonly etapas: readonly { readonly inicio: number; readonly posicion: PosicionEncabezado }[];
}

export interface Plan {
  readonly escenas: readonly EscenaPlan[];
  readonly encabezados: readonly EncabezadoPlan[];
  readonly cambioRejilla: number | null;
}

function salidaDe(e: EscenaIconos, hayOtra: boolean): { salida: Salida; duracion: number } {
  if (!hayOtra) return { salida: 'ninguna', duracion: 0 };
  switch (e.tipo) {
    case 'titulo':
    case 'orbita':
      return { salida: 'corte', duracion: 0 };
    case 'pregunta':
      return { salida: 'ninguna', duracion: 0 };
    case 'figura':
      return { salida: 'crece', duracion: 6 };
    case 'tarjetas':
      return { salida: 'abajo', duracion: 13 };
    case 'nota':
      return { salida: 'desvanece', duracion: 5 };
    case 'cierre':
      return { salida: 'ninguna', duracion: 0 };
  }
}

const igual = (a: string, b: string): boolean => a.trim().toLocaleUpperCase('es') === b.trim().toLocaleUpperCase('es');

export function planificar(escenas: readonly EscenaLista<EscenaIconos>[], fps: number, total: number): Plan {
  let activo: string | null = null;
  const lista: EscenaPlan[] = escenas.map((escena, i) => {
    const d = escena.datos;
    let encabezado: string | null = null;
    if (d.tipo === 'pregunta') encabezado = d.titulo;
    else if (d.tipo === 'figura' || d.tipo === 'tarjetas') encabezado = d.encabezado === undefined ? activo : d.encabezado.trim() === '' ? null : d.encabezado;
    activo = encabezado;
    const s = salidaDe(d, i + 1 < escenas.length);
    return {
      escena,
      datos: d,
      indice: i,
      inicio: Math.round(escena.inicio * fps),
      fin: i + 1 < escenas.length ? Math.round(escenas[i + 1].inicio * fps) : total,
      salida: s.salida,
      duracionSalida: s.duracion,
      tiempos: tiemposDeEscena(escena),
      encabezado,
    };
  });

  // Encabezados: grupos de escenas seguidas con el mismo texto.
  const encabezados: EncabezadoPlan[] = [];
  let grupo: { texto: string; entra: number; cursiva: EncabezadoPlan['cursiva']; miembros: EscenaPlan[] } | null = null;
  const cerrar = (): void => {
    if (grupo === null) return;
    const ultimo = grupo.miembros[grupo.miembros.length - 1];
    const hayOtra = ultimo.indice + 1 < lista.length;
    const salida: Salida = ultimo.salida === 'ninguna' && hayOtra ? 'desvanece' : ultimo.salida;
    encabezados.push({
      texto: grupo.texto,
      entra: grupo.entra,
      cursiva: grupo.cursiva,
      inicio: grupo.miembros[0].inicio,
      fin: ultimo.fin,
      salida,
      duracionSalida: ultimo.salida === 'ninguna' && hayOtra ? 5 : ultimo.duracionSalida,
      etapas: grupo.miembros.map((m) => ({ inicio: m.inicio, posicion: m.datos.tipo === 'tarjetas' ? 'alto' : 'centro' })),
    });
    grupo = null;
  };
  for (const s of lista) {
    if (s.encabezado === null) {
      cerrar();
      continue;
    }
    if (grupo !== null && igual(grupo.texto, s.encabezado)) {
      grupo.miembros.push(s);
      continue;
    }
    cerrar();
    const t = s.tiempos;
    const d = s.datos;
    const cursiva =
      t.tipo === 'pregunta' && d.tipo === 'pregunta' && d.cursiva !== ''
        ? { texto: d.cursiva, desde: s.inicio + Math.round(t.cursiva.desde * fps), hasta: s.inicio + Math.round(t.cursiva.hasta * fps) }
        : null;
    const entra = t.tipo === 'pregunta' ? s.inicio + Math.round(t.titulo * fps) : s.inicio;
    grupo = { texto: s.encabezado, entra, cursiva, miembros: [s] };
  }
  cerrar();

  const iniciales = ['titulo', 'orbita'];
  let cambioRejilla: number | null = null;
  if (lista.length > 0 && iniciales.includes(lista[0].datos.tipo)) {
    const otra = lista.find((s) => !iniciales.includes(s.datos.tipo));
    cambioRejilla = otra === undefined ? total : otra.inicio;
  }
  return { escenas: lista, encabezados, cambioRejilla };
}

/** Los íconos que usa el guion (para cargarlos antes del primer fotograma). */
export function iconosUsados(escenas: readonly EscenaLista<EscenaIconos>[]): string[] {
  const nombres = new Set<string>();
  const figura = (f: string): void => {
    nombres.add(f);
  };
  for (const { datos: d } of escenas) {
    switch (d.tipo) {
      case 'titulo':
        if (d.icono !== undefined) nombres.add(d.icono);
        figura(d.figura);
        break;
      case 'orbita':
        figura(d.figura);
        d.iconos.forEach((n) => nombres.add(n));
        break;
      case 'figura':
        figura(d.figura);
        if (d.icono_arriba !== undefined) nombres.add(d.icono_arriba);
        break;
      case 'tarjetas':
        d.tarjetas.forEach((t) => t.items.forEach((it) => nombres.add(it.icono)));
        break;
      case 'cierre':
        if (d.icono !== undefined) nombres.add(d.icono);
        break;
      default:
        break;
    }
  }
  // Las figuras dibujadas no son íconos de Phosphor.
  for (const n of FIGURAS_DIBUJADAS) nombres.delete(n);
  return [...nombres];
}
