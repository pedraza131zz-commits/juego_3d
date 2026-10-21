const express = require('express');
const router = express.Router();
const GameController = require('../controllers/game.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Registro de partidas y recompensas (protegido)
router.post('/record-match', authenticateToken, GameController.recordMatch);

// Historial del soldado autenticado
router.get('/history', authenticateToken, GameController.getHistory);

// Tabla de clasificación / Leaderboard (público)
router.get('/leaderboard', GameController.getLeaderboard);

module.exports = router;
