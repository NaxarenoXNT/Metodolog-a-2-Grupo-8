const express = require('express');
const convertirId = require('./convertirId');

function crearPasajerosRouter({ pasajeroService }) {
  if (!pasajeroService) {
    throw new Error('Se necesita pasajeroService para crear las rutas de pasajeros');
  }

  const router = express.Router();

  router.post('/:id/pasajeros', async (req, res, next) => {
    try {
      const id = convertirId(req.params.id);
      const viaje = await pasajeroService.sumar(id, req.body ?? {});
      res.status(201).json(viaje);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id/pasajeros/:usuarioId', async (req, res, next) => {
    try {
      const id = convertirId(req.params.id);
      const viaje = await pasajeroService.bajar(id, req.params.usuarioId);
      res.json(viaje);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = crearPasajerosRouter;