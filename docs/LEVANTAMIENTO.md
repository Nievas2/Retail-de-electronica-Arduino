# Levantamiento de información (V1)

Sistema: **ElectroMakers GYE** (tienda de componentes Arduino / robótica / electrónica)

Este documento resume el **modelo de negocio**, **actores**, **casos de uso** y **reglas de negocio** que usaremos para diseñar el sistema administrativo (backend tipo CRUD).

> Nota: Este levantamiento está pensado como **MVP (V1)**: una versión inicial que cubre lo esencial sin complejidad prematura.

---

## 1) Modelo de negocio (narrativa)

ElectroMakers GYE es una tienda de electrónica y robótica ubicada en Guayaquil, dedicada a la venta de componentes para proyectos educativos, makers y técnicos. Comercializa productos como placas de desarrollo (Arduino, ESP32), sensores, módulos, drivers, motores, herramientas de laboratorio, fuentes de alimentación, cables y kits de aprendizaje. También ofrece servicios complementarios como armado de kits personalizados, impresión 3D de piezas para prototipos y asesoría básica para estudiantes y pequeños negocios que desarrollan proyectos.

La tienda opera mediante atención presencial en mostrador y también recibe pedidos por canales digitales como WhatsApp, donde los clientes solicitan cotizaciones y consultan disponibilidad. Un cliente puede comprar como consumidor final sin registro formal o registrarse con datos básicos para facilitar futuras compras, envíos y soporte.

Los productos se organizan por categorías y subcategorías (por ejemplo: Sensores, Robótica, Laboratorio). Un producto puede contar con variaciones comerciales (SKU) como original vs compatible, marca, versión o voltaje. El inventario cambia conforme ocurren ventas, ingresos por compras a proveedores, devoluciones y ajustes por conteo físico.

Para abastecerse, ElectroMakers GYE mantiene un registro de proveedores. Cuando se necesita reponer stock, se registra una compra indicando proveedor, fecha y el detalle de productos comprados con cantidades y costos unitarios. Al recibir la mercadería, el inventario se incrementa y queda un registro de entrada. Si llega mercadería defectuosa o equivocada, puede registrarse una devolución al proveedor (V1 lo maneja como ajuste/movimiento).

En ventas, un vendedor registra una venta con uno o varios ítems. Cada ítem indica el SKU, la cantidad, el precio aplicado y un posible descuento. El total de la venta se calcula sumando los subtotales. El pago puede ser en efectivo, transferencia o mixto, y algunas ventas pueden quedar con saldo pendiente en compras por encargo.

Cuando la venta corresponde a un pedido digital, suele iniciar como pedido/cotización en estado preliminar. Si el cliente confirma, el pedido cambia de estado y puede reservar stock. Para pedidos con envío, se registra dirección, referencia y contacto. El pedido pasa por estados operativos típicos: borrador, confirmado, empacado, enviado y entregado.

La tienda también maneja devoluciones de clientes por errores de compra o fallas del producto. Cuando se acepta una devolución, se registra el producto devuelto, cantidad y motivo. Las ventas cerradas no se modifican de forma arbitraria: las correcciones se realizan mediante devoluciones o notas internas para mantener trazabilidad.

Finalmente, el sistema gestiona usuarios internos según roles: un administrador configura catálogos, precios, usuarios y permisos; un vendedor registra ventas, pagos y pedidos; un encargado de bodega registra compras, entradas, salidas y ajustes de inventario; y un técnico puede apoyar en servicios como impresión 3D o armado de kits.

---

## 2) Objetivo del sistema

Implementar un backend administrativo que permita:
- Mantener catálogo (categorías, productos, SKUs)
- Controlar inventario de forma auditables (por movimientos)
- Gestionar compras a proveedores y recepción
- Gestionar ventas, pagos y devoluciones
- Gestionar pedidos (WhatsApp / presencial) y envíos
- Tener trazabilidad por usuario (quién hizo cada acción)
- Generar reportes básicos (ventas diarias, top productos, stock bajo)

---

## 3) Alcance (V1) y NO alcance

