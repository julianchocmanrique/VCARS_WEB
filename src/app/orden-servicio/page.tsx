'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BrandPill } from '@/components/BrandPill';
import { BottomNav } from '@/components/BottomNav';
import { getClientIdentity, isEntryAllowed } from '@/lib/clientIdentity';
import { canEditStep, getFormsForPlate, getRoleSteps, setStepField, setStepFields } from '@/lib/orderForms';
import { getCurrentEntry, getEntries, getRole, getSession, type Role } from '@/lib/storage';

type FieldDef = { key: string; label: string; placeholder: string };
type QuoteRow = { sistema: string; trabajo: string; unitPrice: string; qty: string };
type ExpenseRow = { actividad: string; tercero: string; cantidad: string; operario: string; costo: string };

type InventoryValue = 'S' | 'N' | 'C' | 'I' | '';

const STEP_FIELDS: Record<string, FieldDef[]> = {
  recepcion: [
    { key: 'fallaCliente', label: 'Falla reportada por el cliente', placeholder: 'Describe la falla' },
    { key: 'kilometraje', label: 'Kilometraje (km)', placeholder: '123456' },
    { key: 'tecnicoAsignado', label: 'Técnico asignado', placeholder: 'Nombre del técnico' },
    { key: 'wantsOldParts', label: '¿Desea conservar piezas cambiadas? (SI/NO)', placeholder: 'SI o NO' },
    { key: 'soatExpiry', label: 'SOAT (vencimiento)', placeholder: 'YYYY-MM-DD' },
    { key: 'rtmExpiry', label: 'Tecnomecánica (vencimiento)', placeholder: 'YYYY-MM-DD' },
    { key: 'condicionFisica', label: 'Reporte condición física', placeholder: 'Rayones, golpes, observaciones' },
  ],
  cotizacion_interna: [
    { key: 'diagnosticoTecnico', label: 'Diagnóstico del mecánico', placeholder: 'Diagnóstico' },
    { key: 'repuestos', label: 'Repuestos necesarios', placeholder: 'Lista de repuestos' },
  ],
  cotizacion_formal: [
    { key: 'cotizacionNumero', label: 'No. cotización', placeholder: 'COT-1001' },
    { key: 'cotizacionFecha', label: 'Fecha cotización', placeholder: 'YYYY-MM-DD' },
    { key: 'alcance', label: 'Alcance para cliente', placeholder: 'Detalle del trabajo y tiempos' },
    { key: 'condicionesPago', label: 'Condiciones de pago', placeholder: 'Contado / crédito a 30 días' },
  ],
  aprobacion: [
    { key: 'decisionCliente', label: 'Decisión del cliente', placeholder: 'Aprobado / No aprobado' },
    { key: 'comentariosCliente', label: 'Comentarios del cliente', placeholder: 'Comentarios o condiciones' },
    { key: 'decisionClienteAt', label: 'Fecha/hora decisión', placeholder: 'YYYY-MM-DD HH:mm' },
  ],
  trabajo: [
    { key: 'trabajoRealizado', label: 'Trabajo realizado', placeholder: 'Detalle de trabajo' },
    { key: 'evidenciasAdjuntas', label: 'Evidencias (nombres de archivo)', placeholder: 'foto1.jpg, factura.pdf' },
  ],
  entrega: [
    { key: 'fechaEntregaReal', label: 'Fecha entrega real', placeholder: '2026-03-16' },
    { key: 'firmaRecibe', label: 'Recibido por', placeholder: 'Nombre cliente' },
    { key: 'cierreObservaciones', label: 'Observaciones de cierre', placeholder: 'Comentarios finales de entrega' },
  ],
};

const INVENTORY_ITEMS = [
  'radio', 'cds', 'encendedor', 'ceniceros', 'reloj', 'cinturon', 'tapetes', 'parasoles', 'forros',
  'lucesTecho', 'espejos', 'chapas', 'kitCarretera', 'llantaRepuesto', 'herramienta', 'gatoPalanca',
  'llaveros', 'pernos', 'senales', 'antena', 'plumillas', 'exploradoras', 'tercerStop', 'tapaGasolina',
  'copasRuedas', 'manijas', 'elevavidrios', 'controlRemoto', 'lavaVidrio', 'tapaPanel', 'controlAA', 'tarjetaPropiedad',
];

