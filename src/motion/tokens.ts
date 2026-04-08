export const vcarsMotionDuration = {
  micro: {
    fast: 0.12,
    base: 0.16,
    slow: 0.18,
  },
  component: {
    fast: 0.18,
    base: 0.22,
    slow: 0.26,
  },
  story: {
    fast: 0.3,
    base: 0.38,
    slow: 0.45,
  },
} as const;

export const vcarsMotionEase = {
  standard: [0.22, 0.61, 0.36, 1],
  refined: [0.22, 0.8, 0.26, 1],
  smoothInOut: [0.4, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
} as const;

export const vcarsMotionDistance = {
  microY: 4,
  componentY: 12,
  storyY: 24,
  storyX: 36,
} as const;

export const vcarsMotionBlur = {
  micro: 'blur(2px)',
  component: 'blur(6px)',
  story: 'blur(10px)',
} as const;

export const vcarsMotionScale = {
  hover: 1.015,
  press: 0.985,
  appear: 0.97,
} as const;

export const vcarsMotion = {
  duration: vcarsMotionDuration,
  ease: vcarsMotionEase,
  distance: vcarsMotionDistance,
  blur: vcarsMotionBlur,
  scale: vcarsMotionScale,
} as const;
