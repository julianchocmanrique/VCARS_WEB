import { getSession } from '@/lib/storage';
import type { FormsByStep } from '@/lib/repositories/orderForms.repository';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://187.124.65.93:4000';

function joinUrl(base: string, path: string): string {
  return `${String(base).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;
}

function authHeaders(): Record<string, string> {
  const session = getSession();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
  };
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok || json?.ok === false) {
    throw new Error(typeof json?.error === 'string' ? json.error : `HTTP ${res.status}`);
  }
  return json as T;
}

export async function fetchFormsByPlateFromBackend(plate: string): Promise<FormsByStep> {
  const p = String(plate || '').trim().toUpperCase();
  if (!p) return {};
  const res = await fetch(joinUrl(API_URL, `service-orders/${encodeURIComponent(p)}/forms`), {
    method: 'GET',
    headers: authHeaders(),
    cache: 'no-store',
  });
  const json = await parseJsonOrThrow<{ ok: true; formsByStep?: FormsByStep }>(res);
  return json.formsByStep || {};
}

export async function putFormsByPlateToBackend(plate: string, formsByStep: FormsByStep): Promise<void> {
  const p = String(plate || '').trim().toUpperCase();
  if (!p) return;
  const res = await fetch(joinUrl(API_URL, `service-orders/${encodeURIComponent(p)}/forms`), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ formsByStep }),
    cache: 'no-store',
  });
  await parseJsonOrThrow(res);
}

export async function putStepDataToBackend(plate: string, stepKey: string, stepData: Record<string, string>): Promise<void> {
  const p = String(plate || '').trim().toUpperCase();
  if (!p || !stepKey) return;
  const res = await fetch(joinUrl(API_URL, `service-orders/${encodeURIComponent(p)}/forms/${encodeURIComponent(stepKey)}`), {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ stepData }),
    cache: 'no-store',
  });
  await parseJsonOrThrow(res);
}
