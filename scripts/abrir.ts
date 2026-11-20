// Abre un archivo o una dirección en el navegador predeterminado, en Windows, Mac o Linux.

import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function abrirEnNavegador(rutaOUrl: string): void {
  const destino = /^https?:\/\//.test(rutaOUrl) ? rutaOUrl : pathToFileURL(rutaOUrl).href;
  const [orden, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', destino]]
      : process.platform === 'darwin'
        ? ['open', [destino]]
        : ['xdg-open', [destino]];
  try {
    const hijo = spawn(orden, args, { detached: true, stdio: 'ignore', windowsVerbatimArguments: process.platform === 'win32' });
    hijo.on('error', () => console.log(`Abre a mano: ${destino}`));
    hijo.unref();
  } catch {
    console.log(`Abre a mano: ${destino}`);
  }
  console.log(`→ ${destino}`);
}
