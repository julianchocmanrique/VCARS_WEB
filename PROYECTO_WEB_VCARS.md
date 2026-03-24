# VCARS WEB — Product Dossier

> Documento maestro del producto VCARS WEB.
> Consolida visión, alcance, roles, flujos, arquitectura funcional, estado actual y roadmap del sistema para el taller automotriz.

---

## 1. Visión del producto

VCARS WEB busca ser la plataforma operativa y de seguimiento del taller, conectando en tiempo real a **administración**, **equipo técnico** y **clientes** dentro de un mismo flujo de servicio.

El objetivo es que cada vehículo tenga trazabilidad completa desde el ingreso hasta la entrega, con permisos por rol, avance por etapas y comunicación clara para reducir reprocesos, tiempos muertos y fricción con el cliente.

VCARS WEB no es solo una interfaz bonita: es el tablero central de operación del taller.

---

## 2. Problema que resolvemos

Hoy en muchos talleres la operación se fragmenta entre WhatsApp, notas manuales y llamadas. Esto genera:

- poca trazabilidad por vehículo
- falta de claridad sobre el estado real del proceso
- dificultad para que el cliente entienda en qué etapa va su carro
- errores de coordinación entre recepción, técnico y administración
- retrasos en autorizaciones y cierres

VCARS WEB centraliza el proceso para que cada actor vea solo lo que necesita y actúe en el momento correcto.

---

## 3. Propuesta de valor de VCARS

- Gestión del flujo de taller por etapas operativas
- Vista de tablero para operación diaria (inicio, ingreso activo, proceso, nuevo ingreso)
- Seguimiento por vehículo con historial visual y estado actual
- Control por roles (administrador, técnico, cliente empresa, cliente particular)
- Experiencia visual premium adaptada a web, inspirada en la app móvil existente

---

## 4. Alcance actual del producto (MVP web)

VCARS WEB está implementado en **Next.js** y enfocado en replicar la experiencia de la app móvil actual, con prioridad en:

- home operativo
- listado y tarjetas de procesos
- detalle de vehículo
- formularios por etapa
- reglas de acceso por perfil

### Módulos principales

- **Login y sesión por rol**
- **Inicio operativo**
- **Ingreso activo** (listado de procesos/vehículos)
- **Detalle del vehículo**
- **Orden de servicio / formularios**
- **Nuevo ingreso**

---

## 5. Roles y permisos

### 5.1 Administrador

- Usuario: `david@vcars.com`
- Contraseña: `1111`
- Alcance:
  - acceso total a todos los vehículos y procesos
  - visualiza y gestiona todas las etapas
  - puede validar, cerrar o ajustar información global

### 5.2 Técnico

- Usuario: `julian@vcars.com`
- Contraseña: `2222`
- Alcance:
  - ve y actualiza la operación técnica
  - diligencia formularios internos del taller
  - avanza estados según ejecución operativa

### 5.3 Cliente empresa (cuentas corporativas)

- `congreso@gobierno.com` / `3333`
- `alcaldia@alcaldia.com` / `4444`
- Alcance:
  - solo visualiza los vehículos asociados a su empresa
  - ve avance de su proceso en tiempo real (modo lectura)
  - solo puede autorizar cuando el flujo llega al paso de autorización
  - no ve cotización interna del taller

### 5.4 Cliente particular

- `juli@gm.com` / `5555`
- Alcance:
  - ve únicamente su vehículo
  - seguimiento por etapa en modo cliente
  - puede autorizar/rechazar cuando corresponda

---

## 6. Reglas de visibilidad por etapa

Flujo base del proceso del vehículo:

1. Recepción (Ingreso)
2. Diagnóstico / Cotización interna
3. Cotización al cliente (visible para cliente)
4. Autorización del cliente (acción cliente)
5. Ejecución (Taller)
6. Entrega / Cierre (Admin)

### 6.1 Recepción (Ingreso)

