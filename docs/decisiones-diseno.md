# Decisiones de diseño - Taller II

## Objetivo y alcance

Este documento reúne las decisiones de diseño tomadas para viajes, costos,
pasajeros, persistencia, autenticación y vehículos. Su objetivo es dejar una única memoria localizable
para el Taller II: qué problema resuelve cada parte, qué código interviene, qué
alternativas consideramos, qué decidimos y cuáles son los beneficios y costos de
esas decisiones.

El documento se concentra en el backend porque allí están las reglas de negocio y
los patrones de diseño. El frontend continúa como una plantilla de Vite y no se
lo presenta como una funcionalidad terminada.

## Resumen de decisiones

| Área | Patrón o práctica aplicada | Alternativa descartada | Decisión |
|---|---|---|---|
| Publicación de viajes | Builder | Construcción directa y Prototype | Centralizar construcción y validaciones en `ViajeBuilder` |
| Distancias | Adapter | Consumir Mapbox desde el servicio y Singleton | Inyectar un proveedor de rutas y adaptar Mapbox |
| División de gastos | Strategy | `switch` dentro de `CostoService` | Mantener una estrategia por modo de división |
| Cambios de pasajeros | Observer | Ejecutar todas las reacciones dentro de `PasajeroService` | Publicar eventos y separar cada reacción |
| Notificaciones | Inyección de dependencias | Factory Method | Conservar un notificador inyectado mientras exista un solo canal |
| Costos por vehículo | Configuración simple | Abstract Factory | No crear familias de objetos mientras la fórmula sea única |
| Contratos de persistencia | Repository async | Mantener memoria sincrónica y condicionar los servicios | Usar el mismo contrato basado en `Promise` para memoria y PostgreSQL |
| Actualización de pasajeros | Transacción PostgreSQL | Ejecutar `DELETE` e inserciones independientes | Reemplazar la lista completa dentro de una transacción |
| Autenticación y permisos | JWT + bcrypt | Sesiones de servidor e identidad enviada en el body | Firmar identidad por 24 h y derivar usuario y conductor del token |

No se eligieron patrones por cantidad. Se implementaron solo donde resuelven una
variación o responsabilidad concreta; en los demás casos se documentó por qué
agregarlos ahora sería sobreingeniería.

## Código involucrado

- Composición y manejo HTTP: [`backend/src/app.js`](../backend/src/app.js),
  [`backend/src/routes/`](../backend/src/routes/) y
  [`backend/index.js`](../backend/index.js).
- Viajes: [`ViajeBuilder.js`](../backend/src/domain/viaje/ViajeBuilder.js),
  [`viaje.service.js`](../backend/src/services/viaje.service.js) y
  [`viaje.repository.memoria.js`](../backend/src/repositories/viaje.repository.memoria.js).
- Costos y distancias: [`MapboxAdapter.js`](../backend/src/adapters/MapboxAdapter.js),
  [`costo.service.js`](../backend/src/services/costo.service.js),
  [`division/`](../backend/src/domain/division/) y
  [`precios.js`](../backend/src/config/precios.js).
- Pasajeros y eventos: [`pasajero.service.js`](../backend/src/services/pasajero.service.js),
  [`PublicadorEventos.js`](../backend/src/domain/eventos/PublicadorEventos.js) y
  [`observadores/`](../backend/src/observadores/).
- Persistencia: [`backend/src/db/`](../backend/src/db/),
  [`backend/src/repositories/`](../backend/src/repositories/),
  [`backend/db/migraciones/`](../backend/db/migraciones/) y
  [`backend/scripts/migrar.js`](../backend/scripts/migrar.js).
- Autenticación y vehículos: [`auth.service.js`](../backend/src/services/auth.service.js),
  [`vehiculo.service.js`](../backend/src/services/vehiculo.service.js),
  [`requiereAuth.js`](../backend/src/middleware/requiereAuth.js),
  [`auth.routes.js`](../backend/src/routes/auth.routes.js) y
  [`vehiculos.routes.js`](../backend/src/routes/vehiculos.routes.js).
