// Un personaje: muñeco de cápsulas con cabeza blanca y redonda, dos ojos mínimos y boca solo al hablar o
// sorprenderse. Brazos y piernas con codo y rodilla, para que las poses se lean. La ropa sale del rol; lo que lleva en
// la mano, de la lista cerrada de objetos. También dos animales: cerdo y perro.

import type { ReactNode } from 'react';
import type { Asiento } from './decorados.ts';
import { APARIENCIAS, type Apariencia, type Detalle } from './personajes.ts';
import { PiezaVista, materialCabeza, contorno, geometria, materialTinta, tal, type ResolverColor } from './Piezas.tsx';
import type { Pieza, V3 } from './piezas.ts';
import type { Pose } from './poses.ts';
import type { Objeto, Rol } from './reglas.ts';

const PI = Math.PI;
const G = 3;
const OJO = '#1E1614';
const BOCA = '#6B2A22';
const DORADO = '#E8B63A';
const METAL = '#9AA4AE';

/** Una pieza de color fijo (#hex), con tinta fina. */
function P(props: { f: Pieza['f']; m: readonly number[]; c: string; p: V3; r?: V3; s?: V3; g?: number; brillo?: number; liso?: boolean }): ReactNode {
  return <PiezaVista pieza={{ g: G, liso: true, ...props }} color={tal} />;
}

/** La cabeza o las manos: blancas, siempre con el mismo material. */
function Blanca({ r, p }: { r: number; p: V3 }): ReactNode {
  const geo = geometria('esfera', [r, 26], false);
  return (
    <group position={[p[0], p[1], p[2]]}>
      <mesh geometry={geo} material={materialCabeza()} castShadow receiveShadow />
      <mesh geometry={contorno(geo)} material={materialTinta(3.4)} />
    </group>
  );
}

function ObjetoEnMano({ objeto, acento }: { objeto: Objeto | 'baston'; acento: string }): ReactNode {
  if (objeto === 'nada') return null;
  if (objeto === 'baston') {
    return <P f="cilindro" m={[0.026, 0.026, 0.95, 8]} c="#6C4A33" p={[0, -0.42, 0.02]} />;
  }
  // El resto se modela a lo largo de +Y con el agarre en el origen y se gira para quedar perpendicular al antebrazo.
  let piezas: ReactNode;
  switch (objeto) {
    case 'espada':
      piezas = (
        <>
          <P f="caja" m={[0.07, 0.72, 0.02]} c="#D7DEE5" p={[0, 0.5, 0]} />
          <P f="caja" m={[0.24, 0.045, 0.06]} c={DORADO} p={[0, 0.13, 0]} />
          <P f="cilindro" m={[0.028, 0.028, 0.16, 8]} c="#5A3A2A" p={[0, 0.03, 0]} />
        </>
      );
      break;
    case 'lanza':
      piezas = (
        <>
          <P f="cilindro" m={[0.026, 0.026, 2.0, 8]} c="#8B5E3C" p={[0, 0.35, 0]} />
          <P f="cono" m={[0.065, 0.24, 6]} c={METAL} p={[0, 1.47, 0]} />
        </>
      );
      break;
    case 'bandera':
      piezas = (
        <>
          <P f="cilindro" m={[0.026, 0.026, 1.7, 8]} c="#8B5E3C" p={[0, 0.5, 0]} />
          <P f="caja" m={[0.62, 0.42, 0.025]} c={acento} p={[0.33, 1.1, 0]} />
        </>
      );
      break;
    case 'carta':
      piezas = (
        <>
          <P f="caja" m={[0.3, 0.4, 0.012]} c="#FFF6E2" p={[0, 0.17, 0.04]} g={1.8} />
          <P f="esfera" m={[0.035]} c="#B8343A" p={[0, 0.06, 0.05]} g={0} />
        </>
      );
      break;
    case 'libro':
      piezas = (
        <>
          <P f="caja" m={[0.3, 0.38, 0.08]} c="#B8433A" p={[0, 0.13, 0.04]} />
          <P f="caja" m={[0.27, 0.35, 0.084]} c="#FFF6E2" p={[0.02, 0.13, 0.04]} g={0} />
        </>
      );
      break;
    case 'bolsa':
      piezas = (
        <>
          <P f="esfera" m={[0.16]} c="#B98A4F" p={[0, -0.1, 0.02]} s={[1, 0.9, 1]} />
          <P f="cilindro" m={[0.05, 0.08, 0.08, 8]} c="#8B5E3C" p={[0, 0.03, 0.02]} />
        </>
      );
      break;
    case 'catalejo':
      piezas = (
        <>
          <P f="cilindro" m={[0.045, 0.06, 0.5, 10]} c="#C9A13B" p={[0, 0.12, 0]} />
          <P f="cilindro" m={[0.065, 0.065, 0.06, 10]} c="#5A3A2A" p={[0, 0.34, 0]} />
        </>
      );
      break;
    case 'farol':
      piezas = (
        <>
          <P f="cilindro" m={[0.015, 0.015, 0.14, 6]} c="#3A3A3A" p={[0, -0.07, 0]} g={0} />
          <P f="caja" m={[0.18, 0.24, 0.18]} c="#3A3A3A" p={[0, -0.26, 0]} />
          <P f="esfera" m={[0.08]} c="#FFC870" p={[0, -0.26, 0]} brillo={1.6} g={0} />
        </>
      );
      break;
    case 'matraz':
      piezas = (
        <>
          <P f="cono" m={[0.13, 0.24, 10]} c="#BFE3F0" p={[0, 0.1, 0]} />
          <P f="cilindro" m={[0.035, 0.035, 0.14, 8]} c="#BFE3F0" p={[0, 0.27, 0]} />
          <P f="cono" m={[0.09, 0.12, 10]} c="#7FD35B" p={[0, 0.04, 0]} brillo={1.2} g={0} />
        </>
      );
      break;
    case 'martillo':
      piezas = (
        <>
          <P f="cilindro" m={[0.026, 0.026, 0.48, 8]} c="#8B5E3C" p={[0, 0.14, 0]} />
          <P f="caja" m={[0.24, 0.1, 0.1]} c={METAL} p={[0, 0.4, 0]} />
        </>
      );
      break;
  }
  return <group rotation={[PI / 2, 0, 0]}>{piezas}</group>;
}

