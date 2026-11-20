// Plano «titulo» (la apertura del original): la figura sube desde abajo sobre un círculo luminoso (el círculo llega
// grande y desenfocado; la figura sube con estela); arriba se escribe la cursiva de izquierda a derecha; el título
// entra con las letras muy separadas que se cierran, con el ícono pegado al final que salta; debajo, la línea roja
// entra desenfocada desde la derecha. Sale con un corte seco.
// Cambio respecto al original: sin foto por defecto. La figura sale del código (dibujada o un ícono de Phosphor, en
// blanco) y emerge del círculo; con `imagen`, se usa ese recorte en blanco y negro.

import type { ReactNode } from 'react';
import { Easing, Img, staticFile } from 'remotion';
import { ZONA_SEGURA } from '../../../comun/guion.ts';
import { CURVAS, animar, rgb } from '../curvas.ts';
import { DISENO, PAPELES } from '../diseno.ts';
import { Figura } from '../figuras.tsx';
import { Icono } from '../Icono.tsx';
import { LETRAS, anchoTexto } from '../letras.ts';
import { DesenfoqueDireccional, salto } from '../movimientos.tsx';
import { Cursiva, TextoCentrado, TituloEstrecho } from '../textos.tsx';
import { estiloDe, fotogramaDe, tamanoPapel, type PropsEscena } from './comunes.ts';

/** Fotogramas del cierre del espaciado del título. */
const CIERRE = 16;
/** La subida de la figura (medida: casi recta al principio y frena al final, ~13 fotogramas). */
const SUBIDA = Easing.bezier(0.3, 0.45, 0.35, 1);
const DURACION_SUBIDA = 13;

