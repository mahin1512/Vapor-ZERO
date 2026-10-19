/**
 * Player Controller, First-Person Kinematics, and Camera Management for VAPOR // ZERO.
 * Handles Pointer Lock, WASD acceleration, jumping, dashing, collision detection,
 * jump pad launching, shield regen, and camera shake.
 */

import * as THREE from 'three';
import { ArenaObstacle, JumpPad } from './arena';
import { PlayerStats, WeaponDef, WeaponType } from '../types/game';
import { sound } from '../audio/soundEngine';

export const WEAPON_DEFS: Record<WeaponType, WeaponDef> = {
  pulse: {
    id: 'pulse',
    name: 'PULSE-9 CYBER RIFLE',
    category: 'Rapid Energy Carbine',
    fireRate: 9, // 9 shots / sec
    damage: 28,
    ammoMax: 35,
    reloadTime: 1.1,
    spread: 0.015,
    speed: 75,
    color: '#00f0ff',
    recoilForce: 0.04,
    soundType: 'pulse',
  },
  scatter: {
    id: 'scatter',
    name: 'FLAK-SHOCK SHOTGUN',
    category: 'Heavy Scatter Cannon',
    fireRate: 1.8, // 1.8 shots / sec
    damage: 18, // per pellet
    pellets: 8,
    ammoMax: 8,
    reloadTime: 1.4,
    spread: 0.065,
    speed: 60,
    color: '#ff7700',
    recoilForce: 0.12,
    soundType: 'scatter',
  },
  railgun: {
    id: 'railgun',
    name: 'ARC-NULL RAILGUN',
    category: 'Hyper-Velocity Beam',
    fireRate: 0.9, // 0.9 shots / sec
    damage: 180,
    ammoMax: 5,
    reloadTime: 1.8,
    spread: 0.0,
    speed: 200,
    color: '#cc00ff',
    recoilForce: 0.2,
    soundType: 'railgun',
  },
};

export interface PlayerController {
  camera: THREE.PerspectiveCamera;
  cameraRig: THREE.Group;
  stats: PlayerStats;
  isPointerLocked: boolean;
  lockPointer: () => void;
  unlockPointer: () => void;
  takeDamage: (amount: number) => void;
  heal: (hp: number, shield: number) => void;
  triggerShake: (intensity: number) => void;
  switchWeapon: (weapon: WeaponType) => void;
  reloadWeapon: () => void;
  update: (
    delta: number,
    obstacles: ArenaObstacle[],
    jumpPads: JumpPad[],
    onFireWeapon: (weapon: WeaponDef, origin: THREE.Vector3, direction: THREE.Vector3) => void
  ) => void;
  reset: () => void;
  dispose: () => void;
}

