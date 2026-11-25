// Estados de un viaje. Un viaje nace 'pendiente' y solo se puede modificar
// (sumar o bajar pasajeros, cancelar) mientras siga en ese estado.
const ESTADOS_VIAJE = Object.freeze({
  PENDIENTE: 'pendiente',
  CANCELADO: 'cancelado',
});

module.exports = { ESTADOS_VIAJE };
