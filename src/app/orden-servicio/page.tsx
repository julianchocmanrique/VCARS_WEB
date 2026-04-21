'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { FlowHeader } from '@/components/FlowHeader';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { getFormsForPlate, getRoleSteps, setStepField, setStepFields } from '@/lib/orderForms';
import { getCurrentEntry, getEntries, getRole, getSession, setEntries, type Entry, type Role } from '@/lib/storage';

type FieldDef = { key: string; label: string; placeholder: string };
type QuoteRow = { sistema: string; trabajo: string; unitPrice: string; qty: string };
type ExpenseRow = { actividad: string; tercero: string; cantidad: string; operario: string; costo: string };

type InventoryValue = 'S' | 'N' | 'C' | 'I' | '';
type SignaturePadKey = 'cliente' | 'taller';

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const PHOTO_SLOTS = [
  { key: 'superior', label: 'Superior' },
  { key: 'inferior', label: 'Inferior' },
  { key: 'lateralDerecho', label: 'Lateral derecho' },
  { key: 'lateralIzquierdo', label: 'Lateral izquierdo' },
  { key: 'frontal', label: 'Frontal' },
  { key: 'trasero', label: 'Trasero' },
] as const;

type PhotoSlotKey = (typeof PHOTO_SLOTS)[number]['key'];

const STEP_FIELDS: Record<string, FieldDef[]> = {
  recepcion: [
    { key: 'fallaCliente', label: 'Falla reportada por el cliente', placeholder: 'Describe la falla' },
    { key: 'kilometraje', label: 'Kilometraje (km)', placeholder: '123456' },
    { key: 'tecnicoAsignado', label: 'Técnico asignado', placeholder: 'Nombre del técnico' },
    { key: 'observacionesAccesorios', label: 'Observaciones / Accesorios adicionales', placeholder: 'Detalle de accesorios y observaciones' },
    { key: 'wantsOldParts', label: '¿Desea conservar piezas cambiadas? (SI/NO)', placeholder: 'SI o NO' },
    { key: 'soatExpiry', label: 'SOAT (vencimiento)', placeholder: 'YYYY-MM-DD' },
    { key: 'rtmExpiry', label: 'Tecnomecánica (vencimiento)', placeholder: 'YYYY-MM-DD' },
    { key: 'condicionFisica', label: 'Reporte condición física', placeholder: 'Rayones, golpes, observaciones' },
  ],
  cotizacion_interna: [
    { key: 'diagnosticoTecnico', label: 'Diagnóstico del mecánico', placeholder: 'Diagnóstico' },
    { key: 'repuestos', label: 'Repuestos necesarios', placeholder: 'Lista de repuestos' },
  ],
  cotizacion_formal: [
    { key: 'cotizacionNumero', label: 'No. cotización', placeholder: 'COT-1001' },
    { key: 'cotizacionFecha', label: 'Fecha cotización', placeholder: 'YYYY-MM-DD' },
    { key: 'alcance', label: 'Alcance para cliente', placeholder: 'Detalle del trabajo y tiempos' },
    { key: 'condicionesPago', label: 'Condiciones de pago', placeholder: 'Contado / crédito a 30 días' },
  ],
  aprobacion: [
    { key: 'decisionCliente', label: 'Decisión del cliente', placeholder: 'Aprobado / No aprobado' },
    { key: 'comentariosCliente', label: 'Comentarios del cliente', placeholder: 'Comentarios o condiciones' },
    { key: 'decisionClienteAt', label: 'Fecha/hora decisión', placeholder: 'YYYY-MM-DD HH:mm' },
  ],
  trabajo: [
    { key: 'trabajoRealizado', label: 'Trabajo realizado', placeholder: 'Detalle de trabajo' },
    { key: 'evidenciasAdjuntas', label: 'Evidencias (nombres de archivo)', placeholder: 'foto1.jpg, factura.pdf' },
  ],
  entrega: [
    { key: 'fechaEntregaReal', label: 'Fecha entrega real', placeholder: '2026-03-16' },
    { key: 'firmaRecibe', label: 'Recibido por', placeholder: 'Nombre cliente' },
    { key: 'cierreObservaciones', label: 'Observaciones de cierre', placeholder: 'Comentarios finales de entrega' },
  ],
};

const INVENTORY_ITEMS = [
  'radio', 'cds', 'encendedor', 'ceniceros', 'reloj', 'cinturon', 'tapetes', 'parasoles', 'forros',
  'lucesTecho', 'espejos', 'chapas', 'kitCarretera', 'llantaRepuesto', 'herramienta', 'gatoPalanca',
  'llaveros', 'pernos', 'senales', 'antena', 'plumillas', 'exploradoras', 'tercerStop', 'tapaGasolina',
  'copasRuedas', 'manijas', 'elevavidrios', 'controlRemoto', 'lavaVidrio', 'tapaPanel', 'controlAA', 'tarjetaPropiedad',
];

const FUEL_LEVELS = [
  { value: 'E', label: 'E', ratio: 0 },
  { value: '1/4', label: '1/4', ratio: 0.25 },
  { value: '1/2', label: '1/2', ratio: 0.5 },
  { value: '3/4', label: '3/4', ratio: 0.75 },
  { value: 'F', label: 'F', ratio: 1 },
] as const;

type FuelLevelValue = (typeof FUEL_LEVELS)[number]['value'];

function parseJsonRows<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function asMoney(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('es-CO').format(n);
}

function toNumberSafe(value: string): number {
  const v = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(v) ? v : 0;
}

function nextInventoryValue(current: InventoryValue): InventoryValue {
  const order: InventoryValue[] = ['', 'S', 'N', 'C', 'I'];
  const idx = order.indexOf(current || '');
  if (idx < 0) return 'S';
  return order[(idx + 1) % order.length];
}

