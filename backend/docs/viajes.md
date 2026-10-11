# Feature Viajes

Esta feature permite publicar y consultar viajes. Su alcance incluye los endpoints,
las reglas de construcción del viaje y la persistencia temporal en memoria.

## Endpoints

- `POST /api/viajes`: valida y publica un viaje.
- `GET /api/viajes`: lista todos los viajes.
- `GET /api/viajes/:id`: devuelve un viaje o responde `404` si no existe.

Ejemplo de creación:

```json
{
  "vehiculo": {
    "id": 10,
    "modelo": "Auto de prueba",
    "capacidadAsientos": 4
  },
  "fecha": "2099-12-01T12:00:00.000Z",
  "asientosDisponibles": 3,
  "origen": {
    "nombre": "Bahía Blanca",
    "lat": -38.7183,
    "lng": -62.2663
  },
  "destino": {
    "nombre": "CABA",
    "lat": -34.6037,
    "lng": -58.3816
  },
  "paradas": [
    { "orden": 1, "nombre": "Tres Arroyos" },
    { "orden": 2, "nombre": "Azul" }
  ]
}
```

## Patrón elegido: Builder

### 1. Problema

Un viaje se arma con varios datos relacionados y solo debe guardarse si cumple
todas las reglas: fecha futura, cantidad de asientos válida, capacidad suficiente,
coordenadas correctas y paradas ordenadas.

### 2. Alternativas consideradas

- Validar directamente en la ruta de Express.
- Construir un objeto literal y validar después en el servicio.
- Centralizar la construcción y las validaciones en un Builder.

Validar en la ruta mezcla HTTP con reglas de negocio. Validar un objeto después de
crearlo permite que exista temporalmente un viaje inválido.

### 3. Decisión

Se usa `ViajeBuilder`. El servicio carga los datos mediante métodos explícitos y
`build()` ejecuta todas las validaciones antes de devolver el viaje. Si alguna
regla falla, devuelve un error de dominio con todos los detalles encontrados.

### 4. Costo de la decisión

El Builder agrega una clase y más código que un objeto literal. A cambio, las
reglas quedan en un único lugar, se pueden probar sin Express y no se guardan
objetos incompletos.

## Patrón descartado: Prototype

### 1. Problema evaluado

Se consideró clonar viajes o rutas frecuentes para publicar una nueva salida
cambiando únicamente la fecha.

### 2. Alternativas consideradas

- Clonar el viaje completo con Prototype.
- Reutilizar el Builder con datos precargados de una ruta frecuente.

### 3. Decisión

No se implementa Prototype. Todavía no existe un grafo de objetos complejo ni un
costo importante de creación. El mismo Builder puede recibir datos precargados y
construir un viaje nuevo con identidad propia.

### 4. Costo de la decisión

Al publicar desde una ruta frecuente será necesario volver a pasar sus datos por
el Builder. Esto evita problemas de copias superficiales y mantiene activas las
validaciones. Prototype se puede reevaluar si el modelo crece y la clonación se
vuelve realmente costosa.

## Puerta de integración con rutas

`ViajeService` recibe opcionalmente un objeto que cumpla este contrato:

```js
await proveedorRutas.calcularDistancia(origen, destino); // devuelve km
```

La feature no conoce Mapbox. En las pruebas se inyecta un objeto mínimo que
devuelve `690`, y posteriormente el Adapter real puede conectarse en `app.js` sin
cambiar las reglas del viaje.