- Objetivo:
  - registrar la entrada formal del vehículo al taller.
- Qué se captura:
  - datos del cliente/empresa, placa, vehículo, kilometraje, falla reportada, evidencias iniciales.
- Quién edita:
  - técnico y administrador.
- Qué ve el cliente:
  - confirmación de que el vehículo ingresó, datos básicos y estado inicial.
- Criterio de salida:
  - orden creada y checklist de recepción completo.

### 6.2 Diagnóstico / Cotización interna

- Objetivo:
  - definir causa técnica, alcance de reparación y costo interno de taller.
- Qué se captura:
  - diagnóstico técnico, repuestos requeridos, horas estimadas, costo interno y observaciones mecánicas.
- Quién edita:
  - técnico (principal) y administrador.
- Qué ve el cliente:
  - no ve detalle interno ni costos internos.
- Criterio de salida:
  - diagnóstico validado y propuesta lista para convertir en cotización cliente.

### 6.3 Cotización al cliente (visible para cliente)

- Objetivo:
  - presentar al cliente el alcance y valor final que puede aprobar o rechazar.
- Qué se captura:
  - ítems cotizados para cliente, tiempos estimados, términos y vigencia.
- Quién edita:
  - administrador y técnico autorizado.
- Qué ve el cliente:
  - resumen claro de servicios, valores finales y tiempos.
- Criterio de salida:
  - cotización publicada para decisión del cliente.

### 6.4 Autorización del cliente (acción cliente)

- Objetivo:
  - obtener la decisión formal del cliente antes de ejecutar.
- Qué se captura:
  - estado de autorización (aprobado/rechazado), fecha/hora, comentario del cliente.
- Quién edita:
  - cliente (acción principal), administrador puede registrar soporte si aplica.
- Qué ve el cliente:
  - solo su cotización y el módulo de decisión cuando esta etapa está activa.
- Criterio de salida:
  - si aprueba: pasa a ejecución; si rechaza: queda en revisión/cierre administrativo.

### 6.5 Ejecución (Taller)

- Objetivo:
  - realizar trabajos autorizados y actualizar avance real.
- Qué se captura:
  - avance por tareas, repuestos usados, evidencias de trabajo, novedades y tiempos reales.
- Quién edita:
  - técnico y administrador.
- Qué ve el cliente:
  - progreso en tiempo real en modo lectura (sin editar).
- Criterio de salida:
  - trabajos finalizados y listos para entrega.

### 6.6 Entrega / Cierre (Admin)

- Objetivo:
  - cerrar formalmente la orden y entregar el vehículo.
- Qué se captura:
  - estado final, observaciones de entrega, conformidad, fecha de cierre y trazabilidad final.
- Quién edita:
  - administrador.
- Qué ve el cliente:
  - resumen final del servicio y estado cerrado.
- Criterio de salida:
  - orden cerrada y archivada para historial/reportes.

### 6.7 Mapeo documental oficial (formatos actuales de la empresa)

> Base documental revisada:
> - `/Users/admi/Downloads/FORMATO ORDEN DE SERVICIO.pdf`
> - `/Users/admi/Downloads/FORMATO GASTOS.pdf`
> - `/Users/admi/Downloads/8-Cotizacion KQM497 - Cotizacion.pdf`
> - `/Users/admi/Downloads/WhatsApp Scan 2026-02-17 at 12.38.46.pdf`

#### Documento A — Formato Orden de Servicio (principal)

Campos/casillas que debe contemplar VCARS WEB:

- Encabezado y control:
  - número de orden de servicio
  - fecha de entrada
  - fecha prevista de entrega
- Información del cliente:
  - propietario
  - empresa / entidad
  - nit/cc
  - dirección
  - teléfono de contacto
  - correo electrónico
  - facturar a nombre de
  - forma de pago (`contado` / `crédito`)
  - días (cuando aplique crédito)
- Información del vehículo:
  - placa
  - marca
  - modelo
  - color
  - nivel de combustible
  - kilometraje
  - observaciones / accesorios adicionales
