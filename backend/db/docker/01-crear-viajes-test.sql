-- Lo ejecuta el contenedor de PostgreSQL (docker-compose.yml) solo la primera
-- vez, cuando el volumen está vacío. La base viajes la crea POSTGRES_DB; acá se
-- agrega la base para los tests. Las tablas de las dos las crea npm run migrate.
CREATE DATABASE viajes_test OWNER grupo8;
