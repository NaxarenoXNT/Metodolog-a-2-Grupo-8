class UsuarioRepositoryMemoria {
  constructor(usuarios = []) {
    this.usuarios = structuredClone(usuarios);
    this.proximoId =
      this.usuarios.reduce((maximo, usuario) => Math.max(maximo, usuario.id ?? 0), 0) +
      1;
  }

  async crear({ nombre, email, passwordHash, telefono }) {
    if (this.usuarios.some((usuario) => usuario.email === email)) {
      const error = new Error(`Ya existe un usuario con el email ${email}`);
      error.code = 'EMAIL_YA_REGISTRADO';
      error.statusCode = 409;
      throw error;
    }

    const usuario = {
      id: this.proximoId++,
      nombre,
      email,
      passwordHash,
      telefono: telefono ?? null,
      fechaRegistro: new Date(),
    };

    this.usuarios.push(structuredClone(usuario));
    return structuredClone(usuario);
  }

  async buscarPorEmail(email) {
    const usuario = this.usuarios.find((actual) => actual.email === email);
    return usuario ? structuredClone(usuario) : null;
  }

  async buscarPorId(id) {
    const usuario = this.usuarios.find(
      (actual) => String(actual.id) === String(id),
    );
    return usuario ? structuredClone(usuario) : null;
  }
}

module.exports = UsuarioRepositoryMemoria;
