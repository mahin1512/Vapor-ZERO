/**
 * Procedural Enemies System for VAPOR // ZERO.
 * Implements 3-12 part procedural models for Scout Drones, Heavy Walkers,
 * Kamikaze Swarmers, and Boss Goliath, complete with state machines,
 * visual windup telegraphs, hit flashes, and attack patterns.
 */

import * as THREE from 'three';
import { EnemyState, EnemyType } from '../types/game';
import { sound } from '../audio/soundEngine';

export interface EnemyManager {
  enemies: EnemyState[];
  group: THREE.Group;
  spawnEnemy: (type: EnemyType, position: THREE.Vector3, waveMultiplier: number) => void;
  update: (
    delta: number,
    playerPosition: THREE.Vector3,
    onEnemyAttack: (origin: THREE.Vector3, target: THREE.Vector3, damage: number, type: EnemyType) => void,
    onEnemyKilled: (enemy: EnemyState) => void
  ) => void;
  damageEnemy: (enemyId: number, amount: number, isHeadshot?: boolean) => boolean; // returns true if killed
  clearAll: () => void;
  dispose: () => void;
}

// Reusable shared materials
const metalChassisMat = new THREE.MeshStandardMaterial({
  color: 0x222a36,
  metalness: 0.85,
  roughness: 0.25,
});

const darkArmorMat = new THREE.MeshStandardMaterial({
  color: 0x111620,
  metalness: 0.9,
  roughness: 0.5,
});

const eyeRedMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
const eyeCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
const eyeOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
const hitFlashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

// 1. Build Procedural Scout Drone (7 parts: Hull, 4 Rotor Arms, Center Eye, Twin Guns)
function buildScoutDroneMesh(): THREE.Group {
  const root = new THREE.Group();

  // Main fuselage / core
  const coreGeo = new THREE.BoxGeometry(1.2, 0.45, 1.4);
  const core = new THREE.Mesh(coreGeo, darkArmorMat);
  root.add(core);

  // Optical sensor visor (front)
  const visorGeo = new THREE.BoxGeometry(0.8, 0.2, 0.2);
  const visor = new THREE.Mesh(visorGeo, eyeCyanMat);
  visor.position.set(0, 0.05, -0.7);
  root.add(visor);

  // 4 Rotor Thruster Pods
  const armAngles = [-Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4];
  const podGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
  const armGeo = new THREE.BoxGeometry(0.12, 0.1, 0.8);

  armAngles.forEach((angle) => {
    const armGroup = new THREE.Group();
    armGroup.rotation.y = angle;

    const arm = new THREE.Mesh(armGeo, metalChassisMat);
    arm.position.set(0, 0, 0.8);
    armGroup.add(arm);

    const pod = new THREE.Mesh(podGeo, darkArmorMat);
    pod.position.set(0, 0.1, 1.2);
    armGroup.add(pod);

    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.05, 0.15, 12), eyeCyanMat);
    jet.position.set(0, -0.05, 1.2);
    armGroup.add(jet);

    root.add(armGroup);
  });

  // Twin Plasma Cannons under wings
  const gunGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
  const gunL = new THREE.Mesh(gunGeo, metalChassisMat);
  gunL.rotation.x = Math.PI / 2;
  gunL.position.set(-0.55, -0.22, -0.4);

  const gunR = new THREE.Mesh(gunGeo, metalChassisMat);
  gunR.rotation.x = Math.PI / 2;
  gunR.position.set(0.55, -0.22, -0.4);
  root.add(gunL, gunR);

  // Windup Telegraph Laser Line (shows when aiming at player)
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -25)]);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0 });
  const telegraphLine = new THREE.Line(lineGeo, lineMat);
  telegraphLine.position.set(0, 0, -0.7);
  root.add(telegraphLine);

  (root as any).telegraphLine = telegraphLine;
  return root;
}

