'use client';

import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { VcarsWheelLoader } from './VcarsWheelLoader';

const STORAGE_KEY = 'vcars.initialLoader.shown';

export function InitialLoaderGate({ children }: { children: React.ReactNode }) {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    // Show loader only the first time the app is opened in this browser session.
    // (Avoid re-appearing on route changes.)
    try {
      const already = sessionStorage.getItem(STORAGE_KEY);
      if (!already) setShowLoader(true);
    } catch {
      // If storage is unavailable, show it once.
      setShowLoader(true);
    }
  }, []);

  const handleComplete = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setShowLoader(false);
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>{showLoader ? <VcarsWheelLoader onComplete={handleComplete} /> : null}</AnimatePresence>
    </>
  );
}
