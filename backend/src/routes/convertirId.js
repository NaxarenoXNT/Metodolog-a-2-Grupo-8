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

module.exports = convertirId;