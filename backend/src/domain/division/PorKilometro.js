const repartir = require('./repartir');

class PorKilometro {
  dividir(costoTotal, pasajeros) {
    if (costoTotal <= 0) return [];
    if (!Array.isArray(pasajeros) || pasajeros.length === 0) return [];

    const kms = pasajeros.map((pasajero) => {
      const km = Number(pasajero.kmRecorridos);
      return Number.isFinite(km) && km > 0 ? km : 0;
    });
    const totalKm = kms.reduce((suma, km) => suma + km, 0);

    // Si nadie tiene km cargados, se reparte en partes iguales.
    const pesos = totalKm > 0 ? kms : kms.map(() => 1);
    const montos = repartir(costoTotal, pesos);

    return pasajeros.map((pasajero, indice) => ({
      usuarioId: pasajero.usuarioId,
      monto: montos[indice],
    }));
  }
}

module.exports = PorKilometro;