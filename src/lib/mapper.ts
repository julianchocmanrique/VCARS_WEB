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

  const brand = String(vehicle.brand || '').trim();
  const model = String(vehicle.model || '').trim();
  const vehicleLabel = [brand, model].filter(Boolean).join(' ') || model || brand;

  return {
    id: vehicle.id,
    placa: plate,
    cliente: vehicle.customer?.name || '',
    telefono: vehicle.customer?.phone || '',
    vehiculo: vehicleLabel,
    marca: brand,
    modelo: model,
    color: vehicle.color || '',
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

function preferText(remote?: string, local?: string): string {
  return String(remote || '').trim() || String(local || '').trim();
}

const RECEPTION_ENTRY_FIELDS = [
  'orderNumber',
  'fecha',
  'expectedDeliveryDate',
  'placa',
  'ownerName',
  'cliente',
  'nitCc',
  'companyEntity',
  'empresa',
  'direccion',
  'telefono',
  'email',
  'invoiceName',
  'billingNitCc',
  'paymentMethod',
  'transferChannel',
  'creditDays',
  'color',
  'marca',
  'modelo',
  'fuelLevel',
] as const;

const RECEPTION_DIRECT_FIELDS: Array<[keyof Entry, string]> = [
  ['tecnicoAsignado', 'tecnicoAsignado'],
  ['wantsOldParts', 'wantsOldParts'],
  ['soatExpiry', 'soatExpiry'],
  ['rtmExpiry', 'rtmExpiry'],
  ['condicionFisica', 'condicionFisica'],
  ['additionalAccessoriesNotes', 'observacionesAccesorios'],
  ['inventarioAccesorios', 'inventarioAccesorios'],
];

/** Rebuilds the order details stored in the reception form on another device. */
export function mergeEntryWithReceptionForm(entry: Entry, reception: Record<string, string> | undefined): Entry {
  const next = { ...entry };
  const target = next as unknown as Record<string, string | undefined>;
  const source = reception || {};

  RECEPTION_ENTRY_FIELDS.forEach((field) => {
    const value = String(source[`entry_${field}`] || '').trim();
    if (!value) return;
    target[field] = field === 'placa' ? value.toUpperCase() : value;
  });

  RECEPTION_DIRECT_FIELDS.forEach(([entryField, formField]) => {
    const value = String(source[formField] || '').trim();
    if (!value) return;
    target[entryField] = value;
  });

  const vehicleLabel = [next.marca, next.modelo].filter(Boolean).join(' ').trim();
  if (vehicleLabel) next.vehiculo = vehicleLabel;
  return next;
}

/** Keeps details collected in the order while refreshing API-owned vehicle data. */
export function mergeEntryWithBackend(local: Entry | null | undefined, remote: Entry): Entry {
  if (!local) return remote;
  return {
    ...local,
    ...remote,
    id: remote.id || local.id,
    placa: remote.placa || local.placa,
    cliente: preferText(remote.cliente, local.cliente),
    telefono: preferText(remote.telefono, local.telefono),
    vehiculo: preferText(remote.vehiculo, local.vehiculo),
    marca: preferText(remote.marca, local.marca),
    modelo: preferText(remote.modelo, local.modelo),
    color: preferText(remote.color, local.color),
    fecha: preferText(remote.fecha, local.fecha),
    updatedAt: preferText(remote.updatedAt, local.updatedAt),
    intakePhotos: local.intakePhotos || remote.intakePhotos,
    intakePhotosByZone: local.intakePhotosByZone || remote.intakePhotosByZone,
    paso: local.paso || remote.paso,
    stepIndex: typeof local.stepIndex === 'number' ? local.stepIndex : remote.stepIndex,
    status: local.status || remote.status,
    backend: { ...local.backend, ...remote.backend },
  };
}
