// ESLint flat config (CommonJS) for the backend.
// Run with: npm run lint
const { defineConfig, globalIgnores } = require('eslint/config');
const js = require('@eslint/js');
const globals = require('globals');

module.exports = defineConfig([
  // Folders ESLint must never analyze: third-party code and generated reports.
  globalIgnores(['node_modules', 'coverage']),
  {
    // Apply to every JavaScript file in the backend.
    files: ['**/*.js'],
    // Base ruleset: ESLint's recommended rules (likely bugs, not style).
    extends: [js.configs.recommended],
    languageOptions: {
      // The backend uses require/module.exports, not ES modules.
      sourceType: 'commonjs',
      // Declare Node.js globals (process, __dirname, require...) so they are not flagged as undefined.
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          // Parameters prefixed with "_" are intentionally unused
          // (e.g. to respect an interface contract).
          argsIgnorePattern: '^_',
          // Ignore siblings of a rest element: `const { secret, ...safe } = obj`
          // is the standard way to omit a property.
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);
