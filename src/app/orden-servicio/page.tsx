'use client';

import { useMemo, useState } from 'react';
import { BrandPill } from '@/components/BrandPill';
import { BottomNav } from '@/components/BottomNav';
import { VCARS_PROCESS } from '@/lib/process';

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
  ],
  aprobacion: [
    { key: 'aprobadoCliente', label: 'Aprobado', placeholder: 'Si / No' },
    { key: 'medioAprobacion', label: 'Medio de aprobacion', placeholder: 'WhatsApp / Llamada / Correo' },
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
  const [step, setStep] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const url = new URL(window.location.href);
    const startStepRaw = Number(url.searchParams.get('startStep') || 0);
    return Number.isFinite(startStepRaw)
      ? Math.max(0, Math.min(VCARS_PROCESS.length - 1, startStepRaw))
      : 0;
  });
  const [form, setForm] = useState<Record<string, string>>({});

  const current = VCARS_PROCESS[step];
  const fields = useMemo(() => STEP_FIELDS[current.key] || [], [current.key]);

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <header className="vc-detail-head">
          <BrandPill />
          <p className="vc-head-sub">Orden de servicio</p>
        </header>

        <section className="vc-card">
          <h3>{current.title}</h3>

          <div className="vc-step-tabs">
            {VCARS_PROCESS.map((item, idx) => (
              <button
                key={item.key}
                className={`vc-step-tab ${idx === step ? 'is-active' : ''}`}
                onClick={() => setStep(idx)}
                type="button"
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <div className="vc-step-fields">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="vc-label">{field.label}</label>
                <div className="vc-input-wrap">
                  <input
                    value={form[field.key] || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="vc-wizard-actions">
            <button className="vc-btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Anterior
            </button>
            <button
              className="vc-login-btn vc-wizard-next"
              onClick={() => setStep((s) => Math.min(VCARS_PROCESS.length - 1, s + 1))}
            >
              {step === VCARS_PROCESS.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </section>
      </section>

      <BottomNav active="process" />
    </main>
  );
}
