import { getSession } from './storage';
import { getApiBaseUrl } from './env';

const API_URL = getApiBaseUrl();

function joinUrl(base: string, path: string): string {
  return `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const res = await fetch(joinUrl(API_URL, path), {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { ok: false, error: text || 'Respuesta no-JSON del servidor' };
  }

  if (!res.ok || json?.ok === false) {
    const message = typeof json?.error === 'string' ? json.error : `Error HTTP ${res.status}`;
    const error = new Error(message) as Error & {
      status?: number;
      payload?: unknown;
    };
    error.status = res.status;
    error.payload = json;
    throw error;
  }

  return json as T;
}

export type ApiVehicle = {
  id: string;
  plate: string;
  model?: string;
  color?: string;
  brand?: string;
  customer?: { name?: string; phone?: string };
  entries?: Array<{ id: string; createdAt?: string }>;
  createdAt?: string;
  updatedAt?: string;
};

export async function listVehicles(params: { take?: number; plate?: string } = {}): Promise<ApiVehicle[]> {
  const q = buildQuery({ take: params.take ?? 50, plate: params.plate });
  const json = await apiFetch<{ vehicles: ApiVehicle[] }>(`vehicles${q}`);
  return json.vehicles || [];
}

export async function getVehicleByPlate(plate: string): Promise<ApiVehicle> {
  const p = String(plate || '').trim().toUpperCase();
  const json = await apiFetch<{ vehicle: ApiVehicle }>(`vehicles/${encodeURIComponent(p)}`);
  return json.vehicle;
}

export async function createCustomer(payload: { name: string; email?: string; phone?: string }) {
  const json = await apiFetch<{ customer: { id: string } }>('customers', {
    method: 'POST',
    body: JSON.stringify({ name: payload.name, email: payload.email || '', phone: payload.phone || '' }),
  });
  return json.customer;
}

export async function createVehicle(payload: {
  plate: string;
  brand?: string;
  model?: string;
  color?: string;
  year?: string;
  customer: { name: string; email?: string; phone?: string };
}) {
  const json = await apiFetch<{ vehicle: ApiVehicle }>('vehicles', {
    method: 'POST',
    body: JSON.stringify({
      plate: payload.plate,
      brand: payload.brand || '',
      model: payload.model || '',
      color: payload.color || '',
      year: payload.year || '',
      customer: payload.customer,
    }),
  });
  return json.vehicle;
}

export async function createEntry(payload: {
  vehicleId: string;
  receivedBy?: string;
  notes?: string;
  mileageKm?: number;
  fuelLevel?: string;
}) {
  const json = await apiFetch<{ entry: { id: string } }>(`vehicles/${payload.vehicleId}/entries`, {
    method: 'POST',
    body: JSON.stringify({
      receivedBy: payload.receivedBy || '',
      notes: payload.notes || '',
      mileageKm: typeof payload.mileageKm === 'number' ? payload.mileageKm : undefined,
      fuelLevel: payload.fuelLevel || '',
    }),
  });
  return json.entry;
}

export async function createIngreso(payload: {
  plate: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  receivedBy?: string;
  notes?: string;
  mileageKm?: number;
  fuelLevel?: string;
}) {
  const vehicle = await createVehicle({
    plate: payload.plate,
    model: payload.vehicleModel || '',
    color: payload.vehicleColor || '',
    customer: {
      name: payload.customerName,
      phone: payload.customerPhone || '',
      email: payload.customerEmail || '',
    },
  });

  const entry = await createEntry({
    vehicleId: vehicle.id,
    receivedBy: payload.receivedBy || '',
    notes: payload.notes || '',
    mileageKm: typeof payload.mileageKm === 'number' ? payload.mileageKm : undefined,
    fuelLevel: payload.fuelLevel || '',
  });

  return { vehicle, entry };
}
