/**
 * First-Person Viewmodel Rig for VAPOR // ZERO.
 * Procedural 3D weapon models attached directly to the camera rig with
 * idle breathing bob, walk sway, weapon kickback recoil, and muzzle flash.
 */

import * as THREE from 'three';
import { WeaponType } from '../types/game';

export interface ViewmodelRig {
  root: THREE.Group;
  setWeapon: (weapon: WeaponType) => void;
  triggerFire: (weapon: WeaponType) => void;
  triggerReload: () => void;
  update: (delta: number, isMoving: boolean, isSprinting: boolean, isAirborne: boolean) => void;
  dispose: () => void;
}

export function createViewmodel(camera: THREE.Camera): ViewmodelRig {
  const root = new THREE.Group();
  // Standard first-person weapon offset relative to camera
  // Right-handed position slightly forward and down
  const baseOffset = new THREE.Vector3(0.28, -0.24, -0.55);
  root.position.copy(baseOffset);
  camera.add(root);

  // Weapon Groups
  const pulseGroup = new THREE.Group();
  const scatterGroup = new THREE.Group();
  const railgunGroup = new THREE.Group();

  root.add(pulseGroup);
  root.add(scatterGroup);
  root.add(railgunGroup);

  scatterGroup.visible = false;
  railgunGroup.visible = false;

  // Shared weapon materials
  const gunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1a2130,
    metalness: 0.85,
    roughness: 0.25,
  });

  const gunDarkMat = new THREE.MeshStandardMaterial({
    color: 0x0c0f16,
    metalness: 0.9,
    roughness: 0.35,
  });

  const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
  const neonVioletMat = new THREE.MeshBasicMaterial({ color: 0xcc00ff });

  // 1. Build Pulse Rifle
  {
    // Receiver
    const bodyGeo = new THREE.BoxGeometry(0.08, 0.12, 0.38);
    const body = new THREE.Mesh(bodyGeo, gunMetalMat);
    pulseGroup.add(body);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.28, 12);
    const barrel = new THREE.Mesh(barrelGeo, gunDarkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.28);
    pulseGroup.add(barrel);

    // Plasma core shroud
    const shroudGeo = new THREE.BoxGeometry(0.09, 0.04, 0.18);
    const shroud = new THREE.Mesh(shroudGeo, neonCyanMat);
    shroud.position.set(0, 0.02, -0.15);
    pulseGroup.add(shroud);

    // Energy Battery Magazine
    const magGeo = new THREE.BoxGeometry(0.05, 0.14, 0.09);
    const mag = new THREE.Mesh(magGeo, gunDarkMat);
    mag.position.set(0, -0.1, -0.05);
    pulseGroup.add(mag);

    // Holographic Sight Mount
    const sightGeo = new THREE.BoxGeometry(0.04, 0.06, 0.08);
    const sight = new THREE.Mesh(sightGeo, neonCyanMat);
    sight.position.set(0, 0.09, 0.02);
    pulseGroup.add(sight);

    // Stock
    const stockGeo = new THREE.BoxGeometry(0.06, 0.09, 0.16);
    const stock = new THREE.Mesh(stockGeo, gunDarkMat);
    stock.position.set(0, -0.02, 0.24);
    pulseGroup.add(stock);
  }

  // 2. Build Scatter Flak (Shotgun)
  {
    // Heavy Receiver
    const bodyGeo = new THREE.BoxGeometry(0.11, 0.14, 0.32);
    const body = new THREE.Mesh(bodyGeo, gunDarkMat);
    scatterGroup.add(body);

    // Double Barrels
    const bGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 12);
    const bLeft = new THREE.Mesh(bGeo, gunMetalMat);
    bLeft.rotation.x = Math.PI / 2;
    bLeft.position.set(-0.035, 0.03, -0.26);

    const bRight = new THREE.Mesh(bGeo, gunMetalMat);
    bRight.rotation.x = Math.PI / 2;
    bRight.position.set(0.035, 0.03, -0.26);
    scatterGroup.add(bLeft, bRight);

    // Heat Vents & Glowing Orange Coils
    const coilGeo = new THREE.TorusGeometry(0.04, 0.008, 8, 16);
    for (let i = 0; i < 3; i++) {
      const coilL = new THREE.Mesh(coilGeo, neonOrangeMat);
      coilL.position.set(-0.035, 0.03, -0.18 - i * 0.06);
      const coilR = new THREE.Mesh(coilGeo, neonOrangeMat);
      coilR.position.set(0.035, 0.03, -0.18 - i * 0.06);
      scatterGroup.add(coilL, coilR);
    }

    // Heavy Stock
    const stockGeo = new THREE.BoxGeometry(0.08, 0.12, 0.22);
    const stock = new THREE.Mesh(stockGeo, gunMetalMat);
    stock.position.set(0, -0.04, 0.24);
    scatterGroup.add(stock);

    // Pump Foregrip
    const gripGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10);
    const grip = new THREE.Mesh(gripGeo, gunDarkMat);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, -0.04, -0.18);
    scatterGroup.add(grip);
  }

  // 3. Build Railgun / Plasma Beam
  {
    // Angular Long Chassis
    const chassisGeo = new THREE.BoxGeometry(0.09, 0.11, 0.48);
    const chassis = new THREE.Mesh(chassisGeo, gunDarkMat);
    railgunGroup.add(chassis);

    // Magnetic Rails (Twin Top and Bottom Prongs)
    const railTopGeo = new THREE.BoxGeometry(0.02, 0.02, 0.42);
    const railTop = new THREE.Mesh(railTopGeo, gunMetalMat);
    railTop.position.set(0, 0.07, -0.38);

    const railBot = new THREE.Mesh(railTopGeo, gunMetalMat);
    railBot.position.set(0, -0.07, -0.38);

    const railL = new THREE.Mesh(railTopGeo, gunMetalMat);
    railL.position.set(-0.05, 0, -0.38);

    const railR = new THREE.Mesh(railTopGeo, gunMetalMat);
    railR.position.set(0.05, 0, -0.38);

    railgunGroup.add(railTop, railBot, railL, railR);

    // Floating Accelerator Core (Glowing Violet)
    const coreGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.36, 12);
    const core = new THREE.Mesh(coreGeo, neonVioletMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 0, -0.36);
    railgunGroup.add(core);

    // Scope Sensor Lens
    const scopeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.16, 12);
    const scope = new THREE.Mesh(scopeGeo, gunMetalMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.1, -0.05);
    railgunGroup.add(scope);

    const lensGeo = new THREE.CircleGeometry(0.028, 16);
    const lens = new THREE.Mesh(lensGeo, neonVioletMat);
    lens.position.set(0, 0.1, 0.031);
    railgunGroup.add(lens);
  }

  // Muzzle Flash Effect (Procedural glowing 3D star burst)
  const flashGeo = new THREE.OctahedronGeometry(0.12, 0);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0,
  });
  const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
  muzzleFlash.position.set(0, 0.02, -0.5);
  root.add(muzzleFlash);

  // Animation state
  let currentWeapon: WeaponType = 'pulse';
  let bobTimer = 0;
  let recoilOffsetZ = 0;
  let recoilPitch = 0;
  let switchProgress = 1; // 1 = fully equipped
  let reloadTimer = 0;
  let isReloading = false;
  let targetWeapon: WeaponType = 'pulse';

  function updateActiveMesh(wpn: WeaponType) {
    pulseGroup.visible = wpn === 'pulse';
    scatterGroup.visible = wpn === 'scatter';
    railgunGroup.visible = wpn === 'railgun';

    if (wpn === 'pulse') flashMat.color.setHex(0x00f0ff);
    else if (wpn === 'scatter') flashMat.color.setHex(0xff7700);
    else if (wpn === 'railgun') flashMat.color.setHex(0xcc00ff);
  }

  return {
    root,
    setWeapon: (newWeapon: WeaponType) => {
      if (newWeapon === currentWeapon) return;
      targetWeapon = newWeapon;
      switchProgress = 0; // Trigger drop animation
    },
    triggerFire: (weapon: WeaponType) => {
      // Recoil impulse
      if (weapon === 'pulse') {
        recoilOffsetZ = 0.08;
        recoilPitch = 0.08;
      } else if (weapon === 'scatter') {
        recoilOffsetZ = 0.18;
        recoilPitch = 0.22;
      } else if (weapon === 'railgun') {
        recoilOffsetZ = 0.24;
        recoilPitch = 0.18;
      }
      flashMat.opacity = 1.0;
      muzzleFlash.scale.set(1.5, 1.5, 2.5);
    },
    triggerReload: () => {
      isReloading = true;
      reloadTimer = 1.2;
    },
    update: (delta: number, isMoving: boolean, isSprinting: boolean, isAirborne: boolean) => {
      // Handle weapon switch animation
      if (switchProgress < 1) {
        switchProgress += delta * 5;
        if (switchProgress >= 0.5 && currentWeapon !== targetWeapon) {
          currentWeapon = targetWeapon;
          updateActiveMesh(currentWeapon);
        }
      }

      // Handle reload animation
      let reloadRotX = 0;
      let reloadOffsetY = 0;
      if (isReloading) {
        reloadTimer -= delta;
        if (reloadTimer <= 0) {
          isReloading = false;
        } else {
          // Tilt gun down and back
          const t = 1 - reloadTimer / 1.2;
          reloadRotX = -Math.sin(t * Math.PI) * 0.45;
          reloadOffsetY = -Math.sin(t * Math.PI) * 0.12;
        }
      }

      // Natural breathing & movement bobbing
      const bobSpeed = isMoving ? (isSprinting ? 14 : 9) : 2.5;
      const bobAmountX = isMoving ? (isSprinting ? 0.015 : 0.008) : 0.002;
      const bobAmountY = isMoving ? (isSprinting ? 0.018 : 0.01) : 0.003;

      bobTimer += delta * bobSpeed;
      const bobX = Math.cos(bobTimer) * bobAmountX;
      const bobY = Math.sin(bobTimer * 2) * bobAmountY;

      // Decay recoil smoothly (spring damping)
      recoilOffsetZ = THREE.MathUtils.damp(recoilOffsetZ, 0, 14, delta);
      recoilPitch = THREE.MathUtils.damp(recoilPitch, 0, 16, delta);

      // Decay muzzle flash
      if (flashMat.opacity > 0) {
        flashMat.opacity = THREE.MathUtils.damp(flashMat.opacity, 0, 25, delta);
        muzzleFlash.scale.multiplyScalar(0.85);
      }

      // Switch dip offset
      const switchDip = Math.sin(Math.min(switchProgress, 1) * Math.PI) * -0.2;

      // Airborne tilt
      const airOffset = isAirborne ? -0.04 : 0;

      // Apply combined transform
      root.position.set(
        baseOffset.x + bobX,
        baseOffset.y + bobY + switchDip + reloadOffsetY + airOffset,
        baseOffset.z + recoilOffsetZ
      );

      root.rotation.set(
        recoilPitch + reloadRotX + (isMoving ? Math.sin(bobTimer) * 0.02 : 0),
        bobX * 1.5,
        (isMoving ? Math.cos(bobTimer) * 0.015 : 0)
      );
    },
    dispose: () => {
      camera.remove(root);
      gunMetalMat.dispose();
      gunDarkMat.dispose();
      neonCyanMat.dispose();
      neonOrangeMat.dispose();
      neonVioletMat.dispose();
      flashGeo.dispose();
      flashMat.dispose();
    },
  };
}
