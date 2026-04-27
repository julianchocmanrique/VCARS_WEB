'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { vcarsMicroPresets, vcarsVariants } from '@/motion/variants';
import type { NavItem } from './PremiumNavbar';

type PremiumDrawerProps = {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  activeKey: string;
  headerTitle?: string;
};

export function PremiumDrawer({ open, onClose, items, activeKey, headerTitle = 'Navegación' }: PremiumDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] backdrop-blur-[3px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.aside
            className="fixed left-0 top-0 z-[60] h-full w-[88vw] max-w-[352px] border-r border-[rgba(46,50,64,0.7)] bg-[rgba(8,10,18,0.96)] p-5 shadow-[24px_0_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            variants={vcarsVariants.drawer(false)}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#62b5f7]">{headerTitle}</p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(46,50,64,0.8)] bg-[rgba(23,25,33,0.8)] text-[#8b92a6] transition hover:border-[rgba(47,126,232,0.5)] hover:text-[#f0f4ff]"
              >
                ✕
              </button>
            </div>

            <nav>
              <ul className="grid gap-2">
                {items.map((item) => {
                  const isActive = item.key === activeKey;
                  return (
                    <li key={item.key}>
                      <motion.div
                        whileHover={vcarsMicroPresets.button.whileHover}
                        whileTap={vcarsMicroPresets.button.whileTap}
                        transition={vcarsMicroPresets.button.transition}
                      >
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`flex min-h-11 items-center rounded-xl border px-4 text-[14px] font-semibold ${isActive
                            ? 'border-[rgba(47,126,232,0.55)] bg-[linear-gradient(145deg,rgba(47,126,232,0.28),rgba(26,109,212,0.2))] text-[#f0f4ff] shadow-[0_0_16px_rgba(47,126,232,0.16)]'
                            : 'border-[rgba(46,50,64,0.7)] bg-[rgba(23,25,33,0.7)] text-[#8b92a6] hover:border-[rgba(47,126,232,0.4)] hover:text-[#c4cad8]'}`}
                        >
                          {item.label}
                        </Link>
                      </motion.div>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
