# Analytics

Esta carpeta contiene solamente la lógica de análisis del dashboard.

No es una copia del sistema:

- `player/`: nota y recomendación del jugador.
- `market/`: precio, competencia y puja recomendada.
- `lineup/`: proyección y Mejor XI.
- `fixtures/`: próximos partidos y dificultad.
- `rivals/`: análisis de plantillas rivales.
- `config/`: parámetros del modelo.
- `utils/`: utilidades matemáticas.
- `index.js`: único punto de exportación.

Se eliminó `server/analytics.js` porque era un puente de compatibilidad que
simplemente reexportaba `server/analytics/index.js`. No contenía otra copia de
la lógica, pero podía dar esa impresión.
