// Comprueba que todo está listo y dice qué falta, con la orden exacta para Windows o Mac.
// Uso: node scripts/comprobar.ts [--preparar]
//   --preparar   además descarga el navegador de render si falta (unos 90 MB, una sola vez)

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP, idsDeEstilos } from './estilos.ts';

const WIN = process.platform === 'win32';
let fallos = 0;
const bien = (texto: string): void => console.log(`✓ ${texto}`);
const mal = (texto: string, arreglo: string): void => {
  fallos += 1;
  console.log(`✗ ${texto}\n    → ${arreglo}`);
};
const aviso = (texto: string): void => console.log(`· ${texto}`);

// Node
const [mayor, menor] = process.versions.node.split('.').map(Number);
if (mayor > 22 || (mayor === 22 && menor >= 18)) bien(`Node ${process.versions.node}`);
else mal(`Node ${process.versions.node}: hace falta la 22.18 o más`, WIN ? 'winget install OpenJS.NodeJS.LTS y abre otra terminal' : 'instala la versión LTS de https://nodejs.org y abre otra terminal');

// Dependencias
if (existsSync(join(APP, 'node_modules', 'remotion', 'package.json')) && existsSync(join(APP, 'node_modules', '@remotion', 'renderer'))) {
  bien('Dependencias de Node instaladas');
} else {
  mal('Faltan las dependencias de Node', WIN ? 'ejecuta instalar.ps1 (clic derecho → Ejecutar con PowerShell) o npm install' : 'bash instalar.sh  (o npm install)');
}

// Navegador de render
const carpetaNavegador = join(APP, 'node_modules', '.remotion');
if (existsSync(carpetaNavegador)) {
  bien('Navegador de render descargado');
} else if (process.argv.includes('--preparar')) {
  aviso('Descargando el navegador de render (unos 90 MB)...');
  const { ensureBrowser } = await import('@remotion/renderer');
  await ensureBrowser();
  bien('Navegador de render descargado');
} else {
  mal('Falta el navegador de render', 'node scripts/comprobar.ts --preparar');
}

// Estilos
const estilos = idsDeEstilos();
if (estilos.length > 0) bien(`${estilos.length} estilos instalados: ${estilos.join(', ')}`);
else mal('No hay estilos en src/estilos/', 'vuelve a descargar el microsistema');

// Voz gratis (Python con uv)
if (existsSync(join(APP, 'pyproject.toml'))) {
  const uv = spawnSync('uv', ['--version'], { encoding: 'utf-8' });
  if (uv.status !== 0) {
    mal('Falta uv (para la voz gratis)', WIN ? 'powershell -ExecutionPolicy Bypass -c "irm https://astral.sh/uv/install.ps1 | iex"  y abre otra terminal' : 'curl -LsSf https://astral.sh/uv/install.sh | sh  y abre otra terminal');
  } else {
    const estado = spawnSync('uv', ['run', 'python', '-m', 'herramientas.voz', 'estado'], { cwd: APP, encoding: 'utf-8' });
    if (estado.status === 0) bien(`Voz gratis lista: ${estado.stdout.trim()}`);
    else mal('La voz gratis no está instalada', 'uv run python -m herramientas.voz instalar');
  }
} else {
  aviso('Voz gratis: pendiente en esta versión');
}

// Claves opcionales (sin mostrar su valor)
const env = existsSync(join(APP, '.env')) ? readFileSync(join(APP, '.env'), 'utf-8') : '';
const tiene = (clave: string): boolean => new RegExp(`^${clave}=\\S+`, 'm').test(env);
aviso(`ElevenLabs: ${tiene('ELEVENLABS_API_KEY') ? 'clave configurada' : 'sin clave (se usa la voz gratis)'}`);
aviso(`Imágenes de stock: ${tiene('PEXELS_API_KEY') || tiene('PIXABAY_API_KEY') ? 'clave configurada' : 'sin clave (los estilos funcionan solo con código)'}`);

// Búsqueda web
aviso('Búsqueda web: en Claude Code viene incluida; en Codex la activa .codex/config.toml (o abre Codex con  codex --search)');

console.log(fallos === 0 ? '\nTodo listo.' : `\nFaltan ${fallos} cosas: arréglalas en orden y vuelve a ejecutar  node scripts/comprobar.ts`);
process.exit(fallos === 0 ? 0 : 1);
