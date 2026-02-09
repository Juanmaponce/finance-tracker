# Guia de Deployment - Finance Tracker

> **Stack de hosting:** Vercel (frontend) + Render (backend) + Neon (PostgreSQL) + Upstash (Redis)
>
> **Costo total: $0/mes permanente**

---

## FASE 1: Crear Cuentas en Servicios (30-45 min)

### 1.1 - Vercel (Frontend Hosting)

- [ ] Ir a **vercel.com** y registrarse con cuenta de GitHub ("Continue with GitHub")
- [ ] Plan **Hobby (gratis)**: builds ilimitados, HTTPS automatico, CDN global
- [ ] **NO importar el proyecto todavia** - se hace en la Fase 3

### 1.2 - Neon.tech (PostgreSQL)

- [ ] Ir a **neon.tech** y registrarse con GitHub
- [ ] Plan **Free Forever**: 0.5GB de storage, 1 proyecto, branching incluido
- [ ] Click **"Create Project"**:
  - **Name:** `finance-tracker`
  - **Region:** US East (o el mas cercano a tus usuarios)
  - **PostgreSQL version:** 16
- [ ] Copiar el **Connection String** del dashboard (formato: `postgresql://neondb_owner:xxxx@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
- [ ] En **"Connection Details"**, asegurarse de copiar la URL con el **pooler** habilitado (puerto 5432). Esto es critico para que Prisma funcione bien
- [ ] Guardar esta URL como `DATABASE_URL`

### 1.3 - Upstash (Redis)

- [ ] Ir a **upstash.com** y registrarse con GitHub
- [ ] Plan **Free Forever**: 10,000 comandos/dia, 256MB storage
- [ ] Click **"Create Database"**:
  - **Name:** `finance-tracker-cache`
  - **Region:** US East 1 (igual que Neon para minimizar latencia)
  - **Type:** Regional
- [ ] Copiar la **Redis URL** del dashboard (formato: `redis://default:xxxx@xxxx.upstash.io:6379`)
- [ ] Guardar esta URL como `REDIS_URL`

### 1.4 - Cloudinary (Almacenamiento de recibos/fotos)

- [ ] Ir a **cloudinary.com** y crear cuenta gratuita
- [ ] Plan **Free**: 25GB storage, 25GB bandwidth/mes
- [ ] Ir al **Dashboard** y anotar:
  - [ ] **Cloud Name** (ej: `dxxxxx`)
  - [ ] **API Key** (numero largo)
  - [ ] **API Secret** (string largo)

### 1.5 - Sentry (Error Tracking - Opcional pero recomendado)

- [ ] Ir a **sentry.io** y registrarse con GitHub
- [ ] Plan **Developer (gratis)**: 5,000 errores/mes, 1 usuario
- [ ] Crear proyecto: Plataforma **Node.js**, Nombre `finance-tracker-backend`
- [ ] Copiar el **DSN** (formato: `https://xxxxx@xxxx.ingest.sentry.io/xxxxx`)

### 1.6 - Exchange Rate API (Tasas de cambio)

- [ ] Ir a **exchangerate-api.com** y crear cuenta gratuita
- [ ] Plan **Free**: 1,500 requests/mes (suficiente con cache de 24h en Redis)
- [ ] Copiar la **API Key** del dashboard

---

## FASE 2: Configurar Render.com (Backend) (20-30 min)

### 2.1 - Crear Web Service

- [ ] Ir a **render.com** y registrarse con GitHub
- [ ] Plan **Free**: 750 horas/mes (suficiente para 1 servicio 24/7)
- [ ] Click **"New +"** > **"Web Service"**
- [ ] Conectar el repositorio `finance-tracker` de GitHub
- [ ] Configurar:
  - **Name:** `finance-tracker-api`
  - **Region:** US East (Ohio) - mismo que Neon y Upstash
  - **Branch:** `main`
  - **Root Directory:** `backend`
  - **Runtime:** Node
  - **Build Command:** `npm ci && npx prisma generate && npm run build`
  - **Start Command:** `npx prisma migrate deploy && npm start`
  - **Instance Type:** **Free**

> **NOTA sobre Render Free**: El servicio se "duerme" despues de 15 min sin trafico (cold start de ~30-50 seg). Aceptable para MVP. Se mitiga con health checks externos (ver Fase 7).

### 2.2 - Generar JWT Secrets

Correr estos comandos en tu terminal (2 veces, uno para cada secret):

```bash
openssl rand -base64 48
```

- [ ] Primer resultado guardado como `JWT_SECRET`
- [ ] Segundo resultado guardado como `JWT_REFRESH_SECRET`

### 2.3 - Configurar Variables de Entorno en Render

Ir al servicio en Render > **"Environment"** > agregar:

- [ ] `DATABASE_URL` = (tu connection string de Neon)
- [ ] `REDIS_URL` = (tu Redis URL de Upstash)
- [ ] `JWT_SECRET` = (generado en paso 2.2)
- [ ] `JWT_REFRESH_SECRET` = (generado en paso 2.2)
- [ ] `JWT_ACCESS_EXPIRATION` = `15m`
- [ ] `JWT_REFRESH_EXPIRATION` = `7d`
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3001`
- [ ] `CORS_ORIGIN` = `https://tu-app.vercel.app` (se actualiza despues de Fase 3)
- [ ] `CLOUDINARY_CLOUD_NAME` = (de Cloudinary)
- [ ] `CLOUDINARY_API_KEY` = (de Cloudinary)
- [ ] `CLOUDINARY_API_SECRET` = (de Cloudinary)
- [ ] `EXCHANGE_RATE_API_KEY` = (de exchangerate-api.com)
- [ ] `EXCHANGE_RATE_BASE_URL` = `https://v6.exchangerate-api.com/v6`
- [ ] `SENTRY_DSN` = (de Sentry, opcional)
- [ ] Click **"Save Changes"**

### 2.4 - Obtener URL del Backend

- [ ] Esperar a que el deploy termine
- [ ] Anotar la URL publica (formato: `https://finance-tracker-api.onrender.com`)

---

## FASE 3: Configurar Vercel (Frontend) (15-20 min)

### 3.1 - Importar Proyecto

- [ ] En Vercel, click **"Add New Project"**
- [ ] Seleccionar repositorio `finance-tracker` de GitHub
- [ ] Configurar:
  - **Framework Preset:** Vite
  - **Root Directory:** `frontend`
  - **Build Command:** `npm run build` (default)
  - **Output Directory:** `dist` (default)

### 3.2 - Configurar Variable de Entorno

- [ ] Agregar variable antes de deployar:
  ```
  VITE_API_URL=https://finance-tracker-api.onrender.com/api/v1
  ```
  (Usar la URL real de Render del paso 2.4)

### 3.3 - Deploy

- [ ] Click **"Deploy"**
- [ ] Anotar la URL de Vercel (formato: `https://finance-tracker-xxxx.vercel.app`)

### 3.4 - Actualizar CORS en Render

- [ ] Volver a Render > Environment
- [ ] Actualizar `CORS_ORIGIN` con la URL real de Vercel
- [ ] Guardar cambios (Render hace redeploy automaticamente)

---

## FASE 4: Configurar GitHub Actions (CI/CD) (10 min)

### 4.1 - Obtener Tokens de Vercel

- [ ] **VERCEL_TOKEN**: Ir a vercel.com/account/tokens > Create Token
- [ ] **VERCEL_ORG_ID**: Ir a vercel.com/account > Settings > General > "Your ID"
- [ ] **VERCEL_PROJECT_ID**: Ir a tu proyecto en Vercel > Settings > General > "Project ID"

### 4.2 - Obtener Deploy Hook de Render (Opcional)

- [ ] En Render, ir al servicio > **Settings** > **"Deploy Hook"**
- [ ] Copiar la URL del deploy hook

> **NOTA:** Render ya detecta pushes a `main` automaticamente. El deploy hook es opcional y solo necesario si quieres que el deploy se dispare desde GitHub Actions (para que sea secuencial: CI pasa primero, luego deploy).

### 4.3 - Agregar Secrets en GitHub

Ir a tu repo en GitHub > **Settings** > **Secrets and variables** > **Actions**:

- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `RENDER_DEPLOY_HOOK_URL` (opcional, si elegiste usar deploy hook)

### 4.4 - Actualizar deploy.yml (backend)

El archivo `.github/workflows/deploy.yml` actual usa Railway. Hay que actualizar el job del backend.

**Opcion A - Sin cambios (recomendada):** Render deployea automaticamente con cada push a `main`. Eliminar o comentar el job `deploy-backend` del workflow y dejar solo `deploy-frontend`.

**Opcion B - Con deploy hook:** Reemplazar el job `deploy-backend` con:

```yaml
deploy-backend:
  name: Deploy Backend (Render)
  runs-on: ubuntu-latest
  steps:
    - name: Trigger Render Deploy
      run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

- [ ] Workflow actualizado

### 4.5 - Verificar CI/CD

- [ ] Hacer push a `main`
- [ ] Ir a la pestana **Actions** en GitHub
- [ ] Verificar que el workflow `CI` corre correctamente
- [ ] Verificar que el workflow `Deploy` corre correctamente

---

## FASE 5: Verificar Migraciones (5 min)

- [ ] Revisar logs de Render: el start command ejecuta `npx prisma migrate deploy` automaticamente
- [ ] Verificar que las tablas se crearon en Neon: ir al dashboard de Neon > **SQL Editor** > correr `\dt` o `SELECT * FROM _prisma_migrations;`
- [ ] Si falla, correr manualmente desde la terminal de Render: `npx prisma migrate deploy`

---

## FASE 6: Verificacion Post-Deploy (10 min)

### 6.1 - Backend

- [ ] Visitar `https://tu-backend.onrender.com/api/v1/health` (si hay health endpoint)
- [ ] Revisar logs en Render (Dashboard > Logs) para verificar arranque sin errores
- [ ] Probar crear un usuario via Postman/curl

### 6.2 - Frontend

- [ ] Visitar la URL de Vercel
- [ ] Verificar que la app carga correctamente
- [ ] Registrar un usuario de prueba
- [ ] Hacer login y verificar que funciona
- [ ] Verificar llamadas al backend (consola del navegador, sin errores CORS)

### 6.3 - Base de datos

- [ ] En Neon dashboard > **Tables**, verificar que las tablas existen
- [ ] Verificar que el usuario de prueba se creo correctamente

### 6.4 - Redis

- [ ] En Upstash dashboard > **Data Browser**, verificar que las keys se crean al usar la app (ej: cache de dashboard, exchange rates)

---

## FASE 7: Configuraciones Post-Deploy (Opcional)

### 7.1 - Mitigar Cold Starts de Render

El servicio free de Render duerme despues de 15 min sin trafico. Para mantenerlo despierto:

- [ ] Ir a **uptimerobot.com** y crear cuenta gratis (50 monitores)
- [ ] Crear monitor HTTP(s): URL de tu backend, intervalo de 5 min
- [ ] Alternativa: **betteruptime.com** (gratis, ping cada 3 min)

### 7.2 - PWA Verification

- [ ] Abrir la app en Chrome
- [ ] DevTools > **Application** > **Manifest** > verificar que carga
- [ ] Probar el boton "Install" en la barra de navegacion

### 7.3 - Sentry Verification

- [ ] Provocar un error intencional en la app
- [ ] Verificar que aparece en el dashboard de Sentry

---

## Resumen de Costos

| Servicio             | Plan      | Costo | Limites                      |
| -------------------- | --------- | ----- | ---------------------------- |
| **Vercel**           | Hobby     | $0    | 100GB bandwidth/mes          |
| **Render**           | Free      | $0    | 750h/mes, cold starts ~30s   |
| **Neon**             | Free      | $0    | 0.5GB storage, 1 proyecto    |
| **Upstash**          | Free      | $0    | 10K comandos/dia, 256MB      |
| **Cloudinary**       | Free      | $0    | 25GB storage, 25GB bandwidth |
| **Sentry**           | Developer | $0    | 5,000 errores/mes            |
| **ExchangeRate API** | Free      | $0    | 1,500 requests/mes           |
| **GitHub Actions**   | Free      | $0    | 2,000 min/mes                |

**Costo total: $0/mes permanente**

---

## Troubleshooting Comun

### "Connection refused" al backend desde el frontend

- Verificar que `VITE_API_URL` en Vercel apunta a la URL correcta de Render
- Verificar que `CORS_ORIGIN` en Render tiene la URL exacta de Vercel (con `https://`)
- Si Render esta dormido, esperar ~30-50 seg y reintentar

### Migraciones fallan en Render

- Verificar que `DATABASE_URL` en Render es correcto (copiar de nuevo desde Neon)
- Verificar que incluye `?sslmode=require` al final
- Revisar logs de Render para el error especifico

### "Too many connections" en Neon

- Neon free tiene limite de conexiones. Asegurarse de usar la URL con **connection pooler**
- En Prisma, agregar `?pgbouncer=true&connection_limit=5` al final del `DATABASE_URL`

### Redis timeout en Upstash

- Verificar que `REDIS_URL` incluye el password correcto
- Verificar que la region de Upstash es la misma que Render (US East)

### Cold starts muy lentos

- Configurar UptimeRobot/BetterUptime para ping cada 5 min
- En el frontend, mostrar un loading amigable para la primera carga
