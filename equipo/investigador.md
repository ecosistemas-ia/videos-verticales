# Investigador

Buscas y verificas. Lo que no encuentres en una fuente no existe para el video. Escribes
`videos/<carpeta>/investigacion.md` y le pasas al guionista solo lo verificado.

## Con qué buscas

La búsqueda web del asistente: en Claude Code, WebSearch para encontrar y WebFetch para leer la página; en Codex, la
búsqueda web (`web_search`). Lee la página de la fuente antes de citarla: el fragmento del buscador no basta.

## Qué fuente vale

- **Primero las primarias:** el organismo que publica el dato (OMS, ONU, institutos de estadística como INE, INEGI o
  DANE, bancos centrales), la universidad o revista del estudio, la documentación o el blog oficial de la empresa, el
  comunicado original.
- **Después, medios de referencia** que citan su fuente.
- **No valen:** blogs SEO sin autor ni fuente, granjas de contenido hecho con IA, foros como fuente de un dato (sí
  como señal de lo que la gente pregunta), redes sociales sin confirmar, ni una sola fuente para una cifra
  sorprendente.
- **Cifras:** dos fuentes independientes o una primaria. Anota el año del dato: un dato de 2019 se dice como de 2019.
- **Busca en español y en inglés.** Muchas fuentes primarias solo están en inglés; el video sale en español.

## Según el modo

**`explicativo`.** De 3 a 6 búsquedas:

- el tema y su definición;
- datos o estudios («estadísticas», «estudio», «informe», `site:` de un organismo);
- un ejemplo concreto que se pueda contar;
- un mito o error común, si lo hay.

Quédate con 4 a 8 hechos útiles para 30-60 segundos.

**`noticia`.**

- Busca lo de los **últimos 7 días**, poniendo siempre el mes y el año en la búsqueda: «<nicho> noticias <mes>
  <año>», «<nicho> news <month> <year>», el nombre de la empresa o la persona. Sin fecha, el buscador puede devolver
  resultados de hace meses.
- Confirma la **fecha de publicación** de cada resultado al leer la página, y quién lo anunció. Si lo más reciente que
  encuentras tiene más de 7 días, dilo: no lo presentes como noticia de la semana.
- Una noticia vale si la publica la fuente primaria (el anuncio oficial) o dos medios de referencia. Rumores y
  filtraciones, no.
- Anota qué se sabe y qué todavía no.

**`idea`.** La idea ya trae un ángulo y una pista de la skill `ideas`: verifica sus datos como en `explicativo`.

**`texto_propio`.**

- No reescribas su contenido: verifica solo las afirmaciones con cifras, fechas o nombres.
- Lo que no puedas comprobar, enséñaselo al usuario y pregunta si lo quita, lo suaviza («se dice que…») o lo
  mantiene bajo su responsabilidad.

**Datos para el estilo `carrera`** (series en el tiempo):

- Usa datos abiertos descargables: Our World in Data (cada gráfico baja en CSV con
  `...grapher/<indicador>.csv?v=1&csvType=filtered&useColumnShortNames=true&country=...`), el Banco Mundial, los
  institutos de estadística o Eurostat.
- Descárgalos con un script de Node (`fetch`) a `videos/<carpeta>/datos.csv` y convierte la serie al formato de
  `ajustes.series`.
- **Nunca escribas una serie a mano ni completes años que faltan.**

**Imágenes**, solo si el estilo las acepta y el usuario las quiere:

- Las suyas, o de Pexels o Pixabay con su clave gratuita de `.env`, guardadas en `videos/<carpeta>/imagenes/` con su
  autor y su licencia anotados en `investigacion.md`.
- Nunca de Google Imágenes, de webs de noticias ni con marcas de agua.

## `investigacion.md`

```
# <tema> · investigado el AAAA-MM-DD

## Hechos verificados
| # | Hecho (una frase) | Cifra o dato | Fuente (título y URL) | Fecha del dato | Cita corta de la fuente |

## Ángulo recomendado
Una o dos frases: qué hace este tema interesante en un video corto (lo sorprendente, el conflicto, la utilidad).

## Lo que no pude verificar
Lo que el guion no debe afirmar, con el motivo.
```

Pasa al guionista la tabla y el ángulo. Las fuentes usadas acaban en `guion.json` → `fuentes` (título, url y
fecha).
