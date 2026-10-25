import type { ActiveWord, Laser, Particle, FloatingText, WordItem, GameSettings, BossEnemy } from '../types/game';
import { soundManager } from './SoundManager';

export interface EngineCallbacks {
  onDamage: (missedWord: WordItem) => void;
  onWordDefeated: (word: WordItem, points: number) => void;
  onBossDefeated?: (boss: BossEnemy, bonusScore: number) => void;
  onComboChange: (combo: number) => void;
  onKeystroke: (isCorrect: boolean) => void;
  onScreenShake: () => void;
  onTargetChange?: (target: ActiveWord | null) => void;
  onFeverChange?: (isFever: boolean) => void;
  onFreezeChange?: (isFrozen: boolean) => void;
  onSyllableRevealed?: (word: ActiveWord, syllableIndex: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private groundY: number = 520;

  // Game entities
  public activeWords: ActiveWord[] = [];
  public currentTarget: ActiveWord | null = null;
  public currentBoss: BossEnemy | null = null;
  public lasers: Laser[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  // Special States & Dopamine
  public isFeverMode: boolean = false;
  public isFrozen: boolean = false;
  public freezeTimer: number = 0;

  // Turret
  private turretX: number = 400;
  private turretY: number = 570;
  private turretAngle: number = -Math.PI / 2;

  // Background starfield
  private stars: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];

  // Callbacks
  private callbacks: EngineCallbacks;

  // Loop control
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private settings: GameSettings;

  // Shake effect
  private shakeTime: number = 0;
  private shakeIntensity: number = 0;

  constructor(canvas: HTMLCanvasElement, settings: GameSettings, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.settings = settings;
    this.callbacks = callbacks;

    this.resize();
    this.initStars();
  }

  public resize() {
    if (!this.canvas) return;
    this.width = this.canvas.parentElement?.clientWidth || window.innerWidth;
    this.height = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.groundY = this.height - 85;
    this.turretX = this.width / 2;
    this.turretY = this.height - 35;
  }

  public updateSettings(settings: GameSettings) {
    this.settings = settings;
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.4 + 0.1,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public spawnWord(word: ActiveWord) {
    this.activeWords.push(word);
    const shouldSpeak = this.settings.soundEnabled && (this.settings.autoPronounce !== false);
    if (!word.hasPlayedAudio && shouldSpeak) {
      word.hasPlayedAudio = true;
      soundManager.speak(word.wordItem.audioText, word.wordItem.language);
    }
  }

  public setFever(fever: boolean) {
    if (this.isFeverMode === fever) return;
    this.isFeverMode = fever;
    if (fever) {
      soundManager.playFeverSound();
      this.triggerScreenShake(8, 250);
    }
    this.callbacks.onFeverChange?.(fever);
  }

  public activateTimeFreeze(durationSeconds = 3.5) {
    this.isFrozen = true;
    this.freezeTimer = durationSeconds;
    soundManager.playFreezeSound();
    this.triggerScreenShake(8, 300);
    this.callbacks.onFreezeChange?.(true);
  }

  public spawnBoss(boss: BossEnemy) {
    this.currentBoss = boss;
    soundManager.speak(boss.audioText, this.settings.language || 'zh');
    this.triggerScreenShake(8, 250);
  }

  public replayCurrentAudio() {
    if (this.currentBoss) {
      soundManager.speak(this.currentBoss.audioText, this.settings.language || 'zh', true);
      return;
    }
    const target = this.currentTarget || this.getLowestWord();
    if (target) {
      soundManager.speak(target.wordItem.audioText, target.wordItem.language, true);
    }
  }

  public getLowestWord(): ActiveWord | null {
    if (this.activeWords.length === 0) return null;
    return this.activeWords.reduce((lowest, curr) => (curr.y > lowest.y ? curr : lowest), this.activeWords[0]);
  }

  // --- Click to Target (Khóa mục tiêu bằng chuột) ---
  public handleClickAt(clickX: number, clickY: number): boolean {
    const hit = this.activeWords.find(w =>
      !w.isDestroyed && !w.isRevealingHanzi &&
      clickX >= w.x && clickX <= w.x + w.width &&
      clickY >= w.y && clickY <= w.y + w.height
    );

    if (hit) {
      if (this.currentTarget) {
        this.currentTarget.isTargeted = false;
      }
      this.currentTarget = hit;
      hit.isTargeted = true;
      this.callbacks.onTargetChange?.(hit);

      const targetCenterX = hit.x + hit.width / 2;
      const targetCenterY = hit.y + hit.height / 2;
      this.turretAngle = Math.atan2(targetCenterY - this.turretY, targetCenterX - this.turretX);

      this.spawnExplosion(targetCenterX, targetCenterY, 8, '#06b6d4');
      soundManager.speak(hit.wordItem.audioText, hit.wordItem.language, true);
      return true;
    }
    return false;
  }

  // --- Cycle Target via Tab (Đổi mục tiêu) ---
  public cycleTarget() {
    const candidates = this.activeWords.filter(w => !w.isDestroyed && !w.isRevealingHanzi);
    if (candidates.length <= 1) return;

    candidates.sort((a, b) => b.y - a.y);
    const currIdx = this.currentTarget ? candidates.indexOf(this.currentTarget) : -1;
    const nextIdx = (currIdx + 1) % candidates.length;
    const nextTarget = candidates[nextIdx];

    if (this.currentTarget) {
      this.currentTarget.isTargeted = false;
    }
    this.currentTarget = nextTarget;
    nextTarget.isTargeted = true;
    this.callbacks.onTargetChange?.(nextTarget);

    const targetCenterX = nextTarget.x + nextTarget.width / 2;
    const targetCenterY = nextTarget.y + nextTarget.height / 2;
    this.turretAngle = Math.atan2(targetCenterY - this.turretY, targetCenterX - this.turretX);
  }

  // --- Release Target via Backspace / Esc (Hủy khóa) ---
  public releaseTarget() {
    if (this.currentTarget) {
      this.currentTarget.isTargeted = false;
      this.currentTarget = null;
      this.callbacks.onTargetChange?.(null);
    }
  }

  public handleInput(char: string): boolean {
    const key = char.toLowerCase();
    if (!key || key.length === 0) return false;

    // Ignore space key
    if (key === ' ') return true;

    // Helper: Match characters
    const matchChar = (target: string, input: string): boolean => {
      return target.toLowerCase() === input.toLowerCase();
    };

    // A. FIRST: Check if Boss is active!
    if (this.currentBoss && !this.currentBoss.isDestroyed && !this.currentBoss.isRevealing) {
      const boss = this.currentBoss;
      const seg = boss.segments[boss.currentSegmentIndex];
      if (seg) {
        const targetStr = seg.latinInput.toLowerCase();
        const neededChar = targetStr[boss.typedInSegment];
        if (neededChar && matchChar(neededChar, key)) {
          this.processBossHit(boss);
          return true;
        }
      }
    }

    // B. Check regular words
    // 1. Current Target (if exists and alive)
    if (this.currentTarget && !this.currentTarget.isDestroyed && !this.currentTarget.isRevealingHanzi) {
      const neededChar = this.currentTarget.targetLetters[this.currentTarget.typedCount];
      if (neededChar && matchChar(neededChar, key)) {
        this.processCorrectHit(this.currentTarget);
        return true;
      }

      // SMART FALLBACK: If player hasn't typed anything on this target yet (typedCount === 0),
      // and they press a key that matches the first letter of ANOTHER word on screen,
      // smoothly switch target to that other word instead of giving an error penalty!
      if (this.currentTarget.typedCount === 0) {
        const otherCandidates = this.activeWords.filter(w => {
          if (w === this.currentTarget || w.isDestroyed || w.isRevealingHanzi) return false;
          const firstChar = w.targetLetters[0];
          return firstChar && matchChar(firstChar, key);
        });

        if (otherCandidates.length > 0) {
          otherCandidates.sort((a, b) => b.y - a.y);
          const newTarget = otherCandidates[0];
          this.currentTarget.isTargeted = false;
          this.currentTarget = newTarget;
          newTarget.isTargeted = true;
          this.callbacks.onTargetChange?.(newTarget);

          this.processCorrectHit(newTarget);
          return true;
        }
      }
    }

    // 2. Candidate regular words when no target or switching
    const candidates = this.activeWords.filter(w => {
      if (w.isDestroyed || w.isRevealingHanzi) return false;
      const nextChar = w.targetLetters[w.typedCount];
      return nextChar && matchChar(nextChar, key);
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.y - a.y);
      const target = candidates[0];

      if (this.currentTarget) {
        this.currentTarget.isTargeted = false;
      }
      this.currentTarget = target;
      target.isTargeted = true;
      this.callbacks.onTargetChange?.(target);

      this.processCorrectHit(target);
      return true;
    }

    // Missed keystroke
    this.callbacks.onKeystroke(false);
    soundManager.playErrorBuzz();
    this.triggerScreenShake(3, 100);
    return false;
  }

  private processBossHit(boss: BossEnemy) {
    this.callbacks.onKeystroke(true);
    boss.typedInSegment++;
    soundManager.playTypingNote(boss.typedInSegment);

    const seg = boss.segments[boss.currentSegmentIndex];
    const segTargetX = boss.x + 80 + boss.currentSegmentIndex * 90;
    const segTargetY = boss.y + 65;

    // Aim turret at the boss
    this.turretAngle = Math.atan2(segTargetY - this.turretY, segTargetX - this.turretX);

    // Fire laser barrage at Boss
    if (this.isFeverMode) {
      this.fireLaser(segTargetX, segTargetY, '#ec4899');
      this.fireLaser(segTargetX - 15, segTargetY, '#f59e0b');
    } else {
      this.fireLaser(segTargetX, segTargetY, '#f43f5e');
    }
    soundManager.playLaserSound();

    // Check if current segment is completed
    if (boss.typedInSegment >= seg.latinInput.length) {
      this.spawnExplosion(segTargetX, segTargetY, 15, '#fbbf24');
      soundManager.playComboSound(boss.currentSegmentIndex + 2);

      // Deduct Boss HP
      boss.hp = Math.max(0, boss.hp - Math.ceil(100 / boss.segments.length));
      boss.currentSegmentIndex++;
      boss.typedInSegment = 0;

      // Check if ALL segments of the sentence are completed
      if (boss.currentSegmentIndex >= boss.segments.length) {
        boss.isRevealing = true;
        boss.revealStartTime = performance.now();
        boss.hp = 0;

        soundManager.playVictoryFanfare();
        this.triggerScreenShake(16, 400);

        // Huge explosion burst across the boss ship
        this.spawnExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, 50, '#f59e0b');
      }
    }
  }

  private processCorrectHit(word: ActiveWord) {
    this.callbacks.onKeystroke(true);
    word.typedCount++;
    this.callbacks.onTargetChange?.(word);

    // Dynamic scale note rises as keystroke advances
    soundManager.playTypingNote(word.typedCount);

    const targetCenterX = word.x + word.width / 2;
    const targetCenterY = word.y + word.height / 2;
    this.turretAngle = Math.atan2(targetCenterY - this.turretY, targetCenterX - this.turretX);

    // Fire multi-beam plasma laser if in Fever mode, else single cyan laser
    if (this.isFeverMode) {
      this.fireLaser(targetCenterX, targetCenterY, '#ec4899');
      this.fireLaser(targetCenterX - 18, targetCenterY, '#06b6d4');
      this.fireLaser(targetCenterX + 18, targetCenterY, '#fbbf24');
    } else {
      this.fireLaser(targetCenterX, targetCenterY, '#06b6d4');
    }
    soundManager.playLaserSound();

    // Typing spark particles at target center
    this.spawnExplosion(targetCenterX, targetCenterY, 5, this.isFeverMode ? '#f43f5e' : '#22d3ee');

    // CHECK SYLLABLES: Reveal Hanzi if syllable is completed!
    if (word.syllables && word.syllables.length > 0) {
      word.syllables.forEach((syl, idx) => {
        if (!syl.isRevealed && word.typedCount >= syl.endIndex) {
          syl.isRevealed = true;
          soundManager.playSyllableTing();

          const boxWidth = 36;
          const boxGap = 8;
          const totalBoxesWidth = word.syllables!.length * boxWidth + (word.syllables!.length - 1) * boxGap;
          const boxStartX = word.x + (word.width - totalBoxesWidth) / 2;
          const sylBoxX = boxStartX + idx * (boxWidth + boxGap) + boxWidth / 2;
          const sylBoxY = word.y + 54;
          this.spawnExplosion(sylBoxX, sylBoxY, 12, '#fbbf24');
          this.callbacks.onSyllableRevealed?.(word, idx);
        }
      });
    }

    if (word.typedCount >= word.targetLetters.length) {
      word.isRevealingHanzi = true;
      word.revealStartTime = performance.now();
      word.speed = 0;

      soundManager.playComboSound(5);
      this.spawnExplosion(targetCenterX, targetCenterY, 20, '#fbbf24');
    }
  }

  private fireLaser(targetX: number, targetY: number, color = '#06b6d4') {
    this.lasers.push({
      id: `laser-${Date.now()}-${Math.random()}`,
      startX: this.turretX,
      startY: this.turretY,
      x: this.turretX,
      y: this.turretY,
      targetX,
      targetY,
      speed: 42,
      color,
      progress: 0
    });
  }

  private destroyWord(word: ActiveWord) {
    word.isDestroyed = true;
    const centerX = word.x + word.width / 2;
    const centerY = word.y + word.height / 2;

    this.spawnExplosion(centerX, centerY, 30, '#22d3ee');
    soundManager.playExplosionSound();

    const basePoints = 100;
    this.callbacks.onWordDefeated(word.wordItem, basePoints);

    this.floatingTexts.push({
      id: `ft-${Date.now()}`,
      text: `+${basePoints}`,
      x: centerX,
      y: centerY - 15,
      vy: -1.2,
      alpha: 1,
      color: '#34d399'
    });

    if (this.currentTarget === word) {
      this.currentTarget = null;
      this.callbacks.onTargetChange?.(null);
    }
  }

  private spawnExplosion(x: number, y: number, count: number, baseColor: string) {
    const colors = [baseColor, '#f43f5e', '#fbbf24', '#ffffff', '#a855f7'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 1.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.random() * 3.5 + 1.5,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015
      });
    }
  }

  private triggerScreenShake(intensity = 10, duration = 300) {
    this.shakeIntensity = intensity;
    this.shakeTime = duration;
    this.callbacks.onScreenShake();
  }

  // --- Main Animation Loop ---

  private loop = (time: number) => {
    if (!this.isRunning) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const now = performance.now();

    if (this.shakeTime > 0) {
      this.shakeTime -= dt * 1000;
    }

    // Freeze timer update
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      if (this.freezeTimer <= 0) {
        this.isFrozen = false;
        this.callbacks.onFreezeChange?.(false);
      }
    }

    const starSpeedMult = this.isFeverMode ? 2.4 : 1.0;
    for (const star of this.stars) {
      star.y += star.speed * starSpeedMult;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    // 1. Update Boss Enemy
    if (this.currentBoss) {
      const boss = this.currentBoss;

      // Enter from top until y reaches 75
      if (boss.y < 75) {
        if (!this.isFrozen) boss.y += 2.2;
      } else if (!boss.isRevealing) {
        // Glides horizontally back and forth
        if (!this.isFrozen) {
          boss.x += boss.vx;
          if (boss.x < 15 || boss.x + boss.width > this.width - 15) {
            boss.vx = -boss.vx;
          }
        }
      }

      // Check Boss Victory Revelation
      if (boss.isRevealing) {
        if (now - boss.revealStartTime >= 1000) {
          boss.isDestroyed = true;
          const bonus = 500;
          if (this.callbacks.onBossDefeated) {
            this.callbacks.onBossDefeated(boss, bonus);
          }
          this.floatingTexts.push({
            id: `ft-boss-${Date.now()}`,
            text: `BOSS HẠ GỤC! +${bonus}`,
            x: boss.x + boss.width / 2,
            y: boss.y + 40,
            vy: -1.5,
            alpha: 1,
            color: '#fbbf24'
          });
          this.currentBoss = null;
        }
      }
    }

    // 2. Update regular active words
    for (let i = this.activeWords.length - 1; i >= 0; i--) {
      const word = this.activeWords[i];

      if (word.isRevealingHanzi) {
        // Lingers for 1.3s so player's brain can clearly absorb and remember the Chinese Character!
        if (now - word.revealStartTime >= 1300) {
          this.destroyWord(word);
          this.activeWords.splice(i, 1);
        }
        continue;
      }

      if (word.isDestroyed) {
        this.activeWords.splice(i, 1);
        continue;
      }

      if (!this.isFrozen) {
        word.y += word.speed * (dt * 60);
      }

      // Check collision with ground barrier
      if (word.y + word.height >= this.groundY) {
        if (this.settings.gameMode === 'arcade') {
          soundManager.playDamageSound();
          this.triggerScreenShake(14, 350);
          this.spawnExplosion(word.x + word.width / 2, this.groundY, 25, '#ef4444');
          soundManager.speak(word.wordItem.audioText, word.wordItem.language, false);
          this.callbacks.onDamage(word.wordItem);
        } else {
          // Zen mode: Nhẹ nhàng, không trừ máu, không rung lắc mạnh, đọc mẫu để người học nhớ từ
          this.triggerScreenShake(3, 100);
          this.spawnExplosion(word.x + word.width / 2, this.groundY, 12, '#34d399');
          soundManager.speak(word.wordItem.audioText, word.wordItem.language, false);
          this.floatingTexts.push({
            id: `ft-miss-${Date.now()}`,
            text: `Ôn lại: ${word.wordItem.fullWord} [${word.wordItem.pinyinSpaced}]`,
            x: word.x + word.width / 2,
            y: this.groundY - 30,
            vy: -1.0,
            alpha: 1,
            color: '#34d399'
          });
          this.callbacks.onDamage(word.wordItem);
        }

        if (this.currentTarget === word) {
          this.currentTarget = null;
          this.callbacks.onTargetChange?.(null);
        }

        this.activeWords.splice(i, 1);
      }
    }

    // 3. Update lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      const dx = laser.targetX - laser.x;
      const dy = laser.targetY - laser.y;
      const dist = Math.hypot(dx, dy);

      if (dist < laser.speed) {
        this.spawnExplosion(laser.targetX, laser.targetY, 8, laser.color);
        this.lasers.splice(i, 1);
      } else {
        const angle = Math.atan2(dy, dx);
        laser.x += Math.cos(angle) * laser.speed;
        laser.y += Math.sin(angle) * laser.speed;
      }
    }

    // 4. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private render() {
    this.ctx.save();

    if (this.shakeTime > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(offsetX, offsetY);
    }

    this.ctx.fillStyle = '#121110';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.renderStars();
    this.renderGroundBarrier();

    // Render Boss if present
    if (this.currentBoss) {
      this.renderBoss(this.currentBoss);
    }

    // Render active regular words
    for (const word of this.activeWords) {
      this.renderWordBlock(word);
    }

    this.renderLasers();
    this.renderParticles();
    this.renderFloatingTexts();
    this.renderTurret();

    // Fever Mode Neon Pulsing Border
    if (this.isFeverMode) {
      const pulse = Math.sin(Date.now() / 110) * 0.35 + 0.65;
      this.ctx.strokeStyle = `rgba(244, 63, 94, ${pulse})`;
      this.ctx.lineWidth = 5;
      this.ctx.shadowColor = '#ec4899';
      this.ctx.shadowBlur = 16;
      this.ctx.strokeRect(3, 3, this.width - 6, this.height - 6);
      this.ctx.shadowBlur = 0;
    }

    // Freeze Mode Frost Overlay
    if (this.isFrozen) {
      this.ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
      this.ctx.lineWidth = 4;
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.shadowBlur = 18;
      this.ctx.strokeRect(2, 2, this.width - 4, this.height - 4);
      this.ctx.shadowBlur = 0;

      this.ctx.font = 'bold 14px system-ui, sans-serif';
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = '#0284c7';
      this.ctx.shadowBlur = 8;
      this.ctx.fillText(`❄️ ĐÓNG BĂNG THỜI GIAN: ${Math.max(0, this.freezeTimer).toFixed(1)}s ❄️`, this.width / 2, 42);
      this.ctx.shadowBlur = 0;
    }

    this.ctx.restore();
  }

  private renderStars() {
    for (const star of this.stars) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderGroundBarrier() {
    const ctx = this.ctx;
    const y = this.groundY;

    const gradient = ctx.createLinearGradient(0, y, this.width, y);
    gradient.addColorStop(0, 'rgba(217, 119, 6, 0.2)');
    gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.9)');
    gradient.addColorStop(1, 'rgba(217, 119, 6, 0.2)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(this.width, y);
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(245, 158, 11, 0.03)';
    ctx.fillRect(0, y, this.width, this.height - y);
  }

  // --- Render Boss Enemy ---
  private renderBoss(boss: BossEnemy) {
    const ctx = this.ctx;
    const { x, y, width, height, isRevealing } = boss;

    ctx.save();

    // 1. Boss Hull Background
    this.roundRect(ctx, x, y, width, height, 16);
    ctx.fillStyle = isRevealing ? 'rgba(30, 27, 75, 0.98)' : 'rgba(23, 10, 36, 0.94)';
    ctx.fill();

    ctx.lineWidth = isRevealing ? 3 : 2;
    ctx.strokeStyle = isRevealing ? '#fbbf24' : '#f43f5e';
    ctx.shadowColor = isRevealing ? '#fbbf24' : '#f43f5e';
    ctx.shadowBlur = isRevealing ? 22 : 16;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Boss HP Bar on Hull Top
    const hpBarW = width - 40;
    const hpBarX = x + 20;
    const hpBarY = y + 14;
    const hpPct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, 8);

    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, 8);

    // 3. Boss Header Info
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = isRevealing ? '#fde047' : '#fda4af';
    ctx.textAlign = 'left';
    ctx.fillText(`👑 ${boss.name.toUpperCase()}`, hpBarX, y + 36);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${boss.meaning}`, x + width - 20, y + 36);

    // 4. Render Segments (Words in the sentence)
    const segSpacing = (width - 40) / boss.segments.length;
    let segStartX = x + 20;

    boss.segments.forEach((seg, idx) => {
      const isCompleted = idx < boss.currentSegmentIndex;
      const isCurrent = idx === boss.currentSegmentIndex;
      const segBoxW = segSpacing - 8;
      const segBoxH = 50;
      const segBoxY = y + 48;

      ctx.save();
      this.roundRect(ctx, segStartX, segBoxY, segBoxW, segBoxH, 8);
      ctx.fillStyle = isCompleted
        ? 'rgba(6, 78, 59, 0.85)' // Emerald
        : isCurrent
        ? 'rgba(120, 53, 15, 0.85)' // Amber
        : 'rgba(30, 41, 59, 0.6)'; // Dark Slate
      ctx.fill();

      ctx.lineWidth = isCurrent ? 2 : 1;
      ctx.strokeStyle = isCurrent ? '#fbbf24' : isCompleted ? '#34d399' : '#475569';
      if (isCurrent) {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Hanzi
      ctx.font = 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = isCompleted ? '#6ee7b7' : isCurrent ? '#fef08a' : '#94a3b8';
      ctx.fillText(seg.hanzi, segStartX + segBoxW / 2, segBoxY + 24);

      // Pinyin (Show if hints enabled or if current target)
      ctx.font = '11px monospace';
      if (isCompleted) {
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText(seg.pinyinSpaced, segStartX + segBoxW / 2, segBoxY + 40);
      } else if (isCurrent) {
        // Show current typing progress
        ctx.fillStyle = '#fde047';
        if (this.settings.showHints) {
          ctx.fillText(seg.pinyinSpaced, segStartX + segBoxW / 2, segBoxY + 40);
        } else {
          ctx.fillText(`${seg.latinInput.length} chữ`, segStartX + segBoxW / 2, segBoxY + 40);
        }
      } else {
        ctx.fillStyle = '#64748b';
        ctx.fillText(this.settings.showHints ? seg.pinyinSpaced : '...', segStartX + segBoxW / 2, segBoxY + 40);
      }

      ctx.restore();
      segStartX += segSpacing;
    });

    ctx.restore();
  }

  // --- Render Regular Word Block ---
  private renderWordBlock(word: ActiveWord) {
    const ctx = this.ctx;
    const { x, y, width, height, isTargeted, isRevealingHanzi } = word;

    ctx.save();

    // 1. HANZI REVELATION STATE (Mặt chữ Hán bừng sáng khi gõ xong)
    if (isRevealingHanzi) {
      const expandScale = 1.08;
      const ew = width * expandScale;
      const eh = height * 1.15;
      const ex = x - (ew - width) / 2;
      const ey = y - (eh - height) / 2;

      this.roundRect(ctx, ex, ey, ew, eh, 12);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
      ctx.fill();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 20;
      ctx.stroke();

      // Top Tag: HSK + Han-Viet or Category
      ctx.shadowBlur = 0;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      const catOrHv = word.wordItem.hanViet
        ? `[Hán Việt: ${word.wordItem.hanViet}]`
        : (word.wordItem.category ? `[${word.wordItem.category}]` : '');
      ctx.fillText(`${word.wordItem.hskLevel || ''} ${catOrHv}`.trim(), ex + ew / 2, ey + 18);

      // Center: Giant Golden Chinese Character
      ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", serif';
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16;
      ctx.fillText(word.wordItem.fullWord, ex + ew / 2, ey + 48);

      // Bottom: Pinyin with tones + Meaning
      ctx.shadowBlur = 0;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${word.wordItem.pinyinSpaced} • ${word.wordItem.meaning}`, ex + ew / 2, ey + eh - 10);

      ctx.restore();
      return;
    }

    // 2. NORMAL FALLING STATE
    // Aim Laser Line & Targeting Reticle to Targeted Word
    if (isTargeted) {
      ctx.save();
      // Laser line from turret to word
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.turretX, this.turretY);
      ctx.lineTo(x + width / 2, y + height / 2);
      ctx.stroke();

      // Top Target Indicator Arrow
      const arrowBounce = Math.sin(Date.now() / 150) * 3;
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▼ LOCK', x + width / 2, y - 7 + arrowBounce);

      // Sci-fi / Arcade Targeting Corner Brackets
      const bLen = 8;
      const bOffset = 4;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x - bOffset, y - bOffset + bLen);
      ctx.lineTo(x - bOffset, y - bOffset);
      ctx.lineTo(x - bOffset + bLen, y - bOffset);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x + width + bOffset - bLen, y - bOffset);
      ctx.lineTo(x + width + bOffset, y - bOffset);
      ctx.lineTo(x + width + bOffset, y - bOffset + bLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x - bOffset, y + height + bOffset - bLen);
      ctx.lineTo(x - bOffset, y + height + bOffset);
      ctx.lineTo(x - bOffset + bLen, y + height + bOffset);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(x + width + bOffset - bLen, y + height + bOffset);
      ctx.lineTo(x + width + bOffset, y + height + bOffset);
      ctx.lineTo(x + width + bOffset, y + height + bOffset - bLen);
      ctx.stroke();

      ctx.restore();
    }

    const isNearBottom = y + height > this.groundY - 140;

    this.roundRect(ctx, x, y, width, height, 10);
    ctx.fillStyle = isTargeted
      ? 'rgba(28, 26, 23, 0.96)'
      : isNearBottom
      ? 'rgba(69, 10, 10, 0.90)'
      : 'rgba(34, 31, 27, 0.88)';
    ctx.fill();

    ctx.lineWidth = isTargeted ? 2.5 : 1.5;
    ctx.strokeStyle = isTargeted
      ? '#f59e0b'
      : isNearBottom
      ? '#ef4444'
      : '#3d372f';

    if (isTargeted) {
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
    } else if (isNearBottom) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
    }
    ctx.stroke();
    ctx.restore();

    // Top Tag: HSK Level & (Optional) Hán-Việt clue only if showHints is ON
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#a8a29e';
    ctx.textAlign = 'left';
    const hskTag = word.wordItem.hskLevel ? `[${word.wordItem.hskLevel}]` : '';
    const hvTag = (this.settings.showHints && this.settings.showHanViet && word.wordItem.hanViet)
      ? `• ${word.wordItem.hanViet}`
      : '';
    ctx.fillText(`${hskTag} ${hvTag}`.trim(), x + 12, y + 16);

    // Audio Speaker Icon
    ctx.fillStyle = isTargeted ? '#f59e0b' : '#78716c';
    ctx.font = '12px system-ui';
    ctx.fillText('🔊', x + width - 24, y + 16);

    // 4 CHẾ ĐỘ HỌC TẬP CHUYÊN SÂU
    const playMode = this.settings.playMode || 'hanzi_to_pinyin';

    if (playMode === 'hanzi_to_pinyin') {
      // 1. NHÌN CHỮ HÁN ➔ GÕ PINYIN (Nhận diện mặt chữ)
      ctx.font = 'bold 22px "Noto Serif SC", "PingFang SC", serif';
      ctx.fillStyle = isTargeted ? '#ffffff' : '#f5f0e6';
      ctx.textAlign = 'center';
      if (isTargeted) {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
      }
      ctx.fillText(word.wordItem.fullWord, x + width / 2, y + 36);
      ctx.shadowBlur = 0;

      // Pinyin slots phía dưới
      this.renderPinyinSlots(word, y + 58);

    } else if (playMode === 'meaning_to_pinyin') {
      // 2. NHỚ NGHĨA TIẾNG VIỆT ➔ GÕ PINYIN (Phản xạ giao tiếp)
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = isTargeted ? '#fde047' : '#fbbf24';
      ctx.textAlign = 'center';
      if (isTargeted) {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
      }
      const meaningText = word.wordItem.meaning.length > 24
        ? word.wordItem.meaning.slice(0, 23) + '…'
        : word.wordItem.meaning;
      ctx.fillText(meaningText, x + width / 2, y + 32);
      ctx.shadowBlur = 0;

      // Hán tự ô bí ẩn [ ? ] hoặc đã mở khóa
      this.renderSyllableBoxes(word, y + 43);

      // Pinyin slots phía dưới
      this.renderPinyinSlots(word, y + 78);

    } else if (playMode === 'listening_to_pinyin') {
      // 3. NGHE BẮT ÂM ➔ GÕ PINYIN (Luyện tai / Dictation)
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = isTargeted ? '#38bdf8' : '#0ea5e9';
      ctx.textAlign = 'center';
      const time = Date.now() / 200;
      const waveIcon = Math.sin(time) > 0 ? '🔊 ılılı' : '🔊 ılılı';
      ctx.fillText(`${waveIcon} Nghe bắt âm [Space]`, x + width / 2, y + 32);

      // Hán tự ô bí ẩn [ ? ] hoặc đã mở khóa
      this.renderSyllableBoxes(word, y + 43);

      // Pinyin slots phía dưới
      this.renderPinyinSlots(word, y + 78);

    } else {
      // 4. CLOZE PRACTICE (Luyện từ mới / điền khuyết)
      ctx.font = 'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(word.wordItem.fullWord, x + width / 2, y + 26);

      this.renderPinyinSlots(word, y + 46);

      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(word.wordItem.meaning, x + width / 2, y + height - 8);
    }
  }

  // --- Render Mysterious [ ? ] or Revealed Hanzi Syllable Boxes ---
  private renderSyllableBoxes(word: ActiveWord, boxY: number) {
    const ctx = this.ctx;
    const syllables = word.syllables || [];
    if (syllables.length === 0) return;

    const boxWidth = 36;
    const boxHeight = 26;
    const boxGap = 8;
    const totalBoxesWidth = syllables.length * boxWidth + (syllables.length - 1) * boxGap;
    let currentX = word.x + (word.width - totalBoxesWidth) / 2;

    for (const syl of syllables) {
      ctx.save();
      if (!syl.isRevealed) {
        // Mysterious unrevealed card [ ? ]
        this.roundRect(ctx, currentX, boxY, boxWidth, boxHeight, 6);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fill();

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Secret question mark
        ctx.font = 'bold 13px system-ui, monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', currentX + boxWidth / 2, boxY + boxHeight / 2);
      } else {
        // Gloriously revealed golden Chinese Character!
        this.roundRect(ctx, currentX, boxY, boxWidth, boxHeight, 6);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.font = 'bold 17px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(syl.hanzi, currentX + boxWidth / 2, boxY + boxHeight / 2 + 1);

        // Optional Hán-Việt clue on top of the revealed card
        if (this.settings.showHints && syl.hanViet) {
          ctx.font = '9px system-ui';
          ctx.fillStyle = '#fde047';
          ctx.shadowBlur = 0;
          ctx.fillText(syl.hanViet, currentX + boxWidth / 2, boxY - 3);
        }
      }
      ctx.restore();
      currentX += boxWidth + boxGap;
    }
    ctx.textBaseline = 'alphabetic';
  }

  private renderPinyinSlots(word: ActiveWord, letterY: number) {
    const ctx = this.ctx;
    const { x, y, width, hiddenPinyinIndices, typedCount, isTargeted } = word;

    // Use original real characters so we can reveal them as soon as player types!
    const chars = word.fullPinyinChars || word.wordItem.pinyinSpaced.split('');
    const letterSpacing = 16;
    const totalLettersWidth = chars.length * letterSpacing;
    let startX = x + (width - totalLettersWidth) / 2 + letterSpacing / 2;

    ctx.font = 'bold 20px monospace, "Courier New", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let nonSpaceRank = 0;

    chars.forEach((realChar, idx) => {
      if (realChar === ' ') {
        startX += letterSpacing * 1.5;
        return;
      }

      const isBlank = hiddenPinyinIndices.includes(idx);
      const isAlreadyTyped = nonSpaceRank < typedCount;
      const isCurrentTarget = isTargeted && nonSpaceRank === typedCount;

      nonSpaceRank++;

      if (isAlreadyTyped) {
        // GÕ ĐƯỢC CHỮ NÀO LÀM HIỆN CHỮ ĐÓ RA! (Hiện chữ cái thật màu xanh ngọc phát sáng)
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 10;
        ctx.fillText(realChar, startX, letterY);
        ctx.shadowBlur = 0;
      } else if (isCurrentTarget) {
        // Ô focus viền vàng nhấp nháy tại vị trí đang cần gõ
        const time = Date.now() / 180;
        const alpha = Math.sin(time) * 0.35 + 0.65;

        ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(startX - 9, letterY - 13, 18, 26);

        // Nếu lúc đầu bị ẩn và tắt gợi ý -> hiện dấu '_' chờ gõ; nếu bật gợi ý -> hiện chữ thật
        ctx.fillStyle = '#fbbf24';
        if (isBlank && (!this.settings.showHints || !this.settings.showTypingGuide)) {
          ctx.fillText('_', startX, letterY);
        } else {
          ctx.fillText(realChar, startX, letterY);
        }
      } else if (isBlank) {
        // Lúc đầu bị ẩn: hiện dấu gạch '_'
        ctx.fillStyle = '#64748b';
        ctx.fillText('_', startX, letterY);
      } else {
        // Không bị ẩn (hoặc chế độ hiện đầy đủ): hiện chữ trắng
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(realChar, startX, letterY);
      }

      startX += letterSpacing;
    });

    // ONLY SHOW TYPING GUIDE IF EXPLICITLY ENABLED BY USER! (No auto-spoiling!)
    if (isTargeted && this.settings.showHints && this.settings.showTypingGuide) {
      const typedStr = word.targetLetters.slice(0, typedCount).join('');
      const nextChar = word.targetLetters[typedCount] || '';
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`gõ: ${typedStr}[${nextChar}]`, x + width / 2, y + 54);
    }

    ctx.textBaseline = 'alphabetic';
  }

  private renderLasers() {
    const ctx = this.ctx;
    for (const laser of this.lasers) {
      ctx.save();
      ctx.strokeStyle = laser.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = laser.color;
      ctx.shadowBlur = 10;

      const angle = Math.atan2(laser.targetY - laser.y, laser.targetX - laser.x);
      const tailX = laser.x - Math.cos(angle) * 18;
      const tailY = laser.y - Math.sin(angle) * 18;

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(laser.x, laser.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderFloatingTexts() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private renderTurret() {
    const ctx = this.ctx;
    const x = this.turretX;
    const y = this.turretY;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#221f1b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 24, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(this.turretAngle);

    ctx.fillStyle = '#d97706';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.fillRect(0, -5, 32, 10);

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
