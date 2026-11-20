// Los colores de la maqueta 3D por material, en cinco paletas. Tonos de juguete pintado: tierras cálidas, verdes suaves,
// nada saturado salvo los toldos, las pinturas de los templos y el fuego (la luz cálida hace el resto).

import type { Material, TipoMundo } from '../_mundo/tipos.ts';

export type NombrePaleta = 'altiplano' | 'tropical' | 'mediterranea' | 'templada' | 'urbana';

const BASE: Record<Material, string> = {
  hierba: '#9AAE5E',
  hierba_seca: '#BCAE72',
  tierra: '#A9764F',
  arena: '#D8C193',
  roca: '#9C8C7C',
  piedra: '#A39383',
  piedra_clara: '#D6C2A2',
  adobe: '#C99A6B',
  adobe_claro: '#DDB98D',
  cal: '#EFE6D6',
  ladrillo: '#B2603F',
  teja: '#BC5E3C',
  paja: '#CDAA63',
  madera: '#94683F',
  madera_oscura: '#4F3727',
  hormigon: '#C4BDB2',
  vidrio: '#7393A8',
  metal: '#7C8088',
  asfalto: '#5A5B60',
  acera: '#C7BFB1',
  marca: '#F2ECDF',
  tela1: '#C8463A',
  tela2: '#E3A93A',
  tela3: '#3A86A8',
  hoja: '#6F9442',
  hoja2: '#4F7C3D',
  hoja3: '#94AC5C',
  tronco: '#6E4B33',
  cultivo1: '#93B24E',
  cultivo2: '#D2B65E',
  cultivo3: '#8A5B3A',
  pintura1: '#B9452F',
  pintura2: '#3474A3',
  oro: '#DAAB3E',
  ventana: '#2F3440',
  fuego: '#FF8A2A',
  agua: '#3F7484',
};

const CAMBIOS: Record<NombrePaleta, Partial<Record<Material, string>>> = {
  altiplano: { hierba: '#98A964', hierba_seca: '#B8AE77', hoja: '#7C9447', hoja2: '#5E7F40', agua: '#40707E', piedra_clara: '#CFB696', adobe: '#C2906A' },
  tropical: { hierba: '#86B256', hierba_seca: '#A9B865', hoja: '#4E9A44', hoja2: '#3C7F3A', hoja3: '#77B05A', agua: '#3D8A8C', adobe: '#D4A37C', piedra_clara: '#DBCDB4', cultivo1: '#7DBB4C' },
  mediterranea: { hierba: '#A3AF68', cal: '#F3EEE3', teja: '#C76A42', piedra: '#B5A58F', agua: '#2F7FA3', hoja: '#7B9A4A', pintura2: '#E0B85A' },
  templada: { hierba: '#86AC56', hoja: '#5F9442', hoja2: '#3F6E3B', teja: '#9E4D38', piedra: '#9E9B94', piedra_clara: '#C9C2B4', agua: '#4A7D8E', cal: '#ECE4D4' },
  urbana: { hierba: '#88AE5C', hormigon: '#C9C4BC', vidrio: '#86A9C2', asfalto: '#4F5156', agua: '#3F7C95', ladrillo: '#B86A4C', pintura2: '#D9A55B' },
};

export const PALETA_POR_MUNDO: Record<TipoMundo, NombrePaleta> = {
  ciudad_antigua: 'altiplano',
  ciudad_moderna: 'urbana',
  pueblo: 'templada',
  puerto: 'mediterranea',
};

export function paleta(nombre: NombrePaleta): Record<Material, string> {
  return { ...BASE, ...CAMBIOS[nombre] };
}
