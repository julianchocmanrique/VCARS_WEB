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
- LAB: `.env.lab` (base: `.env.lab.example`)
- PROD: `.env.prod` (base: `.env.prod.example`)
- Variable principal:
  - `NEXT_PUBLIC_API_URL`

## Desarrollo local
```bash
npm install
npm run dev
```

## Despliegue frontend por ambiente
LAB:
```bash
docker compose -f docker-compose.lab.yml up -d --build
```

PROD:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Puertos:
- LAB: `3010 -> 3000`
- PROD: `3020 -> 3000`
