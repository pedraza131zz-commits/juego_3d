const { run, get, all } = require('../config/database');

class WeaponModel {
  static async getAllCatalog() {
    return await all('SELECT * FROM weapons WHERE is_custom = 0 ORDER BY cost ASC');
  }

  static async getById(weaponId) {
    return await get('SELECT * FROM weapons WHERE id = ?', [weaponId]);
  }

  static async getUserInventory(userId) {
    return await all(
      `SELECT pi.id as inventory_id, pi.is_equipped, pi.mod_level, pi.damage_bonus, pi.fire_rate_bonus,
              (w.damage + pi.damage_bonus) as total_damage,
              (w.fire_rate + pi.fire_rate_bonus) as total_fire_rate,
              w.id as weapon_id, w.code, w.name, w.type, w.bullet_speed, w.spread_count,
              w.bullet_color, w.cost, w.is_custom, w.description, pi.acquired_at
       FROM player_inventory pi
       JOIN weapons w ON pi.weapon_id = w.id
       WHERE pi.user_id = ?
       ORDER BY pi.is_equipped DESC, pi.mod_level DESC`,
      [userId]
    );
  }

  static async getInventoryItem(userId, inventoryId) {
    return await get(
      `SELECT pi.id as inventory_id, pi.user_id, pi.weapon_id, pi.is_equipped, pi.mod_level,
              pi.damage_bonus, pi.fire_rate_bonus,
              w.name, w.type, w.damage, w.fire_rate, w.bullet_speed, w.spread_count, w.bullet_color, w.description
       FROM player_inventory pi
       JOIN weapons w ON pi.weapon_id = w.id
       WHERE pi.user_id = ? AND pi.id = ?`,
      [userId, inventoryId]
    );
  }

  static async equipWeapon(userId, inventoryId) {
    const item = await this.getInventoryItem(userId, inventoryId);
    if (!item) {
      throw new Error('El arma especificada no se encuentra en el inventario del soldado.');
    }

    // Desequipar todas
    await run('UPDATE player_inventory SET is_equipped = 0 WHERE user_id = ?', [userId]);

    // Equipar la seleccionada
    await run('UPDATE player_inventory SET is_equipped = 1 WHERE user_id = ? AND id = ?', [
      userId,
      inventoryId
    ]);

    return await this.getUserInventory(userId);
  }

  static async acquireWeapon(userId, weaponId) {
    const weapon = await this.getById(weaponId);
    if (!weapon) {
      throw new Error('Arma militar no encontrada en el catálogo reglamentario.');
    }

    // Verificar si ya la tiene en inventario
    const alreadyOwned = await get(
      'SELECT id FROM player_inventory WHERE user_id = ? AND weapon_id = ?',
      [userId, weaponId]
    );
    if (alreadyOwned) {
      throw new Error('El soldado ya posee este modelo de armamento en su arsenal.');
    }

    // Consultar monedas del jugador
    const profile = await get('SELECT coins FROM player_profiles WHERE user_id = ?', [userId]);
    const userCoins = profile ? profile.coins : 0;

    if (userCoins < weapon.cost) {
      throw new Error(`Fondos insuficientes. Se requieren ${weapon.cost} monedas y posees ${userCoins}.`);
    }

    // Descontar monedas
    await run('UPDATE player_profiles SET coins = coins - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [
      weapon.cost,
      userId
    ]);

    // Insertar en inventario
    const result = await run(
      'INSERT INTO player_inventory (user_id, weapon_id, is_equipped, mod_level, damage_bonus, fire_rate_bonus) VALUES (?, ?, 0, 1, 0, 0)',
      [userId, weapon.id]
    );

    const updatedProfile = await get('SELECT coins FROM player_profiles WHERE user_id = ?', [userId]);
    const inventory = await this.getUserInventory(userId);

