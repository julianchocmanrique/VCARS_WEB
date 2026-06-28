'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, type Session } from '@/lib/storage';
import { signOut } from '@/lib/auth';

const ROLE_LABEL: Record<string, string> = {
  administrativo: 'Administrativo',
  tecnico: 'Técnico',
  cliente: 'Cliente',
};

function shouldHide(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/login');
}

export function SessionControl() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    setMounted(true);
    setSessionState(getSession());
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (!mounted || shouldHide(pathname)) return null;

  const roleLabel = session ? ROLE_LABEL[session.role] || session.role : 'Sin sesión';
  const username = session?.username || 'Ingresar';

  function goLogin() {
    setOpen(false);
    signOut();
    setSessionState(null);
    router.replace('/login');
  }

  return (
    <div ref={rootRef} className="vc-session-control">
      <button
        type="button"
        className="vc-session-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="vc-session-dot" aria-hidden="true" />
        <span className="vc-session-text">
          <strong>{roleLabel}</strong>
          <small>{username}</small>
        </span>
      </button>

      {open ? (
        <div className="vc-session-menu" role="menu">
          <div className="vc-session-menu-head">
            <span>Sesión activa</span>
            <strong>{roleLabel}</strong>
          </div>
          <button type="button" role="menuitem" onClick={goLogin}>
            Cambiar usuario
          </button>
          <button type="button" role="menuitem" onClick={goLogin}>
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
