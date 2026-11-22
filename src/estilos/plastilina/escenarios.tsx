// Los escenarios del estilo plastilina: lugares dibujados con código (consultorio, boca, oficina, tienda…) para que el
// fondo acompañe lo que se dice en cada escena. Formas redondeadas con luz desde arriba a la izquierda y un desenfoque
// de profundidad, para que los personajes, nítidos delante, sigan siendo lo primero que se ve. El suelo de cada
// escenario empieza en SUELO, donde se apoyan los personajes.

import type { ReactNode } from 'react';
import { ALTO, ANCHO } from '../../comun/guion.ts';
import { hash, tono } from '../_marionetas/curvas.ts';
import type { Escenario } from './reglas.ts';

export const SUELO = 1210;

/** Escenarios oscuros: textos claros encima y sombras más marcadas. */
export const ESCENARIOS_OSCUROS: ReadonlySet<Escenario> = new Set(['boca', 'gimnasio']);

/** Caja redondeada con volumen: degradado vertical y un filo de luz arriba. */
function Caja({ x, y, w, h, r = 18, color, luz = 0.18, id }: { x: number; y: number; w: number; h: number; r?: number; color: string; luz?: number; id: string }): ReactNode {
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tono(color, luz)} />
          <stop offset="1" stopColor={tono(color, -luz)} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={`url(#${id})`} />
      <rect x={x + r * 0.6} y={y + 4} width={Math.max(0, w - r * 1.2)} height={Math.min(10, h / 6)} rx={5} fill="#FFFFFF" opacity={0.22} />
    </g>
  );
}

function Pared({ id, arriba, abajo }: { id: string; arriba: string; abajo: string }): ReactNode {
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={arriba} />
          <stop offset="1" stopColor={abajo} />
        </linearGradient>
      </defs>
      <rect width={ANCHO} height={SUELO} fill={`url(#${id})`} />
    </g>
  );
}

/** Suelo con perspectiva: líneas que se abren hacia abajo, y una franja de sombra en la unión con la pared. */
function Suelo({ id, color, lineas = 'tablas' }: { id: string; color: string; lineas?: 'tablas' | 'baldosas' | 'liso' }): ReactNode {
  const rayas: ReactNode[] = [];
  if (lineas !== 'liso') {
    for (let i = -8; i <= 8; i++) rayas.push(<line key={`v${i}`} x1={540 + i * 70} y1={SUELO - 30} x2={540 + i * 260} y2={ALTO} stroke={tono(color, -0.14)} strokeWidth={4} opacity={0.6} />);
    if (lineas === 'baldosas') for (let k = 1; k < 9; k++) {
      const y = SUELO - 30 + (k * k) * 9;
      rayas.push(<line key={`h${k}`} x1={0} y1={y} x2={ANCHO} y2={y} stroke={tono(color, -0.14)} strokeWidth={4} opacity={0.6} />);
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tono(color, -0.08)} />
          <stop offset="0.3" stopColor={color} />
          <stop offset="1" stopColor={tono(color, -0.2)} />
        </linearGradient>
      </defs>
      <rect y={SUELO - 30} width={ANCHO} height={ALTO - SUELO + 30} fill={`url(#${id})`} />
      {rayas}
      <rect y={SUELO - 34} width={ANCHO} height={18} fill="#000" opacity={0.12} />
    </g>
  );
}

