const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/contra_game.sqlite';
const resolvedDbPath = path.resolve(__dirname, '../../', dbPath);
const dbDir = path.dirname(resolvedDbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(resolvedDbPath, (err) => {
  if (err) {
    console.error('[DB Error] No se pudo conectar a SQLite:', err.message);
  } else {
    console.log(`[DB] Conectado exitosamente a la base de datos real: ${resolvedDbPath}`);
    initializeSchema();
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initializeSchema() {
  try {
    // 1. Tabla de usuarios
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Perfil y estadísticas del jugador
    await run(`
      CREATE TABLE IF NOT EXISTS player_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        coins INTEGER DEFAULT 0,
        high_score INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        last_difficulty TEXT DEFAULT 'normal',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 3. Catálogo base de armas
    await run(`
      CREATE TABLE IF NOT EXISTS weapons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        damage REAL NOT NULL,
        fire_rate REAL NOT NULL,
        bullet_speed REAL NOT NULL,
        spread_count INTEGER DEFAULT 1,
        bullet_color TEXT DEFAULT '#ffcc00',
        cost INTEGER DEFAULT 0,
        is_custom INTEGER DEFAULT 0,
        description TEXT
      )
    `);

    // Verificar si las columnas cost e is_custom existen en bases de datos ya creadas
    try {
      await run(`ALTER TABLE weapons ADD COLUMN cost INTEGER DEFAULT 0`);
    } catch (_) {}
    try {
      await run(`ALTER TABLE weapons ADD COLUMN is_custom INTEGER DEFAULT 0`);
    } catch (_) {}

    // 4. Inventario del jugador
    await run(`
      CREATE TABLE IF NOT EXISTS player_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        weapon_id INTEGER NOT NULL,
        is_equipped INTEGER DEFAULT 0,
        mod_level INTEGER DEFAULT 1,
        damage_bonus REAL DEFAULT 0,
        fire_rate_bonus REAL DEFAULT 0,
        acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (weapon_id) REFERENCES weapons(id) ON DELETE CASCADE
      )
    `);

    // 5. Historial de partidas y marcadores
    await run(`
      CREATE TABLE IF NOT EXISTS match_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        coins_earned INTEGER NOT NULL,
        enemies_killed INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        bases_destroyed INTEGER DEFAULT 0,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Actualizar o sembrar armas del catálogo
    const weaponsToSeed = [
      {
        code: 'rifle_std',
        name: 'Fusil Asalto Contra',
        type: 'rifle',
        damage: 25.0,
        fire_rate: 5.0,
        bullet_speed: 650.0,
        spread_count: 1,
        bullet_color: '#ffea00',
        cost: 0,
        description: 'Arma reglamentaria de infanteria con disparo lineal constante'
      },
      {
        code: 'spread_gun',
        name: 'Spread Gun Quíntuple',
        type: 'spread',
        damage: 22.0,
        fire_rate: 3.5,
        bullet_speed: 600.0,
        spread_count: 5,
        bullet_color: '#ff3366',
        cost: 150,
        description: 'Disparo en abanico legendario de 5 proyectiles de amplio alcance'
      },
      {
        code: 'laser_beam',
        name: 'Cañón Láser Concentrado',
        type: 'laser',
        damage: 60.0,
        fire_rate: 2.2,
        bullet_speed: 900.0,
        spread_count: 1,
        bullet_color: '#00ffff',
        cost: 250,
        description: 'Rayo perforante continuo de alta energía destructiva'
      },
      {
        code: 'rocket_pod',
        name: 'Lanza-Cohetes Explosivo',
        type: 'rocket',
        damage: 110.0,
        fire_rate: 1.2,
        bullet_speed: 450.0,
        spread_count: 1,
        bullet_color: '#ff6600',
        cost: 350,
        description: 'Proyectiles de alto impacto con daño de área por explosión'
      },
      {
        code: 'plasma_shotgun',
        name: 'Escopeta de Plasma Pesada',
        type: 'shotgun',
        damage: 35.0,
        fire_rate: 2.8,
        bullet_speed: 550.0,
        spread_count: 3,
        bullet_color: '#a855f7',
        cost: 200,
        description: 'Triple disparo disperso de plasma caliente devastador a corta distancia'
      }
    ];

    for (const w of weaponsToSeed) {
      const existing = await get('SELECT id FROM weapons WHERE code = ?', [w.code]);
      if (!existing) {
        await run(`
          INSERT INTO weapons (code, name, type, damage, fire_rate, bullet_speed, spread_count, bullet_color, cost, is_custom, description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `, [w.code, w.name, w.type, w.damage, w.fire_rate, w.bullet_speed, w.spread_count, w.bullet_color, w.cost, w.description]);
      } else {
        await run(`UPDATE weapons SET cost = ? WHERE id = ?`, [w.cost, existing.id]);
      }
    }

    console.log('[DB] Catálogo de armamento actualizado con costos de forja.');
  } catch (err) {
    console.error('[DB Schema Error]:', err.message);
  }
}

module.exports = {
  db,
  run,
  get,
  all
};
