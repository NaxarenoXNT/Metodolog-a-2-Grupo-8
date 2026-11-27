# Pruebas automatizadas del backend

Este documento explica **cómo** se prueba el backend, **cómo** se ejecutan las
pruebas, **cómo** se lee el resultado y **por qué** se eligieron los casos que
hay. Responde al punto del Taller III que pide "casos seleccionados y
justificados: normales, límites o errores".

Las pruebas están en [`backend/test/`](../backend/test/) y el helper de
autenticación compartido en
[`backend/test-helpers/auth.js`](../backend/test-helpers/auth.js).

## 1. Estrategia y herramientas

### Por qué `node:test` + Supertest

- **`node:test`** es el runner que trae Node.js (llegó en la versión 18 y es
  estable desde la 20). No suma dependencias ni configuración: `npm test` ejecuta
  `node --test` y Node busca solo los archivos `*.test.js`. También trae
  `t.mock.method`, que usamos para reemplazar `fetch` y `AbortSignal.timeout`
  sin instalar una librería de mocks.
- **`node:assert/strict`** compara con igualdad estricta (`deepStrictEqual`),
  así un `"3"` no pasa por un `3`.
- **Supertest** le hace pedidos HTTP a la app de Express **sin que haya que
  arrancar el servidor ni elegir un puerto**: internamente abre uno efímero
  (`app.listen(0)`) para cada pedido. Eso permite probar rutas, middleware de
  autenticación, validaciones y códigos de estado juntos, como los vería el
  frontend.

La app se arma con `crearApp(dependencias)`: cada test le inyecta sus propios
repositorios, reloj (`ahora`), proveedor de rutas y notificador. Gracias a esa
inyección de dependencias los tests no tocan la red, no dependen de la hora real
y no comparten estado entre sí.

### Los tres niveles

| Nivel | Qué prueba | Dónde |
| --- | --- | --- |
| **Unitario de dominio** | Una clase o función sola, sin HTTP ni base: estrategias de división (`PartesIguales`, `PorKilometro`), `PublicadorEventos` (Observer), filtros del repositorio en memoria, `MapboxAdapter` con `fetch` stubbeado. | `costos.test.js`, `pasajeros.test.js`, partes de `viajes.test.js` |
| **Integración HTTP** | Ruta + middleware + servicio + repositorio en memoria, a través de Supertest. Verifica status, código de error y cuerpo de la respuesta. | `viajes.test.js`, `pasajeros.test.js`, `costos.test.js`, `auth.test.js`, `vehiculos.test.js` |
| **Contrato memoria ↔ PostgreSQL** | La **misma batería** (`probarContratoViajes`) corre contra `ViajeRepositoryMemoria` y `ViajeRepositoryPostgres` para comprobar que son intercambiables (mismo formato de datos, mismos `null`, mismo orden). Más algunos casos que solo existen en PostgreSQL (rollback, email único). | `repositorios.postgres.test.js` |

### Dobles de prueba (mocks y stubs) que se usan

| Doble | Qué reemplaza | Para qué |
| --- | --- | --- |
| `proveedorRutas` falso (objeto con `calcularDistancia`) | Mapbox | Devuelve una distancia fija (690 km) y registra con qué coordenadas lo llamaron. |
| `ProveedorRutasFalso` (`src/adapters`) | Mapbox | Lo usa `index.js` cuando falta `MAPBOX_API_KEY` fuera de producción (690 km fijos). |
| `t.mock.method(globalThis, 'fetch', …)` | La llamada HTTP real | Simula a Mapbox respondiendo o "colgado", sin salir a internet. |
| `t.mock.method(AbortSignal, 'timeout', …)` | El reloj del timeout de 10 s | El timeout "vence" a los 5 ms para no esperar 10 s reales. |
| `ahora: () => AHORA` | `new Date()` | Fija la fecha actual; así "fecha pasada" no depende del día en que se corre. |
| Notificador falso (`enviados: []`) | `NotificadorConsola` | Permite verificar el aviso al conductor sin leer la consola. |
| `JWT_SECRET_PRUEBAS` + `bearer(usuario)` | Login real | Genera tokens válidos, vencidos o mal firmados al instante. |

