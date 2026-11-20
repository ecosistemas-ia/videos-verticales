// La capa de los encabezados, portada de MOTION (plantilla M3, Testate.tsx):
//   - el título de la pregunta entra grande, gris y transparente y se posa blanco en ~12 fotogramas, con una línea
//     fina debajo; la cursiva («¿Qué es el») se escribe encima, a caballo de la esquina de arriba a la izquierda;
//   - en las escenas siguientes con el mismo texto se queda quieto; con las tarjetas sube en ~12 fotogramas y la
//     cursiva y la línea se desvanecen;
//   - al final del grupo sale con su escena: hacia abajo, más despacio que el contenido, o desvaneciéndose.

import type { ReactNode } from 'react';
import { ALTO } from '../../comun/guion.ts';
import { CURVAS, animar } from './curvas.ts';
import { DISENO, PAPELES, type Colores } from './diseno.ts';
import { BAJADA_ENCABEZADO, estiloDe, tamanoPapel } from './escenas/comunes.ts';
import { LETRAS, anchoTexto } from './letras.ts';
import { QUIETA, Saliente, salidaHaciaAbajo } from './movimientos.tsx';
import type { EncabezadoPlan, Plan, PosicionEncabezado } from './plan.ts';
import { Cursiva, TextoCentrado } from './textos.tsx';

const SUBIDA = 12;
const ENTRADA = 12;

export function Encabezados({ plan, f, colores }: { readonly plan: Plan; readonly f: number; readonly colores: Colores }): ReactNode {
  return <>{plan.encabezados.map((e, i) => (f >= e.inicio && f < e.fin ? <Encabezado key={i} e={e} f={f} colores={colores} /> : null))}</>;
}

function Encabezado({ e, f, colores }: { e: EncabezadoPlan; f: number; colores: Colores }): ReactNode {
  const E = DISENO.encabezado;
  const u = E.u;
  if (f < e.entra && e.cursiva === null) return null;
  let k = 0;
  for (let j = 0; j < e.etapas.length; j++) if (e.etapas[j].inicio <= f) k = j;
  const y = (p: PosicionEncabezado): number => (p === 'alto' ? E.alto : E.centro);
  const actual = e.etapas[k];
  const anterior = k > 0 ? e.etapas[k - 1] : null;
  const qSubida = anterior !== null && anterior.posicion !== actual.posicion ? animar(f, [actual.inicio, actual.inicio + SUBIDA], [0, 1], CURVAS.suave) : 1;
  const yDesde = anterior !== null ? y(anterior.posicion) : y(actual.posicion);
  const yAhora = yDesde + (y(actual.posicion) - yDesde) * qSubida;
  // La cursiva y la línea: llenas abajo, se desvanecen al subir.
  const abajo =
    actual.posicion !== 'alto' ? 1 : anterior !== null && anterior.posicion !== 'alto' ? 1 - animar(f, [actual.inicio, actual.inicio + 6], [0, 1], CURVAS.salida) : 0;
  const texto = e.texto.toLocaleUpperCase('es');
  const tamano = tamanoPapel(texto, PAPELES.encabezado, u, E.ancho);
  const ancho = anchoTexto(texto, tamano, estiloDe(PAPELES.encabezado));
  const q = animar(f, [e.entra, e.entra + ENTRADA], [0, 1], CURVAS.frena);
  const gris = Math.round(120 + 135 * q);
  const salida =
    e.salida === 'abajo'
      ? salidaHaciaAbajo(f, e.fin, { duracion: e.duracionSalida, distancia: ALTO * BAJADA_ENCABEZADO })
      : e.salida === 'desvanece'
        ? { ...QUIETA, opacidad: 1 - animar(f, [e.fin - e.duracionSalida, e.fin], [0, 1], CURVAS.salida) }
        : QUIETA;
  const altoMayusculas = tamano * PAPELES.encabezado.mayusculas;
  const tamCursiva = e.cursiva === null ? 0 : tamanoPapel(e.cursiva.texto, PAPELES.cursivaPregunta, u, DISENO.anchoTexto);
  return (
    <Saliente estado={salida} origen={`${E.x}px ${yAhora}px`}>
      {f >= e.entra ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.25 + 0.75 * q,
            transform: `scale(${1.15 - 0.15 * q})`,
            transformOrigin: `${E.x}px ${yAhora}px`,
            filter: q < 0.99 ? `blur(${(2.5 * (1 - q) * u).toFixed(2)}px)` : undefined,
          }}
        >
          <TextoCentrado
            texto={texto}
            x={E.x}
            y={yAhora}
            tamano={tamano}
            familia={LETRAS.titulo}
            altoMayusculas={PAPELES.encabezado.mayusculas}
            escalaX={PAPELES.encabezado.escalaX}
            espaciado={PAPELES.encabezado.espaciado}
            color={`rgb(${gris},${gris},${gris})`}
            style={{
              textShadow: `0 ${3 * u}px ${8 * u}px rgba(0,0,0,0.55)`,
              backgroundImage: q > 0.99 ? 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 60%, #E2E2E2 100%)' : undefined,
              WebkitBackgroundClip: q > 0.99 ? 'text' : undefined,
              backgroundClip: q > 0.99 ? 'text' : undefined,
            }}
          />
          {abajo > 0.001 ? (
            <div
              style={{
                position: 'absolute',
                left: E.x - ancho / 2 - 8 * u,
                top: yAhora + altoMayusculas / 2 + 10 * u,
                width: ancho + 16 * u,
                height: Math.max(1, 1.5 * u),
                background: 'rgba(255,255,255,0.88)',
                opacity: abajo,
              }}
            />
          ) : null}
        </div>
      ) : null}
      {e.cursiva !== null && abajo > 0.001 ? (
        <Cursiva
          texto={e.cursiva.texto}
          x={E.x - 8 * u}
          y={yAhora - altoMayusculas / 2 - 30 * u}
          tamano={tamCursiva}
          color={colores.cursiva}
          familia={LETRAS.cursiva}
          desde={e.cursiva.desde}
          hasta={e.cursiva.hasta}
          fotograma={f}
          opacidad={abajo}
        />
      ) : null}
    </Saliente>
  );
}
