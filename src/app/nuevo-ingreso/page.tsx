'use client';

import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { FlowHeader } from '@/components/FlowHeader';
import { ActionButton, type ActionButtonState } from '@/components/ui/ActionButton';
import { ActionFeedback, type ActionFeedbackType } from '@/components/ui/ActionFeedback';
import { createIngreso } from '@/lib/api';
import { getEntries, setCurrentEntry, setEntries, type Entry } from '@/lib/storage';

type HolderType = 'cliente' | 'empresa';

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const PHOTO_SLOTS = [
  { key: 'superior', label: 'Superior' },
  { key: 'inferior', label: 'Inferior' },
  { key: 'lateralDerecho', label: 'Lateral derecho' },
  { key: 'lateralIzquierdo', label: 'Lateral izquierdo' },
  { key: 'frontal', label: 'Frontal' },
  { key: 'trasero', label: 'Trasero' },
] as const;

type PhotoSlotKey = (typeof PHOTO_SLOTS)[number]['key'];

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function NuevoIngresoPage() {
  const router = useRouter();

  const [orderNumber, setOrderNumber] = useState(buildOrderNumber());
  const [entryDate, setEntryDate] = useState(todayISO());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  const [placa, setPlaca] = useState('');
  const [holderType, setHolderType] = useState<HolderType>('cliente');
  const [holderName, setHolderName] = useState('');
  const [nitCc, setNitCc] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const [invoiceName, setInvoiceName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'contado' | 'credito' | ''>('contado');
  const [creditDays, setCreditDays] = useState('');

  const [vehiculo, setVehiculo] = useState('');
  const [color, setColor] = useState('');
  const [fuelLevel, setFuelLevel] = useState('1/2');
  const [kilometraje, setKilometraje] = useState('');
  const [fallaCliente, setFallaCliente] = useState('');

  const [recibio, setRecibio] = useState('');
  const [wantsOldParts, setWantsOldParts] = useState<'SI' | 'NO' | ''>('NO');
  const [soatExpiry, setSoatExpiry] = useState('');
  const [rtmExpiry, setRtmExpiry] = useState('');
  const [intakePhotosByZone, setIntakePhotosByZone] = useState<Record<PhotoSlotKey, string>>(EMPTY_INTAKE_PHOTOS);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitState, setSubmitState] = useState<ActionButtonState>('idle');
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const holderLabel = useMemo(() => (holderType === 'empresa' ? 'Empresa' : 'Cliente'), [holderType]);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!orderNumber.trim() || !entryDate.trim() || !placa.trim() || !holderName.trim() || !telefono.trim() || !vehiculo.trim() || !recibio.trim()) {
      const message = 'Completa los campos obligatorios para guardar el ingreso.';
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

    setSaving(true);
    setSubmitState('loading');
    setFeedback(null);
    setError('');

    let backend: { vehicle?: { id?: string }; entry?: { id?: string } } | null = null;
    try {
      backend = await createIngreso({
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
      });
    } catch {
      backend = null;
    }

    const nowISO = new Date().toISOString();
    const payload: Entry = {
      id: `entry-${Date.now()}`,
      orderNumber: orderNumber.trim(),
      placa: placa.trim().toUpperCase(),
      cliente: holderName.trim(),
      empresa: holderType === 'empresa' ? holderName.trim() : '',
      nitCc: nitCc.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      vehiculo: vehiculo.trim(),
      color: color.trim(),
      invoiceName: invoiceName.trim() || holderName.trim(),
      paymentMethod,
      creditDays: paymentMethod === 'credito' ? creditDays.trim() : '',
      fuelLevel: fuelLevel.trim(),
      receivedBy: recibio.trim(),
      expectedDeliveryDate: expectedDeliveryDate.trim(),
      soatExpiry: soatExpiry.trim(),
      rtmExpiry: rtmExpiry.trim(),
      wantsOldParts,
      intakePhotosByZone,
      intakePhotos: PHOTO_SLOTS.map((slot) => intakePhotosByZone[slot.key]).filter(Boolean),
      paso: 'Recepción (Ingreso)',
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

    const list = getEntries();
    const next = [payload, ...list];
    setEntries(next);
    setCurrentEntry(payload);
    setSubmitState('success');
    setFeedback({ type: 'success', message: `Ingreso ${payload.placa} guardado correctamente.` });

    setSaving(false);
    setTimeout(() => router.push('/ingreso-activo'), 260);
  }

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <FlowHeader subtitle="Nuevo ingreso" />

        <form className="vc-form-card" onSubmit={onSubmit}>
          <h3 style={{ margin: '0 0 8px' }}>Control de orden</h3>
          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Nro. orden *</label>
              <div className="vc-input-wrap">
                <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="OS-20260324-0001" />
              </div>
            </div>
            <div>
              <label className="vc-label">Fecha entrada *</label>
              <div className="vc-input-wrap">
                <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Fecha prevista entrega</label>
              <div className="vc-input-wrap">
                <input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="vc-label">Placa *</label>
              <div className="vc-input-wrap">
                <input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC123" />
              </div>
            </div>
          </div>

          <h3 style={{ margin: '14px 0 8px' }}>Titular y contacto</h3>
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
                <input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder={holderType === 'empresa' ? 'Nombre de empresa' : 'Nombre completo'} />
              </div>
            </div>
            <div>
              <label className="vc-label">NIT / CC</label>
              <div className="vc-input-wrap">
                <input value={nitCc} onChange={(e) => setNitCc(e.target.value)} placeholder="901561193 / 1020..." />
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Teléfono *</label>
              <div className="vc-input-wrap">
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="3000000000" />
              </div>
            </div>
            <div>
              <label className="vc-label">Correo</label>
              <div className="vc-input-wrap">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@dominio.com" />
              </div>
            </div>
          </div>

          <label className="vc-label">Dirección</label>
          <div className="vc-input-wrap">
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección de contacto" />
          </div>

          <h3 style={{ margin: '14px 0 8px' }}>Facturación</h3>
          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Facturar a nombre de</label>
              <div className="vc-input-wrap">
                <input value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} placeholder="Nombre facturación" />
              </div>
            </div>
            <div>
              <label className="vc-label">Forma de pago</label>
              <div className="vc-input-wrap">
                <select className="vc-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'contado' | 'credito' | '')}>
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
            </div>
          </div>

          {paymentMethod === 'credito' ? (
            <div>
              <label className="vc-label">Días crédito *</label>
              <div className="vc-input-wrap">
                <input value={creditDays} onChange={(e) => setCreditDays(e.target.value)} placeholder="30" />
              </div>
            </div>
          ) : null}

          <h3 style={{ margin: '14px 0 8px' }}>Vehículo y recepción</h3>
          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Marca / Modelo *</label>
              <div className="vc-input-wrap">
                <input value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} placeholder="Ej: Mazda 3 Touring" />
              </div>
            </div>
            <div>
              <label className="vc-label">Color</label>
              <div className="vc-input-wrap">
                <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Azul / Gris / Blanco" />
              </div>
            </div>
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Nivel combustible</label>
              <div className="vc-input-wrap">
                <select className="vc-select" value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)}>
                  <option value="E">E</option>
                  <option value="1/4">1/4</option>
                  <option value="1/2">1/2</option>
                  <option value="3/4">3/4</option>
                  <option value="F">F</option>
                </select>
              </div>
            </div>
            <div>
              <label className="vc-label">Kilometraje</label>
              <div className="vc-input-wrap">
                <input value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} placeholder="123456" />
              </div>
            </div>
          </div>

          <label className="vc-label">Falla reportada por el cliente</label>
          <div className="vc-input-wrap">
            <input value={fallaCliente} onChange={(e) => setFallaCliente(e.target.value)} placeholder="Describe la falla o solicitud" />
          </div>

          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Recibido por *</label>
              <div className="vc-input-wrap">
                <input value={recibio} onChange={(e) => setRecibio(e.target.value)} placeholder="Nombre del recepcionista" />
              </div>
            </div>
            <div>
              <label className="vc-label">¿Conservar piezas cambiadas?</label>
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
              <div className="vc-input-wrap">
                <input type="date" value={soatExpiry} onChange={(e) => setSoatExpiry(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="vc-label">Tecnomecánica (vencimiento)</label>
              <div className="vc-input-wrap">
                <input type="date" value={rtmExpiry} onChange={(e) => setRtmExpiry(e.target.value)} />
              </div>
            </div>
          </div>

          <h3 style={{ margin: '14px 0 8px' }}>Evidencias de ingreso (imágenes)</h3>
          <label className="vc-label">Carga una foto por cada ángulo (máx. 3MB por imagen)</label>
          <div className="vc-photo-grid" style={{ marginTop: 10 }}>
            {PHOTO_SLOTS.map((slot) => {
              const src = intakePhotosByZone[slot.key];
              return (
                <div key={slot.key} className="vc-photo-item">
                  <p className="vc-photo-label">{slot.label}</p>
                  <div className="vc-input-wrap">
                    <input type="file" accept="image/*" onChange={(e) => onPickImage(slot.key, e)} />
                  </div>
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
            {saving ? 'Guardando ingreso...' : 'Guardar ingreso'}
          </ActionButton>
        </form>
      </section>

      <BottomNav active="new" />
    </main>
  );
}
