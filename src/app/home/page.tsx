'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listVehicles } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { apiVehicleToEntry } from '@/lib/mapper';
import { getDemoEntries } from '@/lib/demoData';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
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
  const [role, setRoleState] = useState<Role>('administrativo');
  const [entries, setEntriesState] = useState<Entry[]>([]);
  const [currentEntry, setCurrentEntryState] = useState<Entry | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    const localEntries = getEntries();
    const seededEntries = localEntries.length ? localEntries : getDemoEntries();
    if (!localEntries.length) setEntries(seededEntries);
    const localCurrent = getCurrentEntry() || seededEntries[0] || null;

    queueMicrotask(() => {
      setRoleState(getRole());
      setEntriesState(seededEntries);
      setCurrentEntryState(localCurrent);
    });

    if (localCurrent) setCurrentEntry(localCurrent);

    (async () => {
      try {
        const vehicles = await listVehicles({ take: 50 });
        const mapped = vehicles.map(apiVehicleToEntry).filter(Boolean) as Entry[];
        if (!mapped.length) return;
        setEntries(mapped);
        setEntriesState(mapped);
        const nextCurrent = localCurrent || mapped[0] || null;
        setCurrentEntryState(nextCurrent);
        if (nextCurrent) setCurrentEntry(nextCurrent);
      } catch {
        // fallback local
      }
    })();
  }, [router]);

  const scopedEntries = useMemo(() => {
    if (role !== 'cliente') return entries;
    const identity = getClientIdentity();
    return entries.filter((entry) => isEntryAllowed(identity, entry));
  }, [entries, role]);

  const scopedCurrent = useMemo(() => {
    if (!scopedEntries.length) return null;
    if (currentEntry && scopedEntries.some((entry) => entry.id === currentEntry.id || entry.placa === currentEntry.placa)) return currentEntry;
    return scopedEntries[0] || null;
  }, [currentEntry, scopedEntries]);

  const summary = useMemo(() => summarize(scopedEntries), [scopedEntries]);
  const latestEntries = useMemo(() => scopedEntries.slice(0, 3), [scopedEntries]);
  const activeStatusLabel = scopedCurrent?.status === 'done' ? 'Finalizado' : scopedCurrent?.status === 'cancelled' ? 'Cancelado' : 'Activo';

  const processMetrics = useMemo(() => {
    const rows: ProcessRow[] = [
      { key: 'recepcion', label: 'Recepción', count: 0, pct: 0 },
      { key: 'diagnostico', label: 'Diagnóstico', count: 0, pct: 0 },
      { key: 'ejecucion', label: 'Ejecución', count: 0, pct: 0 },
      { key: 'entrega', label: 'Entrega / Cierre', count: 0, pct: 0 },
      { key: 'otros', label: 'Otros', count: 0, pct: 0 },
    ];

    for (const entry of scopedEntries) {
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
  }, [scopedEntries]);

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
                signOut();
                router.replace('/login');
              }}
            >
              {PROFILE_LABEL[role]}
            </button>
          </div>
          <h1 className="vc-title">Inicio operativo</h1>
          <p className="vc-subtitle">Este panel centraliza ingresos, estado de procesos, indicadores y movimientos recientes para gestionar la operación diaria de VCARS.</p>
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
                  {scopedCurrent ? `${scopedCurrent.vehiculo || 'Vehiculo'} · ${scopedCurrent.placa}` : 'Sin ingreso activo'}
                </h3>
                <p className="vc-summary-text">
                  {scopedCurrent
                    ? `${scopedCurrent.cliente || '-'} · ${scopedCurrent.status || 'active'}`
                    : 'Crea un ingreso o entra al proceso para continuar.'}
                </p>
              </div>
              <Link
                className="vc-login-btn vc-summary-btn vc-yellow vc-summary-cta"
                href={scopedCurrent ? `/vehiculos/${encodeURIComponent(scopedCurrent.placa)}` : '/ingreso-activo'}
              >
                {scopedCurrent ? 'Abrir ingreso ->' : 'Crear ingreso ->'}
              </Link>
            </div>

            <div className="vc-kpi-row vc-kpi-row-upgrade">
              <article className="vc-kpi-card"><strong>{summary.active}</strong><span>ACTIVOS</span></article>
              <article className="vc-kpi-card"><strong>{summary.done}</strong><span>CERRADOS</span></article>
              <article className="vc-kpi-card"><strong>{summary.total}</strong><span>TOTAL</span></article>
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
