// Los dos planos con figura, portados de MOTION (plantilla M3):
//   - «orbita»: la figura llega grande y desenfocada al centro y se posa, luego respira (zoom lento); sobre su palabra
//     llega la órbita con el anillo de estelas y los íconos a dos colores giran; sobre `latido_en` todo late. Sale con
//     un corte seco;
//   - «figura»: bajo el encabezado la figura cae grande y se posa, aparece su sombra; las burbujas saltan sobre su
//     palabra (corazón arriba, mensajes a los lados) y el ícono sobre la cabeza aparece con dos destellos. Sale
//     creciendo y desapareciendo.

import type { ReactNode } from 'react';
import { CURVAS, animar } from '../curvas.ts';
import { DISENO } from '../diseno.ts';
import { Burbuja, Figura, cuadro, posicionBurbuja } from '../figuras.tsx';
import { Icono } from '../Icono.tsx';
import { entradaGrande, latido, respiro, salto } from '../movimientos.tsx';
import { Orbita } from '../Orbita.tsx';
import { estadoSalida, fotogramaDe, type PropsEscena } from './comunes.ts';

export function EscenaOrbita({ s, f, fps, colores, iconos }: PropsEscena): ReactNode {
  if (s.datos.tipo !== 'orbita' || s.tiempos.tipo !== 'orbita') return null;
  const d = s.datos;
  const t = s.tiempos;
  const O = DISENO.orbita;
  const u = O.u;
  const e = entradaGrande(f, s.inicio, { duracion: 12, escala: 2.2, desenfoque: 8 * u });
  const r = respiro(f, s.inicio + 16, s.fin, 0.02);
  const l = latido(f, t.latido === null ? null : fotogramaDe(s, t.latido, fps));
  // Un ícono como figura es más ancho que las dibujadas: se ajusta para caber dentro del círculo.
  const c = cuadro(d.figura);
  const escala = Math.min(u, (O.radio * 1.25) / Math.max(c.w, c.h));
  return (
    <div style={{ position: 'absolute', inset: 0, transform: l === 1 ? undefined : `scale(${l.toFixed(4)})`, transformOrigin: `${O.cx}px ${O.cy}px` }}>
      <Figura
        figura={d.figura}
        colores={colores}
        iconos={iconos}
        x={O.cx}
        pies={O.cy + (c.h / 2) * escala * 0.88}
        escala={escala}
        sombra={0}
        escalaExtra={e.escala * r}
        desenfoque={e.desenfoque}
        opacidad={e.opacidad}
      />
      <Orbita
        cx={O.cx}
        cy={O.cy}
        radio={O.radio}
        nombres={d.iconos}
        iconos={iconos}
        desde={fotogramaDe(s, t.orbita, fps)}
        fin={s.fin}
        fotograma={f}
        fps={fps}
        ladoIcono={O.ladoIcono}
        grosor={2 * u}
        trazo={7 * u}
        hueco={5.5 * u}
        colorIconos={colores.azul}
        colorFondoIconos={colores.acento}
      />
    </div>
  );
}

export function EscenaFigura({ s, f, fps, colores, iconos }: PropsEscena): ReactNode {
  if (s.datos.tipo !== 'figura' || s.tiempos.tipo !== 'figura') return null;
  const d = s.datos;
  const t = s.tiempos;
  const F = DISENO.figura;
  const c = cuadro(d.figura);
  const u = F.escala;
  const pies = s.encabezado === null ? F.pies - 90 : F.pies;
  const salida = estadoSalida(s, f);
  const e = entradaGrande(f, s.inicio, { duracion: 12, escala: 2.2, desenfoque: 8 * u });
  const l = latido(f, t.latido === null ? null : fotogramaDe(s, t.latido, fps));
  const r = respiro(f, s.inicio + 11, s.fin, 0.02) * salida.escala * l;
  const sombra = animar(f, [s.inicio + 6, s.inicio + 13], [0, 1], CURVAS.frena);
  return (
    <>
      <Figura
        figura={d.figura}
        colores={colores}
        iconos={iconos}
        x={F.x}
        pies={pies}
        escala={u}
        sombra={sombra}
        escalaExtra={e.escala * r}
        desenfoque={e.desenfoque}
        opacidad={e.opacidad * salida.opacidad}
      />
      {d.burbujas.map((b, i) => {
        const v = salto(f, fps, fotogramaDe(s, t.burbujas[i], fps));
        const { dx, dy } = posicionBurbuja(d.figura, b.lado);
        return (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: salida.opacidad }}>
            <Burbuja tipo={b.tipo} lado={b.lado} cx={F.x + dx * u * r} cy={pies + dy * u * r} escala={u} valor={v} />
          </div>
        );
      })}
      {d.icono_arriba !== undefined && t.iconoArriba !== null && f >= fotogramaDe(s, t.iconoArriba, fps)
        ? (() => {
            const desde = fotogramaDe(s, t.iconoArriba, fps);
            const q = animar(f, [desde, desde + 12], [0, 1], CURVAS.frena);
            const lado = 92 * u;
            const cx = F.x;
            const cy = pies - (c.h + 60) * u * r;
            const destello = (x: number, y: number, k: number): ReactNode => (
              <svg key={k} width={10 * u} height={10 * u} viewBox="-5 -5 10 10" style={{ position: 'absolute', left: x - 5 * u, top: y - 5 * u, opacity: q }}>
                <path d="M0,-5 L0,5 M-5,0 L5,0" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
              </svg>
            );
            return (
              <div style={{ position: 'absolute', inset: 0, opacity: salida.opacidad }}>
                <div style={{ position: 'absolute', left: cx - lado / 2, top: cy - lado / 2, opacity: q, transform: `scale(${0.8 + 0.2 * q})`, filter: `drop-shadow(0 ${2 * u}px ${3 * u}px rgba(0,0,0,0.35))` }}>
                  <Icono iconos={iconos} nombre={d.icono_arriba} estilo="lleno" lado={lado} color="#FFFFFF" />
                </div>
                {destello(cx - lado * 0.62, cy + lado * 0.18, 1)}
                {destello(cx + lado * 0.6, cy - lado * 0.22, 2)}
              </div>
            );
          })()
        : null}
    </>
  );
}
