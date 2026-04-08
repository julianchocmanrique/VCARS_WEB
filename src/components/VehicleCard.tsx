'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { vcarsComponentPresets, vcarsMicroPresets, vcarsVariants } from '@/motion/variants';

export type VehicleCardVariant = 'default' | 'selected' | 'critical' | 'disabled';

type VehicleCardProps = {
  href: string;
  imageUrl: string;
  imageAlt: string;
  name: string;
  version?: string;
  client: string;
  process: string;
  plate: string;
  statusLabel: string;
  variant?: VehicleCardVariant;
  metricA?: { label: string; value: string };
  metricB?: { label: string; value: string };
  ctaLabel?: string;
  onClick?: () => void;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const cardStyles: Record<
  VehicleCardVariant,
  {
    shell: string;
    process: string;
    plate: string;
    glow: string;
  }
> = {
  default: {
    shell:
      'border-[rgba(58,61,66,0.88)] bg-[linear-gradient(168deg,rgba(18,18,20,0.95),rgba(11,11,12,0.95))] shadow-[0_16px_36px_rgba(0,0,0,0.42)]',
    process: 'border-[rgba(58,61,66,0.86)] bg-[linear-gradient(180deg,rgba(42,44,48,0.9),rgba(26,27,30,0.94))] text-[#f5f5f5]',
    plate: 'bg-[#f2de35] text-[#0b0b0c] border-[#151515]',
    glow: 'group-hover:shadow-[0_0_36px_rgba(255,255,255,0.06)]',
  },
  selected: {
    shell:
      'border-[rgba(31,95,159,0.62)] bg-[linear-gradient(168deg,rgba(18,18,20,0.97),rgba(11,11,12,0.97))] shadow-[0_18px_42px_rgba(31,95,159,0.24)]',
    process: 'border-[rgba(31,95,159,0.66)] bg-[linear-gradient(180deg,rgba(31,95,159,0.48),rgba(23,79,134,0.38))] text-[#f5f5f5]',
    plate: 'bg-[#f2de35] text-[#0b0b0c] border-[#151515]',
    glow: 'group-hover:shadow-[0_0_40px_rgba(31,95,159,0.28)]',
  },
  critical: {
    shell:
      'border-[rgba(69,164,237,0.70)] bg-[linear-gradient(168deg,rgba(18,18,20,0.97),rgba(11,11,12,0.97))] shadow-[0_18px_42px_rgba(69,164,237,0.22)]',
    process: 'border-[rgba(69,164,237,0.68)] bg-[linear-gradient(180deg,rgba(31,95,159,0.52),rgba(23,79,134,0.4))] text-[#f5f5f5]',
    plate: 'bg-[#f2de35] text-[#0b0b0c] border-[#151515]',
    glow: 'group-hover:shadow-[0_0_42px_rgba(69,164,237,0.26)]',
  },
  disabled: {
    shell:
      'border-[rgba(58,61,66,0.74)] bg-[linear-gradient(168deg,rgba(18,18,20,0.82),rgba(11,11,12,0.82))] opacity-60 saturate-[0.82]',
    process: 'border-[rgba(58,61,66,0.72)] bg-[rgba(26,27,30,0.78)] text-[#9ca3af]',
    plate: 'bg-[#d3c327] text-[#1a1b1e] border-[#262626]',
    glow: '',
  },
};

export function VehicleCard({
  href,
  imageUrl,
  imageAlt,
  name,
  process,
  plate,
  variant = 'default',
  onClick,
}: VehicleCardProps) {
  const reduced = useReducedMotion();
  const styles = cardStyles[variant];
  const isDisabled = variant === 'disabled';
  const reveal = vcarsVariants.revealItem(Boolean(reduced));
  const cleanName = name.replace(/\s+(19|20)\d{2}\b/g, "").trim();

  return (
    <motion.article
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.22 }}
      whileHover={isDisabled ? undefined : vcarsComponentPresets.card.hover}
      className={cx(
        'group relative overflow-hidden rounded-[24px] border p-2.5 transition-all duration-200',
        styles.shell,
        styles.glow,
      )}
      aria-disabled={isDisabled}
    >
      <motion.div
        className="pointer-events-none absolute -inset-12 opacity-0"
        animate={isDisabled ? { opacity: 0 } : { opacity: [0.02, 0.08, 0.02] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(circle at 74% 18%, rgba(255,255,255,0.12), transparent 38%), radial-gradient(circle at 18% 88%, rgba(31,95,159,0.16), transparent 36%)',
        }}
      />

      <Link href={href} onClick={onClick} className={cx('block', isDisabled && 'pointer-events-none')}>
        <div className="relative overflow-hidden rounded-[18px] border border-[rgba(58,61,66,0.86)] bg-[#121214]">
          <motion.div
            className="relative aspect-[16/10]"
            whileHover={isDisabled || reduced ? undefined : { scale: 1.035, y: -2 }}
            transition={vcarsMicroPresets.button.transition}
          >
            <Image src={imageUrl} alt={imageAlt} fill sizes="(max-width: 700px) 100vw, 420px" className="object-cover object-center" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,12,0.02),rgba(11,11,12,0.5))]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.14),transparent_35%)]" />
          </motion.div>
        </div>

        <div className="mt-3 grid gap-2.5 px-1 pb-1">
          <div className="grid gap-1 text-center">
            <h3 className="line-clamp-2 break-words text-[1.05rem] sm:text-[1.18rem] md:text-[1.28rem] font-black leading-[1.1] text-[#f5f5f5]">{cleanName}</h3>
          </div>

          <div className="flex justify-center">
            <div
              className={cx(
                'w-full rounded-[14px] border px-3 py-2.5 text-center text-[0.82rem] sm:text-[0.88rem] md:text-[0.92rem] font-semibold leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_14px_rgba(0,0,0,0.24)]',
                styles.process,
              )}
            >
              {process}
            </div>
          </div>

          <div className="flex justify-center">
            <div className={cx('w-full rounded-[12px] border-2 px-3 py-2 text-center shadow-[inset_0_-2px_0_rgba(0,0,0,0.14),0_10px_16px_rgba(0,0,0,0.2)]', styles.plate)}>
              <div className="text-[1.55rem] sm:text-[1.78rem] md:text-[2.02rem] font-black tracking-[0.1em] leading-none">{plate}</div>
            </div>
          </div>
        </div>
      </Link>

      <div
        className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 34px rgba(69,164,237,0.14)' }}
      />
    </motion.article>
  );
}
