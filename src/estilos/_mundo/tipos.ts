// Los tipos de un mundo: lo que sale del generador (generar.ts) y lo que dibujan los dos estilos, la maqueta 3D
// (ciudad) y la ilustración isométrica (isometrico). Un mundo es una lista de piezas simples (cajas, tejados, conos,
// esferas…) con su material, agrupadas por edificio, más los lugares a los que apunta la cámara y los caminos de lo que
// se mueve. Sin JSX ni three.js: lo lee también Node.

/** Los mundos que hay. Cada uno se genera entero desde una semilla. */
export const MUNDOS = ['ciudad_antigua', 'ciudad_moderna', 'pueblo', 'puerto'] as const;
export type TipoMundo = (typeof MUNDOS)[number];

/** Dónde está el agua alrededor y dentro del mundo. */
export const AGUAS = ['lago', 'rio', 'mar', 'ninguna'] as const;
export type Agua = (typeof AGUAS)[number];

/**
 * Los lugares de cualquier mundo, con el mismo nombre en todos para que el guion no falle:
 * - centro: el corazón de la ciudad;
 * - monumento: lo más alto o importante (templo, iglesia, rascacielos, faro);
 * - plaza: la plaza principal;
 * - mercado: los puestos y la gente;
 * - barrio: casas de vivienda;
 * - calle: una calle con gente (o coches);
 * - agua: el lago, el río o el mar, con barcas;
 * - campos: cultivos, chinampas o un parque;
 * - puerto: muelle, embarcadero o puente;
 * - afueras: desde fuera, mirando la ciudad.
 */
export const LUGARES = ['centro', 'monumento', 'plaza', 'mercado', 'barrio', 'calle', 'agua', 'campos', 'puerto', 'afueras'] as const;
export type IdLugar = (typeof LUGARES)[number];

export type Material =
  | 'hierba'
  | 'hierba_seca'
  | 'tierra'
  | 'arena'
  | 'roca'
  | 'piedra'
  | 'piedra_clara'
  | 'adobe'
  | 'adobe_claro'
  | 'cal'
  | 'ladrillo'
  | 'teja'
  | 'paja'
  | 'madera'
  | 'madera_oscura'
  | 'hormigon'
  | 'vidrio'
  | 'metal'
  | 'asfalto'
  | 'acera'
  | 'marca'
  | 'tela1'
  | 'tela2'
  | 'tela3'
  | 'hoja'
  | 'hoja2'
  | 'hoja3'
  | 'tronco'
  | 'cultivo1'
  | 'cultivo2'
  | 'cultivo3'
  | 'pintura1'
  | 'pintura2'
  | 'oro'
  | 'ventana'
  | 'fuego'
  | 'agua';

interface PiezaBase {
  readonly m: Material;
  /** Índice del grupo (edificio, árbol, campo…) en mundo.grupos. */
  readonly g: number;
  /** Variación de tono, de −1 a 1, para que dos casas iguales no sean idénticas. */
  readonly v?: number;
  /** Se mece con el viento (copas de árboles, cultivos). */
  readonly viento?: boolean;
}

/** Todas las medidas en metros; y es la base de la pieza. */
export type Pieza =
  | (PiezaBase & { readonly k: 'caja'; x: number; y: number; z: number; sx: number; sy: number; sz: number; bisel?: boolean })
  | (PiezaBase & { readonly k: 'tejado'; x: number; y: number; z: number; sx: number; sy: number; sz: number; eje: 'x' | 'z' })
  | (PiezaBase & { readonly k: 'tronco'; x: number; y: number; z: number; sx: number; sy: number; sz: number; tx: number; tz: number })
  | (PiezaBase & { readonly k: 'cilindro'; x: number; y: number; z: number; r: number; r2?: number; sy: number; lados?: number })
  | (PiezaBase & { readonly k: 'cono'; x: number; y: number; z: number; r: number; sy: number; lados?: number })
  | (PiezaBase & { readonly k: 'esfera'; x: number; y: number; z: number; r: number; sy?: number });

export type TipoGrupo = 'suelo' | 'edificio' | 'monumento' | 'arbol' | 'campo' | 'detalle' | 'agua';

export interface Grupo {
  readonly tipo: TipoGrupo;
  /** Orden de construcción, de 0 a 1: con la ciudad al 40 % solo están los grupos con orden < 0,4. */
  readonly orden: number;
  /** Centro y base del grupo (para crecer desde el suelo y ordenar el dibujo isométrico). */
  readonly x: number;
  readonly z: number;
  readonly base: number;
  /** Medio lado de su huella (para el orden del dibujo). */
  readonly rx: number;
  readonly rz: number;
}

export interface Lugar {
  readonly x: number;
  readonly z: number;
  /** Altura del suelo en ese punto. */
  readonly y: number;
  /** Tamaño del lugar: la cámara se aleja más de un lugar grande. */
  readonly radio: number;
  /** Altura de lo que hay (para el rótulo de medida y para encuadrar). */
  readonly alto: number;
}

export type Punto3 = readonly [number, number, number];

/** Un tramo por el que va y viene alguien (personas, coches): de a a b y vuelta. */
export interface Tramo {
  readonly a: Punto3;
  readonly b: Punto3;
  readonly tipo: 'persona' | 'coche' | 'barca';
}

/** Una ruta cerrada (barcas que dan vueltas). */
export interface Ruta {
  readonly puntos: ReadonlyArray<readonly [number, number]>;
  readonly y: number;
  readonly tipo: 'barca' | 'velero';
}

export type Rol =
  | 'agua'
  | 'calle'
  | 'calzada'
  | 'plaza'
  | 'casa'
  | 'monumento'
  | 'templo'
  | 'mercado'
  | 'parque'
  | 'campo'
  | 'chinampa'
  | 'muelle'
  | 'almacen'
  | 'molino'
  | 'bosque'
  | 'torre'
  | 'bloque';

export interface Mundo {
  readonly tipo: TipoMundo;
  readonly escala: 'ciudad' | 'plastico';
  readonly agua: Agua;
  /** Celdas por lado y metros por celda. El mundo va de −lado/2 a +lado/2 en x y en z. */
  readonly n: number;
  readonly celda: number;
  readonly lado: number;
  readonly roles: readonly Rol[];
  /** Altura de la tierra de cada celda (sin suelo si es agua). */
  readonly suelos: readonly number[];
  readonly piezas: readonly Pieza[];
  readonly grupos: readonly Grupo[];
  readonly lugares: Readonly<Record<IdLugar, Lugar>>;
  readonly tramos: readonly Tramo[];
  readonly rutas: readonly Ruta[];
  /** Chimeneas y hogueras: de ahí sale humo. */
  readonly humos: readonly Punto3[];
  /** Luces de la noche: braseros, faroles, el faro. */
  readonly luces: readonly Punto3[];
  /** Aspas de molino que giran: centro y radio. */
  readonly aspas: ReadonlyArray<{ readonly x: number; readonly y: number; readonly z: number; readonly r: number; readonly giro: number; readonly g: number }>;
  /** Altura del agua. */
  readonly nivelAgua: number;
  /** Altura máxima de lo construido (para encuadrar). */
  readonly alturaMax: number;
}
