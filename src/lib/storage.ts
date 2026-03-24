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
  intakePhotos?: string[];
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

function normalizeEntry(value: unknown): Entry | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const placa = String(v.placa || '').trim().toUpperCase();
  if (!placa) return null;

  const statusRaw = String(v.status || 'active');
  const status: Entry['status'] = statusRaw === 'done' || statusRaw === 'cancelled' ? statusRaw : 'active';

  return {
    id: String(v.id || `entry-${placa}`),
    orderNumber: String(v.orderNumber || ''),
    placa,
    cliente: String(v.cliente || ''),
    nitCc: String(v.nitCc || ''),
    direccion: String(v.direccion || ''),
    telefono: String(v.telefono || ''),
    email: String(v.email || ''),
    vehiculo: String(v.vehiculo || ''),
    color: String(v.color || ''),
    empresa: String(v.empresa || ''),
    invoiceName: String(v.invoiceName || ''),
    paymentMethod: (v.paymentMethod === 'contado' || v.paymentMethod === 'credito') ? v.paymentMethod : '',
    creditDays: String(v.creditDays || ''),
    fuelLevel: String(v.fuelLevel || ''),
    receivedBy: String(v.receivedBy || ''),
    expectedDeliveryDate: String(v.expectedDeliveryDate || ''),
    soatExpiry: String(v.soatExpiry || ''),
    rtmExpiry: String(v.rtmExpiry || ''),
    wantsOldParts: (v.wantsOldParts === 'SI' || v.wantsOldParts === 'NO') ? v.wantsOldParts : '',
    intakePhotos: Array.isArray(v.intakePhotos)
      ? v.intakePhotos.map((x) => String(x || '')).filter(Boolean).slice(0, 6)
      : [],
    paso: String(v.paso || ''),
    stepIndex: Number.isFinite(Number(v.stepIndex)) ? Number(v.stepIndex) : 0,
    status,
    fecha: String(v.fecha || ''),
    updatedAt: String(v.updatedAt || ''),
    backend: v.backend && typeof v.backend === 'object'
      ? {
          vehicleId: String((v.backend as Record<string, unknown>).vehicleId || ''),
          entryId: String((v.backend as Record<string, unknown>).entryId || ''),
        }
      : undefined,
  };
}

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
  const raw = readJson<unknown>(ENTRIES_KEY, []);
  if (!Array.isArray(raw)) return [];
  const clean = raw.map(normalizeEntry).filter(Boolean) as Entry[];
  return clean;
}

export function setEntries(entries: Entry[]): void {
  writeJson(ENTRIES_KEY, entries);
}

export function getCurrentEntry(): Entry | null {
  const raw = readJson<unknown>(CURRENT_ENTRY_KEY, null);
  return normalizeEntry(raw);
}

export function setCurrentEntry(entry: Entry | null): void {
  if (typeof window === 'undefined') return;
  if (!entry) {
    window.localStorage.removeItem(CURRENT_ENTRY_KEY);
    return;
  }
  writeJson(CURRENT_ENTRY_KEY, entry);
}
