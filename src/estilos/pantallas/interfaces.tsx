// Las pantallas neutras, dibujadas con código (nunca la interfaz de un producto real ni su logo): ventanas oscuras de
// esquinas vivas con textos grises y azules, que se mueven despacio dentro de la ventana quieta, como las grabaciones de
// pantalla del original. Todo lo que se lee dentro viene del guion.
//   - navegador: barra con la dirección, título y párrafos de la página, una imagen abstracta en el color de acento;
//   - chat: la pregunta del usuario y la respuesta de un asistente genérico que se escribe sola;
//   - buscador: la consulta que se teclea, un resumen con IA opcional y los resultados;
//   - terminal: comandos que se teclean y su salida;
//   - captura: una imagen que aporta el usuario, que se desplaza si es más alta que la ventana.
// Se diseñan sobre un ancho lógico de 430 y se escalan con `u` (ventana de 860 px → u = 2).

import type { CSSProperties, ReactNode } from 'react';
import { Img, staticFile } from 'remotion';
import { Icono } from './figuras.tsx';
import { MONO, ROBOTO, envolver } from './fuentes.ts';
import { CURVAS, anima } from './movimientos.ts';

const C = {
  fondo: '#0B1016',
  barra: '#121922',
  borde: '#1E2731',
  renglon: '#16202A',
  texto: '#D6DEE6',
  claro: '#EEF2F6',
  gris: '#8A949F',
  oscuro: '#38424D',
  azul: '#7DB8FF',
  verde: '#3FB950',
} as const;

/** Alto de cada pantalla en fracción de su ancho. */
export const PROPORCIONES = { navegador: 0.72, chat: 0.74, buscador: 0.78, terminal: 0.52 } as const;

export interface PropsInterfaz {
  readonly ancho: number;
  readonly alto: number;
  /** Segundos desde que entró la pantalla. */
  readonly t: number;
  /** Segundos que quedan de escena desde que entró. */
  readonly dur: number;
  readonly acento: string;
}

/** Cuánto de algo que avanza entre `desde` y `hasta` (s), con curva suave. */
const avance = (t: number, desde: number, hasta: number): number => anima(t * 1000, [desde * 1000, hasta * 1000], [0, 1], CURVAS.suave);
/** Aparece en 0,18 s. */
const aparece = (t: number, desde: number): number => anima(t * 1000, [desde * 1000, desde * 1000 + 180], [0, 1], CURVAS.frena);
/** El cursor parpadea dos veces por segundo. */
const cursorVisible = (t: number): boolean => Math.floor(t * 2.2) % 2 === 0;

function Barra({ w, h, color = C.oscuro, style }: { readonly w: number; readonly h: number; readonly color?: string; readonly style?: CSSProperties }): ReactNode {
  return <div style={{ width: w, height: h, borderRadius: h / 2, background: color, flexShrink: 0, ...style }} />;
}

