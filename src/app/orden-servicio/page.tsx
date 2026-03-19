'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BrandPill } from '@/components/BrandPill';
import { BottomNav } from '@/components/BottomNav';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { canEditStep, getFormsForPlate, getRoleSteps, setStepField } from '@/lib/orderForms';
import { getCurrentEntry, getEntries, getRole, getSession, type Role } from '@/lib/storage';

const STEP_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string }>> = {
  recepcion: [
    { key: 'fallaCliente', label: 'Falla reportada por el cliente', placeholder: 'Describe la falla' },
    { key: 'kilometraje', label: 'Kilometraje (km)', placeholder: '123456' },
  ],
  cotizacion_interna: [
    { key: 'diagnosticoTecnico', label: 'Diagnostico del mecanico', placeholder: 'Diagnostico' },
    { key: 'repuestos', label: 'Repuestos necesarios', placeholder: 'Lista de repuestos' },
  ],
  cotizacion_formal: [
    { key: 'cotizacionTotal', label: 'Total cotizacion', placeholder: '1500000' },
    { key: 'cotizacionNumero', label: 'No. cotizacion', placeholder: 'COT-1001' },
    { key: 'alcance', label: 'Alcance para cliente', placeholder: 'Detalle del trabajo y tiempos' },
  ],
  aprobacion: [
    { key: 'decisionCliente', label: 'Decision del cliente', placeholder: 'Aprobado / No aprobado' },
    { key: 'comentariosCliente', label: 'Comentarios del cliente', placeholder: 'Comentarios o condiciones' },
  ],
  trabajo: [
    { key: 'tecnico', label: 'Tecnico asignado', placeholder: 'Nombre del tecnico' },
    { key: 'trabajoRealizado', label: 'Trabajo realizado', placeholder: 'Detalle de trabajo' },
  ],
  entrega: [
    { key: 'fechaEntregaReal', label: 'Fecha entrega real', placeholder: '2026-03-16' },
    { key: 'firmaRecibe', label: 'Firma recibido', placeholder: 'Nombre cliente' },
  ],
};

export default function OrdenServicioPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('administrativo');
  const [plate, setPlate] = useState('');
  const [startStepIndex, setStartStepIndex] = useState(0);
  const [formsByStep, setFormsByStep] = useState<Record<string, Record<string, string>>>({});
  const [stepPos, setStepPos] = useState(0);

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

  function updateField(fieldKey: string, value: string) {
    if (!plate || !current) return;
    const nextByStep = setStepField(plate, current.key, fieldKey, value);
    setFormsByStep(nextByStep);
  }

  return (
    <main className="vc-page vc-shell" suppressHydrationWarning>
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <header className="vc-detail-head">
          <BrandPill />
          <p className="vc-head-sub">Orden de servicio {plate ? `· ${plate}` : ''}</p>
        </header>

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

          <div className="vc-step-fields">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="vc-label">{field.label}</label>
                <div className="vc-input-wrap">
                  <input
                    value={formsByStep[currentKey]?.[field.key] || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={!editable}
                  />
                </div>
              </div>
            ))}
          </div>

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
