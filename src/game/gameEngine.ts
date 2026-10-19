/**
 * Master Game Simulation Orchestrator for VAPOR // ZERO.
 * Coordinates 60fps WebGL loop, decoupled React state, wave generation,
 * hitstop timing, cinematic title pan, and sound triggers.
 */

import * as THREE from 'three';
import { GameStatus, PlayerStats, WeaponType } from '../types/game';
import { buildCyberArena, ArenaData } from './arena';
import { createPlayerController, PlayerController, WEAPON_DEFS } from './player';
import { createViewmodel, ViewmodelRig } from './viewmodel';
import { createEnemyManager, EnemyManager } from './enemies';
import { createCombatSystem, CombatSystem } from './combat';
import { sound } from '../audio/soundEngine';

export interface HitmarkerEvent {
  id: number;
  isHeadshot: boolean;
  damage: number;
}

export interface GameEngineCallbacks {
  onStatusChange: (status: GameStatus) => void;
  onStatsUpdate: (stats: PlayerStats) => void;
  onHitmarker: (event: HitmarkerEvent) => void;
  onWaveAnnouncement: (text: string) => void;
  onPlayerHurtEffect: () => void;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private clock: THREE.Clock;
  private animFrameId: number | null = null;

  private arena: ArenaData | null = null;
  private player: PlayerController | null = null;
  private viewmodel: ViewmodelRig | null = null;
  private enemyMgr: EnemyManager | null = null;
  private combat: CombatSystem | null = null;

  private status: GameStatus = 'TITLE';
  private callbacks: GameEngineCallbacks;

  // Title orbit camera
  private titleCamera: THREE.PerspectiveCamera;
  private titleAngle: number = 0;

  // Wave system
  private wave: number = 1;
  private waveInProgress: boolean = false;
  private waveSpawnTimer: number = 0;
  private enemiesToSpawnQueue: { type: 'scout' | 'heavy' | 'kamikaze' | 'boss'; delay: number }[] = [];
  private waveIntermissionTimer: number = 0;

  // Hitstop simulation pause
  private hitstopTimer: number = 0;

