'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { vcarsMicroPresets, vcarsTransitions, vcarsVariants } from '@/motion/variants';

export type KPIStatVariant = 'success' | 'warning' | 'critical' | 'neutral';

type KPIStatCardProps = {
  title: string;
  value: number;
  suffix?: string;
  trendLabel: string;
  trendValue?: number;
  insight: string;
  progress?: number;
  variant?: KPIStatVariant;
  index?: number;
  featured?: boolean;
  href?: string;
  ariaLabel?: string;
};

const variantClass: Record<KPIStatVariant, { accent: string; badge: string; bar: string; glow: string; value: string; border: string }> = {
  success: {
    accent: 'bg-gradient-to-b from-[#22c55e] to-[#15803d]',
    badge: 'border-[rgba(34,197,94,0.40)] bg-[rgba(34,197,94,0.1)] text-[#86efac]',
    bar: 'from-[#22c55e] to-[#15803d]',
    glow: 'group-hover:shadow-[0_20px_48px_rgba(0,0,0,0.45),0_0_28px_rgba(34,197,94,0.12)]',
    value: 'text-[#f0f4ff]',
    border: 'hover:border-[rgba(34,197,94,0.42)]',
  },
  warning: {
    accent: 'bg-gradient-to-b from-[#f59e0b] to-[#b45309]',
    badge: 'border-[rgba(245,158,11,0.40)] bg-[rgba(245,158,11,0.1)] text-[#fcd34d]',
    bar: 'from-[#f59e0b] to-[#b45309]',
    glow: 'group-hover:shadow-[0_20px_48px_rgba(0,0,0,0.45),0_0_28px_rgba(245,158,11,0.12)]',
    value: 'text-[#f0f4ff]',
    border: 'hover:border-[rgba(245,158,11,0.42)]',
  },
  critical: {
    accent: 'bg-gradient-to-b from-[#ef4444] to-[#b91c1c]',
    badge: 'border-[rgba(239,68,68,0.40)] bg-[rgba(239,68,68,0.1)] text-[#fca5a5]',
    bar: 'from-[#ef4444] to-[#b91c1c]',
    glow: 'group-hover:shadow-[0_20px_48px_rgba(0,0,0,0.45),0_0_28px_rgba(239,68,68,0.14)]',
    value: 'text-[#f0f4ff]',
    border: 'hover:border-[rgba(239,68,68,0.44)]',
  },
  neutral: {
    accent: 'bg-gradient-to-b from-[#3ba8f0] to-[#1a6dd4]',
    badge: 'border-[rgba(59,168,240,0.40)] bg-[rgba(47,126,232,0.1)] text-[#93ccff]',
    bar: 'from-[#3ba8f0] to-[#1a6dd4]',
    glow: 'group-hover:shadow-[0_20px_48px_rgba(0,0,0,0.45),0_0_28px_rgba(47,126,232,0.14)]',
    value: 'text-[#f0f4ff]',
    border: 'hover:border-[rgba(47,126,232,0.46)]',
  },
};

function formatValue(value: number, suffix?: string) {
  const numeric = Number.isFinite(value) ? value : 0;
  return `${new Intl.NumberFormat('es-CO').format(numeric)}${suffix || ''}`;
}

export function KPIStatCard({
  title,
  value,
  suffix,
  trendLabel,
  trendValue,
  insight,
  progress,
  variant = 'neutral',
  index = 0,
  featured = false,
  href,
  ariaLabel,
}: KPIStatCardProps) {
  const reduced = useReducedMotion();
  const classes = variantClass[variant];
  const cardVariants = vcarsVariants.revealItem(Boolean(reduced));
  const progressSafe = Math.max(0, Math.min(100, Math.round(progress ?? 0)));

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 140,
    damping: 24,
    mass: 0.6,
  });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (reduced) return;

    const unsub = spring.on('change', (latest) => {
      setDisplayValue(Math.max(0, Math.round(latest)));
    });

    motionValue.set(value);
    return () => unsub();
  }, [motionValue, reduced, spring, value]);

  const renderedValue = reduced ? value : displayValue;

  const trendText = useMemo(() => {
    if (typeof trendValue !== 'number') return trendLabel;
    const sign = trendValue > 0 ? '+' : '';
    return `${trendLabel} ${sign}${trendValue}%`;
  }, [trendLabel, trendValue]);

  const card = (
    <motion.article
      variants={cardVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.22 }}
      transition={{ ...vcarsTransitions.component.base, delay: reduced ? 0 : index * 0.06 }}
      whileHover={vcarsMicroPresets.button.whileHover}
      whileTap={vcarsMicroPresets.button.whileTap}
      className={`group relative min-w-0 max-w-full overflow-hidden rounded-2xl border border-[rgba(46,50,64,0.7)] p-4 transition-[border-color,box-shadow] duration-200 md:p-5 ${classes.glow} ${classes.border} ${featured ? 'md:col-span-2' : ''}`}
      style={{
        background:
          'radial-gradient(circle at 88% -28%, rgba(255,255,255,0.04), transparent 44%), linear-gradient(160deg, rgba(23,25,33,0.97), rgba(15,17,24,0.98))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.36), 0 0 0 1px rgba(255,255,255,0.02) inset',
      }}
    >
      <span className={`pointer-events-none absolute left-0 top-[12%] h-[76%] w-[3px] rounded-r-sm ${classes.accent}`} />

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <p className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b92a6] sm:text-[11px]">{title}</p>
        <motion.span
          className={`inline-flex max-w-full self-start items-center rounded-full border px-2 py-1 text-[10px] font-semibold sm:self-auto sm:px-2.5 sm:text-[11px] ${classes.badge}`}
          initial={reduced ? undefined : { opacity: 0, scale: 0.96 }}
          whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={vcarsTransitions.micro.base}
        >
          {trendText}
        </motion.span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <strong className={`text-[40px] font-black leading-[0.92] tracking-[-0.03em] md:text-[46px] ${classes.value}`}>
          {formatValue(renderedValue, suffix)}
        </strong>
      </div>

      <p className="mt-2 text-[12px] leading-[1.45] text-[#8b92a6]">{insight}</p>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(46,50,64,0.6)]">
        <motion.span
          className={`block h-full rounded-full bg-gradient-to-r ${classes.bar}`}
          initial={reduced ? { width: `${progressSafe}%` } : { width: 0 }}
          whileInView={{ width: `${progressSafe}%` }}
          viewport={{ once: true, amount: 0.3 }}
          transition={vcarsTransitions.component.base}
        />
      </div>
    </motion.article>
  );

  if (!href) return card;

  return (
    <Link href={href} aria-label={ariaLabel || `Filtrar por ${title}`} className="block">
      {card}
    </Link>
  );
}