function Sombrero({ a }: { a: Apariencia }): ReactNode {
  const c = a.sombreroColor;
  switch (a.sombrero) {
    case 'ninguno':
      return null;
    case 'corona':
      return (
        <>
          <P f="cilindro" m={[0.2, 0.2, 0.13, 10]} c={c} p={[0, 0.27, 0]} />
          {[0, 1, 2, 3, 4].map((k) => {
            const ang = (k / 5) * PI * 2 + PI / 2;
            return <P key={k} f="cono" m={[0.045, 0.12, 4]} c={c} p={[Math.cos(ang) * 0.17, 0.39, Math.sin(ang) * 0.17]} g={1.8} />;
          })}
          <P f="esfera" m={[0.035]} c="#C2303A" p={[0, 0.27, 0.2]} g={1.5} />
        </>
      );
    case 'casco':
      return (
        <>
          <P f="cupula" m={[0.34]} c={c} p={[0, 0.03, 0]} />
          <P f="cilindro" m={[0.39, 0.39, 0.025, 18]} c={c} p={[0, 0.035, 0.01]} />
        </>
      );
    case 'paja':
      return (
        <>
          <P f="cilindro" m={[0.5, 0.5, 0.03, 18]} c={c} p={[0, 0.19, 0]} />
          <P f="cilindro" m={[0.23, 0.26, 0.21, 14]} c={c} p={[0, 0.3, 0]} />
          <P f="cilindro" m={[0.265, 0.265, 0.05, 14]} c="#B8433A" p={[0, 0.23, 0]} g={0} />
        </>
      );
    case 'bicornio':
      return (
        <>
          <P f="esfera" m={[0.3]} c={c} p={[0, 0.27, -0.02]} s={[1.45, 0.6, 0.42]} />
          <P f="esfera" m={[0.05]} c={DORADO} p={[0.15, 0.31, 0.11]} g={1.5} />
        </>
      );
    case 'gorra':
      return (
        <>
          <P f="cupula" m={[0.335]} c={c} p={[0, 0.04, 0]} />
          <P f="caja" m={[0.28, 0.025, 0.22]} c={c} p={[0, 0.07, 0.33]} r={[-0.12, 0, 0]} />
        </>
      );
    case 'casco_obra':
      return (
        <>
          <P f="cupula" m={[0.345]} c={c} p={[0, 0.05, 0]} />
          <P f="cilindro" m={[0.41, 0.41, 0.025, 18]} c={c} p={[0, 0.05, 0.02]} />
          <P f="caja" m={[0.08, 0.06, 0.56]} c={c} p={[0, 0.37, 0]} g={1.5} />
        </>
      );
    case 'gorro_chef':
      return (
        <>
          <P f="cilindro" m={[0.29, 0.3, 0.16, 16]} c={c} p={[0, 0.27, 0]} />
          <P f="esfera" m={[0.31]} c={c} p={[0, 0.5, 0]} s={[1, 0.72, 1]} />
        </>
      );
    case 'salacot':
      return (
        <>
          <P f="cupula" m={[0.35]} c={c} p={[0, 0.05, 0]} s={[1, 0.82, 1]} />
          <P f="cilindro" m={[0.46, 0.46, 0.025, 18]} c={c} p={[0, 0.05, 0]} />
        </>
      );
  }
}

