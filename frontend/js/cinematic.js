// Cinemática Inicial de Infiltración: Helicóptero Militar en Llamas estrellándose en la Selva

class IntroCinematic {
  constructor(canvasId, onComplete) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.onComplete = onComplete;
    this.isRunning = false;
    this.animationId = null;

    // Estados de la cinemática
    this.timer = 0;
    this.duration = 540; // ~9 segundos a 60 FPS
    this.skipRequested = false;

    // Estado del helicóptero
    this.heli = {
      x: -120,
      y: 80,
      vx: 3.2,
      vy: 1.4,
      angle: 0.12,
      rotorAngle: 0,
      smokeParticles: [],
      fireParticles: [],
      doorOpen: false
    };

    // Estado del soldado
    this.soldier = {
      active: false,
      x: 0,
      y: 0,
      vx: 2.5,
      vy: -4,
      gravity: 0.22,
      rotation: 0,
      landed: false
    };

    // Efectos de cámara y entorno
    this.shake = 0;
    this.flashAlpha = 0;
    this.dialogue = '';
    this.textProgress = 0;

    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      if (!this.isRunning) return;
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        this.skip();
      }
    };
    window.addEventListener('keydown', this.handleKeyDown);
  }

  start() {
    if (!this.canvas || !this.ctx) return;
    this.isRunning = true;
    this.timer = 0;
    this.heli.x = -100;
    this.heli.y = 70;
    this.heli.smokeParticles = [];
    this.heli.fireParticles = [];
    this.soldier.active = false;
    this.soldier.landed = false;

    // Redimensionar canvas para resolución fija nítida
    this.canvas.width = 1000;
    this.canvas.height = 560;

    if (window.soundFX) {
      window.soundFX.init();
      window.soundFX.playAlarm();
    }

    this.loop();
  }

  skip() {
    if (!this.isRunning) return;
    this.finish();
  }

  finish() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.onComplete) {
      this.onComplete();
    }
  }

  update() {
    this.timer++;

    // 1. Movimiento del Helicóptero en llamas
    this.heli.x += this.heli.vx;
    this.heli.y += this.heli.vy;
    this.heli.rotorAngle += 0.8;
    this.heli.angle += Math.sin(this.timer * 0.1) * 0.015;

    // Generar fuego y humo del rotor trasero
    for (let i = 0; i < 3; i++) {
      this.heli.smokeParticles.push({
        x: this.heli.x - 45 + Math.random() * 10,
        y: this.heli.y + Math.random() * 8,
        vx: -1.5 - Math.random() * 2,
        vy: -0.5 - Math.random() * 1.5,
        radius: 8 + Math.random() * 8,
        alpha: 0.8,
        color: Math.random() > 0.4 ? 'rgba(60,60,60,' : 'rgba(30,30,30,'
      });

      this.heli.fireParticles.push({
        x: this.heli.x - 30 + Math.random() * 15,
        y: this.heli.y - 5 + Math.random() * 12,
        vx: -2 - Math.random() * 2,
        vy: -1 - Math.random() * 2,
        radius: 4 + Math.random() * 6,
        alpha: 1,
        color: Math.random() > 0.5 ? '#ff3300' : '#ffcc00'
      });
    }

    // Actualizar partículas
    this.heli.smokeParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.radius += 0.4;
      p.alpha -= 0.015;
    });
    this.heli.smokeParticles = this.heli.smokeParticles.filter((p) => p.alpha > 0);

    this.heli.fireParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.radius += 0.2;
      p.alpha -= 0.035;
    });
    this.heli.fireParticles = this.heli.fireParticles.filter((p) => p.alpha > 0);

    // 2. Eventos de la trama
    if (this.timer === 60) {
      if (window.soundFX) window.soundFX.playAlarm();
    }

    if (this.timer === 140) {
      // Salto del Soldado
      this.soldier.active = true;
      this.soldier.x = this.heli.x + 10;
      this.soldier.y = this.heli.y + 25;
      this.soldier.vx = 2.8;
      this.soldier.vy = -3.5;
      if (window.soundFX) window.soundFX.playShoot('rifle');
    }

    // 3. Física del soldado
    if (this.soldier.active && !this.soldier.landed) {
      this.soldier.x += this.soldier.vx;
      this.soldier.y += this.soldier.vy;
      this.soldier.vy += this.soldier.gravity;
      this.soldier.rotation += 0.18;

      // Suelo de la selva en Y = 460
      if (this.soldier.y >= 460) {
        this.soldier.y = 460;
        this.soldier.vx = 0;
        this.soldier.vy = 0;
        this.soldier.rotation = 0;
        this.soldier.landed = true;
        this.shake = 10;
        if (window.soundFX) window.soundFX.playHurt();
      }
    }

    // 4. Choque y explosión del helicóptero al fondo
    if (this.timer === 280) {
      this.shake = 22;
      this.flashAlpha = 0.85;
      if (window.soundFX) window.soundFX.playExplosion(1.5);
    }

    // Atenuar efectos
    if (this.shake > 0) this.shake *= 0.9;
    if (this.flashAlpha > 0) this.flashAlpha -= 0.03;

    // Actualizar diálogo estilo teletipo
    const fullText = "¡MAYDAY! EL HELICÓPTERO FUE ALCANZADO POR ARTILLERÍA PESADA...\n¡EL COMANDO SALTA A LA SELVA!\nMISIÓN: DESTRUIR LAS BASES ENEMIGAS.";
    if (this.timer > 80 && this.textProgress < fullText.length) {
      this.textProgress += 0.8;
      this.dialogue = fullText.slice(0, Math.floor(this.textProgress));
    }

    // Fin automático
    if (this.timer >= this.duration) {
      this.finish();
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    // Efecto Screen Shake
    if (this.shake > 0.5) {
      const offsetX = (Math.random() - 0.5) * this.shake;
      const offsetY = (Math.random() - 0.5) * this.shake;
      ctx.translate(offsetX, offsetY);
    }

    // 1. Cielo nocturno de selva
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#06130e');
    skyGrad.addColorStop(0.7, '#0b261b');
    skyGrad.addColorStop(1, '#05120c');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Luna y estrellas retro
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(840, 110, 45, 0, Math.PI * 2);
    ctx.fill();

    // Siluetas de árboles de fondo
    ctx.fillStyle = '#061a12';
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, h - 80);
      ctx.lineTo(x + 30, h - 220);
      ctx.lineTo(x + 60, h - 80);
      ctx.fill();
    }

    // Humo del helicóptero
    this.heli.smokeParticles.forEach((p) => {
      ctx.fillStyle = `${p.color}${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Fuego del helicóptero
    this.heli.fireParticles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // 2. Helicóptero Militar (UH-1 Huey Silhouette Style)
    if (this.timer < 290) {
      ctx.save();
      ctx.translate(this.heli.x, this.heli.y);
      ctx.rotate(this.heli.angle);

      // Cola
      ctx.fillStyle = '#1c3127';
      ctx.fillRect(-65, -6, 50, 10);
      // Estabilizador trasero
      ctx.fillRect(-70, -18, 10, 22);

      // Rotor trasero en llamas
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(-72, -16 + Math.sin(this.heli.rotorAngle * 2) * 12, 4, 18);

      // Fuselaje
      ctx.fillStyle = '#2d4a3e';
      ctx.beginPath();
      ctx.roundRect(-25, -18, 70, 36, 12);
      ctx.fill();

      // Ventanilla de cabina
      ctx.fillStyle = '#3498db';
      ctx.beginPath();
      ctx.roundRect(25, -14, 18, 18, 4);
      ctx.fill();

      // Patines de aterrizaje
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-15, 24);
      ctx.lineTo(35, 24);
      ctx.moveTo(-5, 18);
      ctx.lineTo(-10, 24);
      ctx.moveTo(25, 18);
      ctx.lineTo(20, 24);
      ctx.stroke();

      // Mástil y Aspas principales girando
      ctx.fillStyle = '#111';
      ctx.fillRect(8, -25, 6, 8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2.5;
      const bladeSpread = Math.cos(this.heli.rotorAngle) * 65;
      ctx.beginPath();
      ctx.moveTo(11 - bladeSpread, -25);
      ctx.lineTo(11 + bladeSpread, -25);
      ctx.stroke();

      ctx.restore();
    } else {
      // Restos en llamas al fondo
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(this.heli.x - 20, 390, 50, 20);
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(this.heli.x + 5, 385, 25 + Math.sin(this.timer * 0.4) * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Suelo de la Selva
    ctx.fillStyle = '#0f2b1d';
    ctx.fillRect(0, 460, w, 100);

    // Detalles de vegetación y lianas
    ctx.fillStyle = '#1b4d3e';
    for (let x = 0; x < w; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 460);
      ctx.lineTo(x + 10, 445);
      ctx.lineTo(x + 20, 460);
      ctx.fill();
    }

    // 4. Soldado Comando (Saltando o en el suelo listo)
    if (this.soldier.active) {
      ctx.save();
      ctx.translate(this.soldier.x, this.soldier.y);
      ctx.rotate(this.soldier.rotation);

      if (!this.soldier.landed) {
        // En el aire (Combat Roll)
        ctx.fillStyle = '#27ae60'; // Uniforme
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e74c3c'; // Cinta roja de combate
        ctx.fillRect(-8, -6, 16, 4);
      } else {
        // Aterrizado de pie listo para el combate
        // Piernas
        ctx.fillStyle = '#1e372b';
        ctx.fillRect(-8, -12, 6, 14);
        ctx.fillRect(2, -12, 6, 14);

        // Torso / Chaleco
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(-10, -32, 20, 22);

        // Cabeza y Cinta roja clásica de Contra
        ctx.fillStyle = '#f5b041';
        ctx.fillRect(-7, -46, 14, 14);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-9, -44, 18, 5); // Cinta roja

        // Fusil en mano
        ctx.fillStyle = '#111';
        ctx.fillRect(2, -26, 26, 6);
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(10, -22, 4, 8);
      }

      ctx.restore();
    }

    // 5. Destello de Explosión
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 120, 0, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 6. Texto de Cinemática / Misión
    if (this.dialogue) {
      ctx.fillStyle = 'rgba(0, 10, 5, 0.82)';
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2;
      ctx.fillRect(50, 20, w - 100, 100);
      ctx.strokeRect(50, 20, w - 100, 100);

      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillStyle = '#2ecc71';

      const lines = this.dialogue.split('\n');
      lines.forEach((line, idx) => {
        ctx.fillText(line, 75, 52 + idx * 26);
      });
    }

    // 7. Botón de Saltar en pantalla
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillStyle = '#f39c12';
    ctx.fillText('[ ESPACIO / ESC ] SALTAR CINEMÁTICA', w - 380, h - 30);

    ctx.restore();
  }

  loop() {
    if (!this.isRunning) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }
}

window.IntroCinematic = IntroCinematic;
