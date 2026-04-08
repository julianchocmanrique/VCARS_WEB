'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { vcarsVariants } from '@/motion/variants';

export type ActionFeedbackType = 'success' | 'error' | 'info' | 'warning';

type ActionFeedbackProps = {
  show: boolean;
  type: ActionFeedbackType;
  message: string;
  compact?: boolean;
};

const styles: Record<ActionFeedbackType, string> = {
  success: 'border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.12)] text-[#bbf7d0]',
  error: 'border-[rgba(255,59,59,0.5)] bg-[rgba(255,59,59,0.14)] text-[#fecaca]',
  info: 'border-[rgba(59,130,246,0.44)] bg-[rgba(59,130,246,0.14)] text-[#bfdbfe]',
  warning: 'border-[rgba(245,158,11,0.46)] bg-[rgba(245,158,11,0.14)] text-[#fde68a]',
};

const iconMap: Record<ActionFeedbackType, string> = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '•',
};

export function ActionFeedback({ show, type, message, compact = false }: ActionFeedbackProps) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          variants={vcarsVariants.tooltip(false)}
          initial="hidden"
          animate="show"
          exit="exit"
          role="status"
          className={`inline-flex w-full items-center gap-2 border ${compact ? 'rounded-xl px-2.5 py-2 text-[12px]' : 'rounded-[13px] px-3 py-2.5 text-[13px]'} ${styles[type]}`}
        >
          <span className="inline-grid h-4 w-4 place-items-center rounded-full border border-current/50 text-[11px] font-bold">{iconMap[type]}</span>
          <span>{message}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
