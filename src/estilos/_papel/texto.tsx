// La maqueta de los bloques de texto de los estilos de papel, portada de MOTION (posaBlocco y TestoRiga): cada línea
// se mide en el navegador, se estrecha si no cabe y se apila sobre la tinta (la parte de arriba de las mayúsculas o de
// la x, y los descendentes solo si los hay), no sobre la caja de la fuente. Así dos líneas de cuerpos muy distintos
// quedan a la distancia que ve el ojo. Hace falta que las fuentes estén cargadas (useFuentes).

import type { CSSProperties, ReactNode } from 'react';
import { anchoTexto, baseEnCaja, tinta } from './fuentes.ts';
import type { Tipo } from './fuentes.ts';

export interface PiezaTexto {
  readonly texto: string;
  readonly tipo: Tipo;
  readonly cuerpo: number;
  readonly color: string;
}

export interface LineaPosada extends PiezaTexto {
  /** La línea base, en px desde el borde de arriba de la tinta del bloque. */
  readonly base: number;
  readonly ancho: number;
  readonly arriba: number;
  readonly abajo: number;
}

export interface Bloque {
  readonly lineas: readonly LineaPosada[];
  /** De la tinta de arriba de la primera línea a la de abajo de la última. */
  readonly alto: number;
  readonly ancho: number;
}

/**
 * Posa un bloque: cada línea se estrecha si pasa de `anchoMax` y las líneas se apilan con un hueco de tinta a tinta de
 * `hueco(a, b)` (por defecto, el 11 % del cuerpo menor y nunca menos de 7 px).
 */
export function posarBloque(piezas: readonly PiezaTexto[], anchoMax: number, hueco?: (a: PiezaTexto, b: PiezaTexto) => number): Bloque {
  const lineas: LineaPosada[] = [];
  let y = 0;
  let ancho = 0;
  piezas.forEach((p, i) => {
    const natural = anchoTexto(p.texto, p.cuerpo, p.tipo);
    const cuerpo = natural > anchoMax ? (p.cuerpo * anchoMax) / natural : p.cuerpo;
    const w = Math.min(natural, anchoMax);
    const t = tinta(p.texto, cuerpo, p.tipo);
    if (i > 0) {
      const anterior = lineas[i - 1];
      y += anterior.abajo + (hueco ? hueco(anterior, { ...p, cuerpo }) : Math.max(7, 0.11 * Math.min(anterior.cuerpo, cuerpo)));
    }
    y += t.arriba;
    lineas.push({ ...p, cuerpo, base: y, ancho: w, arriba: t.arriba, abajo: t.abajo });
    y += 0;
    ancho = Math.max(ancho, w);
  });
  const ultima = lineas[lineas.length - 1];
  return { lineas, alto: ultima === undefined ? 0 : ultima.base + ultima.abajo, ancho };
}

export type Alineacion = 'centro' | 'izquierda' | 'derecha';

/**
 * Una línea en el cuadro: `x` es el centro, el borde izquierdo o el derecho según la alineación; `base` es la línea
 * base en px del cuadro. El estilo extra (opacidad, desenfoque, transformación) lo pone cada estilo.
 */
export function LineaTexto({ linea, x, base, alineacion = 'centro', estilo, children }: { readonly linea: PiezaTexto; readonly x: number; readonly base: number; readonly alineacion?: Alineacion; readonly estilo?: CSSProperties; readonly children?: ReactNode }): ReactNode {
  const c = linea.cuerpo;
  const top = base - baseEnCaja(linea.tipo, c);
  const ancho = 2000;
  const left = alineacion === 'centro' ? x - ancho / 2 : alineacion === 'izquierda' ? x : x - ancho;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: ancho,
        height: c,
        lineHeight: `${c}px`,
        fontFamily: `"${linea.tipo.familia}"`,
        fontWeight: linea.tipo.peso,
        fontSize: c,
        letterSpacing: `${linea.tipo.espaciado}em`,
        color: linea.color,
        whiteSpace: 'pre',
        textAlign: alineacion === 'centro' ? 'center' : alineacion === 'izquierda' ? 'left' : 'right',
        transformOrigin: alineacion === 'centro' ? '50% 60%' : alineacion === 'izquierda' ? '0% 60%' : '100% 60%',
        ...estilo,
      }}
    >
      {children ?? linea.texto}
    </div>
  );
}
