'use client';

import { AnimatePresence } from 'framer-motion';
import { useCallback, useState } from 'react';
import { VcarsWheelLoader } from './VcarsWheelLoader';

export function InitialLoaderGate({ children }: { children: React.ReactNode }) {
  // Show splash on every full page load/reload.
  // This component lives in the root layout, so it won't re-run on client-side navigation.
  const [showLoader, setShowLoader] = useState(true);

  const handleComplete = useCallback(() => {
    setShowLoader(false);
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>{showLoader ? <VcarsWheelLoader onComplete={handleComplete} /> : null}</AnimatePresence>
    </>
  );
}