- Operación técnica:
  - falla reportada por el cliente (descripción de la anomalía)
  - técnico asignado
  - pregunta de control: “¿el cliente desea conservar las piezas cambiadas?” (`SI` / `NO`)
- Inventario de accesorios (S / N / C / I):
  - radio
  - CDs
  - encendedor
  - ceniceros
  - reloj
  - cinturón
  - tapetes
  - parasoles
  - forros
  - luces techo
  - espejos
  - chapas
  - kit carretera
  - llanta repuesto
  - herramienta
  - gato/palanca
  - llaveros
  - pernos
  - señales
  - antena
  - plumillas
  - exploradoras
  - tercer stop
  - tapa de gasolina
  - copas ruedas
  - manijas
  - elevavidrios
  - control remoto
  - lava vidrio
  - tapa panel
  - control A/A
  - tarjeta de propiedad
- Condición física:
  - reporte visual de rayones/golpes por zonas del vehículo (diagrama)
- Cierre legal y firmas:
  - SOAT + fecha de vencimiento
  - revisión técnico-mecánica + fecha de vencimiento
  - recibido por (nombre)
  - autorización de trabajo (firma y fecha)
  - entregado y aceptado satisfactoriamente (firma y fecha)
  - texto PQR y garantía

#### Documento B — Formato Gastos / Mano de obra e insumos

Campos/casillas que debe contemplar VCARS WEB:

- Encabezado:
  - número de orden
  - placa
- Tabla de gastos (repetible por ítem):
  - actividad
  - tercero (si aplica)
  - cantidad
  - operario (valor)
  - costo (valor)
- Reglas sugeridas:
  - múltiples líneas por orden
  - sumatoria automática operario + costo
  - trazabilidad por usuario/fecha de creación o edición

#### Documento C — Cotización cliente (multi-ítem)

Campos/casillas que debe contemplar VCARS WEB:

- Encabezado empresa/cliente:
  - datos empresa (razón social, NIT, teléfonos, correo)
  - datos cliente
  - número de cotización
  - fecha
  - placa
- Tabla de cotización (repetible por ítem):
  - sistema
  - trabajo o repuesto
  - precio por unidad sin IVA
  - unidad / cantidad
  - total por línea
- Cierre económico:
  - subtotal
  - IVA 19%
  - total
  - condiciones de pago
- Firmas:
  - firma de la empresa
  - firma del cliente

#### Documento D — Escaneo WhatsApp (evidencia operativa)

Uso funcional en VCARS WEB:

- registrar evidencia documental de órdenes diligenciadas manualmente
- asociar imagen/PDF al expediente del vehículo
- extraer datos mínimos para trazabilidad:
  - número de orden
  - placa
  - actividades
  - cantidades
  - valores de operario y costo

### 6.8 Trazabilidad de documentos por etapa

- Recepción (Ingreso):
  - usa Documento A (Orden de servicio) para alta inicial y checklist.
- Diagnóstico / Cotización interna:
  - usa Documento B para costos internos y mano de obra.
- Cotización al cliente:
  - usa Documento C para propuesta económica formal.
- Autorización del cliente:
  - referencia Documento C y registra decisión del cliente.
- Ejecución (Taller):
  - consume Documento B + evidencias (incluye escaneos tipo Documento D).
- Entrega / Cierre (Admin):
  - cierre legal y firmas del Documento A + consolidado económico final.

### Regla clave para cliente

El cliente **no navega como operador del taller**. Debe ver:

- estado actual del vehículo
- resumen del proceso
- información aprobable por cliente cuando aplique
- indicador de “en proceso” cuando aún no corresponde acción

---

## 7. Estructura funcional de pantallas

### 7.1 Home (`/home`)

Objetivo: vista ejecutiva de estado operativo.

Incluye:

- resumen de ingresos activos
- indicadores de operación
- tarjetas de acceso a módulos principales
- últimos movimientos

