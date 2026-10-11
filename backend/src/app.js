const express = require('express');
const cors = require('cors');

const crearViajesRouter = require('./routes/viajes.routes');
const ViajeService = require('./services/viaje.service');
const ViajeRepositoryMemoria = require('./repositories/viaje.repository.memoria');

function crearApp(dependencias = {}) {
  const app = express();
  const viajeRepository =
    dependencias.viajeRepository || new ViajeRepositoryMemoria();
  const viajeService =
    dependencias.viajeService ||
    new ViajeService({
      viajeRepository,
      proveedorRutas: dependencias.proveedorRutas,
      ahora: dependencias.ahora,
    });

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/viajes', crearViajesRouter({ viajeService }));

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const status = error.statusCode || 500;
    const respuesta = {
      error: error.code || 'ERROR_INTERNO',
      mensaje:
        status >= 500 ? 'Ocurrió un error interno en el servidor' : error.message,
    };

    if (error.detalles?.length) {
      respuesta.detalles = error.detalles;
    }

    return res.status(status).json(respuesta);
  });

  return app;
}

module.exports = crearApp;
