import { VCARS_PROCESS } from './process';
import type { Entry } from './storage';
import { getVehicleEvidencePhoto } from './carPhoto';

type DemoVehicle = {
  placa: string;
  vehiculo: string;
  cliente: string;
  telefono: string;
  empresa: string;
  stepIndex: number;
  status: 'active' | 'done' | 'cancelled';
};

type DemoFormsByStep = Record<string, Record<string, string>>;
export type DemoFormsByPlate = Record<string, DemoFormsByStep>;

const DEMO_VEHICLES: DemoVehicle[] = [
  { placa: 'BCD246', vehiculo: 'Volkswagen Gol 2014', cliente: 'Juli', telefono: '3001112233', empresa: 'juli@gm.com', stepIndex: 5, status: 'active' },

  { placa: 'TLL006', vehiculo: 'Suzuki Swift', cliente: 'Valentina Ruiz', telefono: '3012223344', empresa: 'congreso@gobierno.com', stepIndex: 0, status: 'active' },
  { placa: 'TLL005', vehiculo: 'Ford Fiesta', cliente: 'Santiago Castro', telefono: '3023334455', empresa: 'congreso@gobierno.com', stepIndex: 1, status: 'active' },
  { placa: 'TLL004', vehiculo: 'Chevrolet Onix', cliente: 'Diana Rojas', telefono: '3034445566', empresa: 'congreso@gobierno.com', stepIndex: 2, status: 'active' },
  { placa: 'PRUEBA123', vehiculo: 'Toyota Corolla', cliente: 'Equipo Congreso', telefono: '3045556677', empresa: 'congreso@gobierno.com', stepIndex: 3, status: 'active' },
  { placa: 'MUS818', vehiculo: 'Ford Mustang', cliente: 'Camilo Suarez', telefono: '3056667788', empresa: 'congreso@gobierno.com', stepIndex: 4, status: 'active' },
  { placa: 'LMB910', vehiculo: 'Lamborghini Huracan', cliente: 'Nicolas Vega', telefono: '3067778899', empresa: 'congreso@gobierno.com', stepIndex: 5, status: 'done' },
  { placa: 'RNG445', vehiculo: 'Renault Duster', cliente: 'Patricia Gomez', telefono: '3123456789', empresa: 'congreso@gobierno.com', stepIndex: 2, status: 'active' },

  { placa: 'COR527', vehiculo: 'Toyota Corolla Cross', cliente: 'Laura Jimenez', telefono: '3078889900', empresa: 'alcaldia@alcaldia.com', stepIndex: 0, status: 'active' },
  { placa: 'TRX901', vehiculo: 'Chevrolet Tracker', cliente: 'Paula Perez', telefono: '3089990011', empresa: 'alcaldia@alcaldia.com', stepIndex: 2, status: 'active' },
  { placa: 'C8R001', vehiculo: 'Chevrolet Corvette C8', cliente: 'Andres Molina', telefono: '3090001122', empresa: 'alcaldia@alcaldia.com', stepIndex: 3, status: 'active' },
  { placa: 'SNT204', vehiculo: 'Nissan Sentra', cliente: 'Mario Lozano', telefono: '3101112233', empresa: 'alcaldia@alcaldia.com', stepIndex: 4, status: 'active' },
  { placa: 'BMW777', vehiculo: 'BMW Serie 3', cliente: 'Felipe Arias', telefono: '3112223344', empresa: 'alcaldia@alcaldia.com', stepIndex: 5, status: 'cancelled' },
  { placa: 'KIA889', vehiculo: 'Kia Rio', cliente: 'Fernanda Lopez', telefono: '3134567890', empresa: 'alcaldia@alcaldia.com', stepIndex: 1, status: 'active' },
  { placa: 'HYU330', vehiculo: 'Hyundai Tucson', cliente: 'Jorge Medina', telefono: '3145678901', empresa: 'alcaldia@alcaldia.com', stepIndex: 2, status: 'active' },
];

type PhotoZone = 'superior' | 'inferior' | 'lateralDerecho' | 'lateralIzquierdo' | 'frontal' | 'trasero';

function zonePhoto(model: string, plate: string, color: string, zone: PhotoZone): string {
  return getVehicleEvidencePhoto(model, plate, color, zone);
}

