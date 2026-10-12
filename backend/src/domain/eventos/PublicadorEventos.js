// Sujeto del patrón Observer. Quien publica un evento no conoce a los
// observadores: cada reacción se suscribe por separado y se ejecuta en el
// orden en que se suscribió.
class PublicadorEventos {
  constructor() {
    this.observadores = new Map();
  }

  suscribir(evento, observador) {
    if (!observador || typeof observador.notificar !== 'function') {
      throw new TypeError('El observador debe tener un método notificar(datos)');
    }

    if (!this.observadores.has(evento)) {
      this.observadores.set(evento, []);
    }

    this.observadores.get(evento).push(observador);

    return () => this.desuscribir(evento, observador);
  }

  desuscribir(evento, observador) {
    const lista = this.observadores.get(evento) ?? [];
    this.observadores.set(
      evento,
      lista.filter((actual) => actual !== observador),
    );
  }

  emitir(evento, datos) {
    for (const observador of this.observadores.get(evento) ?? []) {
      observador.notificar({ evento, ...datos });
    }
  }
}

const EVENTOS_PASAJEROS = Object.freeze({
  SUMADO: 'pasajero:sumado',
  BAJADO: 'pasajero:bajado',
});

module.exports = PublicadorEventos;
module.exports.EVENTOS_PASAJEROS = EVENTOS_PASAJEROS;