/**
 * Core type definitions for VAPOR // ZERO
 */

export type GameStatus = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export type WeaponType = 'pulse' | 'scatter' | 'railgun';

export interface WeaponDef {
  id: WeaponType;
  name: string;
  category: string;
  fireRate: number; // shots per second
  damage: number;
  ammoMax: number;
  reloadTime: number; // seconds
  pellets?: number;
  spread: number;
  speed: number;
  color: string;
  recoilForce: number;
  soundType: 'pulse' | 'scatter' | 'railgun';
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  score: number;
  kills: number;
  wave: number;
  dashCooldown: number; // 0 = ready
  dashCooldownMax: number;
  currentWeapon: WeaponType;
  ammo: Record<WeaponType, number>;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  combo: number;
  comboTimer: number;
}

export type EnemyType = 'scout' | 'heavy' | 'kamikaze' | 'boss';

export interface EnemyState {
  id: number;
  type: EnemyType;
  meshGroup: any; // THREE.Group
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  hp: number;
  maxHp: number;
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'stagger' | 'dying';
  windupTimer: number;
  attackCooldown: number;
  staggerTimer: number;
  radius: number;
  scoreValue: number;
  telegraphMesh?: any;
  floatingTextTimer?: number;
}

export type PickupType = 'health' | 'shield' | 'ammo' | 'overdrive';

export interface PickupItem {
  id: number;
  type: PickupType;
  mesh: any;
  position: { x: number; y: number; z: number };
  collected: boolean;
}

export interface GameSettings {
  mouseSensitivity: number;
  soundVolume: number;
  musicVolume: number;
  screenShake: boolean;
  fov: number;
  invertY: boolean;
}
