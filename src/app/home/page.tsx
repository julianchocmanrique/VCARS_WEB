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
  { key: 'new', label: 'Nueva orden', href: '/nuevo-ingreso' },
  { key: 'process', label: 'Proceso', href: '/ingreso-activo' },
];

type ProcessRow = {
  key: 'recepcion' | 'diagnostico' | 'ejecucion' | 'entrega' | 'otros';
  label: string;
  count: number;
  pct: number;
};

type WorkshopSlot = {
  key: string;
  label: string;
  leftPct: number;
  topPct: number;
};

const WORKSHOP_SLOTS: WorkshopSlot[] = [
  { key: 'slot-1', label: 'Puesto 1', leftPct: 18, topPct: 76 },
  { key: 'slot-2', label: 'Puesto 2', leftPct: 30, topPct: 76 },
  { key: 'slot-3', label: 'Puesto 3', leftPct: 18, topPct: 62 },
  { key: 'slot-4', label: 'Puesto 4', leftPct: 30, topPct: 62 },
  { key: 'slot-5', label: 'Puesto 5', leftPct: 18, topPct: 48 },
  { key: 'slot-6', label: 'Puesto 6', leftPct: 30, topPct: 48 },
  { key: 'slot-7', label: 'Puesto 7', leftPct: 18, topPct: 34 },
  { key: 'slot-8', label: 'Puesto 8', leftPct: 30, topPct: 34 },
  { key: 'slot-9', label: 'Puesto 9', leftPct: 82, topPct: 66 },
  { key: 'slot-10', label: 'Puesto 10', leftPct: 82, topPct: 54 },
  { key: 'slot-11', label: 'Puesto 11', leftPct: 82, topPct: 42 },
  { key: 'slot-12', label: 'Puesto 12', leftPct: 82, topPct: 30 },
];

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

