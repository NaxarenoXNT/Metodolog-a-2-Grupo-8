const express = require('express');
const convertirId = require('./convertirId');
const { parsearFiltrosViajes } = require('../domain/viaje/filtros');

function crearViajesRouter({ viajeService, vehiculoService, requiereAuth }) {
  if (!viajeService) {
    throw new Error('Se necesita viajeService para crear las rutas de viajes');
  }
  if (!vehiculoService) {
    throw new Error('Se necesita vehiculoService para crear las rutas de viajes');
  }
  if (!requiereAuth) {
    throw new Error('Se necesita requiereAuth para crear las rutas de viajes');
  }

  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const filtros = parsearFiltrosViajes(req.query);
      res.json(await viajeService.listar(filtros));
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = convertirId(req.params.id);
      res.json(await viajeService.obtenerPorId(id));
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requiereAuth, async (req, res, next) => {
    try {
      const cuerpo =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
          ? req.body
          : {};
      const vehiculo = await vehiculoService.obtenerPropio(
        cuerpo.vehiculoId,
        req.usuario.id,
      );
      const viaje = await viajeService.publicar({
        ...cuerpo,
        conductorId: req.usuario.id,
        vehiculoId: vehiculo.id,
        vehiculo,
      });
      res.status(201).json(viaje);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/cancelar', requiereAuth, async (req, res, next) => {
    try {
      const id = convertirId(req.params.id);
      const viaje = await viajeService.obtenerPorId(id);
      verificarConductor(viaje, req.usuario.id);
      res.json(await viajeService.cancelar(id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function verificarConductor(viaje, usuarioId) {
  if (String(viaje.conductorId) !== String(usuarioId)) {
    const error = new Error('Solo el conductor puede cancelar el viaje');
    error.statusCode = 403;
    error.code = 'PROHIBIDO';
    throw error;
  }
}

module.exports = crearViajesRouter;
