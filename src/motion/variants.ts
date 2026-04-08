import type { Transition, Variants } from 'framer-motion';
import { vcarsMotion } from './tokens';

export const vcarsTransitions = {
  micro: {
    base: { duration: vcarsMotion.duration.micro.base, ease: vcarsMotion.ease.standard } satisfies Transition,
    fast: { duration: vcarsMotion.duration.micro.fast, ease: vcarsMotion.ease.standard } satisfies Transition,
  },
  component: {
    base: { duration: vcarsMotion.duration.component.base, ease: vcarsMotion.ease.refined } satisfies Transition,
    fast: { duration: vcarsMotion.duration.component.fast, ease: vcarsMotion.ease.standard } satisfies Transition,
  },
  story: {
    base: { duration: vcarsMotion.duration.story.base, ease: vcarsMotion.ease.refined } satisfies Transition,
    slow: { duration: vcarsMotion.duration.story.slow, ease: vcarsMotion.ease.smoothInOut } satisfies Transition,
  },
} as const;

export const vcarsMicroMotion = {
  whileHover: { y: -1, scale: vcarsMotion.scale.hover },
  whileTap: { y: 0, scale: vcarsMotion.scale.press },
  transition: vcarsTransitions.micro.base,
};

export const vcarsFocusMotion = {
  initial: { boxShadow: '0 0 0 0 rgba(31,95,159,0)' },
  focused: { boxShadow: '0 0 0 3px rgba(69,164,237,0.32)' },
  transition: vcarsTransitions.micro.fast,
};

export const vcarsMicroPresets = {
  button: {
    whileHover: { y: -1, scale: vcarsMotion.scale.hover },
    whileTap: { y: 0, scale: vcarsMotion.scale.press },
    transition: vcarsTransitions.micro.base,
  },
  iconSwap: {
    initial: { opacity: 0.88, scale: 0.96 },
    active: { opacity: 1, scale: 1 },
    transition: vcarsTransitions.micro.fast,
  },
  badgePulse: {
    initial: { scale: 0.96, opacity: 0.94 },
    active: { scale: 1, opacity: 1 },
    transition: vcarsTransitions.micro.fast,
  },
  switchThumb: {
    off: { x: 0, scale: 1 },
    on: { x: 18, scale: 1.02 },
    transition: vcarsTransitions.micro.base,
  },
  tooltip: {
    hidden: { opacity: 0, y: 4, filter: vcarsMotion.blur.micro },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: vcarsTransitions.micro.base },
    exit: { opacity: 0, transition: vcarsTransitions.micro.fast },
  } as Variants,
} as const;

export const vcarsComponentPresets = {
  card: {
    initial: { opacity: 0, y: vcarsMotion.distance.componentY, filter: vcarsMotion.blur.component },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: vcarsTransitions.component.base },
    hover: { y: -2, transition: vcarsTransitions.micro.base },
  },
  tabPanel: {
    hidden: { opacity: 0, y: 10, filter: vcarsMotion.blur.micro },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: vcarsTransitions.component.fast },
    exit: { opacity: 0, y: -8, transition: vcarsTransitions.component.fast },
  } as Variants,
  dropdown: {
    hidden: { opacity: 0, y: 8, scale: 0.985, filter: vcarsMotion.blur.micro },
    show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: vcarsTransitions.component.fast },
    exit: { opacity: 0, y: 6, scale: 0.99, transition: vcarsTransitions.component.fast },
  } as Variants,
  inputState: {
    rest: { scale: 1, boxShadow: '0 0 0 0 rgba(31,95,159,0)' },
    focus: { scale: 1.002, boxShadow: '0 0 0 2px rgba(69,164,237,0.25)' },
    invalid: { scale: 1, boxShadow: '0 0 0 2px rgba(69,164,237,0.22)' },
    transition: vcarsTransitions.micro.fast,
  },
} as const;

