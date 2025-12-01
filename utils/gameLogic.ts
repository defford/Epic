import { BoardState, Player, Position } from '../types';

export const BOARD_SIZE = 8;

export const createInitialBoard = (): BoardState => {
  const board: BoardState = Array(BOARD_SIZE).fill(null).map((_, y) =>
    Array(BOARD_SIZE).fill(null).map((_, x) => ({
      x,
      y,
      campOwner: null,
      heroOwner: null,
    }))
  );

  // Player 1 starts Top-Left (0,0)
  board[0][0].heroOwner = 1;
  board[0][0].campOwner = 1; // Start with a base camp

  // Player 2 starts Bottom-Right (7,7)
  board[7][7].heroOwner = 2;
  board[7][7].campOwner = 2; // Start with a base camp

  return board;
};

export const getHeroPosition = (board: BoardState, player: Player): Position | null => {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x].heroOwner === player) {
        return { x, y };
      }
    }
  }
  return null;
};

export const isAdjacent = (p1: Position, p2: Position): boolean => {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);
  return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
};

export const isConnectedToCamp = (board: BoardState, pos: Position, player: Player): boolean => {
  // Check self
  if (board[pos.y][pos.x].campOwner === player) return true;

  // Check neighbors
  const neighbors = [
    { x: pos.x - 1, y: pos.y },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x - 1, y: pos.y - 1 },
    { x: pos.x + 1, y: pos.y - 1 },
    { x: pos.x - 1, y: pos.y + 1 },
    { x: pos.x + 1, y: pos.y + 1 },
  ];

  return neighbors.some(n => 
    n.x >= 0 && n.x < BOARD_SIZE && 
    n.y >= 0 && n.y < BOARD_SIZE && 
    board[n.y][n.x].campOwner === player
  );
};

export const isValidMove = (board: BoardState, from: Position, to: Position, player: Player): boolean => {
  // Must be adjacent destination
  if (!isAdjacent(from, to)) return false;

  // Destination must not have own hero (redundant but safe)
  if (board[to.y][to.x].heroOwner === player) return false;

  // KEY RULE: Cannot move onto a camp square (Own or Enemy)
  if (board[to.y][to.x].campOwner !== null) return false;

  // KEY RULE: To move, the HERO must be connected to a Camp at their CURRENT location.
  // "This piece moves 1 square at a time in any direction so long as they're connected to a Camp piece."
  if (!isConnectedToCamp(board, from, player)) return false;

  return true;
};

export const isValidBuild = (board: BoardState, from: Position, to: Position): boolean => {
  // Must be adjacent
  if (!isAdjacent(from, to)) return false;

  // Target must be empty of Camps
  if (board[to.y][to.x].campOwner !== null) return false;

  // Target must be empty of Heroes
  if (board[to.y][to.x].heroOwner !== null) return false;

  return true;
};

export const isValidDestroy = (board: BoardState, from: Position, to: Position, currentPlayer: Player): boolean => {
  // Must be adjacent
  if (!isAdjacent(from, to)) return false;

  // Target must be a camp owned by the opponent
  const cell = board[to.y][to.x];
  if (cell.campOwner !== null && cell.campOwner !== currentPlayer) {
    return true;
  }

  return false;
};

export const hasValidActions = (board: BoardState, player: Player): boolean => {
  const heroPos = getHeroPosition(board, player);
  if (!heroPos) return false;

  const { x, y } = heroPos;
  const neighbors = [
    { x: x - 1, y: y - 1 }, { x, y: y - 1 }, { x: x + 1, y: y - 1 },
    { x: x - 1, y },                     { x: x + 1, y },
    { x: x - 1, y: y + 1 }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }
  ];

  return neighbors.some(n => {
    // Check bounds
    if (n.x < 0 || n.x >= BOARD_SIZE || n.y < 0 || n.y >= BOARD_SIZE) return false;

    // Check if any action is possible
    if (isValidMove(board, heroPos, n, player)) return true;
    if (isValidBuild(board, heroPos, n)) return true;
    if (isValidDestroy(board, heroPos, n, player)) return true;

    return false;
  });
};

export const checkWinCondition = (board: BoardState, currentPlayer: Player): boolean => {
  // If the current player's hero is adjacent to the enemy hero, they win.
  const myPos = getHeroPosition(board, currentPlayer);
  if (!myPos) return false;

  const enemyPlayer = currentPlayer === 1 ? 2 : 1;
  const enemyPos = getHeroPosition(board, enemyPlayer);
  if (!enemyPos) return false; // Should not happen

  return isAdjacent(myPos, enemyPos);
};