- Pruebas automatizadas: [`viajes.test.js`](../backend/test/viajes.test.js),
  [`costos.test.js`](../backend/test/costos.test.js) y
  [`pasajeros.test.js`](../backend/test/pasajeros.test.js),
  [`auth.test.js`](../backend/test/auth.test.js),
  [`vehiculos.test.js`](../backend/test/vehiculos.test.js) y
  [`repositorios.postgres.test.js`](../backend/test/repositorios.postgres.test.js).

## Criterios transversales de diseño y mantenibilidad

### Clean Code y code smells

Aspectos positivos:

- Las rutas traducen HTTP y delegan las reglas a servicios; no concentran lógica
  de negocio.
- Los nombres (`publicar`, `dividirGastos`, `calcularDistancia`, `sumar`,
  `bajar`) expresan intención y evitan comentarios que repitan el código.
- Las dependencias externas y reemplazables se reciben por constructor. Eso
  permite probar con repositorios, notificadores y proveedores falsos.
- Las reglas de redondeo viven en una función pequeña, `repartir`, compartida por
  ambas estrategias.

Smells y riesgos detectados:

- Había conversión permisiva de coordenadas: en JavaScript `Number(null)` y
  `Number('')` producen `0`, por lo que una entrada incompleta podía convertirse
  en una coordenada válida. Se corrigió con una conversión explícita que rechaza
  nulos, booleanos y cadenas vacías.
- `ViajeService.publicar(null)` intentaba leer propiedades de `null` y el
  middleware convertía errores de parsing con `status: 400` en respuestas 500.
  El servicio ahora normaliza defensivamente cuerpos no objeto y el middleware
  respeta el status de Express, devolviendo `JSON_INVALIDO` cuando corresponde.
- Las clases de error se repiten parcialmente entre servicios. Por ahora son
  pocas, claras y tienen diferencias de dominio; crear una jerarquía común no
  aporta suficiente valor todavía.
- Los observadores son asíncronos y se esperan en orden. Está explicitado en
  `crearApp`: primero asientos, después división y finalmente el aviso. Ese orden
  es parte del flujo y no equivale a una única transacción de aplicación.
- `crearApp` es el punto de composición y por eso conoce muchas clases. No se lo
  divide mientras esa sea su única responsabilidad y el tamaño siga siendo
  manejable.

### SOLID

- **SRP:** rutas, servicios, repositorio, estrategias, adapter y observadores
  tienen motivos de cambio distintos.
- **OCP:** una nueva forma de dividir gastos se agrega con otra estrategia; una
  nueva reacción a pasajeros se agrega con otro observador.
- **LSP:** cualquier proveedor que cumpla
  `calcularDistancia(origen, destino)` puede sustituir a Mapbox; las estrategias
  comparten el contrato `dividir(costoTotal, pasajeros)` y los repositorios en
  memoria y PostgreSQL son intercambiables.
- **ISP:** los contratos usados son pequeños. Un observador solo necesita
  `notificar` y un notificador solo necesita `enviar`.
- **DIP:** `ViajeService`, `CostoService`, `PasajeroService` y los observadores
  dependen de objetos inyectados, no crean directamente infraestructura.

No se afirma que el sistema “aplica SOLID completo”. Estas son evidencias
puntuales, y también se conservan límites deliberados del prototipo.

## Decisión 1: publicación de viajes

### Endpoints

- `POST /api/viajes`: valida y publica un viaje.
- `GET /api/viajes`: lista los viajes.
- `GET /api/viajes/:id`: devuelve un viaje o `404`.

### 1. Código involucrado

- [`ViajeBuilder.js`](../backend/src/domain/viaje/ViajeBuilder.js)
- [`viaje.service.js`](../backend/src/services/viaje.service.js)
- [`viajes.routes.js`](../backend/src/routes/viajes.routes.js)
- [`viajes.test.js`](../backend/test/viajes.test.js)

### 2. Problema

