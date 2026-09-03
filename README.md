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


## Mercado y Movimientos separados

Se corrigió la detección de pujas activas para usar **la misma respuesta de
`GET /market` que utiliza el mercado de Biwenger**. Las ofertas se leen desde
`data.offers`, por lo que ya no hace falta una llamada adicional a
`/user?fields=offers(...)`.

La interfaz queda separada así:

- **Mercado**: únicamente jugadores sobre los que todavía puedes hacer una nueva
  puja. Si ya tienes una puja activa, ese jugador desaparece de esta lista.
- **Movimientos**: tus pujas activas y tus propios jugadores puestos a la venta.

Para evitar confundir ofertas recibidas por tus jugadores, una oferta solo se
considera puja propia si apunta a un jugador ajeno que está visible en el
mercado actual. Las ofertas vinculadas a tus propios jugadores publicados se
descartan y quedan únicamente como ventas.

Los cambios hechos directamente desde biwenger.com o la app oficial se reflejan
en la siguiente sincronización del mercado (máximo aproximado de 5 minutos en
uso normal o al pulsar Actualizar respetando el cooldown).

Esta corrección **reduce** el consumo de API respecto a la versión anterior,
porque ya no necesita una consulta independiente para las ofertas.

## Mejor XI: posiciones visuales de Biwenger y alertas

Se corrigió la diferencia de posiciones horizontales entre Liga Fantasy y el
campo oficial de Biwenger.

`playersID` no se interpreta como una lista izquierda→derecha. La interfaz de
Biwenger distribuye los slots de una línea desde el centro hacia los extremos.
Liga Fantasy reproduce ahora ese patrón visual antes de pintar cada línea.

Para 4 jugadores, por ejemplo, el orden interno `[0,1,2,3]` se muestra como
`[3,1,0,2]`. Este patrón coincide con la alineación actual observada:

- Delantera: Hugo González | Hugo Duro
- Medio: Álex Calatrava | Mendoza | Neto | Marc Aguado
- Defensa: Angeliño | Logan Costa | Vivian | Boiro

También se añadieron:

- aviso superior si un titular está lesionado, en duda, sancionado o descartado;
- icono de alerta directamente sobre el jugador en el campo;
- motivo de `statusInfo` cuando Biwenger lo proporciona;
- indicador de nivel por posición;
- ranking del jugador entre los compañeros de la plantilla que ocupan la misma
  posición, por ejemplo `BUENO #2/4`;
- etiqueta de ubicación visual `DF · IZQ`, `MC · CENTRO`, etc.

El nivel por posición utiliza el `analysis.score` ya existente en Liga Fantasy y
lo complementa con el ranking dentro de la propia plantilla. No genera nuevas
llamadas a Biwenger y no afecta a la protección anti-rate-limit.

## Tema visual Cañadores FC

La interfaz completa utiliza ahora la identidad visual de Cañadores FC:

- verde bosque profundo;
- granate;
- crema;
- dorado para estados de excelencia;
- patrón vertical inspirado en la camiseta;
- encabezados estilo marcador de estadio;
- contenedores de esquinas rectas;
- bordes y sombras duras;
- detalles de 45° en acciones destacadas.

Assets incluidos:

- `public/brand/canadores-crest.png`
- `public/brand/canadores-jersey.png`

El header integra el escudo y una referencia visual de la camiseta.

### Escudos de clubes en jugadores

Los jugadores normalizados incluyen ahora `teamIconUrl`.

Se intenta obtener el escudo desde los datos que entrega Biwenger (`iconHero`,
`icon`, `logo`, `image`, `shield`, `badge` o `crest`). Como segundo intento se
usa el CDN por ID del club.

Si ninguna imagen carga, la interfaz utiliza automáticamente las iniciales del
equipo para que el chip nunca quede roto.

Los chips de **Mi equipo**, **Mercado**, **Movimientos** y el selector del
**Mejor XI** muestran ahora:

- foto del jugador;
- posición;
- nombre;
- escudo del club;
- nombre del club.

Las imágenes de escudos son recursos estáticos/CDN y no generan nuevas
peticiones al API `/api/v2`, por lo que no alteran la estrategia
anti-rate-limit implementada en el backend.

## Movimientos: puja máxima recomendada

Las tarjetas de **Mis pujas** muestran ahora:

- importe que ya has pujado;
- **puja máxima recomendada** por Liga Fantasy;
- valor actual del jugador;
- margen restante hasta la recomendación;
- aviso si la puja actual ya supera el máximo recomendado.

La recomendación reutiliza exactamente el mismo
`marketIntelligence.recommendedMaxBid` del módulo Mercado. Considera el valor,
la nota del análisis, tendencia de precio, dificultad del próximo partido,
estado del jugador y competencia estimada.

No se realiza ninguna llamada adicional a Biwenger: el cálculo se aplica a los
datos de `GET /market` que ya estaban cargados.

La cifra es una recomendación analítica de Liga Fantasy, no un límite oficial
de Biwenger ni una garantía de adjudicación.


## Campus interactivo y frontend modular

La aplicación abre ahora en el **Campus Cañadores FC**, usando los renders generados como mapa y vistas previas de los edificios. Cada edificio funciona como acceso a un módulo real: Mi equipo, Mercado, Movimientos, Mejor XI, Rivales y Protección.

