'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { listVehicles } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { apiVehicleToEntry } from '@/lib/mapper';
import { applyDemoEntries } from '@/lib/demoData';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { ensureDemoFormsSeed } from '@/lib/orderForms';
import { BottomNav } from '@/components/BottomNav';
import { HeroVcars } from '@/components/HeroVcars';
import { KPIStatCard } from '@/components/KPIStatCard';
import { PremiumNavbar, type NavItem } from '@/components/navigation/PremiumNavbar';
import { PremiumDrawer } from '@/components/navigation/PremiumDrawer';
import { DashboardKpiSkeleton, HeroPanelSkeleton, TableListSkeleton } from '@/components/skeletons';
import { vcarsMicroMotion, vcarsVariants } from '@/motion/variants';
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

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Inicio', href: '/home' },
  { key: 'new', label: 'Nuevo ingreso', href: '/nuevo-ingreso' },
  { key: 'process', label: 'Proceso', href: '/ingreso-activo' },
];

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

function kpiFilterHref(title: string): string {
  const key = normalizeText(title);
  if (key.includes('flujo activo')) return '/ingreso-activo?estado=active';
  if (key.includes('casos cerrados')) return '/ingreso-activo?estado=done';
  if (key.includes('alertas criticas')) return '/ingreso-activo?estado=critical';
  if (key.includes('recepcion')) return '/ingreso-activo?proceso=recepcion';
  return '/ingreso-activo';
}