export function createPlayerController(domElement: HTMLElement): PlayerController {
  const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.1, 200);
  const cameraRig = new THREE.Group();
  cameraRig.position.set(0, 1.7, 18);
  cameraRig.add(camera);

  // Stats state
  const stats: PlayerStats = {
    hp: 100,
    maxHp: 100,
    shield: 100,
    maxShield: 100,
    score: 0,
    kills: 0,
    wave: 1,
    dashCooldown: 0,
    dashCooldownMax: 1.8,
    currentWeapon: 'pulse',
    ammo: {
      pulse: WEAPON_DEFS.pulse.ammoMax,
      scatter: WEAPON_DEFS.scatter.ammoMax,
      railgun: WEAPON_DEFS.railgun.ammoMax,
    },
    isReloading: false,
    reloadProgress: 0,
    combo: 1,
    comboTimer: 0,
  };

  // Rotation Euler
  let pitch = 0; // camera X rotation (clamped)
  let yaw = 0; // rig Y rotation
  let mouseSensitivity = 0.0022;

  // Kinematics
  const velocity = new THREE.Vector3();
  let isGrounded = true;
  let coyoteTimer = 0;
  let timeSinceLastDamage = 999;
  let fireTimer = 0;
  let reloadTimer = 0;

  // Screen shake / camera roll
  let trauma = 0; // 0 to 1
  let rollAngle = 0;

  // Key tracking
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    dash: false,
    shoot: false,
  };

  let isPointerLocked = false;

  // Input Listeners
  const onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = true;
    if (code === 'KeyS' || code === 'ArrowDown') keys.backward = true;
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = true;
    if (code === 'Space') keys.jump = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.dash = true;

    // Weapon slot hotkeys
    if (code === 'Digit1') switchWeapon('pulse');
    if (code === 'Digit2') switchWeapon('scatter');
    if (code === 'Digit3') switchWeapon('railgun');

    if (code === 'KeyR') reloadWeapon();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') keys.forward = false;
    if (code === 'KeyS' || code === 'ArrowDown') keys.backward = false;
    if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') keys.right = false;
    if (code === 'Space') keys.jump = false;
    if (code === 'ShiftLeft' || code === 'ShiftRight') keys.dash = false;
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) keys.shoot = true;
  };

  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) keys.shoot = false;
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isPointerLocked) return;
    yaw -= e.movementX * mouseSensitivity;
    pitch -= e.movementY * mouseSensitivity;
    // Clamp pitch between ~-85° and 85°
    pitch = Math.max(-1.48, Math.min(1.48, pitch));
  };

  const onWheel = (e: WheelEvent) => {
    if (e.deltaY > 0) {
      // Next weapon
      if (stats.currentWeapon === 'pulse') switchWeapon('scatter');
      else if (stats.currentWeapon === 'scatter') switchWeapon('railgun');
      else switchWeapon('pulse');
    } else if (e.deltaY < 0) {
      // Prev weapon
      if (stats.currentWeapon === 'pulse') switchWeapon('railgun');
      else if (stats.currentWeapon === 'railgun') switchWeapon('scatter');
      else switchWeapon('pulse');
    }
  };

  const onPointerLockChange = () => {
    isPointerLocked = document.pointerLockElement === domElement;
  };

  const onWindowBlur = () => {
    // Clear all held inputs
    keys.forward = false;
    keys.backward = false;
    keys.left = false;
    keys.right = false;
    keys.jump = false;
    keys.dash = false;
    keys.shoot = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('wheel', onWheel);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  window.addEventListener('blur', onWindowBlur);

  function lockPointer() {
    domElement.requestPointerLock?.();
  }

  function unlockPointer() {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  function switchWeapon(newWeapon: WeaponType) {
    if (stats.currentWeapon === newWeapon) return;
    stats.currentWeapon = newWeapon;
    stats.isReloading = false;
    stats.reloadProgress = 0;
  }

  function reloadWeapon() {
    const curWpn = stats.currentWeapon;
    const def = WEAPON_DEFS[curWpn];
    if (stats.isReloading || stats.ammo[curWpn] >= def.ammoMax) return;
    stats.isReloading = true;
    reloadTimer = def.reloadTime;
  }

  function takeDamage(amount: number) {
    timeSinceLastDamage = 0;
    triggerShake(0.5);

    if (stats.shield > 0) {
      const shieldDmg = Math.min(stats.shield, amount);
      stats.shield -= shieldDmg;
      const remainingDmg = amount - shieldDmg;

      if (stats.shield <= 0) {
        sound.playShieldBreak();
      } else {
        sound.playPlayerHurt();
      }

      if (remainingDmg > 0) {
        stats.hp = Math.max(0, stats.hp - remainingDmg);
      }
    } else {
      stats.hp = Math.max(0, stats.hp - amount);
      sound.playPlayerHurt();
    }
  }

  function heal(hp: number, shield: number) {
    stats.hp = Math.min(stats.maxHp, stats.hp + hp);
    stats.shield = Math.min(stats.maxShield, stats.shield + shield);
  }

  function triggerShake(intensity: number) {
    trauma = Math.min(1.0, trauma + intensity);
  }

  function reset() {
    stats.hp = 100;
    stats.shield = 100;
    stats.score = 0;
    stats.kills = 0;
    stats.wave = 1;
    stats.dashCooldown = 0;
    stats.currentWeapon = 'pulse';
    stats.ammo.pulse = WEAPON_DEFS.pulse.ammoMax;
    stats.ammo.scatter = WEAPON_DEFS.scatter.ammoMax;
    stats.ammo.railgun = WEAPON_DEFS.railgun.ammoMax;
    stats.isReloading = false;
    stats.reloadProgress = 0;
    stats.combo = 1;
    stats.comboTimer = 0;

    cameraRig.position.set(0, 1.7, 18);
    velocity.set(0, 0, 0);
    pitch = 0;
    yaw = 0;
    trauma = 0;
  }

  return {
    camera,
    cameraRig,
    stats,
    get isPointerLocked() {
      return isPointerLocked;
    },
    lockPointer,
    unlockPointer,
    takeDamage,
    heal,
    triggerShake,
    switchWeapon,
    reloadWeapon,
    reset,
    update: (delta, obstacles, jumpPads, onFireWeapon) => {
      // 1. Dash cooldown & Combo decay
      if (stats.dashCooldown > 0) {
        stats.dashCooldown = Math.max(0, stats.dashCooldown - delta);
      }
      if (stats.comboTimer > 0) {
        stats.comboTimer -= delta;
        if (stats.comboTimer <= 0) {
          stats.combo = 1; // reset combo
        }
      }

      // 2. Shield auto-recharge
      timeSinceLastDamage += delta;
      if (timeSinceLastDamage > 4.0 && stats.shield < stats.maxShield) {
        stats.shield = Math.min(stats.maxShield, stats.shield + 25 * delta);
      }

      // 3. Reloading timer
      const currentDef = WEAPON_DEFS[stats.currentWeapon];
      if (stats.isReloading) {
        reloadTimer -= delta;
        stats.reloadProgress = 1 - reloadTimer / currentDef.reloadTime;
        if (reloadTimer <= 0) {
          stats.ammo[stats.currentWeapon] = currentDef.ammoMax;
          stats.isReloading = false;
          stats.reloadProgress = 0;
        }
      }

      // 4. Movement Kinematics
      const moveDir = new THREE.Vector3();
      if (keys.forward) moveDir.z -= 1;
      if (keys.backward) moveDir.z += 1;
      if (keys.left) moveDir.x -= 1;
      if (keys.right) moveDir.x += 1;

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        // Transform move direction by player yaw
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      }

      const moveSpeed = 16;
      const accel = isGrounded ? 55 : 20;
      const friction = isGrounded ? 10 : 1.5;

      // Target horizontal velocity
      const targetVelX = moveDir.x * moveSpeed;
      const targetVelZ = moveDir.z * moveSpeed;

      velocity.x = THREE.MathUtils.damp(velocity.x, targetVelX, isGrounded ? friction : 2, delta);
      velocity.z = THREE.MathUtils.damp(velocity.z, targetVelZ, isGrounded ? friction : 2, delta);

      // Dash impulse
      if (keys.dash && stats.dashCooldown <= 0 && moveDir.lengthSq() > 0) {
        stats.dashCooldown = stats.dashCooldownMax;
        const dashDir = moveDir.clone().normalize();
        velocity.x = dashDir.x * 32;
        velocity.z = dashDir.z * 32;
        sound.playDash();
        triggerShake(0.3);
      }

      // Coyote time & Jump
      if (isGrounded) {
        coyoteTimer = 0.12;
      } else {
        coyoteTimer -= delta;
      }

      if (keys.jump && (isGrounded || coyoteTimer > 0)) {
        velocity.y = 11.5;
        isGrounded = false;
        coyoteTimer = 0;
        sound.playJump();
      }

      // Gravity
      velocity.y -= 28 * delta;

      // Apply displacement
      cameraRig.position.x += velocity.x * delta;
      cameraRig.position.z += velocity.z * delta;
      cameraRig.position.y += velocity.y * delta;

      // Jump Pad launch collision
      const playerPos = cameraRig.position;
      for (const pad of jumpPads) {
        const dx = playerPos.x - pad.position.x;
        const dz = playerPos.z - pad.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < pad.radius && playerPos.y <= pad.position.y + 1.8) {
          velocity.y = pad.power; // 24 m/s launch upwards!
          isGrounded = false;
          sound.playJumpPad();
          triggerShake(0.35);
          break;
        }
      }

      // Ground & Obstacle Collision
      let groundY = 1.7; // default eye height above y=0

      // Check collision with obstacles / platforms
      const playerRadius = 0.55;
      for (const obs of obstacles) {
        // Check if inside bounding box with padding
        const minX = obs.min.x - playerRadius;
        const maxX = obs.max.x + playerRadius;
        const minZ = obs.min.z - playerRadius;
        const maxZ = obs.max.z + playerRadius;

        if (playerPos.x >= minX && playerPos.x <= maxX && playerPos.z >= minZ && playerPos.z <= maxZ) {
          if (obs.type === 'platform') {
            // Can stand on top of platform if landing from above
            const topY = obs.max.y + 1.7;
            if (playerPos.y >= obs.max.y && velocity.y <= 0) {
              if (topY > groundY) {
                groundY = topY;
              }
            } else {
              // Horizontal push out
              const pushLeft = Math.abs(playerPos.x - minX);
              const pushRight = Math.abs(maxX - playerPos.x);
              const pushBack = Math.abs(playerPos.z - minZ);
              const pushFront = Math.abs(maxZ - playerPos.z);
              const minPush = Math.min(pushLeft, pushRight, pushBack, pushFront);
              if (minPush === pushLeft) playerPos.x = minX;
              else if (minPush === pushRight) playerPos.x = maxX;
              else if (minPush === pushBack) playerPos.z = minZ;
              else playerPos.z = maxZ;
            }
          } else {
            // Wall / Pillar push out
            const pushLeft = Math.abs(playerPos.x - minX);
            const pushRight = Math.abs(maxX - playerPos.x);
            const pushBack = Math.abs(playerPos.z - minZ);
            const pushFront = Math.abs(maxZ - playerPos.z);
            const minPush = Math.min(pushLeft, pushRight, pushBack, pushFront);
            if (minPush === pushLeft) playerPos.x = minX;
            else if (minPush === pushRight) playerPos.x = maxX;
            else if (minPush === pushBack) playerPos.z = minZ;
            else playerPos.z = maxZ;
          }
        }
      }

      // Ground clamp
      if (playerPos.y <= groundY) {
        playerPos.y = groundY;
        velocity.y = 0;
        isGrounded = true;
      } else {
        isGrounded = false;
      }

      // Arena boundary clamp (-40 to 40)
      playerPos.x = Math.max(-39.5, Math.min(39.5, playerPos.x));
      playerPos.z = Math.max(-39.5, Math.min(39.5, playerPos.z));

      // 5. Weapon Firing Logic
      fireTimer += delta;
      const fireInterval = 1 / currentDef.fireRate;

      if (keys.shoot && !stats.isReloading && fireTimer >= fireInterval) {
        if (stats.ammo[stats.currentWeapon] > 0) {
          stats.ammo[stats.currentWeapon]--;
          fireTimer = 0;

          // Camera shooting recoil impulse
          pitch += currentDef.recoilForce * 0.4;
          triggerShake(currentDef.recoilForce * 1.5);

          // Ray / Bullet forward direction
          const forward = new THREE.Vector3(0, 0, -1);
          forward.applyQuaternion(camera.quaternion);
          forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

          const muzzleOrigin = cameraRig.position.clone().add(new THREE.Vector3(0, 0, 0));
          onFireWeapon(currentDef, muzzleOrigin, forward);

          // Auto reload when empty
          if (stats.ammo[stats.currentWeapon] <= 0) {
            reloadWeapon();
          }
        } else {
          reloadWeapon();
        }
      }

      // 6. Camera Rig Yaw & Pitch + Decaying Shake
      cameraRig.rotation.set(0, yaw, 0);

      // Roll camera slightly during strafe
      const targetRoll = -moveDir.x * 0.035;
      rollAngle = THREE.MathUtils.damp(rollAngle, targetRoll, 10, delta);

      // Compute shake offsets
      let shakeX = 0;
      let shakeY = 0;
      let shakeZ = 0;
      if (trauma > 0) {
        const shakePower = trauma * trauma;
        shakeX = (Math.random() - 0.5) * 0.05 * shakePower;
        shakeY = (Math.random() - 0.5) * 0.05 * shakePower;
        shakeZ = (Math.random() - 0.5) * 0.04 * shakePower;
        trauma = Math.max(0, trauma - delta * 2.2); // decay trauma
      }

      camera.position.set(shakeX, shakeY, shakeZ);
      camera.rotation.set(pitch + shakeY, 0, rollAngle + shakeZ);
    },
    dispose: () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('blur', onWindowBlur);
    },
  };
}