export const vcarsVariants = {
  revealContainer(reduced: boolean): Variants {
    return {
      hidden: { opacity: reduced ? 1 : 0 },
      show: {
        opacity: 1,
        transition: reduced
          ? { duration: 0 }
          : {
              staggerChildren: 0.12,
              delayChildren: 0.06,
            },
      },
    };
  },

  revealItem(reduced: boolean): Variants {
    return {
      hidden: reduced
        ? { opacity: 0 }
        : {
            opacity: 0,
            y: vcarsMotion.distance.componentY,
            filter: vcarsMotion.blur.component,
          },
      show: reduced
        ? { opacity: 1 }
        : {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: vcarsTransitions.component.base,
          },
    };
  },

  heroVisual(reduced: boolean): Variants {
    return {
      hidden: reduced
        ? { opacity: 0 }
        : { opacity: 0, x: vcarsMotion.distance.storyX, scale: vcarsMotion.scale.appear },
      show: reduced
        ? { opacity: 1 }
        : {
            opacity: 1,
            x: 0,
            scale: 1,
            transition: {
              duration: vcarsMotion.duration.story.slow,
              ease: vcarsMotion.ease.refined,
              delay: 0.16,
            },
          },
    };
  },

  modal(reduced: boolean): Variants {
    return {
      hidden: reduced
        ? { opacity: 0 }
        : { opacity: 0, scale: 0.985, y: 10, filter: vcarsMotion.blur.micro },
      show: reduced
        ? { opacity: 1 }
        : {
            opacity: 1,
            scale: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: vcarsTransitions.component.base,
          },
      exit: reduced
        ? { opacity: 0 }
        : {
            opacity: 0,
            scale: 0.99,
            y: 6,
            transition: { duration: vcarsMotion.duration.component.fast, ease: vcarsMotion.ease.exit },
          },
    };
  },

  drawer(reduced: boolean): Variants {
    return {
      hidden: reduced ? { x: 0, opacity: 0 } : { x: 18, opacity: 0 },
      show: reduced
        ? { x: 0, opacity: 1 }
        : { x: 0, opacity: 1, transition: vcarsTransitions.component.base },
      exit: reduced
        ? { x: 0, opacity: 0 }
        : { x: 12, opacity: 0, transition: { duration: vcarsMotion.duration.component.fast, ease: vcarsMotion.ease.exit } },
    };
  },

  tooltip(reduced: boolean): Variants {
    return {
      hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 4, filter: vcarsMotion.blur.micro },
      show: reduced
        ? { opacity: 1 }
        : { opacity: 1, y: 0, filter: 'blur(0px)', transition: vcarsTransitions.micro.base },
      exit: { opacity: 0, transition: vcarsTransitions.micro.fast },
    };
  },

  pageSwap(reduced: boolean): Variants {
    return {
      hidden: reduced
        ? { opacity: 0 }
        : {
            opacity: 0,
            y: vcarsMotion.distance.storyY * 0.35,
            filter: vcarsMotion.blur.component,
          },
      show: reduced
        ? { opacity: 1 }
        : {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: {
              duration: vcarsMotion.duration.story.base,
              ease: vcarsMotion.ease.refined,
            },
          },
      exit: reduced
        ? { opacity: 0 }
        : {
            opacity: 0,
            y: -8,
            filter: vcarsMotion.blur.micro,
            transition: {
              duration: vcarsMotion.duration.story.fast,
              ease: vcarsMotion.ease.exit,
            },
          },
    };
  },

  sectionSwap(reduced: boolean): Variants {
    return {
      hidden: reduced ? { opacity: 0 } : { opacity: 0, y: vcarsMotion.distance.storyY * 0.5 },
      show: reduced
        ? { opacity: 1 }
        : { opacity: 1, y: 0, transition: vcarsTransitions.story.base },
      exit: reduced
        ? { opacity: 0 }
        : { opacity: 0, y: 10, transition: { duration: vcarsMotion.duration.story.fast, ease: vcarsMotion.ease.exit } },
    };
  },
} as const;
