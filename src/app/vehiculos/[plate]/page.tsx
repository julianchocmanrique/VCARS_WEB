'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getVehicleByPlate } from '@/lib/api';
import { apiVehicleToEntry } from '@/lib/mapper';
import { applyDemoEntries } from '@/lib/demoData';
import { getClientIdentity } from '@/lib/clientIdentity';
import { BottomNav } from '@/components/BottomNav';
import { FlowHeader } from '@/components/FlowHeader';
import { getEntries, getRole, getSession, setCurrentEntry, setEntries, type Entry, type Role } from '@/lib/storage';
import { ensureDemoFormsSeed, getFormsForPlate, getRoleSteps, isClientQuoteReady, setStepFields } from '@/lib/orderForms';
import { normalizeStepTitle, stepIndexFromTitle } from '@/lib/process';
import { getVehicleEvidencePhoto } from '@/lib/carPhoto';

const PHOTO_SLOTS = [
  { key: 'superior', label: 'Superior' },
  { key: 'inferior', label: 'Inferior' },
  { key: 'lateralDerecho', label: 'Lateral derecho' },
  { key: 'lateralIzquierdo', label: 'Lateral izquierdo' },
  { key: 'frontal', label: 'Frontal' },
  { key: 'trasero', label: 'Trasero' },
] as const;

function evidenceImageStyle(zone: (typeof PHOTO_SLOTS)[number]['key']): React.CSSProperties {
  switch (zone) {
    case 'superior':
      return { objectPosition: '50% 8%', transform: 'scale(1.6)' };
    case 'inferior':
      return { objectPosition: '50% 95%', transform: 'scale(1.6)' };
    case 'lateralDerecho':
      return { objectPosition: '72% 58%', transform: 'scale(1.25)' };
    case 'lateralIzquierdo':
      return { objectPosition: '28% 58%', transform: 'scale(1.25)' };
    case 'frontal':
      return { objectPosition: '24% 62%', transform: 'scale(1.45)' };
    case 'trasero':
      return { objectPosition: '80% 62%', transform: 'scale(1.45)' };
    default:
      return {};
  }
}

