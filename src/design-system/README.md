# VCARS Design System Starter

Este paquete fue generado tomando como base el dossier funcional de VCARS WEB, especialmente su enfoque de estética oscura premium con acentos cian, sus módulos de operación y la necesidad de reglas por rol y por etapa.

## Archivos incluidos

- `tokens/value.tokens.json`
- `tokens/light.tokens.json`
- `tokens/dark.tokens.json`
- `src/components/DesignSystemPortal.tsx`
- `tailwind.config.example.ts`

## Qué cubre

- Tokens semánticos de color para texto, fondos, bordes, íconos, estados, etapas del flujo y roles.
- Tipografía con line-height entero.
- Escala completa de spacing.
- Radios.
- Elevación.
- Motion.
- Componente portal en React + Tailwind para documentación viva.

## Recomendación de integración

1. Mueve la carpeta `tokens/` a tu app.
2. Importa `DesignSystemPortal.tsx` en una ruta como `/design-system`.
3. Conecta los tokens al theme global o a `tailwind.config.ts`.
4. Extiende los componentes productivos de VCARS para consumir estos tokens.

## Notas

- Los tokens fueron inferidos para un SaaS operativo de taller automotriz.
- Se añadieron estados lógicos que no siempre aparecen en las pantallas, como `disabled`, `focus`, `danger`, `warning`, `success`.
- Los nombres siguen un esquema semántico orientado a escalabilidad.

Fuente funcional: PROYECTO_WEB_VCARS.md
