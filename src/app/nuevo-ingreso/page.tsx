'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { BrandPill } from '@/components/BrandPill';
import { BottomNav } from '@/components/BottomNav';
import { createIngreso } from '@/lib/api';
import { getEntries, setCurrentEntry, setEntries, type Entry } from '@/lib/storage';

export default function NuevoIngresoPage() {
  const router = useRouter();
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [recibio, setRecibio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!placa.trim() || !cliente.trim() || !telefono.trim() || !vehiculo.trim() || !recibio.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setSaving(true);
    setError('');

    let backend: { vehicle?: { id?: string }; entry?: { id?: string } } | null = null;
    try {
      backend = await createIngreso({
        plate: placa.trim(),
        customerName: cliente.trim(),
        customerPhone: telefono.trim(),
        vehicleModel: vehiculo.trim(),
        receivedBy: recibio.trim(),
      });
    } catch {
      backend = null;
    }

    const payload: Entry = {
      id: `entry-${Date.now()}`,
      placa: placa.trim().toUpperCase(),
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      vehiculo: vehiculo.trim(),
      paso: 'Recepción (Ingreso)',
      stepIndex: 0,
      status: 'active',
      fecha: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      backend: backend
        ? {
            vehicleId: backend.vehicle?.id,
            entryId: backend.entry?.id || null,
          }
        : undefined,
    };

    const list = getEntries();
    const next = [payload, ...list];
    setEntries(next);
    setCurrentEntry(payload);

    setSaving(false);
    router.push('/ingreso-activo');
  }

  return (
    <main className="vc-page vc-shell">
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <header className="vc-head-block">
          <BrandPill />
          <h1 className="vc-title">Nuevo ingreso</h1>
          <p className="vc-subtitle">Registra los datos del vehículo</p>
        </header>

        <form className="vc-form-card" onSubmit={onSubmit}>
          <div className="vc-grid-2">
            <div>
              <label className="vc-label">Placa</label>
              <div className="vc-input-wrap">
                <input value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC123" />
              </div>
            </div>
            <div>
              <label className="vc-label">Telefono</label>
              <div className="vc-input-wrap">
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="3000000000" />
              </div>
            </div>
          </div>

          <label className="vc-label">Cliente</label>
          <div className="vc-input-wrap">
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" />
          </div>

          <label className="vc-label">Marca / Modelo</label>
          <div className="vc-input-wrap">
            <input value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} placeholder="Ej: Mazda 3 Touring" />
          </div>

          <label className="vc-label">Recibio el vehiculo</label>
          <div className="vc-input-wrap">
            <input value={recibio} onChange={(e) => setRecibio(e.target.value)} placeholder="Nombre del recepcionista" />
          </div>

          {error ? <div className="vc-error">{error}</div> : null}

          <button className="vc-login-btn" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar ingreso'}
          </button>
        </form>
      </section>

      <BottomNav active="new" />
    </main>
  );
}