// 2. Build Procedural Heavy Mech Walker (8 parts: Torso, Shoulders, Cannon, Legs, Eye)
function buildHeavyWalkerMesh(): THREE.Group {
  const root = new THREE.Group();

  // Heavy Armored Torso
  const torsoGeo = new THREE.BoxGeometry(2.4, 2.0, 2.2);
  const torso = new THREE.Mesh(torsoGeo, darkArmorMat);
  torso.position.y = 2.6;
  root.add(torso);

  // Front Armor Crest
  const crestGeo = new THREE.BoxGeometry(1.8, 1.4, 0.4);
  const crest = new THREE.Mesh(crestGeo, metalChassisMat);
  crest.position.set(0, 2.6, -1.2);
  root.add(crest);

  // Glowing Optic Slit
  const opticGeo = new THREE.BoxGeometry(1.2, 0.25, 0.2);
  const optic = new THREE.Mesh(opticGeo, eyeOrangeMat);
  optic.position.set(0, 2.9, -1.35);
  root.add(optic);

  // Heavy Shoulder Plasma Cannon
  const cannonGroup = new THREE.Group();
  cannonGroup.position.set(1.4, 3.4, -0.2);
  const barrelGeo = new THREE.CylinderGeometry(0.3, 0.4, 2.2, 12);
  const barrel = new THREE.Mesh(barrelGeo, metalChassisMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.8;
  cannonGroup.add(barrel);

  // Muzzle energy coil
  const muzzleCoilGeo = new THREE.TorusGeometry(0.42, 0.08, 8, 16);
  const muzzleCoil = new THREE.Mesh(muzzleCoilGeo, eyeOrangeMat);
  muzzleCoil.position.z = -1.8;
  cannonGroup.add(muzzleCoil);
  root.add(cannonGroup);

  // Bipedal Legs (Left & Right)
  const legGeo = new THREE.BoxGeometry(0.6, 2.2, 0.8);
  const footGeo = new THREE.BoxGeometry(1.0, 0.4, 1.4);

  [-0.9, 0.9].forEach((x) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(x, 1.2, 0);

    const leg = new THREE.Mesh(legGeo, darkArmorMat);
    legGroup.add(leg);

    const foot = new THREE.Mesh(footGeo, metalChassisMat);
    foot.position.set(0, -1.0, 0.2);
    legGroup.add(foot);

    root.add(legGroup);
  });

  // Windup Charge Sphere (expands when heavy cannon is preparing shot)
  const chargeGeo = new THREE.SphereGeometry(0.5, 12, 12);
  const chargeMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0 });
  const chargeSphere = new THREE.Mesh(chargeGeo, chargeMat);
  chargeSphere.position.set(1.4, 3.4, -2.0);
  root.add(chargeSphere);

  (root as any).chargeSphere = chargeSphere;
  return root;
}

// 3. Build Procedural Kamikaze Swarmer (6 parts: Spiked Core, 3 Gyro Rings, Warning Beacon)
function buildKamikazeMesh(): THREE.Group {
  const root = new THREE.Group();

  // Core Orb
  const orbGeo = new THREE.IcosahedronGeometry(0.9, 1);
  const orb = new THREE.Mesh(orbGeo, darkArmorMat);
  root.add(orb);

  // Glowing Warning Core
  const glowGeo = new THREE.SphereGeometry(0.6, 12, 12);
  const glow = new THREE.Mesh(glowGeo, eyeRedMat);
  root.add(glow);

  // 3 Gyro Blade Rings rotating at different axes
  const ring1Geo = new THREE.TorusGeometry(1.2, 0.06, 6, 24);
  const ring1 = new THREE.Mesh(ring1Geo, metalChassisMat);
  const ring2 = new THREE.Mesh(ring1Geo, metalChassisMat);
  ring2.rotation.x = Math.PI / 2;
  const ring3 = new THREE.Mesh(ring1Geo, metalChassisMat);
  ring3.rotation.y = Math.PI / 2;

  root.add(ring1, ring2, ring3);

  // Accent spikes
  for (let i = 0; i < 6; i++) {
    const spikeGeo = new THREE.ConeGeometry(0.12, 0.5, 6);
    const spike = new THREE.Mesh(spikeGeo, metalChassisMat);
    const angle = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 0.9, Math.sin(angle) * 0.9, 0);
    spike.rotation.z = angle - Math.PI / 2;
    root.add(spike);
  }

  (root as any).rings = [ring1, ring2, ring3];
  (root as any).glow = glow;
  return root;
}

