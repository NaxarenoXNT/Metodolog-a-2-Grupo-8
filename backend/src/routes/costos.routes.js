const express = require('express');
const convertirId = require('./convertirId');

function crearCostosRouter({ costoService }) {
  if (!costoService) {
    throw new Error('Se necesita costoService para crear las rutas de costos');
  }

  const router = express.Router();

  router.get('/:id/costo', (req, res, next) => {
    try {
      const id = convertirId(req.params.id);
      const costoTotal = costoService.calcularCostoTotal(id);
      res.json({ viajeId: id, costoTotal });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/division', (req, res, next) => {
    try {
      const id = convertirId(req.params.id);
      const modo = req.query.modo ?? 'iguales';
      const division = costoService.dividirGastos(id, modo);
      res.json({ viajeId: id, modo, division });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = crearCostosRouter;