import { normalizeStepTitle } from './process';
import type { ApiVehicle } from './api';
import type { Entry } from './storage';

export function apiVehicleToEntry(vehicle: ApiVehicle): Entry | null {
  if (!vehicle) return null;

  const lastEntry = Array.isArray(vehicle.entries) && vehicle.entries.length ? vehicle.entries[0] : null;

  return {
    id: vehicle.id,
    placa: vehicle.plate || '',
    cliente: vehicle.customer?.name || '',
    telefono: vehicle.customer?.phone || '',
    vehiculo: vehicle.model || '',
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
