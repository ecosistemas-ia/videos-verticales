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
| Historia, curiosidad o anécdota | `cabezas`, `relato`, `chat`, `sombras`, `plastilina` |
| Mito, leyenda o historia antigua | `sombras`, `ciudad`, `cabezas` |
| Salud y cuerpo humano | `organos` solo si los órganos del tema están en su catálogo (corazón, cerebro, estómago, pulmones, hígado, riñón, intestino, piel, hueso, glóbulos); si no, `plastilina` |
| Consejos de un negocio, preguntas frecuentes, dinero, servicios | `plastilina`, `iconos` |
| Dientes, boca, ojos, pelo u otra parte que no está en `organos` | `plastilina` (un diente, una gota, una bola con el accesorio del oficio) |
| Ranking o datos en el tiempo | `carrera` |
| Juego o reto para comentar | `quiz` |
| Mensaje de marca o posicionamiento | `surreal`, `relato` |
| Ciudades, lugares, cómo era antes | `ciudad`, `isometrico` |

**Los personajes tienen que ser del tema.** En `organos` y `plastilina` cada personaje en pantalla tiene que tener que
ver con lo que se cuenta. Si el tema es de dientes, no pongas un estómago ni un hueso porque el catálogo no tiene
boca: cambia de estilo. En `plastilina` el personaje se arma con una forma del tema y un accesorio del oficio (el
diente que habla, el dentista con el espejo, la moneda con gafas para el ahorro).

**El fondo también es del tema.** En `plastilina` cada escena lleva un `escenario`, el lugar de lo que dice la voz:
`consultorio` cuando se habla de la visita, `boca` cuando se habla de los dientes, `cocina` para comer o masticar,
`tienda` para comprar, `oficina` para trabajo o negocio, `finanzas` para dinero y cifras, `calle`, `parque`, `salon`,
`gimnasio` y `aula`. Pon en `ajustes.escenario` el lugar principal del video y cámbialo en la escena solo cuando el
texto cambie de lugar: dos o tres lugares por video bastan. El fondo liso (`fondo`) queda para los temas sin lugar.

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
