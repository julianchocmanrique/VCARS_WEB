'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getVehicleByPlate } from '@/lib/api';
import { apiVehicleToEntry } from '@/lib/mapper';
import { applyDemoEntries } from '@/lib/demoData';
import { getClientIdentity } from '@/lib/clientIdentity';
import { BottomNav } from '@/components/BottomNav';
import { FlowHeader } from '@/components/FlowHeader';
import { getEntries, getRole, getSession, setCurrentEntry, setEntries, type Entry, type Role } from '@/lib/storage';
import { ensureDemoFormsSeed, getFormsForPlate, getRoleSteps, isClientQuoteReady, setStepFields } from '@/lib/orderForms';
import { isStepComplete } from '@/lib/orderStepValidation';
import { normalizeStepTitle, stepIndexFromTitle } from '@/lib/process';
import { getVehicleEvidencePhoto } from '@/lib/carPhoto';

const PHOTO_SLOTS = [
  { key: 'superior', label: 'Superior' },
  { key: 'inferior', label: 'Inferior' },
  { key: 'lateralDerecho', label: 'Lateral derecho' },
  { key: 'lateralIzquierdo', label: 'Lateral izquierdo' },
  { key: 'frontal', label: 'Frontal' },
  { key: 'trasero', label: 'Trasero' },
] as const;

function normalizeLegacyStepLabel(label?: string): string {
  const raw = String(label || '').trim();
  if (!raw) return '';
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('recepcion') && normalized.includes('ingreso')) return 'Orden de servicio';
  if (normalized === 'recepcion') return 'Orden de servicio';
  if (normalized === 'recepcion (orden de servicio)') return 'Orden de servicio';
  return raw;
}

function evidenceImageStyle(zone: (typeof PHOTO_SLOTS)[number]['key']): React.CSSProperties {
  switch (zone) {
    case 'superior':
      return { objectPosition: '50% 8%', transform: 'scale(1.6)' };
    case 'inferior':
      return { objectPosition: '50% 95%', transform: 'scale(1.6)' };
    case 'lateralDerecho':
      return { objectPosition: '72% 58%', transform: 'scale(1.25)' };
    case 'lateralIzquierdo':
      return { objectPosition: '28% 58%', transform: 'scale(1.25)' };
    case 'frontal':
      return { objectPosition: '24% 62%', transform: 'scale(1.45)' };
    case 'trasero':
      return { objectPosition: '80% 62%', transform: 'scale(1.45)' };
    default:
      return {};
  }
}

