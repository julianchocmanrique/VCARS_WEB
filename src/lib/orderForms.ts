import type { Role } from './storage';
import { getDemoFormsByPlate, getDemoVehicleColorByPlate, getDemoVehicleModelByPlate } from './demoData';
import { getVehicleEvidencePhoto } from './carPhoto';
import { VCARS_PROCESS, type ProcessStep } from './process';

const ORDER_FORMS_KEY = '@vcars_order_forms';

type FormsByStep = Record<string, Record<string, string>>;
type FormsByPlate = Record<string, FormsByStep>;

function normalizePlate(plate: string): string {
  return String(plate || '').trim().toUpperCase();
}

function readAll(): FormsByPlate {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ORDER_FORMS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FormsByPlate;
  } catch {
    return {};
  }
}

function writeAll(value: FormsByPlate): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ORDER_FORMS_KEY, JSON.stringify(value));
}

function mergeDemoForms(existing: FormsByPlate, demo: FormsByPlate): FormsByPlate {
  const merged: FormsByPlate = { ...(existing || {}) };
  for (const [plate, demoForms] of Object.entries(demo || {})) {
    const existingForms = merged[plate] || {};
    const nextByStep: FormsByStep = { ...demoForms };
    for (const [stepKey, existingStep] of Object.entries(existingForms)) {
      nextByStep[stepKey] = { ...(demoForms?.[stepKey] || {}), ...(existingStep || {}) };
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
  const existing = readAll();
  const demo = getDemoFormsByPlate();
  const merged = mergeDemoForms(existing, demo);
  const migrated = migrateLegacyDemoPhotoFields(merged);
  writeAll(migrated);
  return migrated;
}

export function getFormsForPlate(plate: string): FormsByStep {
  const key = normalizePlate(plate);
  const all = ensureDemoFormsSeed();
  return all[key] || {};
}

export function setStepField(plate: string, stepKey: string, fieldKey: string, value: string): FormsByStep {
  const key = normalizePlate(plate);
  const all = readAll();
  const byPlate = all[key] || {};
  const byStep = byPlate[stepKey] || {};
  const nextStep = { ...byStep, [fieldKey]: value };
  const nextPlate = { ...byPlate, [stepKey]: nextStep };
  const nextAll = { ...all, [key]: nextPlate };
  writeAll(nextAll);
  return nextPlate;
}

export function setStepFields(plate: string, stepKey: string, patch: Record<string, string>): FormsByStep {
  const key = normalizePlate(plate);
  const all = readAll();
  const byPlate = all[key] || {};
  const byStep = byPlate[stepKey] || {};
  const nextStep = { ...byStep, ...patch };
  const nextPlate = { ...byPlate, [stepKey]: nextStep };
  const nextAll = { ...all, [key]: nextPlate };
  writeAll(nextAll);
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
