const express = require('express');

function crearAuthRouter({ authService, requiereAuth }) {
  if (!authService) {
    throw new Error('Se necesita authService para crear las rutas de autenticación');
  }
  if (!requiereAuth) {
    throw new Error('Se necesita requiereAuth para crear las rutas de autenticación');
  }

  const router = express.Router();

  router.post('/registro', async (req, res, next) => {
    try {
      res.status(201).json(await authService.registrar(req.body));
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      res.json(await authService.login(req.body));
    } catch (error) {
      next(error);
    }
  });

  router.get('/yo', requiereAuth, (req, res) => {
    res.json(req.usuario);
  });

  return router;
}

module.exports = crearAuthRouter;
