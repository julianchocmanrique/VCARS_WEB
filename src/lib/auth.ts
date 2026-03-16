import { clearSession, setSession, type Role, type Session } from './storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://187.124.65.93:4000';

export const DEMO_USERS = [
  { id: 'u_admin', username: 'admin', password: '1234', role: 'administrativo' as Role },
  { id: 'u_tech', username: 'tecnico', password: '1234', role: 'tecnico' as Role },
  { id: 'u_client', username: 'cliente', password: '1234', role: 'cliente' as Role },
];

function roleFromApi(role?: string): Role {
  if (role === 'TECH') return 'tecnico';
  if (role === 'CLIENT') return 'cliente';
  return 'administrativo';
}

export async function signIn(username: string, password: string): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '');

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
    return { ok: true, session };
  } catch {
    const demo = DEMO_USERS.find((item) => item.username === u);
    if (!demo) return { ok: false, error: 'No se pudo conectar al servidor' };
    if (demo.password !== p) return { ok: false, error: 'Contraseña incorrecta' };

    const session: Session = {
      userId: demo.id,
      username: demo.username,
      role: demo.role,
      token: null,
      createdAt: new Date().toISOString(),
    };

    setSession(session);
    return { ok: true, session };
  }
}

export function signOut(): void {
  clearSession();
}