export function Titulo({ s, f, fps, colores, iconos }: PropsEscena): ReactNode {
  if (s.datos.tipo !== 'titulo' || s.tiempos.tipo !== 'titulo') return null;
  const d = s.datos;
  const t = s.tiempos;
  const D = DISENO.titulo;
  const u = D.u;
  const C = D.circulo;

  // Cursiva.
  const tamCursiva = tamanoPapel(d.cursiva, PAPELES.cursivaTitulo, u, DISENO.anchoTexto);

  // Título. El ícono va pegado al final: tapa la última letra si allí está vacía (la «T»); si está llena (O, S, E…)
  // queda casi entero fuera, para no convertir «SEO» en «SEQ». Con un título ancho, título e ícono no caben juntos
  // centrados: el título se estrecha y se corre a la izquierda lo justo para que el ícono quede dentro de la zona
  // segura sin pisar letras.
  const titulo = d.titulo.toLocaleUpperCase('es');
  const conIcono = d.icono !== undefined && t.icono !== null;
  const ladoIcono = 132 * u;
  const ultima = [...titulo.trim()].pop() ?? '';
  const vacia = 'TYVPF7?!'.includes(ultima);
  const izquierda = ZONA_SEGURA.izquierda;
  const derecha = 1080 - ZONA_SEGURA.derecha;
  const salidaLlena = ladoIcono / 2 + 0.17 * ladoIcono;
  const anchoMax = conIcono && !vacia ? Math.min(D.anchoTitulo, derecha - izquierda - salidaLlena) : D.anchoTitulo;
  const tamTitulo = tamanoPapel(titulo, PAPELES.titulo, u, anchoMax);
  const desdeTitulo = fotogramaDe(s, t.titulo, fps);
  const anchoFinal = anchoTexto(titulo, tamTitulo, estiloDe(PAPELES.titulo));
  const entra = vacia ? 68 * u * (anchoFinal / (504 * u)) : -0.17 * ladoIcono;
  const xTitulo = conIcono ? Math.min(D.titulo.x, derecha - (ladoIcono / 2 - entra) - anchoFinal / 2) : D.titulo.x;
  const espaciado = animar(f, [desdeTitulo, desdeTitulo + CIERRE], [0.9, 0], CURVAS.frena);
  const anchoAhora = anchoFinal + espaciado * tamTitulo * Math.max(0, [...titulo].length - 1) * PAPELES.titulo.escalaX;
  const altoMayusculas = tamTitulo * PAPELES.titulo.mayusculas;

  // Línea roja.
  const linea = d.subtitulo.toLocaleUpperCase('es');
  const tamLinea = linea === '' ? 0 : tamanoPapel(linea, PAPELES.lineaRoja, u, D.anchoTitulo);
  const desdeLinea = t.subtitulo === null ? null : fotogramaDe(s, t.subtitulo, fps);

  // Círculo y figura.
  const desdeSujeto = s.inicio;
  const qCirculo = animar(f, [desdeSujeto, desdeSujeto + 12], [0, 1], CURVAS.frena);
  const subidaEn = (g: number): number => animar(g, [desdeSujeto, desdeSujeto + DURACION_SUBIDA], [0, 1], SUBIDA);
  const velocidad = Math.max(Math.abs(subidaEn(f) - subidaEn(f - 1)), f <= desdeSujeto ? Math.abs(subidaEn(desdeSujeto + 1) - subidaEn(desdeSujeto)) : 0);
  const recorrido = 1920 - D.sujeto.cabeza + 40;
  const subida = (1 - subidaEn(f)) * recorrido;
  const pies = C.cy + C.r + 60;
  // La figura emerge del círculo: abajo la recorta el círculo, arriba asoma libre (máscara = mitad de arriba ∪ círculo).
  const mascara = `linear-gradient(#000, #000), radial-gradient(circle ${C.r}px at ${C.cx}px ${C.cy}px, #000 99.4%, transparent 100%)`;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: C.cx - C.r,
          top: C.cy - C.r,
          width: C.r * 2,
          height: C.r * 2,
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 45%, ${colores.halo} 0%, ${colores.acento} 78%, ${colores.acento} 100%)`,
          boxShadow: `0 0 ${60 * u}px ${12 * u}px rgba(${rgb(colores.halo)},0.45), 0 0 ${140 * u}px ${30 * u}px rgba(${rgb(colores.halo)},0.22)`,
          transform: `translateY(${((1 - qCirculo) * C.r * 0.6).toFixed(2)}px) scale(${(1 + 0.95 * (1 - qCirculo)).toFixed(4)})`,
          transformOrigin: '50% 50%',
          filter: qCirculo < 0.99 ? `blur(${(16 * (1 - qCirculo) * u).toFixed(2)}px)` : undefined,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          WebkitMaskImage: mascara,
          maskImage: mascara,
          WebkitMaskSize: `100% ${C.cy}px, 100% 100%`,
          maskSize: `100% ${C.cy}px, 100% 100%`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      >
        <DesenfoqueDireccional x={0} y={Math.min(26, velocidad * recorrido * 0.35)} style={{ position: 'absolute', inset: 0, transform: `translateY(${subida}px)` }}>
          {d.imagen !== undefined ? (
            <Img
              src={staticFile(d.imagen)}
              style={{
                position: 'absolute',
                left: D.sujeto.cx - D.sujeto.ancho / 2,
                top: D.sujeto.cabeza - 20,
                width: D.sujeto.ancho,
                height: pies - (D.sujeto.cabeza - 20),
                objectFit: 'contain',
                objectPosition: '50% 100%',
                filter: d.imagen_color ? 'drop-shadow(0 10px 30px rgba(0,0,0,0.45))' : 'grayscale(1) contrast(1.12) brightness(0.98) drop-shadow(0 10px 30px rgba(0,0,0,0.45))',
              }}
            />
          ) : (
            <Figura figura={d.figura} colores={colores} iconos={iconos} x={D.sujeto.cx} pies={pies} escala={2.1} sombra={0} monocromo="#F2F2F2" />
          )}
        </DesenfoqueDireccional>
      </div>

      <Cursiva
        texto={d.cursiva}
        x={D.cursiva.x}
        y={D.cursiva.y}
        tamano={tamCursiva}
        color={colores.cursiva}
        familia={LETRAS.cursiva}
        desde={fotogramaDe(s, t.cursiva.desde, fps)}
        hasta={fotogramaDe(s, t.cursiva.hasta, fps)}
        fotograma={f}
      />

      <TituloEstrecho
        texto={titulo}
        x={xTitulo}
        y={D.titulo.y}
        tamano={tamTitulo}
        familia={LETRAS.titulo}
        altoMayusculas={PAPELES.titulo.mayusculas}
        escalaX={PAPELES.titulo.escalaX}
        color="#FFFFFF"
        desde={desdeTitulo}
        duracion={CIERRE}
        fotograma={f}
        style={{
          backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 62%, #DCDCDC 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: `drop-shadow(0 ${6 * u}px ${10 * u}px rgba(0,0,0,0.45))`,
        }}
      />

      {d.icono !== undefined && t.icono !== null && f >= fotogramaDe(s, t.icono, fps)
        ? (() => {
            const lado = ladoIcono;
            const v = salto(f, fps, fotogramaDe(s, t.icono, fps) + 2);
            const x = Math.min(xTitulo + anchoAhora / 2 - entra, derecha - lado / 2);
            const y = D.titulo.y + altoMayusculas / 2 - 41 * u;
            return (
              <div
                style={{
                  position: 'absolute',
                  left: x - lado / 2,
                  top: y - lado / 2,
                  width: lado,
                  height: lado,
                  transform: `scale(${v}) rotate(${(1 - Math.min(1, v)) * -40}deg)`,
                  filter: `drop-shadow(0 ${4 * u}px ${6 * u}px rgba(0,0,0,0.45))`,
                }}
              >
                <div style={{ position: 'absolute', inset: lado * 0.06, borderRadius: '50%', background: '#FFFFFF' }} />
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Icono iconos={iconos} nombre={d.icono} estilo="duotono" lado={lado} color={colores.acento} colorFondo={colores.acento} />
                </div>
              </div>
            );
          })()
        : null}

      {linea !== '' && desdeLinea !== null && f >= desdeLinea
        ? (() => {
            const q = animar(f, [desdeLinea, desdeLinea + 7], [0, 1], CURVAS.frena);
            return (
              <DesenfoqueDireccional x={10 * (1 - q) * u} style={{ position: 'absolute', inset: 0, opacity: q, transform: `translateX(${(1 - q) * 40 * u}px)` }}>
                <TextoCentrado
                  texto={linea}
                  x={D.linea.x}
                  y={D.linea.y}
                  tamano={tamLinea}
                  familia={LETRAS.titulo}
                  altoMayusculas={PAPELES.lineaRoja.mayusculas}
                  escalaX={PAPELES.lineaRoja.escalaX}
                  color={colores.lineaRoja}
                  style={{ textShadow: `0 0 ${14 * u}px rgba(${rgb(colores.acento)},0.6), 0 ${3 * u}px ${8 * u}px rgba(0,0,0,0.5)` }}
                />
              </DesenfoqueDireccional>
            );
          })()
        : null}
    </>
  );
}
