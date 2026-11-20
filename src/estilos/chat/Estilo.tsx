// «Historia contada en un chat». Interfaz propia: tarjeta con cabecera (avatar con la inicial, nombre y estado),
// burbujas con nuestros colores (las del «yo» en el color de acento), «escribiendo…» con tres puntos, desplazamiento
// suave cuando la conversación no cabe y un cartel para las líneas del narrador.

import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import poppins500 from '@fontsource/poppins/files/poppins-latin-500-normal.woff2';
import poppins700 from '@fontsource/poppins/files/poppins-latin-700-normal.woff2';
import { cargarFuentes } from '../../comun/fuentes.ts';
import { ALTO, ANCHO, ZONA_SEGURA, type EscenaLista, type PropsVideo } from '../../comun/guion.ts';
import { escribiendo, type AjustesChat, type EscenaChat } from './reglas.ts';

cargarFuentes([
  { familia: 'Poppins', url: poppins500, peso: 500 },
  { familia: 'Poppins', url: poppins700, peso: 700 },
]);

const TEMAS = {
  oscuro: { fondo: '#0B0F14', tarjeta: '#141A22', cabecera: '#18202A', otro: '#242E3B', textoOtro: '#F2F5F8', texto: '#F2F5F8', tenue: '#8A96A6' },
  claro: { fondo: '#E9EDF2', tarjeta: '#FFFFFF', cabecera: '#F5F7FA', otro: '#E7ECF2', textoOtro: '#10151B', texto: '#10151B', tenue: '#6B7684' },
} as const;

const LETRA = 40;
const LINEA = 52;
const RELLENO_V = 24;
const RELLENO_H = 34;
const ANCHO_BURBUJA = 700;
const SEPARACION = 20;
const CARACTERES_POR_LINEA = Math.floor((ANCHO_BURBUJA - RELLENO_H * 2) / (LETRA * 0.56));

/** Líneas que ocupa un texto (corte por palabras, como el navegador); por defecto, en una burbuja. */
function lineas(texto: string, porLinea: number = CARACTERES_POR_LINEA): number {
  let n = 1;
  let largo = 0;
  for (const palabra of texto.split(/\s+/)) {
    const l = palabra.length;
    if (largo === 0) largo = l;
    else if (largo + 1 + l <= porLinea) largo += 1 + l;
    else {
      n += 1;
      largo = l;
    }
  }
  return n;
}

const altoBurbuja = (texto: string): number => lineas(texto) * LINEA + RELLENO_V * 2;
const ALTO_ESCRIBIENDO = 96;

// El cartel del narrador: abajo, por encima de la zona que tapan las aplicaciones.
const LETRA_NARRADOR = 46;
const LINEA_NARRADOR = Math.round(LETRA_NARRADOR * 1.25);
const RELLENO_NARRADOR = 30;
const ABAJO_NARRADOR = ZONA_SEGURA.abajo + 60;
const CARACTERES_NARRADOR = Math.floor((ANCHO - 160 - 38 * 2 - 10) / (LETRA_NARRADOR * 0.6));

/** Cuánto tienen que subir los mensajes para que el cartel del narrador no tape el último (con 24 px de aire). */
function reservaNarrador(texto: string, abajoTarjeta: number): number {
  const altoCartel = lineas(texto, CARACTERES_NARRADOR) * LINEA_NARRADOR + RELLENO_NARRADOR * 2;
  const abajoVentana = abajoTarjeta - 16;
  const arribaCartel = ALTO - ABAJO_NARRADOR - altoCartel;
  return Math.max(0, abajoVentana - arribaCartel + 24);
}

function Puntos({ frame }: { frame: number }): ReactNode {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: 48 }}>
      {[0, 1, 2].map((i) => {
        const fase = Math.sin(((frame - i * 5) / 30) * Math.PI * 2.2);
        return (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              background: 'currentColor',
              opacity: 0.45 + 0.55 * Math.max(0, fase),
              transform: `translateY(${-Math.max(0, fase) * 8}px)`,
            }}
          />
        );
      })}
    </div>
  );
}

