require('dotenv').config();

const crearApp = require('./src/app');
const MapboxAdapter = require('./src/adapters/MapboxAdapter');
const ProveedorRutasFalso = require('./src/adapters/ProveedorRutasFalso');
const crearPool = require('./src/db/pool');
const ViajeRepositoryPostgres = require('./src/repositories/viaje.repository.postgres');
const UsuarioRepositoryPostgres = require('./src/repositories/usuario.repository.postgres');
const VehiculoRepositoryPostgres = require('./src/repositories/vehiculo.repository.postgres');

const PORT = process.env.PORT || 3000;

// Punto de composición: el proveedor de rutas y los repositorios se crean una
// sola vez acá y se inyectan en la app. Por eso no hace falta un Singleton.
function crearProveedorRutas() {
  if (process.env.MAPBOX_API_KEY) {
    return new MapboxAdapter(process.env.MAPBOX_API_KEY);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Falta la variable de entorno MAPBOX_API_KEY');
  }

  console.warn(
    'MAPBOX_API_KEY no está definida: se usa ProveedorRutasFalso (690 km fijos)',
  );
  return new ProveedorRutasFalso();
}

// Con DATABASE_URL se usan los repositorios PostgreSQL, que comparten un solo
// pool. Sin DATABASE_URL, crearApp usa sus repositorios en memoria.
function crearRepositorios() {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Falta la variable de entorno DATABASE_URL');
    }

    console.warn('DATABASE_URL no está definida: se usan repositorios en memoria');
    return {};
  }

  const pool = crearPool(process.env.DATABASE_URL);

  return {
    viajeRepository: new ViajeRepositoryPostgres({ pool }),
    usuarioRepository: new UsuarioRepositoryPostgres({ pool }),
    vehiculoRepository: new VehiculoRepositoryPostgres({ pool }),
  };
}

const app = crearApp({
  proveedorRutas: crearProveedorRutas(),
  ...crearRepositorios(),
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});