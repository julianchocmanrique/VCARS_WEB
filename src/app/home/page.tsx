'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listVehicles } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { apiVehicleToEntry } from '@/lib/mapper';
import {
  getCurrentEntry,
  getEntries,
  getRole,
  getSession,
  setCurrentEntry,
  setEntries,
  type Entry,
  type Role,
} from '@/lib/storage';

function summarize(entries: Entry[]) {
  return {
    total: entries.length,
    active: entries.filter((e) => (e.status || 'active') === 'active').length,
    done: entries.filter((e) => e.status === 'done').length,
    cancelled: entries.filter((e) => e.status === 'cancelled').length,
  };
}

export default function HomePage() {
  const router = useRouter();
  const [role] = useState<Role>(() => getRole());
  const [entries, setEntriesState] = useState<Entry[]>(() => getEntries());
  const [currentEntry, setCurrentEntryState] = useState<Entry | null>(() => {
    const localEntries = getEntries();
    return getCurrentEntry() || localEntries[0] || null;
  });

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    if (currentEntry) setCurrentEntry(currentEntry);

    (async () => {
      try {
        const vehicles = await listVehicles({ take: 50 });
        const mapped = vehicles.map(apiVehicleToEntry).filter(Boolean) as Entry[];
        if (!mapped.length) return;
        setEntries(mapped);
        setEntriesState(mapped);
        const nextCurrent = currentEntry || mapped[0] || null;
        setCurrentEntryState(nextCurrent);
        if (nextCurrent) setCurrentEntry(nextCurrent);
      } catch {
        // Fallback local already loaded.
      }
    })();
  }, [currentEntry, router]);

  const summary = useMemo(() => summarize(entries), [entries]);

  return (
    <main className="vc-page">
      <section className="vc-panel">
        <div className="vc-top-row">
          <div>
            <div className="vc-brand">VCARS</div>
            <h1>Panel principal</h1>
            <p>Perfil activo: {role}</p>
          </div>
          <button
            className="vc-btn"
            onClick={() => {
              signOut();
              router.replace('/login');
            }}
          >
            Cerrar sesión
          </button>
        </div>

        <div className="vc-stats-grid">
          <article className="vc-stat">
            <strong>{summary.total}</strong>
            <span>Total</span>
          </article>
          <article className="vc-stat">
            <strong>{summary.active}</strong>
            <span>Activos</span>
          </article>
          <article className="vc-stat">
            <strong>{summary.done}</strong>
            <span>Finalizados</span>
          </article>
          <article className="vc-stat">
            <strong>{summary.cancelled}</strong>
            <span>Cancelados</span>
          </article>
        </div>

        <div className="vc-actions-grid">
          {(role === 'cliente'
            ? [
                { href: '/mis-vehiculos', label: 'Mis vehículos', desc: 'Consultar placas asociadas' },
                {
                  href: currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/mis-vehiculos',
                  label: 'Vehículo activo',
                  desc: currentEntry?.placa || 'Sin ingreso activo',
                },
              ]
            : [
                {
                  href: '/ingreso-activo',
                  label: 'Ingreso activo',
                  desc: currentEntry?.placa || 'Sin ingreso activo',
                },
                { href: '/ingreso-activo', label: 'Historial', desc: `${summary.done} cerrados` },
              ]
          ).map((action) => (
            <Link key={action.label} href={action.href} className="vc-action-card">
              <h3>{action.label}</h3>
              <p>{action.desc}</p>
            </Link>
          ))}
        </div>

        {entries.length ? (
          <section>
            <h2>Recientes</h2>
            <div className="vc-list">
              {entries.slice(0, 6).map((item) => (
                <Link key={item.id} href={`/vehiculos/${encodeURIComponent(item.placa)}`} className="vc-item">
                  <div>
                    <strong>{item.placa}</strong>
                    <p>{item.cliente || item.vehiculo || 'Vehículo'}</p>
                  </div>
                  <span>{item.paso || 'Recepción'}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
