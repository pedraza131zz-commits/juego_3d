// Lógica de Autenticación y Coordinación con UI Manager (Fases 1, 2 y 3)

document.addEventListener('DOMContentLoaded', () => {
  // Referencias DOM
  const serverStatusBadge = document.getElementById('server-status-badge');
  const alertContainer = document.getElementById('alert-container');
  const terminalLogs = document.getElementById('terminal-logs');

  // Formularios
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const btnLogout = document.getElementById('btn-logout');

  function logTerminal(message) {
    if (!terminalLogs) return;
    const time = new Date().toLocaleTimeString();
    terminalLogs.innerHTML += `<div>[${time}] ${message}</div>`;
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }

  function showAlert(message, type = 'danger') {
    if (!alertContainer) return;
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        <strong>${type === 'danger' ? 'ALERTA DE COMBATE:' : 'SISTEMA:'}</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    setTimeout(() => {
      alertContainer.innerHTML = '';
    }, 6000);
  }

  async function checkServerHealth() {
    const res = await ApiClient.healthCheck();
    if (res.ok && res.data.success) {
      if (serverStatusBadge) {
        serverStatusBadge.className = 'badge bg-success badge-arcade';
        serverStatusBadge.textContent = 'ONLINE [SERVIDOR CONECTADO]';
      }
      logTerminal('Servidor Backend online. Base de datos SQLite activa.');
      return true;
    } else {
      if (serverStatusBadge) {
        serverStatusBadge.className = 'badge bg-danger badge-arcade';
        serverStatusBadge.textContent = 'OFFLINE [SERVIDOR APAGADO]';
      }
      logTerminal('ERROR: No se detecta backend en el puerto configurado.');
      return false;
    }
  }

  async function checkSession() {
    const token = ApiClient.getToken();
    const viewAuth = document.getElementById('view-auth');
    const viewHQ = document.getElementById('view-hq');

    if (!token) {
      if (viewAuth) viewAuth.classList.remove('d-none');
      if (viewHQ) viewHQ.classList.add('d-none');
      return;
    }

    const res = await ApiClient.getMe();
    if (res.ok && res.data.success) {
      logTerminal(`Sesión activa verificada para ${res.data.data.user.username}`);
      if (window.uiManager) {
        window.uiManager.updateHQ(res.data.data);
      }
    } else {
      ApiClient.setToken(null);
      if (viewAuth) viewAuth.classList.remove('d-none');
      if (viewHQ) viewHQ.classList.add('d-none');
      logTerminal('Token previo caducado o inválido.');
    }
  }

  // Evento Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-id').value.trim();
      const password = document.getElementById('login-pass').value;

      if (!identifier || !password) {
        showAlert('Ingresa usuario/correo y contraseña para acceder.', 'warning');
        return;
      }

      logTerminal(`Intentando autenticación para: ${identifier}...`);
      const res = await ApiClient.login(identifier, password);

      if (res.ok && res.data.success) {
        ApiClient.setToken(res.data.token);
        showAlert(res.data.message || 'Bienvenido a la base de operaciones, recluta.', 'success');
        if (window.soundFX) window.soundFX.playCoin();
        if (window.uiManager) {
          window.uiManager.updateHQ(res.data.data);
        }
      } else {
        showAlert(res.data.error || 'Fallo de autenticación militar.', 'danger');
        logTerminal(`Acceso denegado: ${res.data.error || 'Credenciales inválidas'}`);
        if (window.soundFX) window.soundFX.playHurt();
      }
    });
  }

  // Evento Registro
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-user').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-pass').value;

      if (!username || !email || !password) {
        showAlert('Todos los campos son requeridos para alistar al soldado.', 'warning');
        return;
      }

      logTerminal(`Registrando nuevo soldado: ${username}...`);
      const res = await ApiClient.register(username, email, password);

      if (res.ok && res.data.success) {
        ApiClient.setToken(res.data.token);
        showAlert(res.data.message || 'Reclutamiento completado con éxito.', 'success');
        if (window.soundFX) window.soundFX.playCoin();
        if (window.uiManager) {
          window.uiManager.updateHQ(res.data.data);
        }
      } else {
        showAlert(res.data.error || 'Error al completar el reclutamiento.', 'danger');
        logTerminal(`Fallo en registro: ${res.data.error || 'Error'}`);
        if (window.soundFX) window.soundFX.playHurt();
      }
    });
  }

  // Evento Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      ApiClient.setToken(null);
      const viewAuth = document.getElementById('view-auth');
      const viewHQ = document.getElementById('view-hq');
      const viewGame = document.getElementById('view-game');
      const viewCinematic = document.getElementById('view-cinematic');

      if (viewHQ) viewHQ.classList.add('d-none');
      if (viewGame) viewGame.classList.add('d-none');
      if (viewCinematic) viewCinematic.classList.add('d-none');
      if (viewAuth) viewAuth.classList.remove('d-none');

      logTerminal('Soldado desconectado de la base.');
      showAlert('Has cerrado sesión correctamente.', 'info');
    });
  }

  // Evento Demo Rápida Bill Rizer (HQ)
  const btnQuickDemo = document.getElementById('btn-quick-demo');
  if (btnQuickDemo) {
    btnQuickDemo.addEventListener('click', async () => {
      logTerminal('Cargando credenciales de prueba comando Bill Rizer...');
      const loginIdInput = document.getElementById('login-id');
      const loginPassInput = document.getElementById('login-pass');
      if (loginIdInput) loginIdInput.value = 'BillRizer';
      if (loginPassInput) loginPassInput.value = 'contra123';

      const res = await ApiClient.login('BillRizer', 'contra123');
      if (res.ok && res.data.success) {
        ApiClient.setToken(res.data.token);
        showAlert('Comando Bill Rizer verificado. Accediendo al HQ.', 'success');
        if (window.soundFX) window.soundFX.playCoin();
        if (window.uiManager) {
          window.uiManager.updateHQ(res.data.data);
        }
      } else {
        // Fallback inmediato a combate si no hay conexión
        showAlert('Modo Offline: Desplegando a Bill Rizer en combate directo...', 'warning');
        if (window.uiManager) {
          window.uiManager.startQuickPlay();
        }
      }
    });
  }

  // Inicialización
  checkServerHealth().then(() => {
    checkSession();
  });
});
