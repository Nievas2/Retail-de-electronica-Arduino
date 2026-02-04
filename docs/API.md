# Arduino Store API (V1)

Este documento describe el contrato base de la API del backend (NestJS + Prisma + PostgreSQL).

## Base URL
- Prefijo: `/api/v1`

## Formato estándar de respuestas
### OK
```json
{ "data": ... }
```

### Error
```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human readable message",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

## Autenticación
- JWT (JSON Web Token) por `Authorization: Bearer <token>`
- Login en: `POST /auth/login`

## Convenciones
### Paginación (listados)
Parámetros típicos:
- `page` (1..n)
- `limit` (ej: 20)

Respuesta típica:
```json
{
  "data": {
    "items": [],
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

### Soft delete (no se borra)
- Entidades tienen `active = false` para “desactivar”
- No se rompe historial (ventas antiguas siguen referenciando lo mismo)

---

## Endpoints (V1)

### Health
- `GET /health`

### Auth
- `POST /auth/login`
- `GET /auth/me`

### Roles
- `GET /roles`

### Users
- `GET /users?search=&page=&limit=`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/activate`

### Categories
- `GET /categories?search=&page=&limit=`
- `POST /categories`
- `GET /categories/:id`
- `PATCH /categories/:id`
- `PATCH /categories/:id/activate`

### Products
- `GET /products?search=&categoryId=&page=&limit=`
- `POST /products`
- `GET /products/:id`
- `PATCH /products/:id`
- `PATCH /products/:id/activate`

### SKUs
- `GET /skus?search=&productId=&active=&page=&limit=`
- `POST /skus`
- `GET /skus/:id`
- `PATCH /skus/:id`
- `PATCH /skus/:id/activate`

### Customers
- `GET /customers?search=&page=&limit=`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `PATCH /customers/:id/activate`

### Suppliers
- `GET /suppliers?search=&page=&limit=`
- `POST /suppliers`
- `GET /suppliers/:id`
- `PATCH /suppliers/:id`
- `PATCH /suppliers/:id/activate`

### Purchases
- `POST /purchases`
- `GET /purchases?status=&from=&to=&page=&limit=`
- `GET /purchases/:id`
- `PATCH /purchases/:id/status`  (REGISTRADA → RECIBIDA / ANULADA)

### Sales
- `POST /sales`
- `GET /sales?status=&from=&to=&page=&limit=`
- `GET /sales/:id`
- `PATCH /sales/:id/status`  (ABIERTA → CERRADA)
- `POST /sales/:id/payments`

### Orders
- `POST /orders`
- `GET /orders?status=&channel=&customerId=&page=&limit=`
- `GET /orders/:id`
- `PATCH /orders/:id` (solo BORRADOR)
- `PATCH /orders/:id/status`
- `POST /orders/:id/items`
- `PATCH /orders/:id/items/:itemId`
- `DELETE /orders/:id/items/:itemId`

### Shipping
- `POST /orders/:id/shipping`
- `PATCH /orders/:id/shipping`

### Returns
- `POST /sales/:id/returns`
- `GET /sales/:id/returns`
- `GET /returns/:id`

### Inventory
- `GET /inventory/stock?search=&page=&limit=`
- `GET /inventory/movements?skuId=&type=&from=&to=&page=&limit=`
- `POST /inventory/adjustments`

### Reports
- `GET /reports/sales/daily?from=&to=`
- `GET /reports/sales/summary?from=&to=`
- `GET /reports/sales/top-products?from=&to=&limit=10&mode=units|money`
- `GET /reports/inventory/low-stock?threshold=2`
- `GET /reports/customers/top?from=&to=&limit=10`
- `GET /reports/orders/pending?channel=WHATSAPP`

---

## Reglas clave (V1)
- Ventas cerradas NO se editan → correcciones por devoluciones.
- Inventario real = suma de movimientos (ENTRADA/SALIDA/DEVOLUCION/AJUSTE).
- Pedidos confirmados “reservan” stock de forma lógica (fase V1).
