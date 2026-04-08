'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { vcarsVariants } from '@/motion/variants';

type SectionTransitionProps = {
  children: React.ReactNode;
  transitionKey?: string;
  mode?: 'swap' | 'reveal';
  className?: string;
};

export function SectionTransition({ children, transitionKey = 'default', mode = 'swap', className }: SectionTransitionProps) {
  const reduced = useReducedMotion();
  const variants = mode === 'swap' ? vcarsVariants.sectionSwap(Boolean(reduced)) : vcarsVariants.revealItem(Boolean(reduced));

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        variants={variants}
        initial="hidden"
        animate="show"
        exit="exit"
        className={className}
        style={{ willChange: 'transform, opacity, filter' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