## 2. Cómo ejecutar

Requisito: Node.js 22.13 o superior (`nvm use` toma la versión de `.nvmrc`).

### En memoria (lo normal)

```powershell
cd backend
npm ci
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
npm test
```

```bash
cd backend
npm ci
unset DATABASE_URL
npm test
```

No necesita Docker ni base de datos. Corre **106 tests** en pocos segundos.

### Con PostgreSQL

Con el contenedor levantado (`docker compose up -d` desde la raíz):

```powershell
cd backend
$env:DATABASE_URL="postgresql://grupo8:<POSTGRES_PASSWORD>@localhost:5432/viajes_test"
npm run migrate
npm test
```

```bash
cd backend
export DATABASE_URL="postgresql://grupo8:<POSTGRES_PASSWORD>@localhost:5432/viajes_test"
npm run migrate
npm test
```

Corre **130 tests**: los 106 anteriores más 24 que necesitan la base.

Medidas de seguridad del archivo de contrato:

- Solo corre contra una base cuyo nombre **termine en `_test`**. Si
  `DATABASE_URL` apunta a `viajes` (la de desarrollo), la parte de PostgreSQL se
  saltea en lugar de escribir ahí.
- No usa `dotenv`, porque `backend/.env` apunta a la base de desarrollo.
- Al terminar, la suite borra solo los ids que creó (nunca `TRUNCATE` ni
  `DELETE` sin `WHERE`), así que no asume que la base esté vacía.

### Cobertura y lint

```powershell
cd backend
npm run test:coverage   # en memoria; con $env:DATABASE_URL definida incluye PostgreSQL
npm run lint
```

```bash
cd backend
npm run test:coverage   # en memoria; con DATABASE_URL definida incluye PostgreSQL
npm run lint
```

- `npm run test:coverage` corre la misma suite y al final imprime una tabla con
  el porcentaje de **líneas, ramas y funciones** ejecutadas por archivo y las
  líneas sin cubrir. Excluye `test/` y `test-helpers/` para que los propios
  tests no inflen el número.
- `npm run lint` pasa ESLint por el backend (posibles bugs como variables sin
  usar). No ejecuta tests.
- Qué miden y qué no garantizan, con los resultados antes y después, está en
  [`calidad.md`](calidad.md).

### Todo junto: `npm run check`

```bash
cd backend
npm run check   # npm run lint && npm test
```

Encadena lint y tests: si el lint falla, los tests no se ejecutan. Usa la misma
selección de base que `npm test`, así que sin `DATABASE_URL` corre los 106 tests
en memoria. En `frontend/`, `npm run check` encadena `npm run lint` y
`npm run build`.

