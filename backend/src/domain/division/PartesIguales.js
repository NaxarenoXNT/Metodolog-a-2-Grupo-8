const repartir = require('./repartir');

class PartesIguales {
  dividir(costoTotal, pasajeros) {
    if (costoTotal <= 0) return [];
    if (!Array.isArray(pasajeros) || pasajeros.length === 0) return [];

    const montos = repartir(costoTotal, pasajeros.map(() => 1));

    return pasajeros.map((pasajero, indice) => ({
      usuarioId: pasajero.usuarioId,
      monto: montos[indice],
    }));
  }
}

module.exports = PartesIguales;