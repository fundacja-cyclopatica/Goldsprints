import React, { useState } from 'react';
import { Player, RaceSettings } from '../types';
import { Settings, Users, Play, Wand2 } from 'lucide-react';
import { generateSetupQuestions } from '../services/geminiService';

interface SetupFormProps {
  onStart: (p1Name: string, p2Name: string, settings: RaceSettings) => void;
}

export const SetupForm: React.FC<SetupFormProps> = ({ onStart }) => {
  const [p1Name, setP1Name] = useState('Zawodnik 1');
  const [p2Name, setP2Name] = useState('Zawodnik 2');
  const [distance, setDistance] = useState(250);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(p1Name, p2Name, { targetDistance: distance, difficulty: 0.8 });
  };

  const askAiForHelp = async () => {
      setLoadingAi(true);
      const questions = await generateSetupQuestions();
      setAiQuestions(questions);
      setLoadingAi(false);
  }

  return (
    <div className="max-w-2xl mx-auto bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-2xl">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-700">
        <Settings className="text-yellow-400" size={32} />
        <h2 className="text-3xl font-display font-bold text-white">Konfiguracja Wyścigu</h2>
      </div>

      <form onSubmit={handleStart} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Player 1 */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-sm">
              <Users size={16} /> Lewy Tor (Klawisze A / Z)
            </label>
            <input
              type="text"
              value={p1Name}
              onChange={(e) => setP1Name(e.target.value)}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
              placeholder="Imię Zawodnika 1"
            />
          </div>

          {/* Player 2 */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-fuchsia-400 font-bold uppercase tracking-wider text-sm">
              <Users size={16} /> Prawy Tor (Klawisze K / M)
            </label>
            <input
              type="text"
              value={p2Name}
              onChange={(e) => setP2Name(e.target.value)}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-3 text-white focus:border-fuchsia-500 focus:outline-none transition-colors"
              placeholder="Imię Zawodnika 2"
            />
          </div>
        </div>

        {/* Distance Slider */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
             <label className="font-bold text-gray-300">Dystans Wyścigu</label>
             <span className="text-2xl font-mono text-yellow-400">{distance}m</span>
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
          <div className="flex justify-between text-xs text-gray-500 font-mono">
            <span>Sprint (100m)</span>
            <span>Standard (500m)</span>
            <span>Wytrzymałość (1000m)</span>
          </div>
        </div>
        
        {/* AI Consultant Section */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
             <div className="flex items-center justify-between mb-2">
                 <h3 className="text-sm font-bold text-gray-400 uppercase">Asystent Organizatora (Gemini AI)</h3>
                 <button 
                    type="button" 
                    onClick={askAiForHelp}
                    disabled={loadingAi}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded flex items-center gap-2 transition-colors disabled:opacity-50"
                 >
                    <Wand2 size={12} />
                    {loadingAi ? "Analizowanie..." : "Zadaj mi pytania"}
                 </button>
             </div>
             {aiQuestions.length > 0 ? (
                 <ul className="list-disc list-inside space-y-1 text-sm text-indigo-300">
                     {aiQuestions.map((q, i) => <li key={i}>{q}</li>)}
                 </ul>
             ) : (
                 <p className="text-xs text-gray-500 italic">Kliknij przycisk, aby AI pomogło Ci dobrać parametry wyścigu zadając odpowiednie pytania.</p>
             )}
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-slate-900 font-bold py-4 rounded-xl text-xl uppercase tracking-widest transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3"
        >
          <Play size={24} fill="currentColor" /> Rozpocznij Wyścig
        </button>
      </form>
    </div>
  );
};