function elapsedLabel(fromDateRaw?: string): string {
  const fromDate = new Date(String(fromDateRaw || ''));
  if (Number.isNaN(fromDate.getTime())) return '-';
  const diffMs = Math.max(0, Date.now() - fromDate.getTime());
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${Math.max(1, totalHours)}h`;
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
  const [selectedWorkshopSlot, setSelectedWorkshopSlot] = useState<string>(WORKSHOP_SLOTS[0]?.key || '');

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

  const workshopAssignments = useMemo(() => {
    const activeEntries = scopedEntries
      .filter((entry) => (entry.status || 'active') === 'active')
      .sort((a, b) => {
        const aTime = new Date(String(a.fecha || a.updatedAt || '')).getTime();
        const bTime = new Date(String(b.fecha || b.updatedAt || '')).getTime();
        return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
      });

    return WORKSHOP_SLOTS.map((slot, index) => {
      const entry = activeEntries[index] || null;
      return {
        ...slot,
        entry,
        occupied: Boolean(entry),
      };
    });
  }, [scopedEntries]);

  const effectiveSelectedWorkshopSlot = useMemo(() => {
    if (!workshopAssignments.length) return '';
    const exists = workshopAssignments.some((slot) => slot.key === selectedWorkshopSlot);
    if (exists) return selectedWorkshopSlot;
    return workshopAssignments.find((slot) => slot.occupied)?.key || workshopAssignments[0].key;
  }, [selectedWorkshopSlot, workshopAssignments]);

  const selectedWorkshopInfo = useMemo(() => {
    return workshopAssignments.find((slot) => slot.key === effectiveSelectedWorkshopSlot) || workshopAssignments[0] || null;
  }, [effectiveSelectedWorkshopSlot, workshopAssignments]);

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
          primaryCtaLabel={scopedCurrent ? 'Abrir orden activa' : 'Crear orden de servicio'}
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
                      <p className="vc-mini vc-mini-blue">ORDEN ACTIVA</p>
                      <span className="vc-status-chip">{activeStatusLabel}</span>
                    </div>
                    <h3 className="vc-summary-title">
                      {scopedCurrent ? `${scopedCurrent.vehiculo || 'Vehiculo'} · ${scopedCurrent.placa}` : 'Sin orden activa'}
                    </h3>
                    <p className="vc-summary-text">
                      {scopedCurrent
                        ? `${(role === 'cliente' ? (clientCompanyName || scopedCurrent.cliente || '-') : (scopedCurrent.cliente || '-'))} · ${scopedCurrent.status === 'done' ? 'Finalizado' : scopedCurrent.status === 'cancelled' ? 'Cancelado' : 'Activo'}`
                        : 'Crea una orden de servicio o entra al proceso para continuar.'}
                    </p>
                  </div>
                  <motion.div whileHover={vcarsMicroMotion.whileHover} whileTap={vcarsMicroMotion.whileTap} transition={vcarsMicroMotion.transition}><Link
                    className="vc-login-btn vc-summary-btn vc-yellow vc-summary-cta"
                    href={scopedCurrent ? `/vehiculos/${encodeURIComponent(scopedCurrent.placa)}` : '/ingreso-activo'}
                  >
                    {scopedCurrent ? 'Abrir orden ->' : 'Crear orden ->'}
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
            <h2 className="vc-section-title">Mapa de taller</h2>
            {bootReady ? (
              <div className="vc-secondary-card" style={{ padding: 12 }}>
                <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                  <div
                    className="relative overflow-hidden rounded-2xl border border-[rgba(62,129,194,0.35)] bg-[#0a0f18]"
                    style={{
                      minHeight: 420,
                      backgroundImage: [
                        'linear-gradient(180deg, rgba(8,14,24,0.92), rgba(6,11,18,0.96))',
                        'linear-gradient(90deg, rgba(37,99,167,0.09) 1px, transparent 1px)',
                        'linear-gradient(0deg, rgba(37,99,167,0.09) 1px, transparent 1px)',
                      ].join(','),
                      backgroundSize: '100% 100%, 28px 28px, 28px 28px',
                    }}
                  >
                    <div className="absolute inset-[3%] rounded-2xl border border-[rgba(185,220,255,0.2)]" />

                    <div className="absolute left-[6%] top-[10%] h-[72%] w-[44%] rounded-xl border border-[rgba(125,211,252,0.28)]">
                      <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2 bg-[rgba(125,211,252,0.25)]" />
                      <div className="absolute left-0 top-1/4 h-[1px] w-full bg-[rgba(125,211,252,0.25)]" />
                      <div className="absolute left-0 top-2/4 h-[1px] w-full bg-[rgba(125,211,252,0.25)]" />
                      <div className="absolute left-0 top-3/4 h-[1px] w-full bg-[rgba(125,211,252,0.25)]" />
                    </div>

                    <div className="absolute left-[56%] top-[10%] h-[72%] w-[12%] rounded-xl border border-[rgba(125,211,252,0.28)] bg-[rgba(19,34,53,0.2)]">
                      <div className="absolute left-1/2 top-[8%] h-[84%] w-[1px] -translate-x-1/2 border-l border-dashed border-[rgba(125,211,252,0.28)]" />
                      <p className="absolute left-1/2 top-[18%] -translate-x-1/2 text-xs text-[#d7ecff]">↑</p>
                      <p className="absolute left-1/2 bottom-[18%] -translate-x-1/2 text-xs text-[#d7ecff]">↓</p>
                    </div>

                    <div className="absolute left-[70%] top-[10%] h-[72%] w-[22%] rounded-xl border border-[rgba(125,211,252,0.28)]">
                      <div className="absolute left-0 top-1/5 h-[1px] w-full bg-[rgba(125,211,252,0.25)]" />
                      <div className="absolute left-0 top-2/5 h-[1px] w-full bg-[rgba(125,211,252,0.25)]" />
                      <div className="absolute left-0 top-3/5 h-[1px] w-full bg-[rgba(125,211,252,0.25)]" />
                      <div className="absolute left-0 top-4/5 h-[1px] w-full bg-[rgba(125,211,252,0.25)]" />
                    </div>

                    <div className="absolute left-[70%] top-[82%] h-[10%] w-[22%] rounded-xl border border-[rgba(125,211,252,0.28)] bg-[rgba(19,34,53,0.35)] p-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b8dfff]">Oficina</p>
                    </div>

                    <div className="absolute left-[6%] bottom-[5%] h-[10%] w-[62%] rounded-xl border border-[rgba(125,211,252,0.28)] bg-[rgba(19,34,53,0.35)] p-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b8dfff]">Ingreso y recepción</p>
                    </div>

                    {workshopAssignments.map((slot) => (
                      <button
                        key={slot.key}
                        type="button"
                        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-2 py-1 text-left shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
                        style={{
                          left: `${slot.leftPct}%`,
                          top: `${slot.topPct}%`,
                          minWidth: 108,
                          borderColor: slot.occupied ? 'rgba(90,197,136,0.65)' : 'rgba(107,114,128,0.65)',
                          background: slot.key === effectiveSelectedWorkshopSlot
                            ? 'linear-gradient(180deg, rgba(43,112,184,0.95), rgba(17,44,79,0.95))'
                            : 'linear-gradient(180deg, rgba(15,29,48,0.96), rgba(11,20,33,0.96))',
                          color: '#e6eef9',
                          backdropFilter: 'blur(2px)',
                        }}
                        onClick={() => setSelectedWorkshopSlot(slot.key)}
                      >
                        <p className="text-[11px] font-semibold">{slot.label}</p>
                        <p className="text-[10px] opacity-90">{slot.entry?.placa || 'Puesto vacío'}</p>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[rgba(62,129,194,0.35)] bg-[rgba(10,15,24,0.86)] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9fb9d8]">Detalle del puesto</p>
                    {selectedWorkshopInfo ? (
                      selectedWorkshopInfo.entry ? (
                        <div className="mt-2 space-y-2 text-sm text-[#dce8f8]">
                          <p><strong>{selectedWorkshopInfo.label}</strong></p>
                          <p>Vehículo: <strong>{selectedWorkshopInfo.entry.vehiculo || '-'}</strong></p>
                          <p>Placa: <strong>{selectedWorkshopInfo.entry.placa}</strong></p>
                          <p>Cliente: <strong>{selectedWorkshopInfo.entry.cliente || '-'}</strong></p>
                          <p>Proceso: <strong>{selectedWorkshopInfo.entry.paso || 'Orden de servicio'}</strong></p>
                          <p>Tiempo en taller: <strong>{elapsedLabel(selectedWorkshopInfo.entry.fecha || selectedWorkshopInfo.entry.updatedAt)}</strong></p>
                          <p>Estado: <strong>Ocupado</strong></p>
                          <Link
                            href={`/vehiculos/${encodeURIComponent(selectedWorkshopInfo.entry.placa)}`}
                            className="inline-flex rounded-lg border border-[rgba(95,158,220,0.45)] bg-[rgba(18,27,40,0.52)] px-3 py-1.5 text-xs font-semibold text-[#dff1ff] hover:bg-[rgba(37,75,126,0.55)]"
                          >
                            Ver vehículo
                          </Link>
                        </div>
                      ) : (
                        <div className="mt-2 space-y-2 text-sm text-[#dce8f8]">
                          <p><strong>{selectedWorkshopInfo.label}</strong></p>
                          <p>Estado: <strong>Puesto vacío</strong></p>
                          <p>Proceso: <strong>Disponible</strong></p>
                        </div>
                      )
                    ) : (
                      <p className="mt-2 text-sm text-[#dce8f8]">Sin información de puestos.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <TableListSkeleton rows={4} withHeader={false} />
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
                        <p>{role === 'cliente' ? (clientCompanyName || item.cliente || '-') : (item.cliente || '-')} · {item.paso || 'Orden de servicio'}</p>
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
