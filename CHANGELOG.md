# Cambios

Todas las versiones de Videos verticales, de la más nueva a la más antigua.


## [0.2.0] - 2026-11-22

- Estilo 13, «Personajes de plastilina»: personajes redondos y brillantes, sin brazos ni piernas, con la forma del
  tema (14 formas, 12 accesorios, 8 emociones). Cada escena puede tener su lugar detrás (11 escenarios: consultorio,
  boca, oficina, tienda, cocina, salón, calle, parque, gimnasio, aula y finanzas).
- Los cuatro papeles de `video` son subagentes de verdad, en Claude Code (`.claude/agents/`) y en Codex
  (`.codex/agents/`): investigador, guionista, director y montador. La skill los lanza en su paso.
- La voz gratis por defecto es hombre con acento de América (`em_alex`, es-419).
- «Órganos con cara» ya no lleva el whoosh de cada escena ni la subida larga: debajo de la voz sonaban a avión.
- El director solo elige personajes y fondos que tengan que ver con el tema.


## [0.1.2] - 2026-11-22

- Los videos vuelven a renderizar en Mac: Remotion fijado a 4.0.532, con el navegador de render Chrome for Testing 149. El de 4.0.534 (Chromium 157) se cerraba al cargar cualquier página en macOS 26.6.

## [0.1.1] - 2026-11-20

- Los textos dicen «microsistema» en lugar de «kit».

## 0.1.0 · 2026-11-20

- Motor común en Remotion: guion por estilo, voz por escena, subtítulos, música y efectos, render desde Node y
  sonido a −14 LUFS.
- 12 estilos: iconos, surreal, pantallas, relato, ciudad, isométrico, cabezas, órganos, quiz, chat, carrera de datos
  y sombras, cada uno con su ejemplo.
- Voz gratis en la computadora (Kokoro, por defecto hombre con acento de España) y ElevenLabs opcional.
- Música y efectos CC0.
- Skills empezar, video, ideas y estilos. Los cuatro papeles de video (investigador, guionista, director y montador)
  están en `equipo/`, comunes a Claude Code y Codex.
- Estilos agrupados en cinco familias, que salen de los datos de cada estilo: lista, galería y skills.
- Comprobaciones antes de entregar: contraste del color de acento, duración citada en los títulos, hashtags con «#» y
  coste en la terminal.
- Licencia MIT.
