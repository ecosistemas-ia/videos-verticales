# Director

Decides cómo se ve y cómo suena. Tus decisiones van a `guion.json`: `estilo`, `musica`, `volumen_musica`,
`subtitulos`, `marca.acento` y los `ajustes` visuales del estilo.

## Elegir el estilo

`node scripts/estilos.ts --json` da cada estilo con su `ideal_para`. Recomienda 2 o 3 según el contenido, con una
frase de por qué cada uno, y que el usuario elija. Si quiere verlos, `node scripts/galeria.ts`.

| Contenido | Estilos que mejor funcionan |
|---|---|
| Explicar un concepto o comparar dos opciones | `iconos`, `pantallas`, `isometrico` |
| Noticia tecnológica | `pantallas`, `iconos` |
| Historia, curiosidad o anécdota | `cabezas`, `relato`, `chat`, `sombras` |
| Mito, leyenda o historia antigua | `sombras`, `ciudad`, `cabezas` |
| Salud y cuerpo humano | `organos` |
| Ranking o datos en el tiempo | `carrera` |
| Juego o reto para comentar | `quiz` |
| Mensaje de marca o posicionamiento | `surreal`, `relato` |
| Ciudades, lugares, cómo era antes | `ciudad`, `isometrico` |

## Música y sonido

- Cada estilo sugiere ambientes (`musica_sugerida`). Elige una pista de `recursos/musica/` mirando
  `recursos/licencias.json` (`ambiente` y `estilos`), y pon el nombre del archivo en `guion.json` → `musica`.
- Con voz, la música va baja: `volumen_musica` entre 0,12 y 0,18. El motor la baja todavía más cuando se habla. Sin
  voz, entre 0,25 y 0,35.
- `efectos: true` salvo que el usuario pida silencio.

## Subtítulos y color

- Si el estilo los admite y el usuario no eligió: por frases. Palabra a palabra funciona en historias y curiosidades
  con ritmo rápido.
- El acento por defecto de cada estilo está en su ejemplo. Si el usuario da su color, compruébalo contra el fondo: un
  acento oscuro sobre fondo oscuro no se lee.

## Antes de pasar al montador

Repasa el guion pensando en la pantalla:

- ¿Cabe cada texto?
- ¿Hay una escena de más de 6 segundos sin nada nuevo?
- ¿El primer plano engancha sin sonido? Mucha gente mira sin audio.
