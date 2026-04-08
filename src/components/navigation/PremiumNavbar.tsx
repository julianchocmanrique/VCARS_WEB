'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { vcarsMicroPresets, vcarsTransitions } from '@/motion/variants';

export type NavItem = {
  key: string;
  label: string;
  href: string;
};

type PremiumNavbarProps = {
  brand?: string;
  items: NavItem[];
  activeKey: string;
  onMenuClick?: () => void;
  rightSlot?: React.ReactNode;
};

export function PremiumNavbar({ brand = 'VCARS', items, activeKey, onMenuClick, rightSlot }: PremiumNavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(58,61,66,0.72)] bg-[linear-gradient(180deg,rgba(11,11,12,0.92),rgba(11,11,12,0.74))] backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1240px] items-center gap-3 px-4 py-3.5 md:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(58,61,66,0.84)] bg-[linear-gradient(180deg,rgba(26,27,30,0.9),rgba(18,18,20,0.84))] text-[#d1d5db] shadow-[0_8px_18px_rgba(0,0,0,0.28)] md:hidden"
          aria-label="Abrir menú"
        >
          <span className="text-lg leading-none">☰</span>
        </button>

        <Link href="/home" className="group inline-flex items-center rounded-full border border-[rgba(31,95,159,0.45)] bg-[linear-gradient(180deg,rgba(26,27,30,0.9),rgba(18,18,20,0.9))] px-4 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.34)]">
          <span className="text-[12px] font-black tracking-[0.2em] text-[#f5f5f5] transition group-hover:text-white">{brand}</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 md:flex md:justify-center">
          <ul className="relative flex items-center gap-1.5 rounded-full border border-[rgba(58,61,66,0.82)] bg-[linear-gradient(180deg,rgba(18,18,20,0.84),rgba(11,11,12,0.82))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {items.map((item) => {
              const isActive = item.key === activeKey;
              return (
                <li key={item.key} className="relative">
                  {isActive ? (
                    <motion.span
                      layoutId="vcars-nav-active-pill"
                      className="absolute inset-0 rounded-full border border-[rgba(31,95,159,0.52)] bg-[linear-gradient(180deg,rgba(31,95,159,0.34),rgba(23,79,134,0.28))] shadow-[0_6px_16px_rgba(31,95,159,0.24)]"
                      transition={vcarsTransitions.component.base}
                    />
                  ) : null}
                  <motion.div whileHover={vcarsMicroPresets.button.whileHover} whileTap={vcarsMicroPresets.button.whileTap} transition={vcarsMicroPresets.button.transition}>
                    <Link
                      href={item.href}
                      className={`relative z-[1] inline-flex min-h-10 items-center rounded-full px-4.5 text-[13px] font-semibold transition ${isActive ? 'text-[#f5f5f5]' : 'text-[#9ca3af] hover:text-[#f5f5f5]'}`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto">{rightSlot}</div>
      </div>
    </header>
  );
}