// 4. Build Procedural Boss Goliath (12 parts: Giant Core, Armored Shell, 4 Heavy Cannon Pods, Energy Shield Halo)
function buildBossGoliathMesh(): THREE.Group {
  const root = new THREE.Group();

  // Central Fortress Pod
  const fortressGeo = new THREE.CylinderGeometry(3.5, 4.5, 4.0, 16);
  const fortress = new THREE.Mesh(fortressGeo, darkArmorMat);
  fortress.position.y = 5.0;
  root.add(fortress);

  // Upper Armor Ring
  const ringGeo = new THREE.TorusGeometry(4.2, 0.6, 8, 24);
  const ring = new THREE.Mesh(ringGeo, metalChassisMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 6.2;
  root.add(ring);

  // Central Exposed Reactor Core
  const reactorGeo = new THREE.SphereGeometry(1.6, 16, 16);
  const reactor = new THREE.Mesh(reactorGeo, eyeRedMat);
  reactor.position.y = 5.0;
  root.add(reactor);

  // 4 Heavy Rotary Cannon Turrets
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const turretGroup = new THREE.Group();
    turretGroup.position.set(Math.cos(angle) * 3.8, 5.0, Math.sin(angle) * 3.8);
    turretGroup.rotation.y = angle;

    const turretBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.2), metalChassisMat);
    turretGroup.add(turretBase);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.0, 8), darkArmorMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 1.0;
    turretGroup.add(barrel);

    root.add(turretGroup);
  }

  // Energy Halo
  const haloGeo = new THREE.TorusGeometry(5.2, 0.15, 6, 32);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 4.0;
  root.add(halo);

  (root as any).halo = halo;
  (root as any).reactor = reactor;
  return root;
}

