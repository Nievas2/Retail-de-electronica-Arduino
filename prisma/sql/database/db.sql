-- ============================================================
-- MODELO FISICO (POSTGRESQL) - ElectroMakers GYE
-- 3FN: No guarda subtotal/total, se calcula con queries
-- ============================================================

-- (Opcional) Para tener un esquema separado:
-- CREATE SCHEMA IF NOT EXISTS electromakers;
-- SET search_path TO electromakers;

-- ============================================================
-- 1) TIPOS ENUM (estados y valores controlados)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE compra_estado AS ENUM ('REGISTRADA', 'RECIBIDA', 'ANULADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE venta_estado AS ENUM ('ABIERTA', 'CERRADA', 'ANULADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pedido_estado AS ENUM ('BORRADOR', 'CONFIRMADO', 'EMPACADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pedido_canal AS ENUM ('WHATSAPP', 'PRESENCIAL', 'WEB');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE envio_tipo AS ENUM ('RETIRO', 'ENVIO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE envio_estado AS ENUM ('PENDIENTE', 'EN_RUTA', 'ENTREGADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pago_metodo AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'MIXTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mov_tipo AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE devol_condicion AS ENUM ('NUEVO', 'USADO', 'DEFECTUOSO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2) SEGURIDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS rol (
  id_rol        BIGSERIAL PRIMARY KEY,
  nombre_rol    TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario    BIGSERIAL PRIMARY KEY,
  id_rol        BIGINT NOT NULL REFERENCES rol(id_rol),
  nombre        TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  hash_password TEXT NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 3) CATALOGO
-- ============================================================

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria  BIGSERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL UNIQUE,
  descripcion   TEXT
);

CREATE TABLE IF NOT EXISTS producto (
  id_producto   BIGSERIAL PRIMARY KEY,
  id_categoria  BIGINT NOT NULL REFERENCES categoria(id_categoria),
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sku (
  id_sku           BIGSERIAL PRIMARY KEY,
  id_producto      BIGINT NOT NULL REFERENCES producto(id_producto),
  codigo_sku       TEXT UNIQUE,
  es_original      BOOLEAN NOT NULL DEFAULT FALSE,
  marca            TEXT,
  version          TEXT,
  voltaje          TEXT,
  precio_referencia NUMERIC(12,2),
  activo           BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- 4) PROVEEDORES Y COMPRAS
-- ============================================================

CREATE TABLE IF NOT EXISTS proveedor (
  id_proveedor  BIGSERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL,
  telefono      TEXT,
  correo        TEXT,
  direccion     TEXT
);

CREATE TABLE IF NOT EXISTS compra (
  id_compra     BIGSERIAL PRIMARY KEY,
  id_proveedor  BIGINT NOT NULL REFERENCES proveedor(id_proveedor),
  id_usuario    BIGINT NOT NULL REFERENCES usuario(id_usuario),
  fecha         TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado        compra_estado NOT NULL
);

CREATE TABLE IF NOT EXISTS detalle_compra (
  id_detalle_compra BIGSERIAL PRIMARY KEY,
  id_compra         BIGINT NOT NULL REFERENCES compra(id_compra) ON DELETE CASCADE,
  id_sku            BIGINT NOT NULL REFERENCES sku(id_sku),
  cantidad          INT NOT NULL CHECK (cantidad > 0),
  costo_unitario    NUMERIC(12,2) NOT NULL CHECK (costo_unitario >= 0)
);

-- Evita duplicar el mismo SKU dos veces en la misma compra (opcional pero útil)
CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_compra_compra_sku
  ON detalle_compra(id_compra, id_sku);

-- ============================================================
-- 5) CLIENTES, PEDIDOS, ENVIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS cliente (
  id_cliente     BIGSERIAL PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  telefono       TEXT,
  correo         TEXT,
  cedula_ruc     TEXT,
  direccion      TEXT
);

CREATE TABLE IF NOT EXISTS pedido (
  id_pedido      BIGSERIAL PRIMARY KEY,
  id_cliente     BIGINT REFERENCES cliente(id_cliente), -- puede ser NULL (WhatsApp incompleto)
  id_usuario     BIGINT NOT NULL REFERENCES usuario(id_usuario),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado         pedido_estado NOT NULL,
  canal          pedido_canal NOT NULL,
  observaciones  TEXT
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
  id_detalle_pedido BIGSERIAL PRIMARY KEY,
  id_pedido         BIGINT NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
  id_sku            BIGINT NOT NULL REFERENCES sku(id_sku),
  cantidad          INT NOT NULL CHECK (cantidad > 0),
  precio_estimado   NUMERIC(12,2) CHECK (precio_estimado >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_pedido_pedido_sku
  ON detalle_pedido(id_pedido, id_sku);

CREATE TABLE IF NOT EXISTS envio (
  id_envio           BIGSERIAL PRIMARY KEY,
  id_pedido          BIGINT NOT NULL UNIQUE REFERENCES pedido(id_pedido) ON DELETE CASCADE, -- 1 pedido -> 0..1 envio
  tipo               envio_tipo NOT NULL,
  direccion_entrega  TEXT,
  referencia_entrega TEXT,
  contacto_entrega   TEXT,
  estado_envio       envio_estado NOT NULL,

  -- Regla: si es RETIRO, direccion_entrega puede ser NULL; si es ENVIO, debe existir.
  CHECK (
    (tipo = 'RETIRO' AND direccion_entrega IS NULL)
    OR
    (tipo = 'ENVIO' AND direccion_entrega IS NOT NULL)
  )
);

-- ============================================================
-- 6) VENTAS, DETALLE, PAGOS
-- ============================================================

CREATE TABLE IF NOT EXISTS venta (
  id_venta     BIGSERIAL PRIMARY KEY,
  id_cliente   BIGINT REFERENCES cliente(id_cliente), -- consumidor final = NULL
  id_usuario   BIGINT NOT NULL REFERENCES usuario(id_usuario),
  id_pedido    BIGINT UNIQUE REFERENCES pedido(id_pedido), -- 0..1 pedido -> 0..1 venta
  fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado       venta_estado NOT NULL
);

CREATE TABLE IF NOT EXISTS detalle_venta (
  id_detalle_venta BIGSERIAL PRIMARY KEY,
  id_venta         BIGINT NOT NULL REFERENCES venta(id_venta) ON DELETE CASCADE,
  id_sku           BIGINT NOT NULL REFERENCES sku(id_sku),
  cantidad         INT NOT NULL CHECK (cantidad > 0),
  precio_aplicado  NUMERIC(12,2) NOT NULL CHECK (precio_aplicado >= 0),
  descuento_aplicado NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (descuento_aplicado >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_venta_venta_sku
  ON detalle_venta(id_venta, id_sku);

CREATE TABLE IF NOT EXISTS pago (
  id_pago      BIGSERIAL PRIMARY KEY,
  id_venta     BIGINT NOT NULL REFERENCES venta(id_venta) ON DELETE CASCADE,
  fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
  monto        NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  metodo       pago_metodo NOT NULL,
  referencia   TEXT
);

-- ============================================================
-- 7) DEVOLUCIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS devolucion (
  id_devolucion BIGSERIAL PRIMARY KEY,
  id_venta      BIGINT NOT NULL REFERENCES venta(id_venta),
  id_usuario    BIGINT NOT NULL REFERENCES usuario(id_usuario),
  fecha         TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivo        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS detalle_devolucion (
  id_detalle_devolucion BIGSERIAL PRIMARY KEY,
  id_devolucion         BIGINT NOT NULL REFERENCES devolucion(id_devolucion) ON DELETE CASCADE,
  id_sku                BIGINT NOT NULL REFERENCES sku(id_sku),
  cantidad              INT NOT NULL CHECK (cantidad > 0),
  condicion             devol_condicion NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_devolucion_devolucion_sku
  ON detalle_devolucion(id_devolucion, id_sku);

-- ============================================================
-- 8) MOVIMIENTOS DE INVENTARIO (AUDITORIA)
-- ============================================================

CREATE TABLE IF NOT EXISTS movimiento_inventario (
  id_movimiento BIGSERIAL PRIMARY KEY,
  id_sku        BIGINT NOT NULL REFERENCES sku(id_sku),
  id_usuario    BIGINT NOT NULL REFERENCES usuario(id_usuario),
  fecha         TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo          mov_tipo NOT NULL,
  cantidad      INT NOT NULL,
  motivo        TEXT NOT NULL,

  -- Referencias opcionales a lo que originó el movimiento
  id_compra     BIGINT REFERENCES compra(id_compra),
  id_venta      BIGINT REFERENCES venta(id_venta),
  id_devolucion BIGINT REFERENCES devolucion(id_devolucion),

  -- Reglas de signo:
  CHECK (
    (tipo = 'ENTRADA' AND cantidad > 0) OR
    (tipo = 'DEVOLUCION' AND cantidad > 0) OR
    (tipo = 'SALIDA' AND cantidad < 0) OR
    (tipo = 'AJUSTE' AND cantidad <> 0)
  ),

  -- Regla: como maximo una referencia (compra o venta o devolucion)
  CHECK (num_nonnulls(id_compra, id_venta, id_devolucion) <= 1)
);

-- ============================================================
-- 9) INDICES IMPORTANTES (performance real)
-- ============================================================

-- FKs que se consultan mucho:
CREATE INDEX IF NOT EXISTS idx_producto_categoria ON producto(id_categoria);
CREATE INDEX IF NOT EXISTS idx_sku_producto ON sku(id_producto);

CREATE INDEX IF NOT EXISTS idx_compra_proveedor ON compra(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_compra_usuario ON compra(id_usuario);

CREATE INDEX IF NOT EXISTS idx_detalle_compra_sku ON detalle_compra(id_sku);

CREATE INDEX IF NOT EXISTS idx_pedido_cliente ON pedido(id_cliente);
CREATE INDEX IF NOT EXISTS idx_pedido_usuario ON pedido(id_usuario);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_sku ON detalle_pedido(id_sku);

CREATE INDEX IF NOT EXISTS idx_venta_cliente ON venta(id_cliente);
CREATE INDEX IF NOT EXISTS idx_venta_usuario ON venta(id_usuario);

CREATE INDEX IF NOT EXISTS idx_detalle_venta_sku ON detalle_venta(id_sku);

CREATE INDEX IF NOT EXISTS idx_pago_venta ON pago(id_venta);

CREATE INDEX IF NOT EXISTS idx_mov_sku_fecha ON movimiento_inventario(id_sku, fecha);
CREATE INDEX IF NOT EXISTS idx_mov_tipo_fecha ON movimiento_inventario(tipo, fecha);

-- Búsqueda típica por código SKU:
CREATE INDEX IF NOT EXISTS idx_sku_codigo ON sku(codigo_sku);

-- ============================================================
-- FIN
-- ============================================================

-- ============================================================
-- QUERYS TIPICAS
-- ============================================================
--Stock actual de un SKU
SELECT
  mi.id_sku,
  SUM(mi.cantidad) AS stock_actual
FROM movimiento_inventario mi
WHERE mi.id_sku = 123
GROUP BY mi.id_sku;
-- Stock actual de TODOS los SKU
SELECT
  s.id_sku,
  s.codigo_sku,
  p.nombre AS producto,
  SUM(COALESCE(mi.cantidad, 0)) AS stock_actual
FROM sku s
JOIN producto p ON p.id_producto = s.id_producto
LEFT JOIN movimiento_inventario mi ON mi.id_sku = s.id_sku
GROUP BY s.id_sku, s.codigo_sku, p.nombre
ORDER BY stock_actual ASC;
-- Productos con stock bajo (alerta)
SELECT
  s.id_sku,
  p.nombre AS producto,
  SUM(mi.cantidad) AS stock_actual
FROM sku s
JOIN producto p ON p.id_producto = s.id_producto
JOIN movimiento_inventario mi ON mi.id_sku = s.id_sku
GROUP BY s.id_sku, p.nombre
HAVING SUM(mi.cantidad) <= 2
ORDER BY stock_actual ASC;
-- Total de una venta (calculado)
SELECT
  dv.id_venta,
  SUM(dv.cantidad * dv.precio_aplicado - dv.descuento_aplicado) AS total_venta
FROM detalle_venta dv
WHERE dv.id_venta = 50
GROUP BY dv.id_venta;
--Total pagado vs total de la venta (saldo)
WITH total_venta AS (
  SELECT
    dv.id_venta,
    SUM(dv.cantidad * dv.precio_aplicado - dv.descuento_aplicado) AS total
  FROM detalle_venta dv
  WHERE dv.id_venta = 50
  GROUP BY dv.id_venta
),
total_pagado AS (
  SELECT
    p.id_venta,
    COALESCE(SUM(p.monto), 0) AS pagado
  FROM pago p
  WHERE p.id_venta = 50
  GROUP BY p.id_venta
)
SELECT
  tv.id_venta,
  tv.total,
  tp.pagado,
  (tv.total - tp.pagado) AS saldo_pendiente
FROM total_venta tv
LEFT JOIN total_pagado tp ON tp.id_venta = tv.id_venta;
--Ventas del día (reporte diario)
SELECT
  v.id_venta,
  v.fecha,
  u.nombre AS vendedor,
  SUM(dv.cantidad * dv.precio_aplicado - dv.descuento_aplicado) AS total
FROM venta v
JOIN usuario u ON u.id_usuario = v.id_usuario
JOIN detalle_venta dv ON dv.id_venta = v.id_venta
WHERE v.estado = 'CERRADA'
  AND v.fecha::date = CURRENT_DATE
GROUP BY v.id_venta, v.fecha, u.nombre
ORDER BY v.fecha DESC;
--Total vendido por día (últimos 7 días)
SELECT
  v.fecha::date AS dia,
  SUM(dv.cantidad * dv.precio_aplicado - dv.descuento_aplicado) AS total_dia
FROM venta v
JOIN detalle_venta dv ON dv.id_venta = v.id_venta
WHERE v.estado = 'CERRADA'
  AND v.fecha >= (CURRENT_DATE - INTERVAL '7 days')
GROUP BY dia
ORDER BY dia;
--Top productos más vendidos (por unidades)
SELECT
  p.nombre AS producto,
  SUM(dv.cantidad) AS unidades_vendidas
FROM detalle_venta dv
JOIN sku s ON s.id_sku = dv.id_sku
JOIN producto p ON p.id_producto = s.id_producto
JOIN venta v ON v.id_venta = dv.id_venta
WHERE v.estado = 'CERRADA'
GROUP BY p.nombre
ORDER BY unidades_vendidas DESC
LIMIT 10;
--Top productos más vendidos (por dinero)
SELECT
  p.nombre AS producto,
  SUM(dv.cantidad * dv.precio_aplicado - dv.descuento_aplicado) AS ingreso_total
FROM detalle_venta dv
JOIN sku s ON s.id_sku = dv.id_sku
JOIN producto p ON p.id_producto = s.id_producto
JOIN venta v ON v.id_venta = dv.id_venta
WHERE v.estado = 'CERRADA'
GROUP BY p.nombre
ORDER BY ingreso_total DESC
LIMIT 10;
--Clientes con más compras (frecuentes)
SELECT
  c.id_cliente,
  c.nombre_completo,
  COUNT(v.id_venta) AS total_compras
FROM cliente c
JOIN venta v ON v.id_cliente = c.id_cliente
WHERE v.estado = 'CERRADA'
GROUP BY c.id_cliente, c.nombre_completo
ORDER BY total_compras DESC
LIMIT 10;
--Pedidos pendientes por WhatsApp
SELECT
  p.id_pedido,
  p.fecha_creacion,
  p.estado,
  p.canal,
  c.nombre_completo
FROM pedido p
LEFT JOIN cliente c ON c.id_cliente = p.id_cliente
WHERE p.canal = 'WHATSAPP'
  AND p.estado IN ('BORRADOR', 'CONFIRMADO', 'EMPACADO')
ORDER BY p.fecha_creacion ASC;
--Detalle de un pedido (lo que pidió el cliente)
SELECT
  dp.id_pedido,
  pr.nombre AS producto,
  s.codigo_sku,
  dp.cantidad,
  dp.precio_estimado
FROM detalle_pedido dp
JOIN sku s ON s.id_sku = dp.id_sku
JOIN producto pr ON pr.id_producto = s.id_producto
WHERE dp.id_pedido = 77;
--Costo estimado de un pedido (si tiene precio_estimado)
SELECT
  dp.id_pedido,
  SUM(dp.cantidad * dp.precio_estimado) AS total_estimado
FROM detalle_pedido dp
WHERE dp.id_pedido = 77
GROUP BY dp.id_pedido;
-- Utilidad aproximada por venta (si quieres)
--Costo promedio por SKU:
SELECT
  dc.id_sku,
  AVG(dc.costo_unitario) AS costo_promedio
FROM detalle_compra dc
GROUP BY dc.id_sku;
--Utilidad aproximada por venta:
WITH costo_promedio AS (
  SELECT
    dc.id_sku,
    AVG(dc.costo_unitario) AS costo_prom
  FROM detalle_compra dc
  GROUP BY dc.id_sku
)
SELECT
  dv.id_venta,
  SUM((dv.precio_aplicado - cp.costo_prom) * dv.cantidad - dv.descuento_aplicado) AS utilidad_aprox
FROM detalle_venta dv
JOIN costo_promedio cp ON cp.id_sku = dv.id_sku
WHERE dv.id_venta = 50
GROUP BY dv.id_venta;
