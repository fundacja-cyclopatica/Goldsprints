import { TournamentMatch, TournamentPlayer } from '../types';

export const generateBracket = (players: TournamentPlayer[]): TournamentMatch[] => {
  if (players.length === 0) return [];

  // 1. Shuffle players
  const shuffled = [...players].sort(() => 0.5 - Math.random());

  // 2. Pad to power of 2
  const paddedList: (string | null)[] = shuffled.map(p => p.name);
  
  let size = 2;
  while (size < paddedList.length) {
    size *= 2;
  }

  while (paddedList.length < size) {
    paddedList.push(null); // BYE
  }

  const matches: TournamentMatch[] = [];
  const totalRounds = Math.log2(size);

  // Helper to get round name
  const getRoundName = (rIndex: number, total: number) => {
    if (rIndex === total - 1) return "Finał";
    if (rIndex === total - 2) return "Półfinał";
    if (rIndex === total - 3) return "Ćwierćfinał";
    return `Runda ${rIndex + 1}`;
  };

  // 3. Generate layers
  let currentRoundPlayers = paddedList.map(p => ({ name: p }));
  
  for (let round = 0; round < totalRounds; round++) {
    const matchesInRound = size / Math.pow(2, round + 1);

    for (let i = 0; i < matchesInRound; i++) {
      // CRITICAL CHANGE: Only assign names in the first round (Round 0).
      // Future rounds start empty and are filled by winners.
      const p1 = round === 0 ? currentRoundPlayers[i * 2] : null;
      const p2 = round === 0 ? currentRoundPlayers[i * 2 + 1] : null;

      const matchId = `${Date.now()}-${round}-${i}-${Math.random().toString(36).substr(2, 5)}`;
      
      const isFinal = round === totalRounds - 1;
      
      // Calculate next match index relation
      const playerIndexInNextMatch = isFinal ? null : (i % 2 === 0 ? 0 : 1); // 0 is top/P1, 1 is bottom/P2

      const match: TournamentMatch = {
        id: matchId,
        roundIndex: round,
        roundName: getRoundName(round, totalRounds),
        p1Name: p1 ? p1.name : null,
        p2Name: p2 ? p2.name : null,
        winnerName: null,
        nextMatchId: null, // Will link in second pass
        playerIndexInNextMatch: playerIndexInNextMatch as 0 | 1 | null
      };

      // Auto-advance BYEs (Only applies to Round 0 initially since subsequent rounds have null names)
      if (round === 0) {
          if (match.p1Name && !match.p2Name) match.winnerName = match.p1Name;
          if (!match.p1Name && match.p2Name) match.winnerName = match.p2Name;
      }

      matches.push(match);
    }
  }

  // 4. Link matches (Second Pass)
  const matchesByRound: TournamentMatch[][] = [];
  for(let r=0; r<totalRounds; r++) {
      matchesByRound[r] = matches.filter(m => m.roundIndex === r);
  }

  for(let r=0; r < totalRounds - 1; r++) {
      const currentRoundMatches = matchesByRound[r];
      const nextRoundMatches = matchesByRound[r+1];
      
      currentRoundMatches.forEach((match, index) => {
          const nextMatchIndex = Math.floor(index / 2);
          if (nextRoundMatches[nextMatchIndex]) {
              match.nextMatchId = nextRoundMatches[nextMatchIndex].id;
          }
      });
  }

  // 5. Propagate Initial Winners (BYEs)
  // Since we set winnerName for BYEs in step 3, we need to push those names to the next round immediately.
  // We can reuse the updateBracketWinner logic logic but applied iteratively.
  // Or simpler: just loop through matches once. Since propagation goes Round 0 -> 1 -> 2, doing it in order works.
  
  for (const match of matches) {
      if (match.winnerName && match.nextMatchId) {
          const nextMatch = matches.find(m => m.id === match.nextMatchId);
          if (nextMatch) {
              if (match.playerIndexInNextMatch === 0) {
                  nextMatch.p1Name = match.winnerName;
              } else {
                  nextMatch.p2Name = match.winnerName;
              }
              
              // Handle potential recursive BYEs (if a player gets a bye in round 1 too)
              // This is rare in standard powers of 2, but good for safety.
              if (nextMatch.p1Name && !nextMatch.p2Name && matchesByRound[nextMatch.roundIndex].length < matchesByRound[0].length / 2) {
                   // This is complex to detect "empty slot" vs "bye slot". 
                   // For now, standard BYEs only happen in Round 0.
                   // If P2 is null because it's waiting for a winner, it's NOT a bye.
                   // So we leave it alone.
              }
          }
      }
  }

  return matches;
};

export const updateBracketWinner = (matches: TournamentMatch[], matchId: string, winnerName: string): TournamentMatch[] => {
  const newMatches = matches.map(m => ({...m})); // Deep copy basic level
  const finishedMatch = newMatches.find(m => m.id === matchId);
  
  if (!finishedMatch) return matches;

  finishedMatch.winnerName = winnerName;

  // Propagate to next match
  if (finishedMatch.nextMatchId) {
    const nextMatch = newMatches.find(m => m.id === finishedMatch.nextMatchId);
    if (nextMatch) {
      if (finishedMatch.playerIndexInNextMatch === 0) {
        nextMatch.p1Name = winnerName;
      } else {
        nextMatch.p2Name = winnerName;
      }
    }
  }

  return newMatches;
};
