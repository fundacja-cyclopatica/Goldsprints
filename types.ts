export enum AppMode {
  SETUP = 'SETUP',
  BRACKET = 'BRACKET',
  RACE = 'RACE',
}

export enum RaceStatus {
  IDLE = 'IDLE',
  COUNTDOWN = 'COUNTDOWN',
  RACING = 'RACING',
  FINISHED = 'FINISHED',
  FALSE_START = 'FALSE_START',
}

export interface Player {
  id: 1 | 2;
  name: string;
  color: string;
  keys: string[]; // Keys to press to move
  distance: number; // Current distance in meters
  speed: number; // Current speed in km/h
  finished: boolean;
  finishTime: number | null; // Time in seconds
  strokes: number; // Number of key presses
  warnings: number; // Number of false starts
}

export interface TournamentPlayer {
  id: string;
  name: string;
  gender: 'M' | 'F';
}

export interface RaceSettings {
  targetDistance: number; // in meters
  difficulty: number; // Meters per keystroke (higher is easier)
}

export interface RaceResult {
  winnerName: string;
  winnerTime: number;
  gap: number; // seconds between winner and loser
  avgSpeedP1: number;
  avgSpeedP2: number;
}

// Tournament Types
export interface TournamentMatch {
  id: string;
  roundIndex: number; // 0 = finals, 1 = semis, 2 = quarters... (counting from end is easier for logic, but visual usually goes 0->N)
  roundName: string;
  p1Name: string | null;
  p2Name: string | null;
  winnerName: string | null;
  nextMatchId: string | null; // ID of the match the winner goes to
  playerIndexInNextMatch: 0 | 1 | null; // Does winner become P1 or P2 in next match
}

export interface TournamentState {
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentMatchId: string | null;
  rounds: number; // Total rounds
}
