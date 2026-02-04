# RBAC (V1) – Roles y permisos

RBAC = Role-Based Access Control (Control de acceso basado en roles).

En V1 manejamos 3 roles:
- **ADMIN**: administra todo.
- **VENDEDOR**: operación de ventas/pedidos (mostrador).
- **BODEGA**: compras/inventario (movimientos y stock).

---

## Roles

### ADMIN
Puede:
- crear/editar/desactivar catálogos
- gestionar usuarios y roles
- operar ventas y compras
- ver reportes

### VENDEDOR
Puede:
- crear ventas, registrar pagos, cerrar ventas
- crear pedidos (WhatsApp) y mover estados operativos
- ver catálogo y stock
- crear/editar clientes

### BODEGA
Puede:
- registrar compras y recepciones
- hacer ajustes de inventario
- ver y manejar stock
- ver catálogo (lectura)

---

## Matriz de permisos (resumen)

### Auth
- `POST /auth/login` → Público
- `GET /auth/me` → ADMIN / VENDEDOR / BODEGA

### Users / Roles
- `GET /roles` → ADMIN
- `GET /users` → ADMIN
- `POST /users` → ADMIN
- `PATCH /users/*` → ADMIN

### Catalog
- `GET /categories/products/skus` → ADMIN / VENDEDOR / BODEGA
- `POST/PATCH/activate` catálogo → ADMIN

### Customers
- `GET /customers` → ADMIN / VENDEDOR / BODEGA
- `POST/PATCH/activate` → ADMIN / VENDEDOR

### Suppliers
- `GET /suppliers` → ADMIN / BODEGA
- `POST/PATCH/activate` → ADMIN / BODEGA

### Purchases
- `POST /purchases` → ADMIN / BODEGA
- `GET /purchases` → ADMIN / BODEGA
- `PATCH /purchases/:id/status` → ADMIN / BODEGA

### Sales
- `POST /sales` → ADMIN / VENDEDOR
- `GET /sales` → ADMIN / VENDEDOR
- `PATCH /sales/:id/status` → ADMIN / VENDEDOR
- `POST /sales/:id/payments` → ADMIN / VENDEDOR

### Orders + Shipping
- `POST/GET/PATCH /orders` → ADMIN / VENDEDOR
- items de pedido → ADMIN / VENDEDOR
- shipping → ADMIN / VENDEDOR

### Inventory
- `GET /inventory/*` → ADMIN / VENDEDOR / BODEGA
- `POST /inventory/adjustments` → ADMIN / BODEGA

### Returns
- `POST /sales/:id/returns` → ADMIN / VENDEDOR
- `GET returns` → ADMIN / VENDEDOR

### Reports
- `GET /reports/*` → ADMIN

---

## Notas prácticas
- En V1, la regla es: **lo más simple que funcione**.
- Si el negocio crece, se puede agregar:
  - permisos finos por módulo/acción
  - auditoría más estricta
  - separación por sucursales/bodegas