function normalizeFuelLevel(raw?: string): FuelLevelValue {
  const value = String(raw || '').trim().toUpperCase();
  if (value === 'E' || value === '1/4' || value === '1/2' || value === '3/4' || value === 'F') return value;
  if (value === 'FULL') return 'F';
  if (value === 'EMPTY') return 'E';
  return '1/2';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer ' + file.name));
    reader.readAsDataURL(file);
  });
}

export default function OrdenServicioPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('administrativo');
  const [plate, setPlate] = useState('');
  const [startStepIndex, setStartStepIndex] = useState(0);
  const [formsByStep, setFormsByStep] = useState<Record<string, Record<string, string>>>({});
  const [stepPos, setStepPos] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [fuelLevelUi, setFuelLevelUi] = useState<FuelLevelValue>('1/2');
  const [entryRefreshTick, setEntryRefreshTick] = useState(0);
  const signatureCanvasRefs = useRef<Record<SignaturePadKey, HTMLCanvasElement | null>>({
    cliente: null,
    taller: null,
  });
  const signatureDrawingRef = useRef<Record<SignaturePadKey, boolean>>({
    cliente: false,
    taller: false,
  });
  const signatureLastPointRef = useRef<Record<SignaturePadKey, { x: number; y: number } | null>>({
    cliente: null,
    taller: null,
  });
  const [openReceptionBlocks, setOpenReceptionBlocks] = useState({
    controlOrden: true,
    facturacion: false,
    infoVehiculo: false,
    inventario: false,
    firmas: true,
    fotos: false,
  });

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    const localRole = getRole();
    const current = getCurrentEntry();
    const entries = getEntries();

    let queryPlate = '';
    let queryStartStep = 0;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      queryPlate = String(url.searchParams.get('plate') || '').trim().toUpperCase();
      const raw = Number(url.searchParams.get('startStep') || 0);
      queryStartStep = Number.isFinite(raw) ? raw : 0;
    }

    let resolvedPlate = queryPlate || String(current?.placa || '').trim().toUpperCase();
    if (!resolvedPlate && entries.length) resolvedPlate = String(entries[0]?.placa || '').trim().toUpperCase();

    if (localRole === 'cliente') {
      const identity = getClientIdentity();
      const allowed = entries.filter((entry) => isEntryAllowed(identity, entry));
      const requestedAllowed = allowed.some((entry) => String(entry.placa || '').toUpperCase() === resolvedPlate);
      if (!requestedAllowed) resolvedPlate = String(allowed[0]?.placa || resolvedPlate || '').trim().toUpperCase();
    }

    queueMicrotask(() => {
      setRole(localRole);
      setPlate(resolvedPlate);
      setStartStepIndex(queryStartStep);
      setFormsByStep(getFormsForPlate(resolvedPlate));
    });
  }, [router]);

  const steps = useMemo(() => getRoleSteps(role, formsByStep), [role, formsByStep]);

  useEffect(() => {
    if (!steps.length) {
      queueMicrotask(() => setStepPos(0));
      return;
    }

    const foundPos = steps.findIndex((step) => step.index === startStepIndex);
    const targetPos = foundPos >= 0 ? foundPos : 0;
    queueMicrotask(() => setStepPos(targetPos));
  }, [startStepIndex, steps]);

  const current = steps[stepPos] || steps[0];
  const currentKey = current?.key || '';
  const fields = useMemo(() => STEP_FIELDS[currentKey] || [], [currentKey]);
  const editable = true;
  const stepValues = formsByStep[currentKey] || {};
  const hasStepData = fields.some((field) => String(stepValues[field.key] || '').trim().length > 0);
  const showPendingForClient = role === 'cliente' && !editable && !hasStepData;

  const quoteRows = useMemo(() => {
    const rows = parseJsonRows<QuoteRow[]>(formsByStep.cotizacion_formal?.quoteItems, []);
    return rows.length ? rows : [{ sistema: '', trabajo: '', unitPrice: '', qty: '1' }];
  }, [formsByStep.cotizacion_formal?.quoteItems]);

  const expenseRows = useMemo(() => {
    const rows = parseJsonRows<ExpenseRow[]>(formsByStep.trabajo?.expenseItems, []);
    return rows.length ? rows : [{ actividad: '', tercero: '', cantidad: '1', operario: '', costo: '' }];
  }, [formsByStep.trabajo?.expenseItems]);

  const inventory = useMemo(() => {
    return parseJsonRows<Record<string, InventoryValue>>(formsByStep.recepcion?.inventarioAccesorios, {});
  }, [formsByStep.recepcion?.inventarioAccesorios]);
  const entryForPlate = useMemo(
    () => getEntries().find((item) => String(item.placa || '').toUpperCase() === plate) || null,
    [plate, formsByStep, entryRefreshTick],
  );
  const selectedFuelLevel = fuelLevelUi;
  const fuelNeedleAngle = useMemo(() => {
    const match = FUEL_LEVELS.find((item) => item.value === selectedFuelLevel);
    const ratio = match ? match.ratio : 0.5;
    return -78 + (ratio * 156);
  }, [selectedFuelLevel]);

  useEffect(() => {
    setFuelLevelUi(normalizeFuelLevel(entryForPlate?.fuelLevel || ''));
  }, [entryForPlate?.fuelLevel, plate]);

  const receptionPhotos = useMemo(() => {
    const fromForms = formsByStep.recepcion || {};
    const fromEntry = getEntries().find((item) => String(item.placa || '').toUpperCase() === plate)?.intakePhotosByZone || {};
    return {
      superior: String(fromForms.photo_superior || fromEntry.superior || ''),
      inferior: String(fromForms.photo_inferior || fromEntry.inferior || ''),
      lateralDerecho: String(fromForms.photo_lateralDerecho || fromEntry.lateralDerecho || ''),
      lateralIzquierdo: String(fromForms.photo_lateralIzquierdo || fromEntry.lateralIzquierdo || ''),
      frontal: String(fromForms.photo_frontal || fromEntry.frontal || ''),
      trasero: String(fromForms.photo_trasero || fromEntry.trasero || ''),
    } as Record<PhotoSlotKey, string>;
  }, [formsByStep.recepcion, plate]);

  const signatureFieldKey: Record<SignaturePadKey, 'firmaClienteEmpresa' | 'firmaTallerRecibe'> = {
    cliente: 'firmaClienteEmpresa',
    taller: 'firmaTallerRecibe',
  };

  function syncSignatureCanvasFromValue(key: SignaturePadKey, value: string) {
    const canvas = signatureCanvasRefs.current[key];
    if (!canvas || typeof window === 'undefined') return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = 'rgba(10, 12, 17, 0.86)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (String(value || '').startsWith('data:image/')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = value;
    }
  }

  useEffect(() => {
    syncSignatureCanvasFromValue('cliente', String(formsByStep.recepcion?.firmaClienteEmpresa || ''));
    syncSignatureCanvasFromValue('taller', String(formsByStep.recepcion?.firmaTallerRecibe || ''));
  }, [formsByStep.recepcion?.firmaClienteEmpresa, formsByStep.recepcion?.firmaTallerRecibe]);

  function getSignatureContext(key: SignaturePadKey) {
    const canvas = signatureCanvasRefs.current[key];
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  function getSignaturePoint(canvas: HTMLCanvasElement, event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handleSignaturePointerDown(key: SignaturePadKey, event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!editable) return;
    const refs = getSignatureContext(key);
    if (!refs || !refs.ctx) return;
    const { canvas, ctx } = refs;
    canvas.setPointerCapture(event.pointerId);
    signatureDrawingRef.current[key] = true;
    const point = getSignaturePoint(canvas, event);
    signatureLastPointRef.current[key] = point;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#e6f3ff';
  }

  function handleSignaturePointerMove(key: SignaturePadKey, event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!signatureDrawingRef.current[key]) return;
    const refs = getSignatureContext(key);
    if (!refs || !refs.ctx) return;
    const { canvas, ctx } = refs;
    const point = getSignaturePoint(canvas, event);
    const last = signatureLastPointRef.current[key];
    if (!last) {
      signatureLastPointRef.current[key] = point;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    signatureLastPointRef.current[key] = point;
  }

  function saveSignature(key: SignaturePadKey) {
    const refs = getSignatureContext(key);
    if (!refs) return;
    const dataUrl = refs.canvas.toDataURL('image/png');
    syncStepPatch('recepcion', { [signatureFieldKey[key]]: dataUrl });
  }

  function handleSignaturePointerUp(key: SignaturePadKey, event: ReactPointerEvent<HTMLCanvasElement>) {
    const refs = getSignatureContext(key);
    if (refs) {
      try {
        refs.canvas.releasePointerCapture(event.pointerId);
      } catch {
        // no-op when pointer is already released
      }
    }
    if (!signatureDrawingRef.current[key]) return;
    signatureDrawingRef.current[key] = false;
    signatureLastPointRef.current[key] = null;
    saveSignature(key);
  }

  function clearSignature(key: SignaturePadKey) {
    syncStepPatch('recepcion', { [signatureFieldKey[key]]: '' });
  }

  function syncStepPatch(stepKey: string, patch: Record<string, string>) {
    if (!plate) return;
    const next = setStepFields(plate, stepKey, patch);
    setFormsByStep(next);
  }

  function updateField(fieldKey: string, value: string) {
    if (!plate || !current) return;
    const nextByStep = setStepField(plate, current.key, fieldKey, value);
    setFormsByStep(nextByStep);
  }

  function setQuoteRows(rows: QuoteRow[]) {
    const sub = rows.reduce((acc, row) => acc + toNumberSafe(row.unitPrice) * toNumberSafe(row.qty || '1'), 0);
    const iva = Math.round(sub * 0.19);
    const total = sub + iva;
    syncStepPatch('cotizacion_formal', {
      quoteItems: JSON.stringify(rows),
      cotizacionSubtotal: String(sub),
      cotizacionIva: String(iva),
      cotizacionTotal: String(total),
    });
  }

  function setExpenseRows(rows: ExpenseRow[]) {
    const operario = rows.reduce((acc, row) => acc + toNumberSafe(row.operario), 0);
    const costo = rows.reduce((acc, row) => acc + toNumberSafe(row.costo), 0);
    syncStepPatch('trabajo', {
      expenseItems: JSON.stringify(rows),
      expenseOperarioTotal: String(operario),
      expenseCostoTotal: String(costo),
    });
  }

  function setInventoryValue(item: string, value: InventoryValue) {
    const next = { ...inventory, [item]: value };
    syncStepPatch('recepcion', { inventarioAccesorios: JSON.stringify(next) });
  }

  function syncEntryPatch(patch: Partial<Entry>) {
    const all = getEntries();
    const idx = all.findIndex((item) => String(item.placa || '').toUpperCase() === plate);
    if (idx < 0) return;

    const currentEntry = all[idx] as Entry;
    const nextEntry: Entry = {
      ...currentEntry,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const nextAll = [...all];
    nextAll[idx] = nextEntry;
    setEntries(nextAll);
    setEntryRefreshTick((t) => t + 1);
  }

  function syncEntryReceptionPhotos(slot: PhotoSlotKey, src: string) {
    const currentZone = entryForPlate?.intakePhotosByZone || {};
    const nextZone = { ...currentZone, [slot]: src };
    const nextPhotos = PHOTO_SLOTS.map((item) => String(nextZone[item.key] || '')).filter(Boolean);

    syncEntryPatch({
      intakePhotosByZone: nextZone,
      intakePhotos: nextPhotos,
    });
  }

  async function onPickReceptionPhoto(slot: PhotoSlotKey, file?: File) {
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError('La imagen ' + file.name + ' supera 4MB. Súbela más liviana.');
      return;
    }

    try {
      const encoded = await fileToDataUrl(file);
      syncStepPatch('recepcion', { ['photo_' + slot]: encoded });
      syncEntryReceptionPhotos(slot, encoded);
      setUploadError('');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'No se pudo cargar la imagen.');
    }
  }

  function removeReceptionPhoto(slot: PhotoSlotKey) {
    syncStepPatch('recepcion', { ['photo_' + slot]: '' });
    syncEntryReceptionPhotos(slot, '');
  }

  function toggleReceptionBlock(key: keyof typeof openReceptionBlocks) {
    setOpenReceptionBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function hasValue(value: unknown): boolean {
    return String(value ?? '').trim().length > 0;
  }

  function isOptionalObservacion(value: string): boolean {
    return /observ/i.test(String(value || ''));
  }

  function validateCurrentStep(): string[] {
    if (!editable) return [];

    const missing: string[] = [];

    if (currentKey === 'recepcion') {
      const reception = formsByStep.recepcion || {};
      const requiredReception: Array<{ label: string; value: unknown }> = [
        { label: 'Fecha entrada', value: String(entryForPlate?.fecha || '').slice(0, 10) },
        { label: 'Fecha prevista entrega', value: entryForPlate?.expectedDeliveryDate },
        { label: 'Propietario', value: entryForPlate?.ownerName || entryForPlate?.cliente },
        { label: 'NIT / C.C', value: entryForPlate?.nitCc },
        { label: 'Empresa / Entidad', value: entryForPlate?.companyEntity || entryForPlate?.empresa },
        { label: 'Dirección', value: entryForPlate?.direccion },
        { label: 'Teléfono de contacto', value: entryForPlate?.telefono },
        { label: 'E-mail', value: entryForPlate?.email },
        { label: 'Factura a nombre de', value: entryForPlate?.invoiceName },
        { label: 'NIT / C.C facturación', value: entryForPlate?.billingNitCc },
        { label: 'Forma de pago', value: entryForPlate?.paymentMethod },
        { label: 'Días crédito', value: entryForPlate?.creditDays },
        { label: 'Marca', value: entryForPlate?.marca },
        { label: 'Modelo', value: entryForPlate?.modelo },
        { label: 'Color', value: entryForPlate?.color },
        { label: 'Nivel combustible', value: selectedFuelLevel },
        { label: 'Kilometraje', value: reception.kilometraje },
        { label: 'Técnico asignado', value: reception.tecnicoAsignado },
        { label: 'Falla reportada por el cliente', value: reception.fallaCliente },
        { label: '¿Desea conservar piezas?', value: reception.wantsOldParts },
        { label: 'Reporte condición física', value: reception.condicionFisica },
        { label: 'SOAT (vencimiento)', value: reception.soatExpiry || entryForPlate?.soatExpiry },
        { label: 'Tecnomecánica (vencimiento)', value: reception.rtmExpiry || entryForPlate?.rtmExpiry },
        { label: 'Firma cliente / empresa', value: reception.firmaClienteEmpresa },
        { label: 'Firma taller (quien recibe)', value: reception.firmaTallerRecibe },
      ];

      requiredReception.forEach((item) => {
        if (!hasValue(item.value)) missing.push(item.label);
      });

      INVENTORY_ITEMS.forEach((item) => {
        if (!hasValue(inventory[item])) missing.push(`Inventario: ${item}`);
      });

      PHOTO_SLOTS.forEach((slot) => {
        if (!hasValue(receptionPhotos[slot.key])) missing.push(`Foto ${slot.label}`);
      });
    } else {
      fields.forEach((field) => {
        if (isOptionalObservacion(field.key) || isOptionalObservacion(field.label)) return;
        if (!hasValue(stepValues[field.key])) missing.push(field.label);
      });

      if (currentKey === 'cotizacion_formal') {
        const hasIncomplete = quoteRows.some((row) => !hasValue(row.sistema) || !hasValue(row.trabajo) || !hasValue(row.unitPrice) || !hasValue(row.qty));
        if (hasIncomplete) missing.push('Items de cotización');
      }

      if (currentKey === 'trabajo') {
        const hasIncomplete = expenseRows.some((row) => !hasValue(row.actividad) || !hasValue(row.tercero) || !hasValue(row.cantidad) || !hasValue(row.operario) || !hasValue(row.costo));
        if (hasIncomplete) missing.push('Gastos / ejecución');
      }
    }

    return missing;
  }

  function handleNextStep() {
    const missing = validateCurrentStep();
    if (missing.length) {
      setValidationError(`Completa los campos obligatorios para continuar. Faltan ${missing.length}.`);
      return;
    }
    setValidationError('');
    setStepPos((s) => Math.min(Math.max(steps.length - 1, 0), s + 1));
  }

  function handleStepTabClick(nextIndex: number) {
    if (nextIndex <= stepPos) {
      setValidationError('');
      setStepPos(nextIndex);
      return;
    }
    const missing = validateCurrentStep();
    if (missing.length) {
      setValidationError(`Completa los campos obligatorios para continuar. Faltan ${missing.length}.`);
      return;
    }
    setValidationError('');
    setStepPos(nextIndex);
  }

  return (
    <main className="vc-page vc-shell" suppressHydrationWarning>
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <FlowHeader
          backHref={plate ? `/vehiculos/${encodeURIComponent(plate)}` : '/ingreso-activo'}
          subtitle={`Orden de servicio${plate ? ` · ${plate}` : ''}`}
          inlineSubtitle
        />

        <section className="vc-card">
          <h3>{current?.title || 'Orden de servicio'}</h3>

          <div className="vc-step-tabs">
            {steps.map((item, idx) => (
              <button
                key={item.key}
                className={`vc-step-tab ${idx === stepPos ? 'is-active' : ''}`}
                onClick={() => handleStepTabClick(idx)}
                type="button"
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {role === 'cliente' && !editable ? (
            <p className="vc-subtitle-small">Vista cliente: este paso es informativo y se actualiza con el progreso del taller.</p>
          ) : null}

          {showPendingForClient ? (
            <div className="vc-warning">
              <p>En proceso: este paso aún no tiene información cargada por el taller.</p>
            </div>
          ) : (
            <div className="vc-step-fields">
              {currentKey !== 'recepcion' ? (
                fields.map((field) => (
                  <div key={field.key}>
                    <label className="vc-label">{field.label}</label>
                    <div className="vc-input-wrap">
                      <input
                        value={formsByStep[currentKey]?.[field.key] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateField(field.key, value);
                          if (currentKey === 'aprobacion' && field.key === 'decisionCliente' && value.trim()) {
                            updateField('decisionClienteAt', new Date().toISOString());
                          }
                        }}
                        placeholder={field.placeholder}
                        disabled={!editable}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="vc-os-sections">
                  <button type="button" className="vc-accordion-toggle" onClick={() => toggleReceptionBlock('controlOrden')} aria-expanded={openReceptionBlocks.controlOrden}>
                    <span>Control de orden y cliente</span>
                    <span>{openReceptionBlocks.controlOrden ? '−' : '+'}</span>
                  </button>
                  {openReceptionBlocks.controlOrden ? (
                    <>
                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">No. orden</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.orderNumber || ''}
                            onChange={(e) => syncEntryPatch({ orderNumber: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">Fecha entrada</label>
                        <div className="vc-input-wrap">
                          <input
                            type="date"
                            value={String(entryForPlate?.fecha || '').slice(0, 10)}
                            onChange={(e) => syncEntryPatch({ fecha: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">Fecha prevista entrega</label>
                        <div className="vc-input-wrap">
                          <input
                            type="date"
                            value={entryForPlate?.expectedDeliveryDate || ''}
                            onChange={(e) => syncEntryPatch({ expectedDeliveryDate: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">Placa</label>
                        <div className="vc-input-wrap">
                          <input value={entryForPlate?.placa || plate} onChange={(e) => syncEntryPatch({ placa: e.target.value.toUpperCase() })} />
                        </div>
                      </div>
                    </div>

                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">Propietario</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.ownerName || entryForPlate?.cliente || ''}
                            onChange={(e) => syncEntryPatch({ ownerName: e.target.value, cliente: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">NIT / C.C</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.nitCc || ''}
                            onChange={(e) => syncEntryPatch({ nitCc: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">Empresa / Entidad</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.companyEntity || entryForPlate?.empresa || ''}
                            onChange={(e) => syncEntryPatch({ companyEntity: e.target.value, empresa: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">Dirección</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.direccion || ''}
                            onChange={(e) => syncEntryPatch({ direccion: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">Teléfono de contacto</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.telefono || ''}
                            onChange={(e) => syncEntryPatch({ telefono: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">E-mail</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.email || ''}
                            onChange={(e) => syncEntryPatch({ email: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>
                    </>
                  ) : null}

                  <button type="button" className="vc-accordion-toggle" onClick={() => toggleReceptionBlock('facturacion')} aria-expanded={openReceptionBlocks.facturacion}>
                    <span>Facturación</span>
                    <span>{openReceptionBlocks.facturacion ? '−' : '+'}</span>
                  </button>
                  {openReceptionBlocks.facturacion ? (
                    <>
                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">Factura a nombre de</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.invoiceName || ''}
                            onChange={(e) => syncEntryPatch({ invoiceName: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">NIT / C.C facturación</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.billingNitCc || ''}
                            onChange={(e) => syncEntryPatch({ billingNitCc: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">Forma de pago</label>
                        <div className="vc-input-wrap">
                          <select
                            className="vc-select"
                            value={entryForPlate?.paymentMethod || ''}
                            onChange={(e) => syncEntryPatch({ paymentMethod: e.target.value as Entry['paymentMethod'] })}
                            disabled={!editable}
                          >
                            <option value="">Seleccionar</option>
                            <option value="contado">Contado</option>
                            <option value="credito">Crédito</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">Días crédito</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.creditDays || ''}
                            onChange={(e) => syncEntryPatch({ creditDays: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>
                    </>
                  ) : null}

                  <button type="button" className="vc-accordion-toggle" onClick={() => toggleReceptionBlock('infoVehiculo')} aria-expanded={openReceptionBlocks.infoVehiculo}>
                    <span>Información del vehículo y recepción</span>
                    <span>{openReceptionBlocks.infoVehiculo ? '−' : '+'}</span>
                  </button>
                  {openReceptionBlocks.infoVehiculo ? (
                    <>
                    <div>
                      <label className="vc-label">Color</label>
                      <div className="vc-input-wrap">
                        <input
                          value={entryForPlate?.color || ''}
                          onChange={(e) => syncEntryPatch({ color: e.target.value })}
                          disabled={!editable}
                        />
                      </div>
                    </div>

                    <div className="vc-vehicle-fuel-layout">
                      <div>
                        <label className="vc-label">Marca</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.marca || ''}
                            onChange={(e) => syncEntryPatch({ marca: e.target.value })}
                            disabled={!editable}
                          />
                        </div>

                        <label className="vc-label">Modelo</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.modelo || ''}
                            onChange={(e) => syncEntryPatch({ modelo: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="vc-label">Nivel combustible</label>
                        <div className="vc-input-wrap vc-fuel-wrap">
                          <div className="vc-fuel-gauge">
                            <div className="vc-fuel-arc" />
                            <div className="vc-fuel-needle" style={{ transform: `translateX(-50%) rotate(${fuelNeedleAngle}deg)` }} />
                            <div className="vc-fuel-pivot" />
                            <span className="vc-fuel-mark vc-fuel-mark-e">E</span>
                            <span className="vc-fuel-mark vc-fuel-mark-f">F</span>
                          </div>
                          <div className="vc-fuel-level-row">
                            {FUEL_LEVELS.map((level) => (
                              <button
                                key={level.value}
                                type="button"
                                className={`vc-fuel-chip ${selectedFuelLevel === level.value ? 'is-active' : ''}`}
                                onClick={() => {
                                  setFuelLevelUi(level.value);
                                  syncEntryPatch({ fuelLevel: level.value });
                                }}
                                disabled={!editable}
                              >
                                {level.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">Kilometraje</label>
                        <div className="vc-input-wrap">
                          <input
                            value={formsByStep.recepcion?.kilometraje || ''}
                            onChange={(e) => syncStepPatch('recepcion', { kilometraje: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">Técnico asignado</label>
                        <div className="vc-input-wrap">
                          <input
                            value={formsByStep.recepcion?.tecnicoAsignado || ''}
                            onChange={(e) => {
                              syncStepPatch('recepcion', { tecnicoAsignado: e.target.value });
                              syncEntryPatch({ tecnicoAsignado: e.target.value });
                            }}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>

                    <label className="vc-label">Observaciones / Accesorios adicionales</label>
                    <div className="vc-input-wrap vc-input-wrap-emphasis">
                      <input
                        className="vc-input-emphasis"
                        value={formsByStep.recepcion?.observacionesAccesorios || ''}
                        onChange={(e) => syncStepPatch('recepcion', { observacionesAccesorios: e.target.value })}
                        disabled={!editable}
                      />
                    </div>

                    <label className="vc-label">Falla reportada por el cliente</label>
                    <div className="vc-input-wrap vc-input-wrap-emphasis">
                      <input
                        className="vc-input-emphasis"
                        value={formsByStep.recepcion?.fallaCliente || ''}
                        onChange={(e) => syncStepPatch('recepcion', { fallaCliente: e.target.value })}
                        disabled={!editable}
                      />
                    </div>

                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">¿Desea conservar piezas?</label>
                        <div className="vc-input-wrap">
                          <select
                            className="vc-select"
                            value={formsByStep.recepcion?.wantsOldParts || ''}
                            onChange={(e) => {
                              syncStepPatch('recepcion', { wantsOldParts: e.target.value });
                              syncEntryPatch({ wantsOldParts: e.target.value as Entry['wantsOldParts'] });
                            }}
                            disabled={!editable}
                          >
                            <option value="">Seleccionar</option>
                            <option value="SI">SI</option>
                            <option value="NO">NO</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">Reporte condición física</label>
                        <div className="vc-input-wrap">
                          <input
                            value={formsByStep.recepcion?.condicionFisica || ''}
                            onChange={(e) => {
                              syncStepPatch('recepcion', { condicionFisica: e.target.value });
                              syncEntryPatch({ condicionFisica: e.target.value });
                            }}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">SOAT (vencimiento)</label>
                        <div className="vc-input-wrap">
                          <input
                            type="date"
                            value={formsByStep.recepcion?.soatExpiry || entryForPlate?.soatExpiry || ''}
                            onChange={(e) => {
                              syncStepPatch('recepcion', { soatExpiry: e.target.value });
                              syncEntryPatch({ soatExpiry: e.target.value });
                            }}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">Tecnomecánica (vencimiento)</label>
                        <div className="vc-input-wrap">
                          <input
                            type="date"
                            value={formsByStep.recepcion?.rtmExpiry || entryForPlate?.rtmExpiry || ''}
                            onChange={(e) => {
                              syncStepPatch('recepcion', { rtmExpiry: e.target.value });
                              syncEntryPatch({ rtmExpiry: e.target.value });
                            }}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>
                    </>
                  ) : null}
                </div>
              )}

              {currentKey === 'recepcion' ? (
                <div>
                  <button type="button" className="vc-accordion-toggle" onClick={() => toggleReceptionBlock('inventario')} aria-expanded={openReceptionBlocks.inventario}>
                    <span>Inventario de accesorios</span>
                    <span>{openReceptionBlocks.inventario ? '−' : '+'}</span>
                  </button>
                  {openReceptionBlocks.inventario ? (
                    <>
                    <p className="vc-subtitle-small vc-inventory-legend">
                      S: Sí / N: No / C: Completo / I: Incompleto
                    </p>
                    <div className="vc-grid-2">
                      {INVENTORY_ITEMS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="vc-input-wrap"
                          style={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 10,
                            alignItems: 'center',
                            textAlign: 'left',
                            opacity: editable ? 1 : 0.72,
                            cursor: editable ? 'pointer' : 'not-allowed',
                          }}
                          disabled={!editable}
                          onClick={() => setInventoryValue(item, nextInventoryValue(inventory[item] || ''))}
                          aria-label={`Cambiar estado de ${item}`}
                          title="Click para cambiar entre -, S, N, C, I"
                        >
                          <span className="vc-os-inventory-item-label">{item}</span>
                          <strong className="vc-os-inventory-item-value">{inventory[item] || '-'}</strong>
                        </button>
                      ))}
                    </div>
                    </>
                  ) : null}

                  <button type="button" className="vc-accordion-toggle" onClick={() => toggleReceptionBlock('fotos')} aria-expanded={openReceptionBlocks.fotos}>
                    <span>Registro fotográfico por ángulo</span>
                    <span>{openReceptionBlocks.fotos ? '−' : '+'}</span>
                  </button>
                  {openReceptionBlocks.fotos ? (
                    <>
                      <p className="vc-subtitle-small" style={{ marginTop: 4 }}>Sube o toma una foto por recuadro (superior, inferior, laterales, frontal y trasero).</p>

                      <div className="vc-photo-grid" style={{ marginTop: 10 }}>
                        {PHOTO_SLOTS.map((slot) => {
                          const src = receptionPhotos[slot.key];
                          const inputId = `upload-photo-${slot.key}`;
                          return (
                            <div key={slot.key} className="vc-photo-item">
                              <p className="vc-photo-label">{slot.label}</p>

                              {editable ? (
                                <>
                                  <input
                                    id={inputId}
                                    className="vc-file-hidden-input"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => {
                                      void onPickReceptionPhoto(slot.key, e.target.files?.[0]);
                                      e.currentTarget.value = '';
                                    }}
                                  />
                                  <label htmlFor={inputId} className="vc-btn vc-photo-upload-btn">
                                    Subir foto
                                  </label>
                                </>
                              ) : null}

                              {src ? (
                                <>
                                  <img src={src} alt={'Foto ' + slot.label} className="vc-photo-preview" />
                                  {editable ? (
                                    <button type="button" className="vc-btn" style={{ marginTop: 6 }} onClick={() => removeReceptionPhoto(slot.key)}>
                                      Quitar
                                    </button>
                                  ) : null}
                                </>
                              ) : (
                                <div className="vc-photo-empty">Sin imagen</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {uploadError ? <div className="vc-error" style={{ marginTop: 8 }}>{uploadError}</div> : null}
                    </>
                  ) : null}

                  <button type="button" className="vc-accordion-toggle" onClick={() => toggleReceptionBlock('firmas')} aria-expanded={openReceptionBlocks.firmas}>
                    <span>Firmas</span>
                    <span>{openReceptionBlocks.firmas ? '−' : '+'}</span>
                  </button>
                  {openReceptionBlocks.firmas ? (
                    <div className="vc-grid-2" style={{ marginTop: 10 }}>
                      <div>
                        <label className="vc-label">Firma cliente / empresa</label>
                        <div className="vc-signature-box">
                          <canvas
                            ref={(node) => { signatureCanvasRefs.current.cliente = node; }}
                            className="vc-signature-canvas"
                            onPointerDown={(e) => handleSignaturePointerDown('cliente', e)}
                            onPointerMove={(e) => handleSignaturePointerMove('cliente', e)}
                            onPointerUp={(e) => handleSignaturePointerUp('cliente', e)}
                            onPointerLeave={(e) => handleSignaturePointerUp('cliente', e)}
                          />
                          <div className="vc-signature-actions">
                            <button type="button" className="vc-btn" onClick={() => clearSignature('cliente')} disabled={!editable}>
                              Limpiar
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">Firma taller (quien recibe)</label>
                        <div className="vc-signature-box">
                          <canvas
                            ref={(node) => { signatureCanvasRefs.current.taller = node; }}
                            className="vc-signature-canvas"
                            onPointerDown={(e) => handleSignaturePointerDown('taller', e)}
                            onPointerMove={(e) => handleSignaturePointerMove('taller', e)}
                            onPointerUp={(e) => handleSignaturePointerUp('taller', e)}
                            onPointerLeave={(e) => handleSignaturePointerUp('taller', e)}
                          />
                          <div className="vc-signature-actions">
                            <button type="button" className="vc-btn" onClick={() => clearSignature('taller')} disabled={!editable}>
                              Limpiar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {currentKey === 'cotizacion_formal' ? (
                <div className="vc-card" style={{ padding: 12 }}>
                  <h3 style={{ marginBottom: 8 }}>Items de cotización</h3>
                  <div className="vc-table-wrap vc-table-wrap--desktop">
                    <table className="vc-table">
                      <thead>
                        <tr>
                          <th>Sistema</th>
                          <th>Trabajo o repuesto</th>
                          <th>Valor unitario</th>
                          <th>Cantidad</th>
                          <th>Total línea</th>
                          {editable ? <th /> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {quoteRows.map((row, idx) => {
                          const line = toNumberSafe(row.unitPrice) * toNumberSafe(row.qty || '1');
                          return (
                            <tr key={`q-${idx}`}>
                              <td><input disabled={!editable} value={row.sistema} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], sistema: e.target.value };
                                setQuoteRows(next);
                              }} /></td>
                              <td><input disabled={!editable} value={row.trabajo} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], trabajo: e.target.value };
                                setQuoteRows(next);
                              }} /></td>
                              <td><input disabled={!editable} value={row.unitPrice} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], unitPrice: e.target.value };
                                setQuoteRows(next);
                              }} /></td>
                              <td><input disabled={!editable} value={row.qty} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], qty: e.target.value };
                                setQuoteRows(next);
                              }} /></td>
                              <td>${asMoney(line)}</td>
                              {editable ? (
                                <td>
                                  <button type="button" className="vc-btn" onClick={() => {
                                    const next = quoteRows.filter((_, i) => i !== idx);
                                    setQuoteRows(next.length ? next : [{ sistema: '', trabajo: '', unitPrice: '', qty: '1' }]);
                                  }}>-</button>
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="vc-quote-mobile-list">
                    {quoteRows.map((row, idx) => {
                      const line = toNumberSafe(row.unitPrice) * toNumberSafe(row.qty || '1');
                      return (
                        <article key={`qm-${idx}`} className="vc-quote-mobile-card">
                          <div>
                            <label className="vc-label">Sistema</label>
                            <div className="vc-input-wrap">
                              <input disabled={!editable} value={row.sistema} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], sistema: e.target.value };
                                setQuoteRows(next);
                              }} />
                            </div>
                          </div>
                          <div>
                            <label className="vc-label">Trabajo o repuesto</label>
                            <div className="vc-input-wrap">
                              <input disabled={!editable} value={row.trabajo} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], trabajo: e.target.value };
                                setQuoteRows(next);
                              }} />
                            </div>
                          </div>
                          <div className="vc-grid-2 vc-grid-2--mobile">
                            <div>
                              <label className="vc-label">Valor unitario</label>
                              <div className="vc-input-wrap">
                                <input disabled={!editable} value={row.unitPrice} onChange={(e) => {
                                  const next = [...quoteRows];
                                  next[idx] = { ...next[idx], unitPrice: e.target.value };
                                  setQuoteRows(next);
                                }} />
                              </div>
                            </div>
                            <div>
                              <label className="vc-label">Cantidad</label>
                              <div className="vc-input-wrap">
                                <input disabled={!editable} value={row.qty} onChange={(e) => {
                                  const next = [...quoteRows];
                                  next[idx] = { ...next[idx], qty: e.target.value };
                                  setQuoteRows(next);
                                }} />
                              </div>
                            </div>
                          </div>

                          <div className="vc-summary-grid" style={{ marginTop: 6 }}>
                            <span>Total línea</span><strong>${asMoney(line)}</strong>
                          </div>

                          {editable ? (
                            <button type="button" className="vc-btn" onClick={() => {
                              const next = quoteRows.filter((_, i) => i !== idx);
                              setQuoteRows(next.length ? next : [{ sistema: '', trabajo: '', unitPrice: '', qty: '1' }]);
                            }}>Quitar ítem</button>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>

                  {editable ? (
                    <button type="button" className="vc-btn" onClick={() => setQuoteRows([...quoteRows, { sistema: '', trabajo: '', unitPrice: '', qty: '1' }])}>+ Agregar ítem</button>
                  ) : null}

                  <div className="vc-summary-grid" style={{ marginTop: 8 }}>
                    <span>Subtotal</span><strong>${asMoney(toNumberSafe(formsByStep.cotizacion_formal?.cotizacionSubtotal || '0'))}</strong>
                    <span>IVA 19%</span><strong>${asMoney(toNumberSafe(formsByStep.cotizacion_formal?.cotizacionIva || '0'))}</strong>
                    <span>Total</span><strong>${asMoney(toNumberSafe(formsByStep.cotizacion_formal?.cotizacionTotal || '0'))}</strong>
                  </div>
                </div>
              ) : null}

              {currentKey === 'trabajo' ? (
                <div className="vc-card" style={{ padding: 12 }}>
                  <h3 style={{ marginBottom: 8 }}>Formato de gastos</h3>
                  <div className="vc-table-wrap">
                    <table className="vc-table">
                      <thead>
                        <tr>
                          <th>Actividad</th>
                          <th>Tercero</th>
                          <th>Cantidad</th>
                          <th>Operario</th>
                          <th>Costo</th>
                          {editable ? <th /> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {expenseRows.map((row, idx) => (
                          <tr key={`g-${idx}`}>
                            <td><input disabled={!editable} value={row.actividad} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], actividad: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            <td><input disabled={!editable} value={row.tercero} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], tercero: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            <td><input disabled={!editable} value={row.cantidad} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], cantidad: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            <td><input disabled={!editable} value={row.operario} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], operario: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            <td><input disabled={!editable} value={row.costo} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], costo: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            {editable ? (
                              <td>
                                <button type="button" className="vc-btn" onClick={() => {
                                  const next = expenseRows.filter((_, i) => i !== idx);
                                  setExpenseRows(next.length ? next : [{ actividad: '', tercero: '', cantidad: '1', operario: '', costo: '' }]);
                                }}>-</button>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {editable ? (
                    <button type="button" className="vc-btn" onClick={() => setExpenseRows([...expenseRows, { actividad: '', tercero: '', cantidad: '1', operario: '', costo: '' }])}>+ Agregar gasto</button>
                  ) : null}

                  <div className="vc-summary-grid" style={{ marginTop: 8 }}>
                    <span>Total operario</span><strong>${asMoney(toNumberSafe(formsByStep.trabajo?.expenseOperarioTotal || '0'))}</strong>
                    <span>Total costo</span><strong>${asMoney(toNumberSafe(formsByStep.trabajo?.expenseCostoTotal || '0'))}</strong>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="vc-wizard-actions">
            <button
              className="vc-btn"
              disabled={stepPos === 0}
              onClick={() => {
                setValidationError('');
                setStepPos((s) => Math.max(0, s - 1));
              }}
            >
              Anterior
            </button>
            <button
              className="vc-login-btn vc-wizard-next"
              onClick={handleNextStep}
            >
              {stepPos === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
          {validationError ? <div className="vc-error" style={{ marginTop: 8 }}>{validationError}</div> : null}
        </section>
      </section>

      <BottomNav active="process" />
    </main>
  );
}
