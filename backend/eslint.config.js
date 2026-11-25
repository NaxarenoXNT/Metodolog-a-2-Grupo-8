// Configuración flat de ESLint (CommonJS) para el backend.
// Se ejecuta con: npm run lint
const { defineConfig, globalIgnores } = require('eslint/config');
const js = require('@eslint/js');
const globals = require('globals');

module.exports = defineConfig([
  // Carpetas que ESLint nunca debe analizar: código de terceros e informes generados.
  globalIgnores(['node_modules', 'coverage']),
  {
    // Se aplica a todos los archivos JavaScript del backend.
    files: ['**/*.js'],
    // Reglas base: el conjunto recomendado de ESLint (posibles bugs, no estilo).
    extends: [js.configs.recommended],
    languageOptions: {
      // El backend usa require/module.exports, no módulos ES.
      sourceType: 'commonjs',
      // Declara los globales de Node.js (process, __dirname, require...) para que no se marquen como indefinidos.
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          // Los parámetros que empiezan con "_" quedan sin usar a propósito
          // (por ejemplo, para respetar el contrato de una interfaz).
          argsIgnorePattern: '^_',
          // Ignora las propiedades hermanas de un rest: `const { secreto, ...seguro } = obj`
          // es la forma habitual de omitir una propiedad.
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);
