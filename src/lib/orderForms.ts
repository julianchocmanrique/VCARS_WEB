import type { Role } from './storage';
import { getDemoFormsByPlate, getDemoVehicleColorByPlate, getDemoVehicleModelByPlate } from './demoData';
import { getVehicleEvidencePhoto } from './carPhoto';
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

function mergeDemoForms(existing: FormsByPlate, demo: FormsByPlate): FormsByPlate {
  const merged: FormsByPlate = { ...(existing || {}) };
  for (const [plate, demoForms] of Object.entries(demo || {})) {
    const existingForms = merged[plate] || {};
    const nextByStep: FormsByStep = { ...demoForms };
    for (const [stepKey, existingStep] of Object.entries(existingForms)) {
      const demoStep = demoForms?.[stepKey] || {};
      const incomingStep = existingStep || {};
      const mergedStep: Record<string, string> = { ...demoStep };
      for (const [fieldKey, existingValueRaw] of Object.entries(incomingStep)) {
        const existingValue = String(existingValueRaw ?? '');
        const demoValue = String(demoStep[fieldKey] ?? '');
        mergedStep[fieldKey] = existingValue.trim().length > 0 ? existingValue : demoValue;
      }
      nextByStep[stepKey] = mergedStep;
    }
    merged[plate] = nextByStep;
  }
  return merged;
}

function migrateLegacyDemoPhotoFields(all: FormsByPlate): FormsByPlate {
  const next: FormsByPlate = { ...all };
  const zoneByKey = {
    photo_superior: 'superior',
    photo_inferior: 'inferior',
    photo_lateralDerecho: 'lateralDerecho',
    photo_lateralIzquierdo: 'lateralIzquierdo',
    photo_frontal: 'frontal',
    photo_trasero: 'trasero',
  } as const;

  for (const plate of Object.keys(next)) {
    const model = getDemoVehicleModelByPlate(plate);
    if (!model) continue;

    const color = getDemoVehicleColorByPlate(plate);
    const byPlate = next[plate] || {};
    const recepcion = { ...(byPlate.recepcion || {}) };
    let changed = false;

    for (const [key, zone] of Object.entries(zoneByKey)) {
      const current = String(recepcion[key] || '').trim();
      const expected = getVehicleEvidencePhoto(model, plate, color, zone);
      if (!current || current !== expected || current.includes('picsum.photos') || current.includes('source.unsplash.com')) {
        recepcion[key] = expected;
        changed = true;
      }
    }

    if (changed) {
      next[plate] = { ...byPlate, recepcion };
    }
  }

  return next;
}

export function ensureDemoFormsSeed(): FormsByPlate {
  const existing = localOrderFormsRepository.readAll();
  const demo = getDemoFormsByPlate();
  const merged = mergeDemoForms(existing, demo);
  const migrated = migrateLegacyDemoPhotoFields(merged);
  localOrderFormsRepository.writeAll(migrated);
  return migrated;
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
