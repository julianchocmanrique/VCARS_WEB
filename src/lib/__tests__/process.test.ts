import { describe, expect, it } from 'vitest';
import { getVisibleSteps, normalizeStepTitle, stepIndexFromTitle } from '../process';

describe('proceso VCARS', () => {
  it('normaliza los nombres heredados y conserva el índice correcto', () => {
    expect(normalizeStepTitle('Recepción (Ingreso)')).toBe('Orden de servicio');
    expect(normalizeStepTitle('Cotizacion')).toBe('Cotización al cliente (Admin)');
    expect(stepIndexFromTitle('Ejecucion en taller')).toBe(4);
  });

  it('muestra únicamente los pasos autorizados para cada rol', () => {
    expect(getVisibleSteps('administrativo')).toHaveLength(6);
    expect(getVisibleSteps('tecnico').map((step) => step.key)).toEqual([
      'recepcion',
      'cotizacion_interna',
      'trabajo',
    ]);
    expect(getVisibleSteps('cliente').map((step) => step.key)).toEqual([
      'recepcion',
      'cotizacion_formal',
      'aprobacion',
      'trabajo',
      'entrega',
    ]);
  });
});
