import type { Role } from './storage';

const ADMIN: Role = 'administrativo';
const TECH: Role = 'tecnico';
const CLIENT: Role = 'cliente';

export type ProcessStep = {
  key: string;
  title: string;
  visibleRoles: Role[];
};

export const VCARS_PROCESS: ProcessStep[] = [
  {
    key: 'recepcion',
    title: 'Orden de servicio',
    visibleRoles: [ADMIN, TECH, CLIENT],
  },
  {
    key: 'cotizacion_interna',
    title: 'Diagnóstico / Cotización interna',
    visibleRoles: [ADMIN, TECH],
  },
  {
    key: 'cotizacion_formal',
    title: 'Cotización al cliente (Admin)',
    visibleRoles: [ADMIN, CLIENT],
  },
  {
    key: 'aprobacion',
    title: 'Autorización del cliente',
    visibleRoles: [ADMIN, CLIENT],
  },
  {
    key: 'trabajo',
    title: 'Ejecución (Taller)',
    visibleRoles: [ADMIN, TECH, CLIENT],
  },
  {
    key: 'entrega',
    title: 'Entrega / Cierre (Admin)',
    visibleRoles: [ADMIN, CLIENT],
  },
];

const LEGACY_TITLE_MAP: Record<string, string> = {
  Recepcion: VCARS_PROCESS[0].title,
  'Recepcion y orden de servicio': VCARS_PROCESS[0].title,
  'Recepción (Ingreso)': VCARS_PROCESS[0].title,
  'Cotizacion detallada': VCARS_PROCESS[1].title,
  Cotizacion: VCARS_PROCESS[2].title,
  'Aprobacion del cliente': VCARS_PROCESS[3].title,
  'Ejecucion en taller': VCARS_PROCESS[4].title,
  'Entrega del vehiculo': VCARS_PROCESS[5].title,
};

export function normalizeStepTitle(title?: string): string {
  const raw = String(title || '').trim();
  if (!raw) return VCARS_PROCESS[0].title;
  return LEGACY_TITLE_MAP[raw] || raw;
}

export function stepIndexFromTitle(title?: string): number {
  const normalized = normalizeStepTitle(title);
  const idx = VCARS_PROCESS.findIndex((step) => step.title === normalized);
  return idx >= 0 ? idx : 0;
}

export function getVisibleSteps(role: Role): Array<{ index: number; title: string; key: string }> {
  return VCARS_PROCESS.map((step, index) => ({ ...step, index }))
    .filter((step) => step.visibleRoles.includes(role))
    .map((step) => ({ index: step.index, title: step.title, key: step.key }));
}
