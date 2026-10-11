const PartesIguales = require('./PartesIguales');
const PorKilometro = require('./PorKilometro');

const estrategias = {
  iguales: new PartesIguales(),
  km: new PorKilometro(),
};

module.exports = estrategias;