Un viaje reúne datos relacionados y solo debe persistirse si cumple todas las
reglas: fecha futura, asientos positivos que no superen la capacidad,
coordenadas dentro de rango y paradas en orden ascendente. Validar parcialmente
en la ruta permitiría que HTTP y dominio evolucionaran juntos y dificultaría las
pruebas.

Durante la implementación y revisión detectamos dos casos límite: cuerpo `null`
y coordenadas nulas o vacías. Ahora el primero responde `400 JSON_INVALIDO` y las
coordenadas incorrectas responden `400 VIAJE_INVALIDO`, en lugar de aceptar datos
incorrectos o responder `500`.

### 3. Alternativas consideradas

- Validar directamente en la ruta de Express.
- Crear un objeto literal y validarlo después en el servicio.
- Construir y validar de manera centralizada con un Builder.
- Clonar un viaje previo mediante Prototype para viajes recurrentes.

Validar en la ruta mezcla transporte y negocio. Validar después de construir
permite que exista temporalmente un viaje inválido. Prototype tampoco aporta
todavía: el grafo es pequeño y el Builder puede recibir los datos de una ruta
frecuente sin copiar identidad ni estado accidentalmente.

### 4. Decisión

Se mantiene `ViajeBuilder`. Sus métodos cargan los datos y `build()` ejecuta
todas las validaciones antes de devolver el objeto. `ViajeService` valida antes
de consultar el proveedor de rutas para no gastar una llamada externa con datos
inválidos.

No se implementa Prototype. Se reevaluará si aparecen plantillas complejas cuya
creación o copia tenga un costo real.

### 5. Evidencia y trade-offs

Las pruebas verifican creación válida, fecha pasada, capacidad, orden de
paradas, coordenadas inválidas, cuerpo `null`, ids inválidos y viajes
inexistentes. El costo es una clase adicional y una interfaz fluida algo más
larga que un literal; el beneficio es que las invariantes están juntas y se
prueban sin acoplarlas a Express.

## Decisión 2: distancia, costo y división

### Endpoints

- `GET /api/viajes/:id/costo`: devuelve `{ viajeId, costoTotal }`.
- `GET /api/viajes/:id/division?modo=iguales|km`: divide el costo; el modo por
  defecto es `iguales`.

El costo actual es `distanciaKm * precioPorKm`. La división trabaja en centavos
y distribuye el residuo para que la suma de las partes coincida con el total.

### 1. Código involucrado

- [`MapboxAdapter.js`](../backend/src/adapters/MapboxAdapter.js)
- [`ProveedorRutasFalso.js`](../backend/src/adapters/ProveedorRutasFalso.js)
- [`costo.service.js`](../backend/src/services/costo.service.js)
- [`division/`](../backend/src/domain/division/)
- [`costos.test.js`](../backend/test/costos.test.js)

### 2. Problema

Mapbox usa coordenadas `lng,lat`, token en la URL, metros en la respuesta y una
estructura propia. Esos detalles no pertenecen a `ViajeService`. Por otro lado,
la división admite algoritmos distintos y cada uno cambia por razones propias.
Un `switch` central crecería con cada modo y mezclaría selección con cálculo.

### 3. Alternativas consideradas

- Consumir Mapbox directamente desde `ViajeService`.
- Definir el contrato `calcularDistancia` y encapsular Mapbox en un Adapter.
- Forzar una instancia global con Singleton.
- Resolver los modos con `if`/`switch` dentro de `CostoService`.
- Encapsular cada algoritmo detrás de `dividir` mediante Strategy.
- Crear familias de calculadoras con Abstract Factory.

### 4. Decisión

Se mantienen Adapter y Strategy. `MapboxAdapter` traduce el contrato externo a
kilómetros, mientras el servicio solo conoce `calcularDistancia`. En desarrollo
y pruebas se usa un proveedor falso con el mismo contrato.

`PartesIguales` y `PorKilometro` implementan `dividir`; el índice de estrategias
las registra por nombre. `Object.hasOwn` evita que valores heredados como
`constructor` o `toString` sean tratados como modos válidos.

