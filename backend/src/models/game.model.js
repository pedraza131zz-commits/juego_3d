const { run, get, all } = require('../config/database');

class GameModel {
  static async recordMatch({ userId, score, coinsEarned, enemiesKilled, difficulty, basesDestroyed = 0 }) {
    // 1. Guardar registro en historial
    const matchResult = await run(
      `INSERT INTO match_scores (user_id, score, coins_earned, enemies_killed, difficulty, bases_destroyed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, score, coinsEarned, enemiesKilled, difficulty, basesDestroyed]
    );

    // 2. Actualizar perfil del jugador
    const currentProfile = await get('SELECT * FROM player_profiles WHERE user_id = ?', [userId]);
    const newCoins = (currentProfile ? currentProfile.coins : 0) + Number(coinsEarned);
    const newGames = (currentProfile ? currentProfile.games_played : 0) + 1;
    const currentHigh = currentProfile ? currentProfile.high_score : 0;
    const isNewRecord = Number(score) > currentHigh;
    const finalHigh = isNewRecord ? Number(score) : currentHigh;

    await run(
      `UPDATE player_profiles 
       SET coins = ?, 
           high_score = ?, 
           games_played = ?, 
           last_difficulty = ?, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [newCoins, finalHigh, newGames, difficulty, userId]
    );

    const updatedProfile = await get('SELECT * FROM player_profiles WHERE user_id = ?', [userId]);

    return {
      matchId: matchResult.id,
      isNewRecord,
      profile: updatedProfile
    };
  }

  static async getLeaderboard(limit = 10, difficulty = null) {
    let sql = `
      SELECT ms.id, ms.score, ms.coins_earned, ms.enemies_killed, ms.difficulty,
             ms.bases_destroyed, ms.played_at, u.username
      FROM match_scores ms
      JOIN users u ON ms.user_id = u.id
    `;
    const params = [];

    if (difficulty) {
      sql += ' WHERE ms.difficulty = ?';
      params.push(difficulty);
    }

    sql += ' ORDER BY ms.score DESC, ms.played_at DESC LIMIT ?';
    params.push(Number(limit));

    return await all(sql, params);
  }

  static async getUserHistory(userId, limit = 10) {
    return await all(
      `SELECT id, score, coins_earned, enemies_killed, difficulty, bases_destroyed, played_at
       FROM match_scores
       WHERE user_id = ?
       ORDER BY played_at DESC
       LIMIT ?`,
      [userId, Number(limit)]
    );
  }
}

module.exports = GameModel;
