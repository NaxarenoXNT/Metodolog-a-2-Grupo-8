// Repositorio de usuarios sobre PostgreSQL. Recibe el pool por constructor para
// poder inyectar uno real o uno de prueba. Devuelve passwordHash: excluirlo de
// las respuestas HTTP es responsabilidad del servicio de autenticación.

// Traduce una fila de la tabla usuarios (snake_case) al contrato (camelCase).
function filaAUsuario(fila) {
  if (!fila) {
    return null;
  }

  return {
    id: fila.id,
    nombre: fila.nombre,
    email: fila.email,
    passwordHash: fila.password_hash,
    telefono: fila.telefono,
    fechaRegistro: fila.fecha_registro,
  };
}

class UsuarioRepositoryPostgres {
  constructor({ pool }) {
    this.pool = pool;
  }

  // telefono es opcional en la tabla: si no llega se guarda NULL.
  async crear({ nombre, email, passwordHash, telefono }) {
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO usuarios (nombre, email, password_hash, telefono)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [nombre, email, passwordHash, telefono ?? null],
      );

      return filaAUsuario(rows[0]);
    } catch (error) {
      // 23505: violación de UNIQUE (la única de la tabla es email).
      if (error.code === '23505') {
        const e = new Error(`Ya existe un usuario con el email ${email}`);
        e.code = 'EMAIL_YA_REGISTRADO';
        e.statusCode = 409;
        throw e;
      }
      throw error;
    }
  }

  async buscarPorEmail(email) {
    const { rows } = await this.pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email],
    );

    return filaAUsuario(rows[0] ?? null);
  }

  async buscarPorId(id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM usuarios WHERE id = $1',
      [id],
    );

    return filaAUsuario(rows[0] ?? null);
  }
}

module.exports = UsuarioRepositoryPostgres;
module.exports.filaAUsuario = filaAUsuario;
