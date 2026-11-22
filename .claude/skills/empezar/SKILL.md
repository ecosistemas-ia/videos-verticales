---
name: empezar
description: Primera vez con el microsistema de video, o cuando algo no funciona. Comprueba la instalación, activa la búsqueda web, prepara la voz gratis, enseña los 13 estilos y guía el primer video paso a paso.
---

# empezar: la guía de la primera vez

Eres la guía. Español neutro, de tú, frases cortas. **Un paso cada vez**: no pases al siguiente hasta que el anterior
funcione. Si algo falla, explica qué pasó en una frase y da la solución para su sistema (Windows o Mac).

## 1. Saludo (3 líneas como máximo)

Qué hace: videos verticales de 30 a 60 segundos para Shorts, TikTok, Reels y Facebook, con 13 estilos, gratis y en su
computadora. La primera vez tarda unos 10 minutos en prepararse; después, cada video tarda pocos minutos.

## 2. La instalación

Ejecuta `node scripts/comprobar.ts`. Revisa Node, las dependencias, el navegador de render, la voz y la búsqueda, y
dice qué falta con la orden exacta para arreglarlo.

- **Falta Node o es viejo** (hace falta la 22.18 o más): Windows, `winget install OpenJS.NodeJS.LTS`; Mac, el
  instalador de https://nodejs.org. Luego hay que cerrar y abrir la terminal y el asistente.
- **Faltan dependencias**: ejecuta el instalador (`instalar.ps1` en Windows, `bash instalar.sh` en Mac) o `npm
  install`. En Codex esto necesita red: acepta cuando pida permiso.
- **Falta el navegador de render**: `node scripts/comprobar.ts --preparar` lo descarga (unos 90 MB, una sola vez).

Repite `node scripts/comprobar.ts` hasta que todo salga en verde, salvo la voz y la búsqueda, que van en los pasos
siguientes.

## 3. La búsqueda web

El microsistema busca y verifica los datos de cada video en la web.

- **Claude Code** ya trae WebSearch y WebFetch.
- **Codex**: este proyecto activa la búsqueda en `.codex/config.toml` (`web_search = "live"`). Codex solo lo aplica
  si confías en esta carpeta; si no, que vuelva a abrir Codex con `codex --search`.

Compruébalo de verdad: busca «noticias inteligencia artificial <mes> <año>», con el mes y el año de hoy en palabras
(por ejemplo, «noviembre 2026»). Di el titular y la fecha de publicación del resultado más reciente.

- Si no hay resultados, la búsqueda no está activa: vuelve al punto anterior.
- Si el más reciente tiene más de 7 días, la búsqueda funciona pero no trae lo último. Dilo, y recuerda que en los
  videos de noticias hay que poner siempre el mes y el año en la búsqueda.

## 4. La voz

Pregunta con opciones:

1. **Voz gratis en tu computadora** (recomendada): no cuesta nada y no sale de tu equipo. Se descargan unos 360 MB
   una sola vez.
2. **ElevenLabs**: voz más natural, de pago. Necesita una clave en `.env`. Su plan gratis no permite usar el audio
   con fines comerciales y obliga a citar a ElevenLabs; para un canal que monetiza o vende hace falta un plan de pago.
3. **Sin voz**: solo texto en pantalla y música. Va bien con los estilos chat y quiz.

Con la 1:

1. `uv run python -m herramientas.voz instalar` descarga el modelo y comprueba que llegó entero.
2. `uv run python -m herramientas.voz muestra` se abre sola: es la voz por defecto, hombre con acento de América
   (`em_alex`, `es-419`).
3. Pregunta si le gusta, con opciones:
   - hombre (`em_alex`, la de por defecto), hombre grave (`em_santa`) o mujer (`ef_dora`);
   - acento de América (`--acento es-419`, seseo, el de por defecto) o de España (`--acento es`, con z).

   Haz la muestra de la que elija. No guardes su elección como perfil: es para que la conozca.

Con la 2: que pegue su clave en `.env` (`ELEVENLABS_API_KEY=`), nunca en el chat. Después,
`uv run python -m herramientas.voz voces-elevenlabs` lista sus voces.

## 5. Los estilos

`node scripts/galeria.ts` abre la galería con los 13 estilos, agrupados por familia, con una portada y un video corto
de cada uno. `node scripts/estilos.ts` da las mismas familias con para qué sirve cada una: cuéntaselas en una línea
cada una, sin inventar otras, y pregúntale cuál le llama más la atención para el primer video.

## 6. El primer video

Propón 3 temas listos para ese estilo (uno de su interés si te lo dijo, uno de actualidad y uno atemporal) o que
elija el suyo. Sigue la skill `video` paso a paso, explicando en una frase lo que hace cada miembro del equipo
mientras trabaja.

## Al final

Cuatro líneas para el día a día:

- `video <tema>` para un video nuevo (en Claude Code `/video`, en Codex `$video`);
- `ideas` para que te proponga temas de tu nicho;
- `estilos` para volver a ver la galería;
- tus videos quedan en la carpeta `videos/`, cada uno con su página de entrega.
