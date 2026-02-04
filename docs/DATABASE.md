# Base de datos (V1) - PostgreSQL + Prisma

Este documento resume el modelo de datos, reglas y criterios de consistencia.

## Motor
- PostgreSQL (local por Docker Compose)
- Prisma como ORM (Object-Relational Mapping)

## Principios de diseño (V1)

### 1) Inventario por movimientos
No guardamos "stock fijo" en una tabla como verdad absoluta.

El stock se calcula como:
- stock = SUM(movimientos.cantidad) agrupado por SKU

Movimientos típicos:
- ENTRADA (compras / recepción)
- SALIDA (ventas cerradas)
- DEVOLUCIÓN (retorno del cliente)
- AJUSTE (conteo físico / pérdida)

Ventaja:
- auditoría natural y trazabilidad completa.

### 2) No se borra información (soft delete)
Se usa `active = false` en:
- users
- categories
- products
- skus
- customers
- suppliers

Esto evita romper historial de ventas y reportes.

### 3) Ventas cerradas no se modifican
Correcciones se aplican con:
- devoluciones (returns)

---

## Entidades principales (V1)

### Seguridad
- roles (ADMIN / VENDEDOR / BODEGA)
- users (con passwordHash)

### Catálogo
- categories
- products
- skus

### Personas de negocio
- customers
- suppliers

### Operación
- purchases + purchase_items
- sales + sale_items + payments
- orders + order_items + shipping
- returns + return_items
- inventory_movements

---

## Relaciones importantes (resumen)

- Category 1---N Product
- Product 1---N Sku
- Supplier 1---N Purchase
- Purchase 1---N PurchaseItem
- Sale 1---N SaleItem
- Sale 1---N Payment
- Sale 1---N Return
- Return 1---N ReturnItem
- Order 1---N OrderItem
- Order 1---1 Shipping (opcional)
- Order 1---1 Sale (opcional, máximo una)

---

## Unicidad y constraints recomendados (V1)
- users.username UNIQUE
- roles.name UNIQUE
- categories.name UNIQUE
- skus.skuCode UNIQUE
- customers.phone UNIQUE (opcional, si se usa)
- customers.cedulaRuc UNIQUE (opcional, si se usa)
- suppliers.email UNIQUE (si se usa)
- shipping.orderId UNIQUE
- sale.orderId UNIQUE (una venta por pedido)

---

## Índices recomendados (V1)
- products(categoryId)
- skus(productId)
- purchases(supplierId)
- purchases(createdById)
- sales(createdById)
- sales(status)
- orders(status)
- inventory_movements(skuId, createdAt)
- inventory_movements(type, createdAt)

---

## Migraciones y seed

### Migración
```bash
npx prisma migrate dev
```

### Seed (roles + admin)
```bash
npx prisma db seed
```

---

## Notas de escalamiento (futuro)
Si crece:
- vistas materializadas para reportes diarios
- multi-bodega (otra tabla para ubicaciones)
- stock defectuoso separado
- seriales/lotes (trazabilidad)
