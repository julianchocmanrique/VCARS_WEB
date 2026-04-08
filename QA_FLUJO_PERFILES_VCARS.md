# QA Flujo Por Perfiles - VCARS Web

Documento de prueba funcional para validar la línea completa de operación por perfil (Administrativo, Técnico y Clientes), detectar huecos de producto y priorizar correcciones.

## 1. Objetivo

Verificar que cada perfil:
- vea solo lo que le corresponde,
- ejecute solo las acciones permitidas,
- recorra correctamente el flujo del vehículo,
- y mantenga consistencia visual/funcional en Home, Proceso, Detalle y Orden de Servicio.

---

## 2. Entorno de prueba

- URL local: `http://localhost:3000`
- Pantallas recomendadas:
1. Desktop (>= 1366px)
2. Mobile M (375px)
3. Mobile S (320px)

### Reinicio limpio recomendado antes de cada perfil

1. Abrir DevTools.
2. `Application` -> `Local Storage` -> borrar claves de VCARS.
3. Recargar la app.

---

## 3. Credenciales oficiales de prueba

### Administrativo
- Usuario: `david@vcars.com`
- Contraseña: `1111`

### Técnico
- Usuario: `julian@vcars.com`
- Contraseña: `2222`

### Cliente empresa (Congreso)
- Usuario: `congreso@gobierno.com`
- Contraseña: `3333`

### Cliente empresa (Alcaldía)
- Usuario: `alcaldia@alcaldia.com`
- Contraseña: `4444`

### Cliente particular (1 vehículo)
- Usuario: `juli@gm.com`
- Contraseña: `5555`
- Vehículo esperado: `BCD246`

---

## 4. Inventario esperado de vehículos

Total sistema esperado: **15** vehículos.

- Cliente particular (`juli@gm.com`): **1** vehículo (`BCD246`)
- Empresa Congreso: **7** vehículos
- Empresa Alcaldía: **7** vehículos
- Administrativo y Técnico: deben ver los **15**

---

## 5. Matriz de visibilidad por etapa

Flujo base:
1. Recepción (Ingreso)
2. Diagnóstico / Cotización interna
3. Cotización al cliente (Admin)
4. Autorización del cliente
5. Ejecución (Taller)
6. Entrega / Cierre (Admin)

### Qué ve cada perfil

- **Administrativo**: ve y edita todo.
- **Técnico**: ve casi todo, pero no edita `cotizacion_formal` ni `entrega`.
- **Cliente**:
1. Ve Recepción.
2. No ve Cotización interna.
3. Ve Cotización al cliente solo cuando ya fue cargada.
4. Solo edita paso de Autorización (`aprobacion`).
5. Ve Ejecución como seguimiento.
6. Ve Entrega/Cierre como información final.

---

## 6. Flujo de prueba detallado por perfil

## 6.1 Perfil Administrativo (`david@vcars.com`)

### Paso A - Login
- Ir a `/login`
- Ingresar credenciales de admin
- Resultado esperado:
1. redirección a `/home`
2. badge/etiqueta de perfil: `Administrativo`

Evidencia:
- [ ] Pantallazo `01-admin-login-ok.png`

### Paso B - Home (Dashboard)
- Validar:
1. métricas visibles,
2. resumen con ingreso activo,
3. accesos a `Nuevo ingreso` y `Proceso`.

Evidencia:
- [ ] Pantallazo `02-admin-home.png`

### Paso C - Proceso (listado)
- Ir a `/ingreso-activo`
- Validar:
1. total de tarjetas = 15,
2. filtros operativos,
3. navegación a detalle por tarjeta.

Evidencia:
- [ ] Pantallazo `03-admin-proceso-listado.png`

### Paso D - Detalle vehículo
- Abrir cualquier vehículo (ej. `TLL006`)
- Validar:
1. resumen completo,
2. línea de tiempo completa,
3. acceso a formularios.

Evidencia:
- [ ] Pantallazo `04-admin-vehiculo-detalle.png`

### Paso E - Orden de servicio
- Ir a `/orden-servicio?plate=TLL006`
- Validar edición en todos los pasos.

Evidencia:
- [ ] Pantallazo `05-admin-orden-servicio.png`

---

## 6.2 Perfil Técnico (`julian@vcars.com`)

### Paso A - Login
- Resultado esperado: entra a `/home` como `Tecnico`.

