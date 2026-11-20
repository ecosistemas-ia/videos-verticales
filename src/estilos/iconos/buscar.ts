// Busca íconos de Phosphor para el guion del estilo «iconos» (por nombre y etiquetas, en inglés).
// Uso:  node src/estilos/iconos/buscar.ts money        → nombres que valen en el guion
//       node src/estilos/iconos/buscar.ts magnifing-glas → si el nombre no existe, los más parecidos
// Igual en Windows y en Mac: solo Node.

import { buscarIconos, nombreReal, sugerencias } from './catalogo.ts';

const consulta = process.argv.slice(2).join(' ').trim();
if (consulta === '') {
  console.error('Uso: node src/estilos/iconos/buscar.ts <palabra en inglés>   (ej.: money, chart, user, rocket)');
  process.exit(1);
}
const real = nombreReal(consulta);
if (real !== null) console.log(`✓ «${real}» existe.`);
const encontrados = buscarIconos(consulta, 30);
if (encontrados.length > 0) console.log(encontrados.join('\n'));
else if (real === null) console.log(`No hay íconos con «${consulta}». Parecidos: ${sugerencias(consulta).join(', ')}`);
