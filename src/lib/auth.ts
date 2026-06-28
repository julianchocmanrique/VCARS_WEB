import { clearSession, setCurrentEntry, setEntries, setSession, type Role, type Session } from './storage';
import { setClientIdentity } from './clientIdentity';
import { getApiBaseUrlCandidates } from './env';
const PERSONAL_CLIENT_PLATE = 'BCD246';

type LoginUser = {
  id?: string;
  username?: string;
  role?: string;
};

type LoginPayload = {
  ok?: boolean;
  token?: string;
  accessToken?: string;
  user?: LoginUser;
  data?: {
    token?: string;
    accessToken?: string;
    user?: LoginUser;
  };
  error?: string;
};

function roleFromApi(role?: string): Role {
  if (role === 'TECH') return 'tecnico';
  if (role === 'CLIENT') return 'cliente';
  return 'administrativo';
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
  } else if (u === 'juli@gm.com') {
    setClientIdentity({
      type: 'personal',
      name: 'Juli',
      companyName: 'Juli',
      plates: [PERSONAL_CLIENT_PLATE],
    });
  } else if (u === 'cliente') {
    setClientIdentity({
      type: 'empresa',
      name: 'Cliente demo',
      companyName: 'congreso@gobierno.com',
      plates: [],
    });
  }
}

function pickToken(payload: LoginPayload | null): string {
  return String(
    payload?.token ||
    payload?.accessToken ||
    payload?.data?.token ||
    payload?.data?.accessToken ||
    '',
  ).trim();
}

function pickUser(payload: LoginPayload | null): LoginUser | null {
  return payload?.user || payload?.data?.user || null;
}

export async function signIn(username: string, password: string): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '');

  try {
    const bases = getApiBaseUrlCandidates();
    let res: Response | null = null;
    for (const base of bases) {
      try {
        res = await fetch(`${String(base).replace(/\/+$/, '')}/auth/login`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: u, password: p }),
        });
        break;
      } catch {
        // Try next base URL candidate.
      }
    }
    if (!res) throw new Error('No se pudo conectar al servidor');

    const json = await res.json().catch(() => null) as LoginPayload | null;
    if (!res.ok || !json?.ok) {
      return { ok: false, error: json?.error || 'No se pudo iniciar sesión' };
    }

    const user = pickUser(json);
    const token = pickToken(json);
    if (!token) {
      return { ok: false, error: 'Login sin token válido. Vuelve a iniciar sesión.' };
    }

    const session: Session = {
      userId: user?.id,
      username: user?.username || u,
      role: roleFromApi(user?.role),
      token,
      createdAt: new Date().toISOString(),
    };

    setSession(session);
    setEntries([]);
    setCurrentEntry(null);
    if (session.role === 'cliente') applyClientIdentity(session.username);
    return { ok: true, session };
  } catch {
    return { ok: false, error: 'No se pudo conectar al servidor' };
  }
}

export function signOut(): void {
  clearSession();
}
