# Videos verticales con 12 estilos

Videos verticales de 30 a 60 segundos para YouTube Shorts, TikTok, Reels y Facebook, hechos en tu computadora y
gratis. Le dices el tema y el asistente lo investiga, escribe el guion, pone voz, música y subtítulos, y te entrega
el video listo para publicar.

## Qué incluye

- **12 estilos dibujados con código**: quiz con cuenta atrás, historia en un chat, carrera de datos, explicación con
  íconos, noticia tech con pantallas, surreal en blanco y negro, relato de un negocio, teatro de sombras, órganos con
  cara, personajes de cabeza blanca en 3D, maqueta 3D de una ciudad e ilustración isométrica.
- **Una guía y un equipo**: `empezar` te acompaña la primera vez. Detrás de `video` trabajan cuatro papeles:
  - un investigador que busca y verifica los datos en la web, con sus fuentes;
  - un guionista que escribe para videos cortos;
  - un director que elige estilo y música;
  - un montador que renderiza, revisa y entrega.
- **Cuatro formas de empezar un video**: un tema que hay que explicar, una noticia de la semana, una idea de la skill
  `ideas` (que siempre te pregunta tu nicho) o tu propio texto.
- **Voz gratis** en tu computadora (hombre o mujer, acento de España o de América), o ElevenLabs si tienes cuenta.
  **Subtítulos** palabra a palabra, por frases o sin subtítulos. **Música y efectos** libres de derechos incluidos.

## Requisitos

- Windows 10/11 o macOS.
- [Claude Code](https://claude.com/claude-code) o [Codex](https://openai.com/codex): con uno de los dos basta.
- Node.js 22.18 o más reciente; el instalador te dice cómo conseguirlo.
- Unos 1,5 GB libres en disco: dependencias, navegador de render y voz.
- Opcional: una clave de ElevenLabs para la voz de pago, y claves gratuitas de Pexels o Pixabay para imágenes de
  stock.

## Instalación

**Windows**

1. Descarga esta carpeta.
2. Clic derecho en `instalar.ps1` → «Ejecutar con PowerShell». También desde una terminal:
   `powershell -ExecutionPolicy Bypass -File .\instalar.ps1`

**Mac**

1. Descarga esta carpeta.
2. En la Terminal, dentro de la carpeta: `bash instalar.sh`

Después abre la carpeta con Claude Code (`claude`) o con Codex (`codex`) y escribe `/empezar` (en Codex,
`$empezar`).

## Uso

| En Claude Code | En Codex | Qué hace |
|---|---|---|
| `/empezar` | `$empezar` | La primera vez: instalación, búsqueda web, voz, estilos y tu primer video |
| `/video <tema>` | `$video <tema>` | Un video de principio a fin |
| `/ideas` | `$ideas` | Diez ideas de videos para tu nicho, con pruebas de que interesan |
| `/estilos` | `$estilos` | La galería de los 12 estilos |

Cada video queda en `videos/<fecha>_<tema>/` con `video.mp4`, la portada y una página de entrega con títulos,
descripción, fuentes y hashtags.

## Música y YouTube

La música y los efectos son CC0: puedes usarlos sin pedir permiso ni citar a nadie, también en un canal que
monetiza. Aun así, YouTube a veces marca como suya una pista libre que alguien registró en Content ID. Antes de
publicar con una pista que no hayas usado:

1. Sube el video como «No listado» y mira el paso de comprobaciones de YouTube Studio.
2. Si aparece una reclamación, impúgnala con la opción de licencia o dominio público, y pega la licencia y el enlace
   de la pista. Están en `recursos/licencias.json` y en la página de entrega de cada video.
3. Si prefieres no discutir, cambia la pista o haz el video sin música.

## Errores e ideas

Si algo falla o se te ocurre una mejora, abre un issue en GitHub con la plantilla de error o la de idea. Para un
error, copia el mensaje completo y di si usas Claude Code o Codex, en Windows o Mac.

## Licencia

MIT, de Marcelo Camacho: puedes usar, cambiar y compartir el kit, también con fines comerciales, si conservas el
aviso de autor (`LICENSE`). El nombre y el logotipo de Ecosistemas IA quedan fuera de la licencia.

Lo que el kit usa tiene sus propias licencias, todas en `NOTICE`. La más importante: **Remotion**, el motor de los
videos, es gratis para personas, empresas de hasta 3 empleados y organizaciones sin fines de lucro, también para uso
comercial. Las empresas más grandes necesitan su licencia de pago: https://www.remotion.dev/license
