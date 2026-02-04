# Decisiones de arquitectura (V1)

Este archivo registra decisiones importantes tomadas en el diseño del backend.
Sirve para recordar “por qué” se hizo cada cosa.

---

## D1) Inventario basado en movimientos (no stock fijo)
**Decisión:** El inventario se maneja con tabla de movimientos.

**Motivo:**
- trazabilidad completa
- auditoría natural
- evita inconsistencias por “stock editado manualmente”

---

## D2) Ventas cerradas no se editan
**Decisión:** Una venta CERRADA no se modifica.
Correcciones se aplican con DEVOLUCIONES.

**Motivo:**
- consistencia contable
- historial confiable
- auditar cambios es más simple

---

## D3) Soft delete (active=false)
**Decisión:** No se elimina información crítica.

**Motivo:**
- no romper referencias históricas
- reportes no se dañan
- auditoría consistente

---

## D4) Pedidos reservan stock de forma lógica (V1)
**Decisión:** Pedido CONFIRMADO “reserva” stock solo por regla, sin tabla extra.

**Motivo:**
- V1 simple, rápido de implementar
- funciona bien en tienda pequeña

**Futuro:**
- reservas reales (tabla de reservas con expiración)

---

## D5) API con respuesta estándar
**Decisión:** Todas las respuestas salen como `{ data: ... }` y los errores como `{ error: ... }`.

**Motivo:**
- frontend más simple
- formato consistente para logs y debugging

---

## D6) Roles y permisos (RBAC)
**Decisión:** RBAC (Role-Based Access Control) simple en V1:
- ADMIN
- VENDEDOR
- BODEGA

**Motivo:**
- cubre la operación típica de una tienda
- evita permisos excesivamente finos en V1

**Futuro:**
- permisos por acción (ACL) si se vuelve un mini-ERP

---

## D7) JWT como autenticación
**Decisión:** JWT (JSON Web Token) como auth.

**Motivo:**
- simple de desplegar
- stateless (no guarda sesiones)

**Parámetros (V1):**
- `JWT_EXPIRES_IN = 8h`

---

## D8) Stack tecnológico
**Decisión:** NestJS + Prisma + PostgreSQL.

**Motivo:**
- NestJS organiza por módulos y favorece escalado
- Prisma facilita migraciones y modelos
- PostgreSQL es robusto y estándar industrial

---

## D9) Reportes primero como consultas directas
**Decisión:** Reportes V1 se hacen con agregaciones normales (Prisma/SQL).

**Motivo:**
- suficiente para tienda pequeña
- evita complejidad prematura

**Futuro:**
- vistas materializadas y colas para reportes pesados
