const { Pool } = require('pg');

function crearPool(connectionString) {
  if (!connectionString) throw new Error('Falta DATABASE_URL');
  const pool = new Pool({ connectionString });

  // Si se corta una conexión inactiva (por ejemplo, se reinicia el
  // contenedor), pg emite 'error' en el pool y, sin listener, Node termina
  // el proceso.
  pool.on('error', (error) =>
    console.error('Se perdió una conexión inactiva con PostgreSQL:', error.message),
  );

  return pool;
}

module.exports = crearPool;
