# DevMatch

Red social para desarrolladores de CUCosta/UdeG: encontrá gente con tu stack, seguí a otros devs, publicá posts con markdown y código resaltado, mandá mensajes en tiempo real y descubrí nuevos perfiles con un deck estilo swipe.

## Stack

- **Monorepo** con [Bun workspaces](https://bun.sh/docs/install/workspaces) (`backend/` + `frontend/`)
- **Frontend**: [Astro](https://astro.build) 7 (SSR, adapter de Vercel) + React (solo para las islas interactivas) + Tailwind CSS v4
- **Backend**: Express 5 sobre Bun + [Prisma](https://www.prisma.io) 7 (driver adapter `pg`, sin motor de queries nativo)
- **Base de datos**: PostgreSQL (vía Docker)
- **Imágenes**: Cloudinary (avatar, banner, fotos de post/chat — siempre convertidas a WebP)
- **Mensajería en tiempo real**: WebSockets (`ws`) sobre el mismo servidor HTTP de Express
- **Auth**: GitHub OAuth + cookie de sesión firmada con HMAC (sin JWT, sin librerías de sesión)

## Estructura

```
.
├── backend/          # API Express + Prisma + WebSocket server
│   ├── routes/        # Un archivo por recurso (auth, users, posts, discover, messages, ...)
│   ├── lib/            # session, cloudinary, conversations, ws, prisma client
│   ├── prisma/          # schema.prisma, migrations/, seed.ts
│   └── scripts/          # prisma.sh (wrapper para NixOS), reset-db.ts
├── frontend/          # Astro SSR
│   └── src/
│       ├── pages/        # Rutas (incluye API routes como /logout)
│       ├── components/    # .astro (estático) y react/ (islas interactivas)
│       ├── layouts/        # AppLayout (sidebar + ClientRouter), LoginLayout
│       └── lib/              # api.ts (fetch con cookie), markdown.ts, highlight.ts
├── compose.yml         # Postgres + pgAdmin
├── .env.example         # Todas las variables que necesita el proyecto
└── .gitignore
```

## Requisitos

- [Bun](https://bun.sh) 1.3+
- Docker (para Postgres y pgAdmin)
- Una GitHub OAuth App (para login)
- Una cuenta de Cloudinary (para imágenes)
- **Si estás en NixOS**: Prisma no distribuye binarios para esa plataforma. `backend/scripts/prisma.sh` ya resuelve el `schema-engine` desde `nixpkgs` automáticamente — por eso todos los comandos de Prisma se corren vía `bun run prisma <comando>`, nunca `bunx prisma` directo.

## Setup

1. **Variables de entorno**

   ```bash
   cp .env.example .env
   ```

   Completá:
   - `POSTGRES_USER` / `POSTGRES_PASSWORD` — las que quieras, se usan para crear el contenedor
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — de una [GitHub OAuth App](https://github.com/settings/developers) con callback `http://localhost:5001/auth/github/callback`
   - `SESSION_SECRET` — cualquier string largo al azar (`openssl rand -hex 32`)
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — de tu dashboard de Cloudinary. **La API key necesita permiso de `upload`/`create`** (revisalo en Settings → Security si los uploads fallan con 403)

2. **Levantar Postgres**

   ```bash
   docker compose up -d postgre
   ```

3. **Instalar dependencias** (desde la raíz, instala ambos workspaces)

   ```bash
   bun install
   ```

4. **Migrar y sembrar la base de datos**

   ```bash
   cd backend
   bun run prisma migrate dev
   bun run db:seed   # pobla focus_areas y technologies (necesario para el onboarding)
   ```

5. **Levantar todo**

   ```bash
   # desde la raíz, en dos terminales
   bun run dev:backend     # http://localhost:5001
   bun run dev:frontend    # http://localhost:5000
   ```

## Scripts útiles

| Comando (desde `backend/`) | Qué hace |
| --- | --- |
| `bun run dev` | Backend con watch mode |
| `bun run check` / `bun run lint` | Typecheck / ESLint |
| `bun run prisma <comando>` | Cualquier comando de Prisma (migrate, studio, generate...) con el engine de NixOS ya resuelto |
| `bun run db:seed` | Siembra `focus_areas` y `technologies` (idempotente) |
| `bun run db:reset` | **Destructivo**: vacía todas las tablas (`TRUNCATE ... RESTART IDENTITY`) y vuelve a sembrar el catálogo. Para "empezar de cero" sin tocar el schema |

| Comando (desde `frontend/`) | Qué hace |
| --- | --- |
| `bun run dev` | Astro dev server |
| `bun run check` | `astro check` |
| `bun run build` | Build de producción |

## Arquitectura — decisiones clave

- **Sesión**: cookie `session` firmada (HMAC-SHA256), guarda solo el `userId`. `GET /auth/session` siempre relee el usuario de la DB — así el perfil nunca queda desactualizado. En producción (`NODE_ENV=production`) la cookie pasa a `SameSite=None; Secure` porque frontend y backend viven en dominios distintos.
- **Middleware de Astro** (`frontend/src/middleware.ts`): bloquea todas las rutas sin sesión, y redirige a `/onboarding` si `onboardingCompleted` es `false`.
- **Imágenes**: `backend/lib/cloudinary.ts` separa `uploadImage()` (sube el buffer, sin transformar) de `getImageUrl()` (arma la URL de entrega con el transform — resize, crop, `format: webp`). El avatar por defecto se descarga de GitHub y se re-sube a Cloudinary solo la primera vez que se crea la cuenta; después es 100% editable por el usuario.
- **Feed**: `GET /posts/feed?scope=forYou|following`. `forYou` mezcla recencia + engagement; `following` es puramente cronológico de gente que seguís.
- **Reposts**: aparecen en el perfil de quien repostea (con atribución "fulano reposteó"), mezclando posts propios + reposteados ordenados por fecha unificada.
- **Mensajería**: un `Conversation` por par de usuarios (se resuelve ordenando los dos UUIDs, así no importa quién la inició). El envío de mensajes va **solo** por WebSocket (`/ws`); el historial y la lista de conversaciones son REST. El servidor bufferea mensajes que lleguen antes de terminar de verificar la sesión del socket, para no perder nada en el handshake.
- **Markdown**: se renderiza distinto según el contexto — posts del feed en el cliente (`marked` + `dompurify`), README del perfil en el servidor (`marked` + `sanitize-html`). Ambos pasan los bloques de código por el mismo helper de `highlight.js` (`frontend/src/lib/highlight.ts`).

## Troubleshooting

- **Login falla con `oauth_failed`**: casi siempre es que el contenedor de Postgres se cayó. Revisá con `docker ps -a | grep postgres` — si dice `Exited`, corré `docker compose up -d postgre`.
- **Subir una imagen da 403 de Cloudinary**: la API key no tiene permiso `create`. Revisalo en el dashboard de Cloudinary, en Settings → Security.
- **`bunx prisma ...` falla con un error de binario/libssl**: estás en NixOS. Usá `bun run prisma <comando>` (el script de `backend/scripts/prisma.sh`), nunca `bunx prisma` directo.
- **El onboarding no muestra áreas de foco ni tecnologías**: la DB está vacía de catálogo. Corré `bun run db:seed` desde `backend/`.

## Despliegue

**Frontend en Vercel** (adapter `@astrojs/vercel`, dominio `https://devmatch.mrmikedev.site`) y **backend en VPS propio** (dominio `https://backdevmatch.mrmikedev.site`, expuesto vía Cloudflare Tunnel):

### Backend (VPS)

- Variables de entorno en `backend/.env` (valores de producción):
  - `NODE_ENV=production` — activa `SameSite=None; Secure` en la cookie (necesario porque frontend y backend viven en dominios distintos)
  - `FRONTEND_URL=https://devmatch.mrmikedev.site`
  - `GITHUB_CALLBACK_URL=https://backdevmatch.mrmikedev.site/auth/github/callback`
  - `DATABASE_URL`, `CLOUDINARY_*`, `GITHUB_CLIENT_ID/SECRET`, `SESSION_SECRET` — con valores de producción

- Cloudflare Tunnel (Zero Trust) expone `localhost:<puerto-backend>` como `https://backdevmatch.mrmikedev.site` (TLS manejado por Cloudflare, sin nginx/Caddy necesario)

- Levantar con `docker-compose.prod.yml` (incluye Postgres + backend; ver `backend/Dockerfile`)

- **WebSockets**: el servidor (`backend/lib/ws.ts`) corre en el VPS (las funciones serverless de Vercel no soportan conexiones persistentes)

### Frontend (Vercel)

- Variables de entorno en Project Settings → Environment Variables, correspondientes a `frontend/.env`:
  - `BACKEND_URL=https://backdevmatch.mrmikedev.site`
  - `PUBLIC_BACKEND_URL=https://backdevmatch.mrmikedev.site`

- Proyecto ya linkeado en `.vercel/repo.json`

### GitHub OAuth App

- Configurar en https://github.com/settings/developers:
  - Homepage URL: `https://devmatch.mrmikedev.site`
  - Authorization callback URL: `https://backdevmatch.mrmikedev.site/auth/github/callback`
