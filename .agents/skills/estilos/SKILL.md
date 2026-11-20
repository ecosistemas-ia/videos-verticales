---
name: estilos
description: Enseña la galería de los 12 estilos de video con su portada y un video corto de cada uno, y explica para qué contenido sirve cada estilo.
---

# estilos: la galería

1. `node scripts/galeria.ts` abre en el navegador la galería: portada y video de muestra de cada estilo. Si no se
   abre sola, la orden imprime la dirección del archivo para abrirlo a mano.
2. `node scripts/estilos.ts` da la lista agrupada por familia, con para qué sirve cada familia y la descripción de
   cada estilo. Cuéntala con esas mismas familias y en ese orden, una línea por estilo. No inventes otras.
3. Si pregunta qué estilo le conviene para algo concreto, usa la tabla de `equipo/director.md`.
4. Si quiere probar uno, ofrécele hacer un video con la skill `video`, o renderizar el ejemplo del estilo:
   - copia `ejemplos/<id>.json` a `videos/prueba-<id>/guion.json`;
   - ejecuta `node scripts/render.ts videos/prueba-<id>`.
