# Calidad del código

## Taller III · Revisión y mejoras de calidad

Evidencia de revisión y mejora de calidad del **backend** (Node.js, CommonJS).
El frontend ya tenía ESLint; el backend no tenía ninguna herramienta, así que
esta tarea agrega lint, medición de cobertura y revisión de dependencias.

- Pull request de esta tarea: https://github.com/NaxarenoXNT/Metodolog-a-2-Grupo-8/pull/14

### Herramientas y comandos

| Herramienta | Comando (desde `backend/`) | Qué mide | Qué NO garantiza |
| --- | --- | --- | --- |
| ESLint | `npm run lint` | Análisis estático: variables sin usar, globales indefinidos, errores de sintaxis y otros patrones que suelen ser bugs (reglas `recommended`). | Que el código sea correcto ni que cumpla los requisitos. No evalúa estilo, diseño ni lógica de negocio. |
| Cobertura (`node:test`) | `npm run test:coverage` | Qué líneas, ramas y funciones ejecutan los tests. | Que los tests verifiquen algo: una línea ejecutada sin aserciones cuenta como cubierta. Un % alto no prueba ausencia de bugs. |
| npm audit | `npm audit` (en `backend/` y `frontend/`) | Dependencias con vulnerabilidades **conocidas** según la base de avisos de npm. | Que el código propio sea seguro, ni que no existan vulnerabilidades aún no reportadas. |

Configuración relevante:

- `backend/eslint.config.js`: flat config en CommonJS con
  `js.configs.recommended` y `globals.node`. Ignora `node_modules` y `coverage`.
  `no-unused-vars` usa `argsIgnorePattern: '^_'` e `ignoreRestSiblings: true`.
- `test:coverage` excluye `test/**` y `test-helpers/**` para que los archivos de
  test no inflen el porcentaje.

### Resultados ANTES / DESPUÉS

#### Lint (backend)

| | Antes | Después |
| --- | --- | --- |
| Herramienta | No había | ESLint 10 + `recommended` |
| Errores | 3 (al aplicar la regla) | 0 |

Hallazgos del lint y resolución:

| Archivo | Hallazgo | Resolución |
| --- | --- | --- |
| `src/adapters/ProveedorRutasFalso.js` | `no-unused-vars`: parámetros `origen` y `destino` sin usar. | Se renombraron a `_origen` y `_destino`: se conservan a propósito para respetar el contrato `calcularDistancia(origen, destino)`. No se borró código. |
| `src/services/auth.service.js` | `no-unused-vars`: `passwordHash` en `const { passwordHash, ...publico } = usuario`. | Intencional: es la forma de sacar el hash de la respuesta. Se resolvió con `ignoreRestSiblings: true`, sin tocar el código. |
| `src/adapters/ProveedorRutasFalso.js` | Archivo con BOM al inicio (hallazgo manual, no del lint). | Se eliminó el BOM. |

#### Cobertura (backend)

| Escenario | Tests | Líneas | Ramas | Funciones |
| --- | --- | --- | --- | --- |
| Sin `DATABASE_URL`, sin exclude (referencia) | 106 | 86,00 % | 89,37 % | 91,27 % |
| **Sin `DATABASE_URL`, con exclude (ANTES)** | 106 | 79,45 % | 85,06 % | 85,39 % |
| **Con `DATABASE_URL` a `viajes_test` (DESPUÉS)** | 130 | 95,18 % | 84,48 % | 97,85 % |

Lectura:

- Sin exclude el número parece mejor (86 %) solo porque cuenta los propios
  archivos de test, que se ejecutan por definición. El valor honesto es el que
  excluye `test/` y `test-helpers/`.
- Sin `DATABASE_URL`, la suite `Repositorios PostgreSQL` se saltea (decisión
  deliberada del test: solo corre contra una base cuyo nombre termina en
  `_test`). Por eso `*.repository.postgres.js` y `src/db/pool.js` quedan en
  ~21–27 % de líneas: solo se ejecuta la carga del módulo.
