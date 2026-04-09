'use client';

// NOTE: We intentionally keep this shell extremely stable.
// Some mobile/desktop browsers can show blank screens when combining:
// - route changes (Next App Router)
// - framer-motion AnimatePresence keyed by pathname
// - CSS filters / heavy animations
//
// If you want transitions later, re-introduce them carefully behind a feature flag.

type PageTransitionShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageTransitionShell({ children, className }: PageTransitionShellProps) {
  return <div className={className}>{children}</div>;
}