### Incluye (V1)
- CRUD de catálogo, clientes, proveedores
- Compras: registrar compra, recibir compra, anular compra
- Ventas: registrar venta, cerrar venta, anular venta
- Pagos: uno o varios pagos por venta
- Pedidos: crear, editar en borrador, mover estados
- Envíos: retiro o envío a domicilio (1 envío por pedido como máximo)
- Devoluciones: registrar devolución asociada a una venta
- Inventario: basado en movimientos (entradas/salidas/ajustes/devoluciones)
- Reportes básicos

### No incluye (por ahora)
- Facturación electrónica e integración SRI
- Contabilidad completa (asientos, cuentas, etc.)
- Multi-sucursal / multi-bodega
- Lotes/seriales (trazabilidad fina por unidad)
- E-commerce público con pagos en línea
- CRM avanzado o campañas

---

## 4) Actores y roles

### Roles internos
- **ADMIN:** configura catálogo, usuarios/roles, ve reportes y puede operar todo.
- **VENDEDOR:** registra ventas, pagos, pedidos; consulta stock y catálogo.
- **BODEGA:** registra compras/recepción, ajustes de inventario; consulta stock.

### Actores externos (conceptuales)
- **CLIENTE:** compra o solicita cotización/pedido.
- **PROVEEDOR:** abastece mercadería.

---

## 5) Glosario (lenguaje del dominio)

- **Categoría:** agrupación de productos (Sensores, Robótica, Laboratorio).
- **Producto:** artículo genérico (ej: “Sensor ultrasónico”).
- **SKU (variante):** versión comercial específica del producto (marca, voltaje, original/compatible).
- **Compra:** registro de abastecimiento a proveedor.
- **Recepción:** momento en que la compra entra a inventario.
- **Venta:** registro de salida de inventario por compra de cliente.
- **Pago:** abono de una venta (puede ser parcial y múltiple).
- **Pedido:** cotización/lista de ítems antes de volverse venta.
- **Envío:** logística asociada a un pedido (retiro o envío).
- **Devolución:** retorno de productos de una venta.
- **Movimiento de inventario:** evento que altera stock (entrada, salida, ajuste, devolución).

---

## 6) Casos de uso (V1)

> Formato resumido (lo suficiente para bajar a BD y endpoints).

### UC-01 Gestionar categorías
- **Actor:** ADMIN
- **Descripción:** crear/editar/desactivar categorías.

### UC-02 Gestionar productos
- **Actor:** ADMIN
- **Descripción:** crear/editar/desactivar productos y asignarlos a una categoría.

### UC-03 Gestionar SKUs (variantes)
- **Actor:** ADMIN
- **Descripción:** crear/editar/desactivar SKUs (original/compatible, marca, voltaje, precio referencia).

### UC-04 Consultar stock
- **Actor:** ADMIN / VENDEDOR / BODEGA
- **Descripción:** ver stock por SKU y alertas de stock bajo.

### UC-05 Registrar compra
- **Actor:** BODEGA / ADMIN
- **Precondición:** proveedor existe.
- **Resultado:** compra queda en estado **REGISTRADA** con su detalle.

### UC-06 Recibir compra
- **Actor:** BODEGA / ADMIN
- **Precondición:** compra en estado **REGISTRADA**.
- **Flujo:** marcar compra como **RECIBIDA** y generar movimientos **ENTRADA** por cada SKU.

### UC-07 Ajuste de inventario
- **Actor:** BODEGA / ADMIN
- **Descripción:** registrar un movimiento **AJUSTE** (+ o -) por conteo físico, pérdida o corrección.

### UC-08 Registrar venta
- **Actor:** VENDEDOR / ADMIN
- **Precondición:** stock suficiente (o manejo de reserva/pedido confirmado).
- **Resultado:** venta en estado **ABIERTA** con detalle de ítems.

### UC-09 Cerrar venta
- **Actor:** VENDEDOR / ADMIN
- **Precondición:** venta **ABIERTA**.
- **Flujo:** marcar venta como **CERRADA** y generar movimientos **SALIDA** (cantidades negativas).

### UC-10 Registrar pago
- **Actor:** VENDEDOR / ADMIN
- **Descripción:** registrar uno o más pagos a una venta (efectivo/transferencia/mixto).

### UC-11 Crear pedido (cotización)
- **Actor:** VENDEDOR / ADMIN
- **Descripción:** crear pedido en estado **BORRADOR** (canal WhatsApp/presencial/web).

