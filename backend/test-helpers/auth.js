const jwt = require('jsonwebtoken');

// Valor corto y deliberadamente inseguro: solo se usa dentro de los tests.
const JWT_SECRET_PRUEBAS = 'test';

function crearUsuario(id, cambios = {}) {
  return {
    id,
    nombre: `Usuario ${id}`,
    email: `usuario${id}@example.com`,
    ...cambios,
  };
}

function crearToken(usuario, opciones = {}) {
  return jwt.sign(
    {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
    },
    JWT_SECRET_PRUEBAS,
    { expiresIn: '24h', ...opciones },
  );
}

function bearer(usuario, opciones) {
  return `Bearer ${crearToken(usuario, opciones)}`;
}

module.exports = {
  JWT_SECRET_PRUEBAS,
  crearUsuario,
  crearToken,
  bearer,
};