export default function VehiculoDetallePage() {
  const router = useRouter();
  const params = useParams<{ plate: string }>();
  const plate = decodeURIComponent(params.plate || '').toUpperCase();

  const [role, setRoleState] = useState<Role>('administrativo');
  const [vehicle, setVehicle] = useState<Entry | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [formsByStep, setFormsByStep] = useState<Record<string, Record<string, string>>>({});
  const [warning, setWarning] = useState('');
  const [openBlocks, setOpenBlocks] = useState({
    resumenPrincipal: true,
    contactoFacturacion: false,
    fechasDocumentos: false,
  });

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    const localRole = getRole();
    const localRaw = getEntries();
    const seeded = applyDemoEntries(localRaw);
    setEntries(seeded);
    ensureDemoFormsSeed();

    const found = seeded.find((item) => String(item.placa).toUpperCase() === plate) || null;
    queueMicrotask(() => {
      setRoleState(localRole);
      setFormsByStep(getFormsForPlate(plate));
      if (!found) return;
      const normalizedStep = normalizeStepTitle(found.paso);
      const next = { ...found, paso: normalizedStep };
      setVehicle(next);
      setStepIndex(typeof found.stepIndex === 'number' ? found.stepIndex : stepIndexFromTitle(normalizedStep));
    });

    (async () => {
      try {
        const apiVehicle = await getVehicleByPlate(plate);
        const mapped = apiVehicleToEntry(apiVehicle);
        if (!mapped) return;

        const normalizedStep = normalizeStepTitle(mapped.paso);
        const localBase = getEntries().find((item) => String(item.placa || '').toUpperCase() === plate) || null;
        const next = { ...localBase, ...mapped, paso: normalizedStep };
        setVehicle(next);
        setStepIndex(stepIndexFromTitle(normalizedStep));

        const current = getEntries();
        const updated = current.some((item) => item.id === next.id)
          ? current.map((item) => (item.id === next.id ? next : item))
          : [next, ...current];
        setEntries(updated);
        setCurrentEntry(next);
        setFormsByStep(getFormsForPlate(plate));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar el vehículo';
        const lowered = msg.toLowerCase();
        if (!lowered.includes('not found') && !lowered.includes('no autorizado')) {
          setWarning(msg);
        }
      }
    })();
  }, [plate, router]);

  const clientCompanyName = useMemo(() => {
    if (role !== 'cliente') return '';
    const identity = getClientIdentity();
    return String(identity?.name || identity?.companyName || '').trim();
  }, [role]);

  const visibleSteps = useMemo(() => getRoleSteps(role, formsByStep), [role, formsByStep]);
  const visibleIndices = visibleSteps.map((s) => s.index);
  const displayCurrentIndex = (() => {
    if (visibleIndices.includes(stepIndex)) return visibleIndices.indexOf(stepIndex);
    const prev = visibleIndices.filter((idx) => idx <= stepIndex).pop();
    return prev !== undefined ? visibleIndices.indexOf(prev) : 0;
  })();

  const currentVisibleStep = visibleSteps[Math.max(0, displayCurrentIndex)];
  const continueHref = `/orden-servicio?startStep=${currentVisibleStep?.index ?? stepIndex}&plate=${encodeURIComponent(plate)}`;

  const quoteReady = isClientQuoteReady(formsByStep);
  const approvalIndex = stepIndexFromTitle('Autorización del cliente');
  const clientCanAuthorize = role === 'cliente' && quoteReady && stepIndex >= approvalIndex;

  const quoteData = formsByStep.cotizacion_formal || {};
  const approvalData = formsByStep.aprobacion || {};
  const intakePhotosByZone = useMemo(() => {
    const zone = vehicle?.intakePhotosByZone || {};
    const legacy = vehicle?.intakePhotos || [];
    const plateSeed = vehicle?.placa || plate;
    const modelSeed = vehicle?.vehiculo || '';
    const colorSeed = vehicle?.color || '';

    const current = {
      superior: String(zone.superior || legacy[0] || ''),
      inferior: String(zone.inferior || legacy[1] || ''),
      lateralDerecho: String(zone.lateralDerecho || legacy[2] || ''),
      lateralIzquierdo: String(zone.lateralIzquierdo || legacy[3] || ''),
      frontal: String(zone.frontal || legacy[4] || ''),
      trasero: String(zone.trasero || legacy[5] || ''),
    };

    const values = Object.values(current).filter(Boolean);
    const allSame = values.length >= 3 && new Set(values).size === 1;
    if (!allSame) return current;

    return {
      superior: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'superior'),
      inferior: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'inferior'),
      lateralDerecho: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'lateralDerecho'),
      lateralIzquierdo: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'lateralIzquierdo'),
      frontal: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'frontal'),
      trasero: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'trasero'),
    };
  }, [vehicle, plate]);
  const hasIntakePhotos = PHOTO_SLOTS.some((slot) => intakePhotosByZone[slot.key]);

  function setApprovalPatch(patch: Record<string, string>) {
    if (!plate) return;
    const next = setStepFields(plate, 'aprobacion', patch);
    setFormsByStep(next);
  }

  function toggleBlock(key: keyof typeof openBlocks) {
    setOpenBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <main className="vc-page vc-shell" suppressHydrationWarning>
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <FlowHeader backHref="/ingreso-activo" subtitle="Detalle del vehículo" />

        {warning ? <div className="vc-warning">No se pudo cargar vehículo desde backend: {warning}</div> : null}

        <section className="vc-card">
          <h3>Resumen</h3>

          <button type="button" className="vc-accordion-toggle" onClick={() => toggleBlock('resumenPrincipal')} aria-expanded={openBlocks.resumenPrincipal}>
            <span>Datos principales</span>
            <span>{openBlocks.resumenPrincipal ? '−' : '+'}</span>
          </button>
          {openBlocks.resumenPrincipal ? (
            <div className="vc-summary-grid">
              <span>No. orden</span><strong>{vehicle?.orderNumber || '-'}</strong>
              <span>Placa</span><strong>{vehicle?.placa || '-'}</strong>
              <span>Cliente</span><strong>{role === 'cliente' ? (clientCompanyName || vehicle?.cliente || '-') : (vehicle?.cliente || '-')}</strong>
              <span>Vehículo</span><strong>{vehicle?.vehiculo || '-'}</strong>
              <span>Color</span><strong>{vehicle?.color || '-'}</strong>
              <span>Paso actual</span><strong>{vehicle?.paso || '-'}</strong>
            </div>
          ) : null}

          <button type="button" className="vc-accordion-toggle" onClick={() => toggleBlock('contactoFacturacion')} aria-expanded={openBlocks.contactoFacturacion}>
            <span>Contacto y facturación</span>
            <span>{openBlocks.contactoFacturacion ? '−' : '+'}</span>
          </button>
          {openBlocks.contactoFacturacion ? (
            <div className="vc-summary-grid">
              <span>Teléfono</span><strong>{vehicle?.telefono || '-'}</strong>
              <span>NIT/CC</span><strong>{vehicle?.nitCc || '-'}</strong>
              <span>Correo</span><strong>{vehicle?.email || '-'}</strong>
              <span>Facturación</span><strong>{vehicle?.invoiceName || '-'}</strong>
              <span>Pago</span><strong>{vehicle?.paymentMethod || '-'}</strong>
              <span>Días crédito</span><strong>{vehicle?.creditDays || '-'}</strong>
            </div>
          ) : null}

          <button type="button" className="vc-accordion-toggle" onClick={() => toggleBlock('fechasDocumentos')} aria-expanded={openBlocks.fechasDocumentos}>
            <span>Fechas y documentos</span>
            <span>{openBlocks.fechasDocumentos ? '−' : '+'}</span>
          </button>
          {openBlocks.fechasDocumentos ? (
            <div className="vc-summary-grid">
              <span>Fecha ingreso</span><strong>{vehicle?.fecha ? String(vehicle.fecha).slice(0, 10) : '-'}</strong>
              <span>Fecha prevista entrega</span><strong>{vehicle?.expectedDeliveryDate || '-'}</strong>
              <span>SOAT</span><strong>{vehicle?.soatExpiry || '-'}</strong>
              <span>Tecnomecánica</span><strong>{vehicle?.rtmExpiry || '-'}</strong>
            </div>
          ) : null}
        </section>

        {hasIntakePhotos ? (
          <section className="vc-card">
            <h3>Evidencias de ingreso</h3>
            <div className="vc-photo-grid">
              {PHOTO_SLOTS.map((slot) => {
                const src = intakePhotosByZone[slot.key];
                return (
                  <div key={slot.key} className="vc-photo-item">
                    <p className="vc-photo-title">{slot.label}</p>
                    {src ? (
                      <a href={src} target="_blank" rel="noreferrer" className="vc-photo-link">
                        <img
                          src={src}
                          alt={`Evidencia ${slot.label}`}
                          className="vc-photo-preview"
                          style={evidenceImageStyle(slot.key)}
                        />
                      </a>
                    ) : (
                      <div className="vc-photo-empty">Sin imagen</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="vc-card">
          <h3>Linea de tiempo</h3>
          <ul className="vc-timeline">
            {visibleSteps.map((step, idx) => (
              <li key={step.key} className={idx <= displayCurrentIndex ? 'done' : ''}>
                {step.title}
              </li>
            ))}
          </ul>

          {role !== 'cliente' ? (
            <div className="vc-inline-actions">
              <Link href={continueHref} className="vc-login-btn vc-summary-btn vc-continue-btn">Continuar →</Link>
            </div>
          ) : (
            <div className="vc-inline-actions">
              <p className="vc-subtitle-small">Tu vista es informativa. El taller actualiza el avance internamente.</p>
            </div>
          )}
        </section>

        {role === 'cliente' ? (
          <section className="vc-card">
            <h3>Cotización cliente</h3>
            {quoteReady ? (
              <div className="vc-summary-grid">
                <span>No. cotización</span><strong>{quoteData.cotizacionNumero || '-'}</strong>
                <span>Fecha cotización</span><strong>{quoteData.cotizacionFecha || '-'}</strong>
                <span>Subtotal</span><strong>{quoteData.cotizacionSubtotal || '-'}</strong>
                <span>IVA</span><strong>{quoteData.cotizacionIva || '-'}</strong>
                <span>Total</span><strong>{quoteData.cotizacionTotal || '-'}</strong>
                <span>Alcance</span><strong>{quoteData.alcance || '-'}</strong>
              </div>
            ) : (
              <div className="vc-warning">
                <p>En proceso: la cotización para cliente aún no ha sido cargada por el taller.</p>
              </div>
            )}

            {clientCanAuthorize ? (
              <>
                <div className="vc-chip-row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="vc-chip"
                    onClick={() => setApprovalPatch({ decisionCliente: 'Aprobado', decisionClienteAt: new Date().toISOString() })}
                    style={String(approvalData.decisionCliente || '').toLowerCase() === 'aprobado' ? { borderColor: 'var(--vc-accent)', color: 'var(--vc-accent-ink)' } : undefined}
                  >
                    Autorizar
                  </button>
                  <button
                    type="button"
                    className="vc-chip"
                    onClick={() => setApprovalPatch({ decisionCliente: 'No aprobado', decisionClienteAt: new Date().toISOString() })}
                    style={String(approvalData.decisionCliente || '').toLowerCase() === 'no aprobado' ? { borderColor: 'var(--vc-danger)', color: '#ffb4b4' } : undefined}
                  >
                    No autorizar
                  </button>
                </div>

                <label className="vc-label" style={{ marginTop: 12 }}>Comentarios</label>
                <div className="vc-input-wrap">
                  <input
                    value={approvalData.comentariosCliente || ''}
                    onChange={(e) => setApprovalPatch({ comentariosCliente: e.target.value })}
                    placeholder="Escribe comentarios para el taller"
                  />
                </div>
                <p className="vc-subtitle-small">Fecha/hora decisión: {approvalData.decisionClienteAt || '-'}</p>
              </>
            ) : quoteReady ? (
              <p className="vc-subtitle-small" style={{ marginTop: 10 }}>La autorización estará disponible cuando el proceso llegue a ese paso.</p>
            ) : null}
          </section>
        ) : null}

        {role !== 'cliente' ? (
          <section className="vc-card">
            <h3>Formularios</h3>
            <div className="vc-forms-list">
              {visibleSteps.map((step, idx) => (
                <Link
                  key={step.key}
                  href={`/orden-servicio?startStep=${step.index}&plate=${encodeURIComponent(plate)}`}
                  className="vc-form-row"
                >
                  <div className="vc-form-row-left">
                    <span className={`vc-form-dot ${idx <= displayCurrentIndex ? 'done' : ''}`} />
                    <span>{step.title}</span>
                  </div>
                  <span className="vc-form-edit">✎</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <BottomNav active="process" />
    </main>
  );
}
