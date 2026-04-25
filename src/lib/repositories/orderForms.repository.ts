import { readJsonStorage, writeJsonStorage } from '@/lib/persistence/jsonStore';

export const ORDER_FORMS_KEY = '@vcars_order_forms';

export type StepFieldMap = Record<string, string>;
export type FormsByStep = Record<string, StepFieldMap>;
export type FormsByPlate = Record<string, FormsByStep>;

export function normalizePlateKey(plate: string): string {
  return String(plate || '').trim().toUpperCase();
}

export class LocalOrderFormsRepository {
  readAll(): FormsByPlate {
    return readJsonStorage<FormsByPlate>(ORDER_FORMS_KEY, {});
  }

  writeAll(value: FormsByPlate): void {
    writeJsonStorage(ORDER_FORMS_KEY, value);
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