Evidencia:
- [ ] Pantallazo `06-tecnico-login-ok.png`

### Paso B - Home y Proceso
- Validar que ve todo el parque (15).

Evidencia:
- [ ] Pantallazo `07-tecnico-home.png`
- [ ] Pantallazo `08-tecnico-proceso.png`

### Paso C - Orden de servicio y permisos
- En `/orden-servicio?plate=TLL006` validar:
1. Puede editar: recepcion, cotizacion_interna, aprobacion, trabajo.
2. No debe editar: `cotizacion_formal` ni `entrega`.

Evidencia:
- [ ] Pantallazo `09-tecnico-permisos-edicion.png`

---

## 6.3 Cliente Empresa Congreso (`congreso@gobierno.com`)

### Paso A - Login
- Resultado esperado: perfil `Cliente`.

Evidencia:
- [ ] Pantallazo `10-cliente-congreso-login.png`

### Paso B - Home
- Debe ver solo vehículos de su empresa.

Evidencia:
- [ ] Pantallazo `11-cliente-congreso-home.png`

### Paso C - Proceso (listado)
- En `/ingreso-activo`:
1. solo tarjetas de `congreso@gobierno.com`,
2. no ver vehículos de alcaldía ni cliente particular.

Evidencia:
- [ ] Pantallazo `12-cliente-congreso-listado.png`

### Paso D - Detalle de vehículo
- En `/vehiculos/[placa]` validar:
1. no ve cotización interna,
2. ve estado real del proceso,
3. si cotización cliente no está cargada: mensaje "En proceso".

Evidencia:
- [ ] Pantallazo `13-cliente-congreso-detalle.png`

### Paso E - Autorización cliente
- Si está en paso de aprobación:
1. puede elegir `Aprobado` o `No aprobado`,
2. puede escribir comentarios,
3. queda registrada fecha/hora de decisión.

Evidencia:
- [ ] Pantallazo `14-cliente-congreso-aprobacion.png`

---

## 6.4 Cliente Empresa Alcaldía (`alcaldia@alcaldia.com`)

Repetir exactamente el flujo del cliente Congreso, esperando solo datos de Alcaldía.

Evidencia:
- [ ] Pantallazo `15-cliente-alcaldia-login.png`
- [ ] Pantallazo `16-cliente-alcaldia-listado.png`
- [ ] Pantallazo `17-cliente-alcaldia-detalle.png`
- [ ] Pantallazo `18-cliente-alcaldia-aprobacion.png`

---

## 6.5 Cliente Particular (`juli@gm.com`)

### Paso A - Login
- Debe entrar como cliente particular.

Evidencia:
- [ ] Pantallazo `19-cliente-juli-login.png`

### Paso B - Home y Proceso
- Debe ver **solo 1 vehículo** (`BCD246`).

Evidencia:
- [ ] Pantallazo `20-cliente-juli-home.png`
- [ ] Pantallazo `21-cliente-juli-listado-unico.png`

### Paso C - Detalle y aprobación
- Validar mismo patrón de cliente:
1. solo información permitida,
2. autorización solo cuando aplique.

Evidencia:
- [ ] Pantallazo `22-cliente-juli-detalle.png`

---

## 7. Casos críticos de regresión (obligatorios)

1. Logout no debe rebotar automáticamente al Home.
2. No debe aparecer error de hidratación (`Hydration failed`).
3. Mobile 320px y 375px:
- cards no se cortan,
- bottom nav siempre visible y fijo,
- botones no desbordan.
4. Cliente nunca debe editar pasos no permitidos.
5. Filtros de indicadores deben abrir listado filtrado correctamente.

Evidencia:
- [ ] Pantallazo `23-regresion-mobile-320.png`
- [ ] Pantallazo `24-regresion-mobile-375.png`
- [ ] Pantallazo `25-regresion-no-hydration-error.png`

---

## 8. Formato de reporte de hallazgos

Usar este formato por cada hallazgo:

- ID: `BUG-###`
- Perfil: `Administrativo | Tecnico | Cliente`
- Módulo: `Home | Proceso | Vehículo | Orden de servicio | Login`
- Severidad: `Alta | Media | Baja`
- Descripción:
- Pasos para reproducir:
1.
2.
3.
- Resultado actual:
- Resultado esperado:
- Evidencia (archivo imagen/video):
- Estado: `Abierto | En progreso | Validado | Cerrado`