### 7.2 Ingreso activo (`/ingreso-activo`)

Objetivo: listado de vehículos en proceso.

Incluye:

- tarjetas de vehículo
- estado/etapa actual
- imagen del vehículo por modelo (catálogo visual)
- filtros por perfil (admin/técnico/clientes)

### 7.3 Detalle de vehículo (`/vehiculos/[id]`)

Objetivo: seguimiento por unidad.

Incluye:

- resumen del vehículo
- línea de tiempo de proceso
- formularios o vista de estado según rol
- acciones disponibles condicionadas por etapa y permisos

### 7.4 Orden de servicio (`/orden-servicio`)

Objetivo: captura y actualización operativa.

- técnico/admin: edición según etapa
- cliente: vista informativa + autorización cuando corresponda

### 7.5 Nuevo ingreso (`/nuevo-ingreso`)

Objetivo: creación de nueva orden.

- selección tipo: cliente particular o empresa
- captura de datos base de recepción
- generación del proceso inicial

---

## 8. Arquitectura funcional y diseño

### Stack

- Next.js (App Router)
- TypeScript
- CSS modular + tema global

### Tema visual

- archivo principal: `src/styles/vcars-theme.css`
- enfoque: estética oscura premium con acentos cian
- objetivo UX: lectura clara, contraste alto, jerarquía visual robusta

### Activos visuales

- fotos de carros en `public/cars/`
- mapeo por modelo en `src/lib/carPhoto.ts`

---

## 9. Estado actual (2026-03-19)

### Avances logrados

- base web en Next.js inicializada y conectada a repo `VCARS_WEB`
- estructura visual alineada a la app móvil
- tarjetas de proceso con imagen de vehículo
- theme global centralizado
- perfiles definidos (admin, técnico, clientes empresa, cliente particular)

### Ajustes pendientes prioritarios

- endurecer reglas de navegación para cliente (modo seguimiento puro)
- consolidar autorización cliente solo en la etapa correcta
- eliminar avisos de hidratación y diferencias SSR/CSR
- mejorar fallback cuando backend responde no autorizado/no encontrado
- validación integral de experiencia por rol de punta a punta

---

## 10. KPIs del producto

- Tiempo promedio de avance entre etapas
- Tiempo de respuesta de autorización del cliente
- Porcentaje de órdenes cerradas sin reproceso
- Tasa de errores por falta de información en recepción
- Satisfacción del cliente sobre visibilidad del estado

---

## 11. Roadmap sugerido

### Fase 1 — Estabilidad operativa

- cerrar errores de hidratación
- blindar permisos por perfil
- normalizar mensajes de error backend

### Fase 2 — Flujo cliente

- vista cliente simplificada y 100% guiada por estado
- autorización/rechazo con comentario obligatorio
- notificaciones de cambio de etapa

### Fase 3 — Productividad taller

- métricas avanzadas por técnico y por etapa
- filtros, búsqueda y segmentación mejorada
- exportables operativos para administración

### Fase 4 — Escalamiento

- integración robusta con backend productivo
- auditoría de acciones por usuario
- despliegue y observabilidad en entorno cloud

---

## 12. Riesgos y mitigación

- **Riesgo:** inconsistencias entre datos SSR y cliente (hydration).  
  **Mitigación:** valores estables en render inicial y control estricto de datos dinámicos.

- **Riesgo:** cliente visualizando módulos internos.  
  **Mitigación:** guardas por rol y rutas con render condicional desde server.

- **Riesgo:** rechazo de adopción por complejidad visual.  
  **Mitigación:** simplificar vista cliente y priorizar estados accionables.

---

## 13. Definición de éxito del MVP

El MVP de VCARS WEB se considera exitoso cuando:

- administrador y técnico operan todo el flujo sin bloqueos
- clientes solo ven su información y autorizan en el paso correcto
- cada vehículo tiene trazabilidad completa de punta a punta
- la interfaz web replica la lógica y estética clave de la app móvil

