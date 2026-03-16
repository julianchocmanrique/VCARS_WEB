'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getVehicleByPlate } from '@/lib/api';
import { apiVehicleToEntry } from '@/lib/mapper';
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
        if (!msg.toLowerCase().includes('not found')) {
          setWarning(msg);
        }
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
    <main className="vc-page">
      <section className="vc-panel">
        <div className="vc-top-row">
          <div>
            <div className="vc-brand">VCARS</div>
            <h1>Detalle vehículo</h1>
            <p>{plate}</p>
          </div>
          <Link href="/ingreso-activo" className="vc-btn">
            Volver
          </Link>
        </div>

        {warning ? <div className="vc-warning">No se pudo cargar vehículo desde backend: {warning}</div> : null}

        <div className="vc-card-grid">
          <article className="vc-card">
            <h3>Resumen</h3>
            <p>
              <strong>Placa:</strong> {vehicle?.placa || '-'}
            </p>
            <p>
              <strong>Cliente:</strong> {vehicle?.cliente || '-'}
            </p>
            <p>
              <strong>Vehículo:</strong> {vehicle?.vehiculo || '-'}
            </p>
            <p>
              <strong>Teléfono:</strong> {vehicle?.telefono || '-'}
            </p>
            <p>
              <strong>Paso actual:</strong> {vehicle?.paso || '-'}
            </p>
          </article>

          <article className="vc-card">
            <h3>Línea de tiempo</h3>
            <ul className="vc-timeline">
              {visibleSteps.map((step, idx) => (
                <li key={step.key} className={idx <= displayCurrentIndex ? 'done' : ''}>
                  {step.title}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
