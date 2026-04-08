# VCARS Motion System

Sistema de motion design premium, sobrio y tecnológico para toda la interfaz.

## 1) Niveles de motion

### Nivel 1: Microinteracciones (120ms - 180ms)
- Hover/press en botones y links principales.
- Focus ring animado suave en inputs/controles.
- Cambio de iconos en navegación (scale/rotate leve).
- Badges/switches/feedback pequeño con fade + scale mínimo.

### Nivel 2: Componentes (180ms - 260ms)
- Cards: reveal sutil (fade + y corto + blur leve).
- Tabs/dropdowns/tooltips: entrada limpia sin overshoot.
- Modales/drawers: apertura técnica, sin rebotes.
- Formularios: transición de estados y errores sin brusquedad.

### Nivel 3: Storytelling (300ms - 450ms)
- Loader inicial con fases.
- Transiciones de secciones del dashboard.
- Revelado de bloques principales (hero + métricas).

## 2) Motion tokens

Definidos en: `src/motion/tokens.ts`

- Duraciones:
  - `micro.fast` = 120ms
  - `micro.base` = 160ms
  - `micro.slow` = 180ms
  - `component.fast` = 180ms
  - `component.base` = 220ms
  - `component.slow` = 260ms
  - `story.fast` = 300ms
  - `story.base` = 380ms
  - `story.slow` = 450ms
- Easing:
  - `standard` = `[0.22, 0.61, 0.36, 1]`
  - `refined` = `[0.22, 0.8, 0.26, 1]`
  - `smoothInOut` = `[0.4, 0, 0.2, 1]`
  - `exit` = `[0.4, 0, 1, 1]`
- Distancias: `vcarsMotion.distance.*`
- Blur/scale: `vcarsMotion.blur.*`, `vcarsMotion.scale.*`

## 3) Variantes reutilizables

Definidas en: `src/motion/variants.ts`

### Base
- `vcarsTransitions` -> transiciones por nivel.
- `vcarsMicroMotion` -> hover/tap general.
- `vcarsFocusMotion` -> focus state reutilizable.

### Nivel 1 (micro)
- `vcarsMicroPresets.button`
- `vcarsMicroPresets.iconSwap`
- `vcarsMicroPresets.badgePulse`
- `vcarsMicroPresets.switchThumb`
- `vcarsMicroPresets.tooltip`

### Nivel 2 (componentes)
- `vcarsComponentPresets.card`
- `vcarsComponentPresets.tabPanel`
- `vcarsComponentPresets.dropdown`
- `vcarsComponentPresets.inputState`

### Nivel 3 (storytelling)
- `vcarsVariants.revealContainer(reduced)`
- `vcarsVariants.revealItem(reduced)`
- `vcarsVariants.heroVisual(reduced)`
- `vcarsVariants.modal(reduced)`
- `vcarsVariants.drawer(reduced)`
- `vcarsVariants.tooltip(reduced)`
- `vcarsVariants.sectionSwap(reduced)`

## 4) Ejemplos aplicados en la app

- Hero premium: `src/components/HeroVcars.tsx`
- Navegación inferior: `src/components/BottomNav.tsx`
- Secciones dashboard home: `src/app/home/page.tsx`
- Loader inicial: `src/components/VcarsWheelLoader.tsx`

## 5) API simple recomendada

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import { vcarsMicroPresets, vcarsVariants } from '@/motion/variants';

const reduced = useReducedMotion();

<motion.div
  variants={vcarsVariants.revealItem(reduced)}
  initial="hidden"
  animate="show"
/>

<motion.button
  whileHover={vcarsMicroPresets.button.whileHover}
  whileTap={vcarsMicroPresets.button.whileTap}
  transition={vcarsMicroPresets.button.transition}
/>
```

## 6) Regla de estilo

- Sin bounce exagerado.
- Desplazamientos cortos.
- Blur leve y temporal.
- Menos es más: claridad > espectáculo.
- Respetar `prefers-reduced-motion` en transiciones de nivel 2 y 3.