function DetallesCabeza({ a }: { a: Apariencia }): ReactNode {
  const c = a.detalleColor;
  const tiene = (d: Detalle): boolean => a.detalles.includes(d);
  return (
    <>
      {tiene('mono') && <P f="esfera" m={[0.13]} c={c} p={[0, 0.22, -0.21]} />}
      {tiene('coletas') && (
        <>
          <P f="esfera" m={[0.11]} c={c} p={[0.31, 0.02, -0.06]} />
          <P f="esfera" m={[0.11]} c={c} p={[-0.31, 0.02, -0.06]} />
        </>
      )}
      {tiene('barba') && <P f="cupula" m={[0.29]} c={c} p={[0, -0.03, 0.06]} r={[PI, 0, 0]} s={[1, 0.85, 0.95]} />}
      {tiene('gafas') && (
        <>
          <P f="toro" m={[0.072, 0.014]} c="#3A3A3A" p={[0.1, 0.02, 0.292]} g={0} />
          <P f="toro" m={[0.072, 0.014]} c="#3A3A3A" p={[-0.1, 0.02, 0.292]} g={0} />
          <P f="caja" m={[0.06, 0.016, 0.016]} c="#3A3A3A" p={[0, 0.03, 0.3]} g={0} />
        </>
      )}
      {tiene('espejo') && <P f="cilindro" m={[0.085, 0.085, 0.02, 14]} c={c} p={[0, 0.2, 0.26]} r={[PI / 2 - 0.5, 0, 0]} />}
      {tiene('pelo_loco') &&
        [
          [0.29, 0.05, -0.06],
          [-0.29, 0.05, -0.06],
          [0.23, 0.18, -0.14],
          [-0.23, 0.18, -0.14],
        ].map(([x, y, z], i) => <P key={i} f="esfera" m={[0.1]} c={c} p={[x, y, z]} />)}
    </>
  );
}

