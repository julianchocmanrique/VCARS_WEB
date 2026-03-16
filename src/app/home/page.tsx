'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listVehicles } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { apiVehicleToEntry } from '@/lib/mapper';
import { BrandPill } from '@/components/BrandPill';
import { BottomNav } from '@/components/BottomNav';
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

const PROFILE_LABEL: Record<Role, string> = {
  administrativo: 'Administrativo',
  tecnico: 'Tecnico',
  cliente: 'Cliente',
};

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
        // fallback local
      }
    })();
  }, [currentEntry, router]);

  const summary = useMemo(() => summarize(entries), [entries]);
  const latestEntries = useMemo(() => entries.slice(0, 3), [entries]);

  const tiles = [
    { label: 'Activos', value: String(summary.active) },
    { label: 'Cerrados', value: String(summary.done) },
    { label: 'Total', value: String(summary.total) },
    { label: 'Paso', value: currentEntry?.paso || 'Recepción' },
    { label: 'Placa', value: currentEntry?.placa || 'Sin ingreso' },
    { label: 'Cliente', value: currentEntry?.cliente || '-' },
  ];

  return (
    <main className="vc-page vc-shell vc-ref-bg">
      <section className="vc-panel vc-panel-home-mobile vc-ref-shell">
        <header className="vc-home-header">
          <div className="vc-brand-row-top">
            <BrandPill />
            <button
              className="vc-profile-btn"
              onClick={() => {
                signOut();
                router.replace('/login');
              }}
            >
              {PROFILE_LABEL[role]}
            </button>
          </div>

          <h1 className="vc-title">Inicio operativo</h1>
          <p className="vc-subtitle">Panel central del vehículo y servicio.</p>
        </header>

        <section className="vc-ref-hero">
          <div className="vc-ref-hero-top">
            <div>
              <h3>{currentEntry?.vehiculo || 'VCARS Unit'}</h3>
              <p>{currentEntry?.placa || 'Sin placa'} · {currentEntry?.cliente || 'Sin cliente'}</p>
            </div>
            <span className="vc-ref-status">Conectado</span>
          </div>

          <div className="vc-ref-car-stage">
            <div className="vc-ref-car-glow" />
            <div className="vc-ref-car">VCARS</div>
          </div>

          <div className="vc-ref-ring-row">
            <article>
              <div className="vc-ref-ring">{summary.active}</div>
              <span>En taller</span>
            </article>
            <article>
              <div className="vc-ref-core">●</div>
              <span>Estado</span>
            </article>
            <article>
              <div className="vc-ref-ring">{summary.done}</div>
              <span>Cerrados</span>
            </article>
          </div>

          <Link
            className="vc-login-btn vc-ref-main-btn"
            href={currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/nuevo-ingreso'}
          >
            {currentEntry ? 'Abrir ingreso' : 'Crear ingreso'}
          </Link>
        </section>

        <section className="vc-ref-grid">
          {tiles.map((tile) => (
            <article key={tile.label} className="vc-ref-tile">
              <p>{tile.label}</p>
              <strong>{tile.value}</strong>
            </article>
          ))}
        </section>

        <section className="vc-section">
          <h2 className="vc-section-title">Accesos secundarios</h2>
          <div className="vc-secondary-card">
            <button
              className="vc-secondary-row"
              onClick={() => {
                signOut();
                router.replace('/login');
              }}
            >
              <span>Cerrar sesion</span>
              <span>›</span>
            </button>
          </div>

          <div className="vc-secondary-card vc-movements-card">
            <p className="vc-movements-title">Ultimos movimientos</p>
            {latestEntries.length ? (
              latestEntries.map((item) => (
                <Link key={item.id} href={`/vehiculos/${encodeURIComponent(item.placa)}`} className="vc-movement-row">
                  <div className="vc-movement-icon" aria-hidden="true">🚗</div>
                  <div className="vc-movement-text">
                    <strong>{item.vehiculo || item.placa} · {item.placa}</strong>
                    <p>{item.cliente || '-'} · {item.paso || 'Recepción (Ingreso)'}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="vc-empty">Aun no hay movimientos recientes.</p>
            )}
          </div>
        </section>
      </section>

      <BottomNav active="home" />
    </main>
  );
}
