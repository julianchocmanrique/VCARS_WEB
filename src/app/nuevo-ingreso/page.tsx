'use client';

import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { FlowHeader } from '@/components/FlowHeader';
import { ActionButton, type ActionButtonState } from '@/components/ui/ActionButton';
import { ActionFeedback, type ActionFeedbackType } from '@/components/ui/ActionFeedback';
import { createIngreso } from '@/lib/api';
import { uploadServiceOrderAsset } from '@/lib/orderFormsBackend';
import { setStepFields } from '@/lib/orderForms';
import { getEntries, setCurrentEntry, setEntries, type Entry } from '@/lib/storage';

type HolderType = 'cliente' | 'empresa';
type InventoryValue = 'S' | 'N' | 'C' | 'I' | '';
type PaymentMethod = 'contado' | 'credito' | 'transferencia' | '';

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const PHOTO_SLOTS = [
  { key: 'superior', label: 'Superior' },
  { key: 'inferior', label: 'Inferior' },
  { key: 'lateralDerecho', label: 'Lateral derecho' },
  { key: 'lateralIzquierdo', label: 'Lateral izquierdo' },
  { key: 'frontal', label: 'Frontal' },
  { key: 'trasero', label: 'Trasero' },
] as const;

const FUEL_LEVELS = [
  { value: 'E', label: 'E', ratio: 0 },
  { value: '1/4', label: '1/4', ratio: 0.25 },
  { value: '1/2', label: '1/2', ratio: 0.5 },
  { value: '3/4', label: '3/4', ratio: 0.75 },
  { value: 'F', label: 'F', ratio: 1 },
] as const;

const INVENTORY_ITEMS = [
  { key: 'radio', label: 'Radio' },
  { key: 'cds', label: "CD's" },
  { key: 'encendedor', label: 'Encendedor' },
  { key: 'ceniceros', label: 'Ceniceros' },
  { key: 'reloj', label: 'Reloj' },
  { key: 'cinturon', label: 'Cinturón de seguridad' },
  { key: 'tapetes', label: 'Tapetes' },
  { key: 'parasoles', label: 'Parasoles' },
  { key: 'forros', label: 'Forros' },
  { key: 'lucesTecho', label: 'Luces techo' },
  { key: 'espejos', label: 'Espejos' },
  { key: 'chapas', label: 'Chapas' },
  { key: 'kitCarretera', label: 'Kit carretera' },
  { key: 'llantaRepuesto', label: 'Llanta repuesto' },
  { key: 'herramienta', label: 'Herramienta' },
  { key: 'gatoPalanca', label: 'Gato-palanca' },
  { key: 'llaveros', label: 'Llaveros' },
  { key: 'pernos', label: 'Pernos' },
  { key: 'senales', label: 'Señales' },
  { key: 'antena', label: 'Antena' },
  { key: 'plumillas', label: 'Plumillas' },
  { key: 'exploradoras', label: 'Exploradoras' },
  { key: 'tercerStop', label: 'Tercer stop' },
  { key: 'tapaGasolina', label: 'Tapa gasolina' },
  { key: 'copasRuedas', label: 'Copas ruedas' },
  { key: 'manijas', label: 'Manijas' },
  { key: 'controlRemoto', label: 'Control remoto' },
  { key: 'lavaVidrio', label: 'Llavero/lava vidrio' },
  { key: 'tarjetaPropiedad', label: 'Tarjeta de propiedad' },
] as const;

type PhotoSlotKey = (typeof PHOTO_SLOTS)[number]['key'];
type DateFieldKey = 'entryDate' | 'expectedDeliveryDate' | 'soatExpiry' | 'rtmExpiry';
type FuelLevelValue = (typeof FUEL_LEVELS)[number]['value'];

const EMPTY_INTAKE_PHOTOS: Record<PhotoSlotKey, string> = {
  superior: '',
  inferior: '',
  lateralDerecho: '',
  lateralIzquierdo: '',
  frontal: '',
  trasero: '',
};

type FeedbackState = {
  type: ActionFeedbackType;
  message: string;
} | null;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const t = String(now.getTime()).slice(-4);
  return `OS-${y}${m}${d}-${t}`;
}

