class PartesIguales {
  dividir(costoTotal, pasajeros) {
    if (costoTotal <= 0) return [];
    if (!Array.isArray(pasajeros) || pasajeros.length === 0) return [];

    const cantidadPasajeros = pasajeros.length;
    const montoPorPasajero = costoTotal / cantidadPasajeros;

    return pasajeros.map((pasajero) => ({
      usuarioId: pasajero.usuarioId,
      monto: Number(montoPorPasajero.toFixed(2)),
    }));
  }
}

module.exports = PartesIguales;
