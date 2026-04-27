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
    <header className="sticky top-0 z-40 border-b border-[rgba(46,50,64,0.55)] bg-[rgba(6,8,16,0.82)] backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1240px] items-center gap-3 px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(46,50,64,0.8)] bg-[rgba(23,25,33,0.8)] text-[#c4cad8] shadow-[0_8px_20px_rgba(0,0,0,0.32)] backdrop-blur-sm md:hidden"
          aria-label="Abrir menú"
        >
          <span className="text-lg leading-none">☰</span>
        </button>

        <Link href="/home" className="group inline-flex items-center rounded-full border border-[rgba(47,126,232,0.48)] bg-[rgba(15,17,24,0.88)] px-4 py-2.5 shadow-[0_8px_20px_rgba(47,126,232,0.18),0_0_0_1px_rgba(93,175,255,0.08)_inset] backdrop-blur-sm transition hover:border-[rgba(47,126,232,0.7)]">
          <span className="text-[12px] font-black tracking-[0.22em] text-[#f0f4ff] transition group-hover:text-white">{brand}</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 md:flex md:justify-center">
          <ul className="relative flex items-center gap-1 rounded-full border border-[rgba(46,50,64,0.65)] bg-[rgba(15,17,24,0.78)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
            {items.map((item) => {
              const isActive = item.key === activeKey;
              return (
                <li key={item.key} className="relative">
                  {isActive ? (
                    <motion.span
                      layoutId="vcars-nav-active-pill"
                      className="absolute inset-0 rounded-full border border-[rgba(47,126,232,0.55)] bg-[linear-gradient(145deg,rgba(47,126,232,0.32),rgba(26,109,212,0.24))] shadow-[0_4px_16px_rgba(47,126,232,0.22)]"
                      transition={vcarsTransitions.component.base}
                    />
                  ) : null}
                  <motion.div whileHover={vcarsMicroPresets.button.whileHover} whileTap={vcarsMicroPresets.button.whileTap} transition={vcarsMicroPresets.button.transition}>
                    <Link
                      href={item.href}
                      className={`relative z-[1] inline-flex min-h-9 items-center rounded-full px-5 text-[13px] font-semibold transition ${isActive ? 'text-[#f0f4ff]' : 'text-[#8b92a6] hover:text-[#c4cad8]'}`}
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
