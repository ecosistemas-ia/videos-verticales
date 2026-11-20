# Cómo se hace un estilo

Un estilo es una carpeta `src/estilos/<id>/`, con `id` en minúsculas ASCII y guiones. Lleva dos archivos obligatorios
y los que necesite dentro de la misma carpeta:

| Archivo | Qué exporta | Reglas |
|---|---|---|
| `reglas.ts` | `reglas: ReglasEstilo<typeof esquemaEscena, typeof esquemaAjustes>` | **Sin JSX ni React**: lo carga Node en `scripts/preparar.ts`. Esquemas zod de una escena y de los ajustes, duraciones, voz, efectos |
| `Estilo.tsx` | `Estilo(props: PropsVideo)` | El dibujo con Remotion. Recibe las escenas ya colocadas en el tiempo |

El contrato está en `src/comun/reglas.ts` y `src/comun/guion.ts`. Los ejemplos más simples son `chat`, `quiz` y
`carrera`.

## Cómo fluye un video

1. El guionista escribe `videos/<carpeta>/guion.json`: lo común (estilo, título, subtítulos, música, marca) más
   `ajustes`, que valida `esquemaAjustes`, y `escenas`, que valida una a una `esquemaEscena`.
2. La voz, si la hay, se genera escena por escena: `voz/voz.json` lleva un archivo y los tiempos de cada palabra por
   escena. `reglas.textoVoz(escena)` dice qué texto lee la voz en cada escena.
3. `node scripts/preparar.ts videos/<carpeta>` calcula `inicio` y `duracion` de cada escena con
   `reglas.duracion(escena, voz, ajustes)` y escribe `props.json`.
4. `node scripts/render.ts videos/<carpeta>` empaqueta **solo ese estilo** (`src/entradas/<id>.ts`, generado), con la
   carpeta del video como carpeta pública, y renderiza `video.mp4` y `portada.jpg`.

## Reglas del dibujo

- **9:16, 1080 × 1920, 30 fps.** Lo importante va dentro de `ZONA_SEGURA`: las aplicaciones tapan arriba, abajo y a
  la derecha.
- **El tiempo sale de las escenas.** Cada escena trae `inicio` y `duracion` en segundos; `t = useCurrentFrame() /
  fps`. Para sincronizar con la voz dentro de una escena: `escena.voz.palabras` (segundos desde el inicio del
  archivo) más `escena.voz.desfase`.
- **Determinista.** Nada de `Math.random()` ni de `Date`: usa `random(semilla)` de Remotion. El mismo guion da
  siempre el mismo video.
- **Nada de red.** Ni Google Fonts, ni imágenes remotas, ni CDN. Las fuentes salen de los paquetes `@fontsource`
  instalados, cargadas con `cargarFuentes` (`src/comun/fuentes.ts`), con el subconjunto `latin`, que ya trae las
  tildes, la ñ, ¿ y ¡. Los iconos, de `@phosphor-icons/core`.
- **Funciona sin imágenes.** Todo estilo tiene que verse bien solo con código. Si acepta imágenes opcionales, el
  guion las nombra como `imagenes/<archivo>` dentro de la carpeta del video y se cargan con `staticFile`.
- **Textos del guion, no del código.** Lo que se lee en pantalla viene del guion o de los ajustes, en español. Nada de
  textos fijos en otro idioma, nada de marcas ajenas ni del propio kit. La marca del usuario está en
  `props.guion.marca` (nombre y color de acento).
- **Familia.** `reglas.familia`: una de `FAMILIAS` (`src/comun/reglas.ts`). La lista de estilos, la galería y las
  skills agrupan por ella; no se escriben familias a mano en ningún otro sitio.
- **Texto sobre el acento.** Si el estilo escribe texto encima del color de acento (un rótulo, una burbuja),
  `reglas.textoSobreAcento` devuelve el color de ese texto y `preparar.ts` avisa si contrastan menos de 4,5:1.
- **Firma.** Va justo encima de la zona tapada, debajo de los subtítulos. `reglas.firma`: `clara` (por defecto), `oscura` en fondos claros o `ninguna` si el estilo ya dibuja `marca.nombre`.
- **Subtítulos.** Si el texto de la voz no está en pantalla, `admiteSubtitulos: true` y deja libre la franja de
  `subtitulosArriba` (por defecto, de 1270 a 1490 px). Si el texto ya está en pantalla (chat, quiz), `false`.
- **Efectos de sonido por nombre lógico** (`reglas.efectos` y `reglas.golpes`): los resuelve
  `recursos/efectos.json`. Nombres disponibles:
  - `whoosh`, `pop`, `clic`, `tic`, `transicion`, `subida`, `brillo`, `glitch`, `impacto`, `redoble`;
  - `mensaje-entra`, `mensaje-sale`, `tecleo`, `notificacion`, `burbuja`, `campana`;
  - `acierto`, `error`, `cuenta-atras`, `powerup`, `aplauso`;
  - `camara`, `monedas`, `caja`.

  Si falta uno, el video sale igual, sin ese sonido.
- **Windows y Mac.** Nada que dependa del sistema operativo. El 3D va con three.js (`@remotion/three`); el render usa
  `gl: 'angle'`.
- **Copiar un estilo no es copiar un canal.** Se toma la técnica (cómo se mueve, cómo se cuenta), nunca personajes,
  nombres, logotipos ni el aspecto reconocible de un canal concreto.
- **Código ajeno.** Si copias código de un repositorio con licencia MIT u otra permisiva, deja su aviso de copyright
  en `src/estilos/<id>/LICENCIAS.md`. Mejor escribirlo de nuevo.

## Ejemplo y prueba

- `ejemplos/<id>.json`: un guion completo de 30 a 60 s, en español, con datos verdaderos y su fuente o con una
  historia claramente inventada.
- Prueba: copia el ejemplo a `videos/prueba-<id>/guion.json`, `node scripts/render.ts videos/prueba-<id>
  --fotograma 10` para mirar un fotograma, y el render completo para mirar el video entero. Para ver 12 momentos de
  un vistazo: `node scripts/hoja.ts videos/prueba-<id>` crea `hoja.jpg`.
- El render deja el sonido a −14 LUFS (`scripts/ffmpeg.ts`, con el ffmpeg que trae Remotion): no ajustes el volumen
  general en el estilo, solo el de cada efecto con `volumen` y cuánto suena con `duracion`.
- `node scripts/estilos.ts` lista los estilos instalados; un estilo aparece en cuanto tiene sus dos archivos.
