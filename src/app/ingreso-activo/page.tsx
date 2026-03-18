'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { listVehicles } from '@/lib/api';
import { getCarPhotoByModel } from '@/lib/carPhoto';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { apiVehicleToEntry } from '@/lib/mapper';
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
  const [role] = useState<Role>(() => getRole());
  const [entries, setEntriesState] = useState<Entry[]>(() => getEntries().map(normalize));
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

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
    const withCurrent = (() => {
      const current = getCurrentEntry();
      if (!current) return entries;
      if (entries.find((item) => item.id === current.id)) return entries;
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
  }, [entries, role, viewMode]);

  return (
    <main className="vc-page vc-shell process-premium-bg">
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

      <style jsx global>{`
        .process-premium-bg {
          background:
            radial-gradient(circle at 18% -8%, var(--vc-overlay-1), transparent 34%),
            radial-gradient(circle at 86% 20%, var(--vc-overlay-2), transparent 38%),
            var(--vc-bg);
        }

        .process-wrap {
          background: linear-gradient(180deg, rgba(6, 12, 22, 0.96), rgba(4, 9, 18, 0.98));
          border-color: var(--vc-panel-border);
        }

        .process-wrap .vc-list-rows {
          gap: 14px;
          padding-bottom: 96px;
        }

        .process-card {
          border: 1px solid var(--vc-card-border);
          border-radius: 18px;
          background:
            linear-gradient(125deg, rgba(8, 18, 31, 0.98), rgba(6, 14, 26, 0.96)),
            radial-gradient(circle at 12% 8%, rgba(88, 229, 245, 0.08), transparent 45%);
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr 130px;
          gap: 10px;
          min-height: 148px;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .process-card:hover {
          transform: translateY(-2px);
          border-color: rgba(92, 228, 242, 0.46);
          box-shadow: 0 12px 30px rgba(8, 26, 44, 0.45);
        }

        .process-name {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          color: var(--vc-text);
        }

        .process-sub {
          margin: 5px 0 0;
          color: var(--vc-muted);
          font-size: 13px;
        }

        .process-tags {
          margin-top: 8px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .process-tags span {
          border: 1px solid var(--vc-tag-border);
          background: var(--vc-tag-bg);
          color: var(--vc-accent-soft);
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 700;
        }

        .process-id {
          margin: 12px 0 0;
          font-size: 20px;
          font-weight: 900;
          color: var(--vc-accent);
        }

        .process-media {
          position: relative;
          border-radius: 14px;
          border: 1px solid var(--vc-media-border);
          background: #0a1422;
          overflow: hidden;
          min-height: 118px;
        }

        .process-image {
          object-fit: cover;
        }

        .process-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(4, 14, 26, 0.12), rgba(4, 14, 26, 0.68));
        }

        .process-badge {
          position: absolute;
          left: 8px;
          bottom: 8px;
          z-index: 1;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid var(--vc-badge-border);
          background: var(--vc-badge-bg);
          color: var(--vc-accent-ink);
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 0.6px;
          max-width: calc(100% - 16px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 520px) {
          .process-wrap .vc-list-rows {
            padding-bottom: 108px;
          }

          .process-card {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .process-media {
            min-height: 120px;
          }
        }
      `}</style>
    </main>
  );
}
