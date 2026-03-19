import { normalizeStepTitle } from './process';
import type { Entry } from './storage';

function companyByPlate(plate: string): string {
  const normalized = String(plate || '').trim().toUpperCase();
  if (!normalized) return 'congreso@gobierno.com';
  const hash = normalized.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'congreso@gobierno.com' : 'alcaldia@alcaldia.com';
}

const BASE = [
  { placa: 'BCD246', vehiculo: 'Volkswagen Gol 2014', cliente: 'Natalia Torres', telefono: '3001112233' },
  { placa: 'TLL006', vehiculo: 'Suzuki Swift', cliente: 'Valentina Ruiz', telefono: '3012223344' },
  { placa: 'TLL005', vehiculo: 'Ford Fiesta', cliente: 'Santiago Castro', telefono: '3023334455' },
  { placa: 'TLL004', vehiculo: 'Chevrolet Onix', cliente: 'Diana Rojas', telefono: '3034445566' },
  { placa: 'PRUEBA123', vehiculo: 'Toyota Corolla', cliente: 'Prueba', telefono: '3045556677' },
  { placa: 'MUS818', vehiculo: 'Ford Mustang', cliente: 'Camilo Suarez', telefono: '3056667788' },
  { placa: 'LMB910', vehiculo: 'Lamborghini Huracan', cliente: 'Nicolas Vega', telefono: '3067778899' },
  { placa: 'COR527', vehiculo: 'Toyota Corolla Cross', cliente: 'Laura Jimenez', telefono: '3078889900' },
  { placa: 'TRX901', vehiculo: 'Chevrolet Tracker', cliente: 'Paula Perez', telefono: '3089990011' },
  { placa: 'C8R001', vehiculo: 'Chevrolet Corvette C8', cliente: 'Andres Molina', telefono: '3090001122' },
  { placa: 'SNT204', vehiculo: 'Nissan Sentra', cliente: 'Mario Lozano', telefono: '3101112233' },
  { placa: 'BMW777', vehiculo: 'BMW Serie 3', cliente: 'Felipe Arias', telefono: '3112223344' },
];

export function getDemoEntries(): Entry[] {
  const now = Date.now();
  return BASE.map((item, index) => {
    const ts = new Date(now - index * 1000 * 60 * 14).toISOString();
    return {
      id: `demo-${item.placa}`,
      placa: item.placa,
      cliente: item.cliente,
      telefono: item.telefono,
      vehiculo: item.vehiculo,
      empresa: companyByPlate(item.placa),
      paso: normalizeStepTitle('Recepcion y orden de servicio'),
      stepIndex: 0,
      status: 'active',
      fecha: ts,
      updatedAt: ts,
      backend: {
        vehicleId: `demo-vehicle-${item.placa}`,
        entryId: null,
      },
    };
  });
}
