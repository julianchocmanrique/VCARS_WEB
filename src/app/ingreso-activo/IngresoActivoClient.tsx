'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listVehicles } from '@/lib/api';
import { getCarPhotoByModel } from '@/lib/carPhoto';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { apiVehicleToEntry } from '@/lib/mapper';
import { applyDemoEntries } from '@/lib/demoData';
import { BottomNav } from '@/components/BottomNav';
import { FlowHeader } from '@/components/FlowHeader';
import { VehicleCard, type VehicleCardVariant } from '@/components/VehicleCard';
import { PremiumNavbar, type NavItem } from '@/components/navigation/PremiumNavbar';
import { PremiumDrawer } from '@/components/navigation/PremiumDrawer';
import { PremiumTabs, type TabItem } from '@/components/navigation/PremiumTabs';
import { ensureDemoFormsSeed } from '@/lib/orderForms';
import { SectionTransition } from '@/components/transitions/SectionTransition';
import { VehicleCardsSkeleton } from '@/components/skeletons';
import { getCurrentEntry, getEntries, getRole, getSession, setCurrentEntry, setEntries, type Entry, type Role } from '@/lib/storage';

type ProcessFilter = 'all' | 'active' | 'done' | 'critical';
type ProcessStage = 'all' | 'recepcion' | 'diagnostico' | 'ejecucion' | 'entrega' | 'otros';
type PartyFilterMode = 'all' | 'cliente' | 'empresa';

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Inicio', href: '/home' },
  { key: 'new', label: 'Nueva orden', href: '/nuevo-ingreso' },
  { key: 'process', label: 'Proceso', href: '/ingreso-activo' },
];

const FILTER_ITEMS: Array<TabItem<ProcessFilter>> = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'done', label: 'Cerrados' },
  { key: 'critical', label: 'Críticos' },
];

function normalize(entry: Entry): Entry {
  return { ...entry, status: entry.status || 'active' };
}

