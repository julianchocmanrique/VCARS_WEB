import type { Entry } from './storage';

type FormsByStep = Record<string, Record<string, string>>;

type InventoryValue = 'S' | 'N' | 'C' | 'I' | '';

type QuoteRow = { sistema: string; trabajo: string; unitPrice: string; qty: string };
type QuoteDraftRow = {
  sistema: string;
  trabajo: string;
  precioSinIva: string;
  unidad: string;
};
type ExpenseRow = { actividad: string; tercero: string; cantidad: string; operario: string; costo: string };

const INVENTORY_ITEMS = [
  'radio', 'cds', 'encendedor', 'ceniceros', 'reloj', 'cinturon', 'tapetes', 'parasoles', 'forros',
  'lucesTecho', 'espejos', 'chapas', 'kitCarretera', 'llantaRepuesto', 'herramienta', 'gatoPalanca',
  'llaveros', 'pernos', 'senales', 'antena', 'plumillas', 'exploradoras', 'tercerStop', 'tapaGasolina',
  'copasRuedas', 'manijas', 'elevavidrios', 'controlRemoto', 'lavaVidrio', 'tapaPanel', 'controlAA', 'tarjetaPropiedad',
];

const PHOTO_SLOTS = [
  { key: 'superior', label: 'Superior' },
  { key: 'inferior', label: 'Inferior' },
  { key: 'lateralDerecho', label: 'Lateral derecho' },
  { key: 'lateralIzquierdo', label: 'Lateral izquierdo' },
  { key: 'frontal', label: 'Frontal' },
  { key: 'trasero', label: 'Trasero' },
] as const;

const REQUIRED_STEP_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  cotizacion_interna: [
    { key: 'diagnosticoTecnico', label: 'Diagnóstico del mecánico' },
    { key: 'repuestos', label: 'Repuestos necesarios' },
  ],
  cotizacion_formal: [
    { key: 'cotizacionNumero', label: 'No. cotización' },
    { key: 'cotizacionFecha', label: 'Fecha cotización' },
    { key: 'alcance', label: 'Alcance para cliente' },
    { key: 'condicionesPago', label: 'Condiciones de pago' },
  ],
  aprobacion: [
    { key: 'decisionCliente', label: 'Decisión del cliente' },
    { key: 'comentariosCliente', label: 'Comentarios del cliente' },
    { key: 'decisionClienteAt', label: 'Fecha/hora decisión' },
  ],
  trabajo: [
    { key: 'trabajoRealizado', label: 'Trabajo realizado' },
    { key: 'evidenciasAdjuntas', label: 'Evidencias (nombres de archivo)' },
  ],
  entrega: [
    { key: 'fechaEntregaReal', label: 'Fecha entrega real' },
    { key: 'firmaRecibe', label: 'Recibido por' },
    { key: 'cierreObservaciones', label: 'Observaciones de cierre' },
  ],
};

function parseJsonRows<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function hasValue(value: unknown): boolean {
  return String(value ?? '').trim().length > 0;
}

function isOptionalObservacion(value: string): boolean {
  return /observ/i.test(String(value || ''));
}

function getReceptionPhotos(formsByStep: FormsByStep, entry?: Entry | null): Record<string, string> {
  const fromForms = formsByStep.recepcion || {};
  const fromEntry = entry?.intakePhotosByZone || {};
  return {
    superior: String(fromForms.photo_superior || fromEntry.superior || ''),
    inferior: String(fromForms.photo_inferior || fromEntry.inferior || ''),
    lateralDerecho: String(fromForms.photo_lateralDerecho || fromEntry.lateralDerecho || ''),
    lateralIzquierdo: String(fromForms.photo_lateralIzquierdo || fromEntry.lateralIzquierdo || ''),
    frontal: String(fromForms.photo_frontal || fromEntry.frontal || ''),
    trasero: String(fromForms.photo_trasero || fromEntry.trasero || ''),
  };
}

