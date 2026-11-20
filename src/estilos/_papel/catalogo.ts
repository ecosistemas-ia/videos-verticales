// Los nombres de los dibujos de los estilos de papel: objetos, productos y escenas dibujados solo con código (SVG), sin
// imágenes externas. Surreal los pasa a blanco y negro; relato los usa a color con el color del negocio. Sin JSX: las
// reglas validan el guion contra estas listas desde Node.

/** Objetos sueltos: se leen en silueta y sirven de metáfora (surreal los usa en blanco y negro). */
export const OBJETOS = [
  'balanza',
  'barco',
  'reina',
  'peon',
  'engranaje',
  'lupa',
  'llave',
  'bombilla',
  'reloj_arena',
  'escalera',
  'brujula',
  'rompecabezas',
  'caminante',
  'cayendo',
  'columna',
  'monitor',
  'chincheta',
] as const;

/** Productos de un negocio, a color: el centro del relato. Llevan el símbolo y el nombre del negocio. */
export const PRODUCTOS = ['bolsa', 'taza', 'hogaza', 'croissant', 'frasco', 'caja'] as const;

/** Escenas de papel recortado que llenan una tarjeta del relato. */
export const ESCENAS = ['amanecer', 'fachada', 'mesa', 'calendario', 'reloj'] as const;

export type NombreObjeto = (typeof OBJETOS)[number];
export type NombreProducto = (typeof PRODUCTOS)[number];

/** Los símbolos que el código dibuja para el negocio del relato (un medallón con el dibujo en blanco). */
export const SIMBOLOS = ['espiga', 'taza', 'libro', 'flor', 'tijeras', 'hoja'] as const;
export type NombreSimbolo = (typeof SIMBOLOS)[number];
