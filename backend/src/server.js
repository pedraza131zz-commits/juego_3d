require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { db } = require('./config/database');

// Importación de rutas
const authRoutes = require('./routes/auth.routes');
const weaponRoutes = require('./routes/weapon.routes');
const gameRoutes = require('./routes/game.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/weapons', weaponRoutes);
app.use('/api/game', gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ONLINE',
    game: 'Contra Recon: Jungle Assault',
    phase: 'FASE 2: Entidades Core, Forja y Persistencia de Partidas',
    database: 'SQLite Relacional Real (Sin Mocks)',
    timestamp: new Date().toISOString()
  });
});

// Servir frontend estático
const frontendPath = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Manejo de errores no capturados
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Error inesperado en el servidor.'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` [CONTRA ARCADE] Servidor activo en http://localhost:${PORT}`);
  console.log(` [API HEALTH]    http://localhost:${PORT}/api/health`);
  console.log(` [FRONTEND]      Directorio montado desde: ${frontendPath}`);
  console.log(`=======================================================`);
});

module.exports = app;
