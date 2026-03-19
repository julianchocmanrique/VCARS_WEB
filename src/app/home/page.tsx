'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listVehicles } from '@/lib/api';
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

type ProcessRow = {
  key: 'recepcion' | 'diagnostico' | 'ejecucion' | 'entrega' | 'otros';
  label: string;
  count: number;
  pct: number;
};

function summarize(entries: Entry[]) {
  return {
    total: entries.length,
    active: entries.filter((e) => (e.status || 'active') === 'active').length,
    done: entries.filter((e) => e.status === 'done').length,
    cancelled: entries.filter((e) => e.status === 'cancelled').length,
  };
}

function normalizeText(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function resolveProcessKey(step?: string): ProcessRow['key'] {
  const s = normalizeText(step);
  if (s.includes('recepcion') || s.includes('ingreso')) return 'recepcion';
  if (s.includes('diagnostico') || s.includes('cotizacion')) return 'diagnostico';
  if (s.includes('ejecucion') || s.includes('taller')) return 'ejecucion';
  if (s.includes('entrega') || s.includes('cierre')) return 'entrega';
  return 'otros';
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

  const processMetrics = useMemo(() => {
    const rows: ProcessRow[] = [
      { key: 'recepcion', label: 'Recepción', count: 0, pct: 0 },
      { key: 'diagnostico', label: 'Diagnóstico', count: 0, pct: 0 },
      { key: 'ejecucion', label: 'Ejecución', count: 0, pct: 0 },
      { key: 'entrega', label: 'Entrega / Cierre', count: 0, pct: 0 },
      { key: 'otros', label: 'Otros', count: 0, pct: 0 },
    ];

    for (const entry of entries) {
      const key = resolveProcessKey(entry.paso);
      const idx = rows.findIndex((r) => r.key === key);
      if (idx >= 0) rows[idx].count += 1;
    }

    const total = rows.reduce((acc, row) => acc + row.count, 0);
    const withPct = rows.map((row) => ({
      ...row,
      pct: total ? Math.round((row.count / total) * 100) : 0,
    }));

    const palette = {
      recepcion: 'var(--vc-accent)',
      diagnostico: '#42b4ff',
      ejecucion: '#8f84ff',
      entrega: '#ffb85c',
      otros: '#ff7f9d',
    } as const;

    if (!total) {
      return {
        total,
        rows: withPct,
        pieStyle: { background: 'conic-gradient(rgba(71, 201, 223, 0.14) 0deg 360deg)' } as const,
      };
    }

    let cursor = 0;
    const segments: string[] = [];
    for (const row of withPct) {
      const size = (row.count / total) * 360;
      const next = cursor + size;
      segments.push(`${palette[row.key]} ${cursor.toFixed(1)}deg ${next.toFixed(1)}deg`);
      cursor = next;
    }

    return {
      total,
      rows: withPct,
      pieStyle: { background: `conic-gradient(${segments.join(', ')})` } as const,
    };
  }, [entries]);

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

  const firstGuide = [
    {
      n: '1',
      title: 'Revisa el estado actual',
      text: currentEntry ? `Tienes un ingreso activo: ${currentEntry.placa}` : 'Aún no hay ingreso activo. Puedes crear uno.',
      href: currentEntry ? `/vehiculos/${encodeURIComponent(currentEntry.placa)}` : '/nuevo-ingreso',
      cta: currentEntry ? 'Abrir ingreso' : 'Crear ingreso',
    },
    {
      n: '2',
      title: 'Ejecuta la acción principal',
      text: role === 'administrativo' ? 'Registra un ingreso o continúa el historial.' : role === 'tecnico' ? 'Entra a ingresos activos y continúa el flujo.' : 'Consulta tus vehículos y su progreso.',
      href: quickActions[0].href,
      cta: quickActions[0].title,
    },
    {
      n: '3',
      title: 'Monitorea el proceso',
      text: 'Usa los indicadores de etapa y últimos movimientos para seguimiento.',
      href: '/ingreso-activo',
      cta: 'Ver proceso',
    },
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
          <p className="vc-subtitle">Todo está ordenado por pasos para que sepas qué hacer primero.</p>
          <div className="vc-home-divider" />
        </header>

        <div className="vc-home-layout">
          <section className="vc-section vc-section-tight">
            <h2 className="vc-section-title">Guía rápida</h2>
            <div className="vc-guide-grid">
              {firstGuide.map((item) => (
                <article className="vc-guide-card" key={item.n}>
                  <span className="vc-guide-n">{item.n}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <Link href={item.href} className="vc-guide-link">{item.cta} {'>'}</Link>
                </article>
              ))}
            </div>
          </section>

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
            <h2 className="vc-section-title">Acciones rápidas</h2>
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
            <h2 className="vc-section-title">Indicadores de proceso</h2>
            <div className="vc-pie-layout">
              <article className="vc-pie-card">
                <div className="vc-pie-chart" style={processMetrics.pieStyle}>
                  <div className="vc-pie-hole">
                    <strong>{processMetrics.total}</strong>
                    <span>Total</span>
                  </div>
                </div>

                <div className="vc-pie-legend">
                  {processMetrics.rows.map((row) => (
                    <div key={row.key} className="vc-pie-row">
                      <span className={`vc-dot vc-dot-${row.key}`} />
                      <span>{row.label}</span>
                      <strong>{row.count}</strong>
                      <em>{row.pct}%</em>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="vc-section vc-section-tight">
            <h2 className="vc-section-title">Últimos movimientos</h2>
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
                <p className="vc-empty">Aún no hay movimientos recientes.</p>
              )}
            </div>
          </section>
        </div>
      </section>

      <BottomNav active="home" />
    </main>
  );
}
