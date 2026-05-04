import { clearSession, getEntries, setCurrentEntry, setEntries, setSession, type Role, type Session } from './storage';
import { setClientIdentity } from './clientIdentity';
import { getApiBaseUrlCandidates } from './env';
const PERSONAL_CLIENT_PLATE = 'BCD246';

function roleFromApi(role?: string): Role {
  if (role === 'TECH') return 'tecnico';
  if (role === 'CLIENT') return 'cliente';
  return 'administrativo';
}

function companyByUser(username: string): string {
  const u = String(username || '').trim().toLowerCase();
  if (u === 'alcaldia@alcaldia.com') return 'alcaldia@alcaldia.com';
  if (u === 'congreso@gobierno.com') return 'congreso@gobierno.com';
  return '';
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
  }
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
