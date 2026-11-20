// Estilo «Personajes de cabeza blanca en un mundo 3D»: muñecos de cabeza blanca y redonda actúan la historia que
// cuenta la voz, en un mundo 3D de pocos polígonos con líneas de tinta, luz cálida y profundidad de campo. Cada escena
// es un «puesto» del recorrido y la cámara viaja en carril de un puesto al siguiente.
//
// Se toma solo la técnica (cabeza blanca, mundo 3D con tinta, cámara en carril). Personajes, proporciones, paleta y
// decorados son propios. Sin JSX: este archivo lo carga Node en scripts/preparar.ts.

import { z } from 'zod';
import type { EscenaLista, Golpe } from '../../comun/guion.ts';
import type { ReglasEstilo } from '../../comun/reglas.ts';

// ── Catálogos cerrados ────────────────────────────────────────────────────────────────────────────────────────────

export const DECORADOS = [
  'campo',
  'casa',
  'castillo',
  'bosque',
  'calle',
  'laboratorio',
  'barco',
  'montana',
  'palacio',
  'desierto',
  'oficina',
  'campamento',
] as const;
export type Decorado = (typeof DECORADOS)[number];

export const ROLES = [
  'hombre',
  'mujer',
  'nino',
  'nina',
  'anciano',
  'anciana',
  'granjero',
  'rey',
  'reina',
  'soldado',
  'capitan',
  'cientifico',
  'medico',
  'marinero',
  'obrero',
  'chef',
  'explorador',
  'oficinista',
  'cerdo',
  'perro',
] as const;
export type Rol = (typeof ROLES)[number];

export const ACCIONES = ['quieto', 'habla', 'camina', 'corre', 'senala', 'sorprende', 'cae', 'celebra', 'sienta', 'saluda', 'piensa', 'baila'] as const;
export type Accion = (typeof ACCIONES)[number];

export const POSICIONES = ['izquierda', 'centro', 'derecha', 'fondo_izquierda', 'fondo', 'fondo_derecha'] as const;
export type Posicion = (typeof POSICIONES)[number];

export const MIRADAS = ['auto', 'camara', 'izquierda', 'derecha'] as const;
export type Mirada = (typeof MIRADAS)[number];

export const PLANOS = ['general', 'medio', 'primer_plano', 'picado', 'contrapicado'] as const;
export type Plano = (typeof PLANOS)[number];

export const OBJETOS = ['nada', 'espada', 'lanza', 'bandera', 'carta', 'libro', 'bolsa', 'catalejo', 'farol', 'matraz', 'martillo'] as const;
export type Objeto = (typeof OBJETOS)[number];

export const PALETAS = ['calida', 'fresca', 'pastel', 'otono'] as const;
export type NombrePaleta = (typeof PALETAS)[number];

export const HORAS = ['manana', 'mediodia', 'tarde', 'noche'] as const;
export type Hora = (typeof HORAS)[number];

// ── Normalización: el guionista puede escribir con tildes, mayúsculas, espacios o un sinónimo frecuente ─────────────

