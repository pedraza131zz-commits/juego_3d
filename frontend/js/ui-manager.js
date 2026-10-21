// Gestor de Interfaz de Usuario Táctica, Menús, HUD, Forja y Flujo de Misión

class UIManager {
  constructor() {
    this.currentDifficulty = 'normal';
    this.activeWeapon = null;
    this.userProfile = null;
    this.inventory = [];
    this.catalog = [];
    this.isPaused = false;
    this.gameScore = 0;
    this.gameCoins = 0;
    this.playerLives = 3;
    this.baseProgress = 0; // 0% a 100% hasta la base enemiga

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Vistas principales
    this.viewAuth = document.getElementById('view-auth');
    this.viewHQ = document.getElementById('view-hq');
    this.viewCinematic = document.getElementById('view-cinematic');
    this.viewGame = document.getElementById('view-game');

    // Modales de Bootstrap
    this.modalPauseEl = document.getElementById('modal-pause');
    this.modalPause = this.modalPauseEl ? new bootstrap.Modal(this.modalPauseEl) : null;

    this.modalForgeEl = document.getElementById('modal-forge');
    this.modalForge = this.modalForgeEl ? new bootstrap.Modal(this.modalForgeEl) : null;

    this.modalLeaderboardEl = document.getElementById('modal-leaderboard');
    this.modalLeaderboard = this.modalLeaderboardEl ? new bootstrap.Modal(this.modalLeaderboardEl) : null;

    this.modalGameOverEl = document.getElementById('modal-game-over');
    this.modalGameOver = this.modalGameOverEl ? new bootstrap.Modal(this.modalGameOverEl) : null;

    // HUD Elements
    this.hudLivesContainer = document.getElementById('hud-lives');
    this.hudScore = document.getElementById('hud-score');
    this.hudCoins = document.getElementById('hud-coins');
    this.hudWeaponName = document.getElementById('hud-weapon-name');
    this.hudWeaponStats = document.getElementById('hud-weapon-stats');
    this.hudWeaponType = document.getElementById('hud-weapon-type');
    this.hudBaseProgress = document.getElementById('hud-base-progress');
    this.hudDifficulty = document.getElementById('hud-difficulty');

    // HQ Elements
    this.hqUsername = document.getElementById('hq-username');
    this.hqCoins = document.getElementById('hq-coins');
    this.hqHighScore = document.getElementById('hq-highscore');
    this.hqGames = document.getElementById('hq-games');
    this.hqInventoryList = document.getElementById('hq-inventory-list');
    this.hqCatalogList = document.getElementById('hq-catalog-list');

    // Forge Selectors
    this.forgeWeapon1Select = document.getElementById('forge-weapon-1');
    this.forgeWeapon2Select = document.getElementById('forge-weapon-2');
    this.forgeCustomNameInput = document.getElementById('forge-custom-name');
    this.btnConfirmForge = document.getElementById('btn-confirm-forge');

    // Botones de acción
    this.btnDeploy = document.getElementById('btn-deploy-mission');
    this.btnOpenForge = document.getElementById('btn-open-forge');
    this.btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
    this.btnPauseGame = document.getElementById('btn-pause-game');
    this.btnResumeGame = document.getElementById('btn-resume-game');
    this.btnQuitGame = document.getElementById('btn-quit-game');
    this.btnSaveGame = document.getElementById('btn-save-game');
    this.btnRestartGame = document.getElementById('btn-restart-game');
    this.btnSkipCinematic = document.getElementById('btn-skip-cinematic');
    this.btnMuteToggle = document.getElementById('btn-mute-toggle');
  }

