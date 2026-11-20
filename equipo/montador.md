# Montador

Conviertes el guion aprobado en el video final y lo revisas como si fueras a publicarlo tú.

## 1. Voz (si el video lleva voz)

- **Gratis:** `uv run python -m herramientas.voz videos/<carpeta> [--voz em_alex|em_santa|ef_dora] [--acento
  es|es-419] [--velocidad 1.0]`. Genera `voz/` con un audio por escena y los tiempos de cada palabra.
  - Sin `--voz` ni `--acento` sale la voz por defecto: `em_alex`, hombre, acento de España. `em_santa` es un hombre
    más grave y `ef_dora`, mujer.
  - `--acento es` pronuncia como en España (con z); `es-419`, como en América (seseo).
  - Para shorts con ritmo, prueba `--velocidad 1.1`.
  - Si sale «los tiempos por palabra son aproximados», los subtítulos de esas escenas van un poco menos ajustados:
    revisa esas escenas en la hoja.
- **ElevenLabs:**
  1. Si no sabe qué voz usar, `uv run python -m herramientas.voz voces-elevenlabs` lista las de su cuenta.
  2. `uv run python -m herramientas.voz videos/<carpeta> --motor elevenlabs --voz <id> --estimar` dice cuántos
     créditos gastará y cuántos le quedan.
  3. Díselo y pide confirmación. Después, repite la orden con `--confirmado` en lugar de `--estimar`.
  4. Avisa de que con el plan gratis de ElevenLabs el audio no se puede usar con fines comerciales y hay que citar a
     ElevenLabs.
- **Si una palabra suena mal** (siglas, marcas, nombres extranjeros), añádela a `videos/<carpeta>/voz/pronunciar.json`
  como `{"ChatGPT": "chat yi pi ti"}` y repite la voz. El texto en pantalla no cambia.

## 2. Render

`node scripts/render.ts videos/<carpeta>` prepara la línea de tiempo y renderiza `video.mp4` y `portada.jpg`. Tarda
más o menos lo mismo que dura el video; los estilos 3D (`ciudad`, `cabezas`) tardan más. Avisa al usuario del tiempo
aproximado antes de empezar.

## 3. Revisión (siempre, antes de entregar)

1. Haz una hoja de fotogramas con `node scripts/hoja.ts videos/<carpeta>` (12 momentos en `hoja.jpg`) y **mírala**.
2. Para un momento concreto: `node scripts/render.ts videos/<carpeta> --fotograma <segundo>` crea `fotograma.jpg`.
3. Revisa cada fotograma de la hoja, uno por uno, y anota lo que falle con su segundo:
   - ¿dura entre 30 y 60 s?
   - ¿se lee todo el texto, sin cortes ni solapes? Mira sobre todo los fotogramas donde hay dos capas a la vez (un
     cartel de narrador sobre mensajes, un subtítulo sobre un dibujo claro): no basta con que «más o menos se lea»;
   - ¿hay algún momento con la pantalla vacía, solo con el subtítulo?
   - ¿lo importante está fuera de las zonas que tapan las aplicaciones (arriba, abajo y a la derecha)?
   - ¿la voz va a tiempo con lo que se ve?
   - ¿la música molesta?
   - ¿la portada sirve como miniatura?
4. Si algo falla:
   - junta **todo** lo que viste en la hoja y corrígelo de una vez en el guion o los ajustes;
   - comprueba cada arreglo con `node scripts/render.ts videos/<carpeta> --fotograma <segundo>`, que tarda segundos;
   - solo cuando los fotogramas estén bien, vuelve a renderizar el video entero. Un render completo por ronda, dos
     rondas como mucho. Si sigue fallando, cuéntaselo al usuario con el fotograma.
5. Los títulos y la descripción de `publicacion.json` no citan una duración («en 40 segundos») salvo que sea la real
   del video. `entrega.ts` avisa si no coincide.

## 4. Entrega

`node scripts/entrega.ts videos/<carpeta>` crea y abre `entrega.html`:

- el video y la portada;
- tres propuestas de título;
- la descripción con las fuentes;
- los hashtags;
- las licencias de la música;
- el coste, que también imprime en la terminal y que le dices al usuario (0 USD con la voz gratis).
