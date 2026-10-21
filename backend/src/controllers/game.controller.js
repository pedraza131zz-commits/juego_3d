const GameModel = require('../models/game.model');

class GameController {
  static async recordMatch(req, res) {
    try {
      const { score, coinsEarned, enemiesKilled, difficulty, basesDestroyed } = req.body;

      if (score === undefined || coinsEarned === undefined || enemiesKilled === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Datos incompletos de la partida (score, coinsEarned, enemiesKilled requeridos).'
        });
      }

      const validDifficulties = ['facil', 'normal', 'dificil'];
      const chosenDiff = validDifficulties.includes(String(difficulty).toLowerCase())
        ? String(difficulty).toLowerCase()
        : 'normal';

      const result = await GameModel.recordMatch({
        userId: req.user.id,
        score: Math.max(0, Number(score)),
        coinsEarned: Math.max(0, Number(coinsEarned)),
        enemiesKilled: Math.max(0, Number(enemiesKilled)),
        difficulty: chosenDiff,
        basesDestroyed: Number(basesDestroyed) || 0
      });

      return res.status(200).json({
        success: true,
        message: 'Progreso y recompensas de combate guardados en la base de datos.',
        data: result
      });
    } catch (err) {
      console.error('[Record Match Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Error al registrar el reporte de batalla.'
      });
    }
  }

  static async getLeaderboard(req, res) {
    try {
      const limit = Number(req.query.limit) || 10;
      const difficulty = req.query.difficulty || null;
      const leaders = await GameModel.getLeaderboard(limit, difficulty);

      return res.status(200).json({
        success: true,
        data: leaders
      });
    } catch (err) {
      console.error('[Leaderboard Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Error al consultar el ranking militar global.'
      });
    }
  }

  static async getHistory(req, res) {
    try {
      const history = await GameModel.getUserHistory(req.user.id);
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (err) {
      console.error('[History Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Error al consultar el historial de misiones del soldado.'
      });
    }
  }
}

module.exports = GameController;
