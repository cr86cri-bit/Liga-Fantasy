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

## Perfil de SofaScore

En el detalle de cada jugador aparece ahora un bloque **SofaScore** entre
la identidad del jugador y la nota Fantasy.

Al abrir el modal:

1. El backend busca el jugador por **nombre + equipo**.
2. Se priorizan coincidencias exactas para evitar homónimos.
3. Si se encuentra una coincidencia segura, **Ver perfil** abre directamente
   el perfil del futbolista en SofaScore.
4. El resultado se guarda temporalmente en caché para no repetir búsquedas.
5. Si SofaScore no permite resolver el perfil automáticamente o existe una
   coincidencia ambigua, el botón pasa a **Buscar perfil** como alternativa.

La búsqueda de SofaScore usa endpoints web no documentados públicamente por
SofaScore, por lo que pueden cambiar en el futuro. El resto del dashboard no
depende de esta integración y seguirá funcionando aunque SofaScore no responda.

## Cambios: SofaScore directo + filtro de posición

### SofaScore directo

El detalle del jugador ya no abre una búsqueda de Google. El backend intenta
resolver el perfil usando SofaScore directamente y prueba también el mirror
`api.sofascore.app`. Cuando encuentra una coincidencia segura, verifica el ID
cuando es posible y abre directamente:

`https://www.sofascore.com/football/player/<slug>/<id>`

Si no puede confirmar el perfil, el botón queda como **Perfil no encontrado**.

### Filtro de posición en Mercado

El mercado mantiene **Todos / Mercado / Jugadores** y añade un botón
**Posición** que abre un modal con:

- Todas
- AR / Porteros
- DF / Defensas
- MC / Centrocampistas
- DL / Delanteros

Ambos filtros funcionan juntos. Ejemplo: **Mercado + DL**.

## Fuentes deportivas externas

Se restauró el comportamiento anterior de SofaScore:

- si el perfil se resuelve automáticamente, abre el perfil directo;
- si no se puede confirmar, usa una búsqueda restringida al sitio de SofaScore.

Además, el espacio del detalle del jugador ahora abre un centro de
**Fuentes deportivas** con:

- SofaScore
- FotMob
- Flashscore
- 365Scores
- BeSoccer
- WhoScored

SofaScore conserva su resolución automática anterior. Las demás fuentes se
abren mediante una búsqueda restringida al dominio correspondiente para
encontrar el perfil correcto sin inventar IDs.

Esta versión no importa automáticamente estadísticas de esas páginas dentro
de la nota Fantasy. Esa integración debe hacerse fuente por fuente porque no
existe una API pública única y estable compartida por todas ellas.

## Corrección de modales y nuevo sistema de notificaciones

### Scroll corregido

Se cambió el bloqueo de scroll de los modales por un sistema con contador de
bloqueos. Esto permite abrir un modal dentro de otro —por ejemplo el detalle
del jugador y luego Fuentes Deportivas— sin dejar la página principal con
`overflow: hidden` después de cerrar.

### Notificaciones más claras

Los avisos internos ahora son grandes, centrados, duran 12 segundos y muestran
el jugador y el oferente. Distinguen entradas, salidas, cambios de precio y
cambios de tiempo.

Cuando una oferta desaparece, el sistema muestra el **último oferente**. Con el
snapshot disponible no siempre se puede diferenciar entre venta, expiración o
retirada manual, por eso no se inventa esa causa.

### Historial

Mercado incorpora un botón **Historial de avisos**. Se guardan hasta 120
notificaciones en `localStorage` y permanecen después de recargar la página.
El historial se puede limpiar desde su modal.
