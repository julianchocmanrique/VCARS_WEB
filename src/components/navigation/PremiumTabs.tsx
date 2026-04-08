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
    <div className="inline-flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full border border-[rgba(58,61,66,0.82)] bg-[linear-gradient(180deg,rgba(18,18,20,0.86),rgba(11,11,12,0.84))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
            className="relative rounded-full px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap"
          >
            {isActive ? (
              <motion.span
                layoutId="vcars-tabs-active-pill"
                className="absolute inset-0 rounded-full border border-[rgba(31,95,159,0.52)] bg-[linear-gradient(180deg,rgba(31,95,159,0.34),rgba(23,79,134,0.28))] shadow-[0_6px_14px_rgba(31,95,159,0.2)]"
                transition={vcarsTransitions.component.base}
              />
            ) : null}
            <span className={`relative z-[1] ${isActive ? 'text-[#f5f5f5]' : 'text-[#9ca3af]'}`}>{item.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