const ALIAS: Readonly<Record<string, string>> = {
  // decorados
  granja: 'campo',
  pradera: 'campo',
  aldea: 'casa',
  pueblo: 'casa',
  hogar: 'casa',
  fortaleza: 'castillo',
  selva: 'bosque',
  jungla: 'bosque',
  ciudad: 'calle',
  plaza: 'calle',
  lab: 'laboratorio',
  mar: 'barco',
  puerto: 'barco',
  barco_de_guerra: 'barco',
  monte: 'montana',
  montanas: 'montana',
  trono: 'palacio',
  salon: 'palacio',
  salon_del_trono: 'palacio',
  arena: 'desierto',
  despacho: 'oficina',
  campamento_militar: 'campamento',
  // roles
  senor: 'hombre',
  chico: 'nino',
  senora: 'mujer',
  chica: 'nina',
  abuelo: 'anciano',
  abuela: 'anciana',
  campesino: 'granjero',
  agricultor: 'granjero',
  guardia: 'soldado',
  almirante: 'capitan',
  oficial: 'capitan',
  doctor: 'medico',
  doctora: 'medico',
  enfermera: 'medico',
  cocinero: 'chef',
  pirata: 'marinero',
  inventor: 'cientifico',
  empleado: 'oficinista',
  rey_o_reina: 'rey',
  // acciones
  quieta: 'quieto',
  de_pie: 'quieto',
  parado: 'quieto',
  hablar: 'habla',
  caminar: 'camina',
  correr: 'corre',
  senalar: 'senala',
  sorpresa: 'sorprende',
  sorprenderse: 'sorprende',
  se_sorprende: 'sorprende',
  caer: 'cae',
  se_cae: 'cae',
  celebrar: 'celebra',
  sentarse: 'sienta',
  sentado: 'sienta',
  sentada: 'sienta',
  se_sienta: 'sienta',
  saludar: 'saluda',
  pensar: 'piensa',
  bailar: 'baila',
  // posiciones y miradas
  centro_fondo: 'fondo',
  fondo_centro: 'fondo',
  atras: 'fondo',
  izquierda_fondo: 'fondo_izquierda',
  derecha_fondo: 'fondo_derecha',
  publico: 'camara',
  frente: 'camara',
  // planos
  plano_general: 'general',
  plano_medio: 'medio',
  primerplano: 'primer_plano',
  cerca: 'primer_plano',
  desde_arriba: 'picado',
  desde_abajo: 'contrapicado',
  // objetos y ajustes
  ninguno: 'nada',
  dinero: 'bolsa',
  monedas: 'bolsa',
  telescopio: 'catalejo',
  lampara: 'farol',
  linterna: 'farol',
  frasco: 'matraz',
  amanecer: 'manana',
  dia: 'mediodia',
  atardecer: 'tarde',
};

/** Minúsculas, sin tildes, espacios y guiones como «_», y los sinónimos frecuentes a su nombre del catálogo. */
export function normalizar(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const limpio = valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
  return ALIAS[limpio] ?? limpio;
}

const de = <T extends readonly [string, ...string[]]>(lista: T) => z.preprocess(normalizar, z.enum(lista));

// ── Esquemas ─────────────────────────────────────────────────────────────────────────────────────────────────────

export const esquemaPersonaje = z.object({
  /** Quién es: decide la ropa, el sombrero y el tamaño. */
  rol: de(ROLES),
  /** Lo que hace durante la escena, de la lista cerrada. */
  accion: de(ACCIONES).default('quieto'),
  /** Dónde está en el puesto: tres sitios delante y tres al fondo. */
  posicion: de(POSICIONES).default('centro'),
  /** Hacia dónde mira. «auto»: hacia los demás personajes, o a cámara si está solo. */
  mira: de(MIRADAS).default('auto'),
  /** Lo que lleva en la mano derecha. */
  lleva: de(OBJETOS).default('nada'),
});
export type Personaje = z.infer<typeof esquemaPersonaje>;

export const esquemaEscena = z.object({
  /** Lo que cuenta la voz en esta escena (no sale en pantalla: van los subtítulos). */
  texto: z.string().min(1),
  /** El decorado del puesto, del catálogo cerrado. */
  decorado: de(DECORADOS),
  /** El plano de cámara. «primer_plano» encuadra al primer personaje de la lista. */
  plano: de(PLANOS).default('medio'),
  /** De 0 a 6 personajes. */
  personajes: z.array(esquemaPersonaje).max(6).default([]),
  /** Gente de fondo (soldados, vecinos, público). «variado» mezcla ropa de civil. */
  multitud: z
    .object({
      rol: z.preprocess(normalizar, z.enum([...ROLES, 'variado'])).default('variado'),
      accion: de(ACCIONES).default('quieto'),
      cantidad: z.number().int().min(1).max(14).default(6),
    })
    .optional(),
  /** Un rótulo corto arriba, como lugar y año («Estrasburgo, 1518»). */
  rotulo: z.string().max(40).default(''),
  /** La hora de este puesto, si cambia respecto a la del video. */
  hora: de(HORAS).optional(),
});
export type EscenaCabezas = z.infer<typeof esquemaEscena>;

