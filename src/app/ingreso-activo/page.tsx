'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listVehicles } from '@/lib/api';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { apiVehicleToEntry } from '@/lib/mapper';
import { getCurrentEntry, getEntries, getRole, getSession, setCurrentEntry, setEntries, type Entry, type Role } from '@/lib/storage';

function normalize(entry: Entry): Entry {
  return {
    ...entry,
    status: entry.status || 'active',
  };
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
        if (!msg.toLowerCase().includes('no autorizado')) {
          setWarning(msg);
        }
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

    if (role === 'tecnico') {
      return modeScoped.filter((item) => item.status !== 'done' && item.status !== 'cancelled');
    }

    if (role === 'cliente') {
      const identity = getClientIdentity();
      return modeScoped.filter((item) => isEntryAllowed(identity, item));
    }

    return modeScoped;
  }, [entries, role, viewMode]);

  return (
    <main className="vc-page">
      <section className="vc-panel">
        <div className="vc-top-row">
          <div>
            <div className="vc-brand">VCARS</div>
            <h1>Ingreso activo</h1>
            <p>Vista por perfil: {role}</p>
          </div>
          <Link href="/home" className="vc-btn">
            Volver
          </Link>
        </div>

        <div className="vc-toggle-row">
          <button className={`vc-btn ${viewMode === 'active' ? 'vc-btn-primary' : ''}`} onClick={() => setViewMode('active')}>
            Activos
          </button>
          <button className={`vc-btn ${viewMode === 'history' ? 'vc-btn-primary' : ''}`} onClick={() => setViewMode('history')}>
            Historial
          </button>
        </div>

        {warning ? <div className="vc-warning">No se pudo cargar lista desde backend: {warning}</div> : null}

        <div className="vc-list">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/vehiculos/${encodeURIComponent(item.placa)}`}
              className="vc-item"
              onClick={() => setCurrentEntry(item)}
            >
              <div>
                <strong>{item.placa}</strong>
                <p>{item.cliente || item.vehiculo || 'Vehículo'}</p>
              </div>
              <span>{item.paso || 'Recepción'}</span>
            </Link>
          ))}
        </div>

        {!filtered.length ? <p className="vc-empty">No hay ingresos en esta vista.</p> : null}
      </section>
    </main>
  );
}