function DetallesTorso({ a }: { a: Apariencia }): ReactNode {
  const c = a.detalleColor;
  const tiene = (d: Detalle): boolean => a.detalles.includes(d);
  return (
    <>
      {tiene('capa') && <P f="caja" m={[0.5, 0.8, 0.05]} c={c} p={[0, 0.2, -0.24]} r={[0.1, 0, 0]} />}
      {tiene('corbata') && (
        <>
          <P f="caja" m={[0.08, 0.3, 0.02]} c={c} p={[0, 0.42, 0.217]} g={1.5} />
          <P f="caja" m={[0.1, 0.07, 0.03]} c={c} p={[0, 0.58, 0.21]} g={1.5} />
        </>
      )}
      {tiene('charreteras') &&
        [-1, 1].map((s) => <P key={s} f="caja" m={[0.16, 0.05, 0.14]} c={c} p={[s * 0.24, 0.63, 0]} g={1.5} />)}
      {tiene('botones') && [0.2, 0.33, 0.46].map((y) => <P key={y} f="esfera" m={[0.026]} c={c} p={[0, y, 0.218]} g={0} />)}
      {tiene('cinturon') && <P f="cilindro" m={[0.228, 0.228, 0.07, 16]} c={c} p={[0, 0.08, 0]} g={1.5} />}
      {tiene('tirantes') && (
        <>
          <P f="caja" m={[0.26, 0.22, 0.02]} c={c} p={[0, 0.2, 0.214]} g={1.5} />
          <P f="caja" m={[0.045, 0.42, 0.02]} c={c} p={[0.09, 0.42, 0.205]} g={0} />
          <P f="caja" m={[0.045, 0.42, 0.02]} c={c} p={[-0.09, 0.42, 0.205]} g={0} />
        </>
      )}
      {tiene('mochila') && <P f="caja" m={[0.32, 0.4, 0.16]} c={c} p={[0, 0.32, -0.27]} />}
      {tiene('franjas') && [0.22, 0.34, 0.46].map((y) => <P key={y} f="cilindro" m={[0.224, 0.224, 0.045, 16]} c={c} p={[0, y, 0]} g={0} />)}
      {tiene('delantal') && <P f="caja" m={[0.32, 0.5, 0.02]} c="#FFFFFF" p={[0, 0.14, 0.216]} g={1.5} />}
    </>
  );
}

function Brazo({ lado, hombro, codo, color, objeto, acento }: { lado: number; hombro: [number, number]; codo: number; color: string; objeto: Objeto | 'baston'; acento: string }): ReactNode {
  return (
    <group position={[lado * 0.27, 0.56, 0]} rotation={[hombro[0], 0, lado * hombro[1]]}>
      <P f="capsula" m={[0.068, 0.2]} c={color} p={[0, -0.1, 0]} g={2} />
      <group position={[0, -0.21, 0]} rotation={[codo, 0, 0]}>
        <P f="capsula" m={[0.062, 0.17]} c={color} p={[0, -0.085, 0]} g={2} />
        <Blanca r={0.08} p={[0, -0.21, 0]} />
        <group position={[0, -0.21, 0]}>
          <ObjetoEnMano objeto={objeto} acento={acento} />
        </group>
      </group>
    </group>
  );
}

function Pierna({ lado, muslo, rodilla, a }: { lado: number; muslo: number; rodilla: number; a: Apariencia }): ReactNode {
  return (
    <group position={[lado * 0.11, 0.52, 0]} rotation={[muslo, 0, 0]}>
      <P f="capsula" m={[0.078, 0.25]} c={a.piernas} p={[0, -0.125, 0]} g={2} />
      <group position={[0, -0.25, 0]} rotation={[rodilla, 0, 0]}>
        <P f="capsula" m={[0.072, 0.22]} c={a.piernas} p={[0, -0.11, 0]} g={2} />
        <P f="caja" m={[0.16, 0.09, 0.27]} c={a.zapatos} p={[0, -0.225, 0.05]} g={2} />
      </group>
    </group>
  );
}

function Humano({ a, pose, objeto, acento }: { a: Apariencia; pose: Pose; objeto: Objeto | 'baston'; acento: string }): ReactNode {
  return (
    <>
      <Pierna lado={-1} muslo={pose.musloD} rodilla={pose.rodillaD} a={a} />
      <Pierna lado={1} muslo={pose.musloI} rodilla={pose.rodillaI} a={a} />
      <group position={[0, 0.52, 0]} rotation={[pose.inclina, 0, pose.ladeo]}>
        <P f="capsula" m={[0.22, 0.3]} c={a.torso} p={[0, 0.3, 0]} />
        {a.falda !== undefined && <P f="cilindro" m={[0.215, 0.37, 0.44, 16]} c={a.falda} p={[0, -0.1, 0]} />}
        <DetallesTorso a={a} />
        <Brazo lado={-1} hombro={pose.hombroD} codo={pose.codoD} color={a.torso} objeto={objeto} acento={acento} />
        <Brazo lado={1} hombro={pose.hombroI} codo={pose.codoI} color={a.torso} objeto="nada" acento={acento} />
        <group position={[0, 0.66, 0]} rotation={[pose.cabeza[0], pose.cabeza[1], pose.cabeza[2]]}>
          <group position={[0, 0.31, 0]}>
            <Blanca r={0.31} p={[0, 0, 0]} />
            <P f="esfera" m={[0.042]} c={OJO} p={[0.1, 0.02, 0.276]} s={[0.85, 1.3 * pose.ojos, 0.55]} g={0} />
            <P f="esfera" m={[0.042]} c={OJO} p={[-0.1, 0.02, 0.276]} s={[0.85, 1.3 * pose.ojos, 0.55]} g={0} />
            {pose.boca > 0.04 && <P f="esfera" m={[0.07]} c={BOCA} p={[0, -0.13, 0.272]} s={[1, 0.22 + 0.8 * pose.boca, 0.45]} g={0} />}
            <DetallesCabeza a={a} />
            <Sombrero a={a} />
          </group>
        </group>
      </group>
    </>
  );
}

