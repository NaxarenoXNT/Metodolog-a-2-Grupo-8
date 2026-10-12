# Feature Distancia y plata

Calcula cuánto cuesta un viaje según su distancia y cómo se divide ese costo
entre los pasajeros.

## Endpoints

- `GET /api/viajes/:id/costo`: devuelve `{ viajeId, costoTotal }`.
- `GET /api/viajes/:id/division?modo=iguales|km`: devuelve
  `{ viajeId, modo, division: [{ usuarioId, monto }] }`. Si no se indica
  `modo`, se usa `iguales`.

Errores: `400 ID_INVALIDO`, `400 MODO_DIVISION_INVALIDO`,
`404 VIAJE_NO_ENCONTRADO` y `422 DISTANCIA_NO_DISPONIBLE` (el viaje no tiene
`distanciaKm`).

El costo es `distanciaKm * precioPorKm`, con el precio en `src/config/precios.js`.
La división trabaja en centavos para que la suma de las partes sea exactamente
el costo total.

## Patrón elegido: Adapter

### 1. Problema

La distancia la calcula la API Directions de Mapbox, que pide coordenadas en
orden `lng,lat`, un token en la URL y responde en metros dentro de
`routes[0].distance`. Si `ViajeService` conociera esos detalles, quedaría atado
a Mapbox y no se podría probar sin internet.

### 2. Alternativas consideradas

- Llamar a Mapbox directamente desde `ViajeService`.
- Definir el contrato `calcularDistancia(origen, destino)` y adaptar Mapbox a él.

### 3. Decisión

`MapboxAdapter` implementa `calcularDistancia({ lat, lng }, { lat, lng })` y
devuelve kilómetros. `ViajeService` solo conoce ese contrato. En desarrollo y en
los tests se usa `ProveedorRutasFalso` u otro objeto con el mismo método.

### 4. Costo de la decisión

Hay una clase más y un contrato que mantener. A cambio, cambiar de proveedor
(Google, OSRM) implica escribir otro adapter sin tocar el dominio.

## Patrón elegido: Strategy

### 1. Problema

El costo se puede dividir de distintas formas: en partes iguales o según los km
que recorre cada pasajero. Un `if/else` por modo en el servicio crecería con cada
forma nueva.

### 2. Alternativas consideradas

- Un `switch (modo)` dentro de `CostoService`.
- Una estrategia por modo con la misma interfaz `dividir(costoTotal, pasajeros)`.

### 3. Decisión

`PartesIguales` y `PorKilometro` implementan `dividir`. `src/domain/division/index.js`
las registra por nombre y `CostoService` elige una según `?modo=`. Sumar un modo
nuevo es agregar una clase y una entrada en el índice. El integrante 3 reutiliza
estas estrategias para recalcular cuánto paga cada uno cuando cambia la lista de
pasajeros.

### 4. Costo de la decisión

Para dos modos hay más archivos que con un `switch`. Se acepta porque las reglas
de cada modo se prueban por separado y el servicio no cambia al agregar modos.

## Patrón descartado: Singleton

### 1. Problema evaluado

`MapboxAdapter` debería existir una sola vez, con un único token, para toda la app.

### 2. Alternativas consideradas

- Un Singleton con `MapboxAdapter.getInstance()`.
- Crear la instancia una vez en `index.js` e inyectarla en `crearApp`.

### 3. Decisión

No se usa Singleton. `index.js` crea el proveedor una sola vez y lo inyecta. Un
Singleton sería un estado global que obliga a resetearlo entre tests y esconde
la dependencia; con inyección, cada test pasa su propio proveedor falso.

### 4. Costo de la decisión

Hay que pasar el proveedor por parámetro desde el punto de composición. Nada
impide crear una segunda instancia por error, pero en la práctica solo
`index.js` la crea.

## Patrón descartado: Abstract Factory

### 1. Problema evaluado

Se consideró una fábrica de calculadoras de costo por tipo de vehículo o región.

### 2. Alternativas consideradas

- Una Abstract Factory que cree familias de objetos de cálculo.
- Una fórmula única con una tabla de precios en configuración.

### 3. Decisión

No se implementa. El costo es `distanciaKm * precioPorKm` y no hay familias de
objetos relacionados que crear juntos. Un precio distinto es un dato nuevo en
`precios.js`, no una jerarquía de clases.

### 4. Costo de la decisión

Si aparecen reglas de costo realmente distintas (peajes, tarifas por vehículo con
lógica propia), habrá que refactorizar. Se reevalúa en ese momento.

## Pendiente con el integrante 3

`PorKilometro` lee `pasajero.kmRecorridos` y ambas estrategias leen
`pasajero.usuarioId`. La feature de pasajeros tiene que guardar esos campos en
`viaje.pasajeros`.