# Liga Fantasy · Biwenger

MVP de dashboard personal para una liga de Biwenger.

## Qué hace ahora

- Inicio de sesión desde el backend.
- Detecta tu cuenta y tu liga.
- Lee tu plantilla.
- Lee saldo y puja máxima.
- Lee el mercado de tu liga.
- Cruza los IDs con el catálogo de LaLiga.
- Calcula valor de plantilla y patrimonio.
- Actualiza la interfaz automáticamente cada 60 segundos.
- No realiza ninguna operación de escritura en Biwenger.

## Requisitos

- Node.js 20 o superior.
- Una cuenta de Biwenger.

## Instalación

```bash
npm install
```

Copia el archivo de ejemplo:

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### Linux/macOS

```bash
cp .env.example .env
```

Edita `.env`:

```env
BIWENGER_EMAIL=tu_correo
BIWENGER_PASSWORD=tu_password
BIWENGER_LEAGUE_NAME=
BIWENGER_SCORE=5
PORT=3001
```

Si tienes varias ligas, escribe exactamente el nombre de la liga en
`BIWENGER_LEAGUE_NAME`.

## Ejecutar

```bash
npm run dev
```

Después abre:

```text
http://localhost:5173
```

## Seguridad

El archivo `.env` está ignorado por Git.

Nunca subas tu correo, contraseña o token a GitHub.
No pegues tus credenciales en código del frontend.

## Arquitectura

```text
React / Vite
      |
      | /api
      v
Node + Express
      |
      | autenticación y consultas
      v
Biwenger
```

## Siguiente fase

1. Histórico de precios.
2. Ranking de fichajes.
3. Recomendación de puja.
4. Mejor XI.
5. Lesiones y sanciones.
6. Calendario de próximos rivales.
7. Análisis de rivales de tu liga.
8. Alertas.

La integración usa endpoints internos/no documentados públicamente por Biwenger,
por lo que pueden cambiar y requerir mantenimiento.
