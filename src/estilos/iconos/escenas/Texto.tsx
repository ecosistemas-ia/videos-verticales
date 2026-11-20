// Los planos de tarjetas y de texto, portados de MOTION (plantilla M3):
//   - «tarjetas»: bajo el encabezado (que sube) entran una o dos tarjetas sobre su palabra, y en cada una los ítems
//     uno a uno. Salen resbalando hacia abajo con estela, escalonadas: primero la de abajo, 6 fotogramas después la de
//     arriba, luego el encabezado;
//   - «nota»: «nota…» en cursiva y las frases en mayúsculas blancas (Montserrat 900) escritas palabra por palabra
//     cuando la voz las dice, con un asterisco rojo al principio y al final de cada frase. La maquetación es la final
//     desde el principio: las palabras aparecen en su sitio. Sale desvaneciéndose;
//   - «cierre»: la invitación en rojo (Anton) y un ícono que salta; el desenfoque final a negro lo pone Estilo.tsx.

import type { ReactNode } from 'react';
import { CURVAS, animar, rgb } from '../curvas.ts';
import { DISENO, PAPELES } from '../diseno.ts';
import { Icono } from '../Icono.tsx';
import { LETRAS, anchoTexto, correccionMayusculas, lineasEquilibradas } from '../letras.ts';
import { Saliente, salto } from '../movimientos.tsx';
import { Tarjeta } from '../Tarjeta.tsx';
import { Cursiva, TextoCentrado } from '../textos.tsx';
import { estadoSalida, estiloDe, fotogramaDe, tamanoPapel, type PropsEscena } from './comunes.ts';

export function EscenaTarjetas({ s, f, fps, colores, iconos }: PropsEscena): ReactNode {
  if (s.datos.tipo !== 'tarjetas' || s.tiempos.tipo !== 'tarjetas') return null;
  const d = s.datos;
  const t = s.tiempos;
  const T = DISENO.tarjetas;
  const posiciones = d.tarjetas.length === 1 ? [T.una] : T.dos;
  const origen = `${DISENO.cx}px ${DISENO.encabezado.alto}px`;
  const anticipo = (i: number): number => (d.tarjetas.length === 2 && i === 1 ? 10 : 4);
  // Sin encabezado, las tarjetas suben un poco para quedar centradas.
  const dy = s.encabezado === null ? -70 : 0;
  return (
    <>
      {d.tarjetas.map((tj, i) => (
        <Saliente key={i} estado={estadoSalida({ ...s, fin: s.fin - anticipo(i) }, f)} origen={origen}>
          <Tarjeta
            x={posiciones[i].x}
            y={posiciones[i].y + dy}
            u={T.u}
            titulo={tj.titulo}
            entra={fotogramaDe(s, t.tarjetas[i].entra, fps)}
            items={tj.items.map((it, j) => ({ icono: it.icono, texto: it.texto, entra: fotogramaDe(s, t.tarjetas[i].items[j], fps) }))}
            iconos={iconos}
            fotograma={f}
            color={colores.tarjeta}
            id={`t${s.indice}-${i}`}
          />
        </Saliente>
      ))}
    </>
  );
}

/** Líneas máximas de la nota (todas las frases y una línea vacía entre frases). */
const LINEAS_MAXIMAS = 9;

