'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { vcarsVariants } from '@/motion/variants';

type PageTransitionShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageTransitionShell({ children, className }: PageTransitionShellProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={pathname}
        variants={vcarsVariants.pageSwap(Boolean(reduced))}
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
