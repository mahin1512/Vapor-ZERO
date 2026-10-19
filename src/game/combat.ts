/**
 * Combat, Projectiles, Particles, and Pickups for VAPOR // ZERO.
 * High-performance object pooling for bullets, beams, explosions, and pickups.
 */

import * as THREE from 'three';
import { EnemyState, EnemyType, PickupItem, PickupType, WeaponDef, WeaponType } from '../types/game';
import { sound } from '../audio/soundEngine';

export interface Projectile {
  active: boolean;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  life: number;
  isPlayer: boolean;
  type: WeaponType | EnemyType;
  radius: number;
}

export interface Particle {
  active: boolean;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export interface Beam {
  active: boolean;
  mesh: THREE.Mesh;
  life: number;
}

export interface CombatSystem {
  group: THREE.Group;
  firePlayerWeapon: (
    weapon: WeaponDef,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    enemies: EnemyState[],
    onHitEnemy: (enemyId: number, damage: number, isHeadshot: boolean, hitPos: THREE.Vector3) => void
  ) => void;
  fireEnemyProjectile: (
    origin: THREE.Vector3,
    target: THREE.Vector3,
    damage: number,
    type: EnemyType
  ) => void;
  spawnExplosion: (position: THREE.Vector3, colorHex: number, count?: number) => void;
  spawnPickup: (type: PickupType, position: THREE.Vector3) => void;
  update: (
    delta: number,
    playerPos: THREE.Vector3,
    playerRadius: number,
    enemies: EnemyState[],
    onPlayerDamage: (amount: number) => void,
    onPickupCollected: (type: PickupType) => void
  ) => void;
  clearAll: () => void;
  dispose: () => void;
}

export function createCombatSystem(scene: THREE.Scene): CombatSystem {
  const group = new THREE.Group();
  scene.add(group);

  // Materials for projectiles
  const cyanLaserMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const orangeScatterMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
  const violetBeamMat = new THREE.MeshBasicMaterial({ color: 0xcc00ff, transparent: true, opacity: 0.9 });
  const enemyRedMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
  const enemyHeavyMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
  const enemyBossMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });

  // 1. Projectiles Pool
  const MAX_PROJECTILES = 120;
  const projectilePool: Projectile[] = [];
  const boltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8);
  boltGeo.rotateX(Math.PI / 2);
  const pelletGeo = new THREE.SphereGeometry(0.1, 6, 6);
  const mortarGeo = new THREE.SphereGeometry(0.35, 8, 8);

  for (let i = 0; i < MAX_PROJECTILES; i++) {
    const mesh = new THREE.Mesh(boltGeo, cyanLaserMat);
    mesh.visible = false;
    group.add(mesh);
    projectilePool.push({
      active: false,
      mesh,
      velocity: new THREE.Vector3(),
      damage: 0,
      life: 0,
      isPlayer: true,
      type: 'pulse',
      radius: 0.2,
    });
  }

  // 2. Beams Pool (for Railgun)
  const MAX_BEAMS = 8;
  const beamPool: Beam[] = [];
  const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);
  beamGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < MAX_BEAMS; i++) {
    const mesh = new THREE.Mesh(beamGeo, violetBeamMat.clone());
    mesh.visible = false;
    group.add(mesh);
    beamPool.push({
      active: false,
      mesh,
      life: 0,
    });
  }

  // 3. Particles Pool (Sparks and Debris)
  const MAX_PARTICLES = 250;
  const particlePool: Particle[] = [];
  const particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);

  for (let i = 0; i < MAX_PARTICLES; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(particleGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    particlePool.push({
      active: false,
      mesh,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      color: new THREE.Color(),
    });
  }

  // 4. Pickups
  const pickups: PickupItem[] = [];
  let nextPickupId = 1;

  const healthMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00aa55, roughness: 0.2 });
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x00d0ff, emissive: 0x0088cc, roughness: 0.2 });
  const overchargeMat = new THREE.MeshStandardMaterial({ color: 0xffbb00, emissive: 0xff8800, roughness: 0.2 });

  const ammoMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xcc7700, roughness: 0.2 });

  function spawnPickup(type: PickupType, position: THREE.Vector3) {
    const pickGroup = new THREE.Group();
    pickGroup.position.copy(position);

    let mat = healthMat;
    if (type === 'shield') mat = shieldMat;
    if (type === 'ammo') mat = ammoMat;
    if (type === 'overdrive') mat = overchargeMat;

    // Outer floating rotating diamond
    const geo = new THREE.OctahedronGeometry(0.5, 0);
    const mesh = new THREE.Mesh(geo, mat);
    pickGroup.add(mesh);

    // Glowing base ring
    const ringGeo = new THREE.TorusGeometry(0.6, 0.04, 6, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: mat.emissive.getHex() });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    pickGroup.add(ring);

    group.add(pickGroup);

    pickups.push({
      id: nextPickupId++,
      type,
      mesh: pickGroup,
      position: { x: position.x, y: position.y, z: position.z },
      collected: false,
    });
  }

  function spawnExplosion(position: THREE.Vector3, colorHex: number, count: number = 18) {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const p = particlePool[i];
      if (!p.active) {
        p.active = true;
        p.life = Math.random() * 0.4 + 0.3;
        p.maxLife = p.life;
        p.mesh.position.copy(position);
        p.mesh.visible = true;

        // Random spherical explosion velocity
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const speed = Math.random() * 12 + 4;
        p.velocity.set(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.cos(phi) * speed + 2,
          Math.sin(phi) * Math.sin(theta) * speed
        );

        p.color.setHex(colorHex);
        (p.mesh.material as THREE.MeshBasicMaterial).color.copy(p.color);
        p.mesh.scale.setScalar(Math.random() * 1.5 + 0.6);
        spawned++;
      }
    }
  }

  function firePlayerWeapon(
    weapon: WeaponDef,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    enemies: EnemyState[],
    onHitEnemy: (enemyId: number, damage: number, isHeadshot: boolean, hitPos: THREE.Vector3) => void
  ) {
    if (weapon.id === 'pulse') {
      // Single fast plasma bolt
      for (const p of projectilePool) {
        if (!p.active) {
          p.active = true;
          p.isPlayer = true;
          p.type = 'pulse';
          p.mesh.geometry = boltGeo;
          p.mesh.material = cyanLaserMat;
          p.damage = weapon.damage;
          p.life = 2.0;
          p.radius = 0.3;
          p.mesh.position.copy(origin);
          p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

          // Add slight spread
          const spreadVec = new THREE.Vector3(
            (Math.random() - 0.5) * weapon.spread,
            (Math.random() - 0.5) * weapon.spread,
            (Math.random() - 0.5) * weapon.spread
          );
          p.velocity.copy(direction).add(spreadVec).normalize().multiplyScalar(weapon.speed);

          p.mesh.visible = true;
          sound.playPulseShoot();
          break;
        }
      }
    } else if (weapon.id === 'scatter') {
      // Shotgun spread
      const pellets = weapon.pellets || 7;
      let count = 0;
      for (const p of projectilePool) {
        if (!p.active) {
          p.active = true;
          p.isPlayer = true;
          p.type = 'scatter';
          p.mesh.geometry = pelletGeo;
          p.mesh.material = orangeScatterMat;
          p.damage = weapon.damage;
          p.life = 0.8;
          p.radius = 0.25;
          p.mesh.position.copy(origin);

          const spreadVec = new THREE.Vector3(
            (Math.random() - 0.5) * weapon.spread,
            (Math.random() - 0.5) * weapon.spread,
            (Math.random() - 0.5) * weapon.spread
          );
          p.velocity.copy(direction).add(spreadVec).normalize().multiplyScalar(weapon.speed);

          p.mesh.visible = true;
          count++;
          if (count >= pellets) break;
        }
      }
      sound.playScatterShoot();
    } else if (weapon.id === 'railgun') {
      // Instant piercing beam raycast
      sound.playRailgunShoot();

      const rayLength = 80;
      const rayEnd = origin.clone().add(direction.clone().multiplyScalar(rayLength));

      // Visual beam cylinder
      for (const beam of beamPool) {
        if (!beam.active) {
          beam.active = true;
          beam.life = 0.28;
          const midPoint = origin.clone().add(rayEnd).multiplyScalar(0.5);
          beam.mesh.position.copy(midPoint);
          beam.mesh.scale.set(1, 1, rayLength);
          beam.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
          beam.mesh.visible = true;
          (beam.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
          break;
        }
      }

      // Check hit on all enemies along ray (piercing!)
      const ray = new THREE.Ray(origin, direction);
      enemies.forEach((enemy) => {
        if (enemy.state === 'dying') return;
        const ePos = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);
        const distToRay = ray.distanceToPoint(ePos);
        if (distToRay < enemy.radius + 0.3) {
          const isHeadshot = Math.abs(ePos.y - origin.y) > 0.5;
          onHitEnemy(enemy.id, weapon.damage, isHeadshot, ePos);
          spawnExplosion(ePos, 0xcc00ff, 12);
        }
      });
    }
  }

  function fireEnemyProjectile(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    damage: number,
    type: EnemyType
  ) {
    for (const p of projectilePool) {
      if (!p.active) {
        p.active = true;
        p.isPlayer = false;
        p.type = type;
        p.damage = damage;
        p.life = 4.0;
        p.mesh.position.copy(origin);

        const dir = target.clone().sub(origin).normalize();

        if (type === 'scout') {
          p.mesh.geometry = boltGeo;
          p.mesh.material = enemyRedMat;
          p.radius = 0.3;
          p.velocity.copy(dir).multiplyScalar(22);
          p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        } else if (type === 'heavy') {
          p.mesh.geometry = mortarGeo;
          p.mesh.material = enemyHeavyMat;
          p.radius = 0.6;
          // Arcing mortar
          p.velocity.copy(dir).multiplyScalar(16);
          p.velocity.y += 3; // slight arc
        } else if (type === 'boss') {
          p.mesh.geometry = mortarGeo;
          p.mesh.material = enemyBossMat;
          p.radius = 0.5;
          p.velocity.copy(dir).multiplyScalar(20);
        }

        p.mesh.visible = true;
        break;
      }
    }
  }

  function clearAll() {
    projectilePool.forEach((p) => {
      p.active = false;
      p.mesh.visible = false;
    });
    beamPool.forEach((b) => {
      b.active = false;
      b.mesh.visible = false;
    });
    particlePool.forEach((pt) => {
      pt.active = false;
      pt.mesh.visible = false;
    });
    pickups.forEach((pk) => {
      group.remove(pk.mesh);
    });
    pickups.length = 0;
  }

  return {
    group,
    firePlayerWeapon,
    fireEnemyProjectile,
    spawnExplosion,
    spawnPickup,
    clearAll,
    update: (delta, playerPos, playerRadius, enemies, onPlayerDamage, onPickupCollected) => {
      // 1. Update Projectiles
      for (const p of projectilePool) {
        if (!p.active) continue;

        p.life -= delta;
        if (p.life <= 0) {
          p.active = false;
          p.mesh.visible = false;
          continue;
        }

        p.mesh.position.addScaledVector(p.velocity, delta);

        // Ground / Arena boundary hit
        if (p.mesh.position.y <= 0.1 || p.mesh.position.y >= 20 || p.mesh.position.length() > 60) {
          p.active = false;
          p.mesh.visible = false;
          spawnExplosion(p.mesh.position, p.isPlayer ? 0x00f0ff : 0xff3300, 5);
          continue;
        }

        // Collision Check
        if (p.isPlayer) {
          // Check collision against enemies
          for (const enemy of enemies) {
            if (enemy.state === 'dying') continue;
            const ePos = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);
            const dist = p.mesh.position.distanceTo(ePos);
            if (dist < enemy.radius + p.radius) {
              p.active = false;
              p.mesh.visible = false;
              const isHeadshot = p.mesh.position.y > enemy.position.y + enemy.radius * 0.4;
              spawnExplosion(p.mesh.position, 0x00ffff, 8);
              break;
            }
          }
        } else {
          // Check collision against player
          const distToPlayer = p.mesh.position.distanceTo(playerPos);
          if (distToPlayer < playerRadius + p.radius) {
            p.active = false;
            p.mesh.visible = false;
            spawnExplosion(p.mesh.position, 0xff0044, 10);
            onPlayerDamage(p.damage);
          }
        }
      }

      // 2. Update Beams
      for (const beam of beamPool) {
        if (!beam.active) continue;
        beam.life -= delta;
        if (beam.life <= 0) {
          beam.active = false;
          beam.mesh.visible = false;
        } else {
          const mat = beam.mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = (beam.life / 0.28) * 0.9;
        }
      }

      // 3. Update Particles
      for (const pt of particlePool) {
        if (!pt.active) continue;
        pt.life -= delta;
        if (pt.life <= 0) {
          pt.active = false;
          pt.mesh.visible = false;
          continue;
        }

        pt.velocity.y -= 14 * delta; // gravity
        pt.mesh.position.addScaledVector(pt.velocity, delta);

        if (pt.mesh.position.y < 0.05) {
          pt.mesh.position.y = 0.05;
          pt.velocity.y *= -0.3; // bounce
        }

        const scale = (pt.life / pt.maxLife) * 0.9;
        pt.mesh.scale.setScalar(scale);
      }

      // 4. Update Pickups
      for (let i = pickups.length - 1; i >= 0; i--) {
        const pk = pickups[i];
        if (pk.collected) continue;

        // Bob and rotate
        pk.mesh.rotation.y += delta * 2;
        const baseOct = pk.mesh.children[0];
        if (baseOct) baseOct.rotation.x += delta * 1.5;

        const pkPos = pk.mesh.position;
        const dist = pkPos.distanceTo(playerPos);

        // Magnetic attraction when close
        if (dist < 4.0) {
          const pullDir = playerPos.clone().sub(pkPos).normalize();
          pkPos.addScaledVector(pullDir, 8 * delta);
        }

        // Collection trigger
        if (dist < 1.6) {
          pk.collected = true;
          group.remove(pk.mesh);
          pickups.splice(i, 1);
          spawnExplosion(pkPos, 0x00ffcc, 15);
          sound.playPickup();
          onPickupCollected(pk.type);
        }
      }
    },
    dispose: () => {
      clearAll();
      scene.remove(group);
      cyanLaserMat.dispose();
      orangeScatterMat.dispose();
      violetBeamMat.dispose();
      enemyRedMat.dispose();
      enemyHeavyMat.dispose();
      enemyBossMat.dispose();
      boltGeo.dispose();
      pelletGeo.dispose();
      mortarGeo.dispose();
      beamGeo.dispose();
      particleGeo.dispose();
      healthMat.dispose();
      shieldMat.dispose();
      ammoMat.dispose();
      overchargeMat.dispose();
    },
  };
}
