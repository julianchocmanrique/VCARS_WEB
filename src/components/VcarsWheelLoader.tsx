'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { vcarsMotion } from '@/motion/tokens';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

type VcarsWheelLoaderProps = {
  onComplete: () => void;
  message?: string;
};

export function VcarsWheelLoader({ onComplete, message = 'Inicializando VCARS' }: VcarsWheelLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Keep the splash brief: it should introduce the app, not block it.
    const exitAfter = prefersReducedMotion ? 360 : 1080;
    const completeAfter = prefersReducedMotion ? 560 : 1320;
    const exitTimer = setTimeout(() => setIsLeaving(true), exitAfter);
    const completeTimer = setTimeout(onComplete, completeAfter);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, prefersReducedMotion]);

  return (
    <motion.div
      className="fixed inset-0 z-[2147483647] grid place-items-center overflow-hidden"
      role="status"
      aria-label="Cargando VCARS"
      style={{
        background:
          'radial-gradient(circle at 50% 44%, rgba(44, 126, 210, 0.18), transparent 31%), radial-gradient(circle at 17% 12%, rgba(90, 182, 255, 0.08), transparent 35%), linear-gradient(180deg, #0d121b 0%, #080b11 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLeaving ? 0 : 1 }}
      transition={{ duration: prefersReducedMotion ? 0.16 : 0.24, ease: vcarsMotion.ease.smoothInOut }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={prefersReducedMotion ? undefined : { opacity: [0.42, 0.76, 0.42] }}
        transition={prefersReducedMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: vcarsMotion.ease.smoothInOut }}
        style={{
          backgroundImage: 'linear-gradient(115deg, transparent 34%, rgba(137, 207, 255, 0.09) 50%, transparent 66%)',
        }}
      />

      <div className="relative flex flex-col items-center px-6 py-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }}>
        <motion.div
          className="relative h-[238px] w-[238px] sm:h-[370px] sm:w-[370px]"
          initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
          animate={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [0.985, 1, 0.985] }}
          transition={
            prefersReducedMotion
              ? { duration: 0.01 }
              : { opacity: { duration: 0.22 }, scale: { duration: 1.8, repeat: Infinity, ease: vcarsMotion.ease.smoothInOut } }
          }
        >
          <motion.div
            className="absolute inset-[7%]"
            animate={prefersReducedMotion ? undefined : { rotate: 360 }}
            transition={prefersReducedMotion ? undefined : { duration: 1.45, ease: 'linear', repeat: Infinity }}
            style={{ filter: 'drop-shadow(0 22px 30px rgba(0,0,0,0.5))' }}
          >
            <Image
              src={`${BASE_PATH}/cars/llanta-loader-v2.png`}
              alt="Rueda de alto rendimiento VCARS"
              fill
              priority
              className="object-contain"
              sizes="(max-width: 640px) 205px, 318px"
            />
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-[5%] rounded-full border border-[rgba(113,190,255,0.3)]"
            animate={prefersReducedMotion ? undefined : { opacity: [0.18, 0.52, 0.18], scale: [0.98, 1.035, 0.98] }}
            transition={prefersReducedMotion ? undefined : { duration: 1.55, repeat: Infinity, ease: vcarsMotion.ease.smoothInOut }}
          />
        </motion.div>

        <motion.div
          className="mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c7d5e5]"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.06, duration: 0.2, ease: vcarsMotion.ease.standard }}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[#71c1ff]"
            animate={prefersReducedMotion ? undefined : { opacity: [0.35, 1, 0.35] }}
            transition={prefersReducedMotion ? undefined : { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          {message}
        </motion.div>

        <div
          className="pointer-events-none absolute -bottom-4 h-8 w-[270px] rounded-[999px] sm:w-[380px]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.72), rgba(0,0,0,0.08) 72%, transparent 100%)' }}
        />
      </div>
    </motion.div>
  );
}
