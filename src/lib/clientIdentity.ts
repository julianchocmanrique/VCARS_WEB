import { CLIENT_IDENTITY_KEY } from './storage';

export type ClientIdentity = {
  type: 'personal' | 'empresa';
  name: string;
  companyName: string;
  plates: string[];
};

function normalizePlate(plate: string): string {
  return String(plate || '').trim().toUpperCase();
}

export function getClientIdentity(): ClientIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CLIENT_IDENTITY_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return {
      type: v?.type === 'empresa' ? 'empresa' : 'personal',
      name: String(v?.name || v?.companyName || ''),
      companyName: String(v?.companyName || v?.name || ''),
      plates: Array.isArray(v?.plates) ? v.plates.map(normalizePlate).filter(Boolean) : [],
    };
  } catch {
    return null;
  }
}

export function setClientIdentity(identity: Partial<ClientIdentity>): ClientIdentity {
  const safe: ClientIdentity = {
    type: identity.type === 'empresa' ? 'empresa' : 'personal',
    name: String(identity.name || identity.companyName || '').slice(0, 80),
    companyName: String(identity.companyName || identity.name || '').slice(0, 80),
    plates: Array.isArray(identity.plates)
      ? identity.plates.map(normalizePlate).filter(Boolean).slice(0, 40)
      : [],
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CLIENT_IDENTITY_KEY, JSON.stringify(safe));
  }

  return safe;
}

export function isEntryAllowed(identity: ClientIdentity | null, entry: { placa?: string; empresa?: string; companyName?: string }): boolean {
  if (!identity) return false;
  const plate = normalizePlate(entry.placa || '');
  if (identity.plates.includes(plate)) return true;

  if (identity.type === 'empresa') {
    const left = String(identity.companyName || identity.name || '').trim().toLowerCase();
    const right = String(entry.empresa || entry.companyName || '').trim().toLowerCase();
    return Boolean(left && right && left === right);
  }

  return false;
}
