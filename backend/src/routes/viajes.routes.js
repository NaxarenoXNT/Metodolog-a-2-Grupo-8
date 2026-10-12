const express = require('express');
const convertirId = require('./convertirId');

function crearViajesRouter({ viajeService }) {
  if (!viajeService) {
    throw new Error('Se necesita viajeService para crear las rutas de viajes');
  }

  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(viajeService.listar());
  });

  router.get('/:id', (req, res, next) => {
    try {
      const id = convertirId(req.params.id);
      res.json(viajeService.obtenerPorId(id));
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
