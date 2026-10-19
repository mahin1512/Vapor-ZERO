/**
 * Atmospheric Title Screen for VAPOR // ZERO.
 * Live 3D world orbit backdrop, bespoke inline SVG title lockup over negative space,
 * primary Enter/Space CTA, and flat control-hint line.
 */

import React, { useEffect } from 'react';
import { Volume2, VolumeX, Shield, Crosshair, Zap, Play } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  isMuted,
  onToggleMute,
}) => {
  // Listen for Enter or Space to immediately start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="absolute inset-0 select-none overflow-hidden font-mono flex flex-col justify-between p-8 md:p-14 z-20 pointer-events-none">
      {/* Top Bar with Audio & Build Badge */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#080d16]/80 border border-cyan-500/30 rounded text-xs text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="tracking-widest font-bold">CYBER ENGINE // R160</span>
        </div>

        <button
          onClick={onToggleMute}
          className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-[#080d16]/80 border border-cyan-500/30 hover:border-cyan-400 rounded text-xs text-cyan-300 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          <span className="tracking-wider">{isMuted ? 'AUDIO MUTED' : 'SYNTH AUDIO ON'}</span>
        </button>
      </div>

      {/* Main Center Title Lockup (30-40% Negative Space) */}
      <div className="flex flex-col items-center justify-center my-auto text-center pointer-events-auto max-w-3xl mx-auto">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="relative mb-6">
          <svg
            className="w-full max-w-[540px] h-auto drop-shadow-[0_0_24px_rgba(0,240,255,0.4)]"
            viewBox="0 0 540 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background cyber grid accents */}
            <path
              d="M10 60 L60 10 L480 10 L530 60 L480 110 L60 110 Z"
              stroke="rgba(0, 240, 255, 0.25)"
              strokeWidth="1.5"
              fill="rgba(8, 13, 22, 0.65)"
            />
            {/* Tech bracket accents */}
            <path d="M40 25 L20 45 L20 75 L40 95" stroke="#00f0ff" strokeWidth="2.5" />
            <path d="M500 25 L520 45 L520 75 L500 95" stroke="#00f0ff" strokeWidth="2.5" />

            {/* Glowing Text Lockup */}
            <text
              x="270"
              y="68"
              textAnchor="middle"
              className="font-black text-5xl tracking-widest fill-white"
              style={{
                fontFamily: 'monospace',
                letterSpacing: '0.18em',
              }}
            >
              VAPOR // ZERO
            </text>
            <text
              x="270"
              y="94"
              textAnchor="middle"
              className="text-xs font-bold tracking-[0.45em] fill-cyan-400 uppercase"
              style={{ fontFamily: 'monospace' }}
            >
              FPV CYBER ARENA SHOOTER
            </text>
          </svg>
        </div>

        <p className="text-zinc-400 text-sm md:text-base max-w-lg mb-8 leading-relaxed">
          Survive waves of relentless drone swarms, heavy walkers, and titans in a procedural cyber matrix.
          Master fluid momentum, jump-pad aerials, and 3 distinct energy armaments.
        </p>

        {/* Start Game Primary CTA */}
        <button
          onClick={onStart}
          className="group cursor-pointer pointer-events-auto relative px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-extrabold text-base tracking-widest uppercase rounded shadow-[0_0_24px_rgba(0,240,255,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
        >
          <Play className="w-5 h-5 fill-black" />
          <span>INITIALIZE RUN</span>
          <span className="text-[11px] bg-black/20 text-black font-mono px-2 py-0.5 rounded font-bold ml-1">
            ENTER / SPACE
          </span>
        </button>
      </div>

      {/* Bottom Flat Control-Hint Line */}
      <div className="flex flex-col items-center gap-2 text-center pointer-events-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400 bg-[#080d16]/85 border border-zinc-800 px-6 py-2 rounded-full shadow-lg">
          <span className="text-zinc-200">
            <strong className="text-cyan-400 font-bold">WASD</strong> Move
          </span>
          <span>·</span>
          <span className="text-zinc-200">
            <strong className="text-cyan-400 font-bold">Space</strong> Jump
          </span>
          <span>·</span>
          <span className="text-zinc-200">
            <strong className="text-cyan-400 font-bold">Shift</strong> Dash
          </span>
          <span>·</span>
          <span className="text-zinc-200">
            <strong className="text-cyan-400 font-bold">L-Click</strong> Shoot
          </span>
          <span>·</span>
          <span className="text-zinc-200">
            <strong className="text-cyan-400 font-bold">1-3 / Wheel</strong> Switch Gun
          </span>
          <span>·</span>
          <span className="text-zinc-200">
            <strong className="text-cyan-400 font-bold">R</strong> Reload
          </span>
          <span>·</span>
          <span className="text-zinc-200">
            <strong className="text-cyan-400 font-bold">Esc</strong> Pause
          </span>
        </div>
      </div>
    </div>
  );
};