function parseJsonRows<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function asMoney(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('es-CO').format(n);
}

function toNumberSafe(value: string): number {
  const v = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(v) ? v : 0;
}

export default function OrdenServicioPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('administrativo');
  const [plate, setPlate] = useState('');
  const [startStepIndex, setStartStepIndex] = useState(0);
  const [formsByStep, setFormsByStep] = useState<Record<string, Record<string, string>>>({});
  const [stepPos, setStepPos] = useState(0);

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    const localRole = getRole();
    const current = getCurrentEntry();
    const entries = getEntries();

    let queryPlate = '';
    let queryStartStep = 0;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      queryPlate = String(url.searchParams.get('plate') || '').trim().toUpperCase();
      const raw = Number(url.searchParams.get('startStep') || 0);
      queryStartStep = Number.isFinite(raw) ? raw : 0;
    }

    let resolvedPlate = queryPlate || String(current?.placa || '').trim().toUpperCase();
    if (!resolvedPlate && entries.length) resolvedPlate = String(entries[0]?.placa || '').trim().toUpperCase();

    if (localRole === 'cliente') {
      const identity = getClientIdentity();
      const allowed = entries.filter((entry) => isEntryAllowed(identity, entry));
      const requestedAllowed = allowed.some((entry) => String(entry.placa || '').toUpperCase() === resolvedPlate);
      if (!requestedAllowed) resolvedPlate = String(allowed[0]?.placa || resolvedPlate || '').trim().toUpperCase();
    }

    queueMicrotask(() => {
      setRole(localRole);
      setPlate(resolvedPlate);
      setStartStepIndex(queryStartStep);
      setFormsByStep(getFormsForPlate(resolvedPlate));
    });
  }, [router]);

  const steps = useMemo(() => getRoleSteps(role, formsByStep), [role, formsByStep]);

  useEffect(() => {
    if (!steps.length) {
      queueMicrotask(() => setStepPos(0));
      return;
    }

    const foundPos = steps.findIndex((step) => step.index === startStepIndex);
    const targetPos = foundPos >= 0 ? foundPos : 0;
    queueMicrotask(() => setStepPos(targetPos));
  }, [startStepIndex, steps]);

  const current = steps[stepPos] || steps[0];
  const currentKey = current?.key || '';
  const fields = useMemo(() => STEP_FIELDS[currentKey] || [], [currentKey]);
  const editable = current ? canEditStep(role, current.key) : false;
  const stepValues = formsByStep[currentKey] || {};
  const hasStepData = fields.some((field) => String(stepValues[field.key] || '').trim().length > 0);
  const showPendingForClient = role === 'cliente' && !editable && !hasStepData;

  const quoteRows = useMemo(() => {
    const rows = parseJsonRows<QuoteRow[]>(formsByStep.cotizacion_formal?.quoteItems, []);
    return rows.length ? rows : [{ sistema: '', trabajo: '', unitPrice: '', qty: '1' }];
  }, [formsByStep.cotizacion_formal?.quoteItems]);

  const expenseRows = useMemo(() => {
    const rows = parseJsonRows<ExpenseRow[]>(formsByStep.trabajo?.expenseItems, []);
    return rows.length ? rows : [{ actividad: '', tercero: '', cantidad: '1', operario: '', costo: '' }];
  }, [formsByStep.trabajo?.expenseItems]);

  const inventory = useMemo(() => {
    return parseJsonRows<Record<string, InventoryValue>>(formsByStep.recepcion?.inventarioAccesorios, {});
  }, [formsByStep.recepcion?.inventarioAccesorios]);

  function syncStepPatch(stepKey: string, patch: Record<string, string>) {
    if (!plate) return;
    const next = setStepFields(plate, stepKey, patch);
    setFormsByStep(next);
  }

  function updateField(fieldKey: string, value: string) {
    if (!plate || !current) return;
    const nextByStep = setStepField(plate, current.key, fieldKey, value);
    setFormsByStep(nextByStep);
  }

  function setQuoteRows(rows: QuoteRow[]) {
    const sub = rows.reduce((acc, row) => acc + toNumberSafe(row.unitPrice) * toNumberSafe(row.qty || '1'), 0);
    const iva = Math.round(sub * 0.19);
    const total = sub + iva;
    syncStepPatch('cotizacion_formal', {
      quoteItems: JSON.stringify(rows),
      cotizacionSubtotal: String(sub),
      cotizacionIva: String(iva),
      cotizacionTotal: String(total),
    });
  }

  function setExpenseRows(rows: ExpenseRow[]) {
    const operario = rows.reduce((acc, row) => acc + toNumberSafe(row.operario), 0);
    const costo = rows.reduce((acc, row) => acc + toNumberSafe(row.costo), 0);
    syncStepPatch('trabajo', {
      expenseItems: JSON.stringify(rows),
      expenseOperarioTotal: String(operario),
      expenseCostoTotal: String(costo),
    });
  }

  function setInventoryValue(item: string, value: InventoryValue) {
    const next = { ...inventory, [item]: value };
    syncStepPatch('recepcion', { inventarioAccesorios: JSON.stringify(next) });
  }

  return (
    <main className="vc-page vc-shell" suppressHydrationWarning>
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <header className="vc-detail-head">
          <BrandPill />
          <p className="vc-head-sub">Orden de servicio {plate ? `· ${plate}` : ''}</p>
        </header>

        <section className="vc-card">
          <h3>{current?.title || 'Orden de servicio'}</h3>

          <div className="vc-step-tabs">
            {steps.map((item, idx) => (
              <button
                key={item.key}
                className={`vc-step-tab ${idx === stepPos ? 'is-active' : ''}`}
                onClick={() => setStepPos(idx)}
                type="button"
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {role === 'cliente' && !editable ? (
            <p className="vc-subtitle-small">Vista cliente: este paso es informativo y se actualiza con el progreso del taller.</p>
          ) : null}

          {showPendingForClient ? (
            <div className="vc-warning">
              <p>En proceso: este paso aún no tiene información cargada por el taller.</p>
            </div>
          ) : (
            <div className="vc-step-fields">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="vc-label">{field.label}</label>
                  <div className="vc-input-wrap">
                    <input
                      value={formsByStep[currentKey]?.[field.key] || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateField(field.key, value);
                        if (currentKey === 'aprobacion' && field.key === 'decisionCliente' && value.trim()) {
                          updateField('decisionClienteAt', new Date().toISOString());
                        }
                      }}
                      placeholder={field.placeholder}
                      disabled={!editable}
                    />
                  </div>
                </div>
              ))}

              {currentKey === 'recepcion' ? (
                <div>
                  <label className="vc-label">Inventario de accesorios (S/N/C/I)</label>
                  <div className="vc-grid-2">
                    {INVENTORY_ITEMS.map((item) => (
                      <div key={item} className="vc-input-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--vc-muted)', textTransform: 'capitalize' }}>{item}</span>
                        <select
                          className="vc-select"
                          value={inventory[item] || ''}
                          disabled={!editable}
                          onChange={(e) => setInventoryValue(item, e.target.value as InventoryValue)}
                        >
                          <option value="">-</option>
                          <option value="S">S</option>
                          <option value="N">N</option>
                          <option value="C">C</option>
                          <option value="I">I</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {currentKey === 'cotizacion_formal' ? (
                <div className="vc-card" style={{ padding: 12 }}>
                  <h3 style={{ marginBottom: 8 }}>Items de cotización</h3>
                  <div className="vc-table-wrap">
                    <table className="vc-table">
                      <thead>
                        <tr>
                          <th>Sistema</th>
                          <th>Trabajo o repuesto</th>
                          <th>Valor unitario</th>
                          <th>Cantidad</th>
                          <th>Total línea</th>
                          {editable ? <th /> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {quoteRows.map((row, idx) => {
                          const line = toNumberSafe(row.unitPrice) * toNumberSafe(row.qty || '1');
                          return (
                            <tr key={`q-${idx}`}>
                              <td><input disabled={!editable} value={row.sistema} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], sistema: e.target.value };
                                setQuoteRows(next);
                              }} /></td>
                              <td><input disabled={!editable} value={row.trabajo} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], trabajo: e.target.value };
                                setQuoteRows(next);
                              }} /></td>
                              <td><input disabled={!editable} value={row.unitPrice} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], unitPrice: e.target.value };
                                setQuoteRows(next);
                              }} /></td>
                              <td><input disabled={!editable} value={row.qty} onChange={(e) => {
                                const next = [...quoteRows];
                                next[idx] = { ...next[idx], qty: e.target.value };
                                setQuoteRows(next);
                              }} /></td>
                              <td>${asMoney(line)}</td>
                              {editable ? (
                                <td>
                                  <button type="button" className="vc-btn" onClick={() => {
                                    const next = quoteRows.filter((_, i) => i !== idx);
                                    setQuoteRows(next.length ? next : [{ sistema: '', trabajo: '', unitPrice: '', qty: '1' }]);
                                  }}>-</button>
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {editable ? (
                    <button type="button" className="vc-btn" onClick={() => setQuoteRows([...quoteRows, { sistema: '', trabajo: '', unitPrice: '', qty: '1' }])}>+ Agregar ítem</button>
                  ) : null}

                  <div className="vc-summary-grid" style={{ marginTop: 8 }}>
                    <span>Subtotal</span><strong>${asMoney(toNumberSafe(formsByStep.cotizacion_formal?.cotizacionSubtotal || '0'))}</strong>
                    <span>IVA 19%</span><strong>${asMoney(toNumberSafe(formsByStep.cotizacion_formal?.cotizacionIva || '0'))}</strong>
                    <span>Total</span><strong>${asMoney(toNumberSafe(formsByStep.cotizacion_formal?.cotizacionTotal || '0'))}</strong>
                  </div>
                </div>
              ) : null}

              {currentKey === 'trabajo' ? (
                <div className="vc-card" style={{ padding: 12 }}>
                  <h3 style={{ marginBottom: 8 }}>Formato de gastos</h3>
                  <div className="vc-table-wrap">
                    <table className="vc-table">
                      <thead>
                        <tr>
                          <th>Actividad</th>
                          <th>Tercero</th>
                          <th>Cantidad</th>
                          <th>Operario</th>
                          <th>Costo</th>
                          {editable ? <th /> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {expenseRows.map((row, idx) => (
                          <tr key={`g-${idx}`}>
                            <td><input disabled={!editable} value={row.actividad} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], actividad: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            <td><input disabled={!editable} value={row.tercero} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], tercero: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            <td><input disabled={!editable} value={row.cantidad} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], cantidad: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            <td><input disabled={!editable} value={row.operario} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], operario: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            <td><input disabled={!editable} value={row.costo} onChange={(e) => {
                              const next = [...expenseRows];
                              next[idx] = { ...next[idx], costo: e.target.value };
                              setExpenseRows(next);
                            }} /></td>
                            {editable ? (
                              <td>
                                <button type="button" className="vc-btn" onClick={() => {
                                  const next = expenseRows.filter((_, i) => i !== idx);
                                  setExpenseRows(next.length ? next : [{ actividad: '', tercero: '', cantidad: '1', operario: '', costo: '' }]);
                                }}>-</button>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {editable ? (
                    <button type="button" className="vc-btn" onClick={() => setExpenseRows([...expenseRows, { actividad: '', tercero: '', cantidad: '1', operario: '', costo: '' }])}>+ Agregar gasto</button>
                  ) : null}

                  <div className="vc-summary-grid" style={{ marginTop: 8 }}>
                    <span>Total operario</span><strong>${asMoney(toNumberSafe(formsByStep.trabajo?.expenseOperarioTotal || '0'))}</strong>
                    <span>Total costo</span><strong>${asMoney(toNumberSafe(formsByStep.trabajo?.expenseCostoTotal || '0'))}</strong>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="vc-wizard-actions">
            <button className="vc-btn" disabled={stepPos === 0} onClick={() => setStepPos((s) => Math.max(0, s - 1))}>
              Anterior
            </button>
            <button
              className="vc-login-btn vc-wizard-next"
              onClick={() => setStepPos((s) => Math.min(Math.max(steps.length - 1, 0), s + 1))}
            >
              {stepPos === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </section>
      </section>

      <BottomNav active="process" />
    </main>
  );
}
