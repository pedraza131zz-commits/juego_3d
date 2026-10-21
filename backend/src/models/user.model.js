const { run, get, all } = require('../config/database');

class UserModel {
  static async findByEmail(email) {
    return await get('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async findByUsername(username) {
    return await get('SELECT * FROM users WHERE username = ?', [username]);
  }

  static async findById(id) {
    return await get('SELECT id, username, email, created_at FROM users WHERE id = ?', [id]);
  }

  static async create({ username, email, passwordHash }) {
    const userResult = await run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    const userId = userResult.id;

    // Crear perfil inicial con 100 monedas de bienvenida y récord 0
    await run(
      'INSERT INTO player_profiles (user_id, coins, high_score, games_played, last_difficulty) VALUES (?, ?, ?, ?, ?)',
      [userId, 100, 0, 0, 'normal']
    );

    // Otorgar arma inicial (Fusil Asalto) equipada
    const defaultWeapon = await get('SELECT id FROM weapons WHERE code = ?', ['rifle_std']);
    if (defaultWeapon) {
      await run(
        'INSERT INTO player_inventory (user_id, weapon_id, is_equipped, mod_level) VALUES (?, ?, 1, 1)',
        [userId, defaultWeapon.id]
      );
    }

    return await this.findById(userId);
  }

  static async getFullProfile(userId) {
    const user = await this.findById(userId);
    if (!user) return null;

    const profile = await get('SELECT * FROM player_profiles WHERE user_id = ?', [userId]);
    const inventory = await all(
      `SELECT pi.id as inventory_id, pi.is_equipped, pi.mod_level, pi.damage_bonus, pi.fire_rate_bonus,
              w.id as weapon_id, w.code, w.name, w.type, w.damage, w.fire_rate, w.bullet_speed, w.spread_count, w.bullet_color, w.description
       FROM player_inventory pi
       JOIN weapons w ON pi.weapon_id = w.id
       WHERE pi.user_id = ?`,
      [userId]
    );

    return {
      user,
      profile: profile || { coins: 0, high_score: 0, games_played: 0 },
      inventory: inventory || []
    };
  }
}

module.exports = UserModel;
