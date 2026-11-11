const { Pool } = require('pg');

function crearPool(connectionString) {
  if (!connectionString) throw new Error('Falta DATABASE_URL');
  return new Pool({ connectionString });
}

module.exports = crearPool;
