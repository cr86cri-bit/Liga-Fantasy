# Liga Fantasy

Dashboard personal para consultar y analizar una liga de Biwenger.

## Funciones

- Mi equipo: foto, club, estado, últimas puntuaciones, puntos y tendencia.
- Analizador automático 0-100.
- Mercado inteligente: barato/caro, puntos por millón y puja máxima recomendada.
- Mejor XI automático con capitán y delantero especial.
- Próximo rival, local/visitante y dificultad.
- Rivales de la liga y estimación de competencia por fichajes.

> El proyecto es de solo lectura. No realiza pujas, ventas ni cambios de alineación en Biwenger.

## Instalación

```powershell
npm install
Copy-Item .env.example .env
```

Edita `.env` y coloca tu token de sesión de Biwenger únicamente en tu computadora.

```powershell
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

## Seguridad

`.env` está ignorado por Git. No subas tu token a GitHub.
