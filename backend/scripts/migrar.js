require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const crearPool = require('../src/db/pool');

async function main() {
  const pool = crearPool(process.env.DATABASE_URL);
  const client = await pool.connect();

  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migraciones (
      nombre VARCHAR(200) PRIMARY KEY,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now())`);

    const dir = path.join(__dirname, '..', 'db', 'migraciones');
    const archivos = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    const { rows } = await client.query('SELECT nombre FROM schema_migraciones');
    const hechas = new Set(rows.map((r) => r.nombre));

    for (const archivo of archivos) {
      if (hechas.has(archivo)) continue;

      await client.query('BEGIN');

      try {
        await client.query(fs.readFileSync(path.join(dir, archivo), 'utf8'));

        await client.query(
          'INSERT INTO schema_migraciones (nombre) VALUES ($1)',
          [archivo]
        );

        await client.query('COMMIT');
        console.log(`Aplicada: ${archivo}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
