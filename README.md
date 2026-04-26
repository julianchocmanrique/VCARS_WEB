# VCARS_WEB

Frontend de VCARS (Next.js). Esta capa solo maneja UI y consumo de API.

## Separación de arquitectura
- Frontend: este repo (`VCARS_WEB`)
- Backend: `vcars-api`
- DB: PostgreSQL (solo accesible desde backend)

Documentación:
- `docs/ARCHITECTURE_DATA_MAP.md`
- `docs/DEPLOY_SPLIT_MAP.md`

## Variables de entorno
1. Copia `.env.example` a `.env`
2. Ajusta:
- `NEXT_PUBLIC_API_URL` (ejemplo: `http://187.124.65.93:4000`)

## Desarrollo local
```bash
npm install
npm run dev
```

## Despliegue frontend (contenedor independiente)
```bash
docker compose up -d --build
```

Puerta por defecto:
- `3010 -> 3000` (contenedor)