### UC-12 Confirmar pedido
- **Actor:** VENDEDOR / ADMIN
- **Precondición:** pedido en **BORRADOR**.
- **Resultado:** pedido pasa a **CONFIRMADO** y se aplica regla de “reserva lógica” de stock.

### UC-13 Preparar y entregar pedido
- **Actor:** VENDEDOR / ADMIN
- **Descripción:** mover el pedido por estados operativos (EMPACADO → ENVIADO/ENTREGADO).

### UC-14 Registrar envío
- **Actor:** VENDEDOR / ADMIN
- **Regla:** tipo **RETIRO** no requiere dirección; tipo **ENVIO** sí requiere.

### UC-15 Registrar devolución
- **Actor:** VENDEDOR / ADMIN
- **Descripción:** registrar devolución asociada a una venta cerrada; genera movimientos **DEVOLUCION**.

### UC-16 Reportes
- **Actor:** ADMIN
- **Descripción:** ventas diarias, resumen por fechas, top productos, clientes frecuentes, stock bajo.

---

## 7) Reglas de negocio (V1)

**RB-01 Stock y ventas**
- No se debe cerrar una venta si no existe stock suficiente del SKU.

**RB-02 Inventario por movimientos**
- El stock real de un SKU se calcula como la suma de movimientos de inventario.
- Tipos: ENTRADA (+), SALIDA (-), DEVOLUCION (+), AJUSTE (+/-).

**RB-03 Precio histórico**
- La venta guarda el **precio aplicado** y el descuento por ítem para mantener historial aunque cambie el precio referencia del SKU.

**RB-04 Ventas cerradas no se editan**
- Si hay error, se corrige con **devolución**, no editando la venta.

**RB-05 Estados de pedido**
- Un pedido solo se puede editar libremente en estado **BORRADOR**.
- Los estados posteriores reflejan avance operativo.

**RB-06 Envío y retiro**
- Un pedido puede ser retiro o envío.
- Si es envío, dirección y contacto son obligatorios.

**RB-07 Pagos parciales**
- Una venta puede tener múltiples pagos.
- Puede existir saldo pendiente.

**RB-08 Trazabilidad por usuario**
- Cada acción relevante queda asociada al usuario que la ejecutó.

**RB-09 Desactivar vs borrar**
- No se elimina información crítica; se desactiva para no romper historial.

**RB-10 Duplicados en detalle**
- En compra/pedido/venta, un SKU no debe repetirse dos veces en el mismo documento; se suman cantidades.

**RB-11 Consistencia de recepción**
- Solo una compra recibida genera movimientos de inventario.
- Una compra anulada no afecta inventario.

**RB-12 Relación pedido → venta**
- Un pedido puede generar como máximo una venta.
- Una venta puede venir de un pedido o ser directa (mostrador).

---

## 8) Preguntas que siempre se levantan (no asumir)

Estas preguntas son típicas y cambian por negocio:
- ¿Se permite vender sin stock (venta por encargo) o siempre debe existir stock?
- ¿Se maneja precio por cliente (mayorista/minorista) o solo un precio por SKU?
- ¿Se maneja garantía? ¿Cuántos días? ¿Qué productos aplican?
- ¿Se usa factura/nota de venta formal o solo registro interno (V1)?
- ¿Stock mínimo por SKU? ¿Alertas automáticas?
- ¿Se requieren códigos SKU obligatorios o pueden ser opcionales?
- ¿Se registran series/lotes para productos caros o sensibles?

---

## 9) Requisitos no funcionales (V1)

- **Seguridad:** JWT + roles (RBAC) simple.
- **Auditoría:** inventario por movimientos y trazabilidad por usuario.
- **Consistencia:** ventas cerradas no editables; correcciones por devoluciones.
- **Performance:** índices por FK y búsquedas por SKU; paginación en listados.
- **Mantenibilidad:** módulos NestJS separados por dominio.

---

## 10) Entregables del levantamiento

A partir de este documento, se procede a:
1. Modelo conceptual ER (entidades, relaciones, cardinalidades)
2. Modelo relacional (tablas, PK/FK)
3. Normalización (objetivo 3FN)
4. Modelo físico (PostgreSQL) + índices + constraints
5. Diseño de API (endpoints y contratos)
