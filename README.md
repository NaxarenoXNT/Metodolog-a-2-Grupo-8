# Plataforma de Logística para Viajes Frecuentes

Aplicación web para coordinar viajes de media distancia, como Bahía Blanca -
CABA, compartir asientos y dividir los gastos del recorrido.

## Estado actual

El backend permite:

- Registrar usuarios e iniciar sesión con JWT.
- Registrar y listar los vehículos del usuario autenticado.
- Publicar, consultar, filtrar y cancelar viajes.
- Sumar y bajar pasajeros con control de permisos.
- Calcular el costo del viaje y dividirlo en partes iguales o por kilómetros.
- Persistir usuarios, vehículos, viajes, paradas y pasajeros en PostgreSQL.

El frontend todavía es una plantilla inicial de Vite. La interfaz de producto
se desarrollará después de estabilizar el contrato de la API.

## Equipo

- **Sanger Alejo**
- **Nazareno Negrete**
- **Nicolás Friedrich**
- **Luciano Kloster**

## Stack tecnológico

- **Frontend:** React, Vite, Tailwind CSS, React Router y Axios.
- **Backend:** Node.js 22, Express, bcrypt y jsonwebtoken.
- **Base de datos:** PostgreSQL 17, `pg`, migraciones SQL y Docker Compose.
- **Rutas:** Adapter de Mapbox con un proveedor falso para desarrollo y pruebas.
- **Pruebas:** `node:test` y Supertest.

## Arquitectura y decisiones de diseño

- **Builder:** construye y valida viajes antes de persistirlos.
- **Adapter:** aísla a los servicios del contrato específico de Mapbox.
- **Strategy:** permite dividir gastos en partes iguales o por kilómetros.
- **Observer:** separa las reacciones al alta y baja de pasajeros.
- **Repository:** mantiene el mismo contrato async para memoria y PostgreSQL.
- **Inyección de dependencias:** `index.js` y `app.js` componen repositorios,
  servicios y adaptadores sin estado global oculto.
- **JWT + bcrypt:** autentica sin guardar sesiones en el servidor y nunca
  expone `passwordHash` en las respuestas.

Las alternativas consideradas, los patrones descartados y sus trade-offs están
documentados en
[`docs/decisiones-diseno.md`](docs/decisiones-diseno.md).

## Requisitos previos

- Node.js 22.13 o superior.
- npm 9 o superior.
- Docker Desktop con Docker Compose.
- Una API Key de Mapbox es opcional. Sin ella se usa una distancia falsa de
  690 km en desarrollo.

## Inicio rápido

### 1. Configurar y levantar PostgreSQL

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
# Completar POSTGRES_PASSWORD en .env
docker compose up -d
```

El contenedor crea las bases `viajes` y `viajes_test`.

### 2. Configurar el backend

```powershell
cd backend
Copy-Item .env.example .env
npm ci
```

En `backend/.env`, reemplazar `<POSTGRES_PASSWORD>` por la misma contraseña de
la raíz y cambiar `JWT_SECRET` por un secreto local.

```env
PORT=3000
DATABASE_URL=postgresql://grupo8:<POSTGRES_PASSWORD>@localhost:5432/viajes
JWT_SECRET=cambiar_por_un_secreto_local
MAPBOX_API_KEY=
```

Aplicar las migraciones y levantar el servidor:

```powershell
npm run migrate
npm run dev
```

El backend queda disponible en `http://localhost:3000`. El endpoint
`GET /health` devuelve el estado del servidor.

### 3. Configurar el frontend

En otra terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

El frontend queda disponible en `http://localhost:5173` y usa
`VITE_API_URL=http://localhost:3000`.

## Variables de entorno

### Backend

| Variable | Obligatoria | Uso |
|---|---:|---|
| `PORT` | No | Puerto HTTP; por defecto `3000`. |
| `DATABASE_URL` | En producción | Activa los repositorios PostgreSQL. Sin ella se usa memoria. |
| `JWT_SECRET` | Sí | Firma y verifica los tokens con vencimiento de 24 horas. |
| `MAPBOX_API_KEY` | No | Activa Mapbox; sin ella se usa el proveedor falso en desarrollo. |

### Frontend

| Variable | Obligatoria | Uso |
|---|---:|---|
| `VITE_API_URL` | Sí | URL base del backend. |
| `VITE_MAPBOX_TOKEN` | No por ahora | Token para integrar el mapa en la interfaz. |

## Endpoints principales

| Método y ruta | Autenticación | Descripción |
|---|---|---|
| `POST /api/auth/registro` | No | Registra un usuario y devuelve usuario + token. |
| `POST /api/auth/login` | No | Valida credenciales y devuelve usuario + token. |
| `GET /api/auth/yo` | Sí | Devuelve la identidad incluida en el token. |
| `POST /api/vehiculos` | Sí | Crea un vehículo para el usuario autenticado. |
| `GET /api/vehiculos` | Sí | Lista únicamente los vehículos propios. |
| `GET /api/viajes` | No | Lista viajes; acepta `estado`, `desde` y `hasta`. |
| `GET /api/viajes/:id` | No | Consulta un viaje. |
| `POST /api/viajes` | Sí | Publica con `conductorId` tomado del token. |
| `PATCH /api/viajes/:id/cancelar` | Conductor | Cancela un viaje pendiente. |
| `POST /api/viajes/:id/pasajeros` | Sí | Suma al usuario del token como pasajero. |
| `DELETE /api/viajes/:id/pasajeros/:usuarioId` | Pasajero o conductor | Baja un pasajero. |
| `GET /api/viajes/:id/costo` | No | Calcula el costo total. |
| `GET /api/viajes/:id/division?modo=iguales\|km` | No | Divide el costo. |

Las respuestas de usuario nunca incluyen `passwordHash`.

## Migraciones y pruebas

La migración real está en
[`backend/db/migraciones/001_esquema_inicial.sql`](backend/db/migraciones/001_esquema_inicial.sql).
`npm run migrate` registra cada archivo aplicado en `schema_migraciones`, por lo
que puede ejecutarse nuevamente sin repetir migraciones.

Pruebas en memoria:

```powershell
cd backend
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
npm test
```

Migración y pruebas con PostgreSQL:

```powershell
$env:DATABASE_URL="postgresql://grupo8:<POSTGRES_PASSWORD>@localhost:5432/viajes_test"
npm run migrate
npm test
```

La batería compartida comprueba que memoria y PostgreSQL respeten el mismo
contrato. También verifica el rollback de la transacción que reemplaza los
pasajeros de un viaje.

## Alcance del MVP académico

El MVP cubre el recorrido principal del backend: registrarse, crear un vehículo,
publicar un viaje, sumar o bajar pasajeros, dividir gastos y cancelar, con datos
persistidos en PostgreSQL.

Quedan fuera del alcance actual:

- Rutas frecuentes y recurrencia.
- Estaciones de servicio.
- Notificaciones persistidas o canales reales.
- Pagos.
- Frontend completo.

## Flujo de trabajo

1. `main` contiene código estable.
2. `dev` es la rama de integración.
3. El desarrollo se realiza en ramas `feature/*` creadas desde `dev`.
4. Antes de abrir un PR se hace `git fetch`, `git rebase origin/dev` y se
   ejecutan las pruebas.
5. Cada PR requiere la revisión de al menos un integrante.
