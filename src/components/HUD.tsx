/**
 * World-Matched, Low-Occlusion HUD for VAPOR // ZERO.
 * Keeps >85% of viewport unobstructed. No backdrop-filter over WebGL.
 * Styled in cyberpunk teal & neon amber with tabular-nums readouts.
 */

import React, { useState } from 'react';
import { PlayerStats, WeaponType } from '../types/game';
import { WEAPON_DEFS } from '../game/player';
import { HitmarkerEvent } from '../game/gameEngine';
import { Shield, Heart, Zap, Crosshair, Volume2, VolumeX, Pause, ChevronDown, ChevronUp } from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  hitmarkers: HitmarkerEvent[];
  announcement: string | null;
  hurtFlash: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onSelectWeapon: (weapon: WeaponType) => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  hitmarkers,
  announcement,
  hurtFlash,
  isMuted,
  onToggleMute,
  onPause,
  onSelectWeapon,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const currentWpn = WEAPON_DEFS[stats.currentWeapon];
  const ammoCount = stats.ammo[stats.currentWeapon];
  const ammoMax = currentWpn.ammoMax;

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (stats.shield / stats.maxShield) * 100));
  const dashReady = stats.dashCooldown <= 0;
  const dashPercent = 100 - (stats.dashCooldown / stats.dashCooldownMax) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono text-white">
      {/* 1. Screen Damage Flash Vignette */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-150 ${
          hurtFlash ? 'opacity-80' : 'opacity-0'
        }`}
        style={{
          boxShadow: 'inset 0 0 100px 30px rgba(255, 0, 68, 0.6)',
        }}
      />

      {/* 2. Top-Left Perimeter: Vitality Cluster (Health & Shield) */}
      <div className="absolute top-4 left-5 flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 bg-[#080d16]/90 border border-cyan-500/30 px-3.5 py-1.5 rounded shadow-lg shadow-cyan-950/20">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex flex-col w-36">
            <div className="flex justify-between items-center text-[10px] text-cyan-300 font-semibold tracking-wider">
              <span>SHIELD</span>
              <span className="tabular-nums font-bold">{Math.round(stats.shield)}</span>
            </div>
            <div className="w-full h-1.5 bg-cyan-950/80 rounded-sm overflow-hidden mt-0.5">
              <div
                className="h-full bg-cyan-400 transition-all duration-100 ease-out"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#080d16]/90 border border-emerald-500/30 px-3.5 py-1.5 rounded shadow-lg shadow-emerald-950/20">
          <Heart className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col w-36">
            <div className="flex justify-between items-center text-[10px] text-emerald-300 font-semibold tracking-wider">
              <span>ARMOR HP</span>
              <span className="tabular-nums font-bold">{Math.round(stats.hp)}</span>
            </div>
            <div className="w-full h-1.5 bg-emerald-950/80 rounded-sm overflow-hidden mt-0.5">
              <div
                className="h-full bg-emerald-400 transition-all duration-100 ease-out"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dash thruster readiness */}
        <div className="flex items-center gap-2 bg-[#080d16]/80 border border-amber-500/20 px-3 py-1 rounded">
          <Zap className={`w-3.5 h-3.5 ${dashReady ? 'text-amber-400' : 'text-amber-700'}`} />
          <span className="text-[10px] text-zinc-400 tracking-wider">DASH [SHIFT]</span>
          <div className="w-14 h-1 bg-amber-950/80 rounded-sm overflow-hidden ml-auto">
            <div
              className={`h-full ${dashReady ? 'bg-amber-400' : 'bg-amber-700'}`}
              style={{ width: `${dashPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Top-Right Perimeter: Combat Score & Wave Tracker */}
      <div className="absolute top-4 right-5 flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            className="pointer-events-auto cursor-pointer p-2 bg-[#080d16]/90 border border-cyan-500/30 hover:border-cyan-400 rounded text-cyan-400 transition-colors"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onPause}
            className="pointer-events-auto cursor-pointer p-2 bg-[#080d16]/90 border border-cyan-500/30 hover:border-cyan-400 rounded text-cyan-400 transition-colors"
            title="Pause (Esc)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#080d16]/90 border border-cyan-500/30 px-4 py-2 rounded shadow-lg text-right">
          <div className="text-[10px] text-cyan-400 tracking-widest uppercase">SCORE</div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
            {stats.score.toLocaleString()}
          </div>
          <div className="flex items-center justify-end gap-2 text-xs text-zinc-400 mt-0.5">
            <span>WAVE <strong className="text-cyan-300 font-bold tabular-nums">{stats.wave}</strong></span>
            <span>·</span>
            <span>KILLS <strong className="text-zinc-200 font-bold tabular-nums">{stats.kills}</strong></span>
          </div>
        </div>

        {/* Combo Multiplier indicator */}
        {stats.combo > 1 && (
          <div className="bg-amber-500/20 border border-amber-500/50 px-3 py-1 rounded text-right animate-bounce">
            <span className="text-xs font-bold text-amber-300 tracking-wider tabular-nums">
              {stats.combo}X COMBO
            </span>
            <div className="w-20 h-1 bg-amber-950 rounded-sm overflow-hidden mt-1 ml-auto">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${(stats.comboTimer / 2.5) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Center-Top: Dynamic Wave Announcement Banner */}
      {announcement && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-[#080d16]/95 border-y-2 border-cyan-400 px-8 py-2 text-center shadow-2xl">
            <div className="text-sm tracking-[0.3em] font-extrabold text-cyan-300 uppercase">
              {announcement}
            </div>
          </div>
        </div>
      )}

      {/* 5. Center Reticle & Dynamic Hitmarkers */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        {/* Reticle center dot & cross lines */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#00f0ff]" />
          <div className="absolute -top-3 w-0.5 h-2 bg-cyan-400/60" />
          <div className="absolute -bottom-3 w-0.5 h-2 bg-cyan-400/60" />
          <div className="absolute -left-3 w-2 h-0.5 bg-cyan-400/60" />
          <div className="absolute -right-3 w-2 h-0.5 bg-cyan-400/60" />
        </div>

        {/* Hitmarkers (render recent hits) */}
        {hitmarkers.slice(-3).map((hm) => (
          <div
            key={hm.id}
            className={`absolute pointer-events-none animate-ping text-xs font-bold tabular-nums ${
              hm.isHeadshot ? 'text-red-400' : 'text-cyan-200'
            }`}
            style={{ transform: 'translate(14px, -14px)' }}
          >
            {hm.isHeadshot ? `CRIT ${hm.damage}` : hm.damage}
          </div>
        ))}
      </div>

      {/* 6. Bottom-Right: Tactical Ammo & Reload Status */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end pointer-events-auto">
        <div className="bg-[#080d16]/90 border border-cyan-500/30 px-5 py-3 rounded shadow-lg text-right">
          <div className="text-[10px] text-cyan-400 tracking-wider uppercase font-semibold">
            {currentWpn.name}
          </div>
          <div className="flex items-baseline justify-end gap-1 my-1">
            <span
              className={`text-4xl font-black tabular-nums ${
                ammoCount <= Math.ceil(ammoMax * 0.25) ? 'text-red-400 animate-pulse' : 'text-white'
              }`}
            >
              {stats.isReloading ? 'RELOAD' : ammoCount}
            </span>
            <span className="text-zinc-500 text-sm font-semibold">/ {ammoMax}</span>
          </div>

          {stats.isReloading && (
            <div className="w-36 h-1 bg-cyan-950 rounded-sm overflow-hidden mt-1">
              <div
                className="h-full bg-cyan-400 transition-all duration-75"
                style={{ width: `${stats.reloadProgress * 100}%` }}
              />
            </div>
          )}

          <div className="text-[10px] text-zinc-400 mt-1">
            {stats.isReloading ? 'POWERING CELL...' : '[R] RELOAD'}
          </div>
        </div>
      </div>

      {/* 7. Bottom Unified Dock: Zero Viewport Occlusion & Collapsible */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center transition-transform duration-300 pointer-events-auto ${
          dockCollapsed ? 'translate-y-[calc(100%-28px)]' : 'bottom-4'
        }`}
        style={{ maxWidth: 'min(940px, 92vw)' }}
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="cursor-pointer flex items-center gap-1.5 px-3 py-1 bg-[#080d16]/90 border-t border-x border-cyan-500/30 hover:border-cyan-400 rounded-t text-[11px] text-cyan-300 tracking-wider shadow"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>SHOW WEAPONS DOCK</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>MINIMIZE</span>
            </>
          )}
        </button>

        {/* Weapons Swatch Dock */}
        <div className="flex items-center gap-2 bg-[#080d16]/95 border border-cyan-500/30 p-2 rounded shadow-2xl">
          {(['pulse', 'scatter', 'railgun'] as WeaponType[]).map((wId, idx) => {
            const wDef = WEAPON_DEFS[wId];
            const isEquipped = stats.currentWeapon === wId;
            return (
              <button
                key={wId}
                onClick={() => onSelectWeapon(wId)}
                className={`cursor-pointer flex items-center gap-2.5 px-3.5 py-1.5 rounded transition-all text-left ${
                  isEquipped
                    ? 'bg-cyan-500/20 border border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                    : 'bg-[#0f1522]/80 border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: wDef.color }}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-cyan-400 font-bold">[{idx + 1}]</span>
                    <span className="text-xs font-semibold">{wDef.name.split(' ')[0]}</span>
                  </div>
                  <span className="text-[9px] text-zinc-400">{wDef.category}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
