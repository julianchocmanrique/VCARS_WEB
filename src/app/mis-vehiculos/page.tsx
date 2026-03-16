'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getVehicleByPlate } from '@/lib/api';
import { getClientIdentity, isEntryAllowed, setClientIdentity } from '@/lib/clientIdentity';
import { apiVehicleToEntry } from '@/lib/mapper';
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
    <main className="vc-page">
      <section className="vc-panel">
        <div className="vc-top-row">
          <div>
            <div className="vc-brand">VCARS</div>
            <h1>Mis vehículos</h1>
            <p>{identityName ? `Asociado a ${identityName}` : 'Solo ves tus placas asociadas.'}</p>
          </div>
          <Link href="/home" className="vc-btn">Volver</Link>
        </div>

        {!plates.length ? (
          <div className="vc-warning">
            <p>Aún no tienes placas asociadas.</p>
            <button
              className="vc-btn vc-btn-primary"
              onClick={() => {
                const identity = setClientIdentity({ type: 'personal', name: 'Cliente', plates: ['ABC123'] });
                setPlates(identity.plates);
              }}
            >
              Agregar placa de prueba (ABC123)
            </button>
          </div>
        ) : null}

        <div className="vc-list">
          {entries.map((item) => (
            <Link key={item.id} href={`/vehiculos/${encodeURIComponent(item.placa)}`} className="vc-item">
              <div>
                <strong>{item.placa}</strong>
                <p>{item.vehiculo || item.cliente || 'Vehículo'}</p>
              </div>
              <span>{item.paso || 'En proceso'}</span>
            </Link>
          ))}
        </div>

        {plates.length && !entries.length ? <p className="vc-empty">No encontramos registros para tus placas.</p> : null}
      </section>
    </main>
  );
}
