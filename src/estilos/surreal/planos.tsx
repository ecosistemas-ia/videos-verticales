// Lo que se ve en cada plano de surreal: los bloques de texto que entran desenfocados, el objeto (dibujado o la imagen
// del guion en blanco y negro) con la cámara que lo aleja o lo acerca, el tablero y la mesa. Medidas de la maqueta 9:16
// de MOTION (impaginazione.ts), con el texto centrado en la parte libre de los botones de la red social.

import type { ReactNode } from 'react';
import { Img, staticFile } from 'remotion';
import { ALTO, ANCHO } from '../../comun/guion.ts';
import type { EscenaLista } from '../../comun/guion.ts';
import type { NombreObjeto } from '../_papel/catalogo.ts';
import { CURVAS, anima, escalaEntre, frenada } from '../_papel/curvas.ts';
import { OBJETOS_DIBUJADOS, PALETA_NEUTRA, PintaDibujo, encajar } from '../_papel/dibujos.tsx';
import type { Caja, Paleta } from '../_papel/dibujos.tsx';
import { CuadriculaPunteada } from '../_papel/fondo.tsx';
import type { Tipo } from '../_papel/fuentes.ts';
import { conInicial, momentosDeTrozos } from '../_papel/lineas.ts';
import type { Linea } from '../_papel/lineas.ts';
import { LineaTexto, posarBloque } from '../_papel/texto.tsx';
import type { Alineacion } from '../_papel/texto.tsx';
import type { PasoSurreal } from '../_papel/pasos.ts';
import { MesaDesdeArriba, Tablero } from './piezas.tsx';
import { desfaseSurreal, textoPantalla, textoVozSurreal } from './reglas.ts';
import type { AjustesSurreal, EscenaSurreal, EstiloLinea } from './reglas.ts';

export const FAMILIA = 'Montserrat Papel';
export const PAPEL = '#FCF9F6';
/** El centro y el ancho del texto: la parte del cuadro que no tapan los botones de la derecha. */
export const X_CENTRO = 505;
export const ANCHO_TEXTO = 840;

export const TIPOS: { readonly [e in EstiloLinea]: { readonly tipo: Tipo; readonly cuerpo: number; readonly color: string } } = {
  pequena: { tipo: { familia: FAMILIA, peso: 400, espaciado: -0.03 }, cuerpo: 46, color: '#14120E' },
  media: { tipo: { familia: FAMILIA, peso: 500, espaciado: -0.03 }, cuerpo: 78, color: '#14120E' },
  grande: { tipo: { familia: FAMILIA, peso: 700, espaciado: -0.04 }, cuerpo: 128, color: '#1C1A18' },
  clave: { tipo: { familia: FAMILIA, peso: 700, espaciado: -0.04 }, cuerpo: 146, color: '#797773' },
};
const TIPO_PUNTO: Tipo = { familia: FAMILIA, peso: 600, espaciado: -0.02 };

/** Blanco y negro con un poco más de contraste, y la sombra corta de un recorte apoyado en el papel. */
const FILTRO_OBJETO = 'grayscale(1) contrast(1.08) drop-shadow(0 16px 14px rgba(0,0,0,0.2))';

export interface Contexto {
  readonly escena: EscenaLista<EscenaSurreal>;
  readonly indice: number;
  readonly f: number;
  readonly fps: number;
  /** El primer fotograma en que se ve la escena. */
  readonly limite: number;
  readonly ajustes: AjustesSurreal;
  readonly paleta: Paleta;
  /** Cómo entró la escena: con «detalle», la cámara entra desde un primer plano del objeto. */
  readonly paso: PasoSurreal;
}

/** La cámara del detalle: de un primer plano ×4,2 a ×1,2 en medio segundo, y luego se posa en ×1. */
function escalaDetalle(t: number): number {
  return t < 0.5 ? escalaEntre(4.2, 1.2, CURVAS.frena(t / 0.5)) : escalaEntre(1.2, 1, CURVAS.respira(Math.min(1, (t - 0.5) / 2.2)));
}

// ---------------------------------------------------------------------------------------------------------------------
// Texto.

/**
 * El fotograma en que entra cada trozo en pantalla: la primera línea, un fotograma después de su palabra; las demás,
 * hasta 12 fotogramas antes de la suya y al menos 4 después de la anterior (MOTION, entrataSfocata).
 */
