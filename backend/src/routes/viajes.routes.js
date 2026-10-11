const express = require('express');

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

function convertirId(valor) {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('El id del viaje debe ser un entero positivo');
    error.statusCode = 400;
    error.code = 'ID_INVALIDO';
    throw error;
  }

  return id;
}

module.exports = crearViajesRouter;
