import React from 'react';
import { Player, RaceSettings } from '../types';
import { Bike, Flag, Zap } from 'lucide-react';

interface RaceTrackProps {
  player: Player;
  settings: RaceSettings;
}

export const RaceTrack: React.FC<RaceTrackProps> = ({ player, settings }) => {
  const progress = Math.min((player.distance / settings.targetDistance) * 100, 100);

  return (
    <div className="w-full mb-8 relative">
      <div className="flex justify-between items-end mb-2 px-2">
        <div className="flex items-center gap-2">
           <div className={`p-2 rounded-lg ${player.id === 1 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-fuchsia-500/20 text-fuchsia-400'}`}>
             <Bike size={24} />
           </div>
           <div>
            <h3 className="text-xl font-bold font-display uppercase tracking-wider">{player.name}</h3>
            <p className="text-xs text-gray-400">STEROWANIE: <span className="text-white font-mono border border-gray-600 rounded px-1">{player.keys.join(' / ')}</span></p>
           </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold">{player.distance.toFixed(0)}<span className="text-sm text-gray-500 ml-1">m</span></div>
          <div className="text-sm text-gray-400 font-mono">
            {player.speed.toFixed(1)} km/h
          </div>
        </div>
      </div>

      {/* Track Container */}
      <div className="h-16 bg-slate-800 rounded-xl relative overflow-hidden border border-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
        
        {/* Grid lines for speed perception */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: 'linear-gradient(90deg, transparent 95%, #ffffff 95%)', 
               backgroundSize: '100px 100%',
               transform: `translateX(-${player.distance % 100}px)` 
             }}>
        </div>

        {/* Progress Fill */}
        <div 
          className={`absolute top-0 left-0 h-full transition-all duration-100 ease-linear flex items-center justify-end pr-4
            ${player.id === 1 ? 'bg-gradient-to-r from-cyan-900 to-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'bg-gradient-to-r from-fuchsia-900 to-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.5)]'}
          `}
          style={{ width: `${progress}%` }}
        >
          {/* Avatar/Icon on the bar */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white drop-shadow-md">
             {progress >= 100 ? <Flag className="animate-bounce" /> : <Zap className={player.speed > 30 ? "animate-pulse" : ""} />}
          </div>
        </div>

        {/* Finish Line Indicator */}
        <div className="absolute right-0 top-0 h-full w-4 bg-yellow-400/20 flex flex-col justify-center items-center border-l-2 border-dashed border-yellow-400/50">
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="flex gap-4 mt-2">
        <div className="h-1 flex-1 bg-slate-800 rounded overflow-hidden">
            <div 
                className={`h-full transition-all duration-300 ${player.id === 1 ? 'bg-cyan-600' : 'bg-fuchsia-600'}`}
                style={{ width: `${(player.speed / 80) * 100}%` }}
            />
        </div>
      </div>
    </div>
  );
};
