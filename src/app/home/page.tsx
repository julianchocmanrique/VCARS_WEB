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

  const quickActions = [
    {
      key: 'new',
      title: 'Nuevo ingreso',
      value: 'Recepción',
      href: '/nuevo-ingreso',
    },
    {
      key: 'process',
      title: 'Proceso activo',
      value: currentEntry?.placa || 'Sin ingreso',
      href: currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/ingreso-activo',
    },
    {
      key: 'active',
      title: 'Activos',
      value: String(summary.active),
      href: '/ingreso-activo',
    },
    {
      key: 'closed',
      title: 'Cerrados',
      value: String(summary.done),
      href: '/ingreso-activo',
    },
  ];

  return (
    <main className="vc-page vc-shell vc-home-neon">
      <section className="vc-panel vc-panel-home-mobile vc-neon-panel">
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
          <p className="vc-subtitle">Controla vehículo, proceso y estado general desde un solo tablero.</p>
        </header>

        <section className="vc-neon-vehicle-card">
          <div>
            <p className="vc-mini vc-neon-mini">Vehículo conectado</p>
            <h3 className="vc-summary-title">{currentEntry?.vehiculo || 'VCARS Diagnostic'}</h3>
            <p className="vc-summary-text">{currentEntry ? `${currentEntry.placa} · ${currentEntry.cliente || '-'}` : 'Sin ingreso activo'}</p>
          </div>
          <Link
            className="vc-login-btn vc-summary-btn vc-neon-cta"
            href={currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/nuevo-ingreso'}
          >
            {currentEntry ? 'Abrir ingreso' : 'Crear ingreso'}
          </Link>
        </section>

        <section className="vc-neon-ring-row">
          <article className="vc-ring-item">
            <div className="vc-ring">{summary.active}</div>
            <p>En taller</p>
          </article>
          <article className="vc-ring-item is-center">
            <div className="vc-ring vc-ring-glow">•</div>
            <p>Estado</p>
          </article>
          <article className="vc-ring-item">
            <div className="vc-ring">{summary.done}</div>
            <p>Cerrados</p>
          </article>
        </section>

        <section className="vc-neon-grid">
          {quickActions.map((item) => (
            <Link key={item.key} href={item.href} className="vc-neon-tile">
              <span>{item.title}</span>
              <strong>{item.value}</strong>
            </Link>
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
