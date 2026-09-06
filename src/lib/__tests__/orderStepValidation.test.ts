import { describe, expect, it } from 'vitest';
import { getMissingRequiredFields } from '../orderStepValidation';

describe('validación de recepción', () => {
  it('solicita cada ángulo de evidencia y su confirmación', () => {
    const missing = getMissingRequiredFields('recepcion', { recepcion: {} });

    expect(missing).toContain('Foto Superior');
    expect(missing).toContain('Validación foto Frontal');
    expect(missing).toContain('Foto Trasero');
  });

  it('nombra correctamente el elemento de inventario lavavidrios', () => {
    const missing = getMissingRequiredFields('recepcion', { recepcion: {} });

    expect(missing).toContain('Inventario: Lavavidrios');
    expect(missing).not.toContain('Inventario: Llavero');
  });

  it('exige días de crédito solo cuando corresponde al método de pago', () => {
    const credit = { recepcion: { entry_paymentMethod: 'credito' } };
    expect(getMissingRequiredFields('recepcion', credit)).toContain('Días crédito');

    const withDays = { recepcion: { entry_paymentMethod: 'credito', entry_creditDays: '30' } };
    expect(getMissingRequiredFields('recepcion', withDays)).not.toContain('Días crédito');
  });
});
