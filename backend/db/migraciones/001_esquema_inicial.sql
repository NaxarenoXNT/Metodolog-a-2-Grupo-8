CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  telefono VARCHAR(30),
  fecha_registro TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE vehiculos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(20) NOT NULL,
  marca VARCHAR(50),
  modelo VARCHAR(50),
  capacidad_asientos INT NOT NULL CHECK (capacidad_asientos > 0),
  consumo_l_100km NUMERIC(5,2),
  tipo_combustible VARCHAR(20)
);

CREATE TABLE viajes (
  id SERIAL PRIMARY KEY,
  conductor_id INT NOT NULL REFERENCES usuarios(id),
  vehiculo_id INT NOT NULL REFERENCES vehiculos(id),
  fecha_salida TIMESTAMPTZ NOT NULL,
  origen_lat NUMERIC(9,6) NOT NULL,
  origen_lng NUMERIC(9,6) NOT NULL,
  destino_lat NUMERIC(9,6) NOT NULL,
  destino_lng NUMERIC(9,6) NOT NULL,
  distancia_km NUMERIC(8,3),
  asientos_disponibles INT NOT NULL CHECK (asientos_disponibles >= 0),
  modo_division VARCHAR(20) NOT NULL DEFAULT 'iguales',
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
);

CREATE TABLE paradas (
  id SERIAL PRIMARY KEY,
  viaje_id INT NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
  orden INT NOT NULL,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  descripcion VARCHAR(150),
  UNIQUE (viaje_id, orden)
);

CREATE TABLE viaje_pasajeros (
  id SERIAL PRIMARY KEY,
  viaje_id INT NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  km_recorridos NUMERIC(8,3),
  monto_pagar NUMERIC(12,2),
  estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  UNIQUE (viaje_id, usuario_id)
);
