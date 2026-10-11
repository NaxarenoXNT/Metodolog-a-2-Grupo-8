class PorKilometro {
  dividir(costoTotal, pasajeros) {
    if (costoTotal <= 0) return [];
    if (!Array.isArray(pasajeros) || pasajeros.length === 0) return [];

    const totalKm = pasajeros.reduce(
      (sum, pasajero) => sum + (Number(pasajero.kmRecorridos) || 0),
      0
    );

    if (totalKm <= 0) {
      const cantidadPasajeros = pasajeros.length;
      const montoPorPasajero = costoTotal / cantidadPasajeros;

      return pasajeros.map((pasajero) => ({
        usuarioId: pasajero.usuarioId,
        monto: Number(montoPorPasajero.toFixed(2)),
      }));
    }

    return pasajeros.map((pasajero) => {
      const km = Number(pasajero.kmRecorridos) || 0;
      const monto = (costoTotal * km) / totalKm;
      return {
        usuarioId: pasajero.usuarioId,
        monto: Number(monto.toFixed(2)),
      };
    });
  }
}

module.exports = PorKilometro;
