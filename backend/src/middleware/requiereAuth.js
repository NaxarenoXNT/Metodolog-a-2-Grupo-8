const jwt = require('jsonwebtoken');

function crearErrorAutenticacion(mensaje, code) {
  const error = new Error(mensaje);
  error.statusCode = 401;
  error.code = code;
  return error;
}

function crearRequiereAuth({ jwtSecret } = {}) {
  if (typeof jwtSecret !== 'string' || !jwtSecret.trim()) {
    throw new Error('requiereAuth necesita JWT_SECRET');
  }

  return function requiereAuth(req, res, next) {
    const authorization = req.get('Authorization');

    if (!authorization) {
      return next(
        crearErrorAutenticacion(
          'Falta el header Authorization',
          'NO_AUTENTICADO',
        ),
      );
    }

    const coincidencia = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    if (!coincidencia) {
      return next(
        crearErrorAutenticacion(
          'El token de autenticación no es válido',
          'TOKEN_INVALIDO',
        ),
      );
    }

    try {
      const payload = jwt.verify(coincidencia[1], jwtSecret);

      if (
        !payload ||
        typeof payload !== 'object' ||
        payload.id === undefined ||
        typeof payload.nombre !== 'string' ||
        typeof payload.email !== 'string'
      ) {
        throw new Error('Payload inválido');
      }

      req.usuario = {
        id: payload.id,
        nombre: payload.nombre,
        email: payload.email,
      };
      return next();
    } catch {
      return next(
        crearErrorAutenticacion(
          'El token de autenticación venció o no es válido',
          'TOKEN_INVALIDO',
        ),
      );
    }
  };
}

module.exports = crearRequiereAuth;
