import React, { useState, useMemo, useEffect } from 'react';
import { TournamentMatch } from '../types';
import { Trophy, Play, CheckCircle2, Users, Lock, User, HelpCircle } from 'lucide-react';

interface TournamentBracketProps {
  matchesMen: TournamentMatch[];
  matchesWomen: TournamentMatch[];
  onStartMatch: (match: TournamentMatch) => void;
  onEditPlayers: () => void;
}

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ matchesMen, matchesWomen, onStartMatch, onEditPlayers }) => {
  const [activeTab, setActiveTab] = useState<'M' | 'F'>('M');

  // Auto-select tab on mount based on content
  useEffect(() => {
    if (matchesMen.length === 0 && matchesWomen.length > 0) {
        setActiveTab('F');
    }
  }, [matchesMen.length, matchesWomen.length]);

  const activeMatches = activeTab === 'M' ? matchesMen : matchesWomen;

  // 1. Group matches by round
  const rounds = useMemo(() => {
      return activeMatches.reduce((acc, match) => {
        if (!acc[match.roundIndex]) acc[match.roundIndex] = [];
        acc[match.roundIndex].push(match);
        return acc;
      }, {} as Record<number, TournamentMatch[]>);
  }, [activeMatches]);

  const roundIndices = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  
  // 2. Determine Active Round
  const activeRoundIndex = roundIndices.find(idx => 
    rounds[idx].some(m => !m.winnerName)
  );

  // Find the ultimate winner
  const finalMatch = activeMatches.find(m => !m.nextMatchId);
  const tournamentWinner = finalMatch?.winnerName;

  return (
    <div className="w-full h-full flex flex-col relative">
        {/* Top Controls & Tabs */}
        <div className="absolute top-0 w-full z-20 flex flex-col items-center">
             
             {/* Main Tabs */}
             <div className="flex gap-4 mb-4 bg-slate-900/50 p-2 rounded-xl backdrop-blur-sm border border-slate-700 mt-4">
                 {matchesMen.length > 0 && (
                     <button
                        onClick={() => setActiveTab('M')}
                        className={`px-6 py-2 rounded-lg font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                            activeTab === 'M' 
                            ? 'bg-cyan-600 text-white shadow-lg scale-105' 
                            : 'bg-transparent text-slate-500 hover:text-cyan-400'
                        }`}
                     >
                        <User size={18} /> Mężczyźni
                     </button>
                 )}
                 {matchesWomen.length > 0 && (
                     <button
                        onClick={() => setActiveTab('F')}
                        className={`px-6 py-2 rounded-lg font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                            activeTab === 'F' 
                            ? 'bg-fuchsia-600 text-white shadow-lg scale-105' 
                            : 'bg-transparent text-slate-500 hover:text-fuchsia-400'
                        }`}
                     >
                        <User size={18} /> Kobiety
                     </button>
                 )}
             </div>
        </div>

        <div className="absolute top-4 right-4 z-30">
             <button 
                onClick={onEditPlayers}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-600 transition-colors shadow-lg backdrop-blur-sm"
             >
                <Users size={16} /> Edytuj
             </button>
        </div>

        {/* Winner Announcement */}
        {tournamentWinner && (
            <div className="absolute top-24 left-0 w-full z-10 flex justify-center pointer-events-none">
                <div className={`
                    backdrop-blur-md px-8 py-4 rounded-xl border-2 animate-bounce shadow-2xl
                    ${activeTab === 'M' ? 'bg-cyan-900/80 border-cyan-500' : 'bg-fuchsia-900/80 border-fuchsia-500'}
                `}>
                    <h2 className="text-3xl font-display font-bold text-white flex justify-center items-center gap-3">
                        <Trophy size={32} className="text-yellow-400" /> 
                        MISTRZ: {tournamentWinner} 
                        <Trophy size={32} className="text-yellow-400" />
                    </h2>
                </div>
            </div>
        )}

      {/* Bracket Container */}
      <div className="flex-1 h-[70vh] mt-24 flex items-center justify-center gap-8 px-4 overflow-x-auto">
        {activeMatches.length === 0 ? (
            <div className="text-center text-slate-500">
                <p>Brak zawodników w tej kategorii.</p>
            </div>
        ) : (
            roundIndices.map((roundIdx) => {
            const isRoundActive = roundIdx === activeRoundIndex;
            const isRoundFuture = activeRoundIndex !== undefined && roundIdx > activeRoundIndex;

            return (
            <div key={roundIdx} className="flex flex-col justify-around h-full relative min-w-[240px] max-w-[280px]">
                {/* Round Header */}
                <div className={`text-center font-bold uppercase tracking-widest text-sm mb-4 py-1 rounded-full border 
                    ${isRoundActive 
                        ? (activeTab === 'M' ? 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10' : 'text-fuchsia-400 border-fuchsia-500/50 bg-fuchsia-500/10')
                        : 'text-slate-500 border-transparent'}
                `}>
                    {rounds[roundIdx][0].roundName}
                </div>
                
                {/* Matches Column */}
                <div className="flex flex-col justify-around h-full w-full">
                    {rounds[roundIdx].map((match) => {
                        // Logic states
                        const hasWinner = !!match.winnerName;
                        const isReadyToPlay = match.p1Name && match.p2Name && !hasWinner;
                        
                        // Check if it's a ghost slot (no players yet)
                        const isGhost = !match.p1Name && !match.p2Name; 
                        
                        // Interaction allowed only if it's the active round
                        const isInteractable = isReadyToPlay && isRoundActive;
                        
                        // Locked state
                        const isLocked = isRoundFuture || (isRoundActive && !isReadyToPlay && !hasWinner);

                        // REMOVED: The logic that hid empty matches. 
                        // Now we always render the box, so "???" appears for future rounds.

                        return (
                        <div 
                            key={match.id} 
                            className={`
                                relative w-full bg-slate-800 border-2 rounded-lg overflow-hidden transition-all duration-300 mx-auto my-2
                                ${isInteractable 
                                    ? (activeTab === 'M' ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-fuchsia-400 shadow-[0_0_15px_rgba(232,121,249,0.2)]') + ' scale-105 z-10' 
                                    : 'border-slate-700'}
                                ${hasWinner ? 'opacity-50 grayscale-[0.5]' : ''}
                                ${isLocked ? 'opacity-30' : 'opacity-100'}
                                ${isGhost ? 'opacity-40 border-dashed border-slate-600' : ''}
                            `}
                        >
                            {/* P1 */}
                            <div className={`px-3 py-2 flex justify-between items-center text-sm ${match.winnerName === match.p1Name && match.winnerName ? 'bg-green-900/40 text-green-400' : ''}`}>
                                <span className={`font-bold truncate ${!match.p1Name ? 'text-slate-500 italic text-xs' : ''}`}>
                                    {match.p1Name || '???'}
                                </span>
                                {match.winnerName === match.p1Name && match.winnerName && <CheckCircle2 size={14} />}
                            </div>
                            
                            <div className="h-px bg-slate-700 w-full" />

                            {/* P2 */}
                            <div className={`px-3 py-2 flex justify-between items-center text-sm ${match.winnerName === match.p2Name && match.winnerName ? 'bg-green-900/40 text-green-400' : ''}`}>
                                <span className={`font-bold truncate ${!match.p2Name ? 'text-slate-500 italic text-xs' : ''}`}>
                                    {match.p2Name || '???'}
                                </span>
                                {match.winnerName === match.p2Name && match.winnerName && <CheckCircle2 size={14} />}
                            </div>

                            {/* Play Overlay */}
                            {isInteractable && (
                                <button 
                                    onClick={() => onStartMatch(match)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-[1px] group"
                                >
                                    <div className={`text-slate-900 px-4 py-2 rounded-full font-bold flex items-center gap-2 transform group-hover:scale-110 transition-transform shadow-xl
                                        ${activeTab === 'M' ? 'bg-cyan-500' : 'bg-fuchsia-500'}
                                    `}>
                                        <Play size={16} fill="currentColor" /> START
                                    </div>
                                </button>
                            )}
                            
                            {/* Locked Overlay */}
                            {isLocked && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                                    {isRoundActive && !isGhost ? (
                                        <div className="flex flex-col items-center">
                                            <HelpCircle size={24} className="text-slate-500 mb-1" />
                                            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Oczekiwanie</span>
                                        </div>
                                    ) : (
                                        <Lock size={24} className="text-slate-500" />
                                    )}
                                </div>
                            )}

                            {/* BYE Badge */}
                            {hasWinner && (!match.p1Name || !match.p2Name) && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="bg-slate-700/90 text-[10px] px-2 py-0.5 rounded text-slate-400 border border-slate-600 uppercase tracking-wider">Wolny Los</span>
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            </div>
            )
        })}
        )}
      </div>
    </div>
  );
};
