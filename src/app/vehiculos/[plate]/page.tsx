'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getVehicleByPlate } from '@/lib/api';
import { apiVehicleToEntry } from '@/lib/mapper';
import { BrandPill } from '@/components/BrandPill';
import { BottomNav } from '@/components/BottomNav';
import { getEntries, getRole, getSession, setCurrentEntry, setEntries, type Entry, type Role } from '@/lib/storage';
import { getVisibleSteps, normalizeStepTitle, stepIndexFromTitle } from '@/lib/process';

export default function VehiculoDetallePage() {
  const router = useRouter();
  const params = useParams<{ plate: string }>();
  const plate = decodeURIComponent(params.plate || '').toUpperCase();

  const [role] = useState<Role>(() => getRole());
  const [vehicle, setVehicle] = useState<Entry | null>(() => {
    const found = getEntries().find((item) => String(item.placa).toUpperCase() === plate) || null;
    if (!found) return null;
    return { ...found, paso: normalizeStepTitle(found.paso) };
  });
  const [stepIndex, setStepIndex] = useState(() => {
    const found = getEntries().find((item) => String(item.placa).toUpperCase() === plate) || null;
    if (!found) return 0;
    const normalizedStep = normalizeStepTitle(found.paso);
    return typeof found.stepIndex === 'number' ? found.stepIndex : stepIndexFromTitle(normalizedStep);
  });
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    (async () => {
      try {
        const apiVehicle = await getVehicleByPlate(plate);
        const mapped = apiVehicleToEntry(apiVehicle);
        if (!mapped) return;

        const normalizedStep = normalizeStepTitle(mapped.paso);
        const next = { ...mapped, paso: normalizedStep };
        setVehicle(next);
        setStepIndex(stepIndexFromTitle(normalizedStep));

        const current = getEntries();
        const updated = current.some((item) => item.id === next.id)
          ? current.map((item) => (item.id === next.id ? next : item))
          : [next, ...current];
        setEntries(updated);
        setCurrentEntry(next);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar el vehículo';
        if (!msg.toLowerCase().includes('not found')) setWarning(msg);
      }
    })();
  }, [plate, router]);

  const visibleSteps = useMemo(() => getVisibleSteps(role), [role]);
  const visibleIndices = visibleSteps.map((s) => s.index);
  const displayCurrentIndex = (() => {
    if (visibleIndices.includes(stepIndex)) return visibleIndices.indexOf(stepIndex);
    const prev = visibleIndices.filter((idx) => idx <= stepIndex).pop();
    return prev !== undefined ? visibleIndices.indexOf(prev) : 0;
  })();

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <header className="vc-detail-head">
          <Link href="/ingreso-activo" className="vc-back-btn">‹</Link>
          <div>
            <BrandPill />
            <p className="vc-head-sub">Detalle del vehiculo</p>
          </div>
        </header>

        {warning ? <div className="vc-warning">No se pudo cargar vehículo desde backend: {warning}</div> : null}

        <section className="vc-card">
          <h3>Resumen</h3>
          <div className="vc-summary-grid">
            <span>Placa</span><strong>{vehicle?.placa || '-'}</strong>
            <span>Cliente</span><strong>{vehicle?.cliente || '-'}</strong>
            <span>Vehiculo</span><strong>{vehicle?.vehiculo || '-'}</strong>
            <span>Telefono</span><strong>{vehicle?.telefono || '-'}</strong>
            <span>Paso actual</span><strong>{vehicle?.paso || '-'}</strong>
          </div>
        </section>

        <section className="vc-card">
          <h3>Linea de tiempo</h3>
          <ul className="vc-timeline">
            {visibleSteps.map((step, idx) => (
              <li key={step.key} className={idx <= displayCurrentIndex ? 'done' : ''}>
                {step.title}
              </li>
            ))}
          </ul>

          <div className="vc-inline-actions">
            <Link href="/orden-servicio" className="vc-login-btn vc-summary-btn vc-continue-btn">Continuar →</Link>
          </div>
        </section>

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
      </section>

      <BottomNav active="process" />
    </main>
  );
}
