require('dotenv').config();

const crearApp = require('./src/app');
const MapboxAdapter = require('./src/adapters/MapboxAdapter');
const ProveedorRutasFalso = require('./src/adapters/ProveedorRutasFalso');

const PORT = process.env.PORT || 3000;

// Punto de composición: el proveedor de rutas se crea una sola vez acá y se
// inyecta en la app. Por eso no hace falta un Singleton.
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

const app = crearApp({ proveedorRutas: crearProveedorRutas() });

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});