function toMillis(value?: string): number {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function sortByRecent(list: Entry[]): Entry[] {
  return [...list].sort((a, b) => {
    const am = Math.max(toMillis(a.updatedAt), toMillis(a.fecha));
    const bm = Math.max(toMillis(b.updatedAt), toMillis(b.fecha));
    return bm - am;
  });
}

function splitVehicleLabel(raw?: string): { name: string; version: string } {
  const value = String(raw || '').trim();
  if (!value) return { name: 'Vehículo sin nombre', version: '' };
  const parts = value.split(' ').filter(Boolean);
  if (parts.length <= 2) return { name: value, version: '' };
  return {
    name: parts.slice(0, 2).join(' '),
    version: parts.slice(2).join(' '),
  };
}

function statusLabel(entry: Entry): string {
  if (entry.status === 'cancelled') return 'Crítico';
  if (entry.status === 'done') return 'Cerrado';
  return 'En proceso';
}

function variantFor(entry: Entry, current: Entry | null): VehicleCardVariant {
  if (entry.status === 'cancelled') return 'critical';
  if (entry.status === 'done') return 'disabled';
  if (current && (entry.id === current.id || entry.placa === current.placa)) return 'selected';
  return 'default';
}

function shortDate(value?: string): string {
  const raw = String(value || '').trim();
  if (!raw) return 'Hoy';
  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return raw.slice(0, 10);
  return asDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function normalizeText(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function resolveProcessStage(step?: string): ProcessStage {
  const s = normalizeText(step);
  if (s.includes('recepcion') || s.includes('ingreso')) return 'recepcion';
  if (s.includes('diagnostico') || s.includes('cotizacion')) return 'diagnostico';
  if (s.includes('ejecucion') || s.includes('taller')) return 'ejecucion';
  if (s.includes('entrega') || s.includes('cierre')) return 'entrega';
  return 'otros';
}

function parseFilterTab(value: string | null): ProcessFilter {
  const raw = String(value || '').toLowerCase();
  if (raw === 'active' || raw === 'done' || raw === 'critical') return raw;
  return 'all';
}

const STAGE_LABEL: Record<Exclude<ProcessStage, 'all'>, string> = {
  recepcion: 'Recepción',
  diagnostico: 'Diagnóstico',
  ejecucion: 'Ejecución',
  entrega: 'Entrega / Cierre',
  otros: 'Otros',
};

export default function IngresoActivoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [role, setRoleState] = useState<Role>('administrativo');
  const [entries, setEntriesState] = useState<Entry[]>([]);
  const [warning, setWarning] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<ProcessFilter>(parseFilterTab(searchParams.get('estado')));
  const [partyFilterMode, setPartyFilterMode] = useState<PartyFilterMode>('all');
  const [partyFilterValue, setPartyFilterValue] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!session.token) {
      setWarning('Tu sesión no tiene token de backend. Vuelve a iniciar sesión para cargar datos reales.');
      router.replace('/login?reason=missing_token');
      return;
    }

    const localRole = getRole();
    const localRawEntries = getEntries();
    const seeded = applyDemoEntries(localRawEntries);
    setEntries(seeded);
    ensureDemoFormsSeed();
    const localEntries = sortByRecent(seeded.map(normalize));

    queueMicrotask(() => {
      setMounted(true);
      setRoleState(localRole);
      setEntriesState(localEntries);
    });

    (async () => {
      try {
        const vehicles = await listVehicles({ take: 50 });
        const mapped = vehicles.map(apiVehicleToEntry).filter(Boolean) as Entry[];
        const merged = applyDemoEntries(mapped);
        const normalized = sortByRecent(merged.map(normalize));
        setEntries(normalized);
        setEntriesState(normalized);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar desde backend';
        setWarning(msg);
      }
    })();
  }, [router]);

  const clientCompanyName = useMemo(() => {
    if (role !== 'cliente') return '';
    const identity = getClientIdentity();
    return String(identity?.name || identity?.companyName || '').trim();
  }, [role]);

  const filtered = useMemo(() => {
    if (!mounted) return [];

    const withCurrent = (() => {
      const current = getCurrentEntry();
      if (!current) return entries;
      if (entries.find((item) => item.id === current.id || item.placa === current.placa)) return entries;
      return [current, ...entries];
    })();

    if (role === 'cliente') {
      const identity = getClientIdentity();
      return withCurrent.filter((item) => isEntryAllowed(identity, item));
    }

    return withCurrent;
  }, [entries, mounted, role]);

  useEffect(() => {
    setFilterTab(parseFilterTab(searchParams.get('estado')));
  }, [searchParams]);

  useEffect(() => {
    if (role !== 'administrativo' && (partyFilterValue || partyFilterMode !== 'all')) {
      setPartyFilterMode('all');
      setPartyFilterValue('');
    }
  }, [partyFilterMode, partyFilterValue, role]);

  const stageFilter = useMemo<ProcessStage>(() => {
    const raw = (searchParams.get('proceso') || '').toLowerCase();
    if (raw === 'recepcion' || raw === 'diagnostico' || raw === 'ejecucion' || raw === 'entrega' || raw === 'otros') return raw;
    return 'all';
  }, [searchParams]);

  const viewEntries = useMemo(() => {
    let scoped = filtered;

    if (filterTab === 'active') scoped = scoped.filter((item) => (item.status || 'active') === 'active');
    else if (filterTab === 'done') scoped = scoped.filter((item) => item.status === 'done');
    else if (filterTab === 'critical') scoped = scoped.filter((item) => item.status === 'cancelled');

    if (stageFilter !== 'all') {
      scoped = scoped.filter((item) => resolveProcessStage(item.paso) === stageFilter);
    }

    if (role === 'administrativo' && partyFilterValue.trim()) {
      const needle = normalizeText(partyFilterValue);
      scoped = scoped.filter((item) => {
        const clientName = normalizeText(item.cliente);
        const companyName = normalizeText(item.empresa || item.companyEntity || item.invoiceName || item.email);
        if (partyFilterMode === 'cliente') return clientName.includes(needle);
        if (partyFilterMode === 'empresa') return companyName.includes(needle);
        return clientName.includes(needle) || companyName.includes(needle);
      });
    }

    return scoped;
  }, [filterTab, filtered, partyFilterMode, partyFilterValue, role, stageFilter]);

  const availableClients = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((item) => {
      const name = String(item.cliente || '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es-CO'));
  }, [filtered]);

  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((item) => {
      const name = String(item.empresa || item.companyEntity || item.invoiceName || item.email || '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es-CO'));
  }, [filtered]);

  const searchOptions = useMemo(() => {
    if (partyFilterMode === 'cliente') return availableClients;
    if (partyFilterMode === 'empresa') return availableCompanies;
    return Array.from(new Set([...availableClients, ...availableCompanies])).sort((a, b) => a.localeCompare(b, 'es-CO'));
  }, [availableClients, availableCompanies, partyFilterMode]);

  const currentEntry = getCurrentEntry();

  return (
    <main className="vc-page vc-shell process-premium-bg" suppressHydrationWarning>
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <div className="hidden lg:block">
        <PremiumNavbar
          items={NAV_ITEMS}
          activeKey="process"
          onMenuClick={() => setDrawerOpen(true)}
          rightSlot={<span className="hidden rounded-full border border-[rgba(58,61,66,0.9)] bg-[rgba(18,18,20,0.8)] px-3 py-1.5 text-[11px] font-semibold text-[#d1d5db] md:inline-flex">Proceso activo</span>}
        />
      </div>

      <PremiumDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={NAV_ITEMS}
        activeKey="process"
      />

      <section className="vc-panel vc-panel-narrow vc-panel-process">
        <FlowHeader subtitle="Listado de proceso" />

        <section className="vc-list-card process-wrap">
          <div className="vc-list-header process-header">
            <div className="process-header-main">
              <h2 className="vc-list-title">Lista de vehículos</h2>
              <p className="vc-list-subtitle">Cards premium con imagen, estado y placa</p>
            </div>
            <div className="vc-list-tools">
              <span className="vc-pill">{viewEntries.length}</span>
            </div>
          </div>

          <div className="mb-3">
            <PremiumTabs items={FILTER_ITEMS} active={filterTab} onChange={setFilterTab} />
          </div>

          {role === 'administrativo' ? (
            <div className="mb-3 rounded-xl border border-[rgba(31,95,159,0.35)] bg-[rgba(18,27,40,0.52)] px-3 py-3">
              <div className="vc-grid-2">
                <div>
                  <label className="vc-label" htmlFor="party-filter-mode">Filtrar por</label>
                  <div className="vc-input-wrap">
                    <select
                      id="party-filter-mode"
                      className="vc-select"
                      value={partyFilterMode}
                      onChange={(e) => {
                        setPartyFilterMode(e.target.value as PartyFilterMode);
                        setPartyFilterValue('');
                      }}
                    >
                      <option value="all">Cliente o empresa</option>
                      <option value="cliente">Cliente</option>
                      <option value="empresa">Empresa</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="vc-label" htmlFor="party-filter-search">Buscar</label>
                  <div className="vc-input-wrap">
                    <input
                      id="party-filter-search"
                      list="party-filter-options"
                      value={partyFilterValue}
                      onChange={(e) => setPartyFilterValue(e.target.value)}
                      placeholder={
                        partyFilterMode === 'cliente'
                          ? 'Escribe o selecciona cliente'
                          : partyFilterMode === 'empresa'
                            ? 'Escribe o selecciona empresa'
                            : 'Escribe o selecciona cliente/empresa'
                      }
                    />
                    <datalist id="party-filter-options">
                      {searchOptions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
              {partyFilterValue ? (
                <div className="mt-2 flex justify-end">
                  <button type="button" className="vc-btn" onClick={() => setPartyFilterValue('')}>
                    Limpiar filtro
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {stageFilter !== 'all' ? (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-[rgba(31,95,159,0.35)] bg-[rgba(18,27,40,0.52)] px-3 py-2 text-sm text-[#dff1ff]">
              <span>Filtro por etapa: <strong>{STAGE_LABEL[stageFilter]}</strong></span>
              <Link href="/ingreso-activo" className="rounded-full border border-[rgba(95,158,220,0.45)] px-2.5 py-1 text-xs text-[#bfe4ff] hover:bg-[rgba(95,158,220,0.14)]">Quitar</Link>
            </div>
          ) : null}

          {warning ? <div className="vc-warning">No se pudo cargar lista desde backend: {warning}</div> : null}

          {!mounted ? (
            <VehicleCardsSkeleton count={6} />
          ) : (
            <SectionTransition transitionKey={`${filterTab}-${stageFilter}`} className="process-grid-cards">
              {viewEntries.length ? (
                viewEntries.map((item, idx) => {
                  const vehicle = splitVehicleLabel(item.vehiculo || `Vehículo ${idx + 1}`);
                  return (
                    <VehicleCard
                      key={item.id}
                      href={`/vehiculos/${encodeURIComponent(item.placa)}`}
                      onClick={() => setCurrentEntry(item)}
                      imageUrl={getCarPhotoByModel(item.vehiculo, item.placa)}
                      imageAlt={`Foto de ${item.vehiculo || item.placa}`}
                      name={vehicle.name}
                      version={vehicle.version}
                      client={role === 'cliente' ? (clientCompanyName || item.cliente || 'Cliente') : (item.cliente || 'Cliente')}
                      process={item.paso || 'Orden de servicio'}
                      plate={item.placa}
                      statusLabel={statusLabel(item)}
                      metricA={{ label: 'OT', value: item.orderNumber || item.id.replace('entry-', '').slice(0, 6).toUpperCase() }}
                      metricB={{ label: 'Update', value: shortDate(item.updatedAt || item.fecha) }}
                      variant={variantFor(item, currentEntry)}
                      ctaLabel="Abrir"
                    />
                  );
                })
              ) : (
                <p className="vc-empty">No hay vehículos en este filtro.</p>
              )}
            </SectionTransition>
          )}

          <div className="vc-inline-actions">
            <Link href="/home" className="vc-btn">Volver al inicio</Link>
          </div>
        </section>
      </section>

      <BottomNav active="process" />
    </main>
  );
}
