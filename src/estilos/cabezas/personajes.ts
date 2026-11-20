// Cómo se ve cada rol: color de la ropa, sombrero y detalles. La cabeza es siempre blanca y redonda, con dos ojos
// mínimos; lo que distingue a cada uno es la ropa. Diseño propio: cuerpo de «muñeco» de cápsulas, cabeza grande y
// colores de esta paleta, no los de ningún canal.

import type { Rol } from './reglas.ts';

export type Sombrero = 'ninguno' | 'corona' | 'casco' | 'paja' | 'bicornio' | 'gorra' | 'casco_obra' | 'gorro_chef' | 'salacot';
export type Detalle =
  | 'capa'
  | 'gafas'
  | 'barba'
  | 'mono'
  | 'coletas'
  | 'corbata'
  | 'charreteras'
  | 'botones'
  | 'cinturon'
  | 'tirantes'
  | 'mochila'
  | 'franjas'
  | 'delantal'
  | 'espejo'
  | 'pelo_loco';

export interface Apariencia {
  readonly torso: string;
  readonly piernas: string;
  readonly zapatos: string;
  /** Falda o bata: un cono bajo el torso. */
  readonly falda?: string;
  readonly sombrero: Sombrero;
  readonly sombreroColor: string;
  readonly detalles: readonly Detalle[];
  /** Color de los detalles (capa, corbata, botones, pelo). */
  readonly detalleColor: string;
  readonly escala: number;
  /** Encorvado (rad). */
  readonly encorvado: number;
  readonly animal?: 'cerdo' | 'perro';
}

const ZAPATO = '#3A2C25';
const DORADO = '#E8B63A';

export const APARIENCIAS: Readonly<Record<Rol, Apariencia>> = {
  hombre: { torso: '#3E8E7E', piernas: '#4A3B32', zapatos: ZAPATO, sombrero: 'ninguno', sombreroColor: '', detalles: [], detalleColor: '', escala: 1, encorvado: 0 },
  mujer: { torso: '#E07A5F', piernas: '#F2E3CF', zapatos: ZAPATO, falda: '#E07A5F', sombrero: 'ninguno', sombreroColor: '', detalles: ['mono'], detalleColor: '#5A3A2A', escala: 0.97, encorvado: 0 },
  nino: { torso: '#F2C14E', piernas: '#3D6FA8', zapatos: '#B8433A', sombrero: 'gorra', sombreroColor: '#D9534F', detalles: [], detalleColor: '', escala: 0.72, encorvado: 0 },
  nina: { torso: '#E58FB5', piernas: '#F2E3CF', zapatos: '#B8433A', falda: '#E58FB5', sombrero: 'ninguno', sombreroColor: '', detalles: ['coletas'], detalleColor: '#6B4226', escala: 0.72, encorvado: 0 },
  anciano: { torso: '#8A6E55', piernas: '#5B5550', zapatos: ZAPATO, sombrero: 'ninguno', sombreroColor: '', detalles: ['barba', 'botones'], detalleColor: '#D3D3D3', escala: 0.95, encorvado: 0.16 },
  anciana: { torso: '#9C88C4', piernas: '#E9DDF2', zapatos: ZAPATO, falda: '#8673B0', sombrero: 'ninguno', sombreroColor: '', detalles: ['mono', 'gafas'], detalleColor: '#D8D8D8', escala: 0.93, encorvado: 0.12 },
  granjero: { torso: '#C9503C', piernas: '#4E6E9E', zapatos: ZAPATO, sombrero: 'paja', sombreroColor: '#E3C16F', detalles: ['tirantes'], detalleColor: '#4E6E9E', escala: 1, encorvado: 0 },
  rey: { torso: '#6B3FA0', piernas: '#3A2A4A', zapatos: ZAPATO, sombrero: 'corona', sombreroColor: DORADO, detalles: ['capa', 'cinturon'], detalleColor: '#B8343A', escala: 1.02, encorvado: 0 },
  reina: { torso: '#2F8F6B', piernas: '#2F8F6B', zapatos: ZAPATO, falda: '#2F8F6B', sombrero: 'corona', sombreroColor: DORADO, detalles: ['capa'], detalleColor: '#B8343A', escala: 1, encorvado: 0 },
  soldado: { torso: '#4A6B3A', piernas: '#3A3F33', zapatos: ZAPATO, sombrero: 'casco', sombreroColor: '#5F6E4A', detalles: ['cinturon', 'botones'], detalleColor: '#2E2622', escala: 1, encorvado: 0 },
  capitan: { torso: '#22335C', piernas: '#EFEBE1', zapatos: ZAPATO, sombrero: 'bicornio', sombreroColor: '#1F1E2A', detalles: ['charreteras', 'botones'], detalleColor: DORADO, escala: 1.02, encorvado: 0 },
  cientifico: { torso: '#E6ECF0', piernas: '#3A3F4A', zapatos: ZAPATO, falda: '#E6ECF0', sombrero: 'ninguno', sombreroColor: '', detalles: ['gafas', 'pelo_loco'], detalleColor: '#B9B9B9', escala: 1, encorvado: 0 },
  medico: { torso: '#7FC8B8', piernas: '#7FC8B8', zapatos: '#EDEDED', sombrero: 'ninguno', sombreroColor: '', detalles: ['espejo'], detalleColor: '#B9C3CC', escala: 1, encorvado: 0 },
  marinero: { torso: '#F3F1EA', piernas: '#2C4E86', zapatos: ZAPATO, sombrero: 'gorra', sombreroColor: '#2C4E86', detalles: ['franjas'], detalleColor: '#2C4E86', escala: 1, encorvado: 0 },
  obrero: { torso: '#F08A24', piernas: '#3E5A7A', zapatos: ZAPATO, sombrero: 'casco_obra', sombreroColor: '#F2C230', detalles: ['cinturon'], detalleColor: '#5A4636', escala: 1, encorvado: 0 },
  chef: { torso: '#EDE7DD', piernas: '#3A3A3A', zapatos: ZAPATO, sombrero: 'gorro_chef', sombreroColor: '#FFFFFF', detalles: ['delantal', 'botones'], detalleColor: '#C9503C', escala: 1, encorvado: 0 },
  explorador: { torso: '#B79A62', piernas: '#8C7A55', zapatos: '#5A4636', sombrero: 'salacot', sombreroColor: '#E2D2A6', detalles: ['mochila', 'cinturon'], detalleColor: '#7A5134', escala: 1, encorvado: 0 },
  oficinista: { torso: '#9DBCE0', piernas: '#3A3F4A', zapatos: ZAPATO, sombrero: 'ninguno', sombreroColor: '', detalles: ['corbata'], detalleColor: '#B8343A', escala: 1, encorvado: 0 },
  cerdo: { torso: '#F2A7A0', piernas: '#E8908A', zapatos: '#B9706A', sombrero: 'ninguno', sombreroColor: '', detalles: [], detalleColor: '', escala: 1, encorvado: 0, animal: 'cerdo' },
  perro: { torso: '#C08A55', piernas: '#A8743F', zapatos: '#5A3A2A', sombrero: 'ninguno', sombreroColor: '', detalles: [], detalleColor: '#6B4226', escala: 1, encorvado: 0, animal: 'perro' },
};

/** La gente de «multitud: variado», en este orden. */
export const VARIADO: readonly Rol[] = ['hombre', 'mujer', 'anciano', 'granjero', 'nino', 'anciana', 'obrero', 'nina', 'oficinista'];
