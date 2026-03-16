'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listVehicles } from '@/lib/api';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { apiVehicleToEntry } from '@/lib/mapper';
import { BottomNav } from '@/components/BottomNav';
import { BrandPill } from '@/components/BrandPill';
import { getCurrentEntry, getEntries, getRole, getSession, setCurrentEntry, setEntries, type Entry, type Role } from '@/lib/storage';

function normalize(entry: Entry): Entry {
  return { ...entry, status: entry.status || 'active' };
}

export default function IngresoActivoPage() {
  const router = useRouter();
  const [role] = useState<Role>(() => getRole());
  const [entries, setEntriesState] = useState<Entry[]>(() => getEntries().map(normalize));
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    (async () => {
      try {
        const vehicles = await listVehicles({ take: 50 });
        const mapped = vehicles.map(apiVehicleToEntry).filter(Boolean) as Entry[];
        if (!mapped.length) return;
        const normalized = mapped.map(normalize);
        setEntries(normalized);
        setEntriesState(normalized);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar desde backend';
        if (!msg.toLowerCase().includes('no autorizado')) setWarning(msg);
      }
    })();
  }, [router]);

  const filtered = useMemo(() => {
    const withCurrent = (() => {
      const current = getCurrentEntry();
      if (!current) return entries;
      if (entries.find((item) => item.id === current.id)) return entries;
      return [current, ...entries];
    })();

    const modeScoped = withCurrent.filter((item) =>
      viewMode === 'history'
        ? item.status === 'done' || item.status === 'cancelled'
        : item.status !== 'done' && item.status !== 'cancelled',
    );

    if (role === 'tecnico') return modeScoped.filter((item) => item.status !== 'done' && item.status !== 'cancelled');
    if (role === 'cliente') {
      const identity = getClientIdentity();
      return modeScoped.filter((item) => isEntryAllowed(identity, item));
    }

    return modeScoped;
  }, [entries, role, viewMode]);

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <header className="vc-head-block">
          <BrandPill />
          <p className="vc-head-sub">Formato del ingreso</p>
        </header>

        <section className="vc-list-card">
          <div className="vc-list-header">
            <div>
              <h2 className="vc-list-title">{role === 'administrativo' && viewMode === 'history' ? 'Historial de vehículos' : 'Vehículos en proceso'}</h2>
              <p className="vc-list-subtitle">Placa - Cliente - Paso actual</p>
            </div>
            <div className="vc-list-tools">
              {role === 'administrativo' ? (
                <button className="vc-pill" onClick={() => setViewMode((m) => (m === 'active' ? 'history' : 'active'))}>
                  {viewMode === 'active' ? 'ACTIVOS' : 'HISTORIAL'}
                </button>
              ) : null}
              <span className="vc-pill">{filtered.length}</span>
            </div>
          </div>

          {warning ? <div className="vc-warning">No se pudo cargar lista desde backend: {warning}</div> : null}

          <div className="vc-list-rows">
            {filtered.length ? (
              filtered.map((item) => (
                <div key={item.id} className="vc-vehicle-card">
                  <Link
                    href={`/vehiculos/${encodeURIComponent(item.placa)}`}
                    className="vc-vehicle-main"
                    onClick={() => setCurrentEntry(item)}
                  >
                    <div>
                      <strong>{item.placa}</strong>
                      <p>{item.cliente || '-'}</p>
                    </div>
                    <span className="vc-step-pill">{item.paso || 'Pendiente'}</span>
                  </Link>
                </div>
              ))
            ) : (
              <p className="vc-empty">Sin autos inscritos por ahora.</p>
            )}
          </div>

          <div className="vc-inline-actions">
            <Link href="/home" className="vc-btn">Volver al inicio</Link>
          </div>
        </section>
      </section>

      <BottomNav active="process" />
    </main>
  );
}