export function getMissingRequiredFields(stepKey: string, formsByStep: FormsByStep, entry?: Entry | null): string[] {
  const missing: string[] = [];
  const stepValues = formsByStep[stepKey] || {};

  if (stepKey === 'recepcion') {
    const reception = formsByStep.recepcion || {};
    const inventory = parseJsonRows<Record<string, InventoryValue>>(reception.inventarioAccesorios, {});
    const receptionPhotos = getReceptionPhotos(formsByStep, entry);
    const requiredReception: Array<{ label: string; value: unknown }> = [
      { label: 'Fecha entrada', value: String(entry?.fecha || '').slice(0, 10) },
      { label: 'Fecha prevista entrega', value: entry?.expectedDeliveryDate },
      { label: 'Propietario', value: entry?.ownerName || entry?.cliente },
      { label: 'NIT / C.C', value: entry?.nitCc },
      { label: 'Empresa / Entidad', value: entry?.companyEntity || entry?.empresa },
      { label: 'Dirección', value: entry?.direccion },
      { label: 'Teléfono de contacto', value: entry?.telefono },
      { label: 'E-mail', value: entry?.email },
      { label: 'Factura a nombre de', value: entry?.invoiceName },
      { label: 'NIT / C.C facturación', value: entry?.billingNitCc },
      { label: 'Forma de pago', value: entry?.paymentMethod },
      { label: 'Marca', value: entry?.marca },
      { label: 'Modelo', value: entry?.modelo },
      { label: 'Color', value: entry?.color },
      { label: 'Nivel combustible', value: entry?.fuelLevel },
      { label: 'Kilometraje', value: reception.kilometraje },
      { label: 'Técnico asignado', value: reception.tecnicoAsignado },
      { label: 'Falla reportada por el cliente', value: reception.fallaCliente },
      { label: '¿Desea conservar piezas?', value: reception.wantsOldParts },
      { label: 'Reporte condición física', value: reception.condicionFisica },
      { label: 'SOAT (vencimiento)', value: reception.soatExpiry || entry?.soatExpiry },
      { label: 'Tecnomecánica (vencimiento)', value: reception.rtmExpiry || entry?.rtmExpiry },
      { label: 'Firma cliente / empresa', value: reception.firmaClienteEmpresa },
      { label: 'Firma taller (quien recibe)', value: reception.firmaTallerRecibe },
    ];

    requiredReception.forEach((item) => {
      if (!hasValue(item.value)) missing.push(item.label);
    });

    if (entry?.paymentMethod === 'credito' && !hasValue(entry?.creditDays)) {
      missing.push('Días crédito');
    }

    if (entry?.paymentMethod === 'transferencia' && !hasValue(entry?.transferChannel)) {
      missing.push('Medio transferencia');
    }

    INVENTORY_ITEMS.forEach((item) => {
      if (!hasValue(inventory[item])) missing.push(`Inventario: ${item}`);
    });

    PHOTO_SLOTS.forEach((slot) => {
      if (!hasValue(receptionPhotos[slot.key])) missing.push(`Foto ${slot.label}`);
      if (String(reception['photo_verified_' + slot.key] || '') !== 'SI') {
        missing.push(`Validación foto ${slot.label}`);
      }
    });

    return missing;
  }

  const requiredFields = REQUIRED_STEP_FIELDS[stepKey] || [];
  requiredFields.forEach((field) => {
    if (isOptionalObservacion(field.key) || isOptionalObservacion(field.label)) return;
    if (!hasValue(stepValues[field.key])) missing.push(field.label);
  });

  if (stepKey === 'cotizacion_formal') {
    const quoteDraftRows = parseJsonRows<QuoteDraftRow[]>(stepValues.quoteDraftItems, []);
    if (quoteDraftRows.length) {
      const hasIncompleteDraft = quoteDraftRows.some(
        (row) => !hasValue(row.sistema) || !hasValue(row.trabajo) || !hasValue(row.precioSinIva) || !hasValue(row.unidad),
      );
      if (hasIncompleteDraft) missing.push('Items de borrador');
    } else {
      const quoteRows = parseJsonRows<QuoteRow[]>(stepValues.quoteItems, []);
      const hasRows = quoteRows.length > 0;
      const hasIncomplete = quoteRows.some((row) => !hasValue(row.sistema) || !hasValue(row.trabajo) || !hasValue(row.unitPrice) || !hasValue(row.qty));
      if (!hasRows || hasIncomplete) missing.push('Items de cotización');
    }
  }

  if (stepKey === 'trabajo') {
    const expenseRows = parseJsonRows<ExpenseRow[]>(stepValues.expenseItems, []);
    const hasRows = expenseRows.length > 0;
    const hasIncomplete = expenseRows.some((row) => !hasValue(row.actividad) || !hasValue(row.tercero) || !hasValue(row.cantidad) || !hasValue(row.operario) || !hasValue(row.costo));
    if (!hasRows || hasIncomplete) missing.push('Gastos / ejecución');
  }

  return missing;
}

export function isStepComplete(stepKey: string, formsByStep: FormsByStep, entry?: Entry | null): boolean {
  return getMissingRequiredFields(stepKey, formsByStep, entry).length === 0;
}
