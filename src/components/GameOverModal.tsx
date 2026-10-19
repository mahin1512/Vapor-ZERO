/**
 * Game Over Modal for VAPOR // ZERO.
 * Zero backdrop-filter. Displays final stats, wave survived, high score,
 * and instant Enter/Space retry button.
 */

import React, { useEffect, useState } from 'react';
import { RotateCcw, Trophy, Skull, Crosshair, Home } from 'lucide-react';
import { PlayerStats } from '../types/game';

interface GameOverModalProps {
  stats: PlayerStats;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onReturnTitle,
}) => {
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('vapor_zero_highscore');
    const prevHigh = saved ? parseInt(saved, 10) : 0;
    if (stats.score > prevHigh) {
      setHighScore(stats.score);
      localStorage.setItem('vapor_zero_highscore', stats.score.toString());
    } else {
      setHighScore(prevHigh);
    }
  }, [stats.score]);

  // Enter/Space key to instantly restart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestart]);

  const isNewHigh = stats.score >= highScore && stats.score > 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/85 font-mono select-none">
      <div className="w-full max-w-lg bg-[#0e0a10] border-2 border-red-500/50 rounded-lg p-7 shadow-[0_0_40px_rgba(255,0,68,0.25)] flex flex-col gap-6 text-white text-center">
        {/* Header */}
        <div className="border-b border-red-500/20 pb-4">
          <div className="text-3xl font-black tracking-widest text-red-500 uppercase">
            OPERATOR TERMINATED
          </div>
          <div className="text-xs text-zinc-400 mt-1">ARMOR COMPROMISED // SIMULATION ENDED</div>
        </div>

        {/* High Score Banner */}
        {isNewHigh && (
          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold py-1.5 px-3 rounded uppercase tracking-widest">
            ★ NEW PERSONAL RECORD ACHIEVED ★
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-[#15101a] border border-red-900/40 p-3.5 rounded">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">FINAL SCORE</div>
            <div className="text-2xl font-black text-white tabular-nums mt-0.5">
              {stats.score.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#15101a] border border-red-900/40 p-3.5 rounded">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>HIGH SCORE</span>
            </div>
            <div className="text-2xl font-black text-amber-400 tabular-nums mt-0.5">
              {highScore.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#15101a] border border-red-900/40 p-3.5 rounded">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-cyan-400" />
              <span>WAVE REACHED</span>
            </div>
            <div className="text-2xl font-black text-cyan-400 tabular-nums mt-0.5">
              {stats.wave}
            </div>
          </div>

          <div className="bg-[#15101a] border border-red-900/40 p-3.5 rounded">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Skull className="w-3 h-3 text-red-400" />
              <span>ENEMIES PURGED</span>
            </div>
            <div className="text-2xl font-black text-red-400 tabular-nums mt-0.5">
              {stats.kills}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={onRestart}
            className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-extrabold rounded tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(255,0,68,0.4)]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RE-DEPLOY OPERATOR [SPACE]</span>
          </button>

          <button
            onClick={onReturnTitle}
            className="cursor-pointer flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 font-semibold rounded tracking-wider uppercase text-xs transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>RETURN TO TITLE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
