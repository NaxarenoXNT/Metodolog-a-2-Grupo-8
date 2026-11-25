export const TIPOS_VEHICULO = [
  { valor: 'auto', etiqueta: 'Auto' },
  { valor: 'camioneta', etiqueta: 'Camioneta' },
  { valor: 'utilitario', etiqueta: 'Utilitario' },
  { valor: 'moto', etiqueta: 'Moto' },
]

export const COMBUSTIBLES = [
  { valor: 'nafta', etiqueta: 'Nafta' },
  { valor: 'gasoil', etiqueta: 'Gasoil' },
  { valor: 'gnc', etiqueta: 'GNC' },
  { valor: 'electrico', etiqueta: 'Eléctrico' },
]

export const LIMITE_TIPO = 20
export const LIMITE_MARCA = 50
export const LIMITE_MODELO = 50
export const LIMITE_COMBUSTIBLE = 20

function texto(valor) {
  return String(valor ?? '').trim()
}

function aNumero(valor) {
  const limpio = texto(valor)
  return limpio === '' ? Number.NaN : Number(limpio)
}

export function validarVehiculo(form) {
  const errores = {}

  const tipo = texto(form.tipo)
  if (!tipo) {
    errores.tipo = 'Elegí el tipo de vehículo.'
  } else if (
    tipo.length > LIMITE_TIPO ||
    !TIPOS_VEHICULO.some((opcion) => opcion.valor === tipo)
  ) {
    errores.tipo = 'Elegí un tipo de vehículo válido.'
  }

  if (texto(form.marca).length > LIMITE_MARCA) {
    errores.marca = `La marca no puede superar los ${LIMITE_MARCA} caracteres.`
  }

  if (texto(form.modelo).length > LIMITE_MODELO) {
    errores.modelo = `El modelo no puede superar los ${LIMITE_MODELO} caracteres.`
  }

  const capacidad = aNumero(form.capacidadAsientos)
  if (!Number.isInteger(capacidad) || capacidad <= 0) {
    errores.capacidadAsientos = 'Ingresá un número entero mayor a 0.'
  }

  if (texto(form.consumoL100km) !== '') {
    const consumo = aNumero(form.consumoL100km)
    // La base guarda el consumo con 2 decimales y hasta 3 dígitos enteros.
    const redondeado = Math.round(consumo * 100) / 100

    if (!Number.isFinite(consumo) || redondeado <= 0 || redondeado >= 1000) {
      errores.consumoL100km =
        'Ingresá un consumo mayor a 0 y menor a 1000 L/100 km.'
    }
  }

  if (texto(form.tipoCombustible).length > LIMITE_COMBUSTIBLE) {
    errores.tipoCombustible = `El combustible no puede superar los ${LIMITE_COMBUSTIBLE} caracteres.`
  }

  return errores
}
