import { normalizeStepTitle } from './process';
import type { ApiVehicle } from './api';
import type { Entry } from './storage';

function companyByPlate(plate: string): string {
  const normalized = String(plate || '').trim().toUpperCase();
  if (!normalized) return 'congreso@gobierno.com';
  const hash = normalized.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'congreso@gobierno.com' : 'alcaldia@alcaldia.com';
}

export function apiVehicleToEntry(vehicle: ApiVehicle): Entry | null {
  if (!vehicle) return null;

  const lastEntry = Array.isArray(vehicle.entries) && vehicle.entries.length ? vehicle.entries[0] : null;
  const plate = vehicle.plate || '';

  return {
    id: vehicle.id,
    placa: plate,
    cliente: vehicle.customer?.name || '',
    telefono: vehicle.customer?.phone || '',
    vehiculo: vehicle.model || '',
    empresa: companyByPlate(plate),
    paso: normalizeStepTitle('Recepcion y orden de servicio'),
    stepIndex: 0,
    status: 'active',
    fecha: lastEntry?.createdAt || vehicle.updatedAt || vehicle.createdAt,
    updatedAt: lastEntry?.createdAt || vehicle.updatedAt || vehicle.createdAt,
    backend: {
      vehicleId: vehicle.id,
      entryId: lastEntry?.id || null,
    },
  };
}
