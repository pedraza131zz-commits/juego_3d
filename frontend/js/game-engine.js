// =====================================================================
// SUPER CONTRA: DOOM 3D - MOTOR DE JUEGO EN PRIMERA PERSONA (FASE 3D PRO)
// Experiencia retro FPS DOOM: Laberinto 3D, Pointer Lock, Arsenal y Forja
// =====================================================================

class ContraDoom3D {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.isRunning = false;
    this.isPaused = false;
    this.animationId = null;

    // Configuración del Laberinto
    this.gridSize = 25; // 25x25 celdas
    this.cellSize = 8.0; // 8 unidades por celda
    this.wallHeight = 6.0;
    this.maze = [];
    this.wallMeshes = [];
    this.floorMesh = null;
    this.ceilingMesh = null;

    // Dificultad y multiplicadores
    this.difficulty = 'normal';
    this.diffMultipliers = {
      facil: { enemyHp: 0.7, enemyDmg: 0.7, fireRate: 0.7, coinMult: 1.0, speed: 0.85 },
      normal: { enemyHp: 1.0, enemyDmg: 1.0, fireRate: 1.0, coinMult: 1.5, speed: 1.0 },
      dificil: { enemyHp: 1.4, enemyDmg: 1.5, fireRate: 1.3, coinMult: 2.5, speed: 1.25 }
    };

    // Estado del Jugador (Primera Persona)
    this.player = {
      x: 12.0,
      y: 2.2, // Altura de ojos del Marine
      z: 12.0,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      radius: 1.2,
      baseSpeed: 7.2,
      sprintMult: 1.5,
      isGrounded: true,
      health: 100,
      maxHealth: 100,
      armor: 100,
      maxArmor: 100,
      lives: 3,
      invulnerableTimer: 0,
      lastShootTime: 0,
      inVehicle: false,
      goliathArmor: 500,
      goliathMaxArmor: 500,
      // Poderes temporales
      quadTimer: 0,
      shieldTimer: 0,
      speedTimer: 0,
      // Arma actual
      weapon: {
        name: 'Fusil Asalto Contra',
        type: 'rifle',
        damage: 25,
        fire_rate: 5.0,
        bullet_speed: 45.0,
        spread_count: 1,
        bullet_color: '#ffea00'
      }
    };

    // Entidades 3D
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.traps = [];
    this.particles = [];
    this.goliathMech = null;
    this.bossCore = null;

    // Métricas de combate
    this.score = 0;
    this.coins = 0;
    this.enemiesKilled = 0;
    this.isGameOver = false;
    this.isVictory = false;

    // Control de Inputs y Pointer Lock
    this.keys = {};
    this.mouse = { isDown: false, dx: 0, dy: 0 };
    this.isPointerLocked = false;

    // Animación del Arma y Cabeza en Primera Persona
    this.weaponMesh = null;
    this.muzzleLight = null;
    this.muzzleFlashSprite = null;
    this.headBobTimer = 0;
    this.recoilOffset = 0;

    // Estado del Rostro DOOM Marine
    this.faceCanvas = null;
    this.faceCtx = null;
    this.faceState = 'NEUTRAL';
    this.faceTimer = 0;
    this.eyeDirection = 0; // -1 izq, 0 centro, 1 der
    this.killStreak = 0;

    // Texturas procedurales generadas en Canvas
    this.textures = {};

