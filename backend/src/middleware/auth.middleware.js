const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado. Se requiere token Bearer válido.'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_contra_jwt_key_2026_change_in_production';
    const decoded = jwt.verify(token, secret);
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'El usuario asociado al token ya no existe.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Token inválido o expirado.'
    });
  }
}

module.exports = {
  authenticateToken
};