El frontend se dividió por dominio para evitar un `App.jsx` gigante:

```text
src/
├── components/
│   ├── actions/
│   ├── lineup/
│   ├── market/
│   ├── notifications/
│   ├── players/
│   ├── protection/
│   ├── rivals/
│   ├── sports/
│   ├── team/
│   └── ui/
├── screens/
│   ├── Campus/
│   ├── Market/
│   ├── Protection/
│   ├── Rivals/
│   └── Team/
├── styles/
│   ├── base.css
│   └── canadores-theme.css
├── utils/
│   ├── app.js
│   └── marketNotifications.js
├── App.jsx
└── main.jsx
```

Los renders están en `public/campus/` y se usan como assets visuales, no como lógica. Las peticiones a Biwenger continúan pasando por el backend y por las mismas protecciones anti-rate-limit.

## Oficinas interactivas

Las seis áreas principales ya no se muestran como una página convencional.
Cada módulo se abre dentro de una oficina temática de Cañadores FC y la
interfaz React real ocupa la pantalla del monitor.

Las oficinas incluidas son:

- **Mi equipo** → Oficina del mánager.
- **Mercado** → Dirección de fichajes.
- **Movimientos** → Administración deportiva.
- **Mejor XI** → Sala táctica.
- **Rivales** → Centro de scouting.
- **Protección** → Centro tecnológico.

Las imágenes están optimizadas en `public/offices/*.webp`.

### La pantalla no es una imagen

`OfficeScene.jsx` coloca los componentes React existentes sobre el monitor de
cada render. Esto significa que dentro de la pantalla continúan funcionando:

- filtros;
- scroll;
- modales de jugador;
- pujas;
- ventas;
- Mejor XI;
- edición de alineación;
- rivales;
- notificaciones;
- historial;
- protección y métricas de API.

La oficina es únicamente presentación. No se han duplicado ni reemplazado las
funciones que acceden a Biwenger.

### Navegación

El monitor tiene una barra real para cambiar entre las oficinas y un botón
**Campus** permite volver al mapa general.

En pantallas pequeñas el fondo de la oficina se convierte en ambientación y el
monitor pasa a ocupar casi toda la pantalla, manteniendo la funcionalidad.

### API

Este cambio no añade endpoints ni polling. Las oficinas son imágenes estáticas
locales y las interfaces reutilizan el mismo estado y las mismas llamadas que
ya existían. Se conserva el sistema completo de caché, cola, pestaña líder y
circuit breaker.

## Oficinas v2: más legibles y con scroll completo

Se corrigió la presentación de las interfaces dentro de los monitores.

### Cambios de legibilidad

- Se eliminó la rotación/perspectiva CSS aplicada al contenedor React porque
  podía rasterizar las fuentes y hacerlas verse borrosas.
- Se aumentó el tamaño base de texto dentro del monitor.
- Encabezados, botones, filtros, métricas, nombres de jugadores y tablas tienen
  tamaños específicos mayores.
- El reflejo de cristal del monitor es ahora mucho más tenue.

### Lienzo virtual de escritorio

La interfaz dentro del monitor ya no intenta comprimirse para caber completa.
Cada oficina utiliza un lienzo de escritorio ancho y el monitor actúa como una
ventana con:

- scroll vertical;
- scroll horizontal;
- barras de scroll más anchas y visibles;
- soporte táctil para desplazarse en ambas direcciones.

Mercado utiliza un lienzo particularmente ancho para conservar las tarjetas,
precios, rendimiento y puja máxima sin cortar columnas.

### Monitor

También se amplió ligeramente el área React sobre el monitor de cada render,
aprovechando mejor la superficie disponible.

Este cambio es exclusivamente visual y no añade peticiones a Biwenger.

## Dashboard general con sidebar plegable

Se eliminó por completo la navegación visual mediante oficinas y monitores.

La aplicación utiliza ahora un único dashboard general inspirado en un panel
profesional de gestión deportiva:

- sidebar izquierdo;
- menú superior;
- sidebar plegable/expandible;
- estado del sidebar persistido en `localStorage`;
- navegación duplicada en lateral y superior;
- diseño responsive con drawer lateral en móvil;
- Inicio con resumen de club;
- vista previa de plantilla;
- resumen de mercado;
- mini Mejor XI;
- estado de API visible permanentemente.

### Inicio

La nueva pantalla Inicio reutiliza exclusivamente la información que ya existe
en el dashboard:

- posición;
- puntos disponibles en la respuesta;
- número de jugadores;
- valor del equipo;
- saldo;
- puja máxima;
- patrimonio;
- mejores jugadores de la plantilla;
- jugadores destacados del mercado;
- alineación actual / Mejor XI.

No realiza llamadas nuevas a Biwenger.

### Módulos

Mi equipo, Mercado, Movimientos, Mejor XI, Rivales y Protección conservan sus
componentes y funcionalidades, pero se muestran directamente dentro del
dashboard, sin imágenes de oficina alrededor.

### Eliminado

Se eliminaron del proyecto:

- `src/components/office/`
- `src/screens/Campus/`
- `public/offices/`
- `public/campus/`

Esto reduce peso y simplifica la interfaz.
