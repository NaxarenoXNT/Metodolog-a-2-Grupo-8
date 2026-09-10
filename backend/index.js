const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/viajes', (req, res) => {
  const viajes = [
    { id: 1, origen: 'Bahía Blanca', destino: 'CABA', asientosDisponibles: 3 },
    { id: 2, origen: 'CABA', destino: 'Bahía Blanca', asientosDisponibles: 1 },
  ];
  res.json(viajes);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});