const INVENTORY_VALUE_SEQUENCE: InventoryValue[] = ['', 'S', 'N', 'C', 'I'];

function nextInventoryValue(value: InventoryValue): InventoryValue {
  const index = INVENTORY_VALUE_SEQUENCE.indexOf(value);
  return INVENTORY_VALUE_SEQUENCE[(index + 1) % INVENTORY_VALUE_SEQUENCE.length];
}

function normalizeFuelLevel(raw?: string): FuelLevelValue {
  const value = String(raw || '').trim().toUpperCase();
  if (value === 'E' || value === '1/4' || value === '1/2' || value === '3/4' || value === 'F') return value;
  if (value === 'EMPTY') return 'E';
  if (value === 'FULL') return 'F';
  return '1/2';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout en ${label}`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function uploadReceptionPhotos(
  plate: string,
  photosByZone: Record<PhotoSlotKey, string>,
): Promise<Record<PhotoSlotKey, string>> {
  const uploaded: Record<PhotoSlotKey, string> = { ...photosByZone };
  for (const slot of PHOTO_SLOTS) {
    const source = String(photosByZone[slot.key] || '');
    if (!source.startsWith('data:image/')) continue;
    try {
      const asset = await withTimeout(
        uploadServiceOrderAsset(plate, 'recepcion', `photo_${slot.key}`, source),
        15000,
        `subida de foto ${slot.label}`,
      );
      uploaded[slot.key] = asset.url;
    } catch {
      // Keep fallback value if upload fails.
    }
  }
  return uploaded;
}

export default function NuevoIngresoPage() {
  const router = useRouter();
  const dateInputRefs = useRef<Record<DateFieldKey, HTMLInputElement | null>>({
    entryDate: null,
    expectedDeliveryDate: null,
    soatExpiry: null,
    rtmExpiry: null,
  });

  const [orderNumber, setOrderNumber] = useState(buildOrderNumber());
  const [entryDate, setEntryDate] = useState(todayISO());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  const [placa, setPlaca] = useState('');
  const [holderType, setHolderType] = useState<HolderType>('cliente');
  const [holderName, setHolderName] = useState('');
  const [companyEntity, setCompanyEntity] = useState('');
  const [nitCc, setNitCc] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const [invoiceName, setInvoiceName] = useState('');
  const [billingNitCc, setBillingNitCc] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('contado');
  const [creditDays, setCreditDays] = useState('');
  const [transferChannel, setTransferChannel] = useState('');

  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [color, setColor] = useState('');
  const [fuelLevel, setFuelLevel] = useState<FuelLevelValue>('1/2');
  const [kilometraje, setKilometraje] = useState('');
  const [fallaCliente, setFallaCliente] = useState('');
  const [additionalAccessoriesNotes, setAdditionalAccessoriesNotes] = useState('');
  const [tecnicoAsignado, setTecnicoAsignado] = useState('');
  const [condicionFisica, setCondicionFisica] = useState('');

  const [recibio, setRecibio] = useState('');
  const [wantsOldParts, setWantsOldParts] = useState<'SI' | 'NO' | ''>('NO');
  const [soatExpiry, setSoatExpiry] = useState('');
  const [rtmExpiry, setRtmExpiry] = useState('');
  const [inventarioAccesorios, setInventarioAccesorios] = useState<Record<string, InventoryValue>>({});
  const [intakePhotosByZone, setIntakePhotosByZone] = useState<Record<PhotoSlotKey, string>>(EMPTY_INTAKE_PHOTOS);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitState, setSubmitState] = useState<ActionButtonState>('idle');
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const holderLabel = useMemo(() => (holderType === 'empresa' ? 'Responsable / representante' : 'Propietario'), [holderType]);
  const vehiculo = useMemo(() => [marca.trim(), modelo.trim()].filter(Boolean).join(' '), [marca, modelo]);
  const fuelNeedleAngle = useMemo(() => {
    const match = FUEL_LEVELS.find((item) => item.value === fuelLevel);
    const ratio = match ? match.ratio : 0.5;
    const deg = -90 + ratio * 180;
    return `${deg}deg`;
  }, [fuelLevel]);

  async function onPickImage(slot: PhotoSlotKey, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      const message = `La imagen ${file.name} supera 3MB. Súbela más liviana.`;
      setError(message);
      setSubmitState('error');
      setFeedback({ type: 'error', message });
      e.target.value = '';
      return;
    }

    try {
      const encoded = await fileToDataUrl(file);
      setIntakePhotosByZone((prev) => ({ ...prev, [slot]: encoded }));
      setError('');
      setSubmitState('idle');
      setFeedback(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar la imagen.';
      setError(message);
      setSubmitState('error');
      setFeedback({ type: 'error', message });
    } finally {
      e.target.value = '';
    }
  }

  function removePhoto(slot: PhotoSlotKey) {
    setIntakePhotosByZone((prev) => ({ ...prev, [slot]: '' }));
    setSubmitState('idle');
    setFeedback(null);
  }

  function setInventoryValue(itemKey: string, value: InventoryValue) {
    setInventarioAccesorios((prev) => ({ ...prev, [itemKey]: value }));
  }

  function registerDateInputRef(key: DateFieldKey, node: HTMLInputElement | null) {
    dateInputRefs.current[key] = node;
  }

  function openDatePicker(key: DateFieldKey) {
    const input = dateInputRefs.current[key];
    if (!input) return;
    try {
      input.showPicker?.();
    } catch {
      // some browsers block showPicker; focus/click fallback
    }
    input.focus();
    input.click();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!orderNumber.trim() || !entryDate.trim() || !placa.trim() || !holderName.trim() || !telefono.trim() || !vehiculo.trim() || !recibio.trim()) {
      const message = 'Completa los campos obligatorios para guardar la orden de servicio.';
      setError(message);
      setSubmitState('error');
      setFeedback({ type: 'error', message });
      setTimeout(() => setSubmitState('idle'), 700);
      return;
    }

    if (paymentMethod === 'credito' && !creditDays.trim()) {
      const message = 'Si la forma de pago es crédito, debes indicar los días de crédito.';
      setError(message);
      setSubmitState('error');
      setFeedback({ type: 'error', message });
      setTimeout(() => setSubmitState('idle'), 700);
      return;
    }
    if (paymentMethod === 'transferencia' && !transferChannel.trim()) {
      const message = 'Si la forma de pago es transferencia, debes seleccionar el medio de transferencia.';
      setError(message);
      setSubmitState('error');
      setFeedback({ type: 'error', message });
      setTimeout(() => setSubmitState('idle'), 700);
      return;
    }

    setSaving(true);
    setSubmitState('loading');
    setFeedback(null);
    setError('');

    try {
      let backend: { vehicle?: { id?: string }; entry?: { id?: string } } | null = null;
      try {
        backend = await withTimeout(
          createIngreso({
            plate: placa.trim().toUpperCase(),
            customerName: holderName.trim(),
            customerPhone: telefono.trim(),
            customerEmail: email.trim(),
            vehicleModel: vehiculo.trim(),
            vehicleColor: color.trim(),
            receivedBy: recibio.trim(),
            notes: fallaCliente.trim(),
            mileageKm: kilometraje.trim() ? Number(kilometraje) : undefined,
            fuelLevel: fuelLevel.trim(),
          }),
          20000,
          'creación de ingreso',
        );
      } catch {
        backend = null;
      }

      const normalizedPlate = placa.trim().toUpperCase();
      const persistedPhotos = backend
        ? await withTimeout(uploadReceptionPhotos(normalizedPlate, intakePhotosByZone), 35000, 'subida de evidencias')
        : intakePhotosByZone;

      const nowISO = new Date().toISOString();
      const inventarioSerialized = JSON.stringify(inventarioAccesorios);

      const payload: Entry = {
        id: `entry-${Date.now()}`,
        orderNumber: orderNumber.trim(),
        placa: normalizedPlate,
        cliente: holderName.trim(),
        ownerName: holderName.trim(),
        companyEntity: companyEntity.trim(),
        empresa: holderType === 'empresa' ? (companyEntity.trim() || holderName.trim()) : '',
        nitCc: nitCc.trim(),
        direccion: direccion.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        vehiculo: vehiculo.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        color: color.trim(),
        invoiceName: invoiceName.trim() || holderName.trim(),
        billingNitCc: billingNitCc.trim(),
        paymentMethod,
        creditDays: paymentMethod === 'credito' ? creditDays.trim() : '',
        transferChannel: paymentMethod === 'transferencia' ? transferChannel.trim() : '',
        fuelLevel: fuelLevel.trim(),
        receivedBy: recibio.trim(),
        tecnicoAsignado: tecnicoAsignado.trim(),
        additionalAccessoriesNotes: additionalAccessoriesNotes.trim(),
        condicionFisica: condicionFisica.trim(),
        inventarioAccesorios: inventarioSerialized,
        expectedDeliveryDate: expectedDeliveryDate.trim(),
        soatExpiry: soatExpiry.trim(),
        rtmExpiry: rtmExpiry.trim(),
        wantsOldParts,
        intakePhotosByZone: persistedPhotos,
        intakePhotos: PHOTO_SLOTS.map((slot) => persistedPhotos[slot.key]).filter(Boolean),
        paso: 'Orden de servicio',
        stepIndex: 0,
        status: 'active',
        fecha: entryDate.trim() || nowISO,
        updatedAt: nowISO,
        backend: backend
          ? {
              vehicleId: backend.vehicle?.id,
              entryId: backend.entry?.id || null,
            }
          : undefined,
      };

      setStepFields(payload.placa, 'recepcion', {
        entry_orderNumber: payload.orderNumber || '',
        entry_fecha: payload.fecha || '',
        entry_expectedDeliveryDate: payload.expectedDeliveryDate || '',
        entry_placa: payload.placa || '',
        entry_ownerName: payload.ownerName || '',
        entry_cliente: payload.cliente || '',
        entry_nitCc: payload.nitCc || '',
        entry_companyEntity: payload.companyEntity || '',
        entry_empresa: payload.empresa || '',
        entry_direccion: payload.direccion || '',
        entry_telefono: payload.telefono || '',
        entry_email: payload.email || '',
        entry_invoiceName: payload.invoiceName || '',
        entry_billingNitCc: payload.billingNitCc || '',
        entry_paymentMethod: payload.paymentMethod || '',
        entry_transferChannel: payload.transferChannel || '',
        entry_creditDays: payload.creditDays || '',
        entry_color: payload.color || '',
        entry_marca: payload.marca || '',
        entry_modelo: payload.modelo || '',
        entry_fuelLevel: payload.fuelLevel || '',
        fallaCliente: fallaCliente.trim(),
        kilometraje: kilometraje.trim(),
        tecnicoAsignado: tecnicoAsignado.trim(),
        wantsOldParts: wantsOldParts.trim(),
        soatExpiry: soatExpiry.trim(),
        rtmExpiry: rtmExpiry.trim(),
        condicionFisica: condicionFisica.trim(),
        observacionesAccesorios: additionalAccessoriesNotes.trim(),
        inventarioAccesorios: inventarioSerialized,
        photo_superior: persistedPhotos.superior || '',
        photo_inferior: persistedPhotos.inferior || '',
        photo_lateralDerecho: persistedPhotos.lateralDerecho || '',
        photo_lateralIzquierdo: persistedPhotos.lateralIzquierdo || '',
        photo_frontal: persistedPhotos.frontal || '',
        photo_trasero: persistedPhotos.trasero || '',
        photo_verified_superior: persistedPhotos.superior ? 'SI' : '',
        photo_verified_inferior: persistedPhotos.inferior ? 'SI' : '',
        photo_verified_lateralDerecho: persistedPhotos.lateralDerecho ? 'SI' : '',
        photo_verified_lateralIzquierdo: persistedPhotos.lateralIzquierdo ? 'SI' : '',
        photo_verified_frontal: persistedPhotos.frontal ? 'SI' : '',
        photo_verified_trasero: persistedPhotos.trasero ? 'SI' : '',
        photo_verified_source_superior: persistedPhotos.superior ? 'AUTO' : '',
        photo_verified_source_inferior: persistedPhotos.inferior ? 'AUTO' : '',
        photo_verified_source_lateralDerecho: persistedPhotos.lateralDerecho ? 'AUTO' : '',
        photo_verified_source_lateralIzquierdo: persistedPhotos.lateralIzquierdo ? 'AUTO' : '',
        photo_verified_source_frontal: persistedPhotos.frontal ? 'AUTO' : '',
        photo_verified_source_trasero: persistedPhotos.trasero ? 'AUTO' : '',
      });

      const list = getEntries();
      const next = [payload, ...list];
      setEntries(next);
      setCurrentEntry(payload);
      setSubmitState('success');
      setFeedback({ type: 'success', message: `Orden de servicio ${payload.placa} guardada correctamente.` });

      setTimeout(() => router.push('/ingreso-activo'), 260);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la orden de servicio.';
      setError(message);
      setSubmitState('error');
      setFeedback({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <FlowHeader subtitle="Nueva orden de servicio" />

        <form className="vc-form-card" onSubmit={onSubmit}>
          <h3 style={{ margin: '0 0 8px' }}>Control de orden</h3>
          <div className="vc-grid-2">
            <div>
              <label className="vc-label">No. orden *</label>
              <div className="vc-input-wrap">
                <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="OS-20260324-0001" />
              </div>
            </div>
            <div>
              <label className="vc-label">Fecha entrada *</label>
              <div className="vc-input-wrap" onClick={() => openDatePicker('entryDate')} style={{ cursor: 'pointer' }}>
                <input
                  ref={(node) => registerDateInputRef('entryDate', node)}
                  type="date"
                  value={entryDate}
                  onClick={() => openDatePicker('entryDate')}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Fecha prevista entrega</label>
              <div className="vc-input-wrap" onClick={() => openDatePicker('expectedDeliveryDate')} style={{ cursor: 'pointer' }}>
                <input
                  ref={(node) => registerDateInputRef('expectedDeliveryDate', node)}
                  type="date"
                  value={expectedDeliveryDate}
                  onClick={() => openDatePicker('expectedDeliveryDate')}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="vc-label">Placa *</label>
              <div className="vc-input-wrap">
                <input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC123" />
              </div>
            </div>
          </div>

          <h3 style={{ margin: '14px 0 8px' }}>Información del cliente</h3>
          <label className="vc-label">Tipo de titular</label>
          <div className="vc-chip-row" style={{ marginBottom: 10 }}>
            <button
              type="button"
              className="vc-chip"
              onClick={() => setHolderType('cliente')}
              aria-pressed={holderType === 'cliente'}
              style={holderType === 'cliente' ? { borderColor: 'var(--vc-accent)', color: 'var(--vc-accent-ink)' } : undefined}
            >
              Cliente
            </button>
            <button
              type="button"
              className="vc-chip"
              onClick={() => setHolderType('empresa')}
              aria-pressed={holderType === 'empresa'}
              style={holderType === 'empresa' ? { borderColor: 'var(--vc-accent)', color: 'var(--vc-accent-ink)' } : undefined}
            >
              Empresa
            </button>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">{holderLabel} *</label>
              <div className="vc-input-wrap">
                <input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Nombre completo del propietario" />
              </div>
            </div>
            <div>
              <label className="vc-label">NIT / C.C</label>
              <div className="vc-input-wrap">
                <input value={nitCc} onChange={(e) => setNitCc(e.target.value)} placeholder="901561193 / 1020..." />
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Empresa / entidad</label>
              <div className="vc-input-wrap">
                <input value={companyEntity} onChange={(e) => setCompanyEntity(e.target.value)} placeholder="Razón social (si aplica)" />
              </div>
            </div>
            <div>
              <label className="vc-label">Dirección</label>
              <div className="vc-input-wrap">
                <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección de contacto" />
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Teléfono de contacto *</label>
              <div className="vc-input-wrap">
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="3000000000" />
              </div>
            </div>
            <div>
              <label className="vc-label">E-mail</label>
              <div className="vc-input-wrap">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@dominio.com" />
              </div>
            </div>
          </div>

          <h3 style={{ margin: '14px 0 8px' }}>Facturación</h3>
          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Factura a nombre de</label>
              <div className="vc-input-wrap">
                <input value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} placeholder="Nombre facturación" />
              </div>
            </div>
            <div>
              <label className="vc-label">NIT / C.C facturación</label>
              <div className="vc-input-wrap">
                <input value={billingNitCc} onChange={(e) => setBillingNitCc(e.target.value)} placeholder="Documento de facturación" />
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Forma de pago</label>
              <div className="vc-input-wrap">
                <select
                  className="vc-select"
                  value={paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value as PaymentMethod;
                    setPaymentMethod(method);
                    if (method !== 'credito') setCreditDays('');
                    if (method !== 'transferencia') setTransferChannel('');
                  }}
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
            </div>
            <div>
              {paymentMethod === 'transferencia' ? (
                <>
                  <label className="vc-label">Medio de transferencia</label>
                  <div className="vc-input-wrap">
                    <select className="vc-select" value={transferChannel} onChange={(e) => setTransferChannel(e.target.value)}>
                      <option value="">Seleccionar</option>
                      <option value="Nequi">Nequi</option>
                      <option value="Daviplata">Daviplata</option>
                      <option value="Llave">Llave</option>
                      <option value="Transferencia bancaria">Transferencia bancaria</option>
                      <option value="PSE">PSE</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <label className="vc-label">Días de crédito</label>
                  <div className="vc-input-wrap">
                    <input
                      value={creditDays}
                      onChange={(e) => setCreditDays(e.target.value)}
                      placeholder={paymentMethod === 'credito' ? '30' : 'No aplica para contado'}
                      disabled={paymentMethod !== 'credito'}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <h3 style={{ margin: '14px 0 8px' }}>Información del vehículo</h3>
          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Marca *</label>
              <div className="vc-input-wrap">
                <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Mazda, Renault, Chevrolet..." />
              </div>
            </div>
            <div>
              <label className="vc-label">Modelo *</label>
              <div className="vc-input-wrap">
                <input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="3 Touring, Sandero..." />
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Color</label>
              <div className="vc-input-wrap">
                <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Azul / Gris / Blanco" />
              </div>
            </div>
            <div>
              <label className="vc-label">Kilometraje</label>
              <div className="vc-input-wrap">
                <input value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} placeholder="123456" />
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Nivel combustible</label>
              <div className="vc-input-wrap vc-fuel-wrap">
                <div className="vc-fuel-gauge">
                  <div className="vc-fuel-arc" />
                  <div className="vc-fuel-needle" style={{ transform: `translateX(-50%) rotate(${fuelNeedleAngle})` }} />
                  <div className="vc-fuel-pivot" />
                  <span className="vc-fuel-mark vc-fuel-mark-e">E</span>
                  <span className="vc-fuel-mark vc-fuel-mark-f">F</span>
                </div>
                <div className="vc-fuel-level-row">
                  {FUEL_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      className={`vc-fuel-chip ${fuelLevel === level.value ? 'is-active' : ''}`}
                      onClick={() => setFuelLevel(normalizeFuelLevel(level.value))}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="vc-label">Técnico asignado</label>
              <div className="vc-input-wrap">
                <input value={tecnicoAsignado} onChange={(e) => setTecnicoAsignado(e.target.value)} placeholder="Nombre del técnico" />
              </div>
            </div>
          </div>

          <label className="vc-label">Observaciones / accesorios adicionales</label>
          <div className="vc-input-wrap">
            <textarea
              value={additionalAccessoriesNotes}
              onChange={(e) => setAdditionalAccessoriesNotes(e.target.value)}
              placeholder="Detalle de observaciones visuales y accesorios adicionales"
              rows={3}
            />
          </div>

          <label className="vc-label">Falla reportada por el cliente (descripción de la anomalía)</label>
          <div className="vc-input-wrap">
            <textarea
              value={fallaCliente}
              onChange={(e) => setFallaCliente(e.target.value)}
              placeholder="Describe la falla o solicitud del cliente"
              rows={4}
            />
          </div>

          <label className="vc-label">Reporte condición física del auto</label>
          <div className="vc-input-wrap">
            <textarea
              value={condicionFisica}
              onChange={(e) => setCondicionFisica(e.target.value)}
              placeholder="Rayones, golpes y notas del estado físico al recibir"
              rows={3}
            />
          </div>

          <h3 style={{ margin: '14px 0 8px' }}>Recepción y documentos</h3>
          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Recibido por *</label>
              <div className="vc-input-wrap">
                <input value={recibio} onChange={(e) => setRecibio(e.target.value)} placeholder="Nombre del recepcionista" />
              </div>
            </div>
            <div>
              <label className="vc-label">¿Cliente conserva piezas cambiadas?</label>
              <div className="vc-input-wrap">
                <select className="vc-select" value={wantsOldParts} onChange={(e) => setWantsOldParts(e.target.value as 'SI' | 'NO' | '')}>
                  <option value="">Seleccionar</option>
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </select>
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">SOAT (vencimiento)</label>
              <div className="vc-input-wrap" onClick={() => openDatePicker('soatExpiry')} style={{ cursor: 'pointer' }}>
                <input
                  ref={(node) => registerDateInputRef('soatExpiry', node)}
                  type="date"
                  value={soatExpiry}
                  onClick={() => openDatePicker('soatExpiry')}
                  onChange={(e) => setSoatExpiry(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="vc-label">Rev. Tec. Mecánica (vencimiento)</label>
              <div className="vc-input-wrap" onClick={() => openDatePicker('rtmExpiry')} style={{ cursor: 'pointer' }}>
                <input
                  ref={(node) => registerDateInputRef('rtmExpiry', node)}
                  type="date"
                  value={rtmExpiry}
                  onClick={() => openDatePicker('rtmExpiry')}
                  onChange={(e) => setRtmExpiry(e.target.value)}
                />
              </div>
            </div>
          </div>

          <h3 style={{ margin: '14px 0 8px' }}>Inventario de accesorios</h3>
          <p className="vc-subtitle-small" style={{ marginTop: 0 }}>
            S: Sí / N: No / C: Completo / I: Incompleto
          </p>
          <div className="vc-grid-2">
            {INVENTORY_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className="vc-input-wrap"
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onClick={() => setInventoryValue(item.key, nextInventoryValue(inventarioAccesorios[item.key] || ''))}
                aria-label={`Cambiar estado de ${item.label}`}
                title="Click para cambiar entre -, S, N, C, I"
              >
                <span style={{ fontSize: 12, color: 'var(--vc-muted)' }}>{item.label}</span>
                <strong>{inventarioAccesorios[item.key] || '-'}</strong>
              </button>
            ))}
          </div>

          <h3 style={{ margin: '14px 0 8px' }}>Evidencias de recepción (imágenes)</h3>
          <label className="vc-label">Carga una foto por cada ángulo (máx. 3MB por imagen)</label>
          <div className="vc-photo-grid" style={{ marginTop: 10 }}>
            {PHOTO_SLOTS.map((slot) => {
              const src = intakePhotosByZone[slot.key];
              const inputId = `new-upload-photo-${slot.key}`;
              return (
                <div key={slot.key} className="vc-photo-item">
                  <p className="vc-photo-label">{slot.label}</p>
                  <input
                    id={inputId}
                    className="vc-file-hidden-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => onPickImage(slot.key, e)}
                  />
                  <label htmlFor={inputId} className="vc-btn vc-photo-upload-btn">
                    Subir foto
                  </label>
                  {src ? (
                    <>
                      <img src={src} alt={`Foto ${slot.label}`} className="vc-photo-preview" />
                      <ActionButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        state="idle"
                        onClick={() => removePhoto(slot.key)}
                        className="mt-1.5 w-auto"
                      >
                        Quitar
                      </ActionButton>
                    </>
                  ) : (
                    <div className="vc-photo-empty">Sin imagen</div>
                  )}
                </div>
              );
            })}
          </div>

          <ActionFeedback show={Boolean(error)} type="error" message={error} />

          <ActionFeedback
            show={Boolean(feedback)}
            type={feedback?.type || 'info'}
            message={feedback?.message || ''}
          />

          <ActionButton type="submit" variant="primary" state={submitState} disabled={saving}>
            {saving ? 'Guardando orden de servicio...' : 'Guardar orden de servicio'}
          </ActionButton>
        </form>
      </section>

      <BottomNav active="new" />
    </main>
  );
}