function toIsoDaysAgo(daysAgo: number): string {
  const now = new Date();
  const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function quoteItemsFor(v: DemoVehicle): Array<{ sistema: string; trabajo: string; unitPrice: string; qty: string }> {
  const base = 120000 + (v.placa.charCodeAt(0) % 6) * 25000;
  return [
    { sistema: 'Motor', trabajo: 'Diagnóstico y ajuste', unitPrice: String(base), qty: '1' },
    { sistema: 'Frenos', trabajo: 'Revisión y limpieza', unitPrice: String(base - 30000), qty: '1' },
    { sistema: 'Suspensión', trabajo: 'Alineación y prueba', unitPrice: String(base - 15000), qty: '1' },
  ];
}

function quoteDraftItemsFor(v: DemoVehicle): Array<{
  item: string;
  sistema: string;
  trabajo: string;
  precioSinIva: string;
  unidad: string;
  valorCliente: string;
  repuesto: string;
  moTaller: string;
  tempario: string;
  utilidad: string;
  precioClienteUnd: string;
  unidadCliente: string;
  totalCliente: string;
}> {
  const rows = quoteItemsFor(v);
  return rows.map((row, idx) => {
    const precioSinIva = Number(row.unitPrice);
    const unidad = Number(row.qty);
    const repuesto = Math.round(precioSinIva * 0.42);
    const moTaller = Math.round(precioSinIva * 0.18);
    const utilidad = Math.max(precioSinIva - repuesto - moTaller, 0);
    const precioClienteUnd = precioSinIva + utilidad;
    const totalCliente = precioClienteUnd * unidad;
    return {
      item: String(idx + 1),
      sistema: row.sistema,
      trabajo: row.trabajo,
      precioSinIva: String(precioSinIva),
      unidad: String(unidad),
      valorCliente: String(precioSinIva * unidad),
      repuesto: String(repuesto),
      moTaller: String(moTaller),
      tempario: '0',
      utilidad: String(utilidad),
      precioClienteUnd: String(precioClienteUnd),
      unidadCliente: String(unidad),
      totalCliente: String(totalCliente),
    };
  });
}

function expenseItemsFor(v: DemoVehicle): Array<{ actividad: string; tercero: string; cantidad: string; operario: string; costo: string }> {
  const base = 70000 + (v.placa.charCodeAt(2) % 5) * 10000;
  return [
    { actividad: 'Cambio de filtro', tercero: 'No', cantidad: '1', operario: String(base), costo: '45000' },
    { actividad: 'Mantenimiento frenos', tercero: 'No', cantidad: '1', operario: String(base + 20000), costo: '90000' },
  ];
}

function buildInventory(): Record<string, 'S' | 'N' | 'C' | 'I'> {
  return {
    radio: 'S',
    tapetes: 'S',
    kitCarretera: 'S',
    llantaRepuesto: 'S',
    controlRemoto: 'S',
    tarjetaPropiedad: 'S',
    lucesTecho: 'N',
    antena: 'N',
  };
}

function demoSignatureDataUrl(label: string): string {
  const safe = String(label || '').trim() || 'Firma';
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220">
  <rect width="100%" height="100%" fill="#0b1220"/>
  <path d="M16 196 H704" stroke="#6aaef5" stroke-opacity="0.45" stroke-width="2" />
  <text x="34" y="142" fill="#e6f3ff" font-size="52" font-family="cursive">${safe}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getDemoEntries(): Entry[] {
  return DEMO_VEHICLES.map((item, index) => {
    const createdAt = toIsoDaysAgo(12 - index);
    const intakePhotosByZone = {
      superior: zonePhoto(item.vehiculo, item.placa, ['Negro', 'Blanco', 'Rojo', 'Gris'][index % 4], 'superior'),
      inferior: zonePhoto(item.vehiculo, item.placa, ['Negro', 'Blanco', 'Rojo', 'Gris'][index % 4], 'inferior'),
      lateralDerecho: zonePhoto(item.vehiculo, item.placa, ['Negro', 'Blanco', 'Rojo', 'Gris'][index % 4], 'lateralDerecho'),
      lateralIzquierdo: zonePhoto(item.vehiculo, item.placa, ['Negro', 'Blanco', 'Rojo', 'Gris'][index % 4], 'lateralIzquierdo'),
      frontal: zonePhoto(item.vehiculo, item.placa, ['Negro', 'Blanco', 'Rojo', 'Gris'][index % 4], 'frontal'),
      trasero: zonePhoto(item.vehiculo, item.placa, ['Negro', 'Blanco', 'Rojo', 'Gris'][index % 4], 'trasero'),
    };

    return {
      id: `demo-${item.placa}`,
      orderNumber: `OS-202603-${String(index + 1).padStart(3, '0')}`,
      placa: item.placa,
      cliente: item.cliente,
      telefono: item.telefono,
      email: item.empresa,
      vehiculo: item.vehiculo,
      color: ['Negro', 'Blanco', 'Rojo', 'Gris'][index % 4],
      empresa: item.empresa,
      nitCc: `900${String(550000 + index).slice(-6)}`,
      direccion: `Bogotá, sede ${index + 1}`,
      invoiceName: item.empresa.includes('@') ? item.empresa.split('@')[0] : item.cliente,
      paymentMethod: index % 3 === 0 ? 'credito' : 'contado',
      creditDays: index % 3 === 0 ? '30' : '',
      fuelLevel: ['1/4', '1/2', '3/4', 'F'][index % 4],
      receivedBy: index % 2 === 0 ? 'Julian Tecnico' : 'David Admin',
      expectedDeliveryDate: String(toIsoDaysAgo(-(index % 5 + 1))).slice(0, 10),
      soatExpiry: `2026-${String((index % 9) + 1).padStart(2, '0')}-28`,
      rtmExpiry: `2026-${String((index % 9) + 1).padStart(2, '0')}-15`,
      wantsOldParts: index % 2 === 0 ? 'SI' : 'NO',
      intakePhotosByZone,
      intakePhotos: Object.values(intakePhotosByZone),
      paso: VCARS_PROCESS[item.stepIndex]?.title || VCARS_PROCESS[0].title,
      stepIndex: item.stepIndex,
      status: item.status,
      fecha: createdAt,
      updatedAt: createdAt,
      backend: {
        vehicleId: `demo-vehicle-${item.placa}`,
        entryId: `demo-entry-${item.placa}`,
      },
    };
  });
}

export function getDemoVehicleModelByPlate(plate: string): string {
  const key = String(plate || '').trim().toUpperCase();
  const found = DEMO_VEHICLES.find((item) => item.placa === key);
  return found?.vehiculo || '';
}

export function getDemoVehicleColorByPlate(plate: string): string {
  const key = String(plate || '').trim().toUpperCase();
  const index = DEMO_VEHICLES.findIndex((item) => item.placa === key);
  if (index < 0) return '';
  return ['Negro', 'Blanco', 'Rojo', 'Gris'][index % 4];
}

export function getDemoFormsByPlate(): DemoFormsByPlate {
  const result: DemoFormsByPlate = {};

  for (const [index, item] of DEMO_VEHICLES.entries()) {
    const rows = quoteItemsFor(item);
    const sub = rows.reduce((acc, row) => acc + Number(row.unitPrice) * Number(row.qty), 0);
    const iva = Math.round(sub * 0.19);
    const total = sub + iva;
    const expenses = expenseItemsFor(item);
    const expenseOperarioTotal = expenses.reduce((acc, row) => acc + Number(row.operario), 0);
    const expenseCostoTotal = expenses.reduce((acc, row) => acc + Number(row.costo), 0);

    const byStep: DemoFormsByStep = {
      recepcion: {
        fallaCliente: `Ruido reportado en ${item.vehiculo} (${item.placa})`,
        kilometraje: String(82000 + index * 1100),
        tecnicoAsignado: index % 2 === 0 ? 'Julian' : 'Carlos',
        observacionesAccesorios: 'Ingreso con accesorios básicos, sin novedades críticas.',
        wantsOldParts: index % 2 === 0 ? 'SI' : 'NO',
        soatExpiry: `2026-${String((index % 9) + 1).padStart(2, '0')}-28`,
        rtmExpiry: `2026-${String((index % 9) + 1).padStart(2, '0')}-15`,
        condicionFisica: 'Sin golpes estructurales, marcas leves de uso.',
        inventarioAccesorios: JSON.stringify(buildInventory()),
        firmaClienteEmpresa: demoSignatureDataUrl(item.cliente || 'Cliente'),
        firmaTallerRecibe: demoSignatureDataUrl(index % 2 === 0 ? 'Julian Técnico' : 'David Recepción'),
        photo_verified_superior: 'SI',
        photo_verified_inferior: 'SI',
        photo_verified_lateralDerecho: 'SI',
        photo_verified_lateralIzquierdo: 'SI',
        photo_verified_frontal: 'SI',
        photo_verified_trasero: 'SI',
        photo_verified_source_superior: 'AUTO',
        photo_verified_source_inferior: 'AUTO',
        photo_verified_source_lateralDerecho: 'AUTO',
        photo_verified_source_lateralIzquierdo: 'AUTO',
        photo_verified_source_frontal: 'AUTO',
        photo_verified_source_trasero: 'AUTO',
      },
    };

    if (item.stepIndex >= 1) {
      byStep.cotizacion_interna = {
        diagnosticoTecnico: 'Se detecta desgaste en sistema de frenos y ajuste preventivo de suspensión.',
        repuestos: 'Pastillas delanteras, líquido de frenos DOT4 y kit de bujes.',
      };
    }

    if (item.stepIndex >= 2) {
      const draftRows = quoteDraftItemsFor(item);
      const draftTotalValorCliente = draftRows.reduce((acc, row) => acc + Number(row.valorCliente || 0), 0);
      const draftTotalRepuesto = draftRows.reduce((acc, row) => acc + Number(row.repuesto || 0), 0);
      const draftTotalMoTaller = draftRows.reduce((acc, row) => acc + Number(row.moTaller || 0), 0);
      const draftTotalTempario = draftRows.reduce((acc, row) => acc + Number(row.tempario || 0), 0);
      const draftCostoTotal = draftTotalRepuesto + draftTotalMoTaller + draftTotalTempario;
      const draftGananciaNeta = sub - draftCostoTotal;
      const draftMargenPct = sub > 0 ? (draftGananciaNeta / sub) * 100 : 0;
      byStep.cotizacion_formal = {
        cotizacionNumero: `COT-2026-${String(index + 1).padStart(3, '0')}`,
        cotizacionFecha: `2026-03-${String((index % 20) + 1).padStart(2, '0')}`,
        alcance: 'Mantenimiento preventivo y correctivo según diagnóstico.',
        condicionesPago: '50% anticipo - 50% contra entrega',
        quoteDraftItems: JSON.stringify(draftRows),
        quoteClientItems: JSON.stringify(draftRows.map((row) => ({
          sistema: row.sistema,
          trabajo: row.trabajo,
          precioClienteUnd: row.precioClienteUnd,
          unidad: row.unidadCliente,
          total: row.totalCliente,
        }))),
        quoteItems: JSON.stringify(rows),
        draftTotalValorCliente: String(draftTotalValorCliente),
        draftTotalRepuesto: String(draftTotalRepuesto),
        draftTotalMoTaller: String(draftTotalMoTaller),
        draftTotalTempario: String(draftTotalTempario),
        draftCostoTotal: String(draftCostoTotal),
        draftGananciaNeta: String(draftGananciaNeta),
        draftMargenPct: String(Math.round(draftMargenPct * 100) / 100),
        cotizacionSubtotal: String(sub),
        cotizacionIva: String(iva),
        cotizacionTotal: String(total),
      };
    }

    if (item.stepIndex >= 3) {
      const approved = item.status !== 'cancelled' && item.stepIndex >= 4;
      byStep.aprobacion = {
        decisionCliente: approved ? 'Aprobado' : item.status === 'cancelled' ? 'No aprobado' : '',
        comentariosCliente: approved ? 'Autorizado para continuar.' : item.status === 'cancelled' ? 'No autorizo por presupuesto.' : '',
        decisionClienteAt: approved || item.status === 'cancelled' ? toIsoDaysAgo(5 - (index % 3)) : '',
      };
    }

    if (item.stepIndex >= 4) {
      byStep.trabajo = {
        trabajoRealizado: 'Se ejecutaron ajustes y cambio de componentes según cotización.',
        evidenciasAdjuntas: 'foto-motor.jpg, factura-repuestos.pdf',
        expenseItems: JSON.stringify(expenses),
        expenseOperarioTotal: String(expenseOperarioTotal),
        expenseCostoTotal: String(expenseCostoTotal),
      };
    }

    if (item.stepIndex >= 5) {
      byStep.entrega = {
        fechaEntregaReal: `2026-03-${String((index % 20) + 3).padStart(2, '0')}`,
        firmaRecibe: item.cliente,
        cierreObservaciones: item.status === 'done' ? 'Vehículo entregado en conformidad.' : 'Cierre administrativo sin entrega.',
      };
    }

    result[item.placa] = byStep;
  }

  return result;
}

export function applyDemoEntries(existing: Entry[]): Entry[] {
  const existingList = Array.isArray(existing) ? existing : [];
  const demoPlates = new Set(getDemoEntries().map((d) => String(d.placa || '').toUpperCase()));
  return existingList.filter((item) => {
    const plate = String(item.placa || '').toUpperCase();
    const id = String(item.id || '').toLowerCase();
    if (!plate) return false;
    if (demoPlates.has(plate)) return false;
    if (id.startsWith('demo-')) return false;
    return true;
  });
}
