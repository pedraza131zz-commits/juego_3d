const express = require('express');
const router = express.Router();
const WeaponController = require('../controllers/weapon.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Rutas de catálogo (públicas)
router.get('/catalog', WeaponController.getCatalog);

// Rutas de inventario y forja (protegidas por JWT)
router.get('/inventory', authenticateToken, WeaponController.getInventory);
router.post('/equip', authenticateToken, WeaponController.equip);
router.post('/acquire', authenticateToken, WeaponController.acquire);
router.post('/upgrade', authenticateToken, WeaponController.upgrade);
router.post('/fuse', authenticateToken, WeaponController.fuse);

module.exports = router;
