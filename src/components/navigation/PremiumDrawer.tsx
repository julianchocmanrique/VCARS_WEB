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
            className="fixed left-0 top-0 z-[60] h-full w-[88vw] max-w-[352px] border-r border-[rgba(58,61,66,0.82)] bg-[linear-gradient(180deg,rgba(18,18,20,0.98),rgba(11,11,12,0.98))] p-4 shadow-[24px_0_60px_rgba(0,0,0,0.5)]"
            variants={vcarsVariants.drawer(false)}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#9ca3af]">{headerTitle}</p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(58,61,66,0.82)] bg-[linear-gradient(180deg,rgba(26,27,30,0.88),rgba(18,18,20,0.82))] text-[#d1d5db]"
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
                          className={`flex min-h-11 items-center rounded-xl border px-3 text-[14px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${isActive
                            ? 'border-[rgba(31,95,159,0.52)] bg-[linear-gradient(180deg,rgba(31,95,159,0.3),rgba(23,79,134,0.26))] text-[#f5f5f5]'
                            : 'border-[rgba(58,61,66,0.8)] bg-[linear-gradient(180deg,rgba(26,27,30,0.76),rgba(18,18,20,0.72))] text-[#d1d5db]'}`}
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
