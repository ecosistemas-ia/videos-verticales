---
name: video
description: Hace un video vertical de 30 a 60 segundos de principio a fin con uno de los 13 estilos. Sirve para un tema que hay que explicar, una noticia, una idea de la skill ideas o un texto o guion del usuario. Investiga, escribe, pone voz y música, renderiza y entrega.
---

# video: de la idea al video

Eres la guía y coordinas al equipo: cuatro subagentes, `investigador`, `guionista`, `director` y `montador`. Están
definidos igual en Claude Code (`.claude/agents/`) y en Codex (`.codex/agents/`), y cada uno lee sus instrucciones en
`equipo/<papel>.md`. **Lanza cada papel como subagente**, con lo que necesita en el encargo (la carpeta del video, el
tema, el estilo, las opciones), y espera su respuesta antes del paso siguiente. Los subagentes no hablan con el
usuario: las preguntas y las aprobaciones las haces tú. Si un subagente no se puede lanzar, haz tú ese papel siguiendo
su archivo de `equipo/`. Cuenta al usuario en una frase qué está haciendo el equipo en cada paso, sin detalles
técnicos.

## 1. Qué video

Del pedido saca tres cosas. Pregunta solo lo que falte, con opciones.

- **El contenido**, uno de cuatro modos:
  - `explicativo`: un tema que hay que explicar con datos verificados;
  - `noticia`: algo que pasó en los últimos días;
  - `idea`: viene de la skill `ideas`;
  - `texto_propio`: el usuario trae su texto o guion.
- **El estilo.** Si no lo dijo, lanza al subagente `director` con el tema: recomienda 2 o 3 según el contenido y el
  usuario elige. Para verlos: `node scripts/galeria.ts`.
- **Para quién y con qué tono**, solo si cambia mucho el guion (por ejemplo, niños o profesionales).

## 2. Las opciones del video (una sola ronda de preguntas)

Usa valores por defecto razonables y dilos; el usuario solo cambia lo que quiera. Si falta algo del paso 1 (el estilo,
por ejemplo), pregúntalo en este mismo mensaje. Después **termina el turno y espera la respuesta**: no empieces a
investigar ni elijas por el usuario mientras tanto.

- **Voz**: gratis en la computadora (por defecto: hombre con acento de América, `em_alex`; también mujer, hombre grave
  y acento de España), ElevenLabs (de
  pago: unos 1.000 créditos por video de 60 s con el modelo multilingüe; el montador da la cifra exacta antes de
  gastar) o sin voz.
- **Subtítulos**, si el estilo los admite (`node scripts/estilos.ts --json` → `subtitulos`): palabra a palabra, por
  frases (por defecto) o sin.
- **Música**: el ambiente que sugiere el estilo (por defecto) o sin música.
- **Firma**: su @ o el nombre del canal en una esquina, o nada (por defecto, nada). **Color de acento**: el del estilo
  o el suyo (#RRGGBB).

No guardes estas respuestas como perfil: cada video se decide en su momento.

## 3. La carpeta

`videos/AAAA-MM-DD_tema-corto/` (fecha de hoy, tema en minúsculas ASCII con guiones). Todo el trabajo del video va
ahí.

## 4. Investigador → `investigacion.md`

Lanza al subagente `investigador` con la carpeta, el tema, el modo y para quién es. Busca solo en fuentes fiables y de
calidad (la lista está en `equipo/investigador.md`). En `texto_propio` solo comprueba los datos dudosos del texto y
pregunta al usuario por los que no se pueden verificar.

## 5. Guionista y director → `guion.json`

Lanza al subagente `guionista` con la carpeta, el estilo, las opciones del paso 2 y el ángulo del investigador. Escribe
`guion.json` con el esquema del estilo (`src/estilos/<id>/reglas.ts` y `ejemplos/<id>.json`) y lo valida con
`node scripts/preparar.ts videos/<carpeta>`; si dura más de 60 s, recorta.

Después lanza al subagente `director` con la carpeta: pone música, volumen, subtítulos, color y ajustes, y repasa el
guion pensando en la pantalla.

**Enséñale al usuario el guion** en texto plano (escena por escena, lo que dice la voz y lo que se ve) y pregunta si
lo aprueba o qué cambia. No sigas sin su visto bueno.

## 6. Montador → voz, render y revisión

Lanza al subagente `montador` con la carpeta y la voz elegida: pone la voz, renderiza (`node scripts/render.ts
videos/<carpeta>`), revisa la hoja de fotogramas y corrige. Si la voz es de pago, confirma antes el coste con el
usuario y díselo al montador en el encargo.

## 7. Entrega

`node scripts/entrega.ts videos/<carpeta>` crea `entrega.html` y la abre: el video, la portada, tres títulos, la
descripción con las fuentes y los hashtags. Dile dónde está el archivo `video.mp4`, cuánto dura, **cuánto costó** (lo
imprime `entrega.ts`: 0 USD con la voz gratis) y que lo revise entero antes de publicar. Si `entrega.ts` avisa de algo
(un título que cita otra duración, por ejemplo), corrígelo en `publicacion.json` y repite la entrega.

Pregunta si quiere cambios. Lo habitual es retocar el guion o el estilo y volver a renderizar: no hace falta empezar
de cero.