No se usa Singleton: `index.js` crea una instancia y la inyecta, sin estado
global oculto. Tampoco se usa Abstract Factory: hoy existe una fórmula y un dato
configurable, no una familia de productos relacionados.

### 5. Evidencia y trade-offs

Las pruebas cubren ambos algoritmos, redondeo exacto, modos inválidos, distancia
ausente, errores HTTP e integración con la distancia obtenida al publicar. Los
patrones agregan archivos y contratos, pero permiten sustituir el proveedor y
agregar un modo sin modificar los algoritmos existentes.

El precio único y el proveedor falso son límites conscientes. Si aparecen
peajes, reglas por vehículo o regiones, primero se modelarán esas variaciones y
recién entonces se reevaluará una fábrica.

## Decisión 3: altas y bajas de pasajeros

### Endpoints

- `POST /api/viajes/:id/pasajeros`: suma un pasajero y responde `201`.
- `DELETE /api/viajes/:id/pasajeros/:usuarioId`: baja un pasajero.

Al cambiar la lista se actualizan asientos, división y aviso al conductor.

### 1. Código involucrado

- [`pasajero.service.js`](../backend/src/services/pasajero.service.js)
- [`PublicadorEventos.js`](../backend/src/domain/eventos/PublicadorEventos.js)
- [`observadores/`](../backend/src/observadores/)
- [`pasajeros.routes.js`](../backend/src/routes/pasajeros.routes.js)
- [`pasajeros.test.js`](../backend/test/pasajeros.test.js)

### 2. Problema

Si `PasajeroService` actualizara directamente asientos, división y
notificaciones, tendría demasiados motivos de cambio. Además, cada reacción
nueva obligaría a editar el flujo principal. Las reacciones ya son tres y tienen
dependencias distintas, por lo que Observer resuelve una variación real.

### 3. Alternativas consideradas

- Ejecutar las tres acciones en secuencia dentro de `sumar()` y `bajar()`.
- Emitir `pasajero:sumado` y `pasajero:bajado`, con una reacción por observador.
- Crear el canal de notificación mediante Factory Method.

### 4. Decisión

`PasajeroService` registra el cambio y publica un evento. `ActualizarAsientos`,
`RecalcularDivision` y `AvisarConductor` se suscriben por separado en `crearApp`.
La división reutiliza `CostoService` en vez de duplicar la fórmula.

No se implementa Factory Method para notificaciones porque solo existe
`NotificadorConsola`. El observador recibe un objeto con `enviar`, por lo que una
futura selección entre email, push o SMS puede agregarse en el punto de
composición sin cambiar el observador.

### 5. Evidencia y trade-offs

Las pruebas cubren orden de notificación, desuscripción, altas, bajas,
duplicados, falta de asientos, recálculo y errores. El beneficio es desacoplar
las reacciones; el costo es que el flujo queda distribuido y su orden importa.

Hoy los observadores se ejecutan en el mismo proceso. Si uno falla después de
que otro persistió su cambio, no existe rollback automático. Con una base real
la actualización de cada agregado es transaccional, pero la cadena completa de
observadores no forma una única transacción. Un patrón de eventos persistentes
sería desproporcionado para el alcance actual.

## Decisión 4: contrato async para repositorios

### 1. Código involucrado

- [`viaje.repository.memoria.js`](../backend/src/repositories/viaje.repository.memoria.js)
- [`viaje.repository.postgres.js`](../backend/src/repositories/viaje.repository.postgres.js)
- [`viaje.service.js`](../backend/src/services/viaje.service.js)
- [`costo.service.js`](../backend/src/services/costo.service.js)
- [`pasajero.service.js`](../backend/src/services/pasajero.service.js)

### 2. Problema

El repositorio en memoria podía responder de forma sincrónica, pero PostgreSQL
siempre requiere operaciones asíncronas. Mantener dos contratos habría obligado
a los servicios y rutas a conocer qué infraestructura se está usando, rompiendo
la sustitución y agregando condicionales en toda la aplicación.

