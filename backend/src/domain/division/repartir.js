// Reparte un monto proporcionalmente a los pesos trabajando en centavos, de
// modo que la suma de las partes sea exactamente el total. Los centavos que
// sobran por redondeo van a las partes con mayor resto (método del mayor resto).
function repartir(total, pesos) {
  const totalCentavos = Math.round(total * 100);
  const sumaPesos = pesos.reduce((suma, peso) => suma + peso, 0);

  const partes = pesos.map((peso, indice) => {
    const exacto = (totalCentavos * peso) / sumaPesos;
    const centavos = Math.floor(exacto);
    return { indice, centavos, resto: exacto - centavos };
  });

  const asignados = partes.reduce((suma, parte) => suma + parte.centavos, 0);
  const sobrantes = totalCentavos - asignados;

  [...partes]
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice)
    .slice(0, sobrantes)
    .forEach((parte) => {
      parte.centavos += 1;
    });

  return partes.map((parte) => parte.centavos / 100);
}

module.exports = repartir;