export function EscenaNota({ s, f, fps, colores }: PropsEscena): ReactNode {
  if (s.datos.tipo !== 'nota' || s.tiempos.tipo !== 'nota') return null;
  const d = s.datos;
  const t = s.tiempos;
  const N = DISENO.nota;
  const u = N.u;
  const salida = estadoSalida(s, f);
  const estilo = estiloDe(PAPELES.nota);
  const palabras = t.palabras;
  const enPantalla = (k: number): string => palabras[k].texto.toLocaleUpperCase('es').replace(/[.,;:]+$/u, '');
  const frases: number[][] = [];
  palabras.forEach((p, k) => {
    (frases[p.frase] ??= []).push(k);
  });

  // El tamaño baja hasta que todo cabe en LINEAS_MAXIMAS líneas del ancho.
  let tamano = PAPELES.nota.tamano * u;
  let lineas: number[][][] = [];
  for (; tamano > 20; tamano -= 1) {
    lineas = frases.map((ind) => {
      const medidas = ind.map((k, i) => (i === 0 ? '*' : '') + enPantalla(k) + (i === ind.length - 1 ? '*' : ''));
      return lineasEquilibradas(medidas, tamano, estilo, N.ancho).map((l) => l.map((i) => ind[i]));
    });
    const total = lineas.reduce((a, l) => a + l.length, 0) + Math.max(0, lineas.length - 1);
    const masAncha = Math.max(...palabras.map((_, k) => anchoTexto(`*${enPantalla(k)}*`, tamano, estilo)));
    if (total <= LINEAS_MAXIMAS && masAncha <= N.ancho) break;
  }
  const paso = tamano * (33 / 37);
  const correccion = correccionMayusculas(LETRAS.pesada, tamano, 0.7);
  const totalLineas = lineas.reduce((a, l) => a + l.length, 0) + Math.max(0, lineas.length - 1);
  // El bloque (cursiva + líneas) se centra en vertical en N.centro.
  const primera = N.centro - ((totalLineas - 1) * paso) / 2 + N.corsivaSobre / 2;
  const yCursiva = primera - N.corsivaSobre;
  const tamCursiva = tamanoPapel(d.cursiva, PAPELES.cursivaNota, u * 0.8, DISENO.anchoTexto * 0.8);

  let fila = 0;
  const elementos: ReactNode[] = [];
  lineas.forEach((lineasFrase, i) => {
    const primeraPalabra = frases[i][0];
    const ultimaPalabra = frases[i][frases[i].length - 1];
    lineasFrase.forEach((indices) => {
      const y = primera + fila * paso + correccion;
      elementos.push(
        <div
          key={`${i}-${fila}`}
          style={{
            position: 'absolute',
            left: N.x,
            top: y,
            transform: `translate(-50%, -50%) scaleX(${PAPELES.nota.escalaX})`,
            fontFamily: LETRAS.pesada,
            fontWeight: 900,
            fontSize: tamano,
            lineHeight: 1,
            letterSpacing: `${PAPELES.nota.espaciado}em`,
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            textShadow: `0 ${tamano * 0.05}px ${tamano * 0.12}px rgba(0,0,0,0.5)`,
          }}
        >
          {indices.map((k, j) => {
            const desde = fotogramaDe(s, palabras[k].entra, fps);
            const q = animar(f, [desde, desde + 3], [0, 1], CURVAS.frena);
            const asterisco = (visible: number): ReactNode => (
              <span style={{ color: colores.cursiva, fontSize: '0.78em', verticalAlign: '0.32em', opacity: visible, textShadow: 'none' }}>*</span>
            );
            return (
              <span key={k} style={{ display: 'inline-block', marginRight: j < indices.length - 1 ? '0.28em' : 0 }}>
                {k === primeraPalabra ? asterisco(q) : null}
                <span style={{ opacity: q, display: 'inline-block', transform: `translateY(${(1 - q) * 0.15}em)` }}>{enPantalla(k)}</span>
                {k === ultimaPalabra ? asterisco(animar(f, [desde + 4, desde + 7], [0, 1], CURVAS.frena)) : null}
              </span>
            );
          })}
        </div>,
      );
      fila++;
    });
    fila++; // una línea vacía entre frases
  });

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: salida.opacidad }}>
      <Cursiva
        texto={d.cursiva}
        x={N.x - 12 * u}
        y={yCursiva}
        tamano={tamCursiva}
        color={colores.cursiva}
        familia={LETRAS.cursiva}
        desde={fotogramaDe(s, t.cursiva.desde, fps)}
        hasta={fotogramaDe(s, t.cursiva.hasta, fps)}
        fotograma={f}
      />
      {elementos}
    </div>
  );
}

export function EscenaCierre({ s, f, fps, colores, iconos }: PropsEscena): ReactNode {
  if (s.datos.tipo !== 'cierre' || s.tiempos.tipo !== 'cierre') return null;
  const d = s.datos;
  const t = s.tiempos;
  const C = DISENO.cierre;
  const u = C.u;
  const desde = fotogramaDe(s, t.invitacion ?? 0.3, fps);
  const q = animar(f, [desde, desde + 9], [0, 1], CURVAS.frena);
  const texto = d.invitacion.toLocaleUpperCase('es');
  const tam = texto === '' ? 0 : tamanoPapel(texto, PAPELES.lineaRoja, u * 1.3, DISENO.anchoTexto);
  const lado = 150 * u * 0.9;
  // El icono entra al empezar la escena: si esperara a la invitación, la pantalla quedaría vacía mientras la voz dice
  // lo anterior (evaluación del 20/11/2026: unos 3 s solo con el subtítulo).
  const desdeIcono = fotogramaDe(s, 0.3, fps);
  const v = salto(f, fps, desdeIcono);
  return (
    <>
      {d.icono !== undefined && f >= desdeIcono ? (
        <div
          style={{
            position: 'absolute',
            left: DISENO.cx - lado / 2,
            top: C.icono - lado / 2,
            width: lado,
            height: lado,
            transform: `scale(${v}) rotate(${(1 - Math.min(1, v)) * -40}deg)`,
            filter: `drop-shadow(0 ${4 * u}px ${6 * u}px rgba(0,0,0,0.45))`,
          }}
        >
          <div style={{ position: 'absolute', inset: lado * 0.06, borderRadius: '50%', background: '#FFFFFF' }} />
          <div style={{ position: 'absolute', inset: lado * 0.17 }}>
            <Icono iconos={iconos} nombre={d.icono} estilo="duotono" lado={lado * 0.66} color={colores.acento} colorFondo={colores.acento} />
          </div>
        </div>
      ) : null}
      {texto !== '' ? (
        <div style={{ opacity: q, position: 'absolute', inset: 0, transform: `translateY(${(1 - q) * 20 * u}px)` }}>
          <TextoCentrado
            texto={texto}
            x={DISENO.cx}
            y={C.invitacion}
            tamano={tam}
            familia={LETRAS.titulo}
            altoMayusculas={PAPELES.lineaRoja.mayusculas}
            escalaX={PAPELES.lineaRoja.escalaX}
            color={colores.lineaRoja}
            style={{ textShadow: `0 0 ${14 * u}px rgba(${rgb(colores.acento)},0.6), 0 ${3 * u}px ${8 * u}px rgba(0,0,0,0.5)` }}
          />
        </div>
      ) : null}
    </>
  );
}