  // Throttled UI sync
  private uiSyncTimer: number = 0;
  private nextHitmarkerId: number = 1;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Renderer Setup (PBR standard r160+)
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Cameras
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.titleCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 250);
    this.titleCamera.position.set(0, 16, 38);

    // 3. Subsystems
    this.arena = buildCyberArena(this.scene, this.renderer);
    this.player = createPlayerController(this.renderer.domElement);
    this.viewmodel = createViewmodel(this.player.camera);
    this.enemyMgr = createEnemyManager(this.scene);
    this.combat = createCombatSystem(this.scene);

    // Bind resize
    window.addEventListener('resize', this.onWindowResize);

    // Start loop
    this.startLoop();
  }

  private onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);

    if (this.player) {
      this.player.camera.aspect = width / height;
      this.player.camera.updateProjectionMatrix();
    }
    this.titleCamera.aspect = width / height;
    this.titleCamera.updateProjectionMatrix();
  };

  public startGame() {
    sound.ensureContext();
    sound.startAmbientSoundscape();
    this.status = 'PLAYING';
    this.callbacks.onStatusChange('PLAYING');

    this.player?.reset();
    this.enemyMgr?.clearAll();
    this.combat?.clearAll();

    this.wave = 1;
    this.startWave(this.wave);

    this.player?.lockPointer();
  }

  public pauseGame() {
    if (this.status !== 'PLAYING') return;
    this.status = 'PAUSED';
    this.callbacks.onStatusChange('PAUSED');
    this.player?.unlockPointer();
  }

  public resumeGame() {
    if (this.status !== 'PAUSED') return;
    this.status = 'PLAYING';
    this.callbacks.onStatusChange('PLAYING');
    this.player?.lockPointer();
  }

  public returnToTitle() {
    this.status = 'TITLE';
    this.callbacks.onStatusChange('TITLE');
    this.player?.unlockPointer();
    this.enemyMgr?.clearAll();
    this.combat?.clearAll();
  }

  public restartGame() {
    this.startGame();
  }

  public selectWeapon(type: WeaponType) {
    if (this.player && this.viewmodel) {
      this.player.switchWeapon(type);
      this.viewmodel.setWeapon(type);
    }
  }

  public setMuted(muted: boolean) {
    sound.setMuted(muted);
  }

  private startWave(waveNum: number) {
    this.wave = waveNum;
    if (this.player) {
      this.player.stats.wave = waveNum;
    }

    sound.playWaveAlert();
    this.callbacks.onWaveAnnouncement(waveNum % 5 === 0 ? `BOSS WAVE ${waveNum} - GOLIATH DETECTED` : `WAVE ${waveNum}`);

    // Generate enemies for this wave
    this.enemiesToSpawnQueue = [];
    const multiplier = 1 + (waveNum - 1) * 0.25;

    if (waveNum % 5 === 0) {
      // Boss wave!
      this.enemiesToSpawnQueue.push({ type: 'boss', delay: 0.5 });
      this.enemiesToSpawnQueue.push({ type: 'scout', delay: 2.0 });
      this.enemiesToSpawnQueue.push({ type: 'scout', delay: 3.5 });
      this.enemiesToSpawnQueue.push({ type: 'kamikaze', delay: 5.0 });
      this.enemiesToSpawnQueue.push({ type: 'kamikaze', delay: 6.5 });
    } else {
      // Standard progressive waves
      const scouts = Math.min(10, 2 + waveNum * 2);
      const kamikazes = Math.min(8, 1 + Math.floor(waveNum * 1.5));
      const heavies = waveNum >= 2 ? Math.min(4, Math.floor(waveNum / 2)) : 0;

      let t = 0.5;
      for (let i = 0; i < scouts; i++) {
        this.enemiesToSpawnQueue.push({ type: 'scout', delay: t });
        t += 1.2;
      }
      for (let i = 0; i < kamikazes; i++) {
        this.enemiesToSpawnQueue.push({ type: 'kamikaze', delay: t });
        t += 1.8;
      }
      for (let i = 0; i < heavies; i++) {
        this.enemiesToSpawnQueue.push({ type: 'heavy', delay: t });
        t += 2.5;
      }
    }

    this.waveInProgress = true;
    this.waveSpawnTimer = 0;
  }

  private startLoop() {
    const tick = () => {
      this.animFrameId = requestAnimationFrame(tick);

      const rawDt = this.clock.getDelta();
      // Clamp frame delta time to prevent physics explosions on lag spikes
      const delta = Math.min(rawDt, 0.05);

      if (this.status === 'TITLE') {
        this.updateTitleMode(delta);
      } else if (this.status === 'PLAYING') {
        this.updatePlayMode(delta);
      } else if (this.status === 'PAUSED' || this.status === 'GAMEOVER') {
        // Render scene still
        if (this.player) {
          this.renderer.render(this.scene, this.player.camera);
        }
      }
    };
    tick();
  }

  private updateTitleMode(delta: number) {
    this.titleAngle += delta * 0.2;
    const r = 42;
    this.titleCamera.position.set(Math.cos(this.titleAngle) * r, 16 + Math.sin(this.titleAngle * 0.5) * 3, Math.sin(this.titleAngle) * r);
    this.titleCamera.lookAt(0, 3, 0);

    this.arena?.update(delta);
    this.renderer.render(this.scene, this.titleCamera);
  }

  private updatePlayMode(delta: number) {
    if (!this.player || !this.arena || !this.enemyMgr || !this.combat || !this.viewmodel) return;

    // Hitstop logic (simulation pause on heavy hit)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      this.renderer.render(this.scene, this.player.camera);
      return;
    }

    // 1. Update Arena
    this.arena.update(delta);

    // 2. Update Wave Spawning
    if (this.waveInProgress) {
      this.waveSpawnTimer += delta;
      for (let i = this.enemiesToSpawnQueue.length - 1; i >= 0; i--) {
        const item = this.enemiesToSpawnQueue[i];
        if (this.waveSpawnTimer >= item.delay) {
          const spawnPoints = this.arena.enemySpawnPoints;
          const pt = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
          const waveMult = 1 + (this.wave - 1) * 0.25;
          this.enemyMgr.spawnEnemy(item.type, pt, waveMult);
          this.enemiesToSpawnQueue.splice(i, 1);
        }
      }

      // Check if wave is complete
      if (this.enemiesToSpawnQueue.length === 0 && this.enemyMgr.enemies.length === 0) {
        this.waveInProgress = false;
        this.waveIntermissionTimer = 3.5;

        // Wave clear bonuses
        this.player.stats.score += 500 * this.wave;
        this.callbacks.onWaveAnnouncement(`WAVE ${this.wave} CLEARED! +${500 * this.wave} PTS`);
        sound.playPickup();

        // Spawn reward pickups in arena center & bridges
        this.combat.spawnPickup('health', new THREE.Vector3(0, 4.2, 0));
        this.combat.spawnPickup('shield', new THREE.Vector3(-6, 1.2, -6));
        if (this.wave % 2 === 0) {
          this.combat.spawnPickup('overdrive', new THREE.Vector3(6, 1.2, 6));
        }
      }
    } else {
      // Wave intermission countdown
      this.waveIntermissionTimer -= delta;
      if (this.waveIntermissionTimer <= 0) {
        this.startWave(this.wave + 1);
      }
    }

    // 3. Update Player
    const playerPos = this.player.cameraRig.position;
    this.player.update(delta, this.arena.obstacles, this.arena.jumpPads, (weapon, origin, direction) => {
      // Player weapon fired
      this.viewmodel?.triggerFire(weapon.id);
      this.combat?.firePlayerWeapon(
        weapon,
        origin,
        direction,
        this.enemyMgr!.enemies,
        (enemyId, damage, isHeadshot, hitPos) => {
          // Register hit on enemy
          const isKilled = this.enemyMgr!.damageEnemy(enemyId, damage, isHeadshot);

          // Hitmarker SFX and UI trigger
          sound.playHitmarker(isHeadshot);
          this.callbacks.onHitmarker({
            id: this.nextHitmarkerId++,
            isHeadshot,
            damage: Math.round(isHeadshot ? damage * 1.8 : damage),
          });

          // Combo increment
          this.player!.stats.combo = Math.min(8, this.player!.stats.combo + 1);
          this.player!.stats.comboTimer = 2.5;

          // Points
          const pts = Math.round((isHeadshot ? damage * 2 : damage) * this.player!.stats.combo);
          this.player!.stats.score += pts;

          // Hitstop on heavy hits or kills (30–80ms)
          if (isKilled || weapon.id === 'scatter' || weapon.id === 'railgun') {
            this.hitstopTimer = 0.045; // 45ms hitstop
            this.player!.triggerShake(0.2);
          }
        }
      );
    });

    // 4. Update Viewmodel Animations
    const isMoving = this.player.cameraRig.position.distanceTo(playerPos) > 0.001 || true; // dynamic sway
    const isSprinting = this.player.stats.dashCooldown > 0;
    this.viewmodel.update(delta, isMoving, isSprinting, false);

    // 5. Update Enemies
    this.enemyMgr.update(
      delta,
      playerPos,
      (origin, target, damage, type) => {
        // Enemy attack projectile / explosion
        if (type === 'kamikaze') {
          // Area explosion damage
          const dist = playerPos.distanceTo(origin);
          if (dist < 4.5) {
            const falloff = 1 - dist / 4.5;
            this.player!.takeDamage(Math.round(damage * falloff));
            this.callbacks.onPlayerHurtEffect();
          }
        } else {
          this.combat?.fireEnemyProjectile(origin, target, damage, type);
        }
      },
      (killedEnemy) => {
        // Enemy killed callback
        this.player!.stats.kills++;
        this.player!.stats.score += killedEnemy.scoreValue * this.player!.stats.combo;
        this.combat?.spawnExplosion(
          new THREE.Vector3(killedEnemy.position.x, killedEnemy.position.y + killedEnemy.radius * 0.5, killedEnemy.position.z),
          killedEnemy.type === 'boss' ? 0xff0088 : 0x00f0ff,
          killedEnemy.type === 'boss' ? 45 : 20
        );

        // Chance to drop pickup
        if (Math.random() < 0.35) {
          const dropType = Math.random() < 0.5 ? 'health' : 'shield';
          this.combat?.spawnPickup(dropType, new THREE.Vector3(killedEnemy.position.x, 1.0, killedEnemy.position.z));
        }
      }
    );

    // 6. Update Combat / Projectiles / Pickups
    this.combat.update(
      delta,
      playerPos,
      0.65,
      this.enemyMgr.enemies,
      (damage) => {
        // Player takes projectile damage
        this.player!.takeDamage(damage);
        this.callbacks.onPlayerHurtEffect();
        if (this.player!.stats.hp <= 0) {
          // Game Over!
          this.status = 'GAMEOVER';
          this.callbacks.onStatusChange('GAMEOVER');
          this.player!.unlockPointer();
          sound.playExplosion('huge');
        }
      },
      (pickupType) => {
        // Player collected pickup
        if (pickupType === 'health') {
          this.player!.heal(40, 0);
          this.callbacks.onWaveAnnouncement('+40 HEALTH');
        } else if (pickupType === 'shield') {
          this.player!.heal(0, 50);
          this.callbacks.onWaveAnnouncement('+50 SHIELD');
        } else if (pickupType === 'ammo') {
          this.player!.stats.ammo.pulse = WEAPON_DEFS.pulse.ammoMax;
          this.player!.stats.ammo.scatter = WEAPON_DEFS.scatter.ammoMax;
          this.player!.stats.ammo.railgun = WEAPON_DEFS.railgun.ammoMax;
          this.callbacks.onWaveAnnouncement('AMMO FULLY RECHARGED');
        } else if (pickupType === 'overdrive') {
          this.player!.stats.score += 1000;
          this.player!.heal(50, 50);
          this.callbacks.onWaveAnnouncement('OVERDRIVE ENGAGED!');
        }
      }
    );

    // 7. Check Game Over
    if (this.player.stats.hp <= 0 && this.status === 'PLAYING') {
      this.status = 'GAMEOVER';
      this.callbacks.onStatusChange('GAMEOVER');
      this.player.unlockPointer();
      sound.playExplosion('huge');
    }

    // 8. Render
    this.renderer.render(this.scene, this.player.camera);

    // 9. Throttled UI State Sync (15Hz is plenty for HUD numbers, saves React re-renders)
    this.uiSyncTimer += delta;
    if (this.uiSyncTimer >= 0.06) {
      this.uiSyncTimer = 0;
      this.callbacks.onStatsUpdate({ ...this.player.stats });
    }
  }

  public dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    this.arena?.dispose();
    this.player?.dispose();
    this.viewmodel?.dispose();
    this.enemyMgr?.dispose();
    this.combat?.dispose();
    this.renderer.dispose();
    sound.stopAmbientSoundscape();
  }
}
