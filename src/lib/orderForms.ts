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

function normalizePlate(plate: string): string {
  return normalizePlateKey(plate);
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

export function setStepField(plate: string, stepKey: string, fieldKey: string, value: string): FormsByStep {
  return localOrderFormsRepository.setStepField(plate, stepKey, fieldKey, value);
}

export function setStepFields(plate: string, stepKey: string, patch: Record<string, string>): FormsByStep {
  return localOrderFormsRepository.setStepFields(plate, stepKey, patch);
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
