export type Player = 1 | 2;

export interface Position {
  x: number;
  y: number;
}

export interface CellState {
  x: number;
  y: number;
  campOwner: Player | null; // Who owns the camp on this cell, if any
  heroOwner: Player | null; // Who has a hero on this cell, if any
}

export type BoardState = CellState[][];

export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  winner: Player | null;
  turnCount: number;
  // Track last action to force variety or just for info?
  // We'll keep it simple for now.
}

export type GameAction = 'MOVE' | 'BUILD';