import { describe, expect, it } from 'vitest';
import { canEditStep, getRoleSteps, isClientQuoteReady } from '../orderForms';

describe('permisos y cotización de la orden', () => {
  it('limita la edición a la responsabilidad de cada rol', () => {
    expect(canEditStep('administrativo', 'entrega')).toBe(true);
    expect(canEditStep('tecnico', 'cotizacion_formal')).toBe(false);
    expect(canEditStep('tecnico', 'trabajo')).toBe(true);
    expect(canEditStep('cliente', 'aprobacion')).toBe(true);
    expect(canEditStep('cliente', 'trabajo')).toBe(false);
  });

  it('oculta la cotización del cliente hasta que exista número o total', () => {
    expect(isClientQuoteReady({})).toBe(false);
    expect(getRoleSteps('cliente', {}).map((step) => step.key)).not.toContain('cotizacion_formal');

    const forms = { cotizacion_formal: { cotizacionNumero: 'COT-2026-001' } };
    expect(isClientQuoteReady(forms)).toBe(true);
    expect(getRoleSteps('cliente', forms).map((step) => step.key)).toContain('cotizacion_formal');
  });
});
