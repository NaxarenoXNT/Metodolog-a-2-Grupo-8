const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const crearApp = require('../src/app');
const UsuarioRepositoryMemoria = require('../src/repositories/usuario.repository.memoria');
const {
  JWT_SECRET_PRUEBAS,
  crearUsuario,
  crearToken,
  bearer,
} = require('../test-helpers/auth');

function crearContexto() {
  const usuarioRepository = new UsuarioRepositoryMemoria();
  const app = crearApp({
    jwtSecret: JWT_SECRET_PRUEBAS,
    usuarioRepository,
  });
  return { app, usuarioRepository };
}

const REGISTRO = {
  nombre: 'Ana Pérez',
  email: 'ana@example.com',
  password: 'clave-segura',
  telefono: '291 555-0101',
};

describe('POST /api/auth/registro', () => {
  test('registra con bcrypt de 10 rondas y devuelve un JWT de 24 horas', async () => {
    const { app, usuarioRepository } = crearContexto();

    const respuesta = await request(app)
      .post('/api/auth/registro')
      .send(REGISTRO)
      .expect(201);

    assert.equal(respuesta.body.usuario.nombre, REGISTRO.nombre);
    assert.equal(respuesta.body.usuario.email, REGISTRO.email);
    assert.equal(respuesta.body.usuario.telefono, REGISTRO.telefono);
    assert.equal('passwordHash' in respuesta.body.usuario, false);
    assert.equal('password' in respuesta.body.usuario, false);

    const guardado = await usuarioRepository.buscarPorEmail(REGISTRO.email);
    assert.equal(await bcrypt.compare(REGISTRO.password, guardado.passwordHash), true);
    assert.equal(bcrypt.getRounds(guardado.passwordHash), 10);

    const payload = jwt.verify(respuesta.body.token, JWT_SECRET_PRUEBAS);
    assert.deepEqual(
      { id: payload.id, nombre: payload.nombre, email: payload.email },
      {
        id: respuesta.body.usuario.id,
        nombre: REGISTRO.nombre,
        email: REGISTRO.email,
      },
    );
    assert.equal(payload.exp - payload.iat, 24 * 60 * 60);
  });

  test('normaliza el email y rechaza duplicados sin exponer el hash', async () => {
    const { app } = crearContexto();

    const primera = await request(app)
      .post('/api/auth/registro')
      .send({ ...REGISTRO, email: '  ANA@EXAMPLE.COM ' })
      .expect(201);
    const duplicada = await request(app)
      .post('/api/auth/registro')
      .send(REGISTRO)
      .expect(409);

    assert.equal(primera.body.usuario.email, REGISTRO.email);
    assert.equal(JSON.stringify(primera.body).includes('passwordHash'), false);
    assert.equal(duplicada.body.error, 'EMAIL_YA_REGISTRADO');
  });

  test('valida los campos obligatorios', async () => {
    const { app } = crearContexto();

    const respuesta = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: ' ', email: 'invalido', password: '' })
      .expect(400);

    assert.equal(respuesta.body.error, 'SOLICITUD_INVALIDA');
    assert.deepEqual(respuesta.body.detalles, [
      'nombre es obligatorio',
      'email debe tener un formato válido',
      'password es obligatorio',
    ]);
  });
});

describe('POST /api/auth/login', () => {
  test('inicia sesión con las credenciales correctas sin devolver passwordHash', async () => {
    const { app } = crearContexto();
    const registro = await request(app)
      .post('/api/auth/registro')
      .send(REGISTRO)
      .expect(201);

    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ email: REGISTRO.email, password: REGISTRO.password })
      .expect(200);

    assert.equal(respuesta.body.usuario.id, registro.body.usuario.id);
    assert.equal('passwordHash' in respuesta.body.usuario, false);
    assert.ok(respuesta.body.token);
  });

  test('usa CREDENCIALES_INVALIDAS para email o contraseña incorrectos', async () => {
    const { app } = crearContexto();
    await request(app).post('/api/auth/registro').send(REGISTRO).expect(201);

    for (const credenciales of [
      { email: REGISTRO.email, password: 'incorrecta' },
      { email: 'nadie@example.com', password: REGISTRO.password },
      { email: '', password: '' },
    ]) {
      const respuesta = await request(app)
        .post('/api/auth/login')
        .send(credenciales)
        .expect(401);
      assert.equal(respuesta.body.error, 'CREDENCIALES_INVALIDAS');
    }
  });
});

describe('GET /api/auth/yo y middleware requiereAuth', () => {
  test('devuelve id, nombre y email del token válido', async () => {
    const { app } = crearContexto();
    const usuario = crearUsuario(7, {
      nombre: 'Usuario autenticado',
      email: 'autenticado@example.com',
    });

    const respuesta = await request(app)
      .get('/api/auth/yo')
      .set('Authorization', bearer(usuario))
      .expect(200);

    assert.deepEqual(respuesta.body, usuario);
  });

  test('distingue token ausente de token inválido o vencido', async () => {
    const { app } = crearContexto();
    const usuario = crearUsuario(7);
    const vencido = crearToken(usuario, { expiresIn: -1 });

    const sinToken = await request(app).get('/api/auth/yo').expect(401);
    assert.equal(sinToken.body.error, 'NO_AUTENTICADO');

    for (const authorization of [
      'Token valor',
      'Bearer token-invalido',
      `Bearer ${vencido}`,
    ]) {
      const respuesta = await request(app)
        .get('/api/auth/yo')
        .set('Authorization', authorization)
        .expect(401);
      assert.equal(respuesta.body.error, 'TOKEN_INVALIDO');
    }
  });
});

test('el middleware de errores oculta códigos internos en respuestas 5xx', async () => {
  const authService = {
    async registrar() {
      const error = new Error('violación not-null');
      error.code = '23502';
      error.statusCode = 500;
      error.detalles = ['nombre de columna interno'];
      throw error;
    },
    async login() {
      throw new Error('no se usa');
    },
  };
  const app = crearApp({
    jwtSecret: JWT_SECRET_PRUEBAS,
    authService,
  });

  const respuesta = await request(app)
    .post('/api/auth/registro')
    .send(REGISTRO)
    .expect(500);

  assert.deepEqual(respuesta.body, {
    error: 'ERROR_INTERNO',
    mensaje: 'Ocurrió un error interno en el servidor',
  });
});

describe('UsuarioRepositoryMemoria', () => {
  test('cumple el contrato async y devuelve copias', async () => {
    const repositorio = new UsuarioRepositoryMemoria();
    const promesa = repositorio.crear({
      nombre: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hash',
    });
    assert.equal(promesa instanceof Promise, true);

    const usuario = await promesa;
    usuario.nombre = 'Modificado';
    assert.equal((await repositorio.buscarPorId(usuario.id)).nombre, 'Ana');
    assert.equal(await repositorio.buscarPorId(999), null);
  });
});
