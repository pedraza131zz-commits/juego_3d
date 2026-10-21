const WeaponModel = require('../models/weapon.model');

class WeaponController {
  static async getCatalog(req, res) {
    try {
      const catalog = await WeaponModel.getAllCatalog();
      return res.status(200).json({
        success: true,
        data: catalog
      });
    } catch (err) {
      console.error('[Catalog Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Error al consultar el catálogo de armas reglamentarias.'
      });
    }
  }

  static async getInventory(req, res) {
    try {
      const inventory = await WeaponModel.getUserInventory(req.user.id);
      return res.status(200).json({
        success: true,
        data: inventory
      });
    } catch (err) {
      console.error('[Inventory Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Error al consultar el inventario del soldado.'
      });
    }
  }

  static async equip(req, res) {
    try {
      const { inventoryId } = req.body;
      if (!inventoryId) {
        return res.status(400).json({
          success: false,
          error: 'Debe especificar el inventoryId del arma a equipar.'
        });
      }

      const updatedInventory = await WeaponModel.equipWeapon(req.user.id, Number(inventoryId));
      return res.status(200).json({
        success: true,
        message: 'Arma equipada en la ranura principal de combate.',
        data: updatedInventory
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  static async acquire(req, res) {
    try {
      const { weaponId } = req.body;
      if (!weaponId) {
        return res.status(400).json({
          success: false,
          error: 'Debe especificar el weaponId a adquirir del catálogo.'
        });
      }

      const result = await WeaponModel.acquireWeapon(req.user.id, Number(weaponId));
      return res.status(201).json({
        success: true,
        message: `Armamento ${result.weapon.name} adquirido exitosamente.`,
        data: result
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  static async upgrade(req, res) {
    try {
      const { inventoryId } = req.body;
      if (!inventoryId) {
        return res.status(400).json({
          success: false,
          error: 'Debe especificar el inventoryId a mejorar/calibrar.'
        });
      }

      const result = await WeaponModel.upgradeWeapon(req.user.id, Number(inventoryId));
      return res.status(200).json({
        success: true,
        message: `Arma calibrada a Nivel ${result.upgradedItem.mod_level}. Daño incrementado.`,
        data: result
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  static async fuse(req, res) {
    try {
      const { inventoryId1, inventoryId2, customName } = req.body;
      if (!inventoryId1 || !inventoryId2) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren inventoryId1 e inventoryId2 para fusionar en la forja.'
        });
      }

      const result = await WeaponModel.fuseWeapons(
        req.user.id,
        Number(inventoryId1),
        Number(inventoryId2),
        customName
      );

      return res.status(201).json({
        success: true,
        message: '¡Forja completada! Nueva arma híbrida agregada a tu arsenal.',
        data: result
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }
}

module.exports = WeaponController;
