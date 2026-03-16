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

  const primaryActions =
    role === 'cliente'
      ? [
          {
            key: 'mis-vehiculos',
            title: 'Mis vehiculos',
            subtitle: 'Consultar placas asignadas',
            href: '/mis-vehiculos',
            primary: true,
          },
          {
            key: 'estado-actual',
            title: 'Vehiculo activo',
            subtitle: currentEntry ? currentEntry.placa : 'Sin ingreso activo',
            href: currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/mis-vehiculos',
          },
        ]
      : role === 'tecnico'
      ? [
          {
            key: 'proceso',
            title: 'Proceso activo',
            subtitle: currentEntry ? currentEntry.placa : 'Sin ingreso activo',
            href: currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/ingreso-activo',
            primary: true,
          },
          {
            key: 'cola',
            title: 'Ingresos activos',
            subtitle: `${summary.active} en taller`,
            href: '/ingreso-activo',
          },
        ]
      : [
          {
            key: 'nuevo',
            title: 'Nuevo ingreso',
            subtitle: 'Registrar recepcion',
            href: '/nuevo-ingreso',
            primary: true,
          },
          {
            key: 'proceso',
            title: 'Proceso activo',
            subtitle: currentEntry ? currentEntry.placa : 'Sin ingreso activo',
            href: currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/ingreso-activo',
          },
          {
            key: 'historial',
            title: 'Historial',
            subtitle: `${summary.done} cerrados`,
            href: '/ingreso-activo',
          },
        ];

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <header className="vc-home-header">
          <div className="vc-brand-row-top">
            <BrandPill />
            <button className="vc-profile-btn" onClick={() => router.push('/login')}>
              {PROFILE_LABEL[role]}
            </button>
          </div>
          <h1 className="vc-title">Inicio operativo</h1>
          <p className="vc-subtitle">Gestiona ingresos, proceso actual y accesos por rol.</p>
        </header>

        <section className="vc-section">
          <h2 className="vc-section-title">Resumen</h2>
          <div className="vc-summary-hero">
            <div>
              <p className="vc-mini">Ingreso activo</p>
              <h3 className="vc-summary-title">
                {currentEntry ? `${currentEntry.vehiculo || 'Vehiculo'} · ${currentEntry.placa}` : 'Sin ingreso activo'}
              </h3>
              <p className="vc-summary-text">
                {currentEntry
                  ? `${currentEntry.cliente || '-'} · ${currentEntry.status || 'active'}`
                  : 'Crea un ingreso o entra al proceso para continuar el flujo del taller.'}
              </p>
            </div>
            <Link
              className="vc-login-btn vc-summary-btn"
              href={currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/ingreso-activo'}
            >
              {currentEntry ? 'Abrir ingreso' : 'Crear ingreso'}
            </Link>
          </div>
          <div className="vc-kpi-row">
            <article className="vc-kpi-card">
              <strong>{summary.active}</strong>
              <span>Activos</span>
            </article>
            <article className="vc-kpi-card">
              <strong>{summary.done}</strong>
              <span>Cerrados</span>
            </article>
            <article className="vc-kpi-card">
              <strong>{summary.total}</strong>
              <span>Total</span>
            </article>
          </div>
        </section>

        <section className="vc-section">
          <h2 className="vc-section-title">Acciones principales</h2>
          <div className="vc-actions-grid">
            {primaryActions.map((action) => (
              <Link key={action.key} href={action.href} className={`vc-action-card ${action.primary ? 'is-primary' : ''}`}>
                <h3>{action.title}</h3>
                <p>{action.subtitle}</p>
              </Link>
            ))}
          </div>
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

          <div className="vc-secondary-card">
            <p className="vc-mini">Ultimos movimientos</p>
            {entries.slice(0, 3).length ? (
              entries.slice(0, 3).map((item) => (
                <Link key={item.id} href={`/vehiculos/${encodeURIComponent(item.placa)}`} className="vc-recent-row">
                  <div>
                    <strong>{item.vehiculo || 'Vehiculo'} · {item.placa}</strong>
                    <p>{item.cliente || '-'} · {item.paso || 'Recepcion'}</p>
                  </div>
                  <span>›</span>
                </Link>
              ))
            ) : (
              <p className="vc-empty">Aun no hay movimientos recientes para mostrar.</p>
            )}
          </div>
        </section>
      </section>

      <BottomNav active="home" />
    </main>
  );
}
