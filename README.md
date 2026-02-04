# Tienda Arduino – Backend (V1)

Backend administrativo tipo **CRUD** para una tienda de electrónica/Arduino.

**Stack:** NestJS + Prisma + PostgreSQL

---

## Objetivo del proyecto
Este backend permite administrar una tienda de componentes electrónicos y robótica:
- Catálogo (categorías, productos y SKUs)
- Clientes y proveedores
- Compras (entradas de inventario)
- Ventas (salidas de inventario) + pagos
- Pedidos (WhatsApp) + envíos
- Devoluciones
- Inventario basado en **movimientos**
- Reportes básicos

La parte de **levantamiento de información** y reglas está en:
- `docs/LEVANTAMIENTO.md`

---

## Requisitos
- **Node.js 24 LTS**
- **Docker** + **Docker Compose**

---

## Arranque rápido (local)

### 1) Instalar dependencias
```bash
npm install
```

### 2) Levantar PostgreSQL (Docker)
```bash
docker compose up -d
```

### 3) Crear archivo `.env`
```bash
cp .env.example .env
```

### 4) Migrar base de datos
```bash
npx prisma migrate dev
```

### 5) Seed inicial (roles + admin)
```bash
npx prisma db seed
```

### 6) Correr el backend
```bash
npm run dev
```

---

## Swagger (Documentación API)
Cuando el servidor esté arriba:
- `http://localhost:3000/api/v1/docs`

---

## Scripts disponibles
- `npm run dev` → modo desarrollo (watch)
- `npm run build` → compilar a `dist/`
- `npm run start:prod` → ejecutar compilado
- `npm run lint` → revisar estilo/código
- `npm run format` → formatear con Prettier
- `npm run prisma:studio` → abrir Prisma Studio

---

## Variables de entorno
Revisar el archivo `.env.example`.

Variables típicas:
- `PORT` → puerto del servidor
- `API_PREFIX` → prefijo global de la API (ej: `/api/v1`)
- `DATABASE_URL` → conexión PostgreSQL
- `JWT_SECRET` → secreto para firmar tokens
- `JWT_EXPIRES_IN` → duración del token (ej: `8h`)

---

## Documentación técnica
Todo está en `docs/`:
- `docs/LEVANTAMIENTO.md` → modelo de negocio + casos de uso + reglas
- `docs/DATABASE.md` → criterios del modelo de datos
- `docs/API.md` → contrato base de endpoints
- `docs/RBAC.md` → roles y permisos
- `docs/DECISIONS.md` → decisiones de arquitectura

---

## Convenciones importantes (V1)
- **No se borra:** se desactiva (`active=false`) para no romper historial.
- **Inventario real = suma de movimientos:**
  - ENTRADA (compras/recepción)
  - SALIDA (ventas cerradas)
  - DEVOLUCIÓN (retorno del cliente)
  - AJUSTE (conteo físico)
- **Ventas cerradas no se editan:** correcciones se hacen con **devoluciones**.