### 3. Alternativas consideradas

- Conservar memoria sincrónica y adaptar únicamente PostgreSQL.
- Detectar promesas dentro de cada servicio.
- Definir desde el contrato que todos los métodos devuelven `Promise`.

### 4. Decisión

Todos los repositorios son async, incluso los de memoria. Servicios, rutas,
publicador y observadores usan `await`. La selección de infraestructura queda en
el punto de composición: con `DATABASE_URL` se usa PostgreSQL y sin ella se usa
memoria.

### 5. Evidencia y trade-offs

La misma batería de contrato se ejecuta contra ambas implementaciones. El costo
es usar asincronía donde la memoria no la necesita; el beneficio es que el
negocio no cambia cuando cambia la infraestructura.

## Decisión 5: persistencia PostgreSQL y transacción de pasajeros

### 1. Código involucrado

- [`001_esquema_inicial.sql`](../backend/db/migraciones/001_esquema_inicial.sql)
- [`migrar.js`](../backend/scripts/migrar.js)
- [`viaje.repository.postgres.js`](../backend/src/repositories/viaje.repository.postgres.js)
- [`usuario.repository.postgres.js`](../backend/src/repositories/usuario.repository.postgres.js)
- [`vehiculo.repository.postgres.js`](../backend/src/repositories/vehiculo.repository.postgres.js)

### 2. Problema

Un viaje se reconstruye con datos de viajes, vehículos, paradas, pasajeros y
usuarios. Al actualizar pasajeros se reemplaza la lista completa. Si el borrado
y las inserciones se ejecutaran de forma independiente, un error intermedio
podría dejar pasajeros perdidos o una lista parcial.

### 3. Alternativas consideradas

- Ejecutar cada consulta directamente sobre el pool.
- Incorporar un ORM y delegar las transacciones.
- Mantener SQL explícito y delimitar la actualización con `BEGIN`, `COMMIT` y
  `ROLLBACK`.

### 4. Decisión

Los repositorios PostgreSQL encapsulan SQL y traducen `snake_case` a `camelCase`.
`ViajeRepositoryPostgres.actualizar` modifica el viaje, elimina la lista anterior
y agrega la nueva dentro de una única transacción. Si cualquier pasajero falla,
se ejecuta rollback y se conserva el estado anterior.

Las migraciones también son SQL explícito y se registran en
`schema_migraciones`. No se agregó un ORM porque existe un solo esquema pequeño
y las consultas forman parte de la evidencia que se quiere explicar.

### 5. Evidencia y trade-offs

Las pruebas verifican el mismo contrato contra memoria y PostgreSQL, además de
forzar un pasajero inválido para comprobar el rollback. También se validó que
los datos sobrevivan al reinicio del servidor. El costo es escribir mapeos y SQL
manual; el beneficio es control explícito de consultas y límites transaccionales.

## Decisión 6: autenticación con JWT y bcrypt

### Endpoints

- `POST /api/auth/registro`
- `POST /api/auth/login`
- `GET /api/auth/yo`
- `POST /api/vehiculos` y `GET /api/vehiculos`
- Operaciones protegidas de viajes y pasajeros.

### 1. Código involucrado

- [`auth.service.js`](../backend/src/services/auth.service.js)
- [`requiereAuth.js`](../backend/src/middleware/requiereAuth.js)
- [`auth.routes.js`](../backend/src/routes/auth.routes.js)
- [`vehiculo.service.js`](../backend/src/services/vehiculo.service.js)
- [`viajes.routes.js`](../backend/src/routes/viajes.routes.js)
- [`pasajeros.routes.js`](../backend/src/routes/pasajeros.routes.js)

### 2. Problema

Antes de autenticar, el cliente podía enviar `conductorId` y `usuarioId` en el
body. Eso permite atribuir acciones a otra persona. También era necesario
guardar contraseñas sin poder recuperarlas y distinguir falta de identidad,
token inválido y falta de permisos.

### 3. Alternativas consideradas