---

## 9. Criterio de salida (Go/No-Go)

Se considera **GO** cuando:

1. 100% de flujos por perfil completados.
2. 0 bugs severidad Alta abiertos.
3. 0 errores de permisos por rol.
4. 0 fallos críticos en mobile (320/375).
5. Evidencias completas por cada sección del documento.

---

## 10. Resumen ejecutivo para dirección (llenar al final)

- Fecha de ciclo QA:
- Responsable QA:
- Total casos ejecutados:
- Casos aprobados:
- Casos fallidos:
- Bugs Alta:
- Bugs Media:
- Bugs Baja:
- Decisión final: `GO / NO-GO`
- Comentarios de cierre:


---

## 11. Ejecución de prueba por perfil (estado actual)

> Tipo de prueba aplicada en este informe: **validación funcional por reglas de código + rutas**.
> Nota: para cierre final productivo, completar evidencias visuales del punto 6 con pantallazos reales en navegador.

### 11.1 Resultado - Administrativo (`david@vcars.com`)

1. Login redirige a `/home`: **Cumple**
2. Visualiza Home con panel completo: **Cumple**
3. Ve listado de proceso con total completo: **Cumple**
4. Puede abrir detalle de vehículo y timeline completa: **Cumple**
5. Puede editar todos los pasos en orden de servicio: **Cumple**

Observación:
- Administrativo tiene permisos globales (`canEditStep => true`).

### 11.2 Resultado - Técnico (`julian@vcars.com`)

1. Login técnico y acceso a `/home`: **Cumple**
2. Visualiza parque completo de vehículos: **Cumple**
3. Puede editar recepción, diagnóstico, aprobación y trabajo: **Cumple**
4. No puede editar `cotizacion_formal`: **Cumple**
5. No puede editar `entrega`: **Cumple**

Observación:
- Restricción aplicada correctamente por regla de negocio.

### 11.3 Resultado - Cliente empresa Congreso (`congreso@gobierno.com`)

1. Login cliente a `/home`: **Cumple**
2. Filtrado por identidad (solo sus vehículos): **Cumple**
3. No debe ver vehículos de Alcaldía o cliente particular: **Cumple**
4. En detalle no ve cotización interna: **Cumple**
5. Ve cotización al cliente solo cuando existe información cargada: **Cumple**
6. Puede autorizar/no autorizar en paso de aprobación: **Cumple**
7. Puede dejar comentarios y guardar fecha/hora de decisión: **Cumple**

Observación:
- El mensaje “En proceso” aparece cuando la cotización no está lista.

### 11.4 Resultado - Cliente empresa Alcaldía (`alcaldia@alcaldia.com`)

1. Login cliente a `/home`: **Cumple**
2. Filtrado por identidad (solo sus vehículos): **Cumple**
3. No debe ver vehículos de Congreso o cliente particular: **Cumple**
4. Restricciones de edición iguales al cliente empresa: **Cumple**
5. Autorización en paso correspondiente: **Cumple**

Observación:
- Comportamiento equivalente a Congreso con dataset diferente.

### 11.5 Resultado - Cliente particular (`juli@gm.com`)

1. Login cliente particular: **Cumple**
2. Debe quedar limitado a placa `BCD246`: **Cumple**
3. Home y proceso muestran solo su vehículo: **Cumple**
4. Solo puede actuar en aprobación cuando aplique: **Cumple**

Observación:
- La asignación de cliente personal con 1 placa está forzada en autenticación.

---

## 12. Validación de línea de producción (resumen)

Estado global por reglas funcionales: **Cumple**

Checklist de cumplimiento actual:
1. Segmentación por rol: **OK**
2. Segmentación por cliente/empresa: **OK**
3. Restricción de edición por etapa: **OK**
4. Flujo de autorización cliente: **OK**
5. Carga de fotos por ángulos en recepción: **OK**
6. Navegación base (`/home`, `/ingreso-activo`, `/vehiculos/[placa]`, `/orden-servicio`): **OK**

Pendiente para cierre QA final (manual visual):
1. Capturar pantallazos de evidencia de todos los pasos del punto 6.
2. Ejecutar corrida en mobile 320/375 y registrar si hay cortes visuales.
3. Verificar en entorno online además de localhost.

