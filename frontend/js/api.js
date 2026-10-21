// API Client para comunicación real con el Backend de Contra Arcade

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '4000' ? `${window.location.origin}/api` : 'http://localhost:4000/api')
  : (window.location.origin.startsWith('http') ? `${window.location.origin}/api` : 'http://localhost:4000/api');


class ApiClient {
  static getToken() {
    return localStorage.getItem('contra_jwt_token');
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem('contra_jwt_token', token);
    } else {
      localStorage.removeItem('contra_jwt_token');
    }
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      console.error(`[API Network Error] en ${endpoint}:`, err);
      return {
        ok: false,
        status: 0,
        data: {
          success: false,
          error: 'No se pudo conectar con el servidor de combate. Verifica que el backend esté encendido.'
        }
      };
    }
  }

  // Auth Endpoints
  static async healthCheck() {
    return await this.request('/health', { method: 'GET' });
  }

  static async register(username, email, password) {
    return await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  }

  static async login(loginIdentifier, password) {
    return await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginIdentifier, password })
    });
  }

  static async getMe() {
    return await this.request('/auth/me', {
      method: 'GET'
    });
  }

  // Weapons & Forge Endpoints
  static async getCatalog() {
    return await this.request('/weapons/catalog', {
      method: 'GET'
    });
  }

  static async getInventory() {
    return await this.request('/weapons/inventory', {
      method: 'GET'
    });
  }

  static async equipWeapon(inventoryId) {
    return await this.request('/weapons/equip', {
      method: 'POST',
      body: JSON.stringify({ inventoryId })
    });
  }

  static async acquireWeapon(weaponId) {
    return await this.request('/weapons/acquire', {
      method: 'POST',
      body: JSON.stringify({ weaponId })
    });
  }

  static async upgradeWeapon(inventoryId) {
    return await this.request('/weapons/upgrade', {
      method: 'POST',
      body: JSON.stringify({ inventoryId })
    });
  }

  static async fuseWeapons(inventoryId1, inventoryId2, customName) {
    return await this.request('/weapons/fuse', {
      method: 'POST',
      body: JSON.stringify({ inventoryId1, inventoryId2, customName })
    });
  }

  // Game & Leaderboard Endpoints
  static async recordMatch(matchData) {
    return await this.request('/game/record-match', {
      method: 'POST',
      body: JSON.stringify(matchData)
    });
  }

  static async getLeaderboard(limit = 10, difficulty = null) {
    const query = difficulty ? `?limit=${limit}&difficulty=${difficulty}` : `?limit=${limit}`;
    return await this.request(`/game/leaderboard${query}`, {
      method: 'GET'
    });
  }

  static async getHistory() {
    return await this.request('/game/history', {
      method: 'GET'
    });
  }
}

window.ApiClient = ApiClient;
