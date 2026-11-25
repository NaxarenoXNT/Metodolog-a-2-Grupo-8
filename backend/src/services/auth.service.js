const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const RONDAS_BCRYPT = 10;
const VENCIMIENTO_TOKEN = '24h';

function crearError(mensaje, statusCode, code, detalles) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  if (detalles?.length) {
    error.detalles = detalles;
  }
  return error;
}

function usuarioPublico(usuario) {
  if (!usuario) {
    return null;
  }

  const { passwordHash, ...publico } = usuario;
  return publico;
}

class AuthService {
  constructor({ usuarioRepository, jwtSecret } = {}) {
    if (!usuarioRepository) {
      throw new Error('AuthService necesita un repositorio de usuarios');
    }
    if (typeof jwtSecret !== 'string' || !jwtSecret.trim()) {
      throw new Error('AuthService necesita JWT_SECRET');
    }

    this.usuarioRepository = usuarioRepository;
    this.jwtSecret = jwtSecret;
  }

  async registrar(datos = {}) {
    const registro = normalizarRegistro(datos);
    const passwordHash = await bcrypt.hash(registro.password, RONDAS_BCRYPT);
    const usuario = await this.usuarioRepository.crear({
      nombre: registro.nombre,
      email: registro.email,
      passwordHash,
      telefono: registro.telefono,
    });

    return this.crearSesion(usuario);
  }

  async login(datos = {}) {
    const credenciales = normalizarCredenciales(datos);
    const usuario = await this.usuarioRepository.buscarPorEmail(
      credenciales.email,
    );
    const coincide =
      usuario &&
      typeof usuario.passwordHash === 'string' &&
      (await bcrypt.compare(credenciales.password, usuario.passwordHash));

    if (!coincide) {
      throw crearError(
        'El email o la contraseña son incorrectos',
        401,
        'CREDENCIALES_INVALIDAS',
      );
    }

    return this.crearSesion(usuario);
  }

  crearSesion(usuario) {
    const publico = usuarioPublico(usuario);
    const identidad = {
      id: publico.id,
      nombre: publico.nombre,
      email: publico.email,
    };
    const token = jwt.sign(identidad, this.jwtSecret, {
      expiresIn: VENCIMIENTO_TOKEN,
    });

    return { usuario: publico, token };
  }
}

function normalizarRegistro(datos) {
  const entrada = objetoOEntradaVacia(datos);
  const detalles = [];
  const nombre = textoObligatorio(entrada.nombre, 'nombre', detalles);
  const email = normalizarEmail(entrada.email, detalles);
  const password = textoObligatorio(entrada.password, 'password', detalles, {
    recortar: false,
  });
  const telefono = textoOpcional(entrada.telefono, 'telefono', detalles);

  if (detalles.length > 0) {
    throw crearError('Los datos de registro no son válidos', 400, null, detalles);
  }

  return { nombre, email, password, telefono };
}

function normalizarCredenciales(datos) {
  const entrada = objetoOEntradaVacia(datos);
  const detalles = [];
  const email = normalizarEmail(entrada.email, detalles);
  const password = textoObligatorio(entrada.password, 'password', detalles, {
    recortar: false,
  });

  if (detalles.length > 0) {
    throw crearError(
      'El email o la contraseña son incorrectos',
      401,
      'CREDENCIALES_INVALIDAS',
    );
  }

  return { email, password };
}

function objetoOEntradaVacia(valor) {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
}

function textoObligatorio(valor, campo, detalles, { recortar = true } = {}) {
  if (typeof valor !== 'string' || !valor.trim()) {
    detalles.push(`${campo} es obligatorio`);
    return '';
  }

  return recortar ? valor.trim() : valor;
}

function normalizarEmail(valor, detalles) {
  const email = textoObligatorio(valor, 'email', detalles).toLowerCase();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    detalles.push('email debe tener un formato válido');
  }

  return email;
}

function textoOpcional(valor, campo, detalles) {
  if (valor === undefined || valor === null) {
    return undefined;
  }
  if (typeof valor !== 'string' || !valor.trim()) {
    detalles.push(`${campo} debe ser un texto no vacío`);
    return undefined;
  }
  return valor.trim();
}

module.exports = AuthService;
module.exports.usuarioPublico = usuarioPublico;
module.exports.RONDAS_BCRYPT = RONDAS_BCRYPT;
module.exports.VENCIMIENTO_TOKEN = VENCIMIENTO_TOKEN;