- Sesiones guardadas en el servidor.
- JWT firmado y con vencimiento.
- Confiar en los ids enviados por el frontend.
- Derivar identidad exclusivamente del token.

### 4. Decisión

Las contraseñas se almacenan con bcrypt y 10 rondas. Registro y login devuelven
un JWT firmado con `JWT_SECRET` que vence en 24 horas. `requiereAuth` verifica el
header `Authorization: Bearer`, expone `{ id, nombre, email }` en `req.usuario`
y diferencia `NO_AUTENTICADO` de `TOKEN_INVALIDO`.

La publicación toma `conductorId` del token; el alta de pasajeros toma
`usuarioId` del token; solo el conductor puede cancelar y solo el propio
pasajero o el conductor pueden darlo de baja. Un vehículo debe existir y
pertenecer al conductor. Ninguna respuesta incluye `passwordHash`.

Se eligió JWT porque el backend es una API pequeña, sin sesiones compartidas ni
múltiples instancias que coordinar. Es una decisión de arquitectura y seguridad,
no un patrón GoF.

### 5. Evidencia y trade-offs

Las pruebas cubren registro, email duplicado, login, vencimiento, firma inválida,
aislamiento de vehículos y permisos de conductor y pasajero. JWT evita estado de
sesión en el servidor, pero un token válido no se puede revocar antes de vencer.
Una aplicación productiva requeriría rotación de secretos, refresh tokens o una
estrategia de revocación y protección frente a intentos repetidos de login.

## Refactorizaciones y mejoras realizadas

1. Se normaliza defensivamente un cuerpo de viaje que no sea un objeto y el
   middleware conserva el status 400 de los errores de parsing de Express.
2. Se rechazan coordenadas nulas, booleanas o vacías antes de convertirlas a
   número.
3. Se agregaron pruebas de regresión para ambos casos.
4. Se reunieron los tres análisis en este único documento y se actualizó el
   README para reflejar el estado real.
5. Se fijó Node.js 22.13 como mínimo para que la versión recomendada en `.nvmrc`
   sea compatible con Vite, ESLint y las dependencias actuales de Mapbox.
6. Se unificaron los contratos de repositorios como async y se agregó la
   implementación PostgreSQL con migraciones y transacciones.
7. Se incorporaron registro, login, JWT, vehículos y autorización basada en la
   identidad del token.

## Decisiones de alcance y deuda conocida

- El frontend todavía es la plantilla inicial y no consume la API.
- Los JWT no tienen refresh ni revocación anticipada; es suficiente para el MVP
  académico, no para producción.
- PostgreSQL protege cada actualización del viaje, pero la secuencia completa
  de observadores no es una única transacción de aplicación.
- Las notificaciones siguen siendo por consola y no se persisten.
- Las abstracciones descartadas se reevaluarán cuando exista una variación real,
  no por anticipación.

## Verificación reproducible

Desde el repositorio:

```bash
cd backend
npm ci
npm test

# Con PostgreSQL de pruebas ya migrado (PowerShell)
$env:DATABASE_URL="postgresql://grupo8:<POSTGRES_PASSWORD>@localhost:5432/viajes_test"
npm run migrate
npm test

cd ../frontend
npm ci
npm run lint
npm run build
```

Usar Node.js 22.13 o superior. Las pruebas que usan PostgreSQL solo deben apuntar
a una base cuyo nombre termine en `_test`.

En la verificación del 12 de noviembre de 2026, `npm run lint` del frontend
pasó. El build no se considera verificado porque la terminal disponible usa
Node.js 20.18 y Rolldown no pudo cargar su dependencia nativa opcional de
Windows. El proyecto exige Node.js 22.13; corresponde seleccionar esa versión,
ejecutar un `npm ci` limpio y repetir `npm run build`, sin agregar al repositorio
un binding específico de plataforma.

La evidencia principal para la evaluación es el código enlazado y las pruebas;
este documento explica las decisiones, pero no reemplaza poder recorrer y
justificar la implementación.