    return {
      inventoryId: result.id,
      weapon,
      remainingCoins: updatedProfile.coins,
      inventory
    };
  }

  static async upgradeWeapon(userId, inventoryId) {
    const item = await this.getInventoryItem(userId, inventoryId);
    if (!item) {
      throw new Error('Arma no encontrada en tu inventario.');
    }

    const upgradeCost = item.mod_level * 50;
    const profile = await get('SELECT coins FROM player_profiles WHERE user_id = ?', [userId]);
    const userCoins = profile ? profile.coins : 0;

    if (userCoins < upgradeCost) {
      throw new Error(
        `Monedas insuficientes para calibrar el arma a nivel ${item.mod_level + 1}. Costo: ${upgradeCost}, tienes: ${userCoins}.`
      );
    }

    // Descontar monedas
    await run('UPDATE player_profiles SET coins = coins - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [
      upgradeCost,
      userId
    ]);

    // Aumentar nivel y estadísticas
    await run(
      `UPDATE player_inventory 
       SET mod_level = mod_level + 1,
           damage_bonus = damage_bonus + 6.0,
           fire_rate_bonus = fire_rate_bonus + 0.35
       WHERE id = ? AND user_id = ?`,
      [inventoryId, userId]
    );

    const updatedItem = await this.getInventoryItem(userId, inventoryId);
    const updatedProfile = await get('SELECT coins FROM player_profiles WHERE user_id = ?', [userId]);

    return {
      upgradedItem: updatedItem,
      costPaid: upgradeCost,
      remainingCoins: updatedProfile.coins
    };
  }

  static async fuseWeapons(userId, inventoryId1, inventoryId2, customName) {
    if (inventoryId1 === inventoryId2) {
      throw new Error('Debes seleccionar dos armas distintas de tu inventario para forjar un híbrido.');
    }

    const item1 = await this.getInventoryItem(userId, inventoryId1);
    const item2 = await this.getInventoryItem(userId, inventoryId2);

    if (!item1 || !item2) {
      throw new Error('Una o ambas armas seleccionadas no pertenecen a tu arsenal.');
    }

    const forgeCost = 100;
    const profile = await get('SELECT coins FROM player_profiles WHERE user_id = ?', [userId]);
    const userCoins = profile ? profile.coins : 0;

    if (userCoins < forgeCost) {
      throw new Error(`La forja militar requiere ${forgeCost} monedas para ensamblado de aleación. Tienes: ${userCoins}.`);
    }

    // Calcular estadísticas combinadas del híbrido
    const totalDmg1 = item1.damage + item1.damage_bonus;
    const totalDmg2 = item2.damage + item2.damage_bonus;
    const hybridDamage = Math.round((totalDmg1 + totalDmg2) * 0.72);

    const totalFR1 = item1.fire_rate + item1.fire_rate_bonus;
    const totalFR2 = item2.fire_rate + item2.fire_rate_bonus;
    const hybridFireRate = Number(((totalFR1 + totalFR2) / 2).toFixed(2));

    const hybridSpeed = Math.round(Math.max(item1.bullet_speed, item2.bullet_speed) * 1.05);
    const hybridSpread = Math.max(item1.spread_count, item2.spread_count, 3);

    const defaultHybridName = customName && customName.trim()
      ? customName.trim()
      : `Híbrido Táctico: ${item1.name} x ${item2.name}`;

    const uniqueCode = `fused_${Date.now()}_${userId}`;
    const description = `Arma forjada experimental creada a partir de ${item1.name} y ${item2.name}. Proyectiles en racimo amplificado.`;

    // Descontar monedas
    await run('UPDATE player_profiles SET coins = coins - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [
      forgeCost,
      userId
    ]);

    // Registrar nueva arma en catálogo
    const newWeaponResult = await run(
      `INSERT INTO weapons (code, name, type, damage, fire_rate, bullet_speed, spread_count, bullet_color, cost, is_custom, description)
       VALUES (?, ?, 'hybrid', ?, ?, ?, ?, '#ff00ff', 0, 1, ?)`,
      [uniqueCode, defaultHybridName, hybridDamage, hybridFireRate, hybridSpeed, hybridSpread, description]
    );

    // Otorgar al inventario del soldado
    const newInventoryResult = await run(
      `INSERT INTO player_inventory (user_id, weapon_id, is_equipped, mod_level, damage_bonus, fire_rate_bonus)
       VALUES (?, ?, 0, 1, 0, 0)`,
      [userId, newWeaponResult.id]
    );

    const updatedProfile = await get('SELECT coins FROM player_profiles WHERE user_id = ?', [userId]);
    const fullInventory = await this.getUserInventory(userId);

    return {
      message: 'Forja completada con éxito en la armería.',
      forgedWeapon: {
        id: newWeaponResult.id,
        code: uniqueCode,
        name: defaultHybridName,
        damage: hybridDamage,
        fire_rate: hybridFireRate,
        bullet_speed: hybridSpeed,
        spread_count: hybridSpread,
        bullet_color: '#ff00ff'
      },
      inventoryId: newInventoryResult.id,
      costPaid: forgeCost,
      remainingCoins: updatedProfile.coins,
      inventory: fullInventory
    };
  }
}

module.exports = WeaponModel;
