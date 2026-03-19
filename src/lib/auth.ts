import { getDemoEntries } from './demoData';
import { clearSession, getEntries, setCurrentEntry, setEntries, setSession, type Role, type Session } from './storage';
import { setClientIdentity } from './clientIdentity';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://187.124.65.93:4000';

export const DEMO_USERS = [
  { id: 'u_admin_david', username: 'david@vcars.com', password: '1111', role: 'administrativo' as Role },
  { id: 'u_tech_julian', username: 'julian@vcars.com', password: '2222', role: 'tecnico' as Role },
  { id: 'u_client_congreso', username: 'congreso@gobierno.com', password: '3333', role: 'cliente' as Role },
  { id: 'u_client_alcaldia', username: 'alcaldia@alcaldia.com', password: '4444', role: 'cliente' as Role },
];

function roleFromApi(role?: string): Role {
  if (role === 'TECH') return 'tecnico';
  if (role === 'CLIENT') return 'cliente';
  return 'administrativo';
}

function companyByUser(username: string): string {
  const u = String(username || '').trim().toLowerCase();
  if (u === 'alcaldia@alcaldia.com') return 'alcaldia@alcaldia.com';
  return 'congreso@gobierno.com';
}

function applyClientIdentity(username: string): void {
  const u = String(username || '').trim().toLowerCase();
  if (u === 'congreso@gobierno.com') {
    setClientIdentity({
      type: 'empresa',
      name: 'Congreso',
      companyName: 'congreso@gobierno.com',
      plates: [],
    });
  } else if (u === 'alcaldia@alcaldia.com') {
    setClientIdentity({
      type: 'empresa',
      name: 'Alcaldia',
      companyName: 'alcaldia@alcaldia.com',
      plates: [],
    });
  }
}

function ensureDemoEntriesFor(session: Session): void {
  const local = getEntries();
  const list = local.length ? local : getDemoEntries();
  if (!local.length) setEntries(list);

  let current = list[0] || null;
  if (session.role === 'cliente') {
    const company = companyByUser(session.username);
    current = list.find((item) => String(item.empresa || '').toLowerCase() === company) || list[0] || null;
  }

  setCurrentEntry(current);
}

function createLocalSession(demo: (typeof DEMO_USERS)[number]): Session {
  return {
    userId: demo.id,
    username: demo.username,
    role: demo.role,
    token: null,
    createdAt: new Date().toISOString(),
  };
}

export async function signIn(username: string, password: string): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '');
  const demo = DEMO_USERS.find((item) => item.username === u);

  try {
    const res = await fetch(`${String(API_URL).replace(/\/+$/, '')}/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: u, password: p }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      if (demo && demo.password === p) {
        const localSession = createLocalSession(demo);
        setSession(localSession);
        if (localSession.role === 'cliente') applyClientIdentity(localSession.username);
        ensureDemoEntriesFor(localSession);
        return { ok: true, session: localSession };
      }
      return { ok: false, error: json?.error || 'No se pudo iniciar sesión' };
    }

    const session: Session = {
      userId: json.user?.id,
      username: json.user?.username || u,
      role: roleFromApi(json.user?.role),
      token: json.token,
      createdAt: new Date().toISOString(),
    };

    setSession(session);
    if (session.role === 'cliente') applyClientIdentity(session.username);
    ensureDemoEntriesFor(session);
    return { ok: true, session };
  } catch {
    if (!demo) return { ok: false, error: 'No se pudo conectar al servidor' };
    if (demo.password !== p) return { ok: false, error: 'Contraseña incorrecta' };

    const session = createLocalSession(demo);
    setSession(session);
    if (session.role === 'cliente') applyClientIdentity(session.username);
    ensureDemoEntriesFor(session);
    return { ok: true, session };
  }
}

export function signOut(): void {
  clearSession();
}