export function entradas(c: Contexto, trozos: readonly string[]): number[] {
  const texto = textoVozSurreal(c.escena.datos);
  const desfase = c.escena.voz?.desfase ?? desfaseSurreal(c.escena.datos);
  const palabras = momentosDeTrozos(c.escena, texto, desfase, trozos).map((s) => Math.round(s * c.fps));
  const r: number[] = [];
  palabras.forEach((w, k) => r.push(k === 0 ? Math.max(c.limite + 1, w + 1) : Math.max(r[k - 1] + 4, w - 12)));
  return r;
}

/** Una línea que entra desenfocada, transparente y 20 px más arriba, y se posa en 8 fotogramas. */
export function entradaDesenfocada(f: number, inicio: number): { readonly opacity: number; readonly filter?: string; readonly transform: string } | null {
  if (f < inicio) return null;
  const q = anima(f, [inicio, inicio + 8], [0, 1], CURVAS.frena);
  const b = 16 * (1 - q);
  return { opacity: q, filter: b > 0.05 ? `blur(${b.toFixed(2)}px)` : undefined, transform: `translateY(${(-20 * (1 - q)).toFixed(2)}px)` };
}

type Ancla = { readonly arriba: number } | { readonly abajo: number } | { readonly centro: number };

export function BloqueSurreal({ lineas, inicios, x, ancla, alineacion = 'centro', escala = 1, escalas, anchoMax = ANCHO_TEXTO, f, mayusculas, blanco = false }: { readonly lineas: readonly Linea<EstiloLinea>[]; readonly inicios: readonly number[]; readonly x: number; readonly ancla: Ancla; readonly alineacion?: Alineacion; readonly escala?: number; readonly escalas?: { readonly [e in EstiloLinea]?: number }; readonly anchoMax?: number; readonly f: number; readonly mayusculas: boolean; readonly blanco?: boolean }): ReactNode {
  if (lineas.length === 0) return null;
  const piezas = lineas.map((l) => {
    const t = TIPOS[l.estilo];
    return { texto: conInicial(l.texto, mayusculas), tipo: t.tipo, cuerpo: t.cuerpo * escala * (escalas?.[l.estilo] ?? 1) * (l.tamano ?? 1), color: blanco ? (l.estilo === 'clave' ? '#9C9893' : '#F4F2EE') : t.color };
  });
  const b = posarBloque(piezas, anchoMax);
  const y0 = 'arriba' in ancla ? ancla.arriba : 'abajo' in ancla ? ancla.abajo - b.alto : ancla.centro - b.alto / 2;
  return (
    <>
      {b.lineas.map((l, i) => {
        const e = entradaDesenfocada(f, inicios[i] ?? 0);
        return e === null ? null : <LineaTexto key={i} linea={l} x={x} base={y0 + l.base} alineacion={alineacion} estilo={e} />;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Objetos.

/** Un objeto del catálogo (o la imagen del guion) dentro de su caja, en blanco y negro. */
function Objeto({ nombre, imagen, caja, id, t, alinear = 'abajo' }: { readonly nombre: NombreObjeto; readonly imagen?: string; readonly caja: Caja; readonly id: string; readonly t: number; readonly alinear?: 'abajo' | 'centro' }): ReactNode {
  if (imagen !== undefined) {
    return <Img src={staticFile(imagen)} style={{ position: 'absolute', left: caja.x - caja.w / 2, top: caja.y - caja.h / 2, width: caja.w, height: caja.h, objectFit: 'contain', objectPosition: alinear === 'abajo' ? '50% 100%' : '50% 50%', filter: FILTRO_OBJETO }} />;
  }
  const d = OBJETOS_DIBUJADOS[nombre];
  const r = encajar(d.w, d.h, caja, alinear);
  return <PintaDibujo dibujo={d} {...r} id={id} t={t} paleta={PALETA_NEUTRA} filtro={FILTRO_OBJETO} />;
}

/** La cámara sobre el objeto: escala alrededor del centro de su caja. */
function Camara({ escala, cx, cy, children, extra }: { readonly escala: number; readonly cx: number; readonly cy: number; readonly children: ReactNode; readonly extra?: string }): ReactNode {
  return <div style={{ position: 'absolute', left: 0, top: 0, width: ANCHO, height: ALTO, transformOrigin: `${cx}px ${cy}px`, transform: `${extra ?? ''} scale(${escala.toFixed(4)})` }}>{children}</div>;
}

// ---------------------------------------------------------------------------------------------------------------------
// Planos.

export function ContenidoEscena(c: Contexto): ReactNode {
  const d = c.escena.datos;
  const t = Math.max(0, (c.f - c.limite) / c.fps);
  const id = `s${c.indice}`;
  const may = c.ajustes.mayusculas;
  switch (d.plano) {
    case 'objeto': {
      const ins = entradas(c, textoPantalla(d));
      const nA = d.arriba.length;
      const cae = d.camara === 'cae';
      let caja: Caja;
      let bloques: ReactNode;
      if (cae) {
        caja = { x: ANCHO * 0.56, y: ALTO * 0.63, w: ANCHO * 0.62, h: ALTO * 0.3 };
        bloques = <BloqueSurreal lineas={[...d.arriba, ...d.abajo]} inicios={ins} x={ANCHO * 0.2} ancla={{ centro: ALTO * 0.4 }} alineacion="izquierda" anchoMax={ANCHO * 0.66} f={c.f} mayusculas={may} />;
      } else if (d.abajo.length > 0) {
        caja = { x: ANCHO * 0.5, y: ALTO * 0.49, w: ANCHO * 0.56, h: ALTO * 0.25 };
        bloques = (
          <>
            <BloqueSurreal lineas={d.arriba} inicios={ins.slice(0, nA)} x={X_CENTRO} ancla={{ abajo: ALTO * 0.35 }} f={c.f} mayusculas={may} />
            <BloqueSurreal lineas={d.abajo} inicios={ins.slice(nA)} x={X_CENTRO} ancla={{ arriba: ALTO * 0.628 }} f={c.f} mayusculas={may} />
          </>
        );
      } else if (nA > 0) {
        caja = { x: ANCHO * 0.5, y: ALTO * 0.535, w: ANCHO * 0.8, h: ALTO * 0.4 };
        bloques = <BloqueSurreal lineas={d.arriba} inicios={ins} x={X_CENTRO} ancla={{ abajo: ALTO * 0.292 }} f={c.f} mayusculas={may} />;
      } else {
        caja = { x: ANCHO * 0.5, y: ALTO * 0.5, w: ANCHO * 0.84, h: ALTO * 0.48 };
        bloques = null;
      }
      // La cámara: se aleja desde cerca, entra desde un primer plano, el objeto cae o queda casi quieta.
      let escala = 1;
      let extra = '';
      let filtro: string | undefined;
      if (d.camara === 'detalle' || (c.paso === 'detalle' && !cae)) escala = escalaDetalle(t);
      else if (d.camara === 'aleja') escala = frenada(t, 1.31, 1, 0.55, 2.6);
      else if (d.camara === 'quieta') escala = escalaEntre(1.035, 1, Math.min(1, t / 3));
      else {
        const q = anima(c.f, [c.limite, c.limite + Math.round(c.fps * 0.8)], [0, 1], CURVAS.frena);
        const dy = -1150 * (1 - q) + 22 * t;
        const giro = -38 * (1 - q) + 5 * t;
        extra = `translate(0px, ${dy.toFixed(1)}px) rotate(${giro.toFixed(2)}deg)`;
        filtro = q < 0.98 ? `blur(${(10 * (1 - q)).toFixed(2)}px)` : undefined;
      }
      const dos = d.segundo !== undefined;
      const objetos = dos ? (
        <>
          <Objeto nombre={d.objeto} imagen={d.imagen} caja={{ x: caja.x - caja.w * 0.24, y: caja.y + caja.h * 0.04, w: caja.w * 0.46, h: caja.h * 0.88 }} id={`${id}-a`} t={t} />
          <Objeto nombre={d.segundo ?? d.objeto} caja={{ x: caja.x + caja.w * 0.24, y: caja.y, w: caja.w * 0.5, h: caja.h }} id={`${id}-b`} t={t} />
        </>
      ) : (
        <Objeto nombre={d.objeto} imagen={d.imagen} caja={caja} id={id} t={t} alinear={cae ? 'centro' : 'abajo'} />
      );
      return (
        <>
          <CuadriculaPunteada cx={caja.x} cy={caja.y} columnas={4} filas={4} id={`${id}-cuad`} />
          <Camara escala={escala} cx={caja.x} cy={caja.y} extra={extra}>
            <div style={{ position: 'absolute', inset: 0, filter: filtro }}>{objetos}</div>
          </Camara>
          {bloques}
        </>
      );
    }
    case 'lista': {
      const ins = entradas(c, d.items);
      const y0 = ALTO * 0.249;
      const paso = ALTO * 0.057;
      const caja: Caja = { x: ANCHO * 0.5, y: ALTO * 0.69, w: ANCHO * 0.8, h: ALTO * 0.56 };
      const escala = c.paso === 'detalle' ? escalaDetalle(t) : frenada(t, 1.064, 1, 0.5, 2) * (1 + 0.006 * Math.sin(t * 1.3));
      return (
        <>
          <CuadriculaPunteada cx={ANCHO * 0.5} cy={y0 + paso} columnas={5} filas={3} id={`${id}-cuad`} />
          {d.objeto !== undefined || d.imagen !== undefined ? (
            <Camara escala={escala} cx={caja.x} cy={caja.y + caja.h / 2}>
              <Objeto nombre={d.objeto ?? 'monitor'} imagen={d.imagen} caja={caja} id={id} t={t} />
            </Camara>
          ) : null}
          {d.items.map((texto, i) => {
            const e = entradaDesenfocada(c.f, ins[i]);
            if (e === null) return null;
            const base = y0 + i * paso;
            return (
              <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: ANCHO, height: ALTO, ...e }}>
                <svg style={{ position: 'absolute', left: ANCHO * 0.215 - 11, top: base - 30 }} width={22} height={20} viewBox="0 0 22 20">
                  <path d="M 1 2 L 21 2 L 11 18 Z" fill="#14120E" />
                </svg>
                <LineaTexto linea={{ texto: conInicial(texto, may), tipo: TIPO_PUNTO, cuerpo: 56, color: '#14120E' }} x={ANCHO * 0.272} base={base} alineacion="izquierda" />
              </div>
            );
          })}
        </>
      );
    }
    case 'tablero': {
      const ins = entradas(c, d.lineas.map((l) => l.texto));
      const horizonte = ALTO * 0.555;
      const escala = frenada(t, 1.176, 1, 0.22, 1.2);
      return (
        <>
          <Camara escala={escala} cx={ANCHO * 0.52} cy={horizonte}>
            <Tablero ancho={ANCHO} alto={ALTO} horizonte={horizonte} papel={PAPEL} id={id} t={t} />
          </Camara>
          <BloqueSurreal lineas={d.lineas} inicios={ins} x={ANCHO * 0.1} ancla={{ centro: ALTO * 0.357 }} alineacion="izquierda" escala={0.86} anchoMax={ANCHO * 0.8} f={c.f} mayusculas={may} />
        </>
      );
    }
    case 'chincheta': {
      const ins = entradas(c, d.lineas.map((l) => l.texto));
      const caja: Caja = { x: ANCHO * 0.49, y: ALTO * 0.63, w: ANCHO * 0.56, h: ALTO * 0.3 };
      return (
        <>
          <CuadriculaPunteada cx={ANCHO * 0.49} cy={ALTO * 0.43} columnas={4} filas={3} id={`${id}-cuad`} />
          {d.objeto !== undefined || d.imagen !== undefined ? (
            <Camara escala={c.paso === 'detalle' ? escalaDetalle(t) : escalaEntre(1.05, 1, CURVAS.frena(Math.min(1, t / 1.2)))} cx={caja.x} cy={caja.y}>
              <Objeto nombre={d.objeto ?? 'lupa'} imagen={d.imagen} caja={caja} id={id} t={t} alinear="centro" />
            </Camara>
          ) : null}
          <BloqueSurreal lineas={d.lineas} inicios={ins} x={X_CENTRO + 22} ancla={{ arriba: ALTO * 0.336 + 92 }} escala={0.62} escalas={{ pequena: 1.3, media: 1.1 }} f={c.f} mayusculas={may} />
        </>
      );
    }
    case 'mesa': {
      const ins = entradas(c, d.lineas.map((l) => l.texto));
      const escala = escalaEntre(0.9, 1, CURVAS.suave(Math.min(1, t / Math.max(1, c.escena.duracion))));
      return (
        <>
          <Camara escala={escala} cx={ANCHO * 0.5} cy={ALTO * 0.5}>
            <MesaDesdeArriba cx={ANCHO * 0.5} cy={ALTO * 0.5} personas={d.personas} id={id} />
          </Camara>
          <BloqueSurreal lineas={d.lineas} inicios={ins} x={ANCHO * 0.5} ancla={{ centro: ALTO * 0.5 }} escala={0.5} escalas={{ pequena: 1.35 }} anchoMax={380} f={c.f} mayusculas={may} />
        </>
      );
    }
    case 'frase': {
      const ins = entradas(c, d.lineas.map((l) => l.texto));
      return (
        <>
          <CuadriculaPunteada cx={X_CENTRO} cy={ALTO * 0.475} columnas={4} filas={4} id={`${id}-cuad`} />
          <BloqueSurreal lineas={d.lineas} inicios={ins} x={X_CENTRO} ancla={{ centro: ALTO * 0.475 }} f={c.f} mayusculas={may} />
        </>
      );
    }
    case 'cierre':
      return null;
  }
}