function Ventana({ x, y, w, h, cielo = '#BFE3FF', t, clave }: { x: number; y: number; w: number; h: number; cielo?: string; t: number; clave: string }): ReactNode {
  return (
    <g>
      <defs>
        <linearGradient id={`cielo-${clave}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cielo} />
          <stop offset="1" stopColor="#F2FAFF" />
        </linearGradient>
      </defs>
      <rect x={x - 16} y={y - 16} width={w + 32} height={h + 32} rx={22} fill="#FFFFFF" />
      <rect x={x} y={y} width={w} height={h} rx={10} fill={`url(#cielo-${clave})`} />
      {[0, 1].map((i) => {
        const cx = x + ((hash(i, 91) * w + t * 8) % w);
        return <ellipse key={i} cx={cx} cy={y + h * (0.3 + i * 0.3)} rx={w * 0.18} ry={h * 0.06} fill="#FFFFFF" opacity={0.85} />;
      })}
      <rect x={x + w / 2 - 7} y={y} width={14} height={h} fill="#FFFFFF" />
      <rect x={x} y={y + h / 2 - 7} width={w} height={14} fill="#FFFFFF" />
      <rect x={x - 26} y={y + h + 12} width={w + 52} height={22} rx={11} fill="#F4F4F4" />
    </g>
  );
}

function Planta({ x, y, s = 1 }: { x: number; y: number; s?: number }): ReactNode {
  const hojas = [-50, -25, 0, 25, 50].map((a, i) => (
    <ellipse key={i} cx={0} cy={-120} rx={34} ry={110} fill={i % 2 === 0 ? '#3FAE5B' : '#2E8F4A'} transform={`rotate(${a} 0 -10)`} />
  ));
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {hojas}
      <path d="M-70 -30 L70 -30 L56 90 Q0 104 -56 90 Z" fill="#E07A4F" />
      <rect x={-78} y={-44} width={156} height={28} rx={12} fill="#F09366" />
    </g>
  );
}

function Diente({ x, y, s, color = '#F8F4EC', giro = 0 }: { x: number; y: number; s: number; color?: string; giro?: number }): ReactNode {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro}) scale(${s})`}>
      <path d="M-40 -46 C-40 -64 -20 -66 0 -56 C20 -66 40 -64 40 -46 C40 -10 34 22 24 46 C18 58 8 46 0 30 C-8 46 -18 58 -24 46 C-34 22 -40 -10 -40 -46 Z" fill={color} />
      <ellipse cx={-16} cy={-40} rx={10} ry={6} fill="#FFFFFF" opacity={0.8} />
    </g>
  );
}

function Consultorio({ t }: { t: number }): ReactNode {
  const azulejos: ReactNode[] = [];
  for (let i = 0; i < 16; i++) azulejos.push(<line key={`a${i}`} x1={i * 72} y1={880} x2={i * 72} y2={SUELO} stroke="#CFE4DF" strokeWidth={4} />);
  for (let k = 0; k < 5; k++) azulejos.push(<line key={`b${k}`} x1={0} y1={880 + k * 72} x2={ANCHO} y2={880 + k * 72} stroke="#CFE4DF" strokeWidth={4} />);
  return (
    <g>
      <Pared id="pc-pared" arriba="#E3F5F1" abajo="#C9E9E2" />
      <rect y={870} width={ANCHO} height={SUELO - 870} fill="#F5FBFA" />
      {azulejos}
      <rect y={862} width={ANCHO} height={16} fill="#B9DCD4" />
      <Ventana x={90} y={330} w={300} h={380} t={t} clave="pc" />
      <g>
        <rect x={540} y={360} width={210} height={250} rx={18} fill="#FFFFFF" />
        <rect x={558} y={378} width={174} height={214} rx={10} fill="#DFF1FF" />
        <Diente x={645} y={470} s={1.15} />
        <path d="M600 560 Q645 590 690 560" stroke="#2F7BFF" strokeWidth={10} fill="none" strokeLinecap="round" />
      </g>
      <path d={`M1080 300 Q930 330 860 ${420 + 4 * Math.sin(t)}`} stroke="#BCC6CF" strokeWidth={22} fill="none" strokeLinecap="round" />
      <ellipse cx={830} cy={450} rx={110} ry={58} fill="#E9EEF3" />
      <ellipse cx={830} cy={462} rx={84} ry={36} fill="#FFF9DA" />
      <path d="M760 480 L600 900 L1060 900 L900 480 Z" fill="#FFF8D0" opacity={0.18} />
      <g>
        <path d="M760 1180 L760 1060 Q760 960 860 950 L1000 940 Q1060 940 1060 1000 L1060 1180 Z" fill="#4FB8F0" />
        <path d="M940 950 Q930 820 990 760 Q1040 720 1060 760 L1060 960 Z" fill="#3FA6DE" />
        <rect x={880} y={1150} width={60} height={40} fill="#A3ACBA" />
      </g>
      <Planta x={130} y={1080} s={0.9} />
      <Suelo id="pc-suelo" color="#E4ECEF" lineas="baldosas" />
    </g>
  );
}

function Boca({ t }: { t: number }): ReactNode {
  const arriba = Array.from({ length: 9 }, (_, i) => {
    const x = 60 + i * 120;
    const y = 300 + 0.0011 * (x - 540) ** 2;
    return <Diente key={`u${i}`} x={x} y={y} s={1.5} giro={180} />;
  });
  const abajo = Array.from({ length: 8 }, (_, i) => {
    const x = 110 + i * 123;
    const y = 1060 - 0.0009 * (x - 540) ** 2;
    return <Diente key={`d${i}`} x={x} y={y} s={1.45} />;
  });
  return (
    <g>
      <defs>
        <radialGradient id="pb-fondo" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0" stopColor="#7A1A30" />
          <stop offset="1" stopColor="#2A0610" />
        </radialGradient>
        <linearGradient id="pb-lengua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F07C92" />
          <stop offset="1" stopColor="#B83A55" />
        </linearGradient>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#pb-fondo)" />
      <path d={`M0 0 L1080 0 L1080 260 Q540 ${470 + 6 * Math.sin(t)} 0 260 Z`} fill="#E5768F" />
      {arriba}
      <path d={`M0 1180 L0 1000 Q540 ${1220} 1080 1000 L1080 1180 Z`} fill="#D9607C" />
      {abajo}
      <path d={`M-40 ${SUELO - 30} Q540 ${SUELO - 120} 1120 ${SUELO - 30} L1120 ${ALTO} L-40 ${ALTO} Z`} fill="url(#pb-lengua)" />
      <path d={`M540 ${SUELO - 70} Q548 ${SUELO + 200} 540 ${ALTO}`} stroke="#A33049" strokeWidth={14} fill="none" opacity={0.5} />
      {Array.from({ length: 6 }, (_, i) => (
        <circle key={i} cx={150 + hash(i, 81) * 780} cy={SUELO + 60 + hash(i, 82) * 300} r={6 + hash(i, 83) * 8} fill="#FFFFFF" opacity={0.25} />
      ))}
    </g>
  );
}

function Oficina({ t }: { t: number }): ReactNode {
  const lomos = ['#2F7BFF', '#FFC21A', '#F2474F', '#3FBF5F', '#8B5CF6', '#FF8A3D'];
  return (
    <g>
      <Pared id="po-pared" arriba="#EEF2F8" abajo="#D9E1EC" />
      <Ventana x={660} y={300} w={330} h={420} cielo="#A9D3FF" t={t} clave="po" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={690 + i * 76} y={560 - i * 40} width={56} height={160 + i * 40} fill="#9CB6D6" opacity={0.6} />
      ))}
      <rect x={60} y={420} width={360} height={22} rx={8} fill="#B98A5E" />
      <rect x={60} y={620} width={360} height={22} rx={8} fill="#B98A5E" />
      {lomos.map((c, i) => (
        <rect key={`l${i}`} x={80 + i * 52} y={300} width={42} height={120} rx={6} fill={c} />
      ))}
      {lomos.slice(0, 4).map((c, i) => (
        <rect key={`m${i}`} x={90 + i * 62} y={500} width={50} height={120} rx={6} fill={c} opacity={0.9} />
      ))}
      <Caja x={130} y={940} w={820} h={46} color="#C99B6D" id="po-mesa" />
      <rect x={180} y={986} width={30} height={200} fill="#A97F57" />
      <rect x={870} y={986} width={30} height={200} fill="#A97F57" />
      <Caja x={600} y={720} w={300} h={200} r={16} color="#2B2F3A" id="po-monitor" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={`g${i}`} x={640 + i * 60} y={880 - (40 + i * 30)} width={36} height={40 + i * 30} rx={6} fill={['#2FD1AE', '#4FB8F0', '#FFC21A', '#FF5FA2'][i]} />
      ))}
      <rect x={730} y={920} width={40} height={24} fill="#3A3F4C" />
      <Planta x={980} y={1110} s={0.7} />
      <Suelo id="po-suelo" color="#9AA7BA" lineas="liso" />
    </g>
  );
}

function Tienda(): ReactNode {
  const colores = ['#F2474F', '#FFC21A', '#2F7BFF', '#3FBF5F', '#FF8A3D', '#8B5CF6', '#FF5FA2', '#2FD1AE'];
  const estantes: ReactNode[] = [];
  [380, 590, 800].forEach((y, k) => {
    estantes.push(<rect key={`e${k}`} x={40} y={y} width={1000} height={24} rx={8} fill="#B98A5E" />);
    for (let i = 0; i < 9; i++) {
      const h = 90 + hash(i + k * 9, 71) * 70;
      const w = 70 + hash(i + k * 9, 72) * 30;
      const c = colores[(i * 3 + k) % colores.length];
      estantes.push(i % 3 === 2 ? <ellipse key={`f${k}${i}`} cx={80 + i * 110} cy={y - 50} rx={40} ry={50} fill={c} /> : <rect key={`c${k}${i}`} x={60 + i * 110} y={y - h} width={w} height={h} rx={10} fill={c} />);
    }
  });
  return (
    <g>
      <Pared id="pt-pared" arriba="#FFF4E6" abajo="#F6E2C8" />
      <rect x={20} y={160} width={1040} height={700} rx={20} fill="#E9D2B3" />
      {estantes}
      <Caja x={600} y={930} w={480} h={260} color="#C99B6D" id="pt-mostrador" />
      <Caja x={720} y={850} w={200} h={100} r={14} color="#3A3F4C" id="pt-caja" />
      <rect x={745} y={868} width={150} height={40} rx={8} fill="#2FD1AE" />
      <Suelo id="pt-suelo" color="#D9B48A" lineas="tablas" />
    </g>
  );
}

function Cocina({ t }: { t: number }): ReactNode {
  const azulejos: ReactNode[] = [];
  for (let k = 0; k < 6; k++) for (let i = 0; i < 9; i++) azulejos.push(<rect key={`${k}-${i}`} x={i * 130 - (k % 2) * 65} y={620 + k * 56} width={124} height={50} rx={10} fill="#FFFFFF" />);
  return (
    <g>
      <Pared id="pk-pared" arriba="#FFF6EC" abajo="#F2E4D2" />
      <rect y={610} width={ANCHO} height={340} fill="#E6DCCF" />
      {azulejos}
      {[0, 1, 2].map((i) => (
        <Caja key={i} x={60 + i * 330} y={230} w={300} h={300} color="#7CC6B4" id={`pk-mueble-${i}`} />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={`p${i}`} cx={210 + i * 330} cy={380} r={12} fill="#F4F4F4" />
      ))}
      <Caja x={0} y={950} w={ANCHO} h={60} r={10} color="#D7C2A5" id="pk-encimera" />
      <rect y={1010} width={ANCHO} height={200} fill="#7CC6B4" />
      <Caja x={600} y={860} w={210} h={100} r={20} color="#A3ACBA" id="pk-olla" />
      {[0, 1].map((i) => {
        const v = (t * 0.5 + i * 0.5) % 1;
        return <path key={`v${i}`} d={`M${670 + i * 60} ${850 - v * 120} q -18 -30 0 -60 q 18 -30 0 -60`} stroke="#FFFFFF" strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.6 * Math.sin(Math.PI * v)} />;
      })}
      <Suelo id="pk-suelo" color="#E8E1D6" lineas="baldosas" />
    </g>
  );
}

function Salon(): ReactNode {
  return (
    <g>
      <Pared id="ps-pared" arriba="#F6EADF" abajo="#EAD6C4" />
      <rect x={110} y={330} width={260} height={200} rx={14} fill="#FFFFFF" />
      <rect x={128} y={348} width={224} height={164} rx={8} fill="#BFE3FF" />
      <path d="M128 512 L210 420 L270 470 L320 430 L352 470 L352 512 Z" fill="#3FBF5F" />
      <rect x={430} y={300} width={180} height={240} rx={14} fill="#FFFFFF" />
      <rect x={446} y={316} width={148} height={208} rx={8} fill="#FFD8C2" />
      <circle cx={520} cy={400} r={40} fill="#FF8A3D" />
      <line x1={900} y1={300} x2={900} y2={1180} stroke="#4A4A55" strokeWidth={14} />
      <path d="M820 300 L980 300 L940 200 L860 200 Z" fill="#FFE27A" />
      <ellipse cx={900} cy={1180} rx={60} ry={14} fill="#4A4A55" />
      <Caja x={60} y={840} w={760} h={260} r={60} color="#3FA6A0" id="ps-sofa" />
      <Caja x={100} y={720} w={680} h={170} r={60} color="#4BB7B0" id="ps-respaldo" />
      <rect x={100} y={1090} width={40} height={90} fill="#8A6A4A" />
      <rect x={740} y={1090} width={40} height={90} fill="#8A6A4A" />
      <Suelo id="ps-suelo" color="#C79A6B" lineas="tablas" />
      <ellipse cx={540} cy={SUELO + 120} rx={500} ry={110} fill="#E9C7A8" opacity={0.7} />
    </g>
  );
}

function Calle({ t }: { t: number }): ReactNode {
  const edificios = [
    { x: 0, w: 230, h: 620, c: '#F6C7A6' },
    { x: 220, w: 200, h: 760, c: '#B9D4F2' },
    { x: 410, w: 260, h: 560, c: '#F4E1A6' },
    { x: 660, w: 210, h: 700, c: '#CDB8F0' },
    { x: 860, w: 230, h: 600, c: '#B6E3CF' },
  ];
  return (
    <g>
      <Pared id="pl-cielo" arriba="#9FD0FF" abajo="#E6F4FF" />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={(hash(i, 31) * 1300 + t * 10) % 1300 - 100} cy={160 + i * 90} rx={120} ry={38} fill="#FFFFFF" opacity={0.85} />
      ))}
      {edificios.map((b, i) => {
        const top = SUELO - 120 - b.h;
        const ventanas: ReactNode[] = [];
        for (let fy = top + 60; fy < SUELO - 200; fy += 110) for (let fx = b.x + 34; fx < b.x + b.w - 50; fx += 78) ventanas.push(<rect key={`${fx}-${fy}`} x={fx} y={fy} width={46} height={62} rx={8} fill="#FFFFFF" opacity={0.75} />);
        return (
          <g key={i}>
            <Caja x={b.x} y={top} w={b.w} h={b.h + 140} r={16} color={b.c} luz={0.08} id={`pl-edif-${i}`} />
            {ventanas}
          </g>
        );
      })}
      <circle cx={980} cy={760} r={120} fill="#3FAE5B" />
      <rect x={968} y={840} width={24} height={300} fill="#8A6A4A" />
      <rect y={SUELO - 60} width={ANCHO} height={30} fill="#BFC5CD" />
      <Suelo id="pl-suelo" color="#A7AFBA" lineas="baldosas" />
    </g>
  );
}

function Parque({ t }: { t: number }): ReactNode {
  return (
    <g>
      <Pared id="pq-cielo" arriba="#8FCBFF" abajo="#E3F4FF" />
      <circle cx={860} cy={260} r={80} fill="#FFE27A" />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={(hash(i, 41) * 1300 + t * 9) % 1300 - 100} cy={200 + i * 110} rx={130} ry={40} fill="#FFFFFF" opacity={0.9} />
      ))}
      <path d={`M-50 900 Q260 700 560 880 Q820 760 1130 900 L1130 ${SUELO} L-50 ${SUELO} Z`} fill="#8FD08A" />
      <path d={`M-50 980 Q300 860 640 990 Q900 900 1130 990 L1130 ${SUELO} L-50 ${SUELO} Z`} fill="#6CBF6A" />
      {[140, 900].map((x, i) => (
        <g key={i}>
          <rect x={x - 16} y={760} width={32} height={360} rx={10} fill="#8A6A4A" />
          <circle cx={x} cy={720} r={130} fill="#3FAE5B" />
          <circle cx={x - 70} cy={790} r={80} fill="#4BBE66" />
          <circle cx={x + 70} cy={790} r={80} fill="#38A253" />
        </g>
      ))}
      <Caja x={560} y={1010} w={320} h={34} r={12} color="#C99B6D" id="pq-banco" />
      <Caja x={560} y={950} w={320} h={34} r={12} color="#C99B6D" id="pq-respaldo" />
      <rect x={590} y={1044} width={20} height={130} fill="#5A5A66" />
      <rect x={830} y={1044} width={20} height={130} fill="#5A5A66" />
      <Suelo id="pq-suelo" color="#5DB35B" lineas="liso" />
    </g>
  );
}

function Gimnasio(): ReactNode {
  return (
    <g>
      <Pared id="pg-pared" arriba="#3A3D48" abajo="#262830" />
      <rect x={80} y={300} width={500} height={600} rx={14} fill="#5C6577" opacity={0.6} />
      <rect x={100} y={320} width={460} height={560} rx={10} fill="#7E8AA0" opacity={0.35} />
      <rect y={560} width={ANCHO} height={40} fill="#FFC21A" opacity={0.85} />
      <Caja x={640} y={820} w={400} h={30} r={10} color="#6B7385" id="pg-rack" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={670 + i * 92} y={790} width={60} height={20} rx={8} fill="#B8BFCC" />
          <rect x={660 + i * 92} y={772} width={18} height={56} rx={6} fill="#2B2E37" />
          <rect x={712 + i * 92} y={772} width={18} height={56} rx={6} fill="#2B2E37" />
        </g>
      ))}
      {[0, 1].map((i) => (
        <g key={`k${i}`} transform={`translate(${720 + i * 180} 1110)`}>
          <circle r={56} fill={i === 0 ? '#F2474F' : '#2F7BFF'} />
          <path d="M-36 -46 Q0 -110 36 -46" stroke={i === 0 ? '#C8343C' : '#245FCC'} strokeWidth={18} fill="none" />
        </g>
      ))}
      <Suelo id="pg-suelo" color="#2E3038" lineas="baldosas" />
    </g>
  );
}

function Aula({ t }: { t: number }): ReactNode {
  return (
    <g>
      <Pared id="pa-pared" arriba="#FFF3DD" abajo="#F3DFBF" />
      <rect x={110} y={280} width={860} height={480} rx={20} fill="#B98A5E" />
      <rect x={134} y={304} width={812} height={432} rx={12} fill="#2F5D4A" />
      <path d="M200 400 Q300 360 400 400 T600 400" stroke="#FFFFFF" strokeWidth={8} fill="none" opacity={0.7} strokeLinecap="round" />
      <path d="M200 480 L520 480 M200 540 L440 540 M640 470 L860 470 M640 540 L820 640" stroke="#FFFFFF" strokeWidth={8} opacity={0.55} strokeLinecap="round" />
      <circle cx={760} cy={600} r={70} fill="none" stroke="#FFE27A" strokeWidth={8} opacity={0.6} />
      <rect x={160} y={760} width={760} height={24} rx={8} fill="#A97F57" />
      <circle cx={960} cy={170} r={60} fill="#FFFFFF" stroke="#4A4A55" strokeWidth={10} />
      <line x1={960} y1={170} x2={960 + 34 * Math.sin(t * 0.3)} y2={170 - 34 * Math.cos(t * 0.3)} stroke="#4A4A55" strokeWidth={8} strokeLinecap="round" />
      <line x1={960} y1={170} x2={990} y2={180} stroke="#F2474F" strokeWidth={6} strokeLinecap="round" />
      <Caja x={80} y={960} w={360} h={40} r={10} color="#C99B6D" id="pa-pupitre" />
      <rect x={110} y={1000} width={24} height={180} fill="#5A5A66" />
      <rect x={386} y={1000} width={24} height={180} fill="#5A5A66" />
      <Suelo id="pa-suelo" color="#D2A877" lineas="tablas" />
    </g>
  );
}

function Finanzas({ t }: { t: number }): ReactNode {
  const pila = (x: number, n: number, k: number): ReactNode[] =>
    Array.from({ length: n }, (_, i) => (
      <g key={`${k}-${i}`}>
        <ellipse cx={x} cy={1120 - i * 26} rx={70} ry={22} fill="#C9940B" />
        <ellipse cx={x} cy={1114 - i * 26} rx={70} ry={22} fill="#F6C93A" />
      </g>
    ));
  const barras = [120, 180, 150, 240, 300];
  return (
    <g>
      <Pared id="pf-pared" arriba="#E8EEFB" abajo="#CBD6EE" />
      <rect x={110} y={300} width={520} height={380} rx={18} fill="#FFFFFF" />
      {barras.map((h, i) => (
        <rect key={i} x={160 + i * 92} y={640 - h * Math.min(1, 0.6 + 0.4 * Math.sin(t * 0.8 + i) ** 2)} width={60} height={h * Math.min(1, 0.6 + 0.4 * Math.sin(t * 0.8 + i) ** 2)} rx={10} fill={i === barras.length - 1 ? '#3FBF5F' : '#4FB8F0'} />
      ))}
      <path d="M170 560 L260 520 L350 540 L440 460 L530 400" stroke="#F2474F" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Caja x={720} y={760} w={300} h={420} r={26} color="#7D8696" id="pf-caja" />
      <circle cx={870} cy={960} r={80} fill="#A3ACBA" />
      <circle cx={870} cy={960} r={26} fill="#5A6170" />
      {pila(180, 6, 0)}
      {pila(330, 4, 1)}
      <Suelo id="pf-suelo" color="#8F9AB5" lineas="liso" />
    </g>
  );
}

export function DibujoEscenario({ e, t }: { e: Escenario; t: number }): ReactNode {
  const dibujo = {
    consultorio: <Consultorio t={t} />,
    boca: <Boca t={t} />,
    oficina: <Oficina t={t} />,
    tienda: <Tienda />,
    cocina: <Cocina t={t} />,
    salon: <Salon />,
    calle: <Calle t={t} />,
    parque: <Parque t={t} />,
    gimnasio: <Gimnasio />,
    aula: <Aula t={t} />,
    finanzas: <Finanzas t={t} />,
  }[e];
  return (
    <g>
      <defs>
        <filter id={`profundidad-${e}`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation={4.5} />
        </filter>
      </defs>
      <g filter={`url(#profundidad-${e})`}>{dibujo}</g>
    </g>
  );
}
