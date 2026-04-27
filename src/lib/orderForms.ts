import type { Role } from './storage';
import { VCARS_PROCESS, type ProcessStep } from './process';
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

function scheduleStepSync(plate: string, stepKey: string, stepData: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  const key = `${normalizePlate(plate)}::${stepKey}`;
  const current = stepSyncTimers.get(key);
  if (current) clearTimeout(current);
  const timer = setTimeout(() => {
    stepSyncTimers.delete(key);
    void putStepDataToBackend(plate, stepKey, stepData).catch(() => {
      // silent fallback: local cache is already updated
    });
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
      const merged = { ...localPlate, ...remote };
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
