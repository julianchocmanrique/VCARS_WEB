'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion, type TargetAndTransition } from 'framer-motion';
import { vcarsMotion } from '@/motion/tokens';

type LoaderPhase = 'intro' | 'scan' | 'spin' | 'boost' | 'reveal';

type VcarsWheelLoaderProps = {
  onComplete: () => void;
  message?: string;
};

export function VcarsWheelLoader({ onComplete, message = 'Inicializando VCARS' }: VcarsWheelLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<LoaderPhase>('intro');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (prefersReducedMotion) {
      timers.push(setTimeout(() => setPhase('reveal'), 220));
      timers.push(setTimeout(onComplete, 560));
      return () => timers.forEach((timer) => clearTimeout(timer));
    }

    timers.push(setTimeout(() => setPhase('scan'), 280));
    timers.push(setTimeout(() => setPhase('spin'), 760));
    timers.push(setTimeout(() => setPhase('boost'), 1480));
    timers.push(setTimeout(() => setPhase('reveal'), 2280));
    timers.push(setTimeout(onComplete, 2620));

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [onComplete, prefersReducedMotion]);

  const spinAnim = useMemo<TargetAndTransition>(() => {
    if (prefersReducedMotion) return { rotate: 0, transition: { duration: 0 } };

    if (phase === 'spin') {
      return {
        rotate: 360,
        transition: { duration: 2.4, ease: 'linear' as const, repeat: Infinity },
      };
    }

    if (phase === 'boost') {
      return {
        rotate: 360,
        transition: { duration: 0.85, ease: 'linear' as const, repeat: Infinity },
      };
    }

    return {
      rotate: 0,
      transition: { duration: 0.26, ease: vcarsMotion.ease.standard },
    };
  }, [phase, prefersReducedMotion]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden"
      role="status"
      aria-label="Cargando VCARS"
      style={{
        background:
          'radial-gradient(circle at 28% 24%, rgba(71,161,241,0.18), transparent 44%), radial-gradient(circle at 76% 42%, rgba(255,106,36,0.11), transparent 45%), linear-gradient(180deg, #0d1015 0%, #07090d 100%)',
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'reveal' ? 0 : 1 }}
      transition={{ duration: prefersReducedMotion ? 0.16 : 0.34, ease: vcarsMotion.ease.smoothInOut }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={
          prefersReducedMotion
            ? undefined
            : {
                backgroundPosition: ['0% 0%', '100% 0%'],
              }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : {
                duration: 7.2,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: vcarsMotion.ease.smoothInOut,
              }
        }
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(8,10,14,0.88), rgba(20,24,31,0.52), rgba(8,10,14,0.88))',
          backgroundSize: '140% 100%',
        }}
      />

      <div className="relative flex flex-col items-center">
        <motion.div
          className="relative"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.86, filter: 'blur(5px)' }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.46, ease: vcarsMotion.ease.refined }}
        >
          <motion.div
            className="relative h-[380px] w-[380px] sm:h-[500px] sm:w-[500px]"
            animate={spinAnim}
            style={{
              filter: 'drop-shadow(0 20px 42px rgba(0,0,0,0.58))',
            }}
          >
            <Image
              src="/cars/llanta-splash-premium.png"
              alt="Llanta VCARS"
              fill
              priority
              className="object-contain object-center"
              sizes="(max-width: 640px) 380px, 500px"
            />

            <motion.div
              className="pointer-events-none absolute inset-[13%] rounded-full border border-[rgba(255,219,103,0.36)]"
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      opacity: [0.15, 0.4, 0.18],
                      scale: [1, 1.05, 1],
                    }
              }
              transition={{ duration: 1.6, repeat: Infinity, ease: vcarsMotion.ease.smoothInOut }}
            />
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, transparent 248deg, rgba(166,214,255,0.34) 290deg, rgba(242,248,255,0.72) 320deg, rgba(166,214,255,0.08) 344deg, transparent 360deg)',
              mixBlendMode: 'screen',
            }}
            animate={phase === 'scan' ? { rotate: [0, 360], opacity: [0.08, 0.55, 0.08] } : { opacity: 0 }}
            transition={{ duration: 1.1, ease: vcarsMotion.ease.smoothInOut }}
          />

          <motion.div
            className="pointer-events-none absolute -left-16 top-[53%] h-[108px] w-[176px]"
            style={{
              background:
                'radial-gradient(ellipse at 70% 50%, rgba(222,228,240,0.44), rgba(163,176,200,0.18) 40%, rgba(163,176,200,0) 74%)',
              filter: 'blur(10px)',
            }}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    opacity: [0.12, 0.3, 0.14],
                    x: [-5, -14, -6],
                    y: [0, -5, -2],
                  }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div
            className="pointer-events-none absolute -right-16 top-[52%] h-[112px] w-[182px]"
            style={{
              background:
                'radial-gradient(ellipse at 30% 50%, rgba(226,232,243,0.42), rgba(168,182,205,0.16) 40%, rgba(168,182,205,0) 74%)',
              filter: 'blur(10px)',
            }}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    opacity: [0.1, 0.27, 0.12],
                    x: [4, 14, 6],
                    y: [0, -5, -2],
                  }
            }
            transition={{ duration: 2.35, repeat: Infinity, ease: 'easeInOut' }}
          />

          {phase === 'reveal' ? (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-full border border-[rgba(152,203,255,0.72)]"
              initial={{ scale: 1, opacity: 0.68 }}
              animate={{ scale: 3.25, opacity: 0 }}
              transition={{ duration: 0.34, ease: vcarsMotion.ease.standard }}
            />
          ) : null}
        </motion.div>

        <motion.div
          className="mt-5 text-[12px] tracking-[0.18em] text-[#d1d5db]"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.14, duration: 0.34 }}
        >
          {message}
        </motion.div>

        <motion.div
          className="pointer-events-none absolute -bottom-8 h-7 w-[360px] rounded-[999px] sm:w-[460px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.84), rgba(0,0,0,0.1) 74%, transparent 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ duration: 0.4, ease: vcarsMotion.ease.standard }}
        />
      </div>
    </motion.div>
  );
}
