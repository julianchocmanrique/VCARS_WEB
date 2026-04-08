'use client';

import { AnimatePresence } from 'framer-motion';
import { useCallback, useState } from 'react';
import { VcarsWheelLoader } from './VcarsWheelLoader';

export function InitialLoaderGate({ children }: { children: React.ReactNode }) {
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