  bindEvents() {
    // Selector de Dificultad
    const difficultyRadios = document.querySelectorAll('input[name="radioDifficulty"]');
    difficultyRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this.currentDifficulty = e.target.value;
        this.showToast(`Dificultad de combate ajustada: ${this.currentDifficulty.toUpperCase()}`, 'info');
      });
    });

    // Despliegue en la Selva
    if (this.btnDeploy) {
      this.btnDeploy.addEventListener('click', () => this.startDeploymentFlow());
    }

    // Botones de Despliegue Rápido 3D
    const btnQuick = document.getElementById('btn-quick-play');
    if (btnQuick) {
      btnQuick.addEventListener('click', () => this.startQuickPlay(false));
    }
    const btnQuickHeader = document.getElementById('btn-quick-play-header');
    if (btnQuickHeader) {
      btnQuickHeader.addEventListener('click', () => this.startQuickPlay(false));
    }

    // Saltar Cinemática
    if (this.btnSkipCinematic) {
      this.btnSkipCinematic.addEventListener('click', () => {
        if (this.cinematic) this.cinematic.skip();
      });
    }

    // Botón de Forja
    if (this.btnOpenForge) {
      this.btnOpenForge.addEventListener('click', () => this.populateForgeModal());
    }

    if (this.btnConfirmForge) {
      this.btnConfirmForge.addEventListener('click', () => this.handleForgeSubmit());
    }

    // Botón de Leaderboard
    if (this.btnOpenLeaderboard) {
      this.btnOpenLeaderboard.addEventListener('click', () => this.loadLeaderboard());
    }

    // Control de Pausa
    if (this.btnPauseGame) {
      this.btnPauseGame.addEventListener('click', () => this.togglePause(true));
    }
    if (this.btnResumeGame) {
      this.btnResumeGame.addEventListener('click', () => this.togglePause(false));
    }
    if (this.btnQuitGame) {
      this.btnQuitGame.addEventListener('click', () => this.returnToHQ());
    }
    if (this.btnSaveGame) {
      this.btnSaveGame.addEventListener('click', () => this.saveCurrentProgress());
    }

    // Mute Audio
    if (this.btnMuteToggle) {
      this.btnMuteToggle.addEventListener('click', () => {
        const muted = window.soundFX.toggleMute();
        this.btnMuteToggle.innerHTML = muted
          ? '<i class="bi bi-volume-mute-fill"></i> Mute'
          : '<i class="bi bi-volume-up-fill"></i> Sonido';
      });
    }

    // Tecla ESC para pausar durante el juego
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && this.viewGame && !this.viewGame.classList.contains('d-none')) {
        this.togglePause(!this.isPaused);
      }
    });
  }

  showToast(message, type = 'success') {
    const toastContainer = document.getElementById('tactical-toast-container');
    if (!toastContainer) return;

    const toastEl = document.createElement('div');
    toastEl.className = `alert alert-${type} shadow-lg py-2 px-3 mb-2 rounded border border-${type}`;
    toastEl.innerHTML = `<i class="bi bi-bell-fill"></i> <strong>SISTEMA:</strong> ${message}`;
    toastContainer.appendChild(toastEl);

    setTimeout(() => {
      toastEl.remove();
    }, 4500);
  }

  updateHQ(profileData) {
    this.userProfile = profileData.profile;
    this.inventory = profileData.inventory;

    // Determinar arma equipada
    this.activeWeapon = this.inventory.find((w) => w.is_equipped) || this.inventory[0];

    // Actualizar campos
    if (this.hqUsername) this.hqUsername.textContent = profileData.user.username;
    if (this.hqCoins) this.hqCoins.textContent = this.userProfile.coins;
    if (this.hqHighScore) this.hqHighScore.textContent = this.userProfile.high_score;
    if (this.hqGames) this.hqGames.textContent = this.userProfile.games_played;

    this.renderInventory();
    this.loadCatalog();

    // Mostrar HQ
    if (this.viewAuth) this.viewAuth.classList.add('d-none');
    if (this.viewHQ) this.viewHQ.classList.remove('d-none');
    if (this.viewGame) this.viewGame.classList.add('d-none');
    if (this.viewCinematic) this.viewCinematic.classList.add('d-none');
  }

  renderInventory() {
    if (!this.hqInventoryList) return;
    this.hqInventoryList.innerHTML = '';

    if (this.inventory.length === 0) {
      this.hqInventoryList.innerHTML = '<div class="col-12 text-muted">Arsenal vacío.</div>';
      return;
    }

    this.inventory.forEach((item) => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4 mb-3';
      const isEq = item.is_equipped === 1;
      const totalDmg = Number(item.damage || 0) + Number(item.damage_bonus || 0);
      const totalFR = (Number(item.fire_rate || 0) + Number(item.fire_rate_bonus || 0)).toFixed(1);
      const upgradeCost = (item.mod_level || 1) * 50;

      col.innerHTML = `
        <div class="card card-arcade p-3 h-100 ${isEq ? 'border-warning shadow' : ''}">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge ${isEq ? 'bg-warning text-dark' : 'bg-secondary'} font-arcade">
              ${isEq ? 'EN USO' : 'EN RESERVA'}
            </span>
            <span class="badge bg-dark text-info border border-info">
              LVL ${item.mod_level || 1}
            </span>
          </div>
          <h5 class="text-light font-tech mb-1 ${item.is_custom ? 'glow-text-amber' : ''}">
            ${item.is_custom ? '★ ' : ''}${item.name}
          </h5>
          <small class="text-muted mb-2 d-block">${item.description || 'Armamento militar reglamentario'}</small>
          
          <div class="bg-dark p-2 rounded mb-3 small font-tech border border-secondary">
            <div class="d-flex justify-content-between">
              <span class="text-muted">Daño Total:</span>
              <span class="text-danger fw-bold">${totalDmg}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-muted">Cadencia:</span>
              <span class="text-info fw-bold">${totalFR} d/s</span>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-muted">Balas simultáneas:</span>
              <span class="text-warning fw-bold">${item.spread_count || 1}</span>
            </div>
          </div>

          <div class="mt-auto d-flex gap-2">
            ${!isEq ? `
              <button class="btn btn-sm btn-outline-warning w-50 btn-equip" data-id="${item.inventory_id}">
                <i class="bi bi-check2-circle"></i> Equipar
              </button>
            ` : `
              <button class="btn btn-sm btn-success w-50 disabled">
                <i class="bi bi-shield-check"></i> Activa
              </button>
            `}
            <button class="btn btn-sm btn-contra-primary w-50 btn-upgrade" data-id="${item.inventory_id}" data-cost="${upgradeCost}">
              <i class="bi bi-wrench"></i> Calibrar (${upgradeCost}¢)
            </button>
          </div>
        </div>
      `;

      this.hqInventoryList.appendChild(col);
    });

    // Event listeners para equipar y mejorar
    this.hqInventoryList.querySelectorAll('.btn-equip').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const res = await ApiClient.equipWeapon(id);
        if (res.ok && res.data.success) {
          window.soundFX.playCoin();
          this.showToast('Arma equipada en la ranura principal.', 'success');
          this.refreshUserData();
        } else {
          this.showToast(res.data.error || 'Error al equipar arma', 'danger');
        }
      });
    });

    this.hqInventoryList.querySelectorAll('.btn-upgrade').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const res = await ApiClient.upgradeWeapon(id);
        if (res.ok && res.data.success) {
          window.soundFX.playForge();
          this.showToast(res.data.message || 'Arma calibrada con éxito.', 'success');
          this.refreshUserData();
        } else {
          this.showToast(res.data.error || 'Fondos insuficientes para mejorar', 'warning');
        }
      });
    });
  }

  async loadCatalog() {
    if (!this.hqCatalogList) return;
    const res = await ApiClient.getCatalog();
    if (!res.ok || !res.data.success) return;

    this.catalog = res.data.data;
    this.hqCatalogList.innerHTML = '';

    this.catalog.forEach((item) => {
      // Verificar si ya la tiene
      const alreadyOwned = this.inventory.some((i) => i.weapon_id === item.id);
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-3 mb-3';

      col.innerHTML = `
        <div class="card card-arcade p-3 h-100 text-center">
          <span class="badge bg-dark border border-warning text-warning mb-2 font-arcade">${item.type.toUpperCase()}</span>
          <h6 class="text-light font-tech mb-1">${item.name}</h6>
          <p class="small text-muted mb-2">${item.description}</p>
          <div class="my-auto py-2">
            <span class="fs-4 fw-bold text-warning font-tech">${item.cost}</span>
            <small class="text-muted"> Monedas</small>
          </div>
          ${alreadyOwned ? `
            <button class="btn btn-sm btn-secondary disabled mt-2">
              <i class="bi bi-check-all"></i> En Arsenal
            </button>
          ` : `
            <button class="btn btn-sm btn-contra-primary btn-buy-catalog mt-2" data-id="${item.id}">
              <i class="bi bi-cart-plus"></i> Comprar
            </button>
          `}
        </div>
      `;

      this.hqCatalogList.appendChild(col);
    });

    this.hqCatalogList.querySelectorAll('.btn-buy-catalog').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const res = await ApiClient.acquireWeapon(id);
        if (res.ok && res.data.success) {
          window.soundFX.playCoin();
          this.showToast(res.data.message || 'Arma adquirida exitosamente.', 'success');
          this.refreshUserData();
        } else {
          this.showToast(res.data.error || 'No se pudo adquirir el armamento', 'danger');
        }
      });
    });
  }

  populateForgeModal() {
    if (!this.forgeWeapon1Select || !this.forgeWeapon2Select) return;
    this.forgeWeapon1Select.innerHTML = '<option value="">-- Selecciona primera arma --</option>';
    this.forgeWeapon2Select.innerHTML = '<option value="">-- Selecciona segunda arma --</option>';

    this.inventory.forEach((item) => {
      const opt1 = document.createElement('option');
      opt1.value = item.inventory_id;
      opt1.textContent = `${item.name} (Lvl ${item.mod_level || 1})`;
      this.forgeWeapon1Select.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = item.inventory_id;
      opt2.textContent = `${item.name} (Lvl ${item.mod_level || 1})`;
      this.forgeWeapon2Select.appendChild(opt2);
    });

    if (this.modalForge) this.modalForge.show();
  }

  async handleForgeSubmit() {
    const id1 = this.forgeWeapon1Select.value;
    const id2 = this.forgeWeapon2Select.value;
    const customName = this.forgeCustomNameInput ? this.forgeCustomNameInput.value.trim() : '';

    if (!id1 || !id2) {
      this.showToast('Debes seleccionar dos armas distintas de tu arsenal.', 'warning');
      return;
    }

    if (id1 === id2) {
      this.showToast('No puedes fusionar la misma arma consigo misma.', 'warning');
      return;
    }

    const res = await ApiClient.fuseWeapons(id1, id2, customName);
    if (res.ok && res.data.success) {
      window.soundFX.playForge();
      this.showToast(res.data.message || '¡Arma híbrida forjada con éxito!', 'success');
      if (this.modalForge) this.modalForge.hide();
      this.refreshUserData();
    } else {
      this.showToast(res.data.error || 'Error en la forja de armamento', 'danger');
    }
  }

  async loadLeaderboard() {
    const res = await ApiClient.getLeaderboard(10);
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (res.ok && res.data.success) {
      res.data.data.forEach((entry, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="badge ${idx < 3 ? 'bg-warning text-dark' : 'bg-secondary'}">#${idx + 1}</span></td>
          <td class="fw-bold text-light">${entry.username}</td>
          <td class="text-success fw-bold">${entry.score}</td>
          <td class="text-warning">${entry.coins_earned}</td>
          <td class="text-danger">${entry.enemies_killed}</td>
          <td><span class="badge bg-dark border border-secondary">${entry.difficulty.toUpperCase()}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }

    if (this.modalLeaderboard) this.modalLeaderboard.show();
  }

  async refreshUserData() {
    const res = await ApiClient.getMe();
    if (res.ok && res.data.success) {
      this.updateHQ(res.data.data);
    }
  }

  // Flujo de Inicio de Misión con Cinemática
  startDeploymentFlow() {
    if (!this.activeWeapon) {
      this.activeWeapon = {
        id: 1,
        code: 'rifle_std',
        name: 'Fusil Asalto Contra',
        type: 'rifle',
        damage: 25.0,
        fire_rate: 5.0,
        bullet_speed: 650.0,
        spread_count: 1,
        bullet_color: '#ffea00'
      };
    }

    // Ocultar HQ y Auth
    if (this.viewHQ) this.viewHQ.classList.add('d-none');
    if (this.viewAuth) this.viewAuth.classList.add('d-none');

    // Iniciar cinemática del helicóptero estrellándose si está disponible
    if (window.IntroCinematic && this.viewCinematic) {
      this.viewCinematic.classList.remove('d-none');
      this.cinematic = new IntroCinematic('cinematic-canvas', () => {
        this.onCinematicComplete();
      });
      this.cinematic.start();
    } else {
      this.onCinematicComplete();
    }
  }

  // Despliegue Directo / Quick Play Inmediato
  startQuickPlay(skipCinematic = false) {
    if (!this.activeWeapon) {
      this.activeWeapon = {
        id: 1,
        code: 'rifle_std',
        name: 'Fusil Asalto Contra',
        type: 'rifle',
        damage: 25.0,
        fire_rate: 5.0,
        bullet_speed: 650.0,
        spread_count: 1,
        bullet_color: '#ffea00'
      };
    }

    if (this.viewAuth) this.viewAuth.classList.add('d-none');
    if (this.viewHQ) this.viewHQ.classList.add('d-none');

    if (skipCinematic || !window.IntroCinematic) {
      this.onCinematicComplete();
    } else {
      if (this.viewCinematic) this.viewCinematic.classList.remove('d-none');
      this.cinematic = new IntroCinematic('cinematic-canvas', () => {
        this.onCinematicComplete();
      });
      this.cinematic.start();
    }
  }

  onCinematicComplete() {
    if (this.viewCinematic) this.viewCinematic.classList.add('d-none');
    if (this.viewAuth) this.viewAuth.classList.add('d-none');
    if (this.viewHQ) this.viewHQ.classList.add('d-none');
    if (this.viewGame) this.viewGame.classList.remove('d-none');

    // Inicializar HUD de combate
    this.gameScore = 0;
    this.gameCoins = 0;
    this.playerLives = 3;
    this.baseProgress = 0;
    this.isPaused = false;
    this.updateHUD();

    this.showToast(`¡DESPLIEGUE CONFIRMADO EN LA SELVA! DIFICULTAD: ${this.currentDifficulty.toUpperCase()}`, 'danger');

    // Si el motor de juego de Fase 4 está cargado, iniciarlo
    if (window.ContraGameEngine) {
      window.ContraGameEngine.start(this.currentDifficulty, this.activeWeapon);
    }
  }

  updateHUD() {
    if (this.hudScore) this.hudScore.textContent = this.gameScore;
    if (this.hudCoins) this.hudCoins.textContent = this.gameCoins;
    if (this.hudDifficulty) this.hudDifficulty.textContent = this.currentDifficulty.toUpperCase();

    // Actualizar indicador de Vidas (3 medallas de soldado)
    if (this.hudLivesContainer) {
      this.hudLivesContainer.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const heart = document.createElement('i');
        heart.className = i < this.playerLives
          ? 'bi bi-shield-fill-check text-success fs-5 me-1'
          : 'bi bi-shield-x text-danger fs-5 me-1 opacity-50';
        this.hudLivesContainer.appendChild(heart);
      }
    }

    // Actualizar datos del arma en HUD
    if (this.activeWeapon) {
      if (this.hudWeaponName) this.hudWeaponName.textContent = this.activeWeapon.name;
      if (this.hudWeaponType) this.hudWeaponType.textContent = (this.activeWeapon.type || 'RIFLE').toUpperCase();
      const totalDmg = Number(this.activeWeapon.damage || 0) + Number(this.activeWeapon.damage_bonus || 0);
      const totalFR = (Number(this.activeWeapon.fire_rate || 0) + Number(this.activeWeapon.fire_rate_bonus || 0)).toFixed(1);
      if (this.hudWeaponStats) {
        this.hudWeaponStats.textContent = `DMG: ${totalDmg} | CAD: ${totalFR} | PROY: ${this.activeWeapon.spread_count || 1}`;
      }
    }

    // Barra de progreso hacia la base enemiga
    if (this.hudBaseProgress) {
      this.hudBaseProgress.style.width = `${Math.min(100, this.baseProgress)}%`;
      this.hudBaseProgress.textContent = `${Math.floor(this.baseProgress)}%`;
    }
  }

  togglePause(paused) {
    this.isPaused = paused;
    if (this.isPaused) {
      if (this.modalPause) this.modalPause.show();
    } else {
      if (this.modalPause) this.modalPause.hide();
    }

    if (window.ContraGameEngine) {
      window.ContraGameEngine.setPaused(this.isPaused);
    }
  }

  async saveCurrentProgress() {
    const res = await ApiClient.recordMatch({
      score: this.gameScore,
      coinsEarned: this.gameCoins,
      enemiesKilled: Math.floor(this.gameScore / 100),
      difficulty: this.currentDifficulty,
      basesDestroyed: this.baseProgress >= 100 ? 1 : 0
    });

    if (res.ok && res.data.success) {
      this.showToast('¡Progreso táctico guardado exitosamente en base de datos!', 'success');
      this.refreshUserData();
      this.togglePause(false);
    } else {
      this.showToast(res.data.error || 'Error al guardar progreso', 'danger');
    }
  }

  returnToHQ() {
    this.togglePause(false);
    if (window.ContraGameEngine) {
      window.ContraGameEngine.isRunning = false;
      window.ContraGameEngine.exitLock();
    }
    if (window.soundFX) {
      window.soundFX.stopDoomMusic();
    }
    if (this.viewGame) this.viewGame.classList.add('d-none');
    if (this.viewCinematic) this.viewCinematic.classList.add('d-none');

    if (window.ApiClient && ApiClient.getToken()) {
      if (this.viewHQ) this.viewHQ.classList.remove('d-none');
      this.refreshUserData();
    } else {
      if (this.viewAuth) this.viewAuth.classList.remove('d-none');
    }
  }
}

window.uiManager = new UIManager();