function Animal({ a, pose }: { a: Apariencia; pose: Pose }): ReactNode {
  const cerdo = a.animal === 'cerdo';
  const alto = cerdo ? 0.42 : 0.5;
  const sentado = pose.sentado > 0.5 ? -0.45 : 0;
  const patas: Array<[number, number, number]> = [
    [0.14, 0.22, 1],
    [-0.14, 0.22, -1],
    [0.14, -0.22, -1],
    [-0.14, -0.22, 1],
  ];
  return (
    <group rotation={[sentado, 0, 0]} position={[0, 0, sentado !== 0 ? -0.12 : 0]}>
      {patas.map(([x, z, s], i) => (
        <group key={i} position={[x, alto - 0.1, z]} rotation={[pose.patas * s, 0, 0]}>
          <P f="capsula" m={[cerdo ? 0.065 : 0.055, alto - 0.2]} c={a.piernas} p={[0, -(alto - 0.1) / 2, 0]} g={2} />
        </group>
      ))}
      <P f="capsula" m={[cerdo ? 0.27 : 0.2, cerdo ? 0.34 : 0.42]} c={a.torso} p={[0, alto, 0]} r={[PI / 2, 0, 0]} />
      <group position={[0, alto + (cerdo ? 0.08 : 0.2), cerdo ? 0.36 : 0.36]} rotation={[pose.cabeza[0] + pose.boca * 0.25 * Math.sin(pose.boca * 40), pose.cabeza[1], pose.cabeza[2]]}>
        <P f="esfera" m={[cerdo ? 0.23 : 0.19]} c={a.torso} p={[0, 0.02, 0.06]} />
        {cerdo ? (
          <>
            <P f="cilindro" m={[0.1, 0.11, 0.1, 12]} c={a.zapatos} p={[0, -0.02, 0.29]} r={[PI / 2, 0, 0]} />
            <P f="cono" m={[0.08, 0.14, 4]} c={a.piernas} p={[0.13, 0.22, 0.02]} r={[0.3, 0, -0.45]} g={1.8} />
            <P f="cono" m={[0.08, 0.14, 4]} c={a.piernas} p={[-0.13, 0.22, 0.02]} r={[0.3, 0, 0.45]} g={1.8} />
          </>
        ) : (
          <>
            <P f="caja" m={[0.14, 0.12, 0.2]} c={a.torso} p={[0, -0.04, 0.24]} />
            <P f="esfera" m={[0.04]} c={OJO} p={[0, 0.0, 0.35]} g={0} />
            <P f="caja" m={[0.07, 0.2, 0.05]} c={a.detalleColor} p={[0.17, -0.02, 0.02]} r={[0, 0, 0.25]} g={1.8} />
            <P f="caja" m={[0.07, 0.2, 0.05]} c={a.detalleColor} p={[-0.17, -0.02, 0.02]} r={[0, 0, -0.25]} g={1.8} />
          </>
        )}
        <P f="esfera" m={[0.034]} c={OJO} p={[0.08, 0.09, cerdo ? 0.25 : 0.21]} s={[0.9, 1.2 * pose.ojos, 0.6]} g={0} />
        <P f="esfera" m={[0.034]} c={OJO} p={[-0.08, 0.09, cerdo ? 0.25 : 0.21]} s={[0.9, 1.2 * pose.ojos, 0.6]} g={0} />
      </group>
      {cerdo ? (
        <P f="toro" m={[0.06, 0.018]} c={a.piernas} p={[0, alto + 0.08, -0.45]} r={[0, PI / 2 + pose.cola, 0]} g={1.5} />
      ) : (
        <group position={[0, alto + 0.05, -0.38]} rotation={[-0.7, pose.cola, 0]}>
          <P f="cilindro" m={[0.03, 0.04, 0.32, 6]} c={a.torso} p={[0, 0.16, 0]} g={1.8} />
        </group>
      )}
    </group>
  );
}

