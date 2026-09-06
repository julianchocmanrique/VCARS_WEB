'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, type Session } from '@/lib/storage';
import { signOut } from '@/lib/auth';
import { flushPendingStepSyncs, getPendingSyncCount } from '@/lib/orderForms';

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
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const refreshSession = () => setSession(getSession());
    queueMicrotask(() => {
      refreshSession();
      setMounted(true);
    });
    window.addEventListener('storage', refreshSession);
    return () => window.removeEventListener('storage', refreshSession);
  }, []);

  useEffect(() => {
    function onSessionExpired() {
      setOpen(false);
      setSession(null);
      signOut();
      router.replace('/login');
    }
    window.addEventListener('vcars:session-expired', onSessionExpired);
    return () => window.removeEventListener('vcars:session-expired', onSessionExpired);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function syncPending() {
      setPendingSyncCount(getPendingSyncCount());
      await flushPendingStepSyncs();
      if (!cancelled) setPendingSyncCount(getPendingSyncCount());
    }
    function onOnline() { void syncPending(); }
    function onQueueChange() { setPendingSyncCount(getPendingSyncCount()); }
    void syncPending();
    window.addEventListener('online', onOnline);
    window.addEventListener('vcars:sync-queue-change', onQueueChange);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('vcars:sync-queue-change', onQueueChange);
    };
  }, []);

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
          {pendingSyncCount ? (
            <p className="vc-session-sync-status">{pendingSyncCount} cambio{pendingSyncCount === 1 ? '' : 's'} pendiente{pendingSyncCount === 1 ? '' : 's'} de sincronizar</p>
          ) : null}
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
