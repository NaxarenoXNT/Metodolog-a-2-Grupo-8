const express = require('express');

function crearRutasCostos(costoService) {
  const router = express.Router();

  router.get('/api/viajes/:id/costo', async (req, res, next) => {
    try {
      const { id } = req.params;
      const costoTotal = await costoService.calcularCostoTotal(id);
      res.json({ viajeId: id, costoTotal });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/viajes/:id/division', async (req, res, next) => {
    try {
      const { id } = req.params;
      const modo = req.query.modo || 'iguales';
      const division = await costoService.dividirGastos(id, modo);
      res.json({ viajeId: id, modo, division });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = crearRutasCostos;
