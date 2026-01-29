import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Trophy, Play, Save, Edit2, User, ArrowLeft, RefreshCw, Wand2 } from 'lucide-react';
import { RaceSettings, TournamentPlayer } from '../types';

interface TournamentSetupProps {
  initialPlayers?: TournamentPlayer[];
  hasActiveTournament: boolean;
  hasFinishedMatches: boolean;
  onStartTournament: (players: TournamentPlayer[], settings: RaceSettings) => void;
  onReturnToBracket: () => void;
}

export const TournamentSetup: React.FC<TournamentSetupProps> = ({ 
    initialPlayers = [], 
    hasActiveTournament, 
    hasFinishedMatches,
    onStartTournament,
    onReturnToBracket 
}) => {
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'M' | 'F'>('M');
  
  const [players, setPlayers] = useState<TournamentPlayer[]>(initialPlayers);
  const [distance, setDistance] = useState(250);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Sync if initialPlayers changes (e.g. parent reset)
  useEffect(() => {
    if (initialPlayers.length > 0) {
        setPlayers(initialPlayers);
    }
  }, [initialPlayers]);

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      const newPlayer: TournamentPlayer = {
          id: Date.now().toString() + Math.random(),
          name: newName.trim(),
          gender: newGender
      };
      setPlayers([...players, newPlayer]);
      setNewName('');
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const startEditing = (player: TournamentPlayer) => {
      setEditingId(player.id);
      setEditName(player.name);
  };

  const saveEdit = (id: string) => {
      if (editName.trim()) {
          setPlayers(players.map(p => p.id === id ? { ...p, name: editName.trim() } : p));
          setEditingId(null);
          setEditName('');
      }
  };

  const handleStart = () => {
    if (players.length < 2) return;
    onStartTournament(players, { targetDistance: distance, difficulty: 0.8 });
  };

  // Determine button state
  const isStructureChanged = players.length !== initialPlayers.length;
  
  // Logic for button appearance:
  // 1. Not active? -> Generate (Yellow)
  // 2. Active but NO finished matches? -> Regenerate/Add players (Yellow) - This fixes the "Restart broken" feeling
  // 3. Active AND finished matches AND structure changed? -> Hard Restart (Red)
  // 4. Active AND finished matches AND only names changed? -> Update Names (Green)
  
  let mainButtonText = "Generuj Drabinkę";
  let mainButtonIcon = <Play size={24} fill="currentColor" />;
  let mainButtonColor = "from-yellow-500 to-yellow-600 hover:from-yellow-400";

  if (hasActiveTournament) {
      if (isStructureChanged) {
          if (hasFinishedMatches) {
              mainButtonText = "Zrestartuj Turniej (Nowa Drabinka)";
              mainButtonColor = "from-red-500 to-red-600 hover:from-red-400";
              mainButtonIcon = <RefreshCw size={24} />;
          } else {
              mainButtonText = "Generuj Nową Drabinkę"; // Safe regeneration
              mainButtonColor = "from-yellow-500 to-yellow-600 hover:from-yellow-400";
              mainButtonIcon = <RefreshCw size={24} />;
          }
      } else {
          mainButtonText = "Zaktualizuj Nazwy";
          mainButtonIcon = <Save size={24} />;
          mainButtonColor = "from-green-500 to-green-600 hover:from-green-400";
      }
  }

  return (
    <div className="max-w-5xl mx-auto bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-2xl relative">
      
      {/* Return Button for Active Tournament */}
      {hasActiveTournament && (
          <button 
            onClick={onReturnToBracket}
            className="absolute top-8 right-8 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-600 transition-colors shadow-lg"
          >
            <ArrowLeft size={16} /> Wróć do Turnieju
          </button>
      )}

      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-700">
        <Trophy className="text-yellow-400" size={32} />
        <div>
           <h2 className="text-3xl font-display font-bold text-white">Turniej Gold Sprint</h2>
           <p className="text-slate-400 text-sm">Zarejestruj zawodników. System dobierze pary wg płci.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Input & Settings (1 Col) */}
        <div className="lg:col-span-1 space-y-6">
             <form onSubmit={addPlayer} className="space-y-4 bg-slate-900 p-4 rounded-xl border border-slate-700">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nazwa Zawodnika</label>
                    <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
                    placeholder="Wpisz imię..."
                    />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Płeć</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setNewGender('M')}
                            className={`flex-1 py-2 px-4 rounded-lg flex justify-center items-center gap-2 border-2 transition-all ${newGender === 'M' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-gray-500 hover:bg-slate-700'}`}
                        >
                             <User size={18} /> Mężczyzna
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewGender('F')}
                            className={`flex-1 py-2 px-4 rounded-lg flex justify-center items-center gap-2 border-2 transition-all ${newGender === 'F' ? 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-300' : 'bg-slate-800 border-slate-700 text-gray-500 hover:bg-slate-700'}`}
                        >
                             <User size={18} /> Kobieta
                        </button>
                    </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-bold"
                >
                  <Plus size={20} /> Dodaj
                </button>
             </form>

             {/* Distance Slider */}
            <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center">
                 <label className="font-bold text-gray-300 text-sm">Dystans</label>
                 <span className="font-mono text-yellow-400">{distance}m</span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>

            <div className="text-sm text-gray-400 text-center">
                Liczba zawodników: <span className="text-white font-bold">{players.length}</span>
                {players.length > 0 && players.length < 2 && <span className="text-red-400 ml-2 block text-xs">(Minimum 2)</span>}
            </div>

            <button
                onClick={handleStart}
                disabled={players.length < 2}
                className={`w-full bg-gradient-to-r ${mainButtonColor} disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-4 rounded-xl text-xl uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3`}
            >
                {mainButtonIcon} {mainButtonText}
            </button>
        </div>

        {/* Right: List (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl p-0 border border-slate-700 h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider">Lista Startowa</h3>
                <div className="flex gap-4 text-xs font-mono">
                    <span className="text-cyan-400">M: {players.filter(p => p.gender === 'M').length}</span>
                    <span className="text-fuchsia-400">K: {players.filter(p => p.gender === 'F').length}</span>
                </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
                {players.length === 0 ? (
                    <div className="text-center text-gray-600 py-24 flex flex-col items-center">
                        <User size={48} className="mb-4 opacity-20" />
                        <span className="italic">Dodaj zawodników, aby rozpocząć</span>
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-slate-800">
                                <th className="p-3 w-16 text-center">Lp.</th>
                                <th className="p-3 w-16 text-center">Płeć</th>
                                <th className="p-3">Nazwisko / Imię</th>
                                <th className="p-3 w-24 text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {players.map((p, idx) => (
                                <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                                    <td className="p-3 text-center">
                                        {p.gender === 'M' ? 
                                            <span className="text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded text-xs font-bold">M</span> : 
                                            <span className="text-fuchsia-400 bg-fuchsia-900/30 px-2 py-1 rounded text-xs font-bold">K</span>
                                        }
                                    </td>
                                    <td className="p-3">
                                        {editingId === p.id ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text" 
                                                    value={editName}
                                                    autoFocus
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id)}
                                                    className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-white w-full focus:border-yellow-500 outline-none"
                                                />
                                            </div>
                                        ) : (
                                            <span className="font-display font-bold text-lg">{p.name}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {editingId === p.id ? (
                                                <button type="button" onClick={() => saveEdit(p.id)} className="p-2 text-green-400 hover:bg-green-900/20 rounded">
                                                    <Save size={18} />
                                                </button>
                                            ) : (
                                                <button type="button" onClick={() => startEditing(p)} className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded">
                                                    <Edit2 size={18} />
                                                </button>
                                            )}
                                            <button 
                                                type="button"
                                                onClick={() => removePlayer(p.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
