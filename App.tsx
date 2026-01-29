import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, RaceSettings, RaceStatus, AppMode, TournamentMatch, TournamentPlayer } from './types';
import { RaceTrack } from './components/RaceTrack';
import { SetupForm } from './components/SetupForm';
import { TournamentSetup } from './components/TournamentSetup';
import { TournamentBracket } from './components/TournamentBracket';
import { generateBracket, updateBracketWinner } from './utils/bracketLogic';
import { generateRaceCommentary } from './services/geminiService';
import { Trophy, RotateCcw, MessageSquareQuote, LayoutGrid, Users, ArrowLeft, Home, AlertTriangle, RefreshCw, Ban, Zap, Swords } from 'lucide-react';

const DEFAULT_SETTINGS: RaceSettings = {
  targetDistance: 250,
  difficulty: 0.8,
};

const INITIAL_PLAYER_STATE = (id: 1 | 2, name: string, keys: string[], color: string): Player => ({
  id,
  name,
  keys,
  color,
  distance: 0,
  speed: 0,
  finished: false,
  finishTime: null,
  strokes: 0,
  warnings: 0,
});

type SetupMode = 'MENU' | 'QUICK' | 'TOURNAMENT';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>(AppMode.SETUP);
  const [setupMode, setSetupMode] = useState<SetupMode>('MENU');
  
  const [status, setStatus] = useState<RaceStatus>(RaceStatus.IDLE);
  const [settings, setSettings] = useState<RaceSettings>(DEFAULT_SETTINGS);
  
  // Game State
  const [p1, setP1] = useState<Player>(INITIAL_PLAYER_STATE(1, 'Player 1', ['a', 'z'], 'cyan'));
  const [p2, setP2] = useState<Player>(INITIAL_PLAYER_STATE(2, 'Player 2', ['k', 'm'], 'fuchsia'));
  
  // Tournament State
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayer[]>([]);
  // Split matches state
  const [matchesMen, setMatchesMen] = useState<TournamentMatch[]>([]);
  const [matchesWomen, setMatchesWomen] = useState<TournamentMatch[]>([]);
  
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const [countdown, setCountdown] = useState(3);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [isGeneratingCommentary, setIsGeneratingCommentary] = useState(false);
  const [falseStartOffender, setFalseStartOffender] = useState<Player | null>(null);

  const raceStateRef = useRef({ p1, p2, status, startTime: 0 });
  
  useEffect(() => {
    raceStateRef.current = { p1, p2, status, startTime: raceStateRef.current.startTime };
  }, [p1, p2, status]);

  // --- Handlers ---

  // 1. Single Race Setup (Legacy)
  const handleStartQuickRace = (p1Name: string, p2Name: string, raceSettings: RaceSettings) => {
    setP1(INITIAL_PLAYER_STATE(1, p1Name, ['a', 'z'], 'cyan'));
    setP2(INITIAL_PLAYER_STATE(2, p2Name, ['k', 'm'], 'fuchsia'));
    setSettings(raceSettings);
    setMatchesMen([]);
    setMatchesWomen([]);
    setTournamentPlayers([]);
    startRaceSequence();
  };

  // 2. Tournament Setup / Update
  const handleStartTournament = (newPlayers: TournamentPlayer[], raceSettings: RaceSettings) => {
    
    // Check if tournament is active
    const isActive = matchesMen.length > 0 || matchesWomen.length > 0;
    
    // Correctly check for REAL finished matches (ignoring BYEs)
    // A match is real if it has P1 AND P2 AND a Winner
    const hasFinishedMatches = [...matchesMen, ...matchesWomen].some(m => m.winnerName && m.p1Name && m.p2Name);
    
    // If active, check if we should reset or just update names
    if (isActive) {
        // Condition for simple update: Same count, same IDs (just renamed)
        const currentIds = new Set(tournamentPlayers.map(p => p.id));
        const newIds = new Set(newPlayers.map(p => p.id));
        const areIdsSame = newPlayers.every(p => currentIds.has(p.id)) && tournamentPlayers.every(p => newIds.has(p.id));

        if (areIdsSame && newPlayers.length === tournamentPlayers.length) {
            // SMART UPDATE: Update names in existing bracket without resetting
            
            // 1. Create mapping OldName -> NewName
            const nameMap: Record<string, string> = {};
            tournamentPlayers.forEach(oldP => {
                const newP = newPlayers.find(np => np.id === oldP.id);
                if (newP && newP.name !== oldP.name) {
                    nameMap[oldP.name] = newP.name;
                }
            });

            // 2. Update matches
            const updateMatches = (matches: TournamentMatch[]) => matches.map(m => ({
                ...m,
                p1Name: m.p1Name ? (nameMap[m.p1Name] || m.p1Name) : null,
                p2Name: m.p2Name ? (nameMap[m.p2Name] || m.p2Name) : null,
                winnerName: m.winnerName ? (nameMap[m.winnerName] || m.winnerName) : null
            }));

            setMatchesMen(updateMatches(matchesMen));
            setMatchesWomen(updateMatches(matchesWomen));
            setTournamentPlayers(newPlayers);
            setSettings(raceSettings);
            setAppMode(AppMode.BRACKET);
            return;
        }

        // If structure changed, we PROCEED to regenerate without blocking.
        // The user clicked the "Restart/Regenerate" button explicitly.
    }

    // NEW TOURNAMENT / RESET / REGENERATE
    
    // Clear previous state to ensure clean render
    setActiveMatchId(null);
    setStatus(RaceStatus.IDLE);
    setCommentary(null);

    setTournamentPlayers(newPlayers); 

    // Generate separate brackets
    const men = newPlayers.filter(p => p.gender === 'M');
    const women = newPlayers.filter(p => p.gender === 'F');

    setMatchesMen(generateBracket(men));
    setMatchesWomen(generateBracket(women));
    
    setSettings(raceSettings);
    setAppMode(AppMode.BRACKET);
  };

  // 3. Start a specific tournament match
  const handleStartTournamentMatch = (match: TournamentMatch) => {
    if (!match.p1Name || !match.p2Name) return;
    
    setActiveMatchId(match.id);
    setP1(INITIAL_PLAYER_STATE(1, match.p1Name, ['a', 'z'], 'cyan'));
    setP2(INITIAL_PLAYER_STATE(2, match.p2Name, ['k', 'm'], 'fuchsia'));
    startRaceSequence();
  };

  const startRaceSequence = () => {
    setAppMode(AppMode.RACE);
    setStatus(RaceStatus.COUNTDOWN);
    setCommentary(null);
    setCountdown(3);
    setFalseStartOffender(null);
  };

  const restartCurrentRace = () => {
    setP1(prev => ({ ...prev, distance: 0, speed: 0, finished: false, finishTime: null, strokes: 0 }));
    setP2(prev => ({ ...prev, distance: 0, speed: 0, finished: false, finishTime: null, strokes: 0 }));
    setStatus(RaceStatus.COUNTDOWN);
    setCountdown(3);
    setFalseStartOffender(null);
    setCommentary(null);
  };

  const returnToBracket = () => {
      setAppMode(AppMode.BRACKET);
      setStatus(RaceStatus.IDLE);
      setCommentary(null);
  };

  // Countdown Logic
  useEffect(() => {
    if (status === RaceStatus.COUNTDOWN) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setStatus(RaceStatus.RACING);
        raceStateRef.current.startTime = Date.now();
      }
    }
  }, [status, countdown]);

  const handleFalseStart = (playerKey: 'p1' | 'p2') => {
      const player = raceStateRef.current[playerKey];
      const newWarnings = player.warnings + 1;
      
      const offender = { ...player, warnings: newWarnings };
      setFalseStartOffender(offender);

      if (playerKey === 'p1') setP1(offender);
      else setP2(offender);

      if (newWarnings >= 3) {
          setStatus(RaceStatus.FINISHED);
          const otherPlayerKey = playerKey === 'p1' ? 'p2' : 'p1';
          
          if (playerKey === 'p1') {
              setP1(p => ({...p, finished: true, finishTime: 999999}));
              setP2(p => ({...p, finished: true, finishTime: 0.1}));
          } else {
              setP2(p => ({...p, finished: true, finishTime: 999999})); 
              setP1(p => ({...p, finished: true, finishTime: 0.1})); 
          }
          setTimeout(() => handleRaceFinished(true), 100);
      } else {
          setStatus(RaceStatus.FALSE_START);
      }
  };

  // Key Press Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const currentState = raceStateRef.current;

      // 1. False Start Detection
      if (currentState.status === RaceStatus.COUNTDOWN) {
           if (currentState.p1.keys.includes(key)) {
               handleFalseStart('p1');
               return;
           }
           if (currentState.p2.keys.includes(key)) {
               handleFalseStart('p2');
               return;
           }
      }

      // 2. Racing Logic
      if (currentState.status !== RaceStatus.RACING) return;

      const now = Date.now();
      const raceDuration = (now - currentState.startTime) / 1000;

      // Update Player 1
      if (currentState.p1.keys.includes(key) && !currentState.p1.finished) {
        setP1(prev => {
          const newDistance = prev.distance + settings.difficulty;
          const isFinished = newDistance >= settings.targetDistance;
          return {
            ...prev,
            distance: isFinished ? settings.targetDistance : newDistance,
            strokes: prev.strokes + 1,
            finished: isFinished,
            finishTime: isFinished ? raceDuration : null,
            speed: Math.min(prev.speed + 5, 60) 
          };
        });
      }

      // Update Player 2
      if (currentState.p2.keys.includes(key) && !currentState.p2.finished) {
        setP2(prev => {
          const newDistance = prev.distance + settings.difficulty;
          const isFinished = newDistance >= settings.targetDistance;
          return {
            ...prev,
            distance: isFinished ? settings.targetDistance : newDistance,
            strokes: prev.strokes + 1,
            finished: isFinished,
            finishTime: isFinished ? raceDuration : null,
            speed: Math.min(prev.speed + 5, 60)
          };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings]);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      if (raceStateRef.current.status === RaceStatus.RACING) {
        setP1(prev => ({ ...prev, speed: Math.max(prev.speed * 0.95, 0) }));
        setP2(prev => ({ ...prev, speed: Math.max(prev.speed * 0.95, 0) }));

        if (raceStateRef.current.p1.finished && raceStateRef.current.p2.finished) {
          handleRaceFinished();
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    if (status === RaceStatus.RACING) {
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationFrameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); 

  const handleRaceFinished = (isDisqualification = false) => {
      setStatus(RaceStatus.FINISHED);
      
      const p1Won = raceStateRef.current.p1.finishTime! < raceStateRef.current.p2.finishTime!;
      const winnerName = p1Won ? raceStateRef.current.p1.name : raceStateRef.current.p2.name;

      if ((matchesMen.length > 0 || matchesWomen.length > 0) && activeMatchId) {
          // Check which bracket contains this match
          const inMen = matchesMen.some(m => m.id === activeMatchId);
          
          if (inMen) {
             setMatchesMen(prev => updateBracketWinner(prev, activeMatchId, winnerName));
          } else {
             setMatchesWomen(prev => updateBracketWinner(prev, activeMatchId, winnerName));
          }
      }

      triggerCommentary(isDisqualification);
  };

  const triggerCommentary = useCallback(async (isDQ = false) => {
    setIsGeneratingCommentary(true);
    let context = isDQ ? "DYSKWALIFIKACJA (FALSTART)" : "Szybki Wyścig";
    
    // Find context from either bracket
    const allMatches = [...matchesMen, ...matchesWomen];
    if (allMatches.length > 0 && activeMatchId) {
        const match = allMatches.find(m => m.id === activeMatchId);
        if (match) context = `${match.roundName} ${isDQ ? '- DYSKWALIFIKACJA' : ''}`;
    }

    setTimeout(async () => {
        const text = await generateRaceCommentary(raceStateRef.current.p1, raceStateRef.current.p2, settings, context);
        setCommentary(text);
        setIsGeneratingCommentary(false);
    }, 500);
  }, [settings, matchesMen, matchesWomen, activeMatchId]);

  const resetToSetup = () => {
    setAppMode(AppMode.SETUP);
    setSetupMode('MENU');
    setStatus(RaceStatus.IDLE);
    setMatchesMen([]);
    setMatchesWomen([]);
    setTournamentPlayers([]);
    setActiveMatchId(null);
  };

  const handleBack = () => {
      if (appMode === AppMode.RACE) {
          if (matchesMen.length > 0 || matchesWomen.length > 0) {
              returnToBracket();
          } else {
              resetToSetup();
          }
      } else if (appMode === AppMode.BRACKET) {
         goBackToTournamentSetup();
      } else if (appMode === AppMode.SETUP && setupMode !== 'MENU') {
          setSetupMode('MENU');
      }
  };

  const goBackToTournamentSetup = () => {
      setAppMode(AppMode.SETUP);
      setSetupMode('TOURNAMENT');
  }

  // Determine if we should show header buttons
  const showNavButtons = appMode !== AppMode.SETUP || (appMode === AppMode.SETUP && setupMode !== 'MENU');

  // Logic: A match is only considered "finished" if it was a real match (p1 vs p2), not a BYE.
  const hasFinishedMatches = [...matchesMen, ...matchesWomen].some(m => m.winnerName && m.p1Name && m.p2Name);
  const hasActiveTournament = matchesMen.length > 0 || matchesWomen.length > 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 bg-[url('https://picsum.photos/1920/1080?blur=10')] bg-cover bg-center bg-no-repeat bg-blend-multiply overflow-y-auto overflow-x-hidden">
      
      {/* Header */}
      <header className="fixed top-0 left-0 w-full flex justify-between px-8 py-4 items-center z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div>
            <h1 className="text-3xl md:text-5xl font-display font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 drop-shadow-sm cursor-pointer" onClick={resetToSetup}>
            GOLD SPRINT PRO
            </h1>
            <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Roller Racing Simulator</p>
        </div>
        
        {/* Navigation Buttons */}
        {showNavButtons && (
            <div className="flex gap-2">
                 <button onClick={handleBack} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-600 transition-colors shadow-lg">
                    <ArrowLeft size={16} /> Wróć
                 </button>
                 
                 <button onClick={() => {
                     if (window.confirm("Zakończyć rozgrywkę i wrócić do ekranu startowego?")) {
                         resetToSetup();
                     }
                 }} className="bg-slate-800 hover:bg-red-900/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-600 transition-colors shadow-lg">
                    <Home size={16} /> Menu
                 </button>
            </div>
        )}
      </header>

      <main className="w-full max-w-6xl z-10 mt-24 pb-12 pt-8">
        
        {/* MODE: SETUP - MENU SELECTION */}
        {appMode === AppMode.SETUP && setupMode === 'MENU' && (
             <div className="flex flex-col items-center animate-fade-in-up">
                 <h2 className="text-4xl font-display font-bold text-white mb-12 text-center">Wybierz Tryb Gry</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                     
                     {/* Quick Race Card */}
                     <button 
                        onClick={() => setSetupMode('QUICK')}
                        className="group bg-slate-800/80 hover:bg-slate-700/90 border-2 border-slate-700 hover:border-yellow-400 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 flex flex-col items-center text-center shadow-2xl backdrop-blur-sm"
                     >
                        <div className="bg-yellow-500/20 p-6 rounded-full mb-6 group-hover:bg-yellow-500/30 transition-colors">
                            <Zap size={64} className="text-yellow-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">Szybki Wyścig</h3>
                        <p className="text-slate-400">Pojedynczy pojedynek 1 na 1. Idealny do treningów i szybkich sparingów.</p>
                     </button>

                     {/* Tournament Card */}
                     <button 
                        onClick={() => setSetupMode('TOURNAMENT')}
                        className="group bg-slate-800/80 hover:bg-slate-700/90 border-2 border-slate-700 hover:border-cyan-400 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 flex flex-col items-center text-center shadow-2xl backdrop-blur-sm"
                     >
                        <div className="bg-cyan-500/20 p-6 rounded-full mb-6 group-hover:bg-cyan-500/30 transition-colors">
                            <Swords size={64} className="text-cyan-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">Turniej Pucharowy</h3>
                        <p className="text-slate-400">Stwórz drabinkę pucharową dla wielu graczy. System KO (przegrany odpada).</p>
                     </button>
                 </div>
             </div>
        )}

        {/* MODE: SETUP - FORMS */}
        {appMode === AppMode.SETUP && setupMode === 'QUICK' && (
             <div className="animate-fade-in-up">
                <SetupForm onStart={handleStartQuickRace} />
             </div>
        )}

        {appMode === AppMode.SETUP && setupMode === 'TOURNAMENT' && (
             <div className="animate-fade-in-up">
                <TournamentSetup 
                    initialPlayers={tournamentPlayers} 
                    hasActiveTournament={hasActiveTournament}
                    hasFinishedMatches={hasFinishedMatches}
                    onStartTournament={handleStartTournament} 
                    onReturnToBracket={() => setAppMode(AppMode.BRACKET)}
                />
             </div>
        )}


        {/* MODE: BRACKET */}
        {appMode === AppMode.BRACKET && (
            <div className="animate-fade-in-up">
                <TournamentBracket 
                    matchesMen={matchesMen}
                    matchesWomen={matchesWomen}
                    onStartMatch={handleStartTournamentMatch} 
                    onEditPlayers={goBackToTournamentSetup}
                />
            </div>
        )}

        {/* MODE: RACE */}
        {appMode === AppMode.RACE && (
          <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-xl animate-fade-in-up relative">
            
            {/* Header info about match */}
            <div className="flex justify-between items-start mb-6">
                <div className="w-1/3">
                    {activeMatchId && (
                        <span className="bg-slate-800 text-cyan-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-slate-700">
                            {([...matchesMen, ...matchesWomen]).find(m => m.id === activeMatchId)?.roundName}
                        </span>
                    )}
                </div>
                
                {/* In-Game Restart Button */}
                {(status === RaceStatus.RACING || status === RaceStatus.COUNTDOWN) && (
                    <button 
                        onClick={() => {
                            if(window.confirm("Zrestartować wyścig?")) restartCurrentRace();
                        }}
                        className="bg-slate-700/50 hover:bg-slate-600 text-white p-2 rounded-lg flex items-center gap-2 text-xs border border-slate-600 transition-colors z-50 pointer-events-auto"
                    >
                        <RefreshCw size={14} /> Restart Wyścigu
                    </button>
                )}
                <div className="w-1/3"></div>
            </div>

            {/* Status Overlays */}
            {status === RaceStatus.COUNTDOWN && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 rounded-3xl backdrop-blur-sm pointer-events-none">
                <div className="text-9xl font-black text-white animate-bounce">
                  {countdown === 0 ? 'GO!' : countdown}
                </div>
              </div>
            )}

            {status === RaceStatus.FALSE_START && falseStartOffender && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/90 rounded-3xl backdrop-blur-md">
                 <div className="text-center p-8 bg-black/40 rounded-2xl border-2 border-red-500 animate-pulse">
                    <div className="flex justify-center mb-4 text-red-500">
                        <AlertTriangle size={80} />
                    </div>
                    <h2 className="text-6xl font-black text-white mb-2 tracking-tighter">FALSTART!</h2>
                    <p className="text-2xl text-red-300 font-bold mb-6">
                        {falseStartOffender.name} ruszył/a za wcześnie.
                    </p>
                    <div className="text-xl text-white mb-8 border border-red-500/50 bg-red-900/50 p-4 rounded-lg inline-block">
                        Ostrzeżenie: <span className="font-bold text-red-400 text-3xl">{falseStartOffender.warnings}</span> / 3
                    </div>
                    <div>
                        <button 
                            onClick={restartCurrentRace}
                            className="bg-white text-red-900 hover:bg-gray-200 px-8 py-3 rounded-full font-bold text-xl uppercase tracking-widest shadow-lg transition-transform hover:scale-105"
                        >
                            Restart
                        </button>
                    </div>
                 </div>
              </div>
            )}

            <div className="space-y-12">
              <RaceTrack player={p1} settings={settings} />
              <div className="h-px bg-slate-700 w-full" />
              <RaceTrack player={p2} settings={settings} />
            </div>

            {/* Results & Commentary */}
            {status === RaceStatus.FINISHED && (
              <div className="mt-12 animate-fade-in-up">
                
                {/* Disqualification Badge */}
                {(p1.warnings >= 3 || p2.warnings >= 3) && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-xl text-center mb-6 flex items-center justify-center gap-3">
                        <Ban size={24} />
                        <span className="font-bold text-lg">Zwycięstwo przez dyskwalifikację (3 falstarty)</span>
                    </div>
                )}

                <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900/50 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Trophy size={120} />
                   </div>
                   
                   <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                     <MessageSquareQuote className="text-indigo-400" /> Komentarz Sportowy AI
                   </h3>
                   
                   {isGeneratingCommentary ? (
                     <div className="flex items-center gap-3 text-indigo-300">
                       <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                       Gemini analizuje przebieg wyścigu...
                     </div>
                   ) : (
                     <p className="text-lg text-indigo-100 italic font-medium leading-relaxed">
                       "{commentary}"
                     </p>
                   )}
                </div>

                <div className="mt-8 flex justify-center gap-4">
                  {matchesMen.length > 0 || matchesWomen.length > 0 ? (
                      <button 
                        onClick={returnToBracket}
                        className="flex items-center gap-2 bg-yellow-500 text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-yellow-400 transition-colors shadow-lg transform hover:scale-105"
                      >
                        <LayoutGrid size={20} /> Wróć do Drabinki
                      </button>
                  ) : (
                      <button 
                        onClick={() => restartCurrentRace()} // In quick race, this acts as a new race reset
                        className="flex items-center gap-2 bg-white text-slate-900 px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors shadow-lg"
                      >
                        <RotateCcw size={20} /> Nowy Wyścig
                      </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-4 text-center text-slate-500 text-xs pointer-events-none">
        <p>Wymaga klawiatury fizycznej. Player 1: uderzaj szybko A/Z. Player 2: uderzaj szybko K/M.</p>
        <p className="mt-1">Powered by Google Gemini API</p>
      </footer>
    </div>
  );
}