---

## 14. Repositorio y operación

- Repositorio web: `https://github.com/julianchocmanrique/VCARS_WEB`
- Proyecto local: `vcars_web`

Comandos base:

```bash
npm run dev
npm run lint
npm run build
```

---

## 15. Próxima actualización del documento

Este dossier debe actualizarse al cerrar cada bloque funcional importante:

- permisos por rol
- flujo cliente
- integración backend
- despliegue

Mantener este archivo como fuente única de verdad funcional del producto VCARS WEB.

---

## 16. Siguientes campos a implementar (checklist técnico)

> Estado actualizado automáticamente según implementación actual del frontend (24-mar-2026).

### 16.0 Leyenda de estado

- `Listo`: ya existe captura/visualización funcional en la app.
- `Parcial`: existe una parte, pero falta completar alcance del formato oficial.
- `Pendiente`: no está implementado todavía.

### 16.0.1 Resumen actual

- Listo: 7
- Parcial: 8
- Pendiente: 13

### 16.1 Prioridad alta (bloqueante para operación)

| ID | Módulo | Campo | Estado | Evidencia actual |
|---|---|---|---|---|
| A-01 | Orden Servicio | Número de orden | Pendiente | No hay campo específico de número de orden en `nuevo-ingreso` ni en `orden-servicio`. |
| A-02 | Orden Servicio | Fecha entrada | Parcial | Se guarda `fecha` automática en `nuevo-ingreso/page.tsx`, pero no hay campo formal editable/visible como en formato físico. |
| A-03 | Orden Servicio | Fecha prevista entrega | Pendiente | No existe campo en formularios actuales. |
| A-04 | Cliente | Propietario / Empresa | Listo | `holderType` + `holderName` en `nuevo-ingreso/page.tsx`. |
| A-05 | Vehículo | Placa | Listo | Campo `placa` en `nuevo-ingreso/page.tsx`; se usa en todo el flujo. |
| A-06 | Vehículo | Marca / Modelo / Color | Parcial | Existe `vehiculo` (marca/modelo) en `nuevo-ingreso`; falta campo de color separado. |
| A-07 | Recepción | Kilometraje | Listo | Campo `kilometraje` en paso `recepcion` de `orden-servicio/page.tsx`. |
| A-08 | Recepción | Falla reportada | Listo | Campo `fallaCliente` en paso `recepcion` de `orden-servicio/page.tsx`. |
| A-09 | Recepción | Técnico asignado | Parcial | Campo `tecnico` existe en paso `trabajo`; falta asignación formal desde recepción. |
| A-10 | Flujo | Paso actual del proceso | Listo | `paso`, `stepIndex`, timeline y control por rol en `vehiculos/[plate]`, `process.ts`, `orderForms.ts`. |

### 16.2 Prioridad media (control legal y trazabilidad)

| ID | Módulo | Campo | Estado | Evidencia actual |
|---|---|---|---|---|
| B-01 | Cliente | NIT/CC | Pendiente | No existe campo en formularios web actuales. |
| B-02 | Cliente | Dirección | Pendiente | No existe campo en formularios web actuales. |
| B-03 | Cliente | Teléfono | Listo | Campo `telefono` en `nuevo-ingreso/page.tsx` y visualización en detalle de vehículo. |
| B-04 | Cliente | Correo electrónico | Pendiente | No existe campo en formularios web actuales. |
| B-05 | Facturación | Facturar a nombre de | Pendiente | No existe campo en formularios web actuales. |
| B-06 | Facturación | Forma de pago (contado/crédito) | Pendiente | No existe selector en formularios web actuales. |
| B-07 | Facturación | Días crédito | Pendiente | No existe campo en formularios web actuales. |
| B-08 | Legal | SOAT + vencimiento | Pendiente | No existe campo en formularios web actuales. |
| B-09 | Legal | Revisión técnico-mecánica + vencimiento | Pendiente | No existe campo en formularios web actuales. |
| B-10 | Cierre | Firma autorización trabajo | Pendiente | Existe decisión del cliente, pero no firma digital de autorización. |