export function createEnemyManager(scene: THREE.Scene): EnemyManager {
  const group = new THREE.Group();
  scene.add(group);

  const enemies: EnemyState[] = [];
  let nextEnemyId = 1;

  // Flash management
  const flashingMeshes = new Map<any, { originalMats: THREE.Material[]; timer: number }>();

  function flashMeshWhite(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!flashingMeshes.has(mesh)) {
          const orig = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          flashingMeshes.set(mesh, { originalMats: orig, timer: 0.08 });
          mesh.material = hitFlashMat;
        } else {
          flashingMeshes.get(mesh)!.timer = 0.08;
        }
      }
    });
  }

  function spawnEnemy(type: EnemyType, position: THREE.Vector3, waveMultiplier: number) {
    let meshGroup: THREE.Group;
    let baseHp = 100;
    let radius = 1.2;
    let scoreValue = 100;

    if (type === 'scout') {
      meshGroup = buildScoutDroneMesh();
      baseHp = 60 * waveMultiplier;
      radius = 1.3;
      scoreValue = 150;
    } else if (type === 'heavy') {
      meshGroup = buildHeavyWalkerMesh();
      baseHp = 220 * waveMultiplier;
      radius = 2.0;
      scoreValue = 350;
    } else if (type === 'kamikaze') {
      meshGroup = buildKamikazeMesh();
      baseHp = 40 * waveMultiplier;
      radius = 1.1;
      scoreValue = 120;
    } else {
      // Boss
      meshGroup = buildBossGoliathMesh();
      baseHp = 1200 * waveMultiplier;
      radius = 4.2;
      scoreValue = 2500;
    }

    meshGroup.position.copy(position);
    meshGroup.castShadow = true;
    group.add(meshGroup);

    const enemy: EnemyState = {
      id: nextEnemyId++,
      type,
      meshGroup,
      position: { x: position.x, y: position.y, z: position.z },
      velocity: { x: 0, y: 0, z: 0 },
      hp: baseHp,
      maxHp: baseHp,
      state: 'chase',
      windupTimer: 0,
      attackCooldown: Math.random() * 1.5 + 0.5,
      staggerTimer: 0,
      radius,
      scoreValue,
    };

    enemies.push(enemy);
  }

  function damageEnemy(enemyId: number, amount: number, isHeadshot: boolean = false): boolean {
    const enemy = enemies.find((e) => e.id === enemyId);
    if (!enemy || enemy.state === 'dying') return false;

    const finalDamage = isHeadshot ? amount * 1.8 : amount;
    enemy.hp -= finalDamage;
    flashMeshWhite(enemy.meshGroup);

    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.state = 'dying';
      return true; // killed
    } else {
      // Light stagger
      enemy.staggerTimer = 0.08;
    }
    return false;
  }

  function clearAll() {
    enemies.forEach((e) => {
      group.remove(e.meshGroup);
    });
    enemies.length = 0;
  }

  return {
    enemies,
    group,
    spawnEnemy,
    damageEnemy,
    clearAll,
    update: (delta, playerPos, onEnemyAttack, onEnemyKilled) => {
      // 1. Process white hit flashes
      flashingMeshes.forEach((data, mesh) => {
        data.timer -= delta;
        if (data.timer <= 0) {
          mesh.material = data.originalMats.length === 1 ? data.originalMats[0] : data.originalMats;
          flashingMeshes.delete(mesh);
        }
      });

      // 2. Process Enemy AI & Movement
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        if (e.state === 'dying') {
          // Death scale explosion decay
          e.meshGroup.scale.multiplyScalar(1 - delta * 6);
          if (e.meshGroup.scale.x < 0.1) {
            group.remove(e.meshGroup);
            enemies.splice(i, 1);
            onEnemyKilled(e);
          }
          continue;
        }

        const mesh = e.meshGroup;
        const toPlayer = new THREE.Vector3(playerPos.x - mesh.position.x, playerPos.y - mesh.position.y, playerPos.z - mesh.position.z);
        const distToPlayer = toPlayer.length();

        // Face player horizontally
        const angle = Math.atan2(toPlayer.x, toPlayer.z);
        mesh.rotation.y = angle;

        // Decrease cooldowns
        if (e.attackCooldown > 0) e.attackCooldown -= delta;

        // Specific AI per enemy type
        if (e.type === 'scout') {
          // Flying scout drone: hovers 3-5m high, circles player, winds up laser burst
          const targetY = 3.8 + Math.sin(Date.now() * 0.003 + e.id) * 0.8;
          mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetY, 4, delta);

          const desiredDist = 14;
          const distDiff = distToPlayer - desiredDist;

          // Strafe tangentially while closing or backing off
          const dir = toPlayer.clone().normalize();
          const strafe = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sin(Date.now() * 0.002 + e.id) * 4);

          if (distDiff > 2) {
            mesh.position.x += (dir.x * 6 + strafe.x) * delta;
            mesh.position.z += (dir.z * 6 + strafe.z) * delta;
          } else if (distDiff < -2) {
            mesh.position.x += (-dir.x * 4 + strafe.x) * delta;
            mesh.position.z += (-dir.z * 4 + strafe.z) * delta;
          } else {
            mesh.position.x += strafe.x * delta;
            mesh.position.z += strafe.z * delta;
          }

          // Attack cycle
          const telegraphLine = (mesh as any).telegraphLine;
          if (e.state === 'windup') {
            e.windupTimer -= delta;
            if (telegraphLine) telegraphLine.material.opacity = 1 - e.windupTimer / 0.7;

            if (e.windupTimer <= 0) {
              // Fire!
              e.state = 'chase';
              e.attackCooldown = 2.2;
              if (telegraphLine) telegraphLine.material.opacity = 0;
              onEnemyAttack(mesh.position.clone().add(new THREE.Vector3(0, -0.2, 0)), playerPos, 15, 'scout');
            }
          } else if (e.attackCooldown <= 0 && distToPlayer < 28) {
            // Start telegraph windup
            e.state = 'windup';
            e.windupTimer = 0.7;
          }
        } else if (e.type === 'kamikaze') {
          // Agile seeker orb rushes directly at player, beeps faster
          const rings = (mesh as any).rings;
          if (rings) {
            rings[0].rotation.z += delta * 6;
            rings[1].rotation.x += delta * 6;
            rings[2].rotation.y += delta * 6;
          }

          // Hover height
          mesh.position.y = 1.4 + Math.sin(Date.now() * 0.008 + e.id) * 0.3;

          const dir = toPlayer.clone().normalize();
          const speed = e.state === 'windup' ? 12 : 9.5;
          mesh.position.x += dir.x * speed * delta;
          mesh.position.z += dir.z * speed * delta;

          // Detonation proximity
          if (distToPlayer < 4.0 || e.state === 'windup') {
            if (e.state !== 'windup') {
              e.state = 'windup';
              e.windupTimer = 0.75;
            } else {
              e.windupTimer -= delta;
              const glow = (mesh as any).glow;
              if (glow) {
                const flash = Math.sin(Date.now() * 0.03) > 0 ? 0xff0000 : 0xffffff;
                glow.material.color.setHex(flash);
              }

              if (e.windupTimer <= 0 || distToPlayer < 1.8) {
                // Detonate!
                e.hp = 0;
                e.state = 'dying';
                sound.playExplosion('medium');
                onEnemyAttack(mesh.position.clone(), playerPos, 35, 'kamikaze');
              }
            }
          }
        } else if (e.type === 'heavy') {
          // Heavy Walker stomps forward on ground
          mesh.position.y = 0; // sits flush on ground
          const dir = toPlayer.clone().normalize();

          if (distToPlayer > 10) {
            mesh.position.x += dir.x * 3.5 * delta;
            mesh.position.z += dir.z * 3.5 * delta;
          }

          const chargeSphere = (mesh as any).chargeSphere;
          if (e.state === 'windup') {
            e.windupTimer -= delta;
            const progress = 1 - e.windupTimer / 1.0;
            if (chargeSphere) {
              chargeSphere.material.opacity = progress;
              chargeSphere.scale.setScalar(0.4 + progress * 0.8);
            }

            if (e.windupTimer <= 0) {
              e.state = 'chase';
              e.attackCooldown = 3.5;
              if (chargeSphere) chargeSphere.material.opacity = 0;
              // Launch heavy plasma bomb
              onEnemyAttack(mesh.position.clone().add(new THREE.Vector3(1.4, 3.4, 0)), playerPos, 40, 'heavy');
            }
          } else if (e.attackCooldown <= 0 && distToPlayer < 35) {
            e.state = 'windup';
            e.windupTimer = 1.0;
          }
        } else if (e.type === 'boss') {
          // Boss Goliath: hovers around center, rotates halo, fires barrage
          const halo = (mesh as any).halo;
          if (halo) halo.rotation.z += delta * 1.5;

          const reactor = (mesh as any).reactor;
          if (reactor) {
            reactor.scale.setScalar(1.0 + Math.sin(Date.now() * 0.005) * 0.15);
          }

          mesh.position.y = 1.5 + Math.sin(Date.now() * 0.002) * 0.5;

          // Slowly float towards player
          const dir = toPlayer.clone().normalize();
          mesh.position.x += dir.x * 2.0 * delta;
          mesh.position.z += dir.z * 2.0 * delta;

          if (e.attackCooldown <= 0) {
            e.attackCooldown = 2.5;
            // Multi-projectile spread
            for (let b = -1; b <= 1; b++) {
              const spreadTarget = playerPos.clone().add(new THREE.Vector3(b * 3, 0, 0));
              onEnemyAttack(mesh.position.clone().add(new THREE.Vector3(0, 5, 0)), spreadTarget, 25, 'boss');
            }
          }
        }

        // Sync position state
        e.position.x = mesh.position.x;
        e.position.y = mesh.position.y;
        e.position.z = mesh.position.z;
      }
    },
    dispose: () => {
      clearAll();
      scene.remove(group);
      metalChassisMat.dispose();
      darkArmorMat.dispose();
      eyeRedMat.dispose();
      eyeCyanMat.dispose();
      eyeOrangeMat.dispose();
      hitFlashMat.dispose();
    },
  };
}
