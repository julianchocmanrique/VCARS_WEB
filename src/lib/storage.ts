export const SESSION_KEY = '@vcars_session';
export const PROFILE_KEY = '@vcars_profile';
export const ENTRIES_KEY = '@vcars_entries';
export const CURRENT_ENTRY_KEY = '@vcars_current_entry';
export const CLIENT_IDENTITY_KEY = '@vcars_client_identity';

export type Role = 'administrativo' | 'tecnico' | 'cliente';

export type Session = {
  userId?: string;
  username: string;
  role: Role;
  token?: string | null;
  createdAt: string;
};

export type Entry = {
  id: string;
  orderNumber?: string;
  placa: string;
  cliente?: string;
  nitCc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  vehiculo?: string;
  color?: string;
  empresa?: string;
  invoiceName?: string;
  paymentMethod?: 'contado' | 'credito' | '';
  creditDays?: string;
  fuelLevel?: string;
  receivedBy?: string;
  expectedDeliveryDate?: string;
  soatExpiry?: string;
  rtmExpiry?: string;
  wantsOldParts?: 'SI' | 'NO' | '';
  paso?: string;
  stepIndex?: number;
  status?: 'active' | 'done' | 'cancelled';
  fecha?: string;
  updatedAt?: string;
  backend?: {
    vehicleId?: string;
    entryId?: string | null;
  };
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getSession(): Session | null {
  return readJson<Session | null>(SESSION_KEY, null);
}

export function setSession(session: Session): void {
  writeJson(SESSION_KEY, session);
  writeJson(PROFILE_KEY, session.role);
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(CLIENT_IDENTITY_KEY);
}

export function getRole(): Role {
  const role = readJson<Role | null>(PROFILE_KEY, null);
  if (role === 'tecnico' || role === 'cliente') return role;
  return 'administrativo';
}

export function getEntries(): Entry[] {
  return readJson<Entry[]>(ENTRIES_KEY, []);
}

export function setEntries(entries: Entry[]): void {
  writeJson(ENTRIES_KEY, entries);
}

export function getCurrentEntry(): Entry | null {
  return readJson<Entry | null>(CURRENT_ENTRY_KEY, null);
}

export function setCurrentEntry(entry: Entry | null): void {
  if (typeof window === 'undefined') return;
  if (!entry) {
    window.localStorage.removeItem(CURRENT_ENTRY_KEY);
    return;
  }
  writeJson(CURRENT_ENTRY_KEY, entry);
}
