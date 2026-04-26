# VCARS - Mapa de Separación (Front / Back / DB)

## Repositorio Frontend (este repo)
- Repo: `VCARS_WEB`
- Ruta local: `/Users/admi/Documents/Proyectos_2026/vcars_web`
- Responsabilidad:
  - UI/UX
  - navegación
  - consumo de API
  - cache local no crítica
- Nunca accede directamente a PostgreSQL.

## Repositorio Backend
- Repo: `vcars-api`
- Ruta local: `/Users/admi/Documents/Proyectos_2026/vcars-api`
- Responsabilidad:
  - autenticación/autorización
  - reglas de negocio
  - validaciones del formulario
  - generación y entrega de PDF
  - subida/lectura de assets (fotos/firmas)
- Es la única capa que habla con DB.

## Base de Datos
- Motor: PostgreSQL
- Responsable: `vcars-api` (Prisma)
- No debe ser consumida desde frontend.

## Flujo oficial de datos
1. `VCARS_WEB` envía cambios a `vcars-api`.
2. `vcars-api` valida, persiste en PostgreSQL y responde.
3. `VCARS_WEB` refleja respuesta y guarda cache liviana.

## Variables clave por capa
- Frontend:
  - `NEXT_PUBLIC_API_URL` (URL pública del backend)
- Backend:
  - `DATABASE_URL`
  - `CORS_ORIGIN`
  - `JWT_SECRET`

## Levante recomendado por capas

### 1) DB (repo vcars-api)
```bash
cd /Users/admi/Documents/Proyectos_2026/vcars-api
docker compose -f docker-compose.db.yml up -d
```

### 2) API (repo vcars-api)
```bash
cd /Users/admi/Documents/Proyectos_2026/vcars-api
docker compose -f docker-compose.api.yml up -d --build
```

### 3) WEB (repo VCARS_WEB)
```bash
cd /Users/admi/Documents/Proyectos_2026/vcars_web
cp .env.example .env
# editar NEXT_PUBLIC_API_URL
# por ejemplo: http://187.124.65.93:4000
docker compose up -d --build
```
