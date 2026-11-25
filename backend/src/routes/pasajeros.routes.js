const express = require('express');
const convertirId = require('./convertirId');

function crearPasajerosRouter({ pasajeroService, requiereAuth }) {
  if (!pasajeroService) {
    throw new Error('Se necesita pasajeroService para crear las rutas de pasajeros');
  }
  if (!requiereAuth) {
    throw new Error('Se necesita requiereAuth para crear las rutas de pasajeros');
  }

  const router = express.Router();

  router.post('/:id/pasajeros', requiereAuth, async (req, res, next) => {
    try {
      const id = convertirId(req.params.id);
      const cuerpo =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
          ? req.body
          : {};
      const viaje = await pasajeroService.sumar(id, {
        ...cuerpo,
        usuarioId: String(req.usuario.id),
        nombre: req.usuario.nombre,
      });
      res.status(201).json(viaje);
    } catch (error) {
      next(error);
    }
  });

  router.delete(
    '/:id/pasajeros/:usuarioId',
    requiereAuth,
    async (req, res, next) => {
      try {
        const id = convertirId(req.params.id);
        const viajeActual = await pasajeroService.obtenerViaje(id);
        const esPasajero =
          String(req.params.usuarioId) === String(req.usuario.id);
        const esConductor =
          String(viajeActual.conductorId) === String(req.usuario.id);

        if (!esPasajero && !esConductor) {
          const error = new Error(
            'Solo el propio pasajero o el conductor pueden darlo de baja',
          );
          error.statusCode = 403;
          error.code = 'PROHIBIDO';
          throw error;
        }

        const viaje = await pasajeroService.bajar(id, req.params.usuarioId);
        res.json(viaje);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

module.exports = crearPasajerosRouter;
