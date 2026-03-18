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
  const activeStatusLabel = currentEntry?.status === 'done' ? 'Finalizado' : currentEntry?.status === 'cancelled' ? 'Cancelado' : 'Activo';
  const completionRate = summary.total ? Math.round(((summary.done + summary.cancelled) / summary.total) * 100) : 0;
  const activeRate = summary.total ? Math.round((summary.active / summary.total) * 100) : 0;

  const quickActions =
    role === 'cliente'
      ? [
          { key: 'mis-vehiculos', title: 'Mis vehiculos', subtitle: 'Consultar placas asociadas', href: '/mis-vehiculos', primary: true },
          { key: 'orden', title: 'Orden servicio', subtitle: 'Resumen del proceso', href: '/orden-servicio' },
        ]
      : role === 'tecnico'
      ? [
          { key: 'ingresos', title: 'Ingresos activos', subtitle: `${summary.active} en taller`, href: '/ingreso-activo', primary: true },
          { key: 'orden', title: 'Orden servicio', subtitle: 'Control del flujo', href: '/orden-servicio' },
        ]
      : [
          { key: 'nuevo', title: 'Nuevo ingreso', subtitle: 'Registrar recepcion', href: '/nuevo-ingreso', primary: true },
          { key: 'historial', title: 'Historial', subtitle: `${summary.done} cerrados`, href: '/ingreso-activo' },
          { key: 'orden', title: 'Orden servicio', subtitle: 'Vista de gestion', href: '/orden-servicio' },
        ];

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-home-mobile">
        <header className="vc-home-header vc-home-head-upgrade">
          <div className="vc-brand-row-top">
            <BrandPill />
            <button
              className="vc-profile-btn"
              onClick={() => {
                router.replace('/login');
              }}
            >
              {PROFILE_LABEL[role]}
            </button>
          </div>
          <h1 className="vc-title">Inicio operativo</h1>
          <p className="vc-subtitle">Gestiona ingresos, proceso actual y accesos por rol sin mezclar herramientas.</p>
          <div className="vc-home-divider" />
        </header>

        <div className="vc-home-layout">
          <section className="vc-section vc-section-tight">
            <h2 className="vc-section-title">Resumen</h2>
            <div className="vc-summary-hero vc-summary-hero-upgrade">
              <div className="vc-summary-copy">
                <div className="vc-summary-topline">
                  <p className="vc-mini vc-mini-blue">INGRESO ACTIVO</p>
                  <span className="vc-status-chip">{activeStatusLabel}</span>
                </div>
                <h3 className="vc-summary-title">
                  {currentEntry ? `${currentEntry.vehiculo || 'Vehiculo'} · ${currentEntry.placa}` : 'Sin ingreso activo'}
                </h3>
                <p className="vc-summary-text">
                  {currentEntry
                    ? `${currentEntry.cliente || '-'} · ${currentEntry.status || 'active'}`
                    : 'Crea un ingreso o entra al proceso para continuar.'}
                </p>
              </div>
              <Link
                className="vc-login-btn vc-summary-btn vc-yellow vc-summary-cta"
                href={currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/ingreso-activo'}
              >
                {currentEntry ? 'Abrir ingreso ->' : 'Crear ingreso ->'}
              </Link>
            </div>

            <div className="vc-kpi-row vc-kpi-row-upgrade">
              <article className="vc-kpi-card"><strong>{summary.active}</strong><span>ACTIVOS</span></article>
              <article className="vc-kpi-card"><strong>{summary.done}</strong><span>CERRADOS</span></article>
              <article className="vc-kpi-card"><strong>{summary.total}</strong><span>TOTAL</span></article>
            </div>
          </section>

          <section className="vc-section vc-section-tight">
            <h2 className="vc-section-title">Acciones rapidas</h2>
            <div className="vc-actions-grid vc-actions-grid-upgrade">
              {quickActions.map((action) => (
                <Link key={action.key} href={action.href} className={`vc-action-card ${action.primary ? 'is-primary' : ''}`}>
                  <span className="vc-action-icon" aria-hidden="true">{action.primary ? '⚡' : '○'}</span>
                  <h3>{action.title}</h3>
                  <p>{action.subtitle}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="vc-section vc-section-tight">
            <h2 className="vc-section-title">Indicadores</h2>
            <div className="vc-health-grid">
              <article className="vc-health-card">
                <div className="vc-health-head">
                  <strong>Flujo activo</strong>
                  <span>{activeRate}%</span>
                </div>
                <div className="vc-health-bar"><span style={{ width: `${activeRate}%` }} /></div>
                <p>Vehiculos actualmente en proceso</p>
              </article>
              <article className="vc-health-card">
                <div className="vc-health-head">
                  <strong>Resolucion</strong>
                  <span>{completionRate}%</span>
                </div>
                <div className="vc-health-bar"><span style={{ width: `${completionRate}%` }} /></div>
                <p>Casos finalizados o cancelados</p>
              </article>
            </div>
          </section>

          <section className="vc-section vc-section-tight">
            <h2 className="vc-section-title">Ultimos movimientos</h2>
            <div className="vc-secondary-card vc-movements-card">
              {latestEntries.length ? (
                latestEntries.map((item) => (
                  <Link key={item.id} href={`/vehiculos/${encodeURIComponent(item.placa)}`} className="vc-movement-row">
                    <div className="vc-movement-icon" aria-hidden="true">🚘</div>
                    <div className="vc-movement-text">
                      <strong>{item.vehiculo || item.placa} · {item.placa}</strong>
                      <p>{item.cliente || '-'} · {item.paso || 'Recepcion (Ingreso)'}</p>
                    </div>
                    <span className="vc-movement-go" aria-hidden="true">›</span>
                  </Link>
                ))
              ) : (
                <p className="vc-empty">Aun no hay movimientos recientes.</p>
              )}
            </div>

            <div className="vc-secondary-card vc-logout-wrap">
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
          </section>
        </div>
      </section>

      <BottomNav active="home" />
    </main>
  );
}
