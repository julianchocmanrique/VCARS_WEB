'use client';

import { motion } from 'framer-motion';
import { vcarsMicroPresets, vcarsTransitions } from '@/motion/variants';

export type ActionButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ActionButtonState = 'idle' | 'loading' | 'success' | 'error';
export type ActionButtonSize = 'sm' | 'md' | 'lg';

type ActionButtonProps = {
  type?: 'button' | 'submit' | 'reset';
  variant?: ActionButtonVariant;
  state?: ActionButtonState;
  size?: ActionButtonSize;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const variantClasses: Record<ActionButtonVariant, string> = {
  primary:
    'border-[rgba(31,95,159,0.58)] bg-[linear-gradient(180deg,#2a6fb7,#174f86)] text-[#f5f5f5] shadow-[0_10px_22px_rgba(31,95,159,0.30)]',
  secondary:
    'border-[rgba(58,61,66,0.92)] bg-[linear-gradient(180deg,rgba(26,27,30,0.95),rgba(18,18,20,0.95))] text-[#f5f5f5]',
  ghost:
    'border-[rgba(58,61,66,0.86)] bg-[rgba(18,18,20,0.55)] text-[#d1d5db]',
};

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'min-h-9 px-3 text-[12px] rounded-xl',
  md: 'min-h-11 px-4 text-[14px] rounded-[13px]',
  lg: 'min-h-12 px-5 text-[15px] rounded-[14px]',
};

function StatusGlyph({ state }: { state: ActionButtonState }) {
  if (state === 'loading') {
    return (
      <motion.span
        aria-hidden="true"
        className="inline-block h-4 w-4 rounded-full border-2 border-[rgba(245,245,245,0.25)] border-t-[#f5f5f5]"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }}
      />
    );
  }

  if (state === 'success') {
    return (
      <motion.span
        aria-hidden="true"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={vcarsTransitions.micro.base}
        className="inline-grid h-4 w-4 place-items-center rounded-full bg-[rgba(34,197,94,0.22)] text-[#86efac]"
      >
        ✓
      </motion.span>
    );
  }

  if (state === 'error') {
    return (
      <motion.span
        aria-hidden="true"
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={vcarsTransitions.micro.base}
        className="inline-grid h-4 w-4 place-items-center rounded-full bg-[rgba(255,59,59,0.2)] text-[#fca5a5]"
      >
        !
      </motion.span>
    );
  }

  return null;
}

export function ActionButton({
  type = 'button',
  variant = 'primary',
  state = 'idle',
  size = 'md',
  disabled,
  className,
  children,
  onClick,
}: ActionButtonProps) {
  const isBusy = state === 'loading';
  const isDisabled = Boolean(disabled || isBusy);

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      aria-busy={isBusy}
      onClick={onClick}
      whileHover={isDisabled ? undefined : vcarsMicroPresets.button.whileHover}
      whileTap={isDisabled ? undefined : vcarsMicroPresets.button.whileTap}
      transition={vcarsMicroPresets.button.transition}
      animate={state === 'error' ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
      className={cx(
        'inline-flex w-full items-center justify-center gap-2 border font-semibold tracking-[0.01em]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#45a4ed]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0c]',
        'transition-[border-color,background-color,color,opacity,box-shadow] duration-150',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && 'cursor-not-allowed opacity-55 saturate-75',
        className,
      )}
    >
      <StatusGlyph state={state} />
      <span>{children}</span>
    </motion.button>
  );
}
