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

## Arquitectura y Patrones de Diseño
Este proyecto implementa los 5 patrones de diseño creacionales clásicos para resolver reglas de negocio complejas:
1. **Singleton:** Gestión de la instancia única de conexión a la API de mapas.
2. **Builder:** Ensamblaje paso a paso de los objetos de Viaje (rutas, paradas, políticas).
3. **Prototype:** Clonación de viajes recurrentes semanales para agilizar la publicación.
4. **Factory Method:** Instanciación dinámica del sistema de notificaciones (Email, Push, SMS).
5. **Abstract Factory:** Creación de familias de calculadoras de costos (combustible + peaje) según el tipo de vehículo.

## Flujo de Trabajo (Git Flow)
1. La rama `main` contiene código estable.
2. Todo el desarrollo se hace en ramas con el prefijo `feature/` (ej. `feature/login-usuarios`).
3. Se requiere un Pull Request y revisión de al menos 1 compañero antes de hacer merge.

## Dependencias

### Requisitos previos
* **Node.js** v18 o superior
* **npm** v9 o superior (o `yarn`/`pnpm` si el equipo lo prefiere)
* **PostgreSQL** v14 o superior
* Cuenta y **API Key** de Mapbox

### Frontend
```bash
cd frontend
npm install
```
Principales paquetes: `react`, `vite`, `tailwindcss`, `mapbox-gl` (o `react-map-gl`), `axios`, `react-router-dom`.

### Backend
```bash
cd backend
npm install
```
Principales paquetes: `express`, `pg` (cliente de PostgreSQL), `dotenv`, `cors`, `jsonwebtoken`, `bcrypt`.

## Configuración de Variables de Entorno

Crear un archivo `.env` en la carpeta `backend/` con el siguiente contenido:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nombre_db
JWT_SECRET=tu_secreto_aqui
MAPBOX_API_KEY=tu_api_key_aqui
```

Y otro `.env` en la carpeta `frontend/`:

```env
VITE_API_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=tu_api_key_aqui
```

## Comandos de Ejecución

### Backend (modo desarrollo)
```bash
cd backend
npm run dev
```
Levanta el servidor en `http://localhost:3000`.

### Frontend (modo desarrollo)
```bash
cd frontend
npm run dev
```
Levanta la app en `http://localhost:5173`.

### Base de Datos
```bash
# La base de datos que vamos a utilizar en el futuro es postgress:
# el 
# Crear la base de datos
createdb nombre_db

# Ejecutar migraciones (si usan alguna herramienta como Knex o Prisma)
npm run migrate
```

### Esquema de Tablas (Referencia)
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



### Build de producción (frontend)
```bash
cd frontend
npm run build
```
