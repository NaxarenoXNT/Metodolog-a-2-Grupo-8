const express = require('express');
const cors = require('cors');

const crearViajesRouter = require('./routes/viajes.routes');
const crearCostosRouter = require('./routes/costos.routes');
const crearPasajerosRouter = require('./routes/pasajeros.routes');
const crearAuthRouter = require('./routes/auth.routes');
const crearVehiculosRouter = require('./routes/vehiculos.routes');
const ViajeService = require('./services/viaje.service');
const CostoService = require('./services/costo.service');
const PasajeroService = require('./services/pasajero.service');
const AuthService = require('./services/auth.service');
const VehiculoService = require('./services/vehiculo.service');
const PublicadorEventos = require('./domain/eventos/PublicadorEventos');
const { EVENTOS_PASAJEROS } = require('./domain/eventos/PublicadorEventos');
const ActualizarAsientos = require('./observadores/ActualizarAsientos');
const RecalcularDivision = require('./observadores/RecalcularDivision');
const AvisarConductor = require('./observadores/AvisarConductor');
const NotificadorConsola = require('./adapters/NotificadorConsola');
const ViajeRepositoryMemoria = require('./repositories/viaje.repository.memoria');
const UsuarioRepositoryMemoria = require('./repositories/usuario.repository.memoria');
const VehiculoRepositoryMemoria = require('./repositories/vehiculo.repository.memoria');
const crearRequiereAuth = require('./middleware/requiereAuth');

function crearApp(dependencias = {}) {
  const app = express();
  const viajeRepository =
    dependencias.viajeRepository || new ViajeRepositoryMemoria();
  const usuarioRepository =
    dependencias.usuarioRepository || new UsuarioRepositoryMemoria();
  const vehiculoRepository =
    dependencias.vehiculoRepository || new VehiculoRepositoryMemoria();
  const jwtSecret = dependencias.jwtSecret || process.env.JWT_SECRET;
  const requiereAuth =
    dependencias.requiereAuth || crearRequiereAuth({ jwtSecret });
  const authService =
    dependencias.authService ||
    new AuthService({ usuarioRepository, jwtSecret });
  const vehiculoService =
    dependencias.vehiculoService ||
    new VehiculoService({ vehiculoRepository });
  const viajeService =
    dependencias.viajeService ||
    new ViajeService({
      viajeRepository,
      proveedorRutas: dependencias.proveedorRutas,
      ahora: dependencias.ahora,
    });
  const costoService =
    dependencias.costoService || new CostoService({ viajeRepository });
  const pasajeroService =
    dependencias.pasajeroService ||
    new PasajeroService({
      viajeRepository,
      publicador: crearPublicadorPasajeros({
        viajeRepository,
        costoService,
        notificador: dependencias.notificador || new NotificadorConsola(),
      }),
    });

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(
    '/api/auth',
    crearAuthRouter({ authService, requiereAuth }),
  );
  app.use(
    '/api/vehiculos',
    crearVehiculosRouter({ vehiculoService, requiereAuth }),
  );
  app.use(
    '/api/viajes',
    crearViajesRouter({ viajeService, vehiculoService, requiereAuth }),
  );
  app.use('/api/viajes', crearCostosRouter({ costoService }));
  app.use(
    '/api/viajes',
    crearPasajerosRouter({ pasajeroService, requiereAuth }),
  );

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const status = error.statusCode || error.status || 500;
    const esJsonInvalido = error.type === 'entity.parse.failed';
    const codigoPorDefecto =
      status >= 500 ? 'ERROR_INTERNO' : 'SOLICITUD_INVALIDA';
    const respuesta = {
      error:
        status >= 500
          ? 'ERROR_INTERNO'
          : error.code ||
            (esJsonInvalido ? 'JSON_INVALIDO' : codigoPorDefecto),
      mensaje: esJsonInvalido
        ? 'El cuerpo debe ser un objeto JSON válido'
        : status >= 500
          ? 'Ocurrió un error interno en el servidor'
          : error.message,
    };

    if (status < 500 && error.detalles?.length) {
      respuesta.detalles = error.detalles;
    }

    return res.status(status).json(respuesta);
  });

  return app;
}

function crearPublicadorPasajeros({ viajeRepository, costoService, notificador }) {
  const publicador = new PublicadorEventos();
  const observadores = [
    new ActualizarAsientos({ viajeRepository }),
    new RecalcularDivision({ viajeRepository, costoService }),
    new AvisarConductor({ viajeRepository, notificador }),
  ];

  for (const evento of Object.values(EVENTOS_PASAJEROS)) {
    for (const observador of observadores) {
      publicador.suscribir(evento, observador);
    }
  }

  return publicador;
}

module.exports = crearApp;
