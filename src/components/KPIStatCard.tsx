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

const variantClass: Record<KPIStatVariant, { accent: string; badge: string; bar: string; glow: string; value: string }> = {
  success: {
    accent: 'border-[rgba(34,197,94,0.38)]',
    badge: 'border-[rgba(34,197,94,0.40)] bg-[rgba(34,197,94,0.12)] text-[#86efac]',
    bar: 'from-[#22c55e] to-[#15803d]',
    glow: 'group-hover:shadow-[0_0_22px_rgba(34,197,94,0.12)]',
    value: 'text-[#f5f5f5]',
  },
  warning: {
    accent: 'border-[rgba(245,158,11,0.40)]',
    badge: 'border-[rgba(245,158,11,0.40)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]',
    bar: 'from-[#f59e0b] to-[#b45309]',
    glow: 'group-hover:shadow-[0_0_22px_rgba(245,158,11,0.12)]',
    value: 'text-[#f5f5f5]',
  },
  critical: {
    accent: 'border-[rgba(239,68,68,0.40)]',
    badge: 'border-[rgba(239,68,68,0.40)] bg-[rgba(239,68,68,0.12)] text-[#fca5a5]',
    bar: 'from-[#ef4444] to-[#b91c1c]',
    glow: 'group-hover:shadow-[0_0_22px_rgba(239,68,68,0.12)]',
    value: 'text-[#f5f5f5]',
  },
  neutral: {
    accent: 'border-[rgba(69,164,237,0.38)]',
    badge: 'border-[rgba(69,164,237,0.38)] bg-[rgba(69,164,237,0.12)] text-[#bfe4ff]',
    bar: 'from-[#69b7f5] to-[#2a6fb7]',
    glow: 'group-hover:shadow-[0_0_22px_rgba(69,164,237,0.12)]',
    value: 'text-[#f5f5f5]',
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
      className={`group relative min-w-0 max-w-full overflow-hidden rounded-2xl border border-[rgba(58,61,66,0.82)] p-4 md:p-5 ${classes.glow} ${featured ? 'md:col-span-2' : ''}`}
      style={{
        background:
          'radial-gradient(circle at 82% -34%, rgba(255,255,255,0.05), transparent 44%), linear-gradient(170deg, rgba(26,27,30,0.96), rgba(18,18,20,0.98))',
      }}
    >
      <span className={`pointer-events-none absolute left-0 top-0 h-full w-[2px] ${classes.accent}`} />

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <p className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ca3af] sm:text-[12px] sm:tracking-[0.14em]">{title}</p>
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
        <strong className={`text-[38px] font-black leading-[0.95] md:text-[44px] ${classes.value}`}>
          {formatValue(renderedValue, suffix)}
        </strong>
      </div>

      <p className="mt-2 text-[13px] leading-[1.35] text-[#d1d5db]">{insight}</p>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(58,61,66,0.55)]">
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
