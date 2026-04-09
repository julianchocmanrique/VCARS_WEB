'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { vcarsMicroMotion, vcarsTransitions } from '@/motion/variants';

type Tab = 'home' | 'new' | 'process';

type NavItem = {
  key: Tab;
  href: string;
  label: string;
};

const ITEMS: NavItem[] = [
  { key: 'home', href: '/home', label: 'INICIO' },
  { key: 'new', href: '/nuevo-ingreso', label: 'NUEVO' },
  { key: 'process', href: '/ingreso-activo', label: 'PROCESO' },
];

function Icon({ name, active }: { name: Tab; active: boolean }) {
  const stroke = active ? '#0b0b0c' : '#d1d5db';

  if (name === 'home') {
    return (
      <motion.svg viewBox="0 0 24 24" className="vc-nav-svg" aria-hidden="true" animate={{ scale: active ? 1.04 : 1 }} transition={vcarsTransitions.micro.base}>
        <path d="M3 11.8 12 4l9 7.8" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.4 10.7V20h9.2v-9.3" fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    );
  }

  if (name === 'new') {
    return (
      <motion.svg viewBox="0 0 24 24" className="vc-nav-svg" aria-hidden="true" animate={{ rotate: active ? 90 : 0 }} transition={vcarsTransitions.micro.base}>
        <circle cx="12" cy="12" r="8.4" fill="none" stroke={stroke} strokeWidth="1.8" />
        <path d="M12 8.3v7.4M8.3 12h7.4" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" />
      </motion.svg>
    );
  }

  return (
    <motion.svg viewBox="0 0 24 24" className="vc-nav-svg" aria-hidden="true" animate={{ scale: active ? 1.05 : 1 }} transition={vcarsTransitions.micro.base}>
      <path d="M5.3 8.2 12 4.5l6.7 3.7L12 12 5.3 8.2Z" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m5.3 12 6.7 3.7 6.7-3.7M5.3 15.8l6.7 3.7 6.7-3.7" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

export function BottomNav({ active }: { active: Tab }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Needed to avoid SSR/client hydration mismatch when rendering via portal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const nav = (
    <nav
      className="vc-bottom-nav"
      aria-label="Menu inferior"
      style={{
        position: 'fixed',
        left: '50%',
        right: 'auto',
        bottom: 'calc(env(safe-area-inset-bottom) + 8px)',
        transform: 'translateX(-50%)',
        zIndex: 2147483646,
      }}
    >
      {ITEMS.map((item) => {
        const isActive = active === item.key;
        return (
          <Link key={item.key} href={item.href} className={`vc-nav-item ${isActive ? 'is-active' : ''}`}>
            <motion.span className="vc-nav-item-inner" whileHover={isActive ? undefined : vcarsMicroMotion.whileHover} whileTap={vcarsMicroMotion.whileTap} transition={vcarsMicroMotion.transition}>
              <span className="vc-nav-icon-wrap">
                <Icon name={item.key} active={isActive} />
              </span>
              <motion.span className="vc-nav-label" animate={{ opacity: isActive ? 1 : 0.88 }} transition={vcarsTransitions.micro.base}>
                {item.label}
              </motion.span>
            </motion.span>
          </Link>
        );
      })}
    </nav>
  );

  return createPortal(nav, document.body);
}
