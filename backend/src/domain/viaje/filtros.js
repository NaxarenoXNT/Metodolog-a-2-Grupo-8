const { ESTADOS_VIAJE } = require('./estados');

// Hora argentina (UTC-03:00). Se usa cuando un filtro llega solo con el día.
const OFFSET_ARGENTINA_MINUTOS = -3 * 60;

const SOLO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_CON_ZONA =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:\d{2})$/;

const MENSAJE_FECHA =
  'debe ser una fecha YYYY-MM-DD o ISO 8601 con zona horaria';

class FiltroInvalidoError extends Error {
  constructor(detalles) {
    super('Los filtros de búsqueda no son válidos');
    this.name = 'FiltroInvalidoError';
    this.statusCode = 400;
    this.code = 'FILTRO_INVALIDO';
    this.detalles = detalles;
  }
}

// Valida y normaliza los query params de GET /api/viajes. Devuelve solo los
// filtros presentes, con desde/hasta como ISO UTC completo (toISOString), que
// es el formato que recibe ViajeRepository.listar(filtros).
function parsearFiltrosViajes(query = {}) {
  const errores = [];
  const filtros = {};

  const estado = leerValorUnico(query, 'estado', errores);
  const estadosValidos = Object.values(ESTADOS_VIAJE);

  if (estado !== undefined) {
    if (estadosValidos.includes(estado)) {
      filtros.estado = estado;
    } else {
      errores.push(`estado debe ser uno de: ${estadosValidos.join(', ')}`);
    }
  }

  const desde = convertirFecha(query, 'desde', 'inicio', errores);
  const hasta = convertirFecha(query, 'hasta', 'fin', errores);

  if (desde !== undefined && hasta !== undefined && desde > hasta) {
    errores.push('desde no puede ser posterior a hasta');
  }

  if (desde !== undefined) {
    filtros.desde = new Date(desde).toISOString();
  }

  if (hasta !== undefined) {
    filtros.hasta = new Date(hasta).toISOString();
  }

  if (errores.length > 0) {
    throw new FiltroInvalidoError(errores);
  }

  return filtros;
}

// Devuelve el texto del parámetro, o undefined si falta o está repetido (en
// ese caso ya registró el error).
function leerValorUnico(query, nombre, errores) {
  const valor = query[nombre];

  if (valor === undefined) {
    return undefined;
  }

  if (typeof valor !== 'string') {
    errores.push(`${nombre} debe tener un único valor`);
    return undefined;
  }

  return valor;
}

function convertirFecha(query, nombre, extremo, errores) {
  const texto = leerValorUnico(query, nombre, errores);

  if (texto === undefined) {
    return undefined;
  }

  const milisegundos = fechaAMilisegundos(texto, extremo);

  if (milisegundos === null) {
    errores.push(`${nombre} ${MENSAJE_FECHA}`);
    return undefined;
  }

  return milisegundos;
}

// YYYY-MM-DD: hora argentina, desde = 00:00:00.000 y hasta = 23:59:59.999 de
// ese día. ISO con hora: se usa tal cual, con su zona. Sin zona se rechaza
// porque dependería de la zona horaria del servidor.
function fechaAMilisegundos(texto, extremo) {
  const soloDia = SOLO_DIA.exec(texto);

  if (soloDia) {
    const [anio, mes, dia] = soloDia.slice(1).map(Number);
    const hora = extremo === 'fin' ? [23, 59, 59, 999] : [0, 0, 0, 0];

    return construirMilisegundos([anio, mes, dia], hora, OFFSET_ARGENTINA_MINUTOS);
  }

  const completa = ISO_CON_ZONA.exec(texto);

  if (!completa) {
    return null;
  }

  const [anio, mes, dia, horas, minutos] = completa.slice(1, 6).map(Number);
  const segundos = Number(completa[6] ?? 0);
  const milisegundos = Number((completa[7] ?? '').slice(0, 3).padEnd(3, '0'));
  const offset = convertirOffset(completa[8]);

  if (offset === null || horas > 23 || minutos > 59 || segundos > 59) {
    return null;
  }

  return construirMilisegundos(
    [anio, mes, dia],
    [horas, minutos, segundos, milisegundos],
    offset,
  );
}

function convertirOffset(zona) {
  if (zona === 'Z') {
    return 0;
  }

  const signo = zona[0] === '-' ? -1 : 1;
  const [horas, minutos] = zona.slice(1).split(':').map(Number);

  if (horas > 23 || minutos > 59) {
    return null;
  }

  return signo * (horas * 60 + minutos);
}

// Arma el instante UTC a partir de una fecha y hora locales con su offset en
// minutos. Devuelve null si el día no existe (por ejemplo 2026-02-30).
function construirMilisegundos([anio, mes, dia], [h, min, s, ms], offsetMinutos) {
  const fecha = new Date(0);
  fecha.setUTCFullYear(anio, mes - 1, dia);

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }

  fecha.setUTCHours(h, min, s, ms);

  return fecha.getTime() - offsetMinutos * 60_000;
}

module.exports = { parsearFiltrosViajes, FiltroInvalidoError };