/** La ventana: barra de arriba con tres puntos y, si la hay, la dirección. */
function Ventana({ ancho, alto, direccion, fondo = C.fondo, children }: { readonly ancho: number; readonly alto: number; readonly direccion?: string; readonly fondo?: string; readonly children: ReactNode }): ReactNode {
  const u = ancho / 430;
  const barra = 24 * u;
  return (
    <div style={{ position: 'relative', width: ancho, height: alto, background: fondo, overflow: 'hidden', fontFamily: ROBOTO }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: barra, background: C.barra, borderBottom: `${Math.max(1, u * 0.6)}px solid ${C.borde}`, display: 'flex', alignItems: 'center', gap: 5 * u, padding: `0 ${10 * u}px`, zIndex: 2 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 6 * u, height: 6 * u, borderRadius: '50%', background: C.oscuro }} />
        ))}
        {direccion ? (
          <div style={{ marginLeft: 10 * u, flex: 1, height: 15 * u, borderRadius: 8 * u, background: C.fondo, display: 'flex', alignItems: 'center', gap: 5 * u, padding: `0 ${8 * u}px`, color: C.gris, fontSize: 8.5 * u, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <Icono nombre="lock-simple" lado={7.5 * u} color={C.gris} />
            {direccion}
          </div>
        ) : null}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: barra, bottom: 0, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

export function Navegador({ ancho, alto, t, acento, direccion, titulo, lineas }: PropsInterfaz & { readonly direccion: string; readonly titulo: string; readonly lineas: readonly string[] }): ReactNode {
  const u = ancho / 430;
  const anchoTexto = (430 - 36) * u;
  const renglonesTitulo = envolver(titulo, anchoTexto, 20 * u, 600).slice(0, 3);
  const parrafos = lineas.map((l) => envolver(l, anchoTexto, 11.5 * u, 400));
  // La página baja despacio y se acerca un poco (una grabación de pantalla, nunca quieta).
  const baja = anima(t * 1000, [300, 9000], [0, 26 * u], CURVAS.respiro);
  return (
    <Ventana ancho={ancho} alto={alto} direccion={direccion}>
      <div style={{ position: 'absolute', left: 18 * u, right: 18 * u, top: 16 * u, transform: `translateY(${(-baja).toFixed(2)}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 * u, marginBottom: 10 * u, opacity: aparece(t, 0.05) }}>
          <div style={{ width: 8 * u, height: 8 * u, borderRadius: '50%', background: acento }} />
          <Barra w={64 * u} h={5 * u} />
          <Barra w={40 * u} h={5 * u} color={C.renglon} />
        </div>
        <div style={{ opacity: aparece(t, 0.12), transform: `translateY(${((1 - aparece(t, 0.12)) * 6 * u).toFixed(2)}px)` }}>
          {renglonesTitulo.map((r, i) => (
            <div key={i} style={{ color: C.claro, fontWeight: 600, fontSize: 20 * u, lineHeight: 1.18, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>
              {r}
            </div>
          ))}
        </div>
        <div style={{ height: 10 * u }} />
        {parrafos.length > 0
          ? parrafos.map((p, i) => (
              <div key={i} style={{ marginBottom: 8 * u, opacity: aparece(t, 0.3 + i * 0.15) }}>
                {p.map((r, j) => (
                  <div key={j} style={{ color: '#A9B3BD', fontSize: 11.5 * u, lineHeight: 1.5, whiteSpace: 'nowrap' }}>
                    {r}
                  </div>
                ))}
              </div>
            ))
          : [0.95, 0.88, 0.92, 0.6].map((w, i) => <Barra key={i} w={w * anchoTexto} h={6 * u} style={{ marginBottom: 9 * u, opacity: aparece(t, 0.3 + i * 0.08) }} />)}
        <div style={{ marginTop: 8 * u, height: 150 * u, borderRadius: 6 * u, overflow: 'hidden', position: 'relative', opacity: aparece(t, 0.5), background: `linear-gradient(135deg, ${acento} 0%, ${C.barra} 75%)` }}>
          <div style={{ position: 'absolute', left: '55%', top: '-30%', width: '70%', height: '160%', borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
          <div style={{ position: 'absolute', left: '-15%', top: '45%', width: '60%', height: '110%', borderRadius: '50%', background: 'rgba(0,0,0,0.22)' }} />
        </div>
      </div>
    </Ventana>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

function Puntos({ t, u, color }: { readonly t: number; readonly u: number; readonly color: string }): ReactNode {
  return (
    <div style={{ display: 'flex', gap: 4 * u, alignItems: 'center', height: 16 * u }}>
      {[0, 1, 2].map((i) => {
        const fase = Math.max(0, Math.sin((t - i * 0.15) * Math.PI * 2.4));
        return <div key={i} style={{ width: 5 * u, height: 5 * u, borderRadius: '50%', background: color, opacity: 0.45 + 0.55 * fase, transform: `translateY(${(-fase * 3 * u).toFixed(2)}px)` }} />;
      })}
    </div>
  );
}

/** Momentos del chat (s desde que entra la pantalla): la pregunta, los puntos, la respuesta que se escribe. */
export function momentosChat(dur: number, palabrasRespuesta: number): { pregunta: number; puntos: number; respuesta: number; fin: number } {
  const respuesta = Math.min(0.95, Math.max(0.5, dur * 0.3));
  const fin = Math.max(respuesta + 0.5, Math.min(dur - 0.35, respuesta + palabrasRespuesta / 9));
  return { pregunta: 0.15, puntos: 0.5, respuesta, fin };
}

export function Chat({ ancho, alto, t, dur, acento, nombre, pregunta, respuesta }: PropsInterfaz & { readonly nombre: string; readonly pregunta: string; readonly respuesta: string }): ReactNode {
  const u = ancho / 430;
  const cabecera = 34 * u;
  const entrada = 40 * u;
  const cuerpo = 16 * u;
  const lh = 1.42;
  const renglonesP = envolver(pregunta, 290 * u, cuerpo, 400);
  const palabrasR = respuesta.split(/\s+/).filter(Boolean);
  const m = momentosChat(dur, palabrasR.length);
  const cuantas = t < m.respuesta ? 0 : Math.ceil(avance(t, m.respuesta, m.fin) * palabrasR.length);
  const renglonesR = envolver(respuesta, 345 * u, cuerpo, 400);
  // Cuántas palabras lleva cada renglón de la respuesta, para escribirla palabra a palabra sin que salte de renglón.
  let quedan = cuantas;
  const visibles = renglonesR.map((r) => {
    const n = r.split(/\s+/).length;
    const toma = Math.max(0, Math.min(n, quedan));
    quedan -= toma;
    return r.split(/\s+/).slice(0, toma).join(' ');
  });
  const ultimo = visibles.reduce((a, v, i) => (v.length > 0 ? i : a), -1);
  const qP = aparece(t, m.pregunta);
  const altoP = renglonesP.length * cuerpo * lh + 18 * u;
  const altoR = Math.max(1, ultimo + 1) * cuerpo * lh;
  const zona = alto - 24 * u - cabecera - entrada - 14 * u;
  const contenido = 14 * u + altoP + 16 * u + 20 * u + altoR + 10 * u;
  const sube = Math.max(0, contenido - zona);
  return (
    <Ventana ancho={ancho} alto={alto}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: cabecera, display: 'flex', alignItems: 'center', gap: 8 * u, padding: `0 ${14 * u}px`, borderBottom: `${Math.max(1, u * 0.6)}px solid ${C.borde}`, background: C.fondo, zIndex: 1 }}>
        <div style={{ width: 20 * u, height: 20 * u, borderRadius: '50%', background: acento, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre="sparkle" lado={12 * u} color="#0B1016" />
        </div>
        {nombre ? <div style={{ color: C.claro, fontWeight: 600, fontSize: 12 * u }}>{nombre}</div> : <Barra w={70 * u} h={6 * u} />}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 * u }}>
          <Barra w={14 * u} h={6 * u} />
          <Barra w={14 * u} h={6 * u} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: cabecera, height: zona + 14 * u, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 14 * u, right: 14 * u, top: 14 * u, transform: `translateY(${(-sube).toFixed(2)}px)` }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: qP, transform: `translateY(${((1 - qP) * 10 * u).toFixed(2)}px) scale(${(0.94 + 0.06 * qP).toFixed(4)})`, transformOrigin: '100% 100%' }}>
            <div style={{ background: '#2A3542', color: C.claro, fontSize: cuerpo, lineHeight: lh, padding: `${9 * u}px ${12 * u}px`, borderRadius: `${14 * u}px ${14 * u}px ${4 * u}px ${14 * u}px` }}>
              {renglonesP.map((r, i) => (
                <div key={i} style={{ whiteSpace: 'nowrap' }}>
                  {r}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9 * u, marginTop: 16 * u, opacity: aparece(t, m.puntos) }}>
            <div style={{ width: 20 * u, height: 20 * u, borderRadius: '50%', background: acento, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre="sparkle" lado={12 * u} color="#0B1016" />
            </div>
            <div style={{ paddingTop: 1 * u }}>
              {t < m.respuesta ? (
                <Puntos t={t} u={u} color={C.gris} />
              ) : (
                visibles.slice(0, ultimo + 1).map((r, i) => (
                  <div key={i} style={{ color: C.texto, fontSize: cuerpo, lineHeight: lh, whiteSpace: 'nowrap' }}>
                    {r}
                    {i === ultimo && t < m.fin + 0.3 ? <span style={{ display: 'inline-block', width: 7 * u, height: cuerpo * 0.95, marginLeft: 3 * u, verticalAlign: 'text-bottom', background: acento }} /> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 12 * u, right: 12 * u, bottom: 10 * u, height: entrada - 10 * u, borderRadius: 15 * u, background: C.barra, border: `${Math.max(1, u * 0.6)}px solid ${C.borde}`, display: 'flex', alignItems: 'center', padding: `0 ${6 * u}px 0 ${12 * u}px` }}>
        <Barra w={120 * u} h={6 * u} color={C.renglon} />
        <div style={{ marginLeft: 'auto', width: 22 * u, height: 22 * u, borderRadius: '50%', background: acento, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre="arrow-up" lado={12 * u} color="#0B1016" />
        </div>
      </div>
    </Ventana>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

/** Momentos del buscador (s desde que entra la pantalla). */
export function momentosBuscador(dur: number, consulta: string, palabrasRespuesta: number): { tecleo: number; tecleado: number; resultados: number; finRespuesta: number } {
  const tecleo = 0.2;
  const tecleado = tecleo + Math.min(1.4, Math.max(0.5, dur * 0.35), [...consulta].length / 20);
  const resultados = tecleado + 0.3;
  const finRespuesta = palabrasRespuesta === 0 ? resultados : Math.max(resultados + 0.5, Math.min(dur - 0.4, resultados + palabrasRespuesta / 10));
  return { tecleo, tecleado, resultados, finRespuesta };
}

export function Buscador({ ancho, alto, t, dur, acento, consulta, respuesta, resultados }: PropsInterfaz & { readonly consulta: string; readonly respuesta: string; readonly resultados: readonly string[] }): ReactNode {
  const u = ancho / 430;
  const letras = [...consulta];
  const palabrasR = respuesta.split(/\s+/).filter(Boolean);
  const m = momentosBuscador(dur, consulta, palabrasR.length);
  const tecleadas = Math.round(avance(t, m.tecleo, m.tecleado) * letras.length);
  const escribiendo = t < m.tecleado + 0.25;
  const cuerpo = 14 * u;
  const renglonesR = respuesta ? envolver(respuesta, 360 * u, cuerpo, 400) : [];
  const cuantas = t < m.resultados ? 0 : Math.ceil(avance(t, m.resultados, m.finRespuesta) * palabrasR.length);
  let quedan = cuantas;
  const visiblesR = renglonesR.map((r) => {
    const n = r.split(/\s+/).length;
    const toma = Math.max(0, Math.min(n, quedan));
    quedan -= toma;
    return r.split(/\s+/).slice(0, toma).join(' ');
  });
  const titulos = resultados.length > 0 ? resultados : ['', '', ''];
  const inicioResultados = respuesta ? m.finRespuesta + 0.1 : m.resultados;
  const altoCaja = respuesta ? 30 * u + renglonesR.length * cuerpo * 1.5 + 14 * u : 0;
  const altoResultado = 68 * u;
  const contenido = 70 * u + (respuesta ? altoCaja + 14 * u : 0) + titulos.length * altoResultado;
  const zona = alto - 24 * u;
  // Si no cabe, la página sube cuando aparecen los resultados.
  const sube = Math.max(0, contenido - zona) * avance(t, inicioResultados, inicioResultados + 1.2);
  const pulsa = 1 - 0.03 * Math.sin(Math.PI * anima(t * 1000, [m.tecleado * 1000 + 100, m.tecleado * 1000 + 350], [0, 1], CURVAS.suave));
  return (
    <Ventana ancho={ancho} alto={alto}>
      <div style={{ position: 'absolute', left: 18 * u, right: 18 * u, top: 18 * u, transform: `translateY(${(-sube).toFixed(2)}px)` }}>
        <div style={{ height: 36 * u, borderRadius: 18 * u, background: C.barra, border: `${1.2 * u}px solid #2A3441`, display: 'flex', alignItems: 'center', gap: 9 * u, padding: `0 ${14 * u}px`, transform: `scale(${pulsa.toFixed(4)})` }}>
          <Icono nombre="magnifying-glass" lado={15 * u} color={C.gris} />
          <div style={{ color: C.claro, fontSize: 15.5 * u, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {letras.slice(0, tecleadas).join('')}
            {escribiendo && cursorVisible(t) ? <span style={{ display: 'inline-block', width: 1.6 * u, height: 15 * u, marginLeft: 1 * u, verticalAlign: 'middle', background: acento }} /> : null}
          </div>
        </div>
        <div style={{ height: 16 * u }} />
        {respuesta ? (
          <div style={{ borderRadius: 10 * u, background: '#0F1A27', border: `${1 * u}px solid #22354B`, padding: `${11 * u}px ${13 * u}px`, marginBottom: 14 * u, opacity: aparece(t, m.resultados), height: altoCaja, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 * u, marginBottom: 7 * u }}>
              <Icono nombre="sparkle" lado={13 * u} color={acento} />
              <Barra w={60 * u} h={5 * u} color={C.oscuro} />
            </div>
            {visiblesR.map((r, i) => (
              <div key={i} style={{ color: C.texto, fontSize: cuerpo, lineHeight: 1.5, whiteSpace: 'nowrap', minHeight: cuerpo * 1.5 }}>
                {r}
              </div>
            ))}
          </div>
        ) : null}
        {titulos.map((titulo, i) => {
          const q = aparece(t, inicioResultados + i * 0.22);
          return (
            <div key={i} style={{ height: altoResultado, opacity: q, transform: `translateY(${((1 - q) * 8 * u).toFixed(2)}px)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 * u, marginBottom: 5 * u }}>
                <div style={{ width: 11 * u, height: 11 * u, borderRadius: '50%', background: C.oscuro }} />
                <Barra w={(70 + 25 * ((i * 7) % 3)) * u} h={5 * u} />
              </div>
              {titulo ? <div style={{ color: C.azul, fontSize: 16 * u, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</div> : <Barra w={(220 - 30 * i) * u} h={8 * u} color="#2B4A6E" style={{ margin: `${4 * u}px 0` }} />}
              <Barra w={(330 - 40 * (i % 2)) * u} h={5 * u} color={C.renglon} style={{ marginTop: 6 * u }} />
            </div>
          );
        })}
      </div>
    </Ventana>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

export function Terminal({ ancho, alto, t, dur, acento, lineas }: PropsInterfaz & { readonly lineas: readonly string[] }): ReactNode {
  const u = ancho / 430;
  const cuerpo = 13 * u;
  // Cada comando se teclea a ~22 letras por segundo; su salida aparece 0,15 s después.
  const comandos = lineas.filter((l) => l.startsWith('$')).reduce((s, l) => s + l.length, 0);
  const velocidad = Math.max(22, comandos / Math.max(0.6, dur * 0.7));
  let reloj = 0.25;
  const pasos = lineas.map((l) => {
    const comando = l.startsWith('$');
    const desde = reloj;
    const hasta = comando ? desde + (l.length - 1) / velocidad : desde;
    reloj = hasta + (comando ? 0.18 : 0.12);
    return { l, comando, desde, hasta };
  });
  const actual = pasos.findIndex((p) => t < p.hasta + (p.comando ? 0.18 : 0));
  return (
    <Ventana ancho={ancho} alto={alto} fondo="#090C10">
      <div style={{ position: 'absolute', left: 16 * u, right: 16 * u, top: 14 * u, fontFamily: MONO, fontSize: cuerpo, lineHeight: 1.65 }}>
        {pasos.map((p, i) => {
          if (t < p.desde) return null;
          const texto = p.comando ? p.l.slice(1).trimStart() : p.l;
          const n = p.comando ? Math.round(avance(t, p.desde, p.hasta) * texto.length) : texto.length;
          return (
            <div key={i} style={{ color: p.comando ? C.claro : C.gris, whiteSpace: 'pre', fontWeight: p.comando ? 700 : 400 }}>
              {p.comando ? <span style={{ color: C.verde }}>$ </span> : null}
              {texto.slice(0, n)}
              {i === actual && cursorVisible(t) ? <span style={{ display: 'inline-block', width: cuerpo * 0.55, height: cuerpo * 1.05, verticalAlign: 'text-bottom', background: acento }} /> : null}
            </div>
          );
        })}
      </div>
    </Ventana>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

export function Captura({ ancho, alto, t, imagen, tamano, direccion }: PropsInterfaz & { readonly imagen: string; readonly tamano: readonly [number, number]; readonly direccion: string }): ReactNode {
  const u = ancho / 430;
  const zona = alto - 24 * u;
  const altoImagen = (tamano[1] * ancho) / tamano[0];
  const corre = Math.max(0, altoImagen - zona);
  // Una página alta baja despacio (30 px/s con curva suave); una baja se acerca un 5 %.
  const baja = Math.min(corre, anima(t * 1000, [300, 300 + (corre / 30) * 1000], [0, corre], CURVAS.respiro));
  const acerca = corre > 0 ? 1 : 1 + 0.05 * anima(t * 1000, [0, 6000], [0, 1], CURVAS.respiro);
  return (
    <Ventana ancho={ancho} alto={alto} direccion={direccion} fondo="#FFFFFF">
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${acerca.toFixed(5)})`, transformOrigin: '30% 20%' }}>
        <Img src={staticFile(imagen)} style={{ position: 'absolute', left: 0, top: -baja, width: ancho, height: altoImagen, maxWidth: 'none' }} />
      </div>
    </Ventana>
  );
}

/** El alto de la ventana de una captura: el de la imagen, entre el 45 % y el 80 % del ancho. */
export function altoCaptura(ancho: number, tamano: readonly [number, number]): number {
  const u = ancho / 430;
  return Math.round(Math.min(0.8 * ancho, Math.max(0.45 * ancho, (tamano[1] * ancho) / tamano[0] + 24 * u)));
}
