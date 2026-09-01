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

## Operaciones reales de Biwenger

Esta versión incorpora:

- **Pujar** por jugadores del mercado.
- **Poner a la venta** jugadores de tu plantilla.

Ninguna operación se ejecuta al pulsar el primer botón. Siempre se abre un
modal con el jugador, el importe y una casilla obligatoria de confirmación.

El backend también exige `confirm: true`.

### Pujas

Antes de enviar la puja, el servidor vuelve a consultar `/market` para verificar
que el jugador sigue disponible, determina de nuevo quién lo ofrece y comprueba
la puja máxima actual.

La escritura se envía a `POST /api/v2/offers` como oferta `purchase`.

### Venta

Antes de vender, el servidor vuelve a consultar tu plantilla para confirmar
que el jugador sigue perteneciendo a tu usuario.

La escritura se envía a `POST /api/v2/market` con `type: "sell"`.

La opción **Rechazar ofertas existentes** está desactivada por defecto.

### Importante

Las escrituras no se reintentan automáticamente. Los endpoints de Biwenger son
internos/no oficiales y pueden cambiar.

## Protección contra el límite de peticiones

Se cambió la estrategia de actualización:

- Mercado: **3 minutos**
- Tu plantilla: **5 minutos**
- Usuarios y plantillas rivales: **15 minutos**
- Catálogo de LaLiga: **60 minutos**
- Contadores: cada segundo en el navegador, **sin llamar a Biwenger**

También se añadieron:

- deduplicación de peticiones simultáneas;
- concurrencia máxima de 2 al cargar plantillas rivales;
- ventana mínima incluso al pulsar Actualizar;
- `cf.biwenger.com` como primera opción para el catálogo público;
- detección de HTTP 429 y del mensaje de máximo de peticiones;
- cooldown automático de 30 min si Biwenger no indica `Retry-After`;
- uso de caché vencida durante el cooldown en vez de seguir insistiendo;
- snapshot del dashboard en `.cache/dashboard.json`;
- respaldo del último dashboard en `localStorage`;
- después de pujar/vender solo se invalida mercado y usuario.

### Sobre `analytics`

No había dos sistemas ejecutándose. `server/analytics.js` era solo un
**puente de compatibilidad** que reexportaba `server/analytics/index.js`.

Como ningún archivo actual lo necesitaba, se eliminó. También se eliminó
`server/biwenger.js` y ahora el servidor importa directamente
`server/biwenger/BiwengerClient.js`.

`server/analytics/` queda únicamente con los módulos reales de análisis:
jugadores, mercado, fixtures, Mejor XI, rivales, configuración y utilidades.


## Protección máxima contra rate limit

La aplicación usa ahora una estrategia muy conservadora:

- Mercado: **5 minutos**
- Plantilla y saldo: **10 minutos**
- Rivales: **30 minutos y solo al entrar en Rivales**
- Catálogo: **6 horas**
- Contadores: cada segundo localmente
- Una sola petición real a Biwenger a la vez
- Separación mínima de **4 segundos** entre peticiones
- Sin polling cuando la pestaña está en segundo plano
- Solo una pestaña del navegador hace polling automático
- Las demás reciben datos mediante BroadcastChannel/localStorage
- Actualización manual con cooldown de **60 segundos**
- Dedupe de solicitudes iguales
- Pujas/ventas sin reintento automático

### Circuit breaker persistente

Ante HTTP 429 o el mensaje de máximo de peticiones:

- se cancela la cola pendiente;
- se detienen todas las peticiones;
- el estado queda guardado en `.cache/api-guard.json`;
- reiniciar Node no elimina la protección;
- se usa el último dashboard guardado.

Cooldown conservador:

- primer incidente: mínimo 1 hora;
- segundo reciente: mínimo 6 horas;
- tercero o posterior: mínimo 24 horas.

### Monitor de API

El dashboard muestra peticiones reales de la última hora y del día,
peticiones evitadas por caché, cola actual, última petición, uso por endpoint,
próxima actualización y qué pestaña es la líder.

El historial se guarda en `.cache/api-usage.json`.

## Protección como pestaña + Mejor XI editable

### Protección

El bloque de protección ya no ocupa la cabecera principal. Ahora existe una
pestaña independiente **Protección**, al mismo nivel que Mi equipo, Mercado,
Mejor XI y Rivales.

Ahí se concentran:

- estado Seguro / Controlado / Bloqueado;
- peticiones reales de la última hora y del día;
- peticiones evitadas por caché;
- cola de peticiones;
- próxima actualización de Mercado, Mi equipo, Alineación, Rivales y Catálogo;
- pestaña líder;
- circuit breaker y cooldown.

### Jugadores puestos a la venta

Los jugadores propios publicados en el mercado:

- aparecen con etiqueta **EN VENTA** en Mi equipo;
- no permiten volver a pulsar Vender;
- quedan excluidos del Mejor XI automático;
- no pueden seleccionarse en el editor manual del XI.

### Editar la alineación

En **Mejor XI** se añadió **Editar mi XI**.

Permite:

- elegir una formación válida;
- seleccionar exactamente los jugadores requeridos por posición;
- volver al XI recomendado con un botón;
- seleccionar capitán;
- conservar suplentes válidos de la alineación actual;
- guardar la alineación real en Biwenger.

Antes de guardar siempre se muestra un modal de confirmación y el backend
también exige `confirm: true`.

La alineación actual se consulta únicamente al entrar a Mejor XI y se conserva
15 minutos en caché para no aumentar innecesariamente las peticiones.

La escritura usa el contrato interno/no oficial observado actualmente:

`PUT /api/v2/user?fields=*,lineup(date)`

con:

```json
{
  "lineup": {
    "type": "4-4-2",
    "playersID": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    "reservesID": [],
    "captain": 1
  }
}
```

Las escrituras siguen sin reintentos automáticos.

### Legibilidad

Se aumentó el tamaño de textos en las métricas, pestañas, tarjetas de jugadores,
mercado, modales, panel de protección y editor de alineación.

## Sincronización exacta de alineación con Biwenger

La vista de Mejor XI ya no inventa capitán ni ariete cuando existe una
alineación guardada.

Al entrar a la pestaña se consulta:

`GET /api/v2/user?fields=lineup(date,type,captain,striker,playersID,reservesID)`

y la vista utiliza como fuente de verdad:

- `type`: formación real.
- `playersID`: los 11 titulares en el orden guardado por Biwenger.
- `captain`: capitán real; `0/null` significa sin capitán.
- `striker`: ariete real; `0/null` significa sin ariete.
- `reservesID`: suplentes.

El orden `playersID` se conserva al construir cada línea del campo, evitando
que el algoritmo de recomendación o el orden de la plantilla cambien
horizontalmente a los jugadores.

La recomendación automática queda separada: solo se aplica si el usuario entra
en **Editar mi XI** y pulsa **Usar recomendado**.

El guardado también acepta `striker` y sigue usando confirmación obligatoria,
cola anti-rate-limit y una única escritura sin reintentos automáticos.
