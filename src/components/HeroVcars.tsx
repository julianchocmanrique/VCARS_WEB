'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { vcarsMotion } from '@/motion/tokens';
import { vcarsMicroMotion, vcarsVariants } from '@/motion/variants';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

type HeroVcarsProps = {
  roleLabel: string;
  headline: string;
  subheadline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  activeCount: number;
  totalCount: number;
  onSignOut: () => void;
};

export function HeroVcars({
  roleLabel,
  headline,
  subheadline,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  activeCount,
  totalCount,
  onSignOut,
}: HeroVcarsProps) {
  const reduced = useReducedMotion();
  const container = vcarsVariants.revealContainer(Boolean(reduced));
  const item = vcarsVariants.revealItem(Boolean(reduced));
  const visual = vcarsVariants.heroVisual(Boolean(reduced));
  const hasCopy = Boolean((headline || '').trim() || (subheadline || '').trim());

  return (
    <section className="relative z-[1] w-full overflow-hidden border-b border-[rgba(46,50,64,0.6)] bg-[#060810]">
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={reduced ? undefined : { backgroundPosition: ['0% 0%', '100% 0%'] }}
        transition={
          reduced
            ? undefined
            : {
                duration: 10,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: vcarsMotion.ease.smoothInOut,
              }
        }
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 22%, rgba(47,126,232,0.18), transparent 44%), radial-gradient(circle at 82% 12%, rgba(47,126,232,0.12), transparent 42%), radial-gradient(circle at 55% 80%, rgba(26,109,212,0.08), transparent 38%), linear-gradient(135deg, rgba(6,8,16,1) 0%, rgba(15,17,24,1) 52%, rgba(6,8,16,1) 100%)',
          backgroundSize: '120% 120%',
        }}
      />
      {!hasCopy ? (
        <div className="pointer-events-none absolute inset-0 z-[0] overflow-hidden">
          <Image
            src={`${BASE_PATH}/cars/car2-hero-hd-flip.jpg`}
            alt="Fondo VCARS"
            fill
            priority
            className="object-cover object-[68%_50%] opacity-[0.82] max-[425px]:object-contain max-[425px]:object-center max-[425px]:scale-[0.9] max-[375px]:scale-[0.84] min-[426px]:object-center md:object-center"
            sizes="100vw"
          />

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,14,0.52)_0%,rgba(8,10,14,0.22)_36%,rgba(8,10,14,0.32)_64%,rgba(8,10,14,0.6)_100%)] md:bg-[linear-gradient(90deg,rgba(8,10,14,0.68)_0%,rgba(8,10,14,0.38)_36%,rgba(8,10,14,0.46)_64%,rgba(8,10,14,0.72)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_30%,rgba(69,164,237,0.18),transparent_36%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,10,12,0.16),rgba(9,10,12,0.44))] md:bg-[linear-gradient(180deg,rgba(9,10,12,0.24),rgba(9,10,12,0.58))]" />
        </div>
      ) : null}


      <motion.div
        className="pointer-events-none absolute -left-[12%] top-[-18%] h-[420px] w-[420px] rounded-full"
        animate={reduced ? undefined : { x: [0, 24, -8, 0], y: [0, 8, -6, 0], opacity: [0.34, 0.45, 0.34] }}
        transition={reduced ? undefined : { duration: 10, repeat: Infinity, ease: vcarsMotion.ease.smoothInOut }}
        style={{ background: 'radial-gradient(circle, rgba(69,164,237,0.16), rgba(69,164,237,0))' }}
      />

      <div className={`relative z-[2] mx-auto w-full max-w-[1240px] px-4 sm:px-5 md:px-8 ${hasCopy ? 'pb-10 pt-5 md:pb-16 md:pt-8' : 'pb-6 pt-4 md:pb-8 md:pt-5'}`}>
        <div className={`flex items-center justify-between ${hasCopy ? 'mb-6 md:mb-10' : 'mb-4 md:mb-5'}`}>
          <div className="inline-flex items-center gap-3 rounded-full border border-[rgba(47,126,232,0.5)] bg-[rgba(15,17,24,0.82)] px-4 py-2 shadow-[0_4px_16px_rgba(47,126,232,0.18),0_0_0_1px_rgba(93,175,255,0.1)_inset] backdrop-blur-sm">
            <Image src={`${BASE_PATH}/vcars-v.png`} alt="Vcars" width={22} height={22} className="h-[22px] w-[22px]" />
            <span className="text-sm font-black tracking-[0.22em] text-[#f0f4ff]">VCARS</span>
          </div>

          <div className="flex items-center gap-2">
            {hasCopy ? (
              <span className="hidden rounded-full border border-[rgba(58,61,66,0.9)] bg-[rgba(18,18,20,0.85)] px-4 py-2 text-xs font-semibold text-[#d1d5db] md:inline-flex">
                {roleLabel}
              </span>
            ) : null}
            <motion.button
              onClick={onSignOut}
              className="rounded-full border border-[rgba(46,50,64,0.8)] bg-[rgba(23,25,33,0.72)] px-4 py-2 text-xs font-semibold text-[#c4cad8] backdrop-blur-sm transition hover:border-[rgba(47,126,232,0.5)] hover:text-[#f0f4ff]"
              whileHover={vcarsMicroMotion.whileHover}
              whileTap={vcarsMicroMotion.whileTap}
              transition={vcarsMicroMotion.transition}
            >
              Salir
            </motion.button>
          </div>
        </div>

        <div className={`grid items-center ${hasCopy ? 'gap-7 md:grid-cols-[1.05fr_1fr] md:gap-8' : 'gap-4 md:grid-cols-[0.92fr_1.08fr] md:gap-5'}`}>
          <motion.div variants={container} initial="hidden" animate="show" className="max-w-[620px]">
            {hasCopy ? (
              <>
                <motion.p variants={item} className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9ca3af]">
                  Sistema operativo de taller premium
                </motion.p>

                <motion.h1
                  variants={item}
                  className="text-balance text-[34px] font-bold leading-[1.03] text-[#f5f5f5] sm:text-[38px] md:text-[66px] md:tracking-[-0.03em]"
                >
                  {headline}
                </motion.h1>

                <motion.p variants={item} className="mt-4 max-w-[52ch] text-pretty text-[15px] leading-[23px] text-[#d1d5db] md:mt-5 md:text-[18px] md:leading-[28px]">
                  {subheadline}
                </motion.p>
              </>
            ) : null}

            {hasCopy ? (
              <motion.div variants={item} className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                <motion.div whileHover={vcarsMicroMotion.whileHover} whileTap={vcarsMicroMotion.whileTap} transition={vcarsMicroMotion.transition}>
                  <Link
                    href={primaryCtaHref}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#2a6fb7] px-7 text-sm font-semibold text-[#f5f5f5] shadow-[0_0_0_1px_rgba(69,164,237,0.45),0_14px_30px_rgba(31,95,159,0.28)] transition hover:bg-[#1f5f9f] sm:w-auto"
                  >
                    {primaryCtaLabel}
                  </Link>
                </motion.div>

                <motion.div whileHover={vcarsMicroMotion.whileHover} whileTap={vcarsMicroMotion.whileTap} transition={vcarsMicroMotion.transition}>
                  <Link
                    href={secondaryCtaHref}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[rgba(58,61,66,0.92)] bg-[rgba(26,27,30,0.72)] px-7 text-sm font-semibold text-[#f5f5f5] transition hover:bg-[rgba(42,44,48,0.85)] sm:w-auto"
                  >
                    {secondaryCtaLabel}
                  </Link>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div variants={item} className="space-y-3">
                <div className="rounded-2xl border border-[rgba(47,126,232,0.38)] bg-[linear-gradient(135deg,rgba(15,19,30,0.86),rgba(10,12,20,0.78))] px-5 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.36),0_0_0_1px_rgba(93,175,255,0.08)_inset] backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#62b5f7]">Panel operativo</p>
                  <h2 className="mt-1.5 text-[26px] font-black leading-[1.06] tracking-[-0.02em] text-[#f0f4ff] md:text-[32px]">Bienvenido a VCARS</h2>
                  <p className="mt-2 text-[13px] leading-[1.6] text-[#9fb9d8]">Monitorea el estado del taller, revisa métricas clave y entra al proceso que necesites en segundos.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:max-w-[320px]">
                  <div className="rounded-2xl border border-[rgba(47,126,232,0.45)] bg-[rgba(15,19,30,0.64)] px-4 py-3 shadow-[0_8px_20px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#62b5f7]">Activos</p>
                    <p className="mt-1.5 text-[22px] font-black leading-none tracking-[-0.02em] text-[#f0f4ff]">{activeCount}</p>
                  </div>
                  <div className="rounded-2xl border border-[rgba(46,50,64,0.7)] bg-[rgba(23,25,33,0.6)] px-4 py-3 shadow-[0_8px_20px_rgba(0,0,0,0.24)] backdrop-blur-sm">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8b92a6]">Total</p>
                    <p className="mt-1.5 text-[22px] font-black leading-none tracking-[-0.02em] text-[#f0f4ff]">{totalCount}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={secondaryCtaHref} className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(46,50,64,0.8)] bg-[rgba(23,25,33,0.72)] px-4 text-xs font-semibold text-[#c4cad8] backdrop-blur-sm transition hover:border-[rgba(47,126,232,0.5)] hover:text-[#f0f4ff]">
                    Ir a Proceso
                  </Link>
                  <Link href={primaryCtaHref} className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(47,126,232,0.55)] bg-[rgba(47,126,232,0.18)] px-4 text-xs font-semibold text-[#93ccff] backdrop-blur-sm transition hover:bg-[rgba(47,126,232,0.28)] hover:text-[#f0f4ff]">
                    Ver orden activa
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>

          {hasCopy ? (
          <motion.div variants={visual} initial="hidden" animate="show" className={`relative ${hasCopy ? '' : 'mt-1'}`}>
            <div className={`relative overflow-hidden rounded-[28px] border border-[rgba(58,61,66,0.7)] bg-[linear-gradient(140deg,rgba(18,18,20,0.95),rgba(11,11,12,0.96))] ${hasCopy ? 'p-3 md:p-4' : 'p-2.5 md:p-3'}`}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(69,164,237,0.16),transparent_44%)]" />
              <div className={`relative overflow-hidden rounded-[20px] border border-[rgba(58,61,66,0.55)] ${hasCopy ? 'aspect-[16/10]' : 'aspect-[16/8.4] md:aspect-[16/9]'}`}>
                <Image
                  src={`${BASE_PATH}/cars/car2-hero-hd-flip.jpg`}
                  alt="Vcars premium hero"
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 92vw, 50vw"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,12,0.15),rgba(11,11,12,0.48))]" />
              </div>
            </div>

            {hasCopy ? (
              <motion.div
                variants={item}
                initial="hidden"
                animate="show"
                className="absolute -bottom-3 left-3 rounded-2xl border border-[rgba(46,50,64,0.7)] bg-[rgba(10,12,20,0.9)] px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-md md:-bottom-5 md:left-4 md:px-4 md:py-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#62b5f7]">Activos</p>
                <p className="mt-1 text-xl font-black tracking-[-0.02em] text-[#f0f4ff] md:text-2xl">{activeCount}</p>
              </motion.div>
            ) : null}

            {hasCopy ? (
              <motion.div
                variants={item}
                initial="hidden"
                animate="show"
                className="absolute right-3 top-3 rounded-2xl border border-[rgba(47,126,232,0.45)] bg-[rgba(15,22,38,0.88)] px-3 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.42),0_0_0_1px_rgba(93,175,255,0.1)_inset] backdrop-blur-md md:-right-2 md:top-4 md:px-4 md:py-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8b92a6]">Total</p>
                <p className="mt-1 text-2xl font-black tracking-[-0.02em] text-[#f0f4ff]">{totalCount}</p>
              </motion.div>
            ) : null}
          </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