export default function VehiculoDetallePage() {
  const router = useRouter();
  const params = useParams<{ plate: string }>();
  const plate = decodeURIComponent(params.plate || '').toUpperCase();

  const [role, setRoleState] = useState<Role>('administrativo');
  const [vehicle, setVehicle] = useState<Entry | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [formsByStep, setFormsByStep] = useState<Record<string, Record<string, string>>>({});
  const [warning, setWarning] = useState('');
  const [openBlocks, setOpenBlocks] = useState({
    resumenPrincipal: true,
    contactoFacturacion: false,
    fechasDocumentos: false,
    vehiculoRecepcion: false,
  });

  useEffect(() => {
    if (!getSession()) {
      router.replace('/login');
      return;
    }

    const localRole = getRole();
    const localRaw = getEntries();
    const seeded = applyDemoEntries(localRaw);
    setEntries(seeded);
    ensureDemoFormsSeed();

    const found = seeded.find((item) => String(item.placa).toUpperCase() === plate) || null;
    queueMicrotask(() => {
      setRoleState(localRole);
      setFormsByStep(getFormsForPlate(plate));
      if (!found) return;
      const normalizedStep = normalizeStepTitle(found.paso);
      const next = { ...found, paso: normalizedStep };
      setVehicle(next);
      setStepIndex(typeof found.stepIndex === 'number' ? found.stepIndex : stepIndexFromTitle(normalizedStep));
    });

    (async () => {
      try {
        const apiVehicle = await getVehicleByPlate(plate);
        const mapped = apiVehicleToEntry(apiVehicle);
        if (!mapped) return;

        const normalizedStep = normalizeStepTitle(mapped.paso);
        const localBase = getEntries().find((item) => String(item.placa || '').toUpperCase() === plate) || null;
        const next = { ...localBase, ...mapped, paso: normalizedStep };
        setVehicle(next);
        setStepIndex(stepIndexFromTitle(normalizedStep));

        const current = getEntries();
        const updated = current.some((item) => item.id === next.id)
          ? current.map((item) => (item.id === next.id ? next : item))
          : [next, ...current];
        setEntries(updated);
        setCurrentEntry(next);
        setFormsByStep(getFormsForPlate(plate));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo cargar el vehículo';
        const lowered = msg.toLowerCase();
        if (!lowered.includes('not found') && !lowered.includes('no autorizado')) {
          setWarning(msg);
        }
      }
    })();
  }, [plate, router]);

  const clientCompanyName = useMemo(() => {
    if (role !== 'cliente') return '';
    const identity = getClientIdentity();
    return String(identity?.name || identity?.companyName || '').trim();
  }, [role]);

  const visibleSteps = useMemo(() => getRoleSteps(role, formsByStep), [role, formsByStep]);
  const visibleIndices = visibleSteps.map((s) => s.index);
  const displayCurrentIndex = (() => {
    if (visibleIndices.includes(stepIndex)) return visibleIndices.indexOf(stepIndex);
    const prev = visibleIndices.filter((idx) => idx <= stepIndex).pop();
    return prev !== undefined ? visibleIndices.indexOf(prev) : 0;
  })();

  const currentVisibleStep = visibleSteps[Math.max(0, displayCurrentIndex)];
  const continueHref = `/orden-servicio?startStep=${currentVisibleStep?.index ?? stepIndex}&plate=${encodeURIComponent(plate)}`;

  const quoteReady = isClientQuoteReady(formsByStep);
  const approvalIndex = stepIndexFromTitle('Autorización del cliente');
  const finishIndex = stepIndexFromTitle('Entrega / Cierre (Admin)');
  const clientCanAuthorize = role === 'cliente' && quoteReady && stepIndex >= approvalIndex;

  const quoteData = formsByStep.cotizacion_formal || {};
  const approvalData = formsByStep.aprobacion || {};
  const receptionData = formsByStep.recepcion || {};
  const entregaData = formsByStep.entrega || {};
  const stepCompletionByKey = useMemo(() => {
    return Object.fromEntries(
      visibleSteps.map((step) => [step.key, isStepComplete(step.key, formsByStep, vehicle)]),
    ) as Record<string, boolean>;
  }, [visibleSteps, formsByStep, vehicle]);
  const allVisibleStepsComplete = visibleSteps.length > 0 && visibleSteps.every((step) => stepCompletionByKey[step.key]);
  const normalizedStatus = String(vehicle?.status || '').toLowerCase();
  const isServiceOrderComplete = stepIndex >= finishIndex
    || normalizedStatus === 'done'
    || normalizedStatus === 'completed'
    || normalizedStatus === 'finalizado'
    || normalizedStatus === 'cerrado'
    || normalizedStatus === 'closed'
    || normalizedStatus === 'entregado'
    || Boolean(entregaData.fechaEntregaReal)
    || Boolean(entregaData.firmaRecibe)
    || allVisibleStepsComplete;
  const intakePhotosByZone = useMemo(() => {
    const zone = vehicle?.intakePhotosByZone || {};
    const legacy = vehicle?.intakePhotos || [];
    const plateSeed = vehicle?.placa || plate;
    const modelSeed = vehicle?.vehiculo || '';
    const colorSeed = vehicle?.color || '';

    const current = {
      superior: String(zone.superior || legacy[0] || ''),
      inferior: String(zone.inferior || legacy[1] || ''),
      lateralDerecho: String(zone.lateralDerecho || legacy[2] || ''),
      lateralIzquierdo: String(zone.lateralIzquierdo || legacy[3] || ''),
      frontal: String(zone.frontal || legacy[4] || ''),
      trasero: String(zone.trasero || legacy[5] || ''),
    };

    const values = Object.values(current).filter(Boolean);
    const allSame = values.length >= 3 && new Set(values).size === 1;
    if (!allSame) return current;

    return {
      superior: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'superior'),
      inferior: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'inferior'),
      lateralDerecho: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'lateralDerecho'),
      lateralIzquierdo: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'lateralIzquierdo'),
      frontal: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'frontal'),
      trasero: getVehicleEvidencePhoto(modelSeed, plateSeed, colorSeed, 'trasero'),
    };
  }, [vehicle, plate]);
  const hasIntakePhotos = PHOTO_SLOTS.some((slot) => intakePhotosByZone[slot.key]);

  function setApprovalPatch(patch: Record<string, string>) {
    if (!plate) return;
    const next = setStepFields(plate, 'aprobacion', patch);
    setFormsByStep(next);
  }

  function toggleBlock(key: keyof typeof openBlocks) {
    setOpenBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function downloadServiceOrder(stepKey?: string, stepTitle?: string) {
    if (stepKey && !stepCompletionByKey[stepKey]) return;
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const safePlate = String(vehicle?.placa || plate || 'sin-placa').replace(/[^a-z0-9_-]+/gi, '_');
        const selectedStepTitle = stepTitle ? normalizeLegacyStepLabel(stepTitle) : 'Orden de servicio';
        const selectedForms = stepKey
          ? { [stepKey]: formsByStep[stepKey] || {} }
          : formsByStep;
        const selectedStepKey = stepKey || '';
        const stepData = selectedStepKey ? (selectedForms[selectedStepKey] || {}) : {};
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginX = 12;
        const contentWidth = pageWidth - marginX * 2;
        const labelWidth = 62;
        let y = 16;

        const asText = (value: unknown) => String(value ?? '').trim();
        const formatDate = (raw?: string) => {
          const v = String(raw || '').trim();
          if (!v) return '-';
          if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
          return v;
        };
        const paymentLabel = (() => {
          if (vehicle?.paymentMethod === 'contado') return 'Contado';
          if (vehicle?.paymentMethod === 'credito') return 'Crédito';
          if (vehicle?.paymentMethod === 'transferencia') return 'Transferencia';
          return vehicle?.paymentMethod || '-';
        })();

        const ensureSpace = (needed = 8) => {
          if (y + needed <= pageHeight - 14) return;
          doc.addPage();
          y = 16;
        };

        const drawHeader = () => {
          doc.setFillColor(13, 22, 38);
          doc.roundedRect(marginX, y - 6, contentWidth, 21, 3, 3, 'F');
          doc.setTextColor(235, 245, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.text('ORDEN DE SERVICIO', marginX + 5, y + 3);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(`No. ${vehicle?.orderNumber || '-'}`, pageWidth - marginX - 5, y + 3, { align: 'right' });
          doc.text(`Placa: ${vehicle?.placa || plate || '-'}`, pageWidth - marginX - 5, y + 9, { align: 'right' });
          y += 20;
          doc.setTextColor(20, 26, 32);
        };

        const drawSectionTitle = (title: string) => {
          ensureSpace(10);
          doc.setFillColor(228, 238, 250);
          doc.roundedRect(marginX, y, contentWidth, 7, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(14, 33, 58);
          doc.text(title.toUpperCase(), marginX + 3, y + 4.8);
          doc.setTextColor(20, 26, 32);
          y += 9;
        };

        const drawField = (label: string, value: string) => {
          const clean = asText(value) || '-';
          const lines = doc.splitTextToSize(clean, contentWidth - labelWidth - 6);
          const rowHeight = Math.max(6, lines.length * 4.2 + 1.3);
          ensureSpace(rowHeight + 1);
          doc.setDrawColor(225, 230, 236);
          doc.line(marginX, y + rowHeight, marginX + contentWidth, y + rowHeight);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(label, marginX + 1, y + 4.5);
          doc.setFont('helvetica', 'normal');
          doc.text(lines, marginX + labelWidth, y + 4.5);
          y += rowHeight + 1;
        };

        const drawFields = (rows: Array<{ label: string; value: string }>) => {
          rows.forEach((row) => drawField(row.label, row.value));
        };

        const drawQuoteItems = () => {
          const itemsRaw = String(stepData.quoteItems || '').trim();
          if (!itemsRaw) return;
          let rows: Array<{ sistema: string; trabajo: string; unitPrice: string; qty: string }> = [];
          try {
            rows = JSON.parse(itemsRaw);
          } catch {
            rows = [];
          }
          if (!Array.isArray(rows) || !rows.length) return;
          drawSectionTitle('Items de cotización');
          rows.forEach((row, idx) => {
            drawField(`Ítem ${idx + 1}`, `${row.sistema || '-'} | ${row.trabajo || '-'} | Cant: ${row.qty || '-'} | V/U: ${row.unitPrice || '-'}`);
          });
          drawField('Subtotal', asText(stepData.cotizacionSubtotal || '-'));
          drawField('IVA', asText(stepData.cotizacionIva || '-'));
          drawField('Total', asText(stepData.cotizacionTotal || '-'));
        };

        const drawExpenseItems = () => {
          const itemsRaw = String(stepData.expenseItems || '').trim();
          if (!itemsRaw) return;
          let rows: Array<{ actividad: string; tercero: string; cantidad: string; operario: string; costo: string }> = [];
          try {
            rows = JSON.parse(itemsRaw);
          } catch {
            rows = [];
          }
          if (!Array.isArray(rows) || !rows.length) return;
          drawSectionTitle('Gastos / ejecución');
          rows.forEach((row, idx) => {
            drawField(`Actividad ${idx + 1}`, `${row.actividad || '-'} | Tercero: ${row.tercero || '-'} | Cant: ${row.cantidad || '-'} | Operario: ${row.operario || '-'} | Costo: ${row.costo || '-'}`);
          });
        };

        const drawInventory = () => {
          if (selectedStepKey !== 'recepcion') return;
          const rawInventory = String(receptionData.inventarioAccesorios || stepData.inventarioAccesorios || '').trim();
          if (!rawInventory) return;
          let parsed: Record<string, string> = {};
          try {
            parsed = JSON.parse(rawInventory) as Record<string, string>;
          } catch {
            parsed = {};
          }
          const items = Object.entries(parsed).filter(([, value]) => asText(value));
          if (!items.length) return;
          drawSectionTitle('Inventario de accesorios');
          drawField('Convención', 'S: Sí | N: No | C: Completo | I: Incompleto');
          items.forEach(([key, value]) => {
            const prettyKey = key.replace(/([A-Z])/g, ' $1').trim();
            drawField(prettyKey, value);
          });
        };

        const toDataUrl = async (src: string): Promise<string> => {
          const value = asText(src);
          if (!value) return '';
          if (value.startsWith('data:image/')) return value;
          try {
            const response = await fetch(value);
            if (!response.ok) return '';
            const blob = await response.blob();
            const fileReader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              fileReader.onload = () => resolve(String(fileReader.result || ''));
              fileReader.onerror = () => reject(new Error('No se pudo leer imagen para PDF'));
              fileReader.readAsDataURL(blob);
            });
            return dataUrl;
          } catch {
            return '';
          }
        };

        const drawSignatures = async () => {
          if (selectedStepKey !== 'recepcion') return;
          const clientSignature = asText(receptionData.firmaClienteEmpresa || stepData.firmaClienteEmpresa);
          const workshopSignature = asText(receptionData.firmaTallerRecibe || stepData.firmaTallerRecibe);
          if (!clientSignature && !workshopSignature) return;

          ensureSpace(54);
          drawSectionTitle('Firmas');

          const boxW = (contentWidth - 8) / 2;
          const boxH = 32;
          const startY = y;
          const signatures: Array<{ title: string; src: string; x: number }> = [
            { title: 'Firma cliente / empresa', src: clientSignature, x: marginX },
            { title: 'Firma taller (quien recibe)', src: workshopSignature, x: marginX + boxW + 8 },
          ];

          for (const signature of signatures) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(signature.title, signature.x, startY);
            doc.setDrawColor(210, 220, 230);
            doc.rect(signature.x, startY + 2, boxW, boxH);
            if (signature.src) {
              const dataUrl = await toDataUrl(signature.src);
              if (dataUrl) {
                try {
                  doc.addImage(dataUrl, 'PNG', signature.x + 1.2, startY + 3.2, boxW - 2.4, boxH - 2.4);
                } catch {
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(8);
                  doc.text('Firma no disponible para impresión', signature.x + 2, startY + 18);
                }
              } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text('Firma no disponible para impresión', signature.x + 2, startY + 18);
              }
            } else {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              doc.text('Sin firma registrada', signature.x + 2, startY + 18);
            }
          }
          y = startY + boxH + 8;
        };

        const drawReceptionImages = async () => {
          if (selectedStepKey !== 'recepcion') return;
          const hasAnyImage = PHOTO_SLOTS.some((slot) => asText(intakePhotosByZone[slot.key]));
          if (!hasAnyImage) return;
          ensureSpace(20);
          doc.addPage();
          y = 16;
          drawSectionTitle('Registro fotográfico');
          const imgW = (contentWidth - 8) / 2;
          const imgH = 42;
          let col = 0;
          for (const slot of PHOTO_SLOTS) {
            const src = asText(intakePhotosByZone[slot.key]);
            const x = marginX + col * (imgW + 8);
            if (y + imgH + 8 > pageHeight - 12) {
              doc.addPage();
              y = 16;
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(slot.label, x, y);
            doc.setDrawColor(210, 220, 230);
            doc.rect(x, y + 2, imgW, imgH);
            const dataUrl = await toDataUrl(src);
            if (dataUrl) {
              try {
                doc.addImage(dataUrl, 'JPEG', x + 0.8, y + 2.8, imgW - 1.6, imgH - 1.6);
              } catch {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text('Imagen no disponible para impresión', x + 2, y + 18);
              }
            } else {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              doc.text('Sin imagen embebida', x + 2, y + 18);
            }
            col = col === 0 ? 1 : 0;
            if (col === 0) y += imgH + 12;
          }
        };

        drawHeader();
        drawSectionTitle('Información general');
        drawFields([
          { label: 'Formulario', value: selectedStepTitle },
          { label: 'Fecha ingreso', value: formatDate(vehicle?.fecha) },
          { label: 'Fecha prevista', value: formatDate(vehicle?.expectedDeliveryDate) },
          { label: 'Cliente', value: asText(vehicle?.ownerName || vehicle?.cliente) || '-' },
          { label: 'Empresa / entidad', value: asText(vehicle?.companyEntity || vehicle?.empresa) || '-' },
          { label: 'Vehículo', value: asText(vehicle?.vehiculo) || '-' },
          { label: 'Marca / Modelo', value: `${asText(vehicle?.marca) || '-'} / ${asText(vehicle?.modelo) || '-'}` },
          { label: 'Color', value: asText(vehicle?.color) || '-' },
          { label: 'Paso actual', value: normalizeLegacyStepLabel(vehicle?.paso) || '-' },
        ]);

        if (selectedStepKey === 'recepcion') {
          drawSectionTitle('Facturación');
          drawFields([
            { label: 'Factura a nombre de', value: asText(vehicle?.invoiceName) || '-' },
            { label: 'NIT / C.C facturación', value: asText(vehicle?.billingNitCc) || '-' },
            { label: 'Forma de pago', value: paymentLabel },
            { label: vehicle?.paymentMethod === 'transferencia' ? 'Medio transferencia' : 'Días crédito', value: vehicle?.paymentMethod === 'transferencia' ? (asText(vehicle?.transferChannel) || '-') : (asText(vehicle?.creditDays) || '-') },
          ]);
          drawSectionTitle('Recepción');
          drawFields([
            { label: 'Kilometraje', value: asText(stepData.kilometraje || receptionData.kilometraje) || '-' },
            { label: 'Nivel combustible', value: asText(vehicle?.fuelLevel) || '-' },
            { label: 'Técnico asignado', value: asText(stepData.tecnicoAsignado || receptionData.tecnicoAsignado) || '-' },
            { label: 'Falla reportada', value: asText(stepData.fallaCliente || receptionData.fallaCliente) || '-' },
            { label: 'Observaciones', value: asText(stepData.observacionesAccesorios || receptionData.observacionesAccesorios) || '-' },
            { label: 'SOAT', value: formatDate(stepData.soatExpiry || vehicle?.soatExpiry) },
            { label: 'Tecnomecánica', value: formatDate(stepData.rtmExpiry || vehicle?.rtmExpiry) },
          ]);
          drawInventory();
        } else {
          const fields = Object.entries(stepData)
            .filter(([key]) => !key.includes('Items') && key !== 'quoteItems' && key !== 'expenseItems')
            .map(([key, value]) => ({ label: key.replace(/([A-Z])/g, ' $1').trim(), value: asText(value) || '-' }));
          if (fields.length) {
            drawSectionTitle('Detalle del formulario');
            drawFields(fields);
          }
        }

        drawQuoteItems();
        drawExpenseItems();
        await drawSignatures();
        await drawReceptionImages();

        const safeStep = selectedStepTitle.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
        doc.save(`orden-servicio-${safePlate}-${safeStep}.pdf`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'No se pudo generar la descarga en PDF';
        setWarning(msg);
      }
    })();
  }

  return (
    <main className="vc-page vc-shell" suppressHydrationWarning>
      <div className="vc-bg-orb-left" />
      <div className="vc-bg-orb-right" />

      <section className="vc-panel vc-panel-narrow">
        <FlowHeader backHref="/ingreso-activo" subtitle="Detalle del vehículo" />

        {warning ? <div className="vc-warning">No se pudo cargar vehículo desde backend: {warning}</div> : null}

        <section className="vc-card">
          <h3>Resumen</h3>

          <button type="button" className="vc-accordion-toggle" onClick={() => toggleBlock('resumenPrincipal')} aria-expanded={openBlocks.resumenPrincipal}>
            <span>Datos principales</span>
            <span>{openBlocks.resumenPrincipal ? '−' : '+'}</span>
          </button>
          {openBlocks.resumenPrincipal ? (
            <div className="vc-summary-grid">
              <span>No. orden</span><strong>{vehicle?.orderNumber || '-'}</strong>
              <span>Placa</span><strong>{vehicle?.placa || '-'}</strong>
              <span>Cliente</span><strong>{role === 'cliente' ? (clientCompanyName || vehicle?.cliente || '-') : (vehicle?.cliente || '-')}</strong>
              <span>Vehículo</span><strong>{vehicle?.vehiculo || '-'}</strong>
              <span>Color</span><strong>{vehicle?.color || '-'}</strong>
              <span>Paso actual</span><strong>{normalizeLegacyStepLabel(vehicle?.paso) || '-'}</strong>
            </div>
          ) : null}

          <button type="button" className="vc-accordion-toggle" onClick={() => toggleBlock('contactoFacturacion')} aria-expanded={openBlocks.contactoFacturacion}>
            <span>Contacto y facturación</span>
            <span>{openBlocks.contactoFacturacion ? '−' : '+'}</span>
          </button>
          {openBlocks.contactoFacturacion ? (
            <div className="vc-summary-grid">
              <span>Propietario</span><strong>{vehicle?.ownerName || vehicle?.cliente || '-'}</strong>
              <span>Empresa / Entidad</span><strong>{vehicle?.companyEntity || vehicle?.empresa || '-'}</strong>
              <span>Teléfono</span><strong>{vehicle?.telefono || '-'}</strong>
              <span>NIT/CC</span><strong>{vehicle?.nitCc || '-'}</strong>
              <span>Dirección</span><strong>{vehicle?.direccion || '-'}</strong>
              <span>Correo</span><strong>{vehicle?.email || '-'}</strong>
              <span>Factura a nombre de</span><strong>{vehicle?.invoiceName || '-'}</strong>
              <span>NIT/CC facturación</span><strong>{vehicle?.billingNitCc || '-'}</strong>
              <span>Forma de pago</span><strong>{vehicle?.paymentMethod || '-'}</strong>
              <span>{vehicle?.paymentMethod === 'transferencia' ? 'Medio transferencia' : 'Días crédito'}</span>
              <strong>{vehicle?.paymentMethod === 'transferencia' ? (vehicle?.transferChannel || '-') : (vehicle?.creditDays || '-')}</strong>
            </div>
          ) : null}

          <button type="button" className="vc-accordion-toggle" onClick={() => toggleBlock('fechasDocumentos')} aria-expanded={openBlocks.fechasDocumentos}>
            <span>Fechas y documentos</span>
            <span>{openBlocks.fechasDocumentos ? '−' : '+'}</span>
          </button>
          {openBlocks.fechasDocumentos ? (
            <div className="vc-summary-grid">
              <span>Fecha ingreso</span><strong>{vehicle?.fecha ? String(vehicle.fecha).slice(0, 10) : '-'}</strong>
              <span>Fecha prevista entrega</span><strong>{vehicle?.expectedDeliveryDate || '-'}</strong>
              <span>SOAT</span><strong>{vehicle?.soatExpiry || '-'}</strong>
              <span>Tecnomecánica</span><strong>{vehicle?.rtmExpiry || '-'}</strong>
            </div>
          ) : null}

          <button type="button" className="vc-accordion-toggle" onClick={() => toggleBlock('vehiculoRecepcion')} aria-expanded={openBlocks.vehiculoRecepcion}>
            <span>Vehículo y recepción</span>
            <span>{openBlocks.vehiculoRecepcion ? '−' : '+'}</span>
          </button>
          {openBlocks.vehiculoRecepcion ? (
            <div className="vc-summary-grid">
              <span>Marca</span><strong>{vehicle?.marca || '-'}</strong>
              <span>Modelo</span><strong>{vehicle?.modelo || '-'}</strong>
              <span>Color</span><strong>{vehicle?.color || '-'}</strong>
              <span>Nivel combustible</span><strong>{vehicle?.fuelLevel || '-'}</strong>
              <span>Kilometraje</span><strong>{receptionData.kilometraje || '-'}</strong>
              <span>Técnico asignado</span><strong>{receptionData.tecnicoAsignado || vehicle?.tecnicoAsignado || '-'}</strong>
              <span>Conserva piezas</span><strong>{receptionData.wantsOldParts || vehicle?.wantsOldParts || '-'}</strong>
              <span>Falla cliente</span><strong>{receptionData.fallaCliente || '-'}</strong>
              <span>Obs. accesorios</span><strong>{receptionData.observacionesAccesorios || vehicle?.additionalAccessoriesNotes || '-'}</strong>
              <span>Condición física</span><strong>{receptionData.condicionFisica || vehicle?.condicionFisica || '-'}</strong>
            </div>
          ) : null}
        </section>

        {hasIntakePhotos ? (
          <section className="vc-card">
            <h3>Evidencias de orden de servicio</h3>
            <div className="vc-photo-grid">
              {PHOTO_SLOTS.map((slot) => {
                const src = intakePhotosByZone[slot.key];
                return (
                  <div key={slot.key} className="vc-photo-item">
                    <p className="vc-photo-title">{slot.label}</p>
                    {src ? (
                      <a href={src} target="_blank" rel="noreferrer" className="vc-photo-link">
                        <img
                          src={src}
                          alt={`Evidencia ${slot.label}`}
                          className="vc-photo-preview"
                          style={evidenceImageStyle(slot.key)}
                        />
                      </a>
                    ) : (
                      <div className="vc-photo-empty">Sin imagen</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="vc-card">
          <h3>Linea de tiempo</h3>
          <ul className="vc-timeline">
            {visibleSteps.map((step) => (
              <li key={step.key} className={stepCompletionByKey[step.key] ? 'done' : ''}>
                {normalizeLegacyStepLabel(step.title)}
              </li>
            ))}
          </ul>

          {role !== 'cliente' ? (
            <div className="vc-inline-actions">
              <Link href={continueHref} className="vc-login-btn vc-summary-btn vc-continue-btn">Continuar →</Link>
            </div>
          ) : (
            <div className="vc-inline-actions">
              <p className="vc-subtitle-small">Tu vista es informativa. El taller actualiza el avance internamente.</p>
            </div>
          )}
        </section>

        {role === 'cliente' ? (
          <section className="vc-card">
            <h3>Cotización cliente</h3>
            {quoteReady ? (
              <div className="vc-summary-grid">
                <span>No. cotización</span><strong>{quoteData.cotizacionNumero || '-'}</strong>
                <span>Fecha cotización</span><strong>{quoteData.cotizacionFecha || '-'}</strong>
                <span>Subtotal</span><strong>{quoteData.cotizacionSubtotal || '-'}</strong>
                <span>IVA</span><strong>{quoteData.cotizacionIva || '-'}</strong>
                <span>Total</span><strong>{quoteData.cotizacionTotal || '-'}</strong>
                <span>Alcance</span><strong>{quoteData.alcance || '-'}</strong>
              </div>
            ) : (
              <div className="vc-warning">
                <p>En proceso: la cotización para cliente aún no ha sido cargada por el taller.</p>
              </div>
            )}

            {clientCanAuthorize ? (
              <>
                <div className="vc-chip-row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="vc-chip"
                    onClick={() => setApprovalPatch({ decisionCliente: 'Aprobado', decisionClienteAt: new Date().toISOString() })}
                    style={String(approvalData.decisionCliente || '').toLowerCase() === 'aprobado' ? { borderColor: 'var(--vc-accent)', color: 'var(--vc-accent-ink)' } : undefined}
                  >
                    Autorizar
                  </button>
                  <button
                    type="button"
                    className="vc-chip"
                    onClick={() => setApprovalPatch({ decisionCliente: 'No aprobado', decisionClienteAt: new Date().toISOString() })}
                    style={String(approvalData.decisionCliente || '').toLowerCase() === 'no aprobado' ? { borderColor: 'var(--vc-danger)', color: '#ffb4b4' } : undefined}
                  >
                    No autorizar
                  </button>
                </div>

                <label className="vc-label" style={{ marginTop: 12 }}>Comentarios</label>
                <div className="vc-input-wrap">
                  <input
                    value={approvalData.comentariosCliente || ''}
                    onChange={(e) => setApprovalPatch({ comentariosCliente: e.target.value })}
                    placeholder="Escribe comentarios para el taller"
                  />
                </div>
                <p className="vc-subtitle-small">Fecha/hora decisión: {approvalData.decisionClienteAt || '-'}</p>
              </>
            ) : quoteReady ? (
              <p className="vc-subtitle-small" style={{ marginTop: 10 }}>La autorización estará disponible cuando el proceso llegue a ese paso.</p>
            ) : null}
          </section>
        ) : null}

        {role !== 'cliente' ? (
          <section className="vc-card">
            <h3>Formularios</h3>
            <div className="vc-forms-list">
              {visibleSteps.map((step) => (
                <div key={step.key} className="vc-form-row">
                  <Link
                    href={`/orden-servicio?startStep=${step.index}&plate=${encodeURIComponent(plate)}`}
                    className="vc-form-row-main"
                  >
                    <div className="vc-form-row-left">
                      <span className={`vc-form-dot ${stepCompletionByKey[step.key] ? 'done' : ''}`} />
                      <span>{normalizeLegacyStepLabel(step.title)}</span>
                    </div>
                  </Link>
                  <div className="vc-form-actions">
                    <Link
                      href={`/orden-servicio?startStep=${step.index}&plate=${encodeURIComponent(plate)}`}
                      className="vc-form-icon"
                      aria-label={`Editar ${normalizeLegacyStepLabel(step.title)}`}
                      title={`Editar ${normalizeLegacyStepLabel(step.title)}`}
                    >
                      ✎
                    </Link>
                    {stepCompletionByKey[step.key] ? (
                      <button
                        type="button"
                        className="vc-form-icon"
                        onClick={() => downloadServiceOrder(step.key, step.title)}
                        aria-label={`Descargar ${normalizeLegacyStepLabel(step.title)} en PDF`}
                        title={`Descargar ${normalizeLegacyStepLabel(step.title)} en PDF`}
                      >
                        ↓
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="vc-form-icon is-disabled"
                        onClick={() => downloadServiceOrder(step.key, step.title)}
                        aria-label={`Descarga bloqueada: ${normalizeLegacyStepLabel(step.title)} incompleto`}
                        title="Completa este formulario para habilitar la descarga"
                        disabled
                      >
                        ↓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <BottomNav active="process" />
    </main>
  );
}
