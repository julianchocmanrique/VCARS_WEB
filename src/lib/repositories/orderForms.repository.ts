import { readJsonStorage, writeJsonStorage } from '@/lib/persistence/jsonStore';

export const ORDER_FORMS_KEY = '@vcars_order_forms';

export type StepFieldMap = Record<string, string>;
export type FormsByStep = Record<string, StepFieldMap>;
export type FormsByPlate = Record<string, FormsByStep>;

export function normalizePlateKey(plate: string): string {
  return String(plate || '').trim().toUpperCase();
}

function sanitizeFieldValue(value: unknown): string {
  const text = String(value ?? '');
  if (text.startsWith('data:image/')) return '';
  return text;
}

function sanitizeFormsByPlate(input: FormsByPlate): { cleaned: FormsByPlate; changed: boolean } {
  let changed = false;
  const cleaned: FormsByPlate = {};
  for (const [plate, byStep] of Object.entries(input || {})) {
    const plateKey = normalizePlateKey(plate);
    if (!plateKey) continue;
    const nextByStep: FormsByStep = {};
    for (const [stepKey, fields] of Object.entries(byStep || {})) {
      const nextFields: StepFieldMap = {};
      for (const [fieldKey, value] of Object.entries(fields || {})) {
        const safe = sanitizeFieldValue(value);
        if (safe !== String(value ?? '')) changed = true;
        nextFields[fieldKey] = safe;
      }
      nextByStep[stepKey] = nextFields;
    }
    cleaned[plateKey] = nextByStep;
    if (plateKey !== plate) changed = true;
  }
  return { cleaned, changed };
}

export class LocalOrderFormsRepository {
  readAll(): FormsByPlate {
    const raw = readJsonStorage<FormsByPlate>(ORDER_FORMS_KEY, {});
    const { cleaned, changed } = sanitizeFormsByPlate(raw);
    if (changed) {
      // Best effort cleanup of stale oversized payloads (base64 images/signatures).
      writeJsonStorage(ORDER_FORMS_KEY, cleaned);
    }
    return cleaned;
  }

  writeAll(value: FormsByPlate): void {
    const { cleaned } = sanitizeFormsByPlate(value || {});
    writeJsonStorage(ORDER_FORMS_KEY, cleaned);
  }

  getPlateForms(plate: string): FormsByStep {
    const key = normalizePlateKey(plate);
    const all = this.readAll();
    return all[key] || {};
  }

  setStepField(plate: string, stepKey: string, fieldKey: string, value: string): FormsByStep {
    const key = normalizePlateKey(plate);
    const all = this.readAll();
    const byPlate = all[key] || {};
    const byStep = byPlate[stepKey] || {};
    const nextStep = { ...byStep, [fieldKey]: value };
    const nextPlate = { ...byPlate, [stepKey]: nextStep };
    const nextAll = { ...all, [key]: nextPlate };
    this.writeAll(nextAll);
    return nextPlate;
  }

  setStepFields(plate: string, stepKey: string, patch: Record<string, string>): FormsByStep {
    const key = normalizePlateKey(plate);
    const all = this.readAll();
    const byPlate = all[key] || {};
    const byStep = byPlate[stepKey] || {};
    const nextStep = { ...byStep, ...patch };
    const nextPlate = { ...byPlate, [stepKey]: nextStep };
    const nextAll = { ...all, [key]: nextPlate };
    this.writeAll(nextAll);
    return nextPlate;
  }
}

export const localOrderFormsRepository = new LocalOrderFormsRepository();
