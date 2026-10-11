const estrategias = require('../domain/division');
const { precioPorKm } = require('../config/precios');

class CostoService {
  constructor(viajeRepo) {
    this.viajeRepo = viajeRepo;
  }

  async calcularCostoTotal(viajeId) {
    const viaje = await this.viajeRepo.obtenerViajePorId(viajeId);
    if (!viaje) {
      throw new Error('Viaje no encontrado');
    }

    const distanciaKm = Number(viaje.distanciaTotalKm) || 0;
    const costoTotal = distanciaKm * precioPorKm;

    return Number(costoTotal.toFixed(2));
  }

  async dividirGastos(viajeId, modo = 'iguales') {
    const costoTotal = await this.calcularCostoTotal(viajeId);
    const viaje = await this.viajeRepo.obtenerViajePorId(viajeId);
    if (!viaje) {
      throw new Error('Viaje no encontrado');
    }

    const estrategia = estrategias[modo];
    if (!estrategia) {
      throw new Error(`Modo de división no soportado: ${modo}`);
    }

    const resultado = estrategia.dividir(costoTotal, viaje.pasajeros || []);
    return resultado;
  }
}

module.exports = CostoService;
