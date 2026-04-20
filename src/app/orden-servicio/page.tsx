'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { FlowHeader } from '@/components/FlowHeader';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { canEditStep, getFormsForPlate, getRoleSteps, setStepField, setStepFields } from '@/lib/orderForms';
import { getCurrentEntry, getEntries, getRole, getSession, setEntries, type Entry, type Role } from '@/lib/storage';

type FieldDef = { key: string; label: string; placeholder: string };
type QuoteRow = { sistema: string; trabajo: string; unitPrice: string; qty: string };
type ExpenseRow = { actividad: string; tercero: string; cantidad: string; operario: string; costo: string };

type InventoryValue = 'S' | 'N' | 'C' | 'I' | '';

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
  const editable = current ? canEditStep(role, current.key) : false;
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
    [plate, formsByStep],
  );

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
                onClick={() => setStepPos(idx)}
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
                <div className="space-y-3">
                  <details open>
                    <summary className="vc-label" style={{ cursor: 'pointer', marginBottom: 8 }}>Control de orden y cliente</summary>
                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">No. orden</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.orderNumber || ''}
                            onChange={(e) => syncEntryPatch({ orderNumber: e.target.value })}
                            disabled={!editable}
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
                          <input value={entryForPlate?.placa || plate} disabled />
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
                  </details>

                  <details>
                    <summary className="vc-label" style={{ cursor: 'pointer', marginBottom: 8 }}>Facturación</summary>
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
                  </details>

                  <details>
                    <summary className="vc-label" style={{ cursor: 'pointer', marginBottom: 8 }}>Información del vehículo y recepción</summary>
                    <div className="vc-grid-2">
                      <div>
                        <label className="vc-label">Marca</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.marca || ''}
                            onChange={(e) => syncEntryPatch({ marca: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="vc-label">Modelo</label>
                        <div className="vc-input-wrap">
                          <input
                            value={entryForPlate?.modelo || ''}
                            onChange={(e) => syncEntryPatch({ modelo: e.target.value })}
                            disabled={!editable}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="vc-grid-2">
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
                      <div>
                        <label className="vc-label">Nivel combustible</label>
                        <div className="vc-input-wrap">
                          <select
                            className="vc-select"
                            value={entryForPlate?.fuelLevel || ''}
                            onChange={(e) => syncEntryPatch({ fuelLevel: e.target.value })}
                            disabled={!editable}
                          >
                            <option value="">Seleccionar</option>
                            <option value="E">E</option>
                            <option value="1/4">1/4</option>
                            <option value="1/2">1/2</option>
                            <option value="3/4">3/4</option>
                            <option value="F">F</option>
                          </select>
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
                    <div className="vc-input-wrap">
                      <input
                        value={formsByStep.recepcion?.observacionesAccesorios || ''}
                        onChange={(e) => syncStepPatch('recepcion', { observacionesAccesorios: e.target.value })}
                        disabled={!editable}
                      />
                    </div>

                    <label className="vc-label">Falla reportada por el cliente</label>
                    <div className="vc-input-wrap">
                      <input
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
                  </details>
                </div>
              )}

              {currentKey === 'recepcion' ? (
                <div>
                  <label className="vc-label">Inventario de accesorios (S/N/C/I)</label>
                  <div className="vc-grid-2">
                    {INVENTORY_ITEMS.map((item) => (
                      <div key={item} className="vc-input-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--vc-muted)', textTransform: 'capitalize' }}>{item}</span>
                        <select
                          className="vc-select"
                          value={inventory[item] || ''}
                          disabled={!editable}
                          onChange={(e) => setInventoryValue(item, e.target.value as InventoryValue)}
                        >
                          <option value="">-</option>
                          <option value="S">S</option>
                          <option value="N">N</option>
                          <option value="C">C</option>
                          <option value="I">I</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  <label className="vc-label" style={{ marginTop: 12 }}>Registro fotográfico por ángulo</label>
                  <p className="vc-subtitle-small" style={{ marginTop: 4 }}>Sube o toma una foto por recuadro (superior, inferior, laterales, frontal y trasero).</p>

                  <div className="vc-photo-grid" style={{ marginTop: 10 }}>
                    {PHOTO_SLOTS.map((slot) => {
                      const src = receptionPhotos[slot.key];
                      return (
                        <div key={slot.key} className="vc-photo-item">
                          <p className="vc-photo-label">{slot.label}</p>

                          {editable ? (
                            <div className="vc-input-wrap">
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => {
                                  void onPickReceptionPhoto(slot.key, e.target.files?.[0]);
                                  e.currentTarget.value = '';
                                }}
                              />
                            </div>
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
            <button className="vc-btn" disabled={stepPos === 0} onClick={() => setStepPos((s) => Math.max(0, s - 1))}>
              Anterior
            </button>
            <button
              className="vc-login-btn vc-wizard-next"
              onClick={() => setStepPos((s) => Math.min(Math.max(steps.length - 1, 0), s + 1))}
            >
              {stepPos === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </section>
      </section>

      <BottomNav active="process" />
    </main>
  );
}
