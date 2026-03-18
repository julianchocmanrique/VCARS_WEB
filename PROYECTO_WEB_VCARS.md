# VCARS_WEB - Estado del Proyecto

## Fecha
- 2026-03-18

## Resumen
Se dejó la web de VCARS en Next.js con estilo visual unificado (tema oscuro cian), mejoras del inicio y tarjetas de proceso con imagen real por vehículo.

## Cambios aplicados
1. Tema global de colores
- Archivo: `src/styles/vcars-theme.css`
- Variables principales para fondo, superficies, bordes, acentos y estados.
- Integrado en: `src/app/globals.css`.

2. Ajustes de UI global
- Navegación inferior y layout móvil estabilizados.
- Espaciado inferior para evitar superposición del contenido con el menú fijo.

3. Inicio (`/home`) mejorado
- Encabezado con mejor jerarquía visual.
- Resumen operativo con estado activo.
- Panel rápido con indicadores.
- Lista de últimos movimientos mejorada.

4. Proceso (`/ingreso-activo`) con fotos por carro
- Se reemplazó el bloque genérico por imagen real en cada tarjeta.
- Mapeo por modelo en: `src/lib/carPhoto.ts`.
- Imágenes locales en: `public/cars/`.

## Imágenes cargadas
- `public/cars/chevrolet-tracker.jpg`
- `public/cars/toyota-corolla.jpg`
- `public/cars/chevrolet-corvette.jpg`
- `public/cars/suzuki-swift.jpg`
- `public/cars/ford-mustang.jpg`
- `public/cars/lamborghini-huracan.jpg`
- `public/cars/volkswagen-gol.jpg`

## Estado de git
- Rama: `main`
- Último commit aplicado en esta fase visual: `4ce804a`
- Repo remoto: `https://github.com/julianchocmanrique/VCARS_WEB.git`

## Comandos útiles
```bash
npm run dev
npm run lint
npm run build
```
