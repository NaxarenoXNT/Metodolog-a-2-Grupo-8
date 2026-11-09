const express = require('express');
const convertirId = require('./convertirId');

function crearViajesRouter({ viajeService }) {
  if (!viajeService) {
    throw new Error('Se necesita viajeService para crear las rutas de viajes');
  }

  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      res.json(await viajeService.listar());
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

  router.post('/', async (req, res, next) => {
    try {
      const viaje = await viajeService.publicar(req.body);
      res.status(201).json(viaje);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = crearViajesRouter;
