const express = require('express');

function crearVehiculosRouter({ vehiculoService, requiereAuth }) {
  if (!vehiculoService) {
    throw new Error('Se necesita vehiculoService para crear las rutas de vehículos');
  }
  if (!requiereAuth) {
    throw new Error('Se necesita requiereAuth para crear las rutas de vehículos');
  }

  const router = express.Router();

  router.use(requiereAuth);

  router.post('/', async (req, res, next) => {
    try {
      const vehiculo = await vehiculoService.crear(req.usuario.id, req.body);
      res.status(201).json(vehiculo);
    } catch (error) {
      next(error);
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      res.json(await vehiculoService.listarPorUsuario(req.usuario.id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = crearVehiculosRouter;