    this.bindInputs();
    window.addEventListener('resize', () => this.handleResize());
  }

  // ==========================================
  // INICIALIZACIÓN DE INPUTS & POINTER LOCK
  // ==========================================
  bindInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Tecla E: Interactuar / Montar Mech Goliath
      if (e.code === 'KeyE' && this.isRunning && !this.isPaused && !this.isGameOver) {
        this.handleActionInteraction();
      }

      // Teclas 1 a 5: Cambio rápido de armamento si está disponible
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code) && this.isRunning) {
        this.handleQuickWeaponSwitch(e.code);
      }

      // Tecla ESC o P: Pausa
      if ((e.code === 'KeyP' || e.code === 'Escape') && this.isRunning) {
        if (window.uiManager) {
          window.uiManager.togglePause(!window.uiManager.isPaused);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked || !this.isRunning || this.isPaused) return;

      const sensitivity = 0.0022;
      this.player.yaw -= e.movementX * sensitivity;
      this.player.pitch -= e.movementY * sensitivity;

      // Limitar pitch vertical para evitar vueltas de campana
      const maxPitch = 1.45;
      this.player.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.player.pitch));
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = false;
      }
    });

    // Gestión del bloqueo de puntero (Pointer Lock API)
    document.addEventListener('pointerlockchange', () => {
      const lockBox = document.getElementById('doom-viewport-box');
      this.isPointerLocked = (document.pointerLockElement === lockBox || document.pointerLockElement === this.canvas);
      const promptEl = document.getElementById('pointer-lock-prompt');
      if (promptEl) {
        if (this.isPointerLocked) {
          promptEl.classList.add('d-none');
        } else if (this.isRunning && !this.isGameOver && !this.isVictory && !this.isPaused) {
          promptEl.classList.remove('d-none');
        }
      }
    });

    // Clic en el botón o en el viewport para bloquear el puntero
    const promptBtn = document.getElementById('btn-lock-pointer');
    if (promptBtn) {
      promptBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptEl = document.getElementById('pointer-lock-prompt');
        if (promptEl) promptEl.classList.add('d-none');
        this.requestLock();
      });
    }

    const viewportBox = document.getElementById('doom-viewport-box');
    if (viewportBox) {
      viewportBox.addEventListener('click', () => {
        const promptEl = document.getElementById('pointer-lock-prompt');
        if (promptEl) promptEl.classList.add('d-none');
        if (!this.isPointerLocked && this.isRunning && !this.isPaused) {
          this.requestLock();
        }
      });
    }
  }

  requestLock() {
    const lockBox = document.getElementById('doom-viewport-box') || this.canvas;
    if (lockBox && lockBox.requestPointerLock) {
      lockBox.requestPointerLock();
    }
  }

  exitLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  // ==========================================
  // INICIO DE MISIÓN 3D
  // ==========================================
  start(difficulty = 'normal', initialWeapon = null) {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) return;

    this.difficulty = difficulty || 'normal';
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.isVictory = false;
    this.score = 0;
    this.coins = 0;
    this.enemiesKilled = 0;
    this.killStreak = 0;

    // Resetear Jugador
    this.player.health = 100;
    this.player.maxHealth = 100;
    this.player.armor = 100;
    this.player.lives = 3;
    this.player.invulnerableTimer = 0;
    this.player.inVehicle = false;
    this.player.goliathArmor = 500;
    this.player.quadTimer = 0;
    this.player.shieldTimer = 0;
    this.player.speedTimer = 0;
    this.player.weapon = initialWeapon || {
      name: 'Fusil Asalto Contra',
      type: 'rifle',
      damage: 25,
      fire_rate: 5.0,
      bullet_speed: 48.0,
      spread_count: 1,
      bullet_color: '#ffea00'
    };

    // Inicializar Motor Three.js
    this.initThreeJS();

    // Generar Proceduralmente Texturas Retro Doom
    this.generateProceduralTextures();

    // Construir Laberinto Táctico 3D
    this.buildLabyrinth();

    // Crear Arma en Primera Persona
    this.createFirstPersonWeapon();

    // Poblar Laberinto: Mech Goliath, Boss Core, Enemigos, Power-ups, Trampas
    this.populateLabyrinth();

    // Inicializar Rostro DOOM Marine en Canvas
    this.initDoomMarineFace();

    // Iniciar Música Doom Procedural y Audio
    if (window.soundFX) {
      window.soundFX.init();
      window.soundFX.startDoomMusic();
    }

    // Resetear colecciones de proyectiles y entidades dinámicas
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.wallMeshes = [];

    // Mostrar overlay de Pointer Lock para comenzar
    const promptEl = document.getElementById('pointer-lock-prompt');
    if (promptEl) promptEl.classList.remove('d-none');

    // Iniciar Loop 3D
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.lastFrameTime = performance.now();
    this.loop();

    // Asegurar redimensionamiento inmediato y primer frame renderizado
    requestAnimationFrame(() => {
      this.handleResize();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    });
  }

  setPaused(paused) {
    this.isPaused = paused;
    if (paused) {
      this.exitLock();
      if (window.soundFX) window.soundFX.stopDoomMusic();
    } else {
      if (window.soundFX) window.soundFX.startDoomMusic();
    }
  }

  // ==========================================
  // CONFIGURACIÓN DE THREE.JS
  // ==========================================
  initThreeJS() {
    const w = this.canvas.clientWidth > 0 ? this.canvas.clientWidth : 1000;
    const h = this.canvas.clientHeight > 0 ? this.canvas.clientHeight : Math.round(w * (580 / 1000));

    // 1. Renderizador WebGL de Alta Calidad
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false
      });
    }
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 1.4;

    // 2. Escena y Niebla Atmosférica Espesa Estilo Doom
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020a05);
    this.scene.fog = new THREE.FogExp2(0x030d06, 0.028);

    // 3. Cámara en Primera Persona con FOV más agresivo
    this.camera = new THREE.PerspectiveCamera(90, w / h, 0.05, 200);
    this.scene.add(this.camera);

    // 4. Sistema de Iluminación Multicapa Estilo DOOM
    // Luz ambiental base muy oscura
    const ambientLight = new THREE.AmbientLight(0x1a2e1f, 2.2);
    this.scene.add(ambientLight);

    // Luz direccional principal con sombras suaves
    const dirLight = new THREE.DirectionalLight(0x88ffaa, 0.6);
    dirLight.position.set(30, 60, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    this.scene.add(dirLight);

    // Luz de relleno lateral (tono rojizo del infierno)
    const fillLight = new THREE.DirectionalLight(0xff3300, 0.15);
    fillLight.position.set(-20, 10, -20);
    this.scene.add(fillLight);

    // Luz de subida del suelo (bounce light verde pálido)
    const groundBounce = new THREE.HemisphereLight(0x004400, 0x001100, 0.8);
    this.scene.add(groundBounce);

    // Linterna táctica del Marine (más potente y con parpadeo)
    this.playerLight = new THREE.SpotLight(0x99ffcc, 6.0, 28, Math.PI / 5, 0.4, 1.8);
    this.playerLight.position.set(0, 0, 0);
    this.playerLight.target.position.set(0, -0.5, -5);
    this.camera.add(this.playerLight);
    this.camera.add(this.playerLight.target);

    // Luz de fill ambiental del jugador (emisión en todas direcciones)
    this.playerFillLight = new THREE.PointLight(0x22aa55, 1.2, 12);
    this.playerFillLight.position.set(0, 0, 0);
    this.camera.add(this.playerFillLight);

    // Luz de fogonazo de disparo (Muzzle Flash) más intensa
    this.muzzleLight = new THREE.PointLight(0xff9900, 0, 22);
    this.muzzleLight.position.set(0.4, -0.28, -1.5);
    this.camera.add(this.muzzleLight);

    // Luces ambientales del laberinto (rojo/verde parpadeantes)
    this._ambientFlickerTimer = 0;
    this._ambientFlickerLights = [];
  }

  handleResize() {
    if (!this.canvas || !this.renderer || !this.camera) return;
    const w = this.canvas.clientWidth > 0 ? this.canvas.clientWidth : (this.canvas.parentElement ? this.canvas.parentElement.clientWidth : 1000) || 1000;
    const h = this.canvas.clientHeight > 0 ? this.canvas.clientHeight : Math.round(w * (580 / 1000));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // ==========================================
  // GENERACIÓN DE TEXTURAS PROCEDURALES DOOM PRO
  // ==========================================
  generateProceduralTextures() {
    // 1. Textura de Muro Blindado con manchas de guerra, sangre y grunge
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 512;
    wallCanvas.height = 512;
    const wctx = wallCanvas.getContext('2d');

    // Base: planchas de acero oxidado
    const wallGrad = wctx.createLinearGradient(0, 0, 256, 512);
    wallGrad.addColorStop(0, '#101b14');
    wallGrad.addColorStop(0.5, '#18281e');
    wallGrad.addColorStop(1, '#0d1710');
    wctx.fillStyle = wallGrad;
    wctx.fillRect(0, 0, 512, 512);

    // Juntas de concreto / ladrillo de bunker (grilla 4x4)
    wctx.strokeStyle = '#050f09';
    wctx.lineWidth = 6;
    for (let row = 0; row <= 4; row++) {
      wctx.beginPath();
      wctx.moveTo(0, row * 128);
      wctx.lineTo(512, row * 128);
      wctx.stroke();
    }
    for (let col = 0; col <= 4; col++) {
      const offsetX = col % 2 === 0 ? 0 : 64;
      wctx.beginPath();
      wctx.moveTo(col * 128 + offsetX, 0);
      wctx.lineTo(col * 128 + offsetX, 512);
      wctx.stroke();
    }

    // Textura de grunge / suciedad con ruido
    for (let i = 0; i < 2000; i++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 512;
      const alpha = Math.random() * 0.18;
      const dark = Math.random() > 0.5;
      wctx.fillStyle = dark ? `rgba(0,0,0,${alpha})` : `rgba(30,60,40,${alpha})`;
      wctx.fillRect(gx, gy, Math.random() * 5 + 1, Math.random() * 5 + 1);
    }

    // Remaches metálicos en cada intersección de bloque
    wctx.fillStyle = '#3d5c48';
    for (let row = 0; row <= 4; row++) {
      for (let col = 0; col <= 4; col++) {
        const ry = row * 128;
        const rx = col * 128;
        wctx.beginPath();
        wctx.arc(rx, ry, 6, 0, Math.PI * 2);
        wctx.fill();
        // Brillo del remache
        wctx.fillStyle = '#6aae88';
        wctx.beginPath();
        wctx.arc(rx - 1, ry - 1, 2, 0, Math.PI * 2);
        wctx.fill();
        wctx.fillStyle = '#3d5c48';
      }
    }

    // Manchas de sangre (detalles de guerra)
    for (let b = 0; b < 8; b++) {
      const bx = Math.random() * 512;
      const by = Math.random() * 512;
      const bRadius = Math.random() * 18 + 6;
      wctx.fillStyle = `rgba(140, 0, 0, ${Math.random() * 0.4 + 0.15})`;
      wctx.beginPath();
      wctx.ellipse(bx, by, bRadius, bRadius * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
      wctx.fill();
      // Goteo vertical de sangre
      if (Math.random() > 0.5) {
        const grad = wctx.createLinearGradient(bx, by, bx, by + bRadius * 3);
        grad.addColorStop(0, `rgba(120,0,0,0.5)`);
        grad.addColorStop(1, `rgba(120,0,0,0)`);
        wctx.fillStyle = grad;
        wctx.fillRect(bx - 3, by, 6, bRadius * 3);
      }
    }

    // Franjas de advertencia HAZARD en la parte inferior del muro
    for (let x = 0; x < 512; x += 48) {
      wctx.fillStyle = '#b8960a';
      wctx.beginPath();
      wctx.moveTo(x, 512);
      wctx.lineTo(x + 24, 512);
      wctx.lineTo(x + 48, 470);
      wctx.lineTo(x + 24, 470);
      wctx.fill();
    }

    // Conductos de energía verde neón brillante
    wctx.shadowColor = '#00ff66';
    wctx.shadowBlur = 12;
    wctx.strokeStyle = '#00cc44';
    wctx.lineWidth = 4;
    wctx.beginPath();
    wctx.moveTo(0, 256); wctx.lineTo(512, 256);
    wctx.stroke();
    wctx.beginPath();
    wctx.moveTo(0, 252); wctx.lineTo(512, 252);
    wctx.strokeStyle = 'rgba(0,255,100,0.3)';
    wctx.lineWidth = 10;
    wctx.stroke();
    wctx.shadowBlur = 0;

    // Texto pintado en muro (decoración estilo DOOM)
    wctx.font = 'bold 16px monospace';
    wctx.fillStyle = 'rgba(200,40,40,0.55)';
    wctx.fillText('SECTOR 7 - DANGER', 30, 120);
    wctx.fillText('NO TRESPASSING', 180, 380);

    this.textures.wall = new THREE.CanvasTexture(wallCanvas);
    this.textures.wall.wrapS = THREE.RepeatWrapping;
    this.textures.wall.wrapT = THREE.RepeatWrapping;
    this.textures.wall.repeat.set(1, 1);

    // 2. Textura de Suelo Táctico con cascos aplastados y rejilla metálica
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 256;
    floorCanvas.height = 256;
    const fctx = floorCanvas.getContext('2d');

    // Base oscura del suelo
    fctx.fillStyle = '#080f0b';
    fctx.fillRect(0, 0, 256, 256);

    // Baldosas de metal
    for (let fy = 0; fy < 256; fy += 32) {
      for (let fx = 0; fx < 256; fx += 32) {
        const lightness = Math.random() * 8 + 8;
        fctx.fillStyle = `rgb(${lightness},${lightness + 6},${lightness})`;
        fctx.fillRect(fx + 1, fy + 1, 30, 30);
      }
    }

    // Rejilla metálica brillante
    fctx.strokeStyle = '#0d2218';
    fctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      fctx.beginPath();
      fctx.moveTo(i, 0); fctx.lineTo(i, 256);
      fctx.moveTo(0, i); fctx.lineTo(256, i);
      fctx.stroke();
    }

    // Manchas de aceite y grasa
    for (let o = 0; o < 10; o++) {
      const ox = Math.random() * 256;
      const oy = Math.random() * 256;
      fctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.3 + 0.1})`;
      fctx.beginPath();
      fctx.ellipse(ox, oy, Math.random() * 20 + 4, Math.random() * 12 + 4, Math.random() * Math.PI, 0, Math.PI * 2);
      fctx.fill();
    }

    // Marcas de pasos de barro/sangre
    for (let s = 0; s < 6; s++) {
      fctx.fillStyle = `rgba(90, 20, 20, ${Math.random() * 0.25 + 0.1})`;
      fctx.fillRect(Math.random() * 256, Math.random() * 256, 8, 14);
    }

    this.textures.floor = new THREE.CanvasTexture(floorCanvas);
    this.textures.floor.wrapS = THREE.RepeatWrapping;
    this.textures.floor.wrapT = THREE.RepeatWrapping;
    this.textures.floor.repeat.set(18, 18);

    // 3. Textura de Techo Industrial con Tuberías y Lámparas
    const ceilCanvas = document.createElement('canvas');
    ceilCanvas.width = 256;
    ceilCanvas.height = 256;
    const cctx = ceilCanvas.getContext('2d');

    cctx.fillStyle = '#040b07';
    cctx.fillRect(0, 0, 256, 256);

    // Panel estructural del techo
    cctx.fillStyle = '#0a1510';
    cctx.fillRect(6, 6, 244, 244);

    // Vigas del techo
    cctx.fillStyle = '#0f1c14';
    cctx.fillRect(0, 60, 256, 16);
    cctx.fillRect(0, 140, 256, 16);
    cctx.fillRect(0, 220, 256, 16);

    // Tuberías industriales
    cctx.fillStyle = '#1a3325';
    cctx.fillRect(40, 0, 10, 256);
    cctx.fillRect(160, 0, 10, 256);

    // Lámparas fluorescentes parpadeo
    const lampGrad = cctx.createRadialGradient(128, 128, 0, 128, 128, 40);
    lampGrad.addColorStop(0, 'rgba(120, 255, 170, 0.9)');
    lampGrad.addColorStop(0.5, 'rgba(60, 200, 100, 0.4)');
    lampGrad.addColorStop(1, 'rgba(0, 100, 50, 0)');
    cctx.fillStyle = lampGrad;
    cctx.fillRect(80, 110, 96, 36);

    cctx.shadowColor = '#00ff88';
    cctx.shadowBlur = 20;
    cctx.fillStyle = '#88ffcc';
    cctx.fillRect(88, 118, 80, 20);
    cctx.shadowBlur = 0;

    this.textures.ceiling = new THREE.CanvasTexture(ceilCanvas);
    this.textures.ceiling.wrapS = THREE.RepeatWrapping;
    this.textures.ceiling.wrapT = THREE.RepeatWrapping;
    this.textures.ceiling.repeat.set(18, 18);

    // 4. Textura de Muro Alternativo (variante roja de peligro)
    const wallRedCanvas = document.createElement('canvas');
    wallRedCanvas.width = 256;
    wallRedCanvas.height = 256;
    const wrctx = wallRedCanvas.getContext('2d');
    wrctx.fillStyle = '#1a0808';
    wrctx.fillRect(0, 0, 256, 256);
    wrctx.strokeStyle = '#2d0a0a';
    wrctx.lineWidth = 4;
    for (let row = 0; row <= 4; row++) { wrctx.beginPath(); wrctx.moveTo(0, row * 64); wrctx.lineTo(256, row * 64); wrctx.stroke(); }
    for (let col = 0; col <= 4; col++) { wrctx.beginPath(); wrctx.moveTo(col * 64, 0); wrctx.lineTo(col * 64, 256); wrctx.stroke(); }
    wrctx.shadowColor = '#ff0000';
    wrctx.shadowBlur = 8;
    wrctx.strokeStyle = '#880000';
    wrctx.lineWidth = 3;
    wrctx.beginPath(); wrctx.moveTo(0, 128); wrctx.lineTo(256, 128); wrctx.stroke();
    wrctx.shadowBlur = 0;
    for (let br = 0; br < 12; br++) {
      wrctx.fillStyle = `rgba(180,0,0,${Math.random()*0.35+0.1})`;
      wrctx.beginPath();
      wrctx.ellipse(Math.random()*256, Math.random()*256, Math.random()*15+5, Math.random()*10+4, Math.random()*Math.PI, 0, Math.PI*2);
      wrctx.fill();
    }
    this.textures.wallRed = new THREE.CanvasTexture(wallRedCanvas);
    this.textures.wallRed.wrapS = THREE.RepeatWrapping;
    this.textures.wallRed.wrapT = THREE.RepeatWrapping;
  }

  // ==========================================
  // CONSTRUCCIÓN DEL LABERINTO TÁCTICO 3D
  // ==========================================
  buildLabyrinth() {
    const N = this.gridSize;
    // 0: Vacío/Pasillo, 1: Muro Perímetro, 2: Muro Interior, 6: Hangar Goliath, 8: Núcleo Boss
    this.maze = Array.from({ length: N }, () => Array(N).fill(1));

    // Generar caminos y pasillos interconectados con loops para combate DOOM fluido
    for (let z = 1; z < N - 1; z++) {
      for (let x = 1; x < N - 1; x++) {
        // Cuadrícula con pasillos amplios
        if (z % 2 === 1 || x % 2 === 1) {
          this.maze[z][x] = 0;
        }
        // Algunos muros tácticos interiores para cobertura
        if (z % 2 === 0 && x % 2 === 0) {
          this.maze[z][x] = Math.random() > 0.45 ? 2 : 0;
        }
      }
    }

    // 1. Zona de Infiltración / Spawn del Jugador (Esquina 1,1)
    for (let dz = 1; dz <= 3; dz++) {
      for (let dx = 1; dx <= 3; dx++) {
        this.maze[dz][dx] = 0;
      }
    }
    this.player.x = 2 * this.cellSize;
    this.player.z = 2 * this.cellSize;
    this.player.yaw = -Math.PI / 4; // Mirando hacia el laberinto

    // 2. Hangar del Mech Blindado Goliath (Zona 7, 17)
    for (let dz = 7; dz <= 10; dz++) {
      for (let dx = 16; dx <= 19; dx++) {
        this.maze[dz][dx] = 0;
      }
    }
    this.maze[8][17] = 6; // Posición de anclaje Goliath

    // 3. Cámara de la Ciudadela y Reactor Central (Núcleo Boss en el centro 11-15, 11-15)
    const mid = Math.floor(N / 2);
    for (let dz = mid - 2; dz <= mid + 2; dz++) {
      for (let dx = mid - 2; dx <= mid + 2; dx++) {
        this.maze[dz][dx] = 0;
      }
    }
    this.maze[mid][mid] = 8; // Núcleo Boss

    // Crear Mallas 3D para Suelo y Techo
    const totalDim = N * this.cellSize;
    const floorGeo = new THREE.PlaneGeometry(totalDim, totalDim);
    const floorMat = new THREE.MeshLambertMaterial({ map: this.textures.floor });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(totalDim / 2, 0, totalDim / 2);
    this.scene.add(this.floorMesh);

    const ceilGeo = new THREE.PlaneGeometry(totalDim, totalDim);
    const ceilMat = new THREE.MeshLambertMaterial({ map: this.textures.ceiling });
    this.ceilingMesh = new THREE.Mesh(ceilGeo, ceilMat);
    this.ceilingMesh.rotation.x = Math.PI / 2;
    this.ceilingMesh.position.set(totalDim / 2, this.wallHeight, totalDim / 2);
    this.scene.add(this.ceilingMesh);

    // Crear Muros con materiales variados para diversidad visual
    const wallGeo = new THREE.BoxGeometry(this.cellSize, this.wallHeight, this.cellSize);
    const wallMat = new THREE.MeshStandardMaterial({ 
      map: this.textures.wall,
      roughness: 0.85,
      metalness: 0.12,
      envMapIntensity: 0.5
    });
    const wallMatRed = new THREE.MeshStandardMaterial({ 
      map: this.textures.wallRed,
      roughness: 0.9,
      metalness: 0.05,
      emissive: new THREE.Color(0x220000),
      emissiveIntensity: 0.3
    });
    const wallMatBoss = new THREE.MeshStandardMaterial({ 
      color: 0x1a0522,
      roughness: 0.7,
      metalness: 0.3,
      emissive: new THREE.Color(0x330055),
      emissiveIntensity: 0.4
    });

    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        if (this.maze[z][x] === 1 || this.maze[z][x] === 2) {
          // Variedad de materiales basada en posición
          let mat = wallMat;
          const mid = Math.floor(N / 2);
          const distToCenter = Math.hypot(x - mid, z - mid);
          if (distToCenter < 5) mat = wallMatBoss;
          else if (this.maze[z][x] === 2 && Math.random() > 0.65) mat = wallMatRed;

          const wallMesh = new THREE.Mesh(wallGeo, mat);
          wallMesh.position.set(
            x * this.cellSize + this.cellSize / 2,
            this.wallHeight / 2,
            z * this.cellSize + this.cellSize / 2
          );
          wallMesh.castShadow = true;
          wallMesh.receiveShadow = true;
          this.scene.add(wallMesh);
          this.wallMeshes.push(wallMesh);

          // Agregar luz de pared roja aleatoria (lámparas de emergencia)
          if (Math.random() < 0.04) {
            const emergencyLight = new THREE.PointLight(0xff2200, 1.5, 10);
            emergencyLight.position.set(
              x * this.cellSize + this.cellSize / 2,
              this.wallHeight - 0.5,
              z * this.cellSize + this.cellSize / 2
            );
            this.scene.add(emergencyLight);
            this._ambientFlickerLights.push({ light: emergencyLight, baseIntensity: 1.5, timer: Math.random() * Math.PI * 2 });
          }
        }
      }
    }

    // Actualizar materiales del suelo y techo a MeshStandard
    if (this.floorMesh) {
      this.floorMesh.material = new THREE.MeshStandardMaterial({
        map: this.textures.floor,
        roughness: 0.95,
        metalness: 0.1
      });
      this.floorMesh.receiveShadow = true;
    }
    if (this.ceilingMesh) {
      this.ceilingMesh.material = new THREE.MeshStandardMaterial({
        map: this.textures.ceiling,
        roughness: 0.9,
        metalness: 0.05,
        emissive: new THREE.Color(0x003311),
        emissiveIntensity: 0.15
      });
    }
  }

  // ==========================================
  // ARMA EN PRIMERA PERSONA & MANOS 3D (DOOM PRO)
  // ==========================================
  createFirstPersonWeapon() {
    this.weaponGroup = new THREE.Group();

    // --- MANO/GUANTE MILITAR DEL MARINE ---
    const handMat = new THREE.MeshStandardMaterial({ color: 0x2a3d30, roughness: 0.8, metalness: 0.1 });
    const gloveGeo = new THREE.BoxGeometry(0.14, 0.12, 0.22);
    const leftHand = new THREE.Mesh(gloveGeo, handMat);
    leftHand.position.set(-0.16, -0.18, 0.05);
    this.weaponGroup.add(leftHand);
    const rightHand = new THREE.Mesh(gloveGeo, handMat);
    rightHand.position.set(0.14, -0.22, 0.0);
    this.weaponGroup.add(rightHand);

    // Dedos del guante
    for (let f = 0; f < 4; f++) {
      const fingerGeo = new THREE.BoxGeometry(0.025, 0.08, 0.04);
      const finger = new THREE.Mesh(fingerGeo, handMat);
      finger.position.set(-0.14 + f * 0.04, -0.1, 0.1);
      this.weaponGroup.add(finger);
    }

    // --- CUERPO PRINCIPAL DEL ARMA (Receptor táctico) ---
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2420, roughness: 0.75, metalness: 0.35 });
    const bodyGeo = new THREE.BoxGeometry(0.22, 0.28, 0.78);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, -0.1);
    this.weaponGroup.add(body);

    // Guardamano delantero (foregrip)
    const gripGeo = new THREE.BoxGeometry(0.14, 0.12, 0.22);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x0d1410, roughness: 0.9 });
    const foregrip = new THREE.Mesh(gripGeo, gripMat);
    foregrip.position.set(0, -0.14, -0.38);
    this.weaponGroup.add(foregrip);

    // Mira táctica (ACOG/Óptica)
    const sightMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.7, metalness: 0.5 });
    const sightGeo = new THREE.BoxGeometry(0.08, 0.1, 0.2);
    const sight = new THREE.Mesh(sightGeo, sightMat);
    sight.position.set(0, 0.2, -0.15);
    this.weaponGroup.add(sight);
    // Lente de la mira (pequeño cilindro)
    const lensGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x004488, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.2, -0.22);
    this.weaponGroup.add(lens);

    // --- CAÑÓN PRINCIPAL (largo y amenazante) ---
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0a0f0c, roughness: 0.5, metalness: 0.8 });
    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.65, 12);
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.6);
    this.weaponGroup.add(barrel);

    // Bocacha / supresor (freno de boca)
    const muzzleGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.14, 12);
    const muzzle = new THREE.Mesh(muzzleGeo, barrelMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.03, -0.9);
    this.weaponGroup.add(muzzle);

    // Cañones secundarios (Spread)
    const sideBarrelMat = new THREE.MeshStandardMaterial({ color: 0x111814, roughness: 0.6, metalness: 0.7 });
    const sideBarrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8);
    const sideL = new THREE.Mesh(sideBarrelGeo, sideBarrelMat);
    sideL.rotation.x = Math.PI / 2;
    sideL.position.set(-0.08, 0.03, -0.58);
    this.weaponGroup.add(sideL);
    const sideR = new THREE.Mesh(sideBarrelGeo, sideBarrelMat);
    sideR.rotation.x = Math.PI / 2;
    sideR.position.set(0.08, 0.03, -0.58);
    this.weaponGroup.add(sideR);

    // --- RAIL NEÓN DE ENERGÍA (indicador del tipo de arma) ---
    const neonGeo = new THREE.BoxGeometry(0.028, 0.028, 0.5);
    this.neonMat = new THREE.MeshStandardMaterial({ 
      color: 0xffea00, 
      emissive: 0xffea00, 
      emissiveIntensity: 1.8,
      roughness: 0.2 
    });
    const neonRail = new THREE.Mesh(neonGeo, this.neonMat);
    neonRail.position.set(0, 0.16, -0.2);
    this.weaponGroup.add(neonRail);

    // Luz neón del rail (ilumina el arma visualmente)
    this.weaponNeonLight = new THREE.PointLight(0xffea00, 0.5, 1.5);
    this.weaponNeonLight.position.set(0, 0.16, -0.3);
    this.weaponGroup.add(this.weaponNeonLight);

    // --- MUZZLE FLASH SPRITE (anillo de fogonazo) ---
    const muzzleFlashGeo = new THREE.RingGeometry(0.04, 0.18, 8);
    const muzzleFlashMat = new THREE.MeshBasicMaterial({ 
      color: 0xffaa00, 
      transparent: true, 
      opacity: 0,
      side: THREE.DoubleSide 
    });
    this.muzzleFlashMesh = new THREE.Mesh(muzzleFlashGeo, muzzleFlashMat);
    this.muzzleFlashMesh.position.set(0, 0.03, -0.97);
    this.weaponGroup.add(this.muzzleFlashMesh);

    // Posicionar el arma (más abajo para efecto DOOM auténtico)
    this.weaponGroup.position.set(0.42, -0.42, -0.82);
    this.camera.add(this.weaponGroup);
    this.weaponMesh = this.weaponGroup;

    // Estado de animación del arma
    this._weaponSwayTimer = 0;
    this._weaponSwayX = 0;
    this._weaponSwayY = 0;
    this._muzzleFlashTimer = 0;
  }

  updateWeaponVisuals() {
    if (!this.neonMat || !this.player.weapon) return;
    const col = new THREE.Color(this.player.weapon.bullet_color || '#ffea00');
    this.neonMat.color = col;
    this.neonMat.emissive = col;
    this.neonMat.emissiveIntensity = 1.8;

    // Actualizar luz neón del rail
    if (this.weaponNeonLight) {
      this.weaponNeonLight.color = col;
    }

    // Actualizar HUD de arma
    const wType = document.getElementById('hud-weapon-type');
    const wName = document.getElementById('hud-weapon-name');
    const wStats = document.getElementById('hud-weapon-stats');
    if (wType) wType.textContent = (this.player.weapon.type || 'RIFLE').toUpperCase();
    if (wName) wName.textContent = this.player.weapon.name || 'Fusil Asalto';
    if (wStats) {
      wStats.textContent = `DMG: ${this.player.weapon.damage} | CAD: ${this.player.weapon.fire_rate} | PROY: ${this.player.weapon.spread_count || 1}`;
    }
  }

  // ==========================================
  // POBLAR LABERINTO: ENEMIGOS, MECH, PODERES
  // ==========================================
  populateLabyrinth() {
    this.enemies = [];
    this.pickups = [];
    this.traps = [];
    const mult = this.diffMultipliers[this.difficulty];
    const N = this.gridSize;

    // 1. Desplegar Mech Blindado Goliath (Req 14) en su Hangar
    this.spawnGoliathMech(17 * this.cellSize + this.cellSize / 2, 8 * this.cellSize + this.cellSize / 2);

    // 2. Desplegar Núcleo de Fortaleza y Torretas Boss
    const mid = Math.floor(N / 2);
    this.spawnBossCore(mid * this.cellSize + this.cellSize / 2, mid * this.cellSize + this.cellSize / 2);

    // 3. Sembrar Enemigos Tácticos en los Pasillos del Laberinto
    for (let z = 2; z < N - 2; z++) {
      for (let x = 2; x < N - 2; x++) {
        // Espacio libre y fuera de zona de inicio
        if (this.maze[z][x] === 0 && (x > 4 || z > 4)) {
          const spawnProb = Math.random();
          const wx = x * this.cellSize + this.cellSize / 2;
          const wz = z * this.cellSize + this.cellSize / 2;

          if (spawnProb < 0.16) {
            // Soldado de Infantería
            this.spawnEnemy('infantry', wx, wz, mult);
          } else if (spawnProb < 0.22) {
            // Francotirador en pasillo largo
            this.spawnEnemy('sniper', wx, wz, mult);
          } else if (spawnProb < 0.27) {
            // Dron Aéreo Flotante
            this.spawnEnemy('drone', wx, wz, mult);
          } else if (spawnProb < 0.31) {
            // Caminante Blindado Pesado (Cyber-Walker / Jeep)
            this.spawnEnemy('walker', wx, wz, mult);
          } else if (spawnProb < 0.38) {
            // Trampa de Minas o Púas en pasillos
            this.spawnTrap(Math.random() > 0.5 ? 'mine' : 'spikes', wx, wz);
          } else if (spawnProb < 0.44) {
            // Suministros o Power-Ups
            const powerTypes = ['spread_gun', 'laser_beam', 'rocket_pod', 'plasma_shotgun', 'quad', 'shield', 'speed', 'health'];
            const chosen = powerTypes[Math.floor(Math.random() * powerTypes.length)];
            this.spawnPickup(chosen, wx, wz);
          }
        }
      }
    }
  }

  // ==========================================
  // CREACIÓN DE ENTIDADES 3D
  // ==========================================
  spawnGoliathMech(x, z) {
    const group = new THREE.Group();

    // Chasis blindado
    const baseGeo = new THREE.BoxGeometry(3.6, 1.8, 4.4);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x1b4332 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 1.0;
    group.add(base);

    // Cabina acristalada blindada
    const cabinGeo = new THREE.BoxGeometry(2.4, 1.6, 2.4);
    const cabinMat = new THREE.MeshLambertMaterial({ color: 0xf39c12 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 2.4, 0.4);
    group.add(cabin);

    // Cañones duales pesados de 120mm
    const cannonGeo = new THREE.CylinderGeometry(0.2, 0.25, 3.2, 12);
    const cannonMat = new THREE.MeshLambertMaterial({ color: 0x111 });
    const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
    leftCannon.rotation.x = Math.PI / 2;
    leftCannon.position.set(-1.4, 2.0, -1.2);
    group.add(leftCannon);

    const rightCannon = new THREE.Mesh(cannonGeo, cannonMat);
    rightCannon.rotation.x = Math.PI / 2;
    rightCannon.position.set(1.4, 2.0, -1.2);
    group.add(rightCannon);

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.goliathMech = {
      group,
      x,
      z,
      radius: 3.0,
      occupied: false,
      destroyed: false
    };
  }

  spawnBossCore(x, z) {
    const group = new THREE.Group();

    // Pedestal cilíndrico
    const baseGeo = new THREE.CylinderGeometry(3.2, 3.6, 1.2, 16);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x222 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.6;
    group.add(base);

    // Núcleo energético esférico pulsante
    const coreGeo = new THREE.SphereGeometry(1.8, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    coreSphere.position.y = 2.8;
    group.add(coreSphere);

    // Luz del reactor
    const coreLight = new THREE.PointLight(0x00ffff, 3.5, 20);
    coreLight.position.y = 2.8;
    group.add(coreLight);

    // 2 Torretas defensoras automáticas
    const tGeo = new THREE.BoxGeometry(1.2, 1.4, 1.2);
    const tMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
    const turret1 = new THREE.Mesh(tGeo, tMat);
    turret1.position.set(-3.2, 1.6, 0);
    group.add(turret1);

    const turret2 = new THREE.Mesh(tGeo, tMat);
    turret2.position.set(3.2, 1.6, 0);
    group.add(turret2);

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.bossCore = {
      group,
      coreSphere,
      coreLight,
      x,
      z,
      radius: 4.5,
      turret1Hp: 280,
      turret2Hp: 280,
      coreHp: 800,
      maxCoreHp: 800,
      lastShoot: 0,
      isDestroyed: false
    };
  }

  spawnEnemy(type, x, z, mult) {
    const group = new THREE.Group();
    let hp = 40 * mult.enemyHp;
    let scoreVal = 100;
    let color = 0xc0392b;

    if (type === 'sniper') {
      hp = 50 * mult.enemyHp;
      scoreVal = 200;
      color = 0x8e44ad;
    } else if (type === 'drone') {
      hp = 35 * mult.enemyHp;
      scoreVal = 250;
      color = 0x00d2d3;
    } else if (type === 'walker') {
      hp = 180 * mult.enemyHp;
      scoreVal = 500;
      color = 0x7f8c8d;
    }

    // Modelo 3D estilizado del enemigo (DOOM Pro - más detallado)
    const bodyStdMat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.2 });

    if (type === 'drone') {
      // Dron orbe esférico ciber-demoniaco
      const bodyGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const body = new THREE.Mesh(bodyGeo, bodyStdMat);
      body.position.y = 3.0;
      group.add(body);

      // Anillos orbitantes
      const ringGeo = new THREE.TorusGeometry(1.0, 0.06, 8, 24);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x003366, emissiveIntensity: 1.0 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 3.0;
      ring.rotation.x = Math.PI / 3;
      group.add(ring);

      // Ojo visor rojo (amenazante)
      const eyeGeo = new THREE.SphereGeometry(0.28, 12, 12);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0033, emissive: 0xff0000, emissiveIntensity: 2.0 });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(0, 3.0, -0.72);
      group.add(eye);

      // Luz del ojo
      const eyeLight = new THREE.PointLight(0xff0000, 1.2, 6);
      eyeLight.position.set(0, 3.0, -0.8);
      group.add(eyeLight);

      // Tentáculos (4 picos)
      for (let t = 0; t < 4; t++) {
        const tentGeo = new THREE.ConeGeometry(0.06, 0.5, 6);
        const tent = new THREE.Mesh(tentGeo, bodyStdMat);
        const angle = (t / 4) * Math.PI * 2;
        tent.position.set(Math.sin(angle) * 0.9, 3.0, Math.cos(angle) * 0.9);
        tent.lookAt(new THREE.Vector3(0, 3.0, 0));
        group.add(tent);
      }

      // Guardamos referencia al ring para animarlo
      group.userData.animRing = ring;
      group.userData.animEyeLight = eyeLight;

    } else if (type === 'walker') {
      // Caminante Blindado mejorado con detalles
      const chassisMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.45 });
      const chassisGeo = new THREE.BoxGeometry(2.0, 1.6, 2.4);
      const chassis = new THREE.Mesh(chassisGeo, chassisMat);
      chassis.position.y = 2.0;
      chassis.castShadow = true;
      group.add(chassis);

      // Torreta superior
      const turrGeo = new THREE.BoxGeometry(1.4, 0.9, 1.6);
      const turr = new THREE.Mesh(turrGeo, chassisMat);
      turr.position.set(0, 3.0, 0);
      group.add(turr);
      group.userData.turret = turr;

      // Cañón doble frontal
      const gunMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.9 });
      for (let g = -1; g <= 1; g += 2) {
        const gunGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.8, 10);
        const gun = new THREE.Mesh(gunGeo, gunMat);
        gun.rotation.x = Math.PI / 2;
        gun.position.set(g * 0.5, 3.0, -1.5);
        group.add(gun);
      }

      // Ruedas / patas (4 cajas)
      for (let lx = -1; lx <= 1; lx += 2) {
        for (let lz = -1; lz <= 1; lz += 2) {
          const legGeo = new THREE.BoxGeometry(0.35, 1.2, 0.35);
          const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx * 0.9, 0.6, lz * 0.9);
          group.add(leg);
        }
      }

      // Luz de estado del walker (verde o roja según HP)
      const walkerLight = new THREE.PointLight(0x00ff44, 0.8, 5);
      walkerLight.position.set(0, 3.5, -1.2);
      group.add(walkerLight);
      group.userData.statusLight = walkerLight;

    } else {
      // Soldado / Francotirador (Modelo humanoid mejorado)
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4924a, roughness: 0.85 });
      const armorMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.3 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

      // Piernas
      const legGeo = new THREE.BoxGeometry(0.35, 0.9, 0.32);
      for (let lx = -1; lx <= 1; lx += 2) {
        const leg = new THREE.Mesh(legGeo, armorMat);
        leg.position.set(lx * 0.22, 0.55, 0);
        group.add(leg);
      }

      // Torso con chaleco
      const torsoGeo = new THREE.BoxGeometry(1.1, 1.5, 0.65);
      const torso = new THREE.Mesh(torsoGeo, armorMat);
      torso.position.y = 1.7;
      torso.castShadow = true;
      group.add(torso);

      // Placa pectoral (detalle de armadura)
      const chestGeo = new THREE.BoxGeometry(0.9, 0.6, 0.08);
      const chestMat = new THREE.MeshStandardMaterial({ color: 0x1a2e24, roughness: 0.6, metalness: 0.5 });
      const chest = new THREE.Mesh(chestGeo, chestMat);
      chest.position.set(0, 1.8, -0.35);
      group.add(chest);

      // Brazos
      const armGeo = new THREE.BoxGeometry(0.28, 1.0, 0.28);
      for (let ax = -1; ax <= 1; ax += 2) {
        const arm = new THREE.Mesh(armGeo, armorMat);
        arm.position.set(ax * 0.72, 1.55, 0);
        group.add(arm);
      }

      // Cabeza con casco militar
      const headGeo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 2.65;
      group.add(head);
      group.userData.head = head;

      // Casco sobre la cabeza
      const helmetGeo = new THREE.BoxGeometry(0.7, 0.4, 0.72);
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.6, metalness: 0.4 });
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.set(0, 2.88, 0);
      group.add(helmet);

      // Visor del casco (rojo si sniper, verde si infantry)
      const visorGeo = new THREE.BoxGeometry(0.5, 0.14, 0.1);
      const visorMat = new THREE.MeshStandardMaterial({ 
        color: type === 'sniper' ? 0xff0000 : 0x00ff44,
        emissive: type === 'sniper' ? 0x880000 : 0x004422,
        emissiveIntensity: 1.0,
        transparent: true, opacity: 0.85
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 2.72, -0.38);
      group.add(visor);

      // Arma en mano (fusil de asalto mejorado)
      const rifleBodyGeo = new THREE.BoxGeometry(0.14, 0.18, 1.1);
      const rifle = new THREE.Mesh(rifleBodyGeo, darkMat);
      rifle.position.set(0.62, 1.68, -0.35);
      rifle.rotation.y = -0.2;
      group.add(rifle);

      // Cañón del fusil
      const barrelGeo2 = new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8);
      const barrelR = new THREE.Mesh(barrelGeo2, darkMat);
      barrelR.rotation.x = Math.PI / 2;
      barrelR.position.set(0.62, 1.68, -0.9);
      group.add(barrelR);

      // Si es francotirador: mira telescópica
      if (type === 'sniper') {
        const scopeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8);
        const scope = new THREE.Mesh(scopeGeo, darkMat);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0.62, 1.83, -0.45);
        group.add(scope);
      }
    }

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.enemies.push({
      type,
      group,
      x,
      z,
      y: type === 'drone' ? 2.8 : 1.6,
      hp,
      maxHp: hp,
      speed: (type === 'walker' ? 2.4 : 3.6) * mult.speed,
      radius: type === 'walker' ? 1.6 : 1.0,
      scoreVal,
      lastShoot: performance.now() + Math.random() * 2000,
      shootInterval: (type === 'sniper' ? 2400 : 1600) / mult.fireRate,
      state: 'PATROL',
      patrolAngle: Math.random() * Math.PI * 2,
      alerted: false
    });
  }

  spawnPickup(type, x, z) {
    const group = new THREE.Group();
    let color = 0x2ecc71;

    if (type.includes('gun') || type.includes('laser') || type.includes('rocket') || type.includes('shotgun')) {
      color = 0xa855f7; // Púrpura Armas
    } else if (type === 'quad') {
      color = 0xff0066; // Magenta Quad Dmg
    } else if (type === 'shield') {
      color = 0x00d2d3; // Cyan Escudo
    } else if (type === 'speed') {
      color = 0xf39c12; // Ámbar Overdrive
    } else if (type === 'health') {
      color = 0x2ecc71; // Verde Salud
    }

    // Geometría flotante giratoria (Octaedro o Icosaedro)
    const geo = new THREE.OctahedronGeometry(0.55, 0);
    const mat = new THREE.MeshLambertMaterial({ color, wireframe: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 1.0;
    group.add(mesh);

    // Luz suave del pickup
    const pLight = new THREE.PointLight(color, 1.2, 5);
    pLight.position.y = 1.0;
    group.add(pLight);

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.pickups.push({
      type,
      group,
      mesh,
      x,
      z,
      radius: 1.2,
      collected: false
    });
  }

  spawnTrap(type, x, z) {
    const group = new THREE.Group();

    if (type === 'mine') {
      const mGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.15, 12);
      const mMat = new THREE.MeshLambertMaterial({ color: 0x333 });
      const mine = new THREE.Mesh(mGeo, mMat);
      mine.position.y = 0.08;
      group.add(mine);

      // LED rojo parpadeante
      const ledGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(0, 0.18, 0);
      group.add(led);
    } else {
      // Púas de acero
      const spikeGeo = new THREE.ConeGeometry(0.18, 0.7, 6);
      const spikeMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
      for (let dx = -0.5; dx <= 0.5; dx += 0.5) {
        for (let dz = -0.5; dz <= 0.5; dz += 0.5) {
          const spike = new THREE.Mesh(spikeGeo, spikeMat);
          spike.position.set(dx, 0.35, dz);
          group.add(spike);
        }
      }
    }

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.traps.push({
      type,
      group,
      x,
      z,
      radius: 1.1,
      triggered: false
    });
  }

  // ==========================================
  // MANEJO DE INTERACCIÓN: GOLIATH MECH
  // ==========================================
  handleActionInteraction() {
    const p = this.player;
    const g = this.goliathMech;

    if (!p.inVehicle && g && !g.destroyed) {
      const dist = Math.hypot(p.x - g.x, p.z - g.z);
      if (dist < 4.5) {
        // Abordar Goliath Mech en Primera Persona
        p.inVehicle = true;
        g.occupied = true;
        p.goliathArmor = 500;
        this.triggerFaceReaction('EVIL_GRIN', 180);

        if (window.soundFX) window.soundFX.playMechEnter();
        if (window.uiManager) {
          window.uiManager.showToast('¡ABORDANDO MECH BLINDADO GOLIATH! BLINDAJE 500 HP & CAÑÓN 120MM', 'warning');
        }

        // Mostrar HUD de Cockpit
        const cockpitEl = document.getElementById('goliath-cockpit-hud');
        if (cockpitEl) cockpitEl.classList.remove('d-none');
      }
    } else if (p.inVehicle) {
      // Desmontar Goliath Mech
      p.inVehicle = false;
      if (g) g.occupied = false;
      if (window.soundFX) window.soundFX.playHurt();
      if (window.uiManager) {
        window.uiManager.showToast('Desmontando Mech Goliath. Combate a pie restablecido.', 'info');
      }

      const cockpitEl = document.getElementById('goliath-cockpit-hud');
      if (cockpitEl) cockpitEl.classList.add('d-none');
    }
  }

  handleQuickWeaponSwitch(code) {
    const index = parseInt(code.replace('Digit', '')) - 1;
    const arsenalMap = [
      { name: 'Fusil Asalto Contra', type: 'rifle', damage: 25, fire_rate: 5.0, bullet_speed: 48.0, spread_count: 1, bullet_color: '#ffea00' },
      { name: 'Spread Gun Quíntuple (S)', type: 'spread', damage: 22, fire_rate: 3.5, bullet_speed: 45.0, spread_count: 5, bullet_color: '#ff3366' },
      { name: 'Cañón Láser Concentrado (L)', type: 'laser', damage: 60, fire_rate: 2.2, bullet_speed: 70.0, spread_count: 1, bullet_color: '#00ffff' },
      { name: 'Lanza-Cohetes Explosivo (R)', type: 'rocket', damage: 110, fire_rate: 1.2, bullet_speed: 32.0, spread_count: 1, bullet_color: '#ff6600' },
      { name: 'Escopeta de Plasma (P)', type: 'shotgun', damage: 35, fire_rate: 2.8, bullet_speed: 40.0, spread_count: 3, bullet_color: '#a855f7' }
    ];

    if (arsenalMap[index]) {
      this.player.weapon = arsenalMap[index];
      this.updateWeaponVisuals();
      if (window.soundFX) window.soundFX.playCoin();
      if (window.uiManager) window.uiManager.showToast(`Arma seleccionada: ${this.player.weapon.name}`, 'info');
    }
  }

  // ==========================================
  // DISPARO Y BALÍSTICA EN PRIMERA PERSONA
  // ==========================================
  shoot() {
    const now = performance.now();
    const p = this.player;

    let fireRate = p.weapon.fire_rate || 4.0;
    if (p.inVehicle) fireRate = 2.0; // Cañón pesado dual

    const fireInterval = 1000 / fireRate;
    if (now - p.lastShootTime < fireInterval) return;
    p.lastShootTime = now;

    // Efecto de retroceso del arma (Recoil mejorado)
    this.recoilOffset = 0.22;
    // Kick lateral aleatorio para más autenticidad
    if (this.weaponMesh) {
      this._weaponKickX = (Math.random() - 0.5) * 0.04;
      this._weaponKickY = Math.random() * 0.06 + 0.02;
    }

    // Fogonazo de luz (Muzzle Flash dramático multicapa)
    if (this.muzzleLight) {
      this.muzzleLight.intensity = 8.0 + Math.random() * 4.0;
      this.muzzleLight.color.setHex(Math.random() > 0.5 ? 0xff9900 : 0xffdd44);
      setTimeout(() => { if (this.muzzleLight) this.muzzleLight.intensity = 0; }, 65);
    }

    // Parpadeo del fill light del jugador al disparar
    if (this.playerFillLight) {
      this.playerFillLight.intensity = 2.5;
      setTimeout(() => { if (this.playerFillLight) this.playerFillLight.intensity = 1.2; }, 80);
    }

    // Activar muzzle flash sprite
    this._muzzleFlashTimer = 4;
    if (this.muzzleFlashMesh) {
      this.muzzleFlashMesh.material.opacity = 0.9;
      this.muzzleFlashMesh.scale.set(
        0.8 + Math.random() * 0.6,
        0.8 + Math.random() * 0.6,
        1.0
      );
    }

    // Orientación del disparo según la cámara
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    // Origen del disparo (Justo delante del cañón)
    const origin = new THREE.Vector3(p.x, p.y - 0.2, p.z).add(dir.clone().multiplyScalar(0.8));

    // Multiplicador de Quad Damage
    const dmgMultiplier = p.quadTimer > 0 ? 4.0 : 1.0;

    if (p.inVehicle) {
      // Disparo de Cañón Dual Goliath
      this.spawnPlayerProjectile(origin, dir, 160 * dmgMultiplier, '#ff6600', 'tank_shell', 38.0, 1.8);
      if (window.soundFX) window.soundFX.playShoot('rocket');
      this.triggerFaceReaction('EVIL_GRIN', 120);
    } else {
      const w = p.weapon;
      if (w.spread_count && w.spread_count > 1) {
        // Disparo en abanico 3D (Spread Gun)
        const spreadAngle = 0.08;
        const count = w.spread_count;
        for (let i = 0; i < count; i++) {
          const angleOffset = (i - (count - 1) / 2) * spreadAngle;
          // Rotar vector de disparo horizontalmente
          const spreadDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
          this.spawnPlayerProjectile(origin, spreadDir, (w.damage || 22) * dmgMultiplier, w.bullet_color || '#ff3366', 'spread', w.bullet_speed || 45.0, 0.4);
        }
        if (window.soundFX) window.soundFX.playShoot('spread');
      } else if (w.type === 'laser') {
        // Cañón Láser Perforante
        this.spawnPlayerProjectile(origin, dir, (w.damage || 60) * dmgMultiplier, '#00ffff', 'laser', 70.0, 0.5, true);
        if (window.soundFX) window.soundFX.playShoot('laser');
      } else if (w.type === 'rocket') {
        // Cohete Explosivo
        this.spawnPlayerProjectile(origin, dir, (w.damage || 110) * dmgMultiplier, '#ff6600', 'rocket', 32.0, 0.7);
        if (window.soundFX) window.soundFX.playShoot('rocket');
      } else if (w.type === 'shotgun') {
        // Escopeta
        for (let i = 0; i < 3; i++) {
          const spreadDir = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.08)).normalize();
          this.spawnPlayerProjectile(origin, spreadDir, (w.damage || 35) * dmgMultiplier, '#a855f7', 'shotgun', 42.0, 0.45);
        }
        if (window.soundFX) window.soundFX.playShotgun();
      } else {
        // Fusil de Asalto Estándar
        this.spawnPlayerProjectile(origin, dir, (w.damage || 25) * dmgMultiplier, w.bullet_color || '#ffea00', 'rifle', 48.0, 0.35);
        if (window.soundFX) window.soundFX.playShoot('rifle');
      }

      this.triggerFaceReaction('RAMPAGE', 60);
    }
  }

  spawnPlayerProjectile(origin, dir, damage, colorHex, type, speed = 45.0, size = 0.4, piercing = false) {
    const geo = type === 'laser' ? new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8) : new THREE.SphereGeometry(size * 0.5, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.copy(origin);
    if (type === 'laser') {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
    this.scene.add(mesh);

    this.bullets.push({
      mesh,
      position: mesh.position,
      velocity: dir.clone().multiplyScalar(speed),
      damage,
      type,
      colorHex,
      piercing,
      life: 70
    });
  }

  spawnEnemyProjectile(origin, dir, damage, colorHex = '#ff1144', speed = 24.0) {
    const geo = new THREE.SphereGeometry(0.28, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.enemyBullets.push({
      mesh,
      position: mesh.position,
      velocity: dir.clone().multiplyScalar(speed),
      damage,
      life: 80
    });
  }

  // ==========================================
  // ACTUALIZACIÓN DE ESTADO Y FÍSICAS (UPDATE)
  // ==========================================
  update(delta) {
    if (!this.isRunning || this.isPaused || this.isGameOver || this.isVictory) return;

    const p = this.player;

    // 1. Actualizar timers de invulnerabilidad y poderes
    if (p.invulnerableTimer > 0) p.invulnerableTimer -= delta;
    if (p.quadTimer > 0) p.quadTimer -= delta;
    if (p.shieldTimer > 0) p.shieldTimer -= delta;
    if (p.speedTimer > 0) p.speedTimer -= delta;

    this.updatePowerBadges();

    // 2. Movimiento en Primera Persona (WASD + Shift)
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) {
      moveDir.normalize();

      let currentSpeed = p.baseSpeed;
      if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
        currentSpeed *= p.sprintMult;
      }
      if (p.speedTimer > 0) {
        currentSpeed *= 1.5; // Overdrive
      }
      if (p.inVehicle) {
        currentSpeed = 5.5; // Mech pesado
      }

      // Velocidad
      p.vx = moveDir.x * currentSpeed;
      p.vz = moveDir.z * currentSpeed;

      // Animación de cabeceo (Head Bobbing mejorado - más DOOM)
      const bobSpeed = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) ? 18.0 : 12.0;
      this.headBobTimer += delta * (p.inVehicle ? 8.0 : bobSpeed);
      if (Math.sin(this.headBobTimer) < -0.95) {
        if (window.soundFX) window.soundFX.playFootstep();
      }
    } else {
      p.vx *= 0.72;
      p.vz *= 0.72;
    }

    // Salto
    if (this.keys['Space'] && p.isGrounded && !p.inVehicle) {
      p.vy = 8.5;
      p.isGrounded = false;
      if (window.soundFX) window.soundFX.playFootstep();
    }

    // Gravedad
    if (!p.isGrounded) {
      p.vy -= 22.0 * delta;
    }

    // Nueva posición tentativa
    const newX = p.x + p.vx * delta;
    const newZ = p.z + p.vz * delta;
    const newY = Math.max(2.2, p.y + p.vy * delta);

    if (newY <= 2.2) {
      p.isGrounded = true;
      p.vy = 0;
    }

    // Colisiones con Muros del Laberinto (Deslizamiento suave en X y Z)
    if (!this.checkWallCollision(newX, p.z, p.radius)) {
      p.x = newX;
    }
    if (!this.checkWallCollision(p.x, newZ, p.radius)) {
      p.z = newZ;
    }
    p.y = newY;

    // Sincronizar Cámara con head bob avanzado (doble frecuencia vertical)
    const bobAmplitude = isMoving ? (this.keys['ShiftLeft'] ? 0.14 : 0.09) : 0;
    const bobOffset = Math.sin(this.headBobTimer) * bobAmplitude;
    const bobRoll = isMoving ? Math.cos(this.headBobTimer * 0.5) * 0.018 : 0;
    this.camera.position.set(p.x, p.y + bobOffset, p.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = p.yaw;
    this.camera.rotation.x = p.pitch;
    this.camera.rotation.z = bobRoll; // ligero tambaleo lateral

    // Rotación de cámara con teclado
    const turnSpeed = 2.4 * delta;
    if (this.keys['KeyQ']) this.player.yaw += turnSpeed;
    if (this.keys['KeyE'] && !(this.goliathMech && Math.hypot(p.x - this.goliathMech.x, p.z - this.goliathMech.z) < 4.0)) {
      this.player.yaw -= turnSpeed;
    }
    if ((this.keys['ArrowLeft'] || this.keys['Numpad4']) && !this.isPointerLocked) {
      this.player.yaw += turnSpeed;
    }
    if ((this.keys['ArrowRight'] || this.keys['Numpad6']) && !this.isPointerLocked) {
      this.player.yaw -= turnSpeed;
    }

    // Disparo continuo con clic del ratón o teclas
    const isShootKey = this.keys['KeyF'] || this.keys['KeyJ'] || this.keys['KeyZ'] || this.keys['ControlLeft'] || this.keys['ControlRight'];
    if (this.mouse.isDown || isShootKey) {
      this.shoot();
    }

    // Animación de retorno de retroceso + sway del arma (Doom weapon sway)
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - delta * 2.0);
    }
    if (this._weaponKickX !== undefined) {
      this._weaponKickX *= 0.75;
      this._weaponKickY = this._weaponKickY !== undefined ? Math.max(0, this._weaponKickY - delta * 0.5) : 0;
    }

    // Muzzle flash timer
    if (this._muzzleFlashTimer > 0) {
      this._muzzleFlashTimer--;
      if (this.muzzleFlashMesh) {
        this.muzzleFlashMesh.material.opacity = (this._muzzleFlashTimer / 4) * 0.9;
        this.muzzleFlashMesh.rotation.z += 0.8;
      }
    } else if (this.muzzleFlashMesh && this.muzzleFlashMesh.material.opacity > 0) {
      this.muzzleFlashMesh.material.opacity = 0;
    }

    if (this.weaponMesh) {
      // Sway del arma suave con movimiento
      this._weaponSwayTimer = (this._weaponSwayTimer || 0) + delta;
      const swayX = isMoving ? Math.sin(this._weaponSwayTimer * 3.5) * 0.03 : Math.sin(this._weaponSwayTimer * 0.8) * 0.008;
      const swayY = isMoving ? Math.abs(Math.sin(this._weaponSwayTimer * 3.5)) * 0.025 : Math.sin(this._weaponSwayTimer * 0.6) * 0.006;
      const kickX = this._weaponKickX || 0;
      const kickY = this._weaponKickY || 0;
      this.weaponMesh.position.set(
        0.42 + swayX + kickX,
        -0.42 + swayY - kickY,
        -0.82 + this.recoilOffset
      );
      // Leve rotación del arma hacia arriba al disparar
      this.weaponMesh.rotation.x = -kickY * 0.8;
    }

    // 3. Proximidad al Goliath Mech (Prompt Flotante de Tecla [E])
    const promptAction = document.getElementById('doom-action-prompt');
    if (promptAction) {
      if (this.goliathMech && !p.inVehicle && Math.hypot(p.x - this.goliathMech.x, p.z - this.goliathMech.z) < 4.0) {
        promptAction.classList.remove('d-none');
      } else {
        promptAction.classList.add('d-none');
      }
    }

    // 4. Actualizar Proyectiles del Jugador
    this.bullets.forEach((b) => {
      b.position.addScaledVector(b.velocity, delta);
      b.life--;

      // Colisión de proyectiles con muros
      if (this.checkWallCollision(b.position.x, b.position.z, 0.4)) {
        b.life = 0;
        this.createSparks(b.position.x, b.position.y, b.position.z, b.colorHex);
      }

      // Colisión con Enemigos
      this.enemies.forEach((enemy) => {
        if (enemy.hp > 0 && Math.hypot(b.position.x - enemy.x, b.position.z - enemy.z) < enemy.radius + 0.4) {
          if (!b.piercing) b.life = 0;
          enemy.hp -= b.damage;
          this.triggerHitmarker();
          this.createSparks(b.position.x, b.position.y, b.position.z, '#ff0033');

          if (enemy.hp <= 0) {
            this.killEnemy(enemy);
          } else {
            enemy.alerted = true;
            if (window.soundFX) window.soundFX.playEnemyPain();
          }
        }
      });

      // Colisión con Torretas o Núcleo Boss
      if (this.bossCore && !this.bossCore.isDestroyed) {
        const bc = this.bossCore;
        const distBoss = Math.hypot(b.position.x - bc.x, b.position.z - bc.z);
        if (distBoss < bc.radius) {
          b.life = 0;
          this.triggerHitmarker();

          if (bc.turret1Hp > 0) {
            bc.turret1Hp -= b.damage;
            this.createSparks(b.position.x, b.position.y, b.position.z, '#ffaa00');
          } else if (bc.turret2Hp > 0) {
            bc.turret2Hp -= b.damage;
            this.createSparks(b.position.x, b.position.y, b.position.z, '#ffaa00');
          } else {
            // Daño directo al reactor
            bc.coreHp -= b.damage;
            this.createSparks(b.position.x, b.position.y, b.position.z, '#00ffff');
            if (bc.coreHp <= 0) {
              this.triggerVictory();
            }
          }
        }
      }
    });

    // Limpiar proyectiles caducados
    this.bullets = this.bullets.filter((b) => {
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        return false;
      }
      return true;
    });

    // 5. Actualizar Proyectiles Enemigos
    this.enemyBullets.forEach((eb) => {
      eb.position.addScaledVector(eb.velocity, delta);
      eb.life--;

      if (this.checkWallCollision(eb.position.x, eb.position.z, 0.4)) {
        eb.life = 0;
      }

      // Colisión con el Jugador
      if (Math.hypot(eb.position.x - p.x, eb.position.z - p.z) < p.radius + 0.3) {
        eb.life = 0;
        this.damagePlayer(eb.damage);
      }
    });

    this.enemyBullets = this.enemyBullets.filter((eb) => {
      if (eb.life <= 0) {
        this.scene.remove(eb.mesh);
        return false;
      }
      return true;
    });

    // 6. Actualizar IA de Enemigos en el Laberinto
    const now = performance.now();
    this.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;

      const distToPlayer = Math.hypot(p.x - enemy.x, p.z - enemy.z);

      // Orientar enemigo hacia la cámara (Estilo DOOM Billboard 3D)
      enemy.group.lookAt(p.x, enemy.group.position.y, p.z);

      // Alerta de combate si el jugador está a la vista o cerca (< 24 unidades)
      if (distToPlayer < 24.0) {
        if (!enemy.alerted) {
          enemy.alerted = true;
          if (window.soundFX) window.soundFX.playEnemyAlert();
        }

        // Persecución por el laberinto
        if (distToPlayer > 5.0) {
          const chaseDirX = (p.x - enemy.x) / distToPlayer;
          const chaseDirZ = (p.z - enemy.z) / distToPlayer;
          const nextEx = enemy.x + chaseDirX * enemy.speed * delta;
          const nextEz = enemy.z + chaseDirZ * enemy.speed * delta;

          if (!this.checkWallCollision(nextEx, enemy.z, enemy.radius)) enemy.x = nextEx;
          if (!this.checkWallCollision(enemy.x, nextEz, enemy.radius)) enemy.z = nextEz;

          enemy.group.position.x = enemy.x;
          enemy.group.position.z = enemy.z;
        }

        // Disparo táctico hacia el jugador
        if (now - enemy.lastShoot >= enemy.shootInterval) {
          enemy.lastShoot = now;
          const shootDir = new THREE.Vector3(p.x - enemy.x, (p.y - 0.2) - enemy.y, p.z - enemy.z).normalize();
          const muzzlePos = new THREE.Vector3(enemy.x, enemy.y, enemy.z).add(shootDir.clone().multiplyScalar(1.2));
          this.spawnEnemyProjectile(muzzlePos, shootDir, 15);
        }
      }

      // Daño cuerpo a cuerpo si toca al jugador
      if (distToPlayer < p.radius + enemy.radius) {
        this.damagePlayer(10 * delta);
      }
    });

    // 7. Actualizar Reactor Boss (animación mejorada)
    if (this.bossCore && !this.bossCore.isDestroyed) {
      const bc = this.bossCore;
      bc.coreSphere.rotation.y += delta * 2.2;
      bc.coreSphere.rotation.x += delta * 0.8;
      // Pulso de intensidad dramático
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
      bc.coreLight.intensity = 2.5 + pulse * 3.5;
      // Color cambiante del reactor
      bc.coreLight.color.setHSL(0.5 + pulse * 0.15, 1.0, 0.5);

      // Escala pulsante de la esfera del núcleo
      const scalePulse = 1.0 + Math.sin(now * 0.008) * 0.1;
      bc.coreSphere.scale.set(scalePulse, scalePulse, scalePulse);

      const distBoss = Math.hypot(p.x - bc.x, p.z - bc.z);
      if (distBoss < 30.0 && now - bc.lastShoot >= 1200) {
        bc.lastShoot = now;
        // Disparo en 3 direcciones a la vez (patrón de disparo más agresivo)
        for (let shot = 0; shot < 2; shot++) {
          const spreadRad = (shot - 0.5) * 0.25;
          const baseDir = new THREE.Vector3(p.x - bc.x, p.y - 2.8, p.z - bc.z).normalize();
          const shotDir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadRad);
          this.spawnEnemyProjectile(new THREE.Vector3(bc.x, 2.8, bc.z), shotDir, 22, '#ff0055', 30.0);
        }
        const centerDir = new THREE.Vector3(p.x - bc.x, p.y - 2.8, p.z - bc.z).normalize();
        this.spawnEnemyProjectile(new THREE.Vector3(bc.x, 2.8, bc.z), centerDir, 28, '#ff0033', 32.0);
      }
    }

    // 8. Actualizar Trampas (Minas y Púas)
    this.traps.forEach((trap) => {
      if (!trap.triggered && Math.hypot(p.x - trap.x, p.z - trap.z) < trap.radius) {
        trap.triggered = true;
        if (trap.type === 'mine') {
          this.createSparks(trap.x, 0.4, trap.z, '#ff3300', 30);
          if (window.soundFX) {
            window.soundFX.playMineBeep();
            window.soundFX.playExplosion(1.5);
          }
          this.damagePlayer(35);
        } else {
          if (window.soundFX) window.soundFX.playSpikes();
          this.damagePlayer(20);
        }
      }
    });

    // 9. Recolección de Suministros y Power-Ups
    this.pickups.forEach((pu) => {
      if (!pu.collected) {
        pu.mesh.rotation.y += delta * 2.0;
        pu.mesh.rotation.x += delta * 1.2;

        if (Math.hypot(p.x - pu.x, p.z - pu.z) < pu.radius + p.radius) {
          pu.collected = true;
          this.scene.remove(pu.group);
          this.applyPickup(pu.type);
        }
      }
    });

    // 10. Actualizar Rostro DOOM Marine y Minimapa Radar
    this.updateDoomMarineFace(delta);
    this.drawTacticalMinimap();

    // 11. Progreso de la Misión hacia la Base Enemiga (0% a 100%)
    const midN = Math.floor(this.gridSize / 2) * this.cellSize;
    const initialDist = Math.hypot(this.player.x - midN, this.player.z - midN);
    const progress = Math.min(100, Math.max(0, 100 - (initialDist / 85.0) * 100));

    if (window.uiManager) {
      window.uiManager.gameScore = this.score;
      window.uiManager.gameCoins = this.coins;
      window.uiManager.playerLives = p.lives;
      window.uiManager.baseProgress = progress;
      window.uiManager.updateHUD();
    }
  }

  // ==========================================
  // COLISIONES CON MUROS (AABB Grid Collision)
  // ==========================================
  checkWallCollision(x, z, radius) {
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellZ = Math.floor((z - radius) / this.cellSize);
    const maxCellZ = Math.floor((z + radius) / this.cellSize);

    for (let cz = minCellZ; cz <= maxCellZ; cz++) {
      for (let cx = minCellX; cx <= maxCellX; cx++) {
        if (cz < 0 || cz >= this.gridSize || cx < 0 || cx >= this.gridSize) {
          return true;
        }
        if (this.maze[cz][cx] === 1 || this.maze[cz][cx] === 2) {
          return true;
        }
      }
    }
    return false;
  }

  // ==========================================
  // EFECTOS VISUALES Y REACCIONES DE DAÑO
  // ==========================================
  damagePlayer(amount) {
    const p = this.player;
    if (p.shieldTimer > 0 || p.invulnerableTimer > 0) return; // Inmune por escudo o cooldown

    if (p.inVehicle) {
      // Daño absorbido por el blindaje del Mech Goliath
      p.goliathArmor -= amount;
      this.flashDamageOverlay();
      if (window.soundFX) window.soundFX.playExplosion(0.3);

      const badge = document.getElementById('goliath-armor-badge');
      if (badge) badge.textContent = `ARMADURA: ${Math.max(0, Math.round(p.goliathArmor))} / 500 HP`;

      if (p.goliathArmor <= 0) {
        // Mech destruido: eyectar al soldado
        p.inVehicle = false;
        if (this.goliathMech) this.goliathMech.destroyed = true;
        this.createSparks(p.x, p.y, p.z, '#ff4400', 40);
        if (window.soundFX) window.soundFX.playExplosion(2.0);
        if (window.uiManager) window.uiManager.showToast('¡MECH GOLIATH DESTRUIDO! EYECTANDO AL SOLDADO...', 'danger');
        const cockpitEl = document.getElementById('goliath-cockpit-hud');
        if (cockpitEl) cockpitEl.classList.add('d-none');
      }
      return;
    }

    // Daño a pie: primero consume armadura/escudo, luego salud
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, amount);
      p.armor -= absorbed;
      amount -= absorbed;
    }

    if (amount > 0) {
      p.health -= amount;
    }

    this.flashDamageOverlay();
    this.triggerFaceReaction('HURT', 70);
    if (window.soundFX) window.soundFX.playHurt();

    // Actualizar números de salud en el HUD con efectos críticos
    const hDisp = document.getElementById('doom-health-display');
    const aDisp = document.getElementById('doom-armor-display');
    if (hDisp) {
      hDisp.textContent = `${Math.max(0, Math.round(p.health))}%`;
      // Parpadeo rojo crítico cuando HP < 25
      hDisp.classList.toggle('critical', p.health < 25);
    }
    if (aDisp) aDisp.textContent = `${Math.max(0, Math.round(p.armor))}%`;

    // Viñeta roja de peligro extremo (< 30 HP)
    const powerGlow = document.getElementById('doom-power-glow');
    if (powerGlow && p.health < 30 && p.quadTimer <= 0 && p.shieldTimer <= 0 && p.speedTimer <= 0) {
      powerGlow.className = 'doom-overlay-layer critical-health';
    }

    if (p.health <= 0) {
      p.lives--;
      p.invulnerableTimer = 2.5;

      if (p.lives > 0) {
        p.health = 100;
        p.armor = 50;
        if (window.uiManager) window.uiManager.showToast(`¡CAÍSTE EN COMBATE! VIDAS RESTANTES: ${p.lives}`, 'danger');
      } else {
        this.triggerGameOver();
      }
    }
  }

  flashDamageOverlay() {
    const flashEl = document.getElementById('doom-damage-flash');
    if (flashEl) {
      flashEl.classList.add('flash');
      setTimeout(() => flashEl.classList.remove('flash'), 180);
    }
  }

  triggerHitmarker() {
    const hm = document.getElementById('doom-hitmarker');
    if (hm) {
      hm.classList.remove('d-none');
      setTimeout(() => hm.classList.add('d-none'), 120);
    }
    if (window.soundFX) window.soundFX.playHitmarker();
  }

  applyPickup(type) {
    const p = this.player;
    this.triggerFaceReaction('EVIL_GRIN', 140);
    if (window.soundFX) window.soundFX.playPowerup(type);

    if (type === 'health') {
      p.health = Math.min(100, p.health + 50);
      if (window.uiManager) window.uiManager.showToast('¡BOTIQUÍN MILITAR OBTENIDO! +50 SALUD', 'success');
    } else if (type === 'quad') {
      p.quadTimer = 18.0; // 18 segundos de Quad Damage
      if (window.uiManager) window.uiManager.showToast('¡QUAD DAMAGE ACTIVADO! DAÑO CUÁDRUPLE POR 18s', 'danger');
    } else if (type === 'shield') {
      p.shieldTimer = 14.0; // 14 segundos de invulnerabilidad
      p.armor = 100;
      if (window.uiManager) window.uiManager.showToast('¡ESCUDO DE ENERGÍA ABSORBENTE ACTIVO!', 'info');
    } else if (type === 'speed') {
      p.speedTimer = 15.0; // 15 segundos de overdrive
      if (window.uiManager) window.uiManager.showToast('¡OVERDRIVE DE VELOCIDAD TÁCTICA!', 'warning');
    } else {
      // Armas encontradas en el laberinto
      const weaponsMap = {
        spread_gun: { name: 'Spread Gun Quíntuple (S)', type: 'spread', damage: 22, fire_rate: 3.5, bullet_speed: 45.0, spread_count: 5, bullet_color: '#ff3366' },
        laser_beam: { name: 'Cañón Láser Concentrado (L)', type: 'laser', damage: 60, fire_rate: 2.2, bullet_speed: 70.0, spread_count: 1, bullet_color: '#00ffff' },
        rocket_pod: { name: 'Lanza-Cohetes Explosivo (R)', type: 'rocket', damage: 110, fire_rate: 1.2, bullet_speed: 32.0, spread_count: 1, bullet_color: '#ff6600' },
        plasma_shotgun: { name: 'Escopeta de Plasma (P)', type: 'shotgun', damage: 35, fire_rate: 2.8, bullet_speed: 40.0, spread_count: 3, bullet_color: '#a855f7' }
      };
      if (weaponsMap[type]) {
        p.weapon = weaponsMap[type];
        this.updateWeaponVisuals();
        if (window.uiManager) window.uiManager.showToast(`¡ARSENAL DESBLOQUEADO: ${p.weapon.name}!`, 'success');
      }
    }

    const hDisp = document.getElementById('doom-health-display');
    const aDisp = document.getElementById('doom-armor-display');
    if (hDisp) hDisp.textContent = `${Math.max(0, Math.round(p.health))}%`;
    if (aDisp) aDisp.textContent = `${Math.max(0, Math.round(p.armor))}%`;
  }

  updatePowerBadges() {
    const p = this.player;
    const bQuad = document.getElementById('power-badge-quad');
    const bShield = document.getElementById('power-badge-shield');
    const bSpeed = document.getElementById('power-badge-speed');
    const glowOverlay = document.getElementById('doom-power-glow');

    if (bQuad) bQuad.classList.toggle('d-none', p.quadTimer <= 0);
    if (bShield) bShield.classList.toggle('d-none', p.shieldTimer <= 0);
    if (bSpeed) bSpeed.classList.toggle('d-none', p.speedTimer <= 0);

    if (glowOverlay) {
      glowOverlay.className = 'doom-overlay-layer';
      if (p.quadTimer > 0) glowOverlay.classList.add('quad-glow');
      else if (p.shieldTimer > 0) glowOverlay.classList.add('shield-glow');
      else if (p.speedTimer > 0) glowOverlay.classList.add('speed-glow');
    }
  }

  killEnemy(enemy) {
    this.score += enemy.scoreVal;
    this.coins += Math.round((Math.random() * 5 + 3) * this.diffMultipliers[this.difficulty].coinMult);
    this.enemiesKilled++;
    this.killStreak++;

    this.scene.remove(enemy.group);
    this.createSparks(enemy.x, enemy.y, enemy.z, '#ff6600', 25);
    if (window.soundFX) window.soundFX.playEnemyDeath();

    if (this.killStreak % 3 === 0) {
      this.triggerFaceReaction('EVIL_GRIN', 150);
    }
  }

  createSparks(x, y, z, colorHex, count = 16) {
    // Sistema de partículas avanzado: chispas + debris + flash
    const color = new THREE.Color(colorHex);

    // 1. Chispas rápidas pequeñas
    for (let i = 0; i < count; i++) {
      // Tamaño variable: partículas grandes y pequeñas mezcladas
      const size = Math.random() > 0.7 ? 0.12 : 0.06;
      const geo = new THREE.SphereGeometry(size, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.set(x + (Math.random()-0.5)*0.3, y + (Math.random()-0.5)*0.3, z + (Math.random()-0.5)*0.3);
      this.scene.add(particle);

      const speed = Math.random() * 10.0 + 3.0;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * 7.0 + 1.0,
        (Math.random() - 0.5) * speed
      );

      this.particles.push({ mesh: particle, mat, velocity: vel, life: 20 + Math.floor(Math.random() * 15), maxLife: 35, emissive: true });
    }

    // 2. Debris cuadrado (fragmentos de material)
    for (let d = 0; d < Math.floor(count / 3); d++) {
      const side = Math.random() * 0.15 + 0.05;
      const debrisGeo = new THREE.BoxGeometry(side, side, side);
      const debrisMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const debris = new THREE.Mesh(debrisGeo, debrisMat);
      debris.position.set(x, y, z);
      this.scene.add(debris);

      const dVel = new THREE.Vector3(
        (Math.random() - 0.5) * 6.0,
        Math.random() * 5.0,
        (Math.random() - 0.5) * 6.0
      );
      const dAngVel = new THREE.Vector3(Math.random()*8, Math.random()*8, Math.random()*8);

      this.particles.push({ mesh: debris, mat: debrisMat, velocity: dVel, angVelocity: dAngVel, life: 18 + Math.floor(Math.random()*10), maxLife: 28 });
    }

    // 3. Flash de luz en el punto de impacto
    const flashLight = new THREE.PointLight(colorHex, 4.0, 8);
    flashLight.position.set(x, y, z);
    this.scene.add(flashLight);
    setTimeout(() => { 
      this.scene.remove(flashLight);
      flashLight.dispose();
    }, 120);
  }

  // ==========================================
  // ROSTRO DEL MARINE DOOM DINÁMICO (CANVAS)
  // ==========================================
  initDoomMarineFace() {
    this.faceCanvas = document.getElementById('doom-marine-face');
    if (!this.faceCanvas) return;
    this.faceCtx = this.faceCanvas.getContext('2d');
  }

  triggerFaceReaction(state, durationFrames = 60) {
    this.faceState = state;
    this.faceTimer = durationFrames;
  }

  updateDoomMarineFace(delta) {
    if (!this.faceCtx || !this.faceCanvas) return;
    const ctx = this.faceCtx;
    const w = this.faceCanvas.width;
    const h = this.faceCanvas.height;

    if (this.faceTimer > 0) {
      this.faceTimer--;
      if (this.faceTimer <= 0) {
        this.faceState = 'NEUTRAL';
      }
    } else {
      // Mirar aleatoriamente a la izquierda o derecha
      if (Math.random() < 0.015) {
        this.eyeDirection = (Math.random() > 0.5) ? 1 : -1;
      } else if (Math.random() < 0.02) {
        this.eyeDirection = 0;
      }
    }

    ctx.clearRect(0, 0, w, h);

    // Fondo del marco del rostro
    ctx.fillStyle = '#0a1410';
    ctx.fillRect(0, 0, w, h);

    const hp = this.player.health;
    const isDead = this.player.lives <= 0 || this.isGameOver;

    // 1. Tono de Piel del Marine
    ctx.fillStyle = isDead ? '#555e58' : '#e0a96d';
    // Cabeza
    ctx.beginPath();
    ctx.roundRect(14, 12, 40, 44, 8);
    ctx.fill();

    // 2. Cabello Militar (Crew Cut) y Cinta Roja de Contra
    ctx.fillStyle = '#3d2314';
    ctx.fillRect(14, 10, 40, 10);
    ctx.fillStyle = '#e74c3c'; // Cinta roja de Contra
    ctx.fillRect(12, 16, 44, 6);

    // 3. Ojos (Mueven dirección / Dolor)
    const eyeY = 28;
    if (this.faceState === 'HURT') {
      // Ojos apretados por el dolor
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(22, eyeY); ctx.lineTo(28, eyeY + 2);
      ctx.moveTo(40, eyeY + 2); ctx.lineTo(46, eyeY);
      ctx.stroke();
    } else {
      // Ojos abiertos determinados
      ctx.fillStyle = '#fff';
      ctx.fillRect(20, eyeY - 2, 9, 6);
      ctx.fillRect(39, eyeY - 2, 9, 6);

      // Pupilas
      ctx.fillStyle = '#111';
      const pupilX = this.eyeDirection * 2;
      ctx.fillRect(23 + pupilX, eyeY - 1, 4, 4);
      ctx.fillRect(42 + pupilX, eyeY - 1, 4, 4);
    }

    // 4. Cejas pobladas agresivas
    ctx.fillStyle = '#222';
    ctx.fillRect(19, 23, 11, 3);
    ctx.fillRect(38, 23, 11, 3);

    // 5. Nariz
    ctx.fillStyle = '#c7894a';
    ctx.fillRect(31, 32, 6, 8);

    // 6. Boca y Expresión
    if (this.faceState === 'EVIL_GRIN' || this.faceState === 'RAMPAGE') {
      // Sonrisa diabólica mostrando dientes de victoria DOOM
      ctx.fillStyle = '#111';
      ctx.fillRect(23, 44, 22, 7);
      ctx.fillStyle = '#fff';
      for (let tx = 25; tx < 43; tx += 4) {
        ctx.fillRect(tx, 45, 3, 3);
      }
    } else if (this.faceState === 'HURT') {
      // Mueca de dolor
      ctx.fillStyle = '#330000';
      ctx.fillRect(24, 45, 20, 5);
    } else if (isDead) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(24, 47); ctx.lineTo(44, 47);
      ctx.stroke();
    } else {
      // Determinación neutra
      ctx.fillStyle = '#553311';
      ctx.fillRect(26, 45, 16, 4);
    }

    // 7. Manchas de Sangre Progresivas según HP
    if (hp < 80) {
      ctx.fillStyle = 'rgba(180, 0, 0, 0.75)';
      ctx.fillRect(18, 14, 6, 8); // Sangre en la frente
    }
    if (hp < 50) {
      ctx.fillStyle = 'rgba(190, 0, 0, 0.85)';
      ctx.fillRect(44, 30, 7, 10); // Ojo morado y sangre en mejilla
      ctx.fillRect(28, 48, 4, 6); // Sangre goteando del labio
    }
    if (hp < 25) {
      ctx.fillStyle = 'rgba(210, 0, 0, 0.95)';
      ctx.fillRect(22, 22, 10, 6);
      ctx.fillRect(36, 42, 8, 8);
    }
  }

  // ==========================================
  // RADAR TÁCTICO / MINIMAPA DEL LABERINTO
  // ==========================================
  drawTacticalMinimap() {
    const miniCanvas = document.getElementById('doom-minimap');
    if (!miniCanvas) return;
    const ctx = miniCanvas.getContext('2d');
    const w = miniCanvas.width;
    const h = miniCanvas.height;
    const N = this.gridSize;
    const cellPixel = w / N;

    ctx.clearRect(0, 0, w, h);

    // Fondo del radar
    ctx.fillStyle = 'rgba(4, 18, 12, 0.95)';
    ctx.fillRect(0, 0, w, h);

    // Dibujar Muros del Laberinto
    ctx.fillStyle = '#143828';
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        if (this.maze[z][x] === 1 || this.maze[z][x] === 2) {
          ctx.fillRect(x * cellPixel, z * cellPixel, cellPixel + 0.5, cellPixel + 0.5);
        }
      }
    }

    // Dibujar Pickups
    this.pickups.forEach((pu) => {
      if (!pu.collected) {
        ctx.fillStyle = '#f1c40f';
        const px = (pu.x / (N * this.cellSize)) * w;
        const pz = (pu.z / (N * this.cellSize)) * h;
        ctx.beginPath();
        ctx.arc(px, pz, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Dibujar Mech Goliath
    if (this.goliathMech && !this.goliathMech.destroyed) {
      ctx.fillStyle = '#f39c12';
      const gx = (this.goliathMech.x / (N * this.cellSize)) * w;
      const gz = (this.goliathMech.z / (N * this.cellSize)) * h;
      ctx.fillRect(gx - 2.5, gz - 2.5, 5, 5);
    }

    // Dibujar Boss Reactor
    if (this.bossCore && !this.bossCore.isDestroyed) {
      ctx.fillStyle = '#00d2d3';
      const bx = (this.bossCore.x / (N * this.cellSize)) * w;
      const bz = (this.bossCore.z / (N * this.cellSize)) * h;
      ctx.beginPath();
      ctx.arc(bx, bz, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dibujar Enemigos
    ctx.fillStyle = '#e74c3c';
    this.enemies.forEach((enemy) => {
      if (enemy.hp > 0) {
        const ex = (enemy.x / (N * this.cellSize)) * w;
        const ez = (enemy.z / (N * this.cellSize)) * h;
        ctx.beginPath();
        ctx.arc(ex, ez, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Dibujar Jugador y Cono de Visión
    const px = (this.player.x / (N * this.cellSize)) * w;
    const pz = (this.player.z / (N * this.cellSize)) * h;

    // Cono de Visión
    ctx.fillStyle = 'rgba(46, 204, 113, 0.25)';
    ctx.beginPath();
    ctx.moveTo(px, pz);
    ctx.arc(px, pz, 16, this.player.yaw - Math.PI / 2 - 0.45, this.player.yaw - Math.PI / 2 + 0.45);
    ctx.closePath();
    ctx.fill();

    // Punto verde de Jugador
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(px, pz, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ==========================================
  // FIN DE PARTIDA: VICTORIA / GAME OVER
  // ==========================================
  triggerVictory() {
    if (this.isVictory) return;
    this.isVictory = true;
    this.bossCore.isDestroyed = true;
    this.score += 5000;
    this.coins += 250;

    this.createSparks(this.bossCore.x, 2.8, this.bossCore.z, '#00ffff', 60);
    if (window.soundFX) window.soundFX.playExplosion(2.5);

    this.recordMatchResults(true);
  }

  triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.exitLock();
    this.triggerFaceReaction('DEAD', 9999);
    this.recordMatchResults(false);
  }

  async recordMatchResults(won) {
    if (window.soundFX) {
      if (won) window.soundFX.playCoin();
      else window.soundFX.playHurt();
    }

    try {
      if (window.ApiClient && ApiClient.getToken()) {
        await ApiClient.recordMatch({
          score: this.score,
          coinsEarned: this.coins,
          enemiesKilled: this.enemiesKilled,
          difficulty: this.difficulty,
          basesDestroyed: won ? 1 : 0
        });
      }

      if (window.uiManager) {
        window.uiManager.showToast(
          won
            ? `¡VICTORIA TOTAL! Reactor destruido. Puntuación: ${this.score}`
            : `MISIÓN FALLIDA EN EL LABERINTO. Puntuación: ${this.score}`,
          won ? 'success' : 'danger'
        );
        setTimeout(() => {
          this.exitLock();
          window.uiManager.returnToHQ();
        }, 3600);
      }
    } catch (err) {
      console.error('Error al guardar reporte de partida:', err);
    }
  }

  // ==========================================
  // BUCLE PRINCIPAL DE JUEGO (GAME LOOP)
  // ==========================================
  loop() {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = Math.min(0.06, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    this.update(delta);

    // Actualizar partículas avanzadas con fade y gravedad
    this.particles.forEach((part) => {
      part.mesh.position.addScaledVector(part.velocity, delta);
      part.velocity.y -= 14.0 * delta; // Gravedad más fuerte
      part.velocity.x *= 0.98; // Fricción del aire
      part.velocity.z *= 0.98;

      // Rotación de debris
      if (part.angVelocity) {
        part.mesh.rotation.x += part.angVelocity.x * delta;
        part.mesh.rotation.y += part.angVelocity.y * delta;
        part.mesh.rotation.z += part.angVelocity.z * delta;
      }

      // Fade out de opacidad
      if (part.mat && part.mat.transparent && part.maxLife) {
        part.mat.opacity = part.life / part.maxLife;
      }

      part.life--;
    });
    this.particles = this.particles.filter((p) => {
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.mat) p.mat.dispose();
        return false;
      }
      return true;
    });

    // Actualizar animaciones de enemigos (rotación de ring de drones, etc.)
    if (this.enemies) {
      this.enemies.forEach((enemy) => {
        if (enemy.hp > 0 && enemy.group) {
          if (enemy.group.userData.animRing) {
            enemy.group.userData.animRing.rotation.y += delta * 2.5;
            enemy.group.userData.animRing.rotation.z += delta * 1.2;
          }
          if (enemy.group.userData.head && enemy.type !== 'drone') {
            enemy.group.userData.head.rotation.y = Math.sin(now * 0.001) * 0.1;
          }
          // Walker: actualizar color del semáforo según HP
          if (enemy.group.userData.statusLight) {
            const hpRatio = enemy.hp / enemy.maxHp;
            enemy.group.userData.statusLight.color.setHSL(hpRatio * 0.33, 1.0, 0.5);
          }
        }
      });
    }

    // Actualizar luces de parpadeo ambiental
    this._ambientFlickerTimer = (this._ambientFlickerTimer || 0) + delta;
    if (this._ambientFlickerLights) {
      this._ambientFlickerLights.forEach((fl) => {
        fl.timer += delta * (3.0 + Math.random() * 2.0);
        // Parpadeo realista de luz fluorescente
        const flicker = Math.sin(fl.timer * 8.5) * Math.sin(fl.timer * 3.1) + 1.0;
        fl.light.intensity = fl.baseIntensity * (0.4 + flicker * 0.6);
      });
    }

    // Actualizar linterna del jugador (parpadeo leve bajo HP)
    if (this.playerLight && this.player.health < 50) {
      const healthRatio = this.player.health / 50;
      const flicker = 1.0 - (1.0 - healthRatio) * 0.3 * Math.sin(now * 0.012);
      this.playerLight.intensity = 6.0 * flicker;
    }

    // Renderizar escena 3D en WebGL
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }
}

// Instanciación Global del Motor 3D
window.ContraGameEngine = new ContraDoom3D();
