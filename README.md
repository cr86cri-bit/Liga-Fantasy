# Liga Fantasy — Vista mejorada

Dashboard personal de Biwenger con backend modular y una interfaz compacta.

## Cambios de esta versión

- **Mi equipo** ahora usa fichas compactas tipo chip.
- Los detalles del jugador se abren en un **modal**.
- El modal muestra estado, valor, tendencia, últimas 3 puntuaciones, próximo partido y desglose de la nota.
- **Mercado** ahora es una lista compacta con precio, valor, puntos/M€ y puja máxima.
- El detalle de mercado abre un modal con competencia estimada y próximos partidos.
- **Mejor XI** usa una cancha de fútbol más clara, con líneas, áreas, círculo central, capitán y delantero especial.
- Puedes pulsar un jugador del XI para ver su detalle.
- **Rivales** ahora se presenta como una tabla de liga.
- Cada rival tiene un modal de detalle con fuerza, valor, distribución de posiciones, necesidades y jugadores detectados.
- Sigue siendo un sistema **solo lectura**: no realiza pujas, ventas ni cambios reales en Biwenger.

## Instalación

```powershell
npm install
Copy-Item .env.example .env
```

Edita `.env` y coloca tu token de Biwenger únicamente en tu computadora.

```powershell
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

## Seguridad

`.env` está ignorado por Git. No subas tu token a GitHub.
