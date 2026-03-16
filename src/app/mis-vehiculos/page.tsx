'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getVehicleByPlate } from '@/lib/api';
import { getClientIdentity, isEntryAllowed, setClientIdentity } from '@/lib/clientIdentity';
import { apiVehicleToEntry } from '@/lib/mapper';
import { BottomNav } from '@/components/BottomNav';
import { BrandPill } from '@/components/BrandPill';
import { getEntries, getRole, getSession, setEntries, type Entry } from '@/lib/storage';

function normalizePlate(p: string): string {
  return String(p || '').trim().toUpperCase();
}

export default function MisVehiculosPage() {
  const router = useRouter();
  const [entries, setEntriesState] = useState<Entry[]>([]);
  const [plates, setPlates] = useState<string[]>([]);
  const [identityName, setIdentityName] = useState('');

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }
    if (getRole() !== 'cliente') {
      router.replace('/home');
      return;
    }

    (async () => {
      const identity = getClientIdentity();
      const allowedPlates = Array.isArray(identity?.plates) ? identity.plates.map(normalizePlate) : [];
      setPlates(allowedPlates);
      setIdentityName(identity?.companyName || identity?.name || '');

      if (allowedPlates.length) {
        try {
          const fetched = await Promise.all(
            allowedPlates.map(async (plate) => {
              try {
                const vehicle = await getVehicleByPlate(plate);
                return apiVehicleToEntry(vehicle);
              } catch {
                return null;
              }
            }),
          );
          const list = fetched.filter(Boolean) as Entry[];
          setEntries(list);
          setEntriesState(list.filter((entry) => isEntryAllowed(identity, entry)));
          return;
        } catch {
          // fallback local below
        }
      }

      const local = getEntries();
      setEntriesState(local.filter((entry) => isEntryAllowed(identity, entry)));
    })();
  }, [router]);

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <header className="vc-head-block">
          <BrandPill />
          <p className="vc-head-sub">Mis vehículos</p>
          <p className="vc-subtitle-small">
            {identityName ? `Solo ves vehículos asociados a ${identityName}.` : 'Solo ves vehículos asociados a tu cuenta.'}
          </p>
        </header>

        {!plates.length ? (
          <div className="vc-warning">
            <p>Aún no tienes placas asociadas.</p>
            <button
              className="vc-login-btn"
              onClick={() => {
                const identity = setClientIdentity({ type: 'personal', name: 'Cliente', plates: ['ABC123'] });
                setPlates(identity.plates);
              }}
            >
              Agregar placa de prueba (ABC123)
            </button>
          </div>
        ) : null}

        <div className="vc-list-rows">
          {entries.map((item) => (
            <Link key={item.id} href={`/vehiculos/${encodeURIComponent(item.placa)}`} className="vc-vehicle-main vc-vehicle-standalone">
              <div>
                <strong>{item.placa}</strong>
                <p>{item.vehiculo || item.cliente || 'Vehículo'}</p>
              </div>
              <span className="vc-step-pill">{item.paso || 'En proceso'}</span>
            </Link>
          ))}
        </div>

        {plates.length && !entries.length ? <p className="vc-empty">No encontramos registros para tus placas todavía.</p> : null}
      </section>

      <BottomNav active="home" />
    </main>
  );
}
