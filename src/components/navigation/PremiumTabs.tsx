'use client';

import { motion } from 'framer-motion';
import { vcarsMicroPresets, vcarsTransitions } from '@/motion/variants';

export type TabItem<T extends string> = {
  key: T;
  label: string;
};

type PremiumTabsProps<T extends string> = {
  items: Array<TabItem<T>>;
  active: T;
  onChange: (value: T) => void;
};

export function PremiumTabs<T extends string>({ items, active, onChange }: PremiumTabsProps<T>) {
  return (
    <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[rgba(46,50,64,0.7)] bg-[rgba(15,17,24,0.82)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <motion.button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            whileHover={vcarsMicroPresets.button.whileHover}
            whileTap={vcarsMicroPresets.button.whileTap}
            transition={vcarsMicroPresets.button.transition}
            className="relative rounded-full px-4 py-2 text-[12px] font-semibold whitespace-nowrap"
          >
            {isActive ? (
              <motion.span
                layoutId="vcars-tabs-active-pill"
                className="absolute inset-0 rounded-full border border-[rgba(47,126,232,0.55)] bg-[linear-gradient(145deg,rgba(47,126,232,0.32),rgba(26,109,212,0.24))] shadow-[0_4px_16px_rgba(47,126,232,0.22)]"
                transition={vcarsTransitions.component.base}
              />
            ) : null}
            <span className={`relative z-[1] ${isActive ? 'text-[#f0f4ff]' : 'text-[#8b92a6] hover:text-[#c4cad8]'}`}>{item.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
