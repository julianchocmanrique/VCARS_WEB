'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession } from '@/lib/storage';

type ClientAccessGateProps = { children: React.ReactNode };

function isPublicRoute(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/design-system');
}

export function ClientAccessGate({ children }: ClientAccessGateProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const publicRoute = isPublicRoute(pathname);

  useEffect(() => {
    const refresh = () => {
      const valid = Boolean(getSession());
      setHasSession(valid);
      setChecked(true);
      if (!publicRoute && !valid) router.replace('/login');
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('vcars:session-expired', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('vcars:session-expired', refresh);
    };
  }, [publicRoute, router]);

  if (!publicRoute && (!checked || !hasSession)) {
    return <main className="vc-page" aria-busy="true" aria-label="Verificando sesión" />;
  }

  return <>{children}</>;
}
