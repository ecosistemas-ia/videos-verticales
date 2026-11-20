// Colores del mundo por paleta y luz por hora del día. Paletas propias: tierra cálida, verdes de oliva y tejados de
// terracota; nada tomado de un canal concreto. La ropa de los personajes va por rol (personajes.ts), no por paleta.

import type { Hora, NombrePaleta } from './reglas.ts';

export interface Paleta {
  readonly pasto: string;
  readonly pasto2: string;
  readonly tierra: string;
  readonly camino: string;
  readonly piedra: string;
  readonly piedra2: string;
  readonly madera: string;
  readonly madera2: string;
  readonly tejado: string;
  readonly tejado2: string;
  readonly pared: string;
  readonly pared2: string;
  readonly pared3: string;
  readonly follaje: string;
  readonly follaje2: string;
  readonly tronco: string;
  readonly agua: string;
  readonly arena: string;
  readonly nieve: string;
  readonly metal: string;
  readonly tela: string;
  readonly tela2: string;
  readonly dorado: string;
  readonly sueloInterior: string;
  readonly muroInterior: string;
  readonly alfombra: string;
  readonly ventana: string;
}

export const PALETAS_MUNDO: Readonly<Record<NombrePaleta, Paleta>> = {
  calida: {
    pasto: '#93B358',
    pasto2: '#7EA04B',
    tierra: '#B98A5A',
    camino: '#DDBB86',
    piedra: '#BDB2A2',
    piedra2: '#958A7C',
    madera: '#A0704A',
    madera2: '#7A5134',
    tejado: '#C8553D',
    tejado2: '#A8432F',
    pared: '#F2DFBA',
    pared2: '#E7C79A',
    pared3: '#D9A87A',
    follaje: '#5E9447',
    follaje2: '#82B85C',
    tronco: '#7A5134',
    agua: '#3F8FB5',
    arena: '#E9CB90',
    nieve: '#F8F5EF',
    metal: '#8C97A3',
    tela: '#E9B44C',
    tela2: '#3D6FA8',
    dorado: '#E8B63A',
    sueloInterior: '#C79E74',
    muroInterior: '#EAD6B4',
    alfombra: '#B8433A',
    ventana: '#FFE2A6',
  },
  fresca: {
    pasto: '#7DBB78',
    pasto2: '#69A866',
    tierra: '#A99272',
    camino: '#D8CCB0',
    piedra: '#B9BEC0',
    piedra2: '#8E979B',
    madera: '#9A7656',
    madera2: '#6E5640',
    tejado: '#3E7CB1',
    tejado2: '#2F6290',
    pared: '#EEF1EA',
    pared2: '#D9E3DC',
    pared3: '#BFD3CB',
    follaje: '#3F9A6B',
    follaje2: '#67BE84',
    tronco: '#6E5640',
    agua: '#2E9CC2',
    arena: '#EADCB6',
    nieve: '#F7FAFC',
    metal: '#8796A4',
    tela: '#F2C14E',
    tela2: '#E0605A',
    dorado: '#E6BE45',
    sueloInterior: '#B9A58A',
    muroInterior: '#E4ECE6',
    alfombra: '#2F6F8F',
    ventana: '#FFF0C2',
  },
  pastel: {
    pasto: '#B2D69A',
    pasto2: '#9FC888',
    tierra: '#D8B998',
    camino: '#F0DDBF',
    piedra: '#D7CFC6',
    piedra2: '#B8AEA4',
    madera: '#C99E7D',
    madera2: '#A47C5E',
    tejado: '#E79C9C',
    tejado2: '#CF8282',
    pared: '#FFF3DE',
    pared2: '#F6E2C4',
    pared3: '#EBCDB0',
    follaje: '#8CC79A',
    follaje2: '#B5DDA2',
    tronco: '#A47C5E',
    agua: '#8FCBE6',
    arena: '#F5E2B8',
    nieve: '#FFFFFF',
    metal: '#B4BCC8',
    tela: '#F7D488',
    tela2: '#9BB8E8',
    dorado: '#F0CF6A',
    sueloInterior: '#E2C6A6',
    muroInterior: '#FBEBD5',
    alfombra: '#D98A9A',
    ventana: '#FFF4CF',
  },
  otono: {
    pasto: '#B3A251',
    pasto2: '#9E8C45',
    tierra: '#A9764B',
    camino: '#D7B07A',
    piedra: '#B0A493',
    piedra2: '#8A7D6C',
    madera: '#93603C',
    madera2: '#6C4329',
    tejado: '#7D3C2A',
    tejado2: '#5F2D20',
    pared: '#EED8B2',
    pared2: '#DFBE8F',
    pared3: '#C99A6A',
    follaje: '#D9822B',
    follaje2: '#C2552B',
    tronco: '#5F3B24',
    agua: '#4A7F9A',
    arena: '#E2C287',
    nieve: '#F6F1E8',
    metal: '#8A8F95',
    tela: '#D9A13B',
    tela2: '#5B7A4A',
    dorado: '#D9A73A',
    sueloInterior: '#B98B5E',
    muroInterior: '#E6CFA8',
    alfombra: '#8E3B2E',
    ventana: '#FFD98F',
  },
};

export interface Luz {
  readonly cieloArriba: string;
  readonly cieloAbajo: string;
  readonly sol: string;
  readonly solIntensidad: number;
  /** Dirección desde la que llega el sol (no hace falta normalizar). */
  readonly solDireccion: readonly [number, number, number];
  readonly hemiCielo: string;
  readonly hemiSuelo: string;
  readonly hemiIntensidad: number;
  /** Luz de farol cálida junto a los personajes (solo de noche). */
  readonly farol: number;
  /** Cuánto brillan ventanas, fuegos y faroles. */
  readonly brillo: number;
}

export const LUCES: Readonly<Record<Hora, Luz>> = {
  manana: {
    cieloArriba: '#86BDE6',
    cieloAbajo: '#F8DEC4',
    sol: '#FFE7C7',
    solIntensidad: 2.4,
    solDireccion: [-6, 7, 7],
    hemiCielo: '#CFE4FF',
    hemiSuelo: '#B49C74',
    hemiIntensidad: 1.35,
    farol: 0,
    brillo: 0.25,
  },
  mediodia: {
    cieloArriba: '#5CA6E6',
    cieloAbajo: '#D3EAF8',
    sol: '#FFF6E6',
    solIntensidad: 2.7,
    solDireccion: [3, 12, 6],
    hemiCielo: '#DCEEFF',
    hemiSuelo: '#A9AE84',
    hemiIntensidad: 1.4,
    farol: 0,
    brillo: 0.15,
  },
  tarde: {
    cieloArriba: '#8E9FD8',
    cieloAbajo: '#FFC994',
    sol: '#FFC27E',
    solIntensidad: 2.9,
    solDireccion: [-8, 6, 7],
    hemiCielo: '#FFDDB8',
    hemiSuelo: '#8C6B4C',
    hemiIntensidad: 1.25,
    farol: 0,
    brillo: 0.45,
  },
  noche: {
    cieloArriba: '#0E1838',
    cieloAbajo: '#2C406F',
    sol: '#8EA8FF',
    solIntensidad: 1.5,
    solDireccion: [5, 10, 5],
    hemiCielo: '#5269A6',
    hemiSuelo: '#151B33',
    hemiIntensidad: 0.9,
    farol: 1.6,
    brillo: 1,
  },
};

/** Color de la tinta (contornos): marrón muy oscuro, más cálido que el negro. */
export const TINTA = '#2A1E19';