### 16.3 Prioridad media (cotización y autorización cliente)

| ID | Módulo | Campo | Estado | Evidencia actual |
|---|---|---|---|---|
| C-01 | Cotización | N° cotización | Listo | Campo `cotizacionNumero` en `orden-servicio/page.tsx` y lectura en `vehiculos/[plate]/page.tsx`. |
| C-02 | Cotización | Fecha cotización | Pendiente | No existe campo de fecha de cotización. |
| C-03 | Cotización | Ítems (sistema, repuesto/trabajo) | Parcial | Hay campos de diagnóstico/repuestos/alcance, pero no tabla multi-ítem completa del formato PDF. |
| C-04 | Cotización | Precio unitario sin IVA | Pendiente | No existe campo en cotización formal actual. |
| C-05 | Cotización | Cantidad | Pendiente | No existe campo por línea en cotización actual. |
| C-06 | Cotización | Total línea | Pendiente | No existe cálculo por línea actualmente. |
| C-07 | Cotización | Subtotal / IVA / Total | Parcial | Existe `cotizacionTotal`, faltan subtotal e IVA calculados. |
| C-08 | Autorización Cliente | Estado (aprobado/rechazado) | Listo | Campo `decisionCliente` + botones Autorizar/No autorizar en `vehiculos/[plate]/page.tsx`. |
| C-09 | Autorización Cliente | Comentario | Listo | Campo `comentariosCliente` implementado para cliente. |
| C-10 | Autorización Cliente | Fecha y hora de decisión | Pendiente | No se registra timestamp específico de la decisión. |

### 16.4 Prioridad media-baja (gastos e inventario detallado)

| ID | Módulo | Campo | Estado | Evidencia actual |
|---|---|---|---|---|
| D-01 | Gastos | Actividad | Parcial | Hay texto de trabajo/diagnóstico, pero no módulo de gastos con tabla oficial. |
| D-02 | Gastos | Tercero | Pendiente | No existe campo específico. |
| D-03 | Gastos | Cantidad | Pendiente | No existe campo en módulo de gastos. |
| D-04 | Gastos | Operario (valor) | Pendiente | No existe campo en módulo de gastos. |
| D-05 | Gastos | Costo (valor) | Pendiente | No existe campo en módulo de gastos. |
| D-06 | Inventario | Checklist accesorios S/N/C/I | Pendiente | No existe checklist digital del inventario físico. |
| D-07 | Condición física | Rayones/golpes por zona | Pendiente | No existe diagrama o marcación visual en web. |
| D-08 | Evidencias | Adjuntos PDF/imagen/scan | Pendiente | No existe carga de archivos adjuntos en formularios actuales. |

### 16.5 Lo que falta exactamente (prioridad inmediata)

1. Crear módulo digital completo de **Orden de Servicio** con todos los campos legales del formato físico.
2. Crear módulo de **Gastos** con tabla repetible (`actividad`, `tercero`, `cantidad`, `operario`, `costo`).
3. Expandir **Cotización cliente** a tabla multi-ítem con cálculos (`subtotal`, `IVA`, `total`).
4. Agregar **firma/autorización formal** y `timestamp` de aprobación/rechazo.
5. Agregar **inventario de accesorios** y **reporte de condición física** por zonas.
6. Habilitar **adjuntos** (PDF/imagen) por orden/vehículo para soporte documental.

### 16.6 Criterios de aceptación para pasar a “Listo”

- Campo visible con permisos correctos por rol.
- Campo validado en frontend (tipo, requerido, formato).
- Campo persistido en backend y retornado por API.
- Campo incluido en vista de detalle del vehículo.
- Campo incluido en auditoría mínima (usuario, fecha de creación/edición).
