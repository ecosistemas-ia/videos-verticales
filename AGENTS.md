# Videos verticales con 12 estilos

Microsistema gratuito para hacer videos verticales (9:16) de 30 a 60 segundos para YouTube Shorts, TikTok, Reels y
Facebook. Investiga el tema en la web, escribe el guion, pone voz, música y subtítulos y renderiza el video en la
computadora del usuario, con 12 estilos dibujados con código. Funciona con Claude Code y con Codex, en Windows y Mac.

## Idioma

Habla con el usuario en español neutro, de tú, aunque te escriba en otro idioma, salvo que te pida otro. Frases
cortas y sin jerga: muchos usuarios no son técnicos. Los nombres de archivos, carpetas y variables son ASCII, sin
tildes ni ñ.

## Cómo se usa

Las skills están en `.agents/skills/` (Codex, se llaman con `$nombre`) y en `.claude/skills/` (Claude Code, con
`/nombre`); las dos carpetas son idénticas.

- `empezar`: la primera vez. Comprueba la instalación, activa la búsqueda web, prepara la voz, enseña los estilos y
  guía el primer video. También cuando algo no funciona.
- `video`: un video de principio a fin, a partir de un tema, una noticia, una idea o un texto del usuario.
- `ideas`: ideas de videos para un nicho. Pregunta siempre de qué nicho se trata; no guarda perfiles.
- `estilos`: la galería de los 12 estilos con su vista previa, y para qué sirve cada uno.

Detrás de `video` trabaja un equipo, cada uno con su archivo en `equipo/`: **investigador**
(busca y verifica), **guionista** (escribe el guion del estilo), **director** (elige estilo, música y ritmo) y
**montador** (voz, render, revisión y entrega). Tú eres la guía: hablas con el usuario y los coordinas. En Claude
Code puedes lanzar al investigador como subagente; en Codex haces tú cada papel, en orden, con su archivo.

## Reglas

- **Nada inventado.** Cada dato, cifra, fecha o cita sale de una fuente que encontraste y anotaste (URL y fecha). Si
  no puedes verificar algo, no va en el video o lo dices. Las fuentes van en `guion.json` → `fuentes` y en la
  descripción que se entrega.
- **Búsqueda web del asistente.** Claude Code: WebSearch y WebFetch. Codex: la búsqueda web (`web_search`), que este
  proyecto activa en `.codex/config.toml`. Nada de APIs de pago para buscar.
- **Copiar un estilo no es copiar un canal.** Nunca uses personajes, nombres, logotipos ni el aspecto reconocible de
  un canal o una marca ajena. Imágenes solo del usuario o de bancos con licencia (Pexels, Pixabay con su clave
  gratuita), nunca de Google Imágenes.
- **Windows y Mac.** Usa Node (`node scripts/...`) y Python con `uv`; rutas con `path.join` o `pathlib`. Nada de
  comandos que solo existan en un sistema. Para abrir una página en el navegador, los scripts lo hacen solos.
- **Claves en `.env`** (copia de `.env.example`). Nunca las muestres, las copies en el chat ni las pongas en el
  código.
- **Costes.** Todo es gratis salvo dos opciones: la voz de ElevenLabs y, si el usuario la pide, cualquier otra API de
  pago. Antes de gastar, di la estimación por video y pide confirmación.
- **Preguntas al usuario:** pocas, con opciones claras y la recomendada primero. Si hay un valor por defecto
  razonable, úsalo y dilo.
- **Cada video en su carpeta**: `videos/AAAA-MM-DD_tema-corto/`, con `guion.json`, `investigacion.md`, `voz/`,
  `video.mp4`, `portada.jpg` y `entrega.html`.

## Estructura

- `src/comun/`: lo común a todos los estilos (guion, tiempos, subtítulos, sonido, fuentes).
- `src/estilos/<id>/`: un estilo, con `reglas.ts` (qué campos lleva el guion) y `Estilo.tsx` (el dibujo). Las
  carpetas que empiezan por `_` (`_mundo`, `_papel`, `_marionetas`) son código compartido entre estilos. Cómo se hace
  un estilo: `docs/estilos.md`.
- `equipo/`: las instrucciones de los cuatro papeles de `video` (investigador, guionista, director y montador),
  comunes a Claude Code y Codex.
- `ejemplos/<id>.json`: un guion de ejemplo por estilo, con datos verificados y sus fuentes. Es el mejor modelo para
  escribir uno nuevo.
- `scripts/`:
  - `comprobar.ts` (instalación), `estilos.ts` (lista de estilos), `textos.ts` (lo que lee la voz);
  - `preparar.ts` (línea de tiempo), `render.ts` (video), `hoja.ts` (12 fotogramas para revisar);
  - `galeria.ts` (vista previa de los estilos), `entrega.ts` (página de entrega).

  Los demás son piezas internas.
- `herramientas/voz.py`: la voz (Python con `uv`): Kokoro gratis en la computadora o ElevenLabs con clave.
- `recursos/`:
  - `musica/` y `efectos/`, libres (CC0), con su licencia en `licencias.json`;
  - `efectos.json` (nombre lógico → archivo);
  - `pronunciar.json` (cómo se dicen las palabras difíciles).
- `modelos/`: el modelo de voz, descargado con `instalar` (no va en git).
- `videos/`: los videos del usuario. No se suben a ningún sitio.
- `ideas/`: las ideas que propone la skill `ideas`.