/** El asiento que aparece debajo de quien está sentado, según el decorado. */
function AsientoVista({ tipo, escala, color }: { tipo: Asiento; escala: number; color: ResolverColor }): ReactNode {
  const h = 0.225 * escala;
  let piezas: Pieza[];
  switch (tipo) {
    case 'taburete':
      piezas = [{ f: 'cilindro', m: [0.24, 0.26, h, 12], c: 'madera', p: [0, h / 2, -0.05] }];
      break;
    case 'trono':
      piezas = [
        { f: 'caja', m: [0.62, h, 0.55], c: 'alfombra', p: [0, h / 2, -0.05] },
        { f: 'caja', m: [0.66, 1.2, 0.12], c: 'dorado', p: [0, 0.6, -0.34] },
      ];
      break;
    case 'silla':
      piezas = [
        { f: 'caja', m: [0.56, 0.06, 0.5], c: 'madera', p: [0, h - 0.03, -0.05] },
        { f: 'caja', m: [0.06, h - 0.06, 0.06], c: 'madera2', p: [0.22, (h - 0.06) / 2, -0.25] },
        { f: 'caja', m: [0.06, h - 0.06, 0.06], c: 'madera2', p: [-0.22, (h - 0.06) / 2, -0.25] },
        { f: 'caja', m: [0.56, 0.7, 0.06], c: 'madera', p: [0, h + 0.3, -0.31] },
      ];
      break;
    case 'tronco':
      piezas = [{ f: 'cilindro', m: [h / 2, h / 2, 0.95, 9], c: 'tronco', p: [0, h / 2, -0.05], r: [0, 0, PI / 2] }];
      break;
    case 'caja':
      piezas = [{ f: 'caja', m: [0.52, h, 0.46], c: 'madera', p: [0, h / 2, -0.05] }];
      break;
    case 'roca':
      piezas = [{ f: 'roca', m: [0.32], c: 'piedra2', p: [0, h - 0.24, -0.05], s: [1.1, 0.75, 0.9] }];
      break;
  }
  return (
    <>
      {piezas.map((p, i) => (
        <PiezaVista key={i} pieza={p} color={color} />
      ))}
    </>
  );
}

export function Personaje({
  rol,
  pose,
  objeto,
  posicion,
  ladoCaida,
  asiento,
  color,
  acento,
}: {
  rol: Rol;
  pose: Pose;
  objeto: Objeto | 'baston';
  posicion: V3;
  ladoCaida: number;
  asiento: Asiento;
  color: ResolverColor;
  acento: string;
}): ReactNode {
  const a = APARIENCIAS[rol];
  const e = a.escala;
  const animal = a.animal !== undefined;
  const bajada = !animal ? 0.22 * e * pose.sentado : 0;
  const x = posicion[0] + pose.dx;
  const z = posicion[2] + pose.dz;
  const caida = ladoCaida * pose.caida * (PI / 2);
  if (animal) {
    // Un animal cae rodando sobre su propio eje: queda tumbado de lado, mire adonde mire.
    return (
      <group position={[x, posicion[1] + pose.y + 0.27 * e * pose.caida, z]} rotation={[0, pose.giro, 0]} scale={e}>
        <group rotation={[0, 0, caida]}>
          <Animal a={a} pose={pose} />
        </group>
      </group>
    );
  }
  return (
    <group position={[x, posicion[1], z]}>
      {pose.sentado > 0.5 && <AsientoVista tipo={asiento} escala={e} color={color} />}
      <group position={[0, pose.y + 0.2 * e * pose.caida - bajada, 0]} rotation={[0, 0, caida]}>
        <group rotation={[0, pose.giro, 0]} scale={e}>
          <Humano a={a} pose={pose} objeto={objeto} acento={acento} />
        </group>
      </group>
    </group>
  );
}