- Con PostgreSQL de pruebas esos archivos suben a 96–100 % de líneas, y el total
  a 95,18 %. Ejecución: `npm run migrate` sobre `viajes_test` y luego
  `npm run test:coverage` con `DATABASE_URL` apuntando a esa base.
- El % de ramas baja levemente (85,06 → 84,48) porque el código PostgreSQL suma
  ramas nuevas y algunas siguen sin ejecutarse (por ejemplo, `viaje.repository.postgres.js`
  queda en 76,56 %).

Zonas poco cubiertas aun con PostgreSQL (ramas %):

| Archivo | Líneas | Ramas |
| --- | --- | --- |
| `adapters/MapboxAdapter.js` | 75,00 % | 54,55 % |
| `observadores/AvisarConductor.js` | 86,11 % | 55,56 % |
| `routes/vehiculos.routes.js` | 82,86 % | 66,67 % |
| `services/vehiculo.service.js` | 92,97 % | 70,59 % |
| `domain/viaje/ViajeBuilder.js` | 87,56 % | 75,00 % |
| `services/viaje.service.js` | 92,74 % | 75,00 % |

Las líneas exactas sin cubrir figuran en el reporte de `npm run test:coverage`.

Qué NO garantiza la cobertura: que las aserciones sean buenas, que los datos de
prueba representen casos reales ni que las ramas ejecutadas se combinen en todos
sus órdenes. Tampoco mide integración real con servicios externos: Mapbox se
prueba con `fetch` simulado.

#### Dependencias (npm audit)

| | Antes | Después |
| --- | --- | --- |
| Backend | 6: 1 crítica (`proxy-addr`), 2 altas (`body-parser`, `brace-expansion`), 3 moderadas (`qs`, `minimatch`, `nodemon`) | 2 moderadas (`minimatch`, `nodemon`) |
| Frontend | 8: 5 altas (`vite`, `follow-redirects`, `zod`, `source-map-js`, `brace-expansion`), 3 moderadas (`eslint`, `@eslint/config-array`, `minimatch`) | 0 |

Se aplicó `npm audit fix` en ambos proyectos, **sin `--force`**.

Pendiente en el backend: `minimatch` llega a través de `nodemon`. `npm audit fix
--force` lo "resolvería" con un cambio marcado como *breaking* sobre `nodemon`
(npm propone `nodemon@3.1.11`, anterior a la `3.1.14` instalada). No se fuerza
porque:

- es una `devDependency` usada solo en desarrollo (`npm run dev`);
- `npm audit --omit=dev` en el backend informa **0 vulnerabilidades**, es decir,
  nada de lo pendiente llega a producción;
- se prefiere no degradar una herramienta de desarrollo para silenciar un aviso
  de denegación de servicio sobre patrones de globbing.

#### Verificación posterior a los cambios

| Comprobación | Resultado |
| --- | --- |
| Backend `npm test` (sin `DATABASE_URL`) | 106 tests, 0 fallos |
| Backend `npm run test:coverage` (con `viajes_test`) | 130 tests, 0 fallos |
| Backend `npm run lint` | 0 errores |
| Frontend `npm run lint` | 0 errores |
| Frontend `npm run build` | OK |

### Mejoras ya realizadas en el Taller II

Resumen; el detalle está en
[Refactorizaciones y mejoras realizadas](decisiones-diseno.md#refactorizaciones-y-mejoras-realizadas):

- **Coordenadas nulas:** se rechazan coordenadas nulas, booleanas o vacías antes
  de convertirlas a número.
- **Cuerpo `null`:** se normaliza un cuerpo de viaje que no sea un objeto, y el
  middleware conserva el 400 de los errores de parsing de Express. Ambos casos
  tienen pruebas de regresión.
- **Contrato async:** los repositorios se unificaron como async y se agregó la
  implementación PostgreSQL con migraciones y transacciones.
