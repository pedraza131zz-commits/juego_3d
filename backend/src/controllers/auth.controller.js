const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'super_secret_contra_jwt_key_2026_change_in_production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: user.id, username: user.username, email: user.email }, secret, {
    expiresIn
  });
}

class AuthController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Todos los campos (username, email, password) son obligatorios.'
        });
      }

      const trimmedUser = String(username).trim();
      const trimmedEmail = String(email).trim().toLowerCase();

      if (trimmedUser.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario debe tener al menos 3 caracteres.'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener un mínimo de 6 caracteres.'
        });
      }

      const existingEmail = await UserModel.findByEmail(trimmedEmail);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'El correo electrónico ya se encuentra registrado.'
        });
      }

      const existingUsername = await UserModel.findByUsername(trimmedUser);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          error: 'El nombre de usuario ya está en uso.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await UserModel.create({
        username: trimmedUser,
        email: trimmedEmail,
        passwordHash
      });

      const token = generateToken(newUser);
      const profileData = await UserModel.getFullProfile(newUser.id);

      return res.status(201).json({
        success: true,
        message: 'Recluta registrado exitosamente. Perfil de combate inicializado.',
        token,
        data: profileData
      });
    } catch (err) {
      console.error('[Register Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Error interno en el servidor al procesar el registro.'
      });
    }
  }

  static async login(req, res) {
    try {
      const { loginIdentifier, password } = req.body;

      if (!loginIdentifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Debe ingresar su usuario o email, junto con su contraseña.'
        });
      }

      const identifier = String(loginIdentifier).trim();
      let user = await UserModel.findByEmail(identifier.toLowerCase());
      if (!user) {
        user = await UserModel.findByUsername(identifier);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas. Usuario no encontrado.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas. Contraseña incorrecta.'
        });
      }

      const token = generateToken(user);
      const profileData = await UserModel.getFullProfile(user.id);

      return res.status(200).json({
        success: true,
        message: 'Sesión iniciada correctamente. Bienvenido soldado.',
        token,
        data: profileData
      });
    } catch (err) {
      console.error('[Login Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Error interno en el servidor al procesar el inicio de sesión.'
      });
    }
  }

  static async me(req, res) {
    try {
      const profileData = await UserModel.getFullProfile(req.user.id);
      return res.status(200).json({
        success: true,
        data: profileData
      });
    } catch (err) {
      console.error('[Me Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Error al consultar perfil del jugador.'
      });
    }
  }
}

module.exports = AuthController;