export default function HomePage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const sectionItem = vcarsVariants.revealItem(Boolean(reduced));
  const [role, setRoleState] = useState<Role>('administrativo');
  const [entries, setEntriesState] = useState<Entry[]>([]);
  const [currentEntry, setCurrentEntryState] = useState<Entry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bootReady, setBootReady] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    const localEntries = getEntries();
    const seededEntries = applyDemoEntries(localEntries);
    setEntries(seededEntries);
    ensureDemoFormsSeed();
    const localCurrent = getCurrentEntry() || seededEntries[0] || null;

    queueMicrotask(() => {
      setRoleState(getRole());
      setEntriesState(seededEntries);
      setCurrentEntryState(localCurrent);
      setBootReady(true);
    });

    if (localCurrent) setCurrentEntry(localCurrent);

    (async () => {
      try {
        const vehicles = await listVehicles({ take: 50 });
        const mapped = vehicles.map(apiVehicleToEntry).filter(Boolean) as Entry[];
        const merged = applyDemoEntries(mapped);
        setEntries(merged);
        setEntriesState(merged);
        const nextCurrent = localCurrent || merged[0] || null;
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

  const clientCompanyName = useMemo(() => {
    if (role !== 'cliente') return '';
    const identity = getClientIdentity();
    return String(identity?.name || identity?.companyName || '').trim();
  }, [role]);

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
      recepcion: '#2a6fb7',
      diagnostico: '#2273b1',
      ejecucion: '#1f5f9f',
      entrega: '#6b7280',
      otros: '#3a3d42',
    } as const;

    if (!total) {
      return {
        total,
        rows: withPct,
        pieStyle: { background: 'conic-gradient(rgba(31, 95, 159, 0.18) 0deg 360deg)' } as const,
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

  const kpiModules = useMemo(() => {
    const pctActive = summary.total ? Math.round((summary.active / summary.total) * 100) : 0;
    const pctDone = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
    const pctCancelled = summary.total ? Math.round((summary.cancelled / summary.total) * 100) : 0;
    const receptionCount = processMetrics.rows.find((r) => r.key === 'recepcion')?.count || 0;
    const receptionPct = processMetrics.rows.find((r) => r.key === 'recepcion')?.pct || 0;

    return [
      {
        title: 'Flujo activo',
        value: summary.active,
        trendLabel: 'Operativos',
        trendValue: pctActive,
        insight: 'Vehículos en trabajo con avance operativo del taller.',
        progress: pctActive,
        variant: 'success' as const,
        featured: true,
      },
      {
        title: 'Casos cerrados',
        value: summary.done,
        trendLabel: 'Cumplidos',
        trendValue: pctDone,
        insight: 'Órdenes completadas y entregadas al cliente.',
        progress: pctDone,
        variant: 'neutral' as const,
      },
      {
        title: 'Alertas críticas',
        value: summary.cancelled,
        trendLabel: 'Riesgo',
        trendValue: pctCancelled,
        insight: summary.cancelled ? 'Hay vehículos cancelados que requieren revisión ejecutiva.' : 'Sin alertas críticas registradas.',
        progress: pctCancelled,
        variant: (summary.cancelled ? 'critical' : 'neutral') as 'critical' | 'neutral',
      },
      {
        title: 'En recepción',
        value: receptionCount,
        trendLabel: 'Etapa inicial',
        trendValue: receptionPct,
        insight: 'Vehículos esperando validación inicial y checklist técnico.',
        progress: receptionPct,
        variant: 'warning' as const,
      },
    ];
  }, [processMetrics.rows, summary.active, summary.cancelled, summary.done, summary.total]);

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <div className="hidden lg:block">
        <PremiumNavbar
          items={NAV_ITEMS}
          activeKey="home"
          onMenuClick={() => setDrawerOpen(true)}
          rightSlot={<span className="hidden rounded-full border border-[rgba(58,61,66,0.9)] bg-[rgba(18,18,20,0.8)] px-3 py-1.5 text-[11px] font-semibold text-[#d1d5db] md:inline-flex">{PROFILE_LABEL[role]}</span>}
        />
      </div>

      <PremiumDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={NAV_ITEMS}
        activeKey="home"
      />

      {bootReady ? (
        <HeroVcars
          roleLabel={PROFILE_LABEL[role]}
          headline=""
          subheadline=""
          primaryCtaLabel={scopedCurrent ? 'Abrir ingreso activo' : 'Crear nuevo ingreso'}
          primaryCtaHref={scopedCurrent ? `/vehiculos/${encodeURIComponent(scopedCurrent.placa)}` : '/nuevo-ingreso'}
          secondaryCtaLabel="Ver vehículos en proceso"
          secondaryCtaHref="/ingreso-activo"
          activeCount={summary.active}
          totalCount={summary.total}
          onSignOut={() => {
            signOut();
            router.replace('/login');
          }}
        />
      ) : (
        <HeroPanelSkeleton />
      )}

      <section className="vc-panel vc-panel-home-mobile">
        <div className="vc-home-layout">
          <motion.section variants={sectionItem} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="vc-section vc-section-tight">
            <h2 className="vc-section-title">Resumen</h2>
            {bootReady ? (
              <>
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
                        ? `${(role === 'cliente' ? (clientCompanyName || scopedCurrent.cliente || '-') : (scopedCurrent.cliente || '-'))} · ${scopedCurrent.status === 'done' ? 'Finalizado' : scopedCurrent.status === 'cancelled' ? 'Cancelado' : 'Activo'}`
                        : 'Crea un ingreso o entra al proceso para continuar.'}
                    </p>
                  </div>
                  <motion.div whileHover={vcarsMicroMotion.whileHover} whileTap={vcarsMicroMotion.whileTap} transition={vcarsMicroMotion.transition}><Link
                    className="vc-login-btn vc-summary-btn vc-yellow vc-summary-cta"
                    href={scopedCurrent ? `/vehiculos/${encodeURIComponent(scopedCurrent.placa)}` : '/ingreso-activo'}
                  >
                    {scopedCurrent ? 'Abrir ingreso ->' : 'Crear ingreso ->'}
                  </Link></motion.div>
                </div>

                <motion.div
                  variants={vcarsVariants.revealContainer(Boolean(reduced))}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.2 }}
                  className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2"
                >
                  {kpiModules.map((kpi, index) => (
                    <KPIStatCard
                      key={kpi.title}
                      title={kpi.title}
                      value={kpi.value}
                      trendLabel={kpi.trendLabel}
                      trendValue={kpi.trendValue}
                      insight={kpi.insight}
                      progress={kpi.progress}
                      variant={kpi.variant}
                      index={index}
                      featured={kpi.featured}
                      href={kpiFilterHref(kpi.title)}
                      ariaLabel={`Filtrar por ${kpi.title}`}
                    />
                  ))}
                </motion.div>
              </>
            ) : (
              <DashboardKpiSkeleton cards={4} />
            )}
          </motion.section>

          <motion.section variants={sectionItem} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="vc-section vc-section-tight">
            <h2 className="vc-section-title">Indicadores de proceso</h2>
            {bootReady ? (
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
                      <Link
                        key={row.key}
                        href={`/ingreso-activo?proceso=${row.key}`}
                        className="vc-pie-row vc-pie-row-link"
                        aria-label={`Ver vehículos en ${row.label}`}
                      >
                        <span className={`vc-dot vc-dot-${row.key}`} />
                        <span>{row.label}</span>
                        <strong>{row.count}</strong>
                        <em>{row.pct}%</em>
                      </Link>
                    ))}
                  </div>
                </article>
              </div>
            ) : (
              <TableListSkeleton rows={5} withHeader={false} />
            )}
          </motion.section>

          <motion.section variants={sectionItem} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="vc-section vc-section-tight">
            <h2 className="vc-section-title">Últimos movimientos</h2>
            <div className="vc-secondary-card vc-movements-card">
              {bootReady ? (
                latestEntries.length ? (
                  latestEntries.map((item) => (
                    <motion.div key={item.id} whileHover={vcarsMicroMotion.whileHover} whileTap={vcarsMicroMotion.whileTap} transition={vcarsMicroMotion.transition}><Link href={`/vehiculos/${encodeURIComponent(item.placa)}`} className="vc-movement-row">
                      <div className="vc-movement-icon" aria-hidden="true">🚘</div>
                      <div className="vc-movement-text">
                        <strong>{item.vehiculo || item.placa} · {item.placa}</strong>
                        <p>{role === 'cliente' ? (clientCompanyName || item.cliente || '-') : (item.cliente || '-')} · {item.paso || 'Recepcion (Ingreso)'}</p>
                      </div>
                      <span className="vc-movement-go" aria-hidden="true">›</span>
                    </Link></motion.div>
                  ))
                ) : (
                  <p className="vc-empty">Aún no hay movimientos recientes.</p>
                )
              ) : (
                <TableListSkeleton rows={3} />
              )}
            </div>
          </motion.section>
        </div>
      </section>

      <BottomNav active="home" />
    </main>
  );
}
