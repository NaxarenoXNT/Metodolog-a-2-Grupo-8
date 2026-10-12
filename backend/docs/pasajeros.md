# Feature Pasajeros

Permite que un usuario se sume a un viaje o se baje de él. Cada cambio en la
lista de pasajeros dispara tres reacciones independientes: actualizar los
asientos, recalcular cuánto paga cada uno y avisarle al conductor.

## Endpoints

- `POST /api/viajes/:id/pasajeros`: suma un pasajero. Responde `201` con el
  viaje actualizado.
- `DELETE /api/viajes/:id/pasajeros/:usuarioId`: baja al pasajero. Responde
  `200` con el viaje actualizado.

Ejemplo de cuerpo para sumarse:

```json
{
  "usuarioId": "u1",
  "nombre": "Ana",
  "kmRecorridos": 350
}
```

`nombre` y `kmRecorridos` son opcionales. Si no se indica `kmRecorridos`, se
asume que el pasajero hace el recorrido completo (`distanciaKm` del viaje).

Respuesta (resumida):

```json
{
  "id": 1,
  "asientosDisponibles": 1,
  "pasajeros": [{ "usuarioId": "u1", "nombre": "Ana", "kmRecorridos": 350 }],
  "division": {
    "modo": "iguales",
    "montos": [{ "usuarioId": "u1", "monto": 103500 }]
  }
}
```

Errores:

| Código | Status | Cuándo |
|---|---|---|
| `ID_INVALIDO` | 400 | El id del viaje no es un entero positivo |
| `PASAJERO_INVALIDO` | 400 | Falta `usuarioId` o `kmRecorridos` es inválido o supera la distancia |
| `VIAJE_NO_ENCONTRADO` | 404 | El viaje no existe |
| `PASAJERO_NO_ENCONTRADO` | 404 | Se intenta bajar a alguien que no está en el viaje |
| `PASAJERO_YA_SUMADO` | 409 | El usuario ya está en el viaje |
| `SIN_ASIENTOS` | 409 | No quedan asientos disponibles |

## Patrón elegido: Observer

### 1. Problema

Cuando alguien se suma o se baja pasan varias cosas: cambian los asientos
disponibles, cambia cuánto paga cada pasajero y hay que avisarle al conductor.
Si `PasajeroService` hiciera todo eso directamente, conocería a la división de
gastos, al canal de notificación y a las reglas de asientos, y cada reacción
nueva (por ejemplo, avisar a los demás pasajeros) obligaría a modificarlo.

### 2. Alternativas consideradas

- Llamar a cada acción en secuencia dentro de `PasajeroService.sumar()` y
  `bajar()`.
- Que el servicio emita un evento (`pasajero:sumado` / `pasajero:bajado`) y que
  cada reacción se suscriba por separado.

### 3. Decisión

`PublicadorEventos` (`src/domain/eventos/`) es el sujeto: tiene `suscribir`,
`desuscribir` y `emitir`. `PasajeroService` solo actualiza la lista de
pasajeros y emite el evento. Los observadores viven en `src/observadores/`:

- `ActualizarAsientos`: resta un asiento al sumarse y lo devuelve al bajarse.
- `RecalcularDivision`: llama a `CostoService.dividirGastos()`, que usa la
  Strategy del integrante 2, y guarda el resultado en `viaje.division`. Si el
  viaje no tiene distancia, deja `division` en `null` sin cortar la operación.
- `AvisarConductor`: arma el mensaje y lo manda por el notificador inyectado.

Las suscripciones se arman en `crearApp`, en este orden: asientos, división y
aviso. Así el conductor recibe los datos ya actualizados. Agregar una reacción
nueva es escribir un observador y suscribirlo, sin tocar el servicio.

### 4. Costo de la decisión

El flujo queda repartido en varios archivos y el orden de las reacciones
depende del orden de suscripción, que hay que respetar en `crearApp`. Los
observadores se ejecutan en forma sincrónica y en el mismo proceso: si una base
de datos real hiciera falta, habría que pensar en transacciones o eventos
asíncronos. Un fallo al avisar al conductor se registra en consola y no deshace
la operación del pasajero.

## Patrón descartado: Factory Method para notificaciones

### 1. Problema evaluado

Se consideró una fábrica que creara el notificador adecuado según el canal
(email, push, SMS).

### 2. Alternativas consideradas

- Un Factory Method que decida qué notificador instanciar.
- Un único notificador inyectado en `AvisarConductor`.

### 3. Decisión

No se implementa. Hoy hay un solo canal, `NotificadorConsola`, así que no hay
variantes entre las que elegir y la fábrica tendría una sola rama. El
notificador se crea en `crearApp` y se inyecta; los tests pasan uno falso que
guarda los mensajes enviados.

### 4. Costo de la decisión

Si aparecen email, push y SMS, habrá que agregar la lógica de elección del canal
y se reevalúa Factory Method en ese momento. Como `AvisarConductor` solo depende
del contrato `enviar({ destinatario, mensaje })`, el cambio no toca el
observador.
