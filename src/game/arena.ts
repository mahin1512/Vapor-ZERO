/**
 * Procedural Cyber Arena for VAPOR // ZERO.
 * Assembles multi-tier platforms, cover obstacles, jump pads, glowing energy circuits,
 * and perimeter containment towers using zero external assets.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface ArenaObstacle {
  min: THREE.Vector3;
  max: THREE.Vector3;
  type: 'wall' | 'pillar' | 'platform';
}

export interface JumpPad {
  position: THREE.Vector3;
  radius: number;
  power: number;
  mesh: THREE.Group;
}

export interface ArenaData {
  group: THREE.Group;
  obstacles: ArenaObstacle[];
  jumpPads: JumpPad[];
  enemySpawnPoints: THREE.Vector3[];
  pickupSpawnPoints: THREE.Vector3[];
  update: (delta: number) => void;
  dispose: () => void;
}

// Procedural texture generator for high-tech grid floor
function createCyberGridTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep dark carbon background
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, size, size);

  // Carbon fiber micro-weave
  ctx.strokeStyle = '#121824';
  ctx.lineWidth = 1;
  const step = 16;
  for (let x = 0; x < size; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y < size; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Major glowing cyber grid lines
  const majorStep = 128;
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.lineWidth = 3;
  for (let x = 0; x < size; x += majorStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y < size; y += majorStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Neon junction node accents
  ctx.fillStyle = '#00f0ff';
  for (let x = 0; x < size; x += majorStep) {
    for (let y = 0; y < size; y += majorStep) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // High-tech angular circuit tracings
  ctx.strokeStyle = 'rgba(255, 120, 0, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(256, 128);
  ctx.lineTo(384, 256);
  ctx.lineTo(640, 256);
  ctx.lineTo(768, 384);
  ctx.lineTo(896, 384);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(896, 640);
  ctx.lineTo(768, 640);
  ctx.lineTo(640, 768);
  ctx.lineTo(384, 768);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural hex panel texture for walls/pillars
function createHexWallTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#151922';
  ctx.fillRect(0, 0, size, size);

  // Hexagon pattern
  const r = 32;
  const h = r * Math.sin(Math.PI / 3);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;

  function drawHex(x: number, y: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + r * Math.cos(angle);
      const hy = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
  }

  for (let y = 0; y < size + h * 2; y += h * 2) {
    for (let x = 0; x < size + r * 3; x += r * 3) {
      drawHex(x, y);
      drawHex(x + r * 1.5, y + h);
    }
  }

  // Accent warning stripe
  ctx.fillStyle = '#ff0055';
  ctx.fillRect(0, size - 24, size, 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildCyberArena(scene: THREE.Scene, renderer: THREE.WebGLRenderer): ArenaData {
  const arenaGroup = new THREE.Group();
  const obstacles: ArenaObstacle[] = [];
  const jumpPads: JumpPad[] = [];

  // 1. Studio Environment & Atmosphere Setup
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  pmremGenerator.dispose();

  // Dark atmospheric horizon fog (cyber deep navy/black)
  const fogColor = new THREE.Color(0x07090e);
  scene.fog = new THREE.FogExp2(fogColor.getHex(), 0.015);
  scene.background = fogColor;

  // 2. Textures
  const gridTexture = createCyberGridTexture();
  const hexTexture = createHexWallTexture();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  gridTexture.anisotropy = maxAniso;
  hexTexture.anisotropy = maxAniso;

  // Shared PBR Materials
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: gridTexture,
    roughness: 0.25,
    metalness: 0.85,
  });

  const wallMaterial = new THREE.MeshStandardMaterial({
    map: hexTexture,
    roughness: 0.45,
    metalness: 0.65,
    bumpScale: 0.05,
  });

  const neonCyanMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
  });

  const neonOrangeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6600,
  });

  const neonPinkMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0055,
  });

  // 3. Ground Arena Floor (80 x 80 meters)
  const arenaSize = 84;
  const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
  const floorMesh = new THREE.Mesh(floorGeo, floorMaterial);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  arenaGroup.add(floorMesh);

  // Outer boundary wall obstacles (keeps player in arena)
  const wallH = 12;
  const half = arenaSize / 2;

  // Add boundary collision boxes
  obstacles.push(
    { min: new THREE.Vector3(-half - 2, 0, -half - 2), max: new THREE.Vector3(-half + 0.5, wallH, half + 2), type: 'wall' },
    { min: new THREE.Vector3(half - 0.5, 0, -half - 2), max: new THREE.Vector3(half + 2, wallH, half + 2), type: 'wall' },
    { min: new THREE.Vector3(-half - 2, 0, -half - 2), max: new THREE.Vector3(half + 2, wallH, -half + 0.5), type: 'wall' },
    { min: new THREE.Vector3(-half - 2, 0, half - 0.5), max: new THREE.Vector3(half + 2, wallH, half + 2), type: 'wall' }
  );

  // Perimeter Energy Pylons (12 towers)
  const pylonCount = 12;
  const pylonRadius = half - 1;
  const pylonGeo = new THREE.CylinderGeometry(0.8, 1.2, wallH, 8);
  const pylonRingGeo = new THREE.TorusGeometry(1.4, 0.1, 8, 16);

  for (let i = 0; i < pylonCount; i++) {
    const angle = (i / pylonCount) * Math.PI * 2;
    const px = Math.cos(angle) * pylonRadius;
    const pz = Math.sin(angle) * pylonRadius;

    const pylon = new THREE.Group();
    pylon.position.set(px, wallH / 2, pz);

    const body = new THREE.Mesh(pylonGeo, wallMaterial);
    body.castShadow = true;
    pylon.add(body);

    // Glowing rings on pylon
    const ring1 = new THREE.Mesh(pylonRingGeo, neonCyanMaterial);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 2;
    pylon.add(ring1);

    const ring2 = new THREE.Mesh(pylonRingGeo, neonOrangeMaterial);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -2;
    pylon.add(ring2);

    // Light beacon
    const beacon = new THREE.PointLight(0x00f0ff, 1.5, 18);
    beacon.position.y = wallH / 2 + 1;
    pylon.add(beacon);

    arenaGroup.add(pylon);
  }

  // 4. Multi-Tier Platforms & Central Raised Ring
  // Center Raised Cyber Spire with High Ground
  const centerPlatformH = 3.5;
  const centerRadius = 8;
  const centerGeo = new THREE.CylinderGeometry(centerRadius, centerRadius + 1, centerPlatformH, 16);
  const centerMesh = new THREE.Mesh(centerGeo, wallMaterial);
  centerMesh.position.set(0, centerPlatformH / 2, 0);
  centerMesh.receiveShadow = true;
  centerMesh.castShadow = true;
  arenaGroup.add(centerMesh);

  // Center core energy column
  const coreGeo = new THREE.CylinderGeometry(1.2, 1.2, 14, 16);
  const coreMesh = new THREE.Mesh(coreGeo, neonCyanMaterial);
  coreMesh.position.set(0, 7, 0);
  arenaGroup.add(coreMesh);

  const coreLight = new THREE.PointLight(0x00f0ff, 3, 25);
  coreLight.position.set(0, 8, 0);
  arenaGroup.add(coreLight);

  // Obstacle for center platform
  obstacles.push({
    min: new THREE.Vector3(-centerRadius, 0, -centerRadius),
    max: new THREE.Vector3(centerRadius, centerPlatformH, centerRadius),
    type: 'platform',
  });
  // Obstacle for core
  obstacles.push({
    min: new THREE.Vector3(-1.2, centerPlatformH, -1.2),
    max: new THREE.Vector3(1.2, centerPlatformH + 12, 1.2),
    type: 'pillar',
  });

  // 4 Elevated Sniper Bridges / Catwalks in North/South/East/West
  const bridgeOffsets = [
    { x: 0, z: -24, rot: 0 },
    { x: 0, z: 24, rot: 0 },
    { x: -24, z: 0, rot: Math.PI / 2 },
    { x: 24, z: 0, rot: Math.PI / 2 },
  ];

  bridgeOffsets.forEach((b) => {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(b.x, 0, b.z);
    bridgeGroup.rotation.y = b.rot;

    // Platform deck
    const deckGeo = new THREE.BoxGeometry(14, 0.8, 6);
    const deck = new THREE.Mesh(deckGeo, wallMaterial);
    deck.position.y = 4;
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // Glowing edge rails
    const railGeo = new THREE.BoxGeometry(14, 0.3, 0.2);
    const rail1 = new THREE.Mesh(railGeo, neonCyanMaterial);
    rail1.position.set(0, 4.8, -2.9);
    const rail2 = new THREE.Mesh(railGeo, neonCyanMaterial);
    rail2.position.set(0, 4.8, 2.9);
    bridgeGroup.add(rail1, rail2);

    // Support pillars
    const pillarGeo = new THREE.BoxGeometry(1.2, 4, 1.2);
    const p1 = new THREE.Mesh(pillarGeo, wallMaterial);
    p1.position.set(-5, 2, 0);
    const p2 = new THREE.Mesh(pillarGeo, wallMaterial);
    p2.position.set(5, 2, 0);
    p1.castShadow = true;
    p2.castShadow = true;
    bridgeGroup.add(p1, p2);

    arenaGroup.add(bridgeGroup);

    // Obstacle bounds
    const halfW = b.rot === 0 ? 7 : 3;
    const halfD = b.rot === 0 ? 3 : 7;
    obstacles.push({
      min: new THREE.Vector3(b.x - halfW, 0, b.z - halfD),
      max: new THREE.Vector3(b.x + halfW, 4.4, b.z + halfD),
      type: 'platform',
    });
  });

  // 5. Tactical Cover Blocks (hexagonal and rectangular cover boxes with neon trims)
  const coverLocations = [
    { x: -14, z: -14, sx: 3, sy: 2.2, sz: 3 },
    { x: 14, z: -14, sx: 3, sy: 2.2, sz: 3 },
    { x: -14, z: 14, sx: 3, sy: 2.2, sz: 3 },
    { x: 14, z: 14, sx: 3, sy: 2.2, sz: 3 },
    { x: -28, z: -16, sx: 4, sy: 3, sz: 2 },
    { x: 28, z: 16, sx: 4, sy: 3, sz: 2 },
    { x: -16, z: 28, sx: 2, sy: 3, sz: 4 },
    { x: 16, z: -28, sx: 2, sy: 3, sz: 4 },
    { x: 0, z: -35, sx: 6, sy: 2.5, sz: 2 },
    { x: 0, z: 35, sx: 6, sy: 2.5, sz: 2 },
    { x: -35, z: 0, sx: 2, sy: 2.5, sz: 6 },
    { x: 35, z: 0, sx: 2, sy: 2.5, sz: 6 },
  ];

  coverLocations.forEach((c) => {
    const boxGeo = new THREE.BoxGeometry(c.sx, c.sy, c.sz);
    const boxMesh = new THREE.Mesh(boxGeo, wallMaterial);
    boxMesh.position.set(c.x, c.sy / 2, c.z);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;

    // Glowing edge visor strip
    const stripGeo = new THREE.BoxGeometry(c.sx + 0.05, 0.15, c.sz + 0.05);
    const stripMesh = new THREE.Mesh(stripGeo, neonOrangeMaterial);
    stripMesh.position.set(c.x, c.sy * 0.75, c.z);

    arenaGroup.add(boxMesh);
    arenaGroup.add(stripMesh);

    obstacles.push({
      min: new THREE.Vector3(c.x - c.sx / 2, 0, c.z - c.sz / 2),
      max: new THREE.Vector3(c.x + c.sx / 2, c.sy, c.z + c.sz / 2),
      type: 'pillar',
    });
  });

  // 6. Jump Pads (4 launch pads in corners to launch player into aerial combat)
  const padCoords = [
    { x: -20, z: -20 },
    { x: 20, z: -20 },
    { x: -20, z: 20 },
    { x: 20, z: 20 },
  ];

  padCoords.forEach((coord) => {
    const padGroup = new THREE.Group();
    padGroup.position.set(coord.x, 0.05, coord.z);

    // Base ring
    const baseGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.3, 24);
    const baseMesh = new THREE.Mesh(baseGeo, wallMaterial);
    padGroup.add(baseMesh);

    // Glowing emitter disc
    const discGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.35, 24);
    const discMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    padGroup.add(discMesh);

    // Floating pulsing ring
    const ringGeo = new THREE.TorusGeometry(1.6, 0.1, 8, 24);
    const ringMesh = new THREE.Mesh(ringGeo, neonCyanMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.4;
    padGroup.add(ringMesh);

    const padLight = new THREE.PointLight(0x00ffcc, 1.2, 6);
    padLight.position.y = 1;
    padGroup.add(padLight);

    arenaGroup.add(padGroup);

    jumpPads.push({
      position: new THREE.Vector3(coord.x, 0.2, coord.z),
      radius: 2.2,
      power: 24, // Launch velocity Y
      mesh: padGroup,
    });
  });

  // 7. Ambient Floating Cyber Embers / Dust Motes
  const particleCount = 180;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleSpeeds = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3 + 0] = (Math.random() - 0.5) * arenaSize;
    particlePositions[i * 3 + 1] = Math.random() * 16 + 0.5;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * arenaSize;
    particleSpeeds[i] = Math.random() * 0.8 + 0.3;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0x00f0ff,
    size: 0.25,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  arenaGroup.add(particleSystem);

  // 8. Studio Lights Rig
  // Key Light (Warm cyber orange)
  const keyLight = new THREE.DirectionalLight(0xffaa55, 2.0);
  keyLight.position.set(30, 45, 25);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 10;
  keyLight.shadow.camera.far = 120;
  keyLight.shadow.camera.left = -45;
  keyLight.shadow.camera.right = 45;
  keyLight.shadow.camera.top = 45;
  keyLight.shadow.camera.bottom = -45;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  arenaGroup.add(keyLight);

  // Fill Light (Cool sky / ground hemisphere)
  const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x111624, 0.7);
  arenaGroup.add(hemiLight);

  // Rim back light (Neon magenta)
  const rimLight = new THREE.DirectionalLight(0xff0088, 1.2);
  rimLight.position.set(-35, 30, -35);
  arenaGroup.add(rimLight);

  scene.add(arenaGroup);

  // Spawn points for enemies (scattered around arena borders & outer rings)
  const enemySpawnPoints: THREE.Vector3[] = [
    new THREE.Vector3(-30, 2, -30),
    new THREE.Vector3(30, 2, -30),
    new THREE.Vector3(-30, 2, 30),
    new THREE.Vector3(30, 2, 30),
    new THREE.Vector3(0, 3, -34),
    new THREE.Vector3(0, 3, 34),
    new THREE.Vector3(-34, 3, 0),
    new THREE.Vector3(34, 3, 0),
    new THREE.Vector3(-18, 6, -18),
    new THREE.Vector3(18, 6, -18),
    new THREE.Vector3(-18, 6, 18),
    new THREE.Vector3(18, 6, 18),
  ];

  // Spawn points for pickups (bridges, near center, near covers)
  const pickupSpawnPoints: THREE.Vector3[] = [
    new THREE.Vector3(0, centerPlatformH + 0.8, 0),
    new THREE.Vector3(0, 4.8, -24),
    new THREE.Vector3(0, 4.8, 24),
    new THREE.Vector3(-24, 4.8, 0),
    new THREE.Vector3(24, 4.8, 0),
    new THREE.Vector3(-14, 1.2, -14),
    new THREE.Vector3(14, 1.2, 14),
  ];

  let time = 0;

  return {
    group: arenaGroup,
    obstacles,
    jumpPads,
    enemySpawnPoints,
    pickupSpawnPoints,
    update: (delta: number) => {
      time += delta;

      // Animate jump pad rings pulsing
      jumpPads.forEach((pad, i) => {
        const ring = pad.mesh.children[2] as THREE.Mesh;
        if (ring) {
          ring.position.y = 0.4 + Math.sin(time * 6 + i) * 0.15;
          ring.rotation.z += delta * 2;
        }
      });

      // Animate floating cyber motes
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleSpeeds[i] * delta;
        if (positions[i * 3 + 1] > 18) {
          positions[i * 3 + 1] = 0.5;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;
    },
    dispose: () => {
      scene.remove(arenaGroup);
      gridTexture.dispose();
      hexTexture.dispose();
      floorGeo.dispose();
      floorMaterial.dispose();
      wallMaterial.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    },
  };
}