export const esquemaAjustes = z.object({
  /** Colores del mundo (la ropa va por rol). */
  paleta: de(PALETAS).default('calida'),
  /** Luz del video: mañana, mediodía, tarde (dorada) o noche. */
  hora: de(HORAS).default('tarde'),
  /** Frase gancho grande arriba durante la primera escena (vacío = sin gancho). */
  gancho: z.string().max(70).default(''),
  /** Profundidad de campo real (desenfoque). Apagarla acelera el render; la niebla sigue dando profundidad. */
  desenfoque: z.boolean().default(true),
});
export type AjustesCabezas = z.infer<typeof esquemaAjustes>;

// ── Tiempos ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Segundos de viaje de la cámara al empezar cada escena (menos la primera). */
export const VIAJE = 1.0;
/** En qué segundo de la escena empieza la voz: la cámara ya casi llegó. */
export const ARRANQUE_VOZ = 0.45;

/** En qué segundo de la escena empiezan a actuar los personajes. */
export function inicioAccion(indice: number): number {
  return indice > 0 ? VIAJE * 0.6 : 0.2;
}

/** En qué segundo de la escena se cae quien tiene la acción «cae». */
export function momentoCaida(indice: number, duracion: number): number {
  return inicioAccion(indice) + Math.min(1.1, duracion * 0.25);
}

function palabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

export const reglas: ReglasEstilo<typeof esquemaEscena, typeof esquemaAjustes> = {
  id: 'cabezas',
  familia: 'historias',
  nombre: 'Personajes de cabeza blanca en un mundo 3D',
  descripcion:
    'Muñecos de cabeza blanca actúan la historia narrada en un mundo 3D de pocos polígonos con tinta, luz cálida y cámara en carril.',
  ideal_para: 'Curiosidades históricas, historias con giro, «¿sabías que…?», anécdotas y fábulas contadas en 30-60 s.',
  esquemaEscena,
  esquemaAjustes,
  textoVoz: (e) => e.texto,
  desfaseVoz: () => ARRANQUE_VOZ,
  duracion(e, voz) {
    if (voz !== null) return Math.max(2.8, ARRANQUE_VOZ + voz.duracion + 0.5);
    // Sin voz: ritmo de una locución en español (unas 2,7 palabras por segundo).
    return Math.max(3, ARRANQUE_VOZ + palabras(e.texto) / 2.7 + 0.5);
  },
  cola: 1.2,
  admiteSubtitulos: true,
  efectos: ['whoosh', 'impacto', 'pop', 'brillo'],
  golpes(escenas: readonly EscenaLista<EscenaCabezas>[]) {
    const golpes: Golpe[] = [];
    for (const e of escenas) {
      if (e.indice > 0) golpes.push({ efecto: 'whoosh', segundo: e.inicio + 0.05, volumen: 0.3 });
      const acciones = new Set(e.datos.personajes.map((p) => p.accion));
      if (acciones.has('cae')) golpes.push({ efecto: 'impacto', segundo: e.inicio + momentoCaida(e.indice, e.duracion) + 0.3, volumen: 0.45 });
      if (acciones.has('sorprende')) golpes.push({ efecto: 'pop', segundo: e.inicio + inicioAccion(e.indice) + 0.25, volumen: 0.4 });
      if (acciones.has('celebra')) golpes.push({ efecto: 'brillo', segundo: e.inicio + inicioAccion(e.indice), volumen: 0.35 });
    }
    return golpes;
  },
  musica_sugerida: ['comica', 'tension', 'epica'],
};
