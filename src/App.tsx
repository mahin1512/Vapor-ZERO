/**
 * VAPOR // ZERO - FPV Cyber Shooter
 * Root Application Shell.
 * Strict full-viewport shell without website navbars or footers.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, HitmarkerEvent } from './game/gameEngine';
import { GameStatus, PlayerStats, WeaponType } from './types/game';
import { WEAPON_DEFS } from './game/player';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { MousePointer } from 'lucide-react';

const INITIAL_STATS: PlayerStats = {
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

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [status, setStatus] = useState<GameStatus>('TITLE');
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [hitmarkers, setHitmarkers] = useState<HitmarkerEvent[]>([]);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [hurtFlash, setHurtFlash] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);

  // Initialize GameEngine once
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const engine = new GameEngine(canvasContainerRef.current, {
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
      onStatsUpdate: (newStats) => {
        setStats(newStats);
      },
      onHitmarker: (event) => {
        setHitmarkers((prev) => [...prev.slice(-4), event]);
      },
      onWaveAnnouncement: (text) => {
        setAnnouncement(text);
        setTimeout(() => {
          setAnnouncement((cur) => (cur === text ? null : cur));
        }, 3200);
      },
      onPlayerHurtEffect: () => {
        setHurtFlash(true);
        setTimeout(() => setHurtFlash(false), 160);
      },
    });

    engineRef.current = engine;

    const onPointerLockChange = () => {
      setIsPointerLocked(!!document.pointerLockElement);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Escape key for Pause / Resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (status === 'PLAYING') {
          engineRef.current?.pauseGame();
        } else if (status === 'PAUSED') {
          engineRef.current?.resumeGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  const handleStart = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restartGame();
  }, []);

  const handleReturnTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleSelectWeapon = useCallback((weapon: WeaponType) => {
    engineRef.current?.selectWeapon(weapon);
  }, []);

  // Click on screen to re-acquire pointer lock if playing
  const handleViewportClick = () => {
    if (status === 'PLAYING' && !isPointerLocked) {
      const canvas = canvasContainerRef.current?.querySelector('canvas');
      canvas?.requestPointerLock?.();
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#07090e] select-none text-white font-mono"
      onClick={handleViewportClick}
    >
      {/* Isolated Three.js Canvas Container */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 z-0 cursor-crosshair"
      />

      {/* Screen states */}
      {status === 'TITLE' && (
        <TitleScreen
          onStart={handleStart}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {(status === 'PLAYING' || status === 'PAUSED') && (
        <HUD
          stats={stats}
          hitmarkers={hitmarkers}
          announcement={announcement}
          hurtFlash={hurtFlash}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onSelectWeapon={handleSelectWeapon}
        />
      )}

      {/* Click to Lock Pointer Banner (if pointer lock lost while playing) */}
      {status === 'PLAYING' && !isPointerLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="bg-[#080d16]/95 border-2 border-cyan-400 px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-cyan-300 animate-pulse">
            <MousePointer className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold tracking-widest uppercase">
              CLICK SCREEN TO ENGAGE AIM CONTROL
            </span>
          </div>
        </div>
      )}

      {status === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnTitle={handleReturnTitle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {status === 'GAMEOVER' && (
        <GameOverModal
          stats={stats}
          onRestart={handleRestart}
          onReturnTitle={handleReturnTitle}
        />
      )}
    </div>
  );
}
