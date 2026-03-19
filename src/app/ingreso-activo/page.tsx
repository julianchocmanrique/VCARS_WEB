'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listVehicles } from '@/lib/api';
import { getCarPhotoByModel } from '@/lib/carPhoto';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { apiVehicleToEntry } from '@/lib/mapper';
import { getDemoEntries } from '@/lib/demoData';
import { BottomNav } from '@/components/BottomNav';
import { BrandPill } from '@/components/BrandPill';
import { getCurrentEntry, getEntries, getRole, getSession, setCurrentEntry, setEntries, type Entry, type Role } from '@/lib/storage';

function normalize(entry: Entry): Entry {
  return { ...entry, status: entry.status || 'active' };
}

function statusLabel(status?: string): string {
  if (status === 'done') return 'Finalizado';
  if (status === 'cancelled') return 'Cancelado';
  return 'En proceso';
}

export default function IngresoActivoPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [role, setRoleState] = useState<Role>('administrativo');
  const [entries, setEntriesState] = useState<Entry[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    const localRole = getRole();
    const localRawEntries = getEntries();
    const seeded = localRawEntries.length ? localRawEntries : getDemoEntries();
    if (!localRawEntries.length) setEntries(seeded);
    const localEntries = seeded.map(normalize);

    queueMicrotask(() => {
      setMounted(true);
      setRoleState(localRole);
      setEntriesState(localEntries);
    });

    (async () => {
      try {
        const vehicles = await listVehicles({ take: 50 });
        const mapped = vehicles.map(apiVehicleToEntry).filter(Boolean) as Entry[];
        if (!mapped.length) return;
        const normalized = mapped.map(normalize);
        setEntries(normalized);
        setEntriesState(normalized);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar desde backend';
        if (!msg.toLowerCase().includes('no autorizado')) setWarning(msg);
      }
    })();
  }, [router]);

  const filtered = useMemo(() => {
    if (!mounted) return [];

    const withCurrent = (() => {
      const current = getCurrentEntry();
      if (!current) return entries;
      if (entries.find((item) => item.id === current.id || item.placa === current.placa)) return entries;
      return [current, ...entries];
    })();

    const modeScoped = withCurrent.filter((item) =>
      viewMode === 'history'
        ? item.status === 'done' || item.status === 'cancelled'
        : item.status !== 'done' && item.status !== 'cancelled',
    );

    if (role === 'tecnico') return modeScoped.filter((item) => item.status !== 'done' && item.status !== 'cancelled');
    if (role === 'cliente') {
      const identity = getClientIdentity();
      return modeScoped.filter((item) => isEntryAllowed(identity, item));
    }

    return modeScoped;
  }, [entries, mounted, role, viewMode]);

  return (
    <main className="vc-page vc-shell process-premium-bg" suppressHydrationWarning>
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <header className="vc-head-block">
          <BrandPill />
          <p className="vc-head-sub">Listado de proceso</p>
        </header>

        <section className="vc-list-card process-wrap">
          <div className="vc-list-header">
            <div>
              <h2 className="vc-list-title">{role === 'administrativo' && viewMode === 'history' ? 'Historial' : 'Explore Fleet'}</h2>
              <p className="vc-list-subtitle">Tarjetas de vehículos en proceso</p>
            </div>
            <div className="vc-list-tools">
              {role === 'administrativo' ? (
                <button className="vc-pill" onClick={() => setViewMode((m) => (m === 'active' ? 'history' : 'active'))}>
                  {viewMode === 'active' ? 'ACTIVOS' : 'HISTORIAL'}
                </button>
              ) : null}
              <span className="vc-pill">{filtered.length}</span>
            </div>
          </div>

          {warning ? <div className="vc-warning">No se pudo cargar lista desde backend: {warning}</div> : null}

          <div className="vc-list-rows">
            {filtered.length ? (
              filtered.map((item, idx) => (
                <Link
                  key={item.id}
                  href={`/vehiculos/${encodeURIComponent(item.placa)}`}
                  className="process-card"
                  onClick={() => setCurrentEntry(item)}
                >
                  <div className="process-copy">
                    <p className="process-name">{item.vehiculo || `Vehicle ${idx + 1}`}</p>
                    <p className="process-sub">{item.cliente || 'Cliente'} · {item.placa}</p>

                    <div className="process-tags">
                      <span>{statusLabel(item.status)}</span>
                      <span>{item.paso || 'Recepción (Ingreso)'}</span>
                    </div>

                    <p className="process-id">#{item.placa}</p>
                  </div>

                  <div className="process-media">
                    <Image
                      src={getCarPhotoByModel(item.vehiculo, item.placa)}
                      alt={`Foto de ${item.vehiculo || item.placa}`}
                      fill
                      sizes="(max-width: 520px) 100vw, 130px"
                      className="process-image"
                    />
                    <div className="process-overlay" />
                    <div className="process-badge">{(item.vehiculo || 'VCARS').split(' ')[0]}</div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="vc-empty">Sin autos inscritos por ahora.</p>
            )}
          </div>

          <div className="vc-inline-actions">
            <Link href="/home" className="vc-btn">Volver al inicio</Link>
          </div>
        </section>
      </section>

      <BottomNav active="process" />
    </main>
  );
}
