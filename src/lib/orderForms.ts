import type { Role } from './storage';
import { VCARS_PROCESS, type ProcessStep } from './process';
import { readJsonStorage, writeJsonStorage } from '@/lib/persistence/jsonStore';
import {
  localOrderFormsRepository,
  normalizePlateKey,
  type FormsByPlate,
  type FormsByStep,
} from '@/lib/repositories/orderForms.repository';
import {
  fetchFormsByPlateFromBackend,
  putFormsByPlateToBackend,
  putStepDataToBackend,
} from '@/lib/orderFormsBackend';

function normalizePlate(plate: string): string {
  return normalizePlateKey(plate);
}

const stepSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();
const PENDING_STEP_SYNC_KEY = '@vcars_pending_step_sync';

type PendingStepSync = {
  plate: string;
  stepKey: string;
  updatedAt: string;
};

function syncId(plate: string, stepKey: string): string {
  return `${normalizePlate(plate)}::${stepKey}`;
}

function readPendingStepSyncs(): PendingStepSync[] {
  const value = readJsonStorage<unknown>(PENDING_STEP_SYNC_KEY, []);
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      plate: normalizePlate(String((item as PendingStepSync)?.plate || '')),
      stepKey: String((item as PendingStepSync)?.stepKey || '').trim(),
      updatedAt: String((item as PendingStepSync)?.updatedAt || ''),
    }))
    .filter((item) => Boolean(item.plate && item.stepKey));
}

function notifySyncQueueChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('vcars:sync-queue-change'));
}

function writePendingStepSyncs(items: PendingStepSync[]): void {
  writeJsonStorage(PENDING_STEP_SYNC_KEY, items);
  notifySyncQueueChange();
}

function markStepPending(plate: string, stepKey: string): void {
  const item: PendingStepSync = { plate: normalizePlate(plate), stepKey, updatedAt: new Date().toISOString() };
  const current = readPendingStepSyncs().filter((entry) => syncId(entry.plate, entry.stepKey) !== syncId(item.plate, item.stepKey));
  writePendingStepSyncs([...current, item]);
}

function clearStepPending(plate: string, stepKey: string): void {
  const next = readPendingStepSyncs().filter((entry) => syncId(entry.plate, entry.stepKey) !== syncId(plate, stepKey));
  writePendingStepSyncs(next);
}

export function getPendingSyncCount(): number {
  return readPendingStepSyncs().length;
}

let pendingFlush: Promise<number> | null = null;

export function flushPendingStepSyncs(): Promise<number> {
  if (pendingFlush) return pendingFlush;
  pendingFlush = (async () => {
    const pending = readPendingStepSyncs();
    const remaining: PendingStepSync[] = [];
    let synced = 0;
    for (const item of pending) {
      const forms = localOrderFormsRepository.getPlateForms(item.plate);
      const stepData = forms[item.stepKey];
      if (!stepData) continue;
      try {
        await putStepDataToBackend(item.plate, item.stepKey, stepData);
        synced += 1;
      } catch {
        remaining.push(item);
      }
    }
    writePendingStepSyncs(remaining);
    return synced;
  })().finally(() => {
    pendingFlush = null;
  });
  return pendingFlush;
}

function mergeFormsByStep(local: FormsByStep, remote: FormsByStep): FormsByStep {
  const stepKeys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
  return Array.from(stepKeys).reduce<FormsByStep>((result, stepKey) => {
    result[stepKey] = {
      ...(local[stepKey] || {}),
      ...(remote[stepKey] || {}),
    };
    return result;
  }, {});
}

function scheduleStepSync(plate: string, stepKey: string, stepData: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  const key = `${normalizePlate(plate)}::${stepKey}`;
  const current = stepSyncTimers.get(key);
  if (current) clearTimeout(current);
  const timer = setTimeout(() => {
    stepSyncTimers.delete(key);
    void putStepDataToBackend(plate, stepKey, stepData)
      .then(() => clearStepPending(plate, stepKey))
      .catch(() => markStepPending(plate, stepKey));
  }, 240);
  stepSyncTimers.set(key, timer);
}

export function ensureDemoFormsSeed(): FormsByPlate {
  const existing = localOrderFormsRepository.readAll();
  const cleaned: FormsByPlate = {};
  for (const [plate, byStep] of Object.entries(existing || {})) {
    const key = normalizePlate(plate);
    if (!key) continue;
    cleaned[key] = byStep as FormsByStep;
  }
  localOrderFormsRepository.writeAll(cleaned);
  return cleaned;
}

export function getFormsForPlate(plate: string): FormsByStep {
  const key = normalizePlate(plate);
  const all = ensureDemoFormsSeed();
  return all[key] || {};
}

export async function hydrateFormsForPlate(plate: string): Promise<FormsByStep> {
  const key = normalizePlate(plate);
  if (!key) return {};
  const localAll = ensureDemoFormsSeed();
  const localPlate = localAll[key] || {};
  try {
    const remote = await fetchFormsByPlateFromBackend(key);
    if (Object.keys(remote).length > 0) {
      const merged = mergeFormsByStep(localPlate, remote);
      localOrderFormsRepository.writeAll({
        ...localAll,
        [key]: merged,
      });
      return merged;
    }

    if (Object.keys(localPlate).length > 0) {
      void putFormsByPlateToBackend(key, localPlate).catch(() => {
        // keep local fallback
      });
    }
    return localPlate;
  } catch {
    return localPlate;
  }
}

export function setStepField(plate: string, stepKey: string, fieldKey: string, value: string): FormsByStep {
  const nextPlate = localOrderFormsRepository.setStepField(plate, stepKey, fieldKey, value);
  scheduleStepSync(plate, stepKey, nextPlate[stepKey] || {});
  return nextPlate;
}

export function setStepFields(plate: string, stepKey: string, patch: Record<string, string>): FormsByStep {
  const nextPlate = localOrderFormsRepository.setStepFields(plate, stepKey, patch);
  scheduleStepSync(plate, stepKey, nextPlate[stepKey] || {});
  return nextPlate;
}

export function isClientQuoteReady(formsByStep: FormsByStep): boolean {
  const quote = formsByStep.cotizacion_formal || {};
  const total = String(quote.cotizacionTotal || '').trim();
  const number = String(quote.cotizacionNumero || '').trim();
  return Boolean(total || number);
}

export function canEditStep(role: Role, stepKey: string): boolean {
  if (role === 'administrativo') return true;
  if (role === 'tecnico') return stepKey !== 'cotizacion_formal' && stepKey !== 'entrega';
  if (role === 'cliente') return stepKey === 'aprobacion';
  return false;
}

export function getRoleSteps(role: Role, formsByStep: FormsByStep): Array<ProcessStep & { index: number }> {
  const quoteReady = isClientQuoteReady(formsByStep);
  return VCARS_PROCESS.map((step, index) => ({ ...step, index }))
    .filter((step) => {
      if (!step.visibleRoles.includes(role)) return false;
      if (role === 'cliente' && step.key === 'cotizacion_formal') return quoteReady;
      return true;
    });
}
