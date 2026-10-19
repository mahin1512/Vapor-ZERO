/**
 * Pause Modal for VAPOR // ZERO.
 * Zero backdrop-filter over WebGL. Solid dark cyber container with
 * resume, restart, sensitivity, and audio controls.
 */

import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnTitle,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/75 font-mono select-none">
      <div className="w-full max-w-md bg-[#0a0f18] border-2 border-cyan-500/40 rounded-lg p-6 shadow-2xl flex flex-col gap-6 text-white">
        {/* Header */}
        <div className="border-b border-cyan-500/20 pb-4 text-center">
          <div className="text-2xl font-black tracking-widest text-cyan-300">SYSTEM PAUSED</div>
          <div className="text-xs text-zinc-400 mt-1">SIMULATION SUSPENDED</div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded tracking-wider uppercase transition-colors"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>RESUME SIMULATION [ESC]</span>
          </button>

          <button
            onClick={onRestart}
            className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 font-bold rounded tracking-wider uppercase transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART WAVE 1</span>
          </button>

          <button
            onClick={onToggleMute}
            className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 font-bold rounded tracking-wider uppercase transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
          </button>

          <button
            onClick={onReturnTitle}
            className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 font-medium rounded tracking-wider uppercase transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO TITLE</span>
          </button>
        </div>

        {/* Controls Quick Recall */}
        <div className="text-[11px] text-zinc-400 bg-black/40 p-3 rounded border border-zinc-800/80 leading-relaxed text-center">
          WASD Move · Space Jump · Shift Dash · Click Shoot · 1-3 Guns · R Reload
        </div>
      </div>
    </div>
  );
};
