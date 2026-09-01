# Liga Fantasy — Mercado con notificaciones

Dashboard personal de Biwenger, solo lectura.

## Novedades de esta versión

- Notificación interna cuando se detectan cambios reales en el mercado.
- Notificaciones del navegador opcionales mediante el botón **Activar notificaciones**.
- Comprobación automática del mercado cada 60 segundos.
- Contador general para el próximo cambio estimado del mercado.
- Al llegar el contador general a cero, el sistema vuelve a consultar Biwenger automáticamente.
- Contador individual en cada jugador con el tiempo restante para poder pujar.
- Cada oferta indica claramente quién la publica: **Mercado Biwenger** o el nombre del participante de la liga.
- Filtros de mercado: **Todos / Mercado / Jugadores**.
- Se mantienen Mi equipo compacto, modales de detalle, Mejor XI con cancha y Rivales como tabla.

## Importante sobre el contador general

Biwenger no expone en esta integración un campo documentado llamado "próximo cambio de mercado". Por eso el dashboard utiliza el vencimiento futuro más próximo de los jugadores ofrecidos por el mercado como estimación del próximo cambio. El contador individual de cada oferta usa directamente su campo `until`.

## Instalación

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Abre: http://localhost:5173

Las notificaciones del navegador funcionan en `localhost` y en sitios HTTPS cuando el usuario concede permiso.

## Seguridad

`.env` continúa ignorado por Git. No subas tu token a GitHub.
