# Plataforma de Logística para Viajes Frecuentes
Una aplicación web diseñada para coordinar viajes de media distancia (ej. Bahía Blanca - CABA) de forma eficiente, permitiendo la división de gastos y optimización de rutas.

## El Equipo
* **[Sanger Alejo]**
* **[Nazareno Negrete]**
* **[Nicolás Friedrich]**
* **[Luciano Kloster]** 


## Stack Tecnológico
* **Frontend:** React, Vite, Tailwind CSS, Mapbox API
* **Backend:** Node.js/Express 
* **Base de Datos:** PostgreSQL
* **Herramientas:** Git, GitHub, draw.io

>  **Estado del proyecto:** etapa temprana. Backend y frontend levantan en modo desarrollo, pero la base de datos, Mapbox, autenticación y los patrones de diseño están **planificados y aún no implementados**. Ver [Estado actual vs. planificado](#estado-actual-vs-planificado).

## Arquitectura y Patrones de Diseño (planificados)
Este proyecto planea implementar los 5 patrones de diseño creacionales clásicos para resolver reglas de negocio complejas:
1. **Singleton:** Gestión de la instancia única de conexión a la API de mapas.
2. **Builder:** Ensamblaje paso a paso de los objetos de Viaje (rutas, paradas, políticas).
3. **Prototype:** Clonación de viajes recurrentes semanales para agilizar la publicación.
4. **Factory Method:** Instanciación dinámica del sistema de notificaciones (Email, Push, SMS).
5. **Abstract Factory:** Creación de familias de calculadoras de costos (combustible + peaje) según el tipo de vehículo.

> Estos patrones son parte del diseño/roadmap. Todavía **no están implementados** en el código.

## Flujo de Trabajo (Git Flow)
1. La rama `main` contiene código estable.
2. Todo el desarrollo se hace en ramas con el prefijo `feature/` (ej. `feature/login-usuarios`).
3. Se requiere un Pull Request y revisión de al menos 1 compañero antes de hacer merge.

## Requisitos previos
* **Node.js** v20.19+ o v22.12+ (requerido por Vite 8 — verificá con `node -v`)
* **npm** v9 o superior (verificá con `npm -v`)
* *(Futuro)* **PostgreSQL** v14 o superior — aún no es necesario para levantar el proyecto.
* *(Futuro)* Cuenta y **API Key** de Mapbox — aún no es necesaria para levantar el proyecto.

## Cómo levantar el proyecto desde cero (Quick Start)

### 1. Clonar el repositorio
```bash
git clone https://github.com/NaxarenoXNT/Metodolog-a-2-Grupo-8.git
cd Metodolog-a-2-Grupo-8
```

### 2. Backend
```bash
cd backend
npm install
copy .env.example .env   # Windows (en Linux/macOS: cp .env.example .env)
npm run dev
```
Levanta el servidor en `http://localhost:3000`.

> Probalo entrando a `http://localhost:3000/health` (debería devolver `{"status":"ok",...}`).

### 3. Frontend (en otra terminal)
```bash
cd frontend
npm install
copy .env.example .env   # Windows (en Linux/macOS: cp .env.example .env)
npm run dev
```
Levanta la app en `http://localhost:5173`.

---

## Dependencias

### Frontend
```bash
cd frontend
npm install
```
Principales paquetes: `react`, `vite`, `tailwindcss`, `mapbox-gl` / `react-map-gl`, `axios`, `react-router-dom`.

### Backend
```bash
cd backend
npm install
```
Principales paquetes: `express`, `pg` (cliente de PostgreSQL), `dotenv`, `cors`, `jsonwebtoken`, `bcrypt`.

## Configuración de Variables de Entorno

Crear un archivo `.env` en la carpeta `backend/` a partir de `backend/.env.example`:

```env
PORT=3000
# DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nombre_db
# JWT_SECRET=tu_secreto_aqui
# MAPBOX_API_KEY=tu_api_key_aqui
```

Por ahora solo `PORT` se usa realmente. Las demás están **comentadas y reservadas** para cuando se integren la base de datos, la autenticación y Mapbox.

Y otro `.env` en la carpeta `frontend/` a partir de `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=
```

`VITE_API_URL` apunta al backend. `VITE_MAPBOX_TOKEN` se usará cuando se integre Mapbox.

## Comandos de Ejecución

### Backend (modo desarrollo)
```bash
cd backend
npm run dev
```
Levanta el servidor en `http://localhost:3000` (usa `nodemon`, se reinicia al guardar cambios).

### Frontend (modo desarrollo)
```bash
cd frontend
npm run dev
```
Levanta la app en `http://localhost:5173`.

> También hay: `npm run build` (build de producción) y `npm run lint` (lint del frontend).

### Base de Datos (pendiente)
La base de datos PostgreSQL **todavía no está conectada** al código. Cuando se integre, se definirán las migraciones y un comando para ejecutarlas (por ejemplo con Knex o Prisma). Hoy **no existe** el script `npm run migrate`.

## Estado actual vs. planificado

| Área | Estado hoy | Planificado |
|---|---|---|
| Backend Express | ✅ Levanta con endpoints de prueba (`/health`, `/api/viajes` con datos mock) | Endpoints reales conectados a BD |
| Frontend React + Vite | ✅ Levanta (plantilla base) | UI de la plataforma |
| Tailwind CSS | ✅ Configurado | Uso en componentes |
| Base de datos PostgreSQL | ⬜ No conectada | Modelos, migraciones y CRUD |
| Migraciones | ⬜ No existe script `migrate` | Definir con Knex o Prisma |
| Autenticación (JWT + bcrypt) | ⬜ No implementada (deps instaladas) | Login/registro |
| Mapbox | ⬜ No integrada | Rutas, paradas y cálculo de distancias |
| Patrones de diseño | ⬜ No implementados | Singleton, Builder, Prototype, Factory Method, Abstract Factory |


### Convenciones
* Frontend: mantené `npm run lint` sin errores (`cd frontend && npm run lint`).
* Backend: usá `npm run dev` (nodemon) durante el desarrollo.

---

## Esquema de Tablas (Referencia de diseño)

> ⚠️ El esquema siguiente es **referencia de diseño**. Todavía **no hay migraciones** ni conexión activa a la base de datos.
```
==========================================
USUARIOS
==========================================
**usuarios**
    id  PK, SERIAL
    nombre  VARCHAR
    email  VARCHAR, UNIQUE
    password_hash  VARCHAR
    telefono  VARCHAR NULL
    fecha_registro  TIMESTAMP DEFAULT now()

==========================================
VEHICULOS (para calcular consumo/costos)
==========================================
**vehiculos**
    id  PK, SERIAL
    usuario_id  FK -> usuarios.id
    tipo  VARCHAR   -- auto, moto, etc (relaciona con Abstract Factory)
    marca  VARCHAR
    modelo  VARCHAR
    consumo_l_100km  NUMERIC   -- litros cada 100km
    tipo_combustible  VARCHAR  -- nafta, diesel, gnc

==========================================
RUTAS FRECUENTES (plantillas, reutilizables)
==========================================
**rutas_frecuentes**
    id  PK, SERIAL
    usuario_id  FK -> usuarios.id
    nombre  VARCHAR         -- ej "Bahía - CABA semanal"
    origen_lat  NUMERIC
    origen_lng  NUMERIC
    destino_lat  NUMERIC
    destino_lng  NUMERIC
    distancia_km  NUMERIC NULL    -- cacheado desde Mapbox
    es_recurrente  BOOLEAN DEFAULT false  -- soporte para Prototype

==========================================
VIAJES (instancias concretas, publicadas)
==========================================
**viajes**
    id  PK, SERIAL
    ruta_frecuente_id  FK -> rutas_frecuentes.id NULL  -- si nace de un clon
    conductor_id  FK -> usuarios.id
    vehiculo_id  FK -> vehiculos.id
    fecha_salida  TIMESTAMP
    asientos_totales  INT
    asientos_disponibles  INT
    costo_estimado  NUMERIC   -- calculado (combustible + peajes)
    estado  VARCHAR   -- pendiente, en_curso, finalizado, cancelado

==========================================
PARADAS (puntos intermedios de un viaje)
==========================================
**paradas**
    id  PK, SERIAL
    viaje_id  FK -> viajes.id
    orden  INT
    lat  NUMERIC
    lng  NUMERIC
    descripcion  VARCHAR NULL

==========================================
PASAJEROS POR VIAJE (relación N a N)
==========================================
**viaje_pasajeros**
    id  PK, SERIAL
    viaje_id  FK -> viajes.id
    usuario_id  FK -> usuarios.id
    monto_pagar  NUMERIC   -- división de gastos
    estado_pago  VARCHAR   -- pendiente, pagado

==========================================
ESTACIONES DE SERVICIO (para "mejores rutas para cargar nafta")
==========================================
**estaciones_servicio**
    id  PK, SERIAL
    nombre  VARCHAR
    marca  VARCHAR    -- YPF, Shell, Axion, etc
    lat  NUMERIC
    lng  NUMERIC
    precio_nafta  NUMERIC NULL
    fecha_actualizacion  TIMESTAMP

==========================================
NOTIFICACIONES (Factory Method: email/push/sms)
==========================================
**notificaciones**
    id  PK, SERIAL
    usuario_id  FK -> usuarios.id
    tipo  VARCHAR   -- email, push, sms
    mensaje  VARCHAR
    leida  BOOLEAN DEFAULT false
    fecha_envio  TIMESTAMP DEFAULT now()
```