export function Estilo(props: PropsVideo): ReactNode {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ajustes = props.ajustes as AjustesChat;
  const tema = TEMAS[ajustes.tema];
  const acento = props.guion.marca.acento;
  const escenas = props.escenas as readonly EscenaLista<EscenaChat>[];

  // Burbujas: cada mensaje aparece al terminar su «escribiendo…»; el «escribiendo…» ocupa su sitio mientras tanto.
  const mensajes = escenas.filter((e) => e.datos.de !== 'narrador');
  const items = mensajes.flatMap((e) => {
    const aparece = e.inicio + escribiendo(e.datos);
    const lista: Array<{ clave: string; desde: number; hasta: number; alto: number; escena: EscenaLista<EscenaChat>; tipo: 'mensaje' | 'escribiendo' }> = [];
    if (e.datos.de === 'otro') {
      lista.push({ clave: `e${e.indice}`, desde: e.inicio, hasta: aparece, alto: ALTO_ESCRIBIENDO, escena: e, tipo: 'escribiendo' });
    }
    lista.push({ clave: `m${e.indice}`, desde: aparece, hasta: Infinity, alto: altoBurbuja(e.datos.texto), escena: e, tipo: 'mensaje' });
    return lista;
  });
  const visibles = items.filter((i) => t >= i.desde && t < i.hasta);

  // Geometría de la tarjeta.
  const hayGancho = ajustes.gancho.trim() !== '';
  const arribaTarjeta = hayGancho ? ZONA_SEGURA.arriba + 250 : ZONA_SEGURA.arriba + 30;
  const abajoTarjeta = ALTO - ZONA_SEGURA.abajo - 10;
  const ALTO_CABECERA = 140;
  const altoVentana = abajoTarjeta - arribaTarjeta - ALTO_CABECERA - 40;

  // Desplazamiento: cuando el contenido no cabe, sube con un resorte cada vez que entra algo nuevo. Mientras habla el
  // narrador, su cartel tapa la parte baja de la ventana, así que los mensajes suben para quedar por encima
  // (evaluación del 20/11/2026: el cartel tapaba el último mensaje).
  const narradores = escenas.filter((e) => e.datos.de === 'narrador');
  const narradorEn = (momento: number) => narradores.find((e) => momento >= e.inicio && momento < e.inicio + e.duracion);
  const altoHasta = (hasta: number): number =>
    items.filter((i) => hasta >= i.desde && hasta < i.hasta).reduce((s, i) => s + i.alto + SEPARACION, 0);
  const objetivo = (momento: number): number => {
    const n = narradorEn(momento);
    return Math.max(0, altoHasta(momento) - altoVentana + (n === undefined ? 0 : reservaNarrador(n.datos.texto, abajoTarjeta)));
  };
  const cambios = [
    ...new Set(
      [...items.flatMap((i) => [i.desde, i.hasta]), ...narradores.flatMap((e) => [e.inicio, e.inicio + e.duracion])].filter(
        (m) => Number.isFinite(m) && m <= t,
      ),
    ),
  ].sort((a, b) => a - b);
  let desplazamiento = 0;
  for (const m of cambios) {
    const avance = spring({ frame: frame - Math.round(m * fps), fps, config: { damping: 200, mass: 0.6 } });
    desplazamiento = desplazamiento + (objetivo(m) - desplazamiento) * avance;
  }

  const escribe = visibles.some((i) => i.tipo === 'escribiendo');
  const narrador = escenas.find((e) => e.datos.de === 'narrador' && t >= e.inicio && t < e.inicio + e.duracion);

  let y = 0;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 70% at 50% 0%, ${acento}22 0%, ${tema.fondo} 55%)`, fontFamily: 'Poppins' }}>
      {hayGancho && (
        <div
          style={{
            position: 'absolute',
            left: 70,
            right: 70,
            top: ZONA_SEGURA.arriba,
            height: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: ajustes.gancho.length > 60 ? 50 : 60,
            lineHeight: 1.18,
            color: tema.texto,
            transform: `scale(${interpolate(spring({ frame, fps, config: { damping: 14 } }), [0, 1], [0.85, 1])})`,
          }}
        >
          <div>
            <span style={{ background: `linear-gradient(transparent 62%, ${acento}66 62%)`, padding: '0 6px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>
              {ajustes.gancho}
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: 60,
          width: ANCHO - 120,
          top: arribaTarjeta,
          height: abajoTarjeta - arribaTarjeta,
          background: tema.tarjeta,
          borderRadius: 48,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ height: ALTO_CABECERA, background: tema.cabecera, display: 'flex', alignItems: 'center', padding: '0 36px', gap: 26 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              background: acento,
              color: '#0B0F14',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 42,
            }}
          >
            {ajustes.contacto.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 42, color: tema.texto }}>{ajustes.contacto}</div>
            <div style={{ fontWeight: 500, fontSize: 28, color: escribe ? acento : tema.tenue }}>{escribe ? 'escribiendo…' : 'en línea'}</div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: 30, right: 30, top: ALTO_CABECERA + 24, height: altoVentana, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${-desplazamiento}px)` }}>
            {visibles.map((item) => {
              const arriba = y;
              y += item.alto + SEPARACION;
              const mio = item.escena.datos.de === 'yo';
              const entrada = spring({ frame: frame - Math.round(item.desde * fps), fps, config: { damping: 15, mass: 0.6 } });
              return (
                <div
                  key={item.clave}
                  style={{
                    position: 'absolute',
                    top: arriba,
                    left: mio ? undefined : 0,
                    right: mio ? 0 : undefined,
                    maxWidth: ANCHO_BURBUJA,
                    padding: `${RELLENO_V}px ${RELLENO_H}px`,
                    borderRadius: 36,
                    borderBottomLeftRadius: mio ? 36 : 10,
                    borderBottomRightRadius: mio ? 10 : 36,
                    background: mio ? acento : tema.otro,
                    color: mio ? '#0B0F14' : tema.textoOtro,
                    fontWeight: 500,
                    fontSize: LETRA,
                    lineHeight: `${LINEA}px`,
                    opacity: entrada,
                    transform: `translateY(${(1 - entrada) * 24}px) scale(${0.85 + 0.15 * entrada})`,
                    transformOrigin: mio ? 'bottom right' : 'bottom left',
                  }}
                >
                  {item.tipo === 'escribiendo' ? <Puntos frame={frame} /> : item.escena.datos.texto}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {narrador !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: 80,
            right: 80,
            bottom: ABAJO_NARRADOR,
            padding: `${RELLENO_NARRADOR}px 38px`,
            borderRadius: 28,
            background: 'rgba(5,8,12,0.88)',
            borderLeft: `10px solid ${acento}`,
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: LETRA_NARRADOR,
            lineHeight: `${LINEA_NARRADOR}px`,
            opacity: interpolate(t - narrador.inicio, [0, 0.2, narrador.duracion - 0.2, narrador.duracion], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {narrador.datos.texto}
        </div>
      )}
    </AbsoluteFill>
  );
}
