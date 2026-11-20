---
name: video
description: Hace un video vertical de 30 a 60 segundos de principio a fin con uno de los 12 estilos. Sirve para un tema que hay que explicar, una noticia, una idea de la skill ideas o un texto o guion del usuario. Investiga, escribe, pone voz y música, renderiza y entrega.
---

# video: de la idea al video

Eres la guía y coordinas al equipo. Cada papel tiene sus instrucciones en la carpeta `equipo/` de la raíz del
proyecto (`equipo/investigador.md`, `equipo/guionista.md`, `equipo/director.md` y `equipo/montador.md`); léelas
cuando le toque a ese papel. En Claude Code puedes lanzar al investigador como subagente con su archivo; en Codex haces tú cada papel, en
orden. Cuenta al usuario en una frase qué está haciendo el equipo en cada paso, sin detalles técnicos.

## 1. Qué video

Del pedido saca tres cosas. Pregunta solo lo que falte, con opciones.

- **El contenido**, uno de cuatro modos:
  - `explicativo`: un tema que hay que explicar con datos verificados;
  - `noticia`: algo que pasó en los últimos días;
  - `idea`: viene de la skill `ideas`;
  - `texto_propio`: el usuario trae su texto o guion.
- **El estilo.** Si no lo dijo, el **director** recomienda 2 o 3 según el contenido (`equipo/director.md`) y el
  usuario elige. Para verlos: `node scripts/galeria.ts`.
- **Para quién y con qué tono**, solo si cambia mucho el guion (por ejemplo, niños o profesionales).

## 2. Las opciones del video (una sola ronda de preguntas)

Usa valores por defecto razonables y dilos; el usuario solo cambia lo que quiera. Si falta algo del paso 1 (el estilo,
por ejemplo), pregúntalo en este mismo mensaje. Después **termina el turno y espera la respuesta**: no empieces a
investigar ni elijas por el usuario mientras tanto.

- **Voz**: gratis en la computadora (por defecto: hombre con acento de España, `em_alex`; también mujer, hombre grave
  y acento de América), ElevenLabs (de
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

Sigue `equipo/investigador.md` según el modo. En `texto_propio` solo comprueba los datos dudosos del texto y
pregunta al usuario por los que no se pueden verificar.

## 5. Guionista → `guion.json`

Sigue `equipo/guionista.md`. Antes de escribir, lee el esquema del estilo en `src/estilos/<id>/reglas.ts` y su
ejemplo en `ejemplos/<id>.json`: el guion tiene que cumplir ese esquema.

Valida con `node scripts/preparar.ts videos/<carpeta>`. Si falla, el mensaje dice qué campo está mal: corrígelo y
repite. Si dura más de 60 s, recorta.

**Enséñale al usuario el guion** en texto plano (escena por escena, lo que dice la voz y lo que se ve) y pregunta si
lo aprueba o qué cambia. No sigas sin su visto bueno.

## 6. Montador → voz, render y revisión

Sigue `equipo/montador.md`: voz (si la hay), `node scripts/render.ts videos/<carpeta>`, revisión de fotogramas y
arreglos.

## 7. Entrega

`node scripts/entrega.ts videos/<carpeta>` crea `entrega.html` y la abre: el video, la portada, tres títulos, la
descripción con las fuentes y los hashtags. Dile dónde está el archivo `video.mp4`, cuánto dura, **cuánto costó** (lo
imprime `entrega.ts`: 0 USD con la voz gratis) y que lo revise entero antes de publicar. Si `entrega.ts` avisa de algo
(un título que cita otra duración, por ejemplo), corrígelo en `publicacion.json` y repite la entrega.

Pregunta si quiere cambios. Lo habitual es retocar el guion o el estilo y volver a renderizar: no hace falta empezar
de cero.