Es lo mismo que ejecuta el workflow de CI en cada push y PR a `dev` o `main`
(detalle en [`calidad.md`](calidad.md#verificación-automatizada-ci)).

### Qué significa que se salteen los tests de PostgreSQL

Sin `DATABASE_URL` (o si no termina en `_test`), el bloque
`Repositorios PostgreSQL` se saltea. En la salida aparece así:

```text
ok 17 - Repositorios PostgreSQL # SKIP DATABASE_URL no está definida
```

**Ojo:** en el resumen final ese bloque **no suma en `# skipped`** (queda en
`0`). `node:test` marca como salteada la *suite* entera y no cuenta los tests
que tiene adentro. Por eso la forma de saber si corrieron es mirar el total:

| Situación | `# tests` | Línea `# SKIP` |
| --- | --- | --- |
| Sin base de datos | 106 | Sí, con el motivo |
| Con `viajes_test` migrada | 130 | No |

Saltearlos no es un error: el contrato **en memoria** sí corre siempre (está en
el mismo archivo), y lo que falta es comprobar la implementación PostgreSQL.

## 3. Cómo interpretar el resultado

Al final de `npm test` aparece un resumen como este:

```text
# tests 106
# suites 21
# pass 106
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1827
```

- `tests`: cantidad de casos que se ejecutaron.
- `suites`: bloques `describe` que agrupan casos.
- `pass` / `fail`: cuántos pasaron o fallaron. La entrega está bien si
  `fail` es `0` y `pass` es igual a `tests`.
- `cancelled`: tests interrumpidos (por ejemplo, porque un `before` falló).
- `skipped`: tests individuales marcados con `skip` (ver la aclaración de
  arriba sobre las suites).
- `todo`: tests marcados como pendientes. Hoy no hay ninguno.

Si un test falla:

1. Buscar en la salida la línea `not ok N - nombre del test`. Debajo aparecen
   el archivo, la línea, el valor esperado (`expected`) y el obtenido
   (`actual`).
2. Correr solo ese archivo para leer menos salida:
   `node --test test/viajes.test.js`.
3. O solo ese caso por nombre:
   `node --test --test-name-pattern="cuerpo JSON es null" test/viajes.test.js`.
4. Decidir si cambió el código (bug) o cambió el requisito (actualizar el test
   en el mismo PR y explicarlo).

## 4. Casos representativos y por qué están

La batería completa tiene 106 casos en memoria (viajes 40, pasajeros 19,
contrato de repositorios 19, costos 15, auth 9, vehículos 4). Esta tabla elige
los que mejor muestran **qué riesgo** cubre cada tipo. Todos se pueden buscar
por el nombre exacto del test.

| Tipo | Archivo | Test | Qué riesgo cubre |
| --- | --- | --- | --- |
| Normal | `viajes.test.js` | `POST /api/viajes publica un viaje válido y guarda la distancia del proveedor` | Flujo principal de publicación: responde 201, guarda la distancia que devolvió el proveedor de rutas, le pasa origen y destino correctos, y `GET /:id` devuelve lo mismo que se creó. |
| Normal | `pasajeros.test.js` | `suma al pasajero, descuenta un asiento, recalcula la división y avisa` | El Observer completo: cada `POST` dispara los tres observadores (asientos, división, aviso al conductor). El test suma a dos pasajeros y comprueba 0 asientos libres, la división en 750 + 750 y los dos avisos enviados. Además, la identidad sale del token y no del cuerpo: el primer `POST` manda `usuarioId: 'u2'` y `nombre: 'Nombre falso'`, y se ignora (se guarda "Ana", la del token). |
| Límite | `costos.test.js` | `reparte los centavos sobrantes para que la suma dé el total` | Errores de redondeo con dinero: $1000 entre 3 da 333,34 + 333,33 + 333,33. Sin el reparto del centavo la suma daría 999,99. |
| Límite | `viajes.test.js` | `GET /api/viajes: desde y hasta son inclusivos al milisegundo` | Bordes del filtro por fecha: un viaje a las 03:00:00.000Z entra con `desde` y `hasta` iguales a esa hora, y queda afuera si el borde se corre 1 ms. Detecta un `<` donde iba `<=`. |
| Límite | `pasajeros.test.js` | `si se baja el último pasajero la división queda vacía` | Lista vacía: dividir entre cero pasajeros no debe tirar error ni dar `NaN`; devuelve `montos: []` y el asiento vuelve. |
| Límite | `costos.test.js` | `sin km cargados reparte en partes iguales` | Datos incompletos: `PorKilometro` sin km (o con 0 km) dividiría por cero; en ese caso cae a partes iguales. |
| Error | `viajes.test.js` | `POST /api/viajes rechaza coordenadas nulas o vacías` | En JavaScript `Number(null)` y `Number('')` dan `0`, que es una coordenada válida (en el océano). Sin este test, un origen sin coordenadas se publicaría. Es una prueba de regresión agregada en el Taller II. |
| Error | `viajes.test.js` | `POST /api/viajes responde 400 si el cuerpo JSON es null` | Un cuerpo `null` antes rompía el servicio y respondía **500**. Ahora es un 400 `JSON_INVALIDO`. También es una prueba de regresión del Taller II. |
| Error | `auth.test.js` | `distingue token ausente de token inválido o vencido` | Seguridad y códigos correctos: sin token responde `NO_AUTENTICADO`; con esquema incorrecto, token mal formado o vencido responde `TOKEN_INVALIDO`. Ambos son 401, pero el frontend necesita distinguirlos. |
| Error | `viajes.test.js` | `si Mapbox no responde a tiempo, POST /api/viajes responde 502 sin filtrar el código interno` | Dependencia externa caída: con `fetch` "colgado" y el timeout acelerado, la API responde 502 en vez de quedarse esperando, no expone detalles internos (`ERROR_INTERNO`) y el viaje no se guarda. |
| Error | `repositorios.postgres.test.js` | `actualizar hace rollback si falla un pasajero y deja el viaje intacto` | Integridad transaccional: si falla la inserción de un pasajero (clave foránea inexistente), no quedan asientos descontados ni pasajeros a medias. *Solo corre con PostgreSQL.* |
| Error | `auth.test.js` | `el middleware de errores oculta códigos internos en respuestas 5xx` | Fuga de información: un error simulado de la base (código `23502`, nombre de columna) no llega al cliente; solo se ve `ERROR_INTERNO`. |

### Criterio general de selección

- **Normales:** un caso por cada flujo del MVP (publicar, sumarse, bajarse,
  calcular costo, registrarse, crear vehículo). Si alguno falla, la demo no
  funciona.
- **Límites:** donde hay comparaciones (`<=` en fechas, cantidad de asientos
  contra capacidad), divisiones (montos, km) o listas que pueden quedar vacías.
  Son los lugares típicos de errores "por uno".
- **Errores:** cada código de error que la API documenta (400, 401, 403, 404,
  409, 422, 502) tiene al menos un test que lo provoca. Se priorizan los que
  ya fallaron alguna vez (coordenadas nulas, cuerpo `null`): cuando se corrige
  un bug, se agrega el test que lo hubiera detectado.

## 5. Limitaciones conocidas

- **El frontend no tiene tests automatizados.** Se verifica a mano y con
  `npm run lint` / `npm run build`. Un siguiente paso razonable sería Vitest
  sobre funciones puras como `frontend/src/features/publicacion/validaciones.js`.
- **No hay tests end-to-end.** Ningún test recorre navegador → frontend →
  API → base. Los de integración llegan hasta la API con repositorio en
  memoria.
- **Los repositorios PostgreSQL solo se prueban con una base levantada.** En
  una corrida sin Docker esos 24 casos no se ejecutan; por eso la cobertura en
  memoria sale baja en `*.repository.postgres.js` y `db/pool.js` (~21–27 % de
  líneas). Medido con `npm run test:coverage`: **79 % de líneas sin
  PostgreSQL** (79,45 %, 106 tests) y **95 % con PostgreSQL** (95,18 %, 130
  tests). Detalle por archivo y qué no garantiza la cobertura en
  [`calidad.md`](calidad.md).
- **La cadena de observadores no es una única transacción.** `ActualizarAsientos` y
  `RecalcularDivision` hacen cada uno su propio `actualizar`. Si uno falla a mitad de camino, la emisión se
  corta (está probado en `si un observador lanza, corta la emisión y propaga
  el error`), pero lo que ya guardaron los anteriores no se deshace.
- **Mapbox nunca se llama de verdad en los tests.** Se prueba el adapter con
  `fetch` stubbeado; si Mapbox cambia el formato de su respuesta, los tests no
  lo detectan.
