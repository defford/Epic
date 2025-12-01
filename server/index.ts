import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createInitialBoard, getHeroPosition, isValidMove, isValidBuild, isValidDestroy } from '../utils/gameLogic.js';
import { BoardState, Player } from '../types.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

interface Client {
  ws: WebSocket;
  playerId: string;
  gameId?: string;
  playerNumber?: Player;
}

interface GameInstance {
  id: string;
  player1: Client;
  player2: Client;
  board: BoardState;
  currentPlayer: Player;
  turnCount: number;
  winner: Player | null;
  skips: { 1: boolean; 2: boolean };
}

const clients = new Map<string, Client>();
const matchingPool: Client[] = [];
const games = new Map<string, GameInstance>();

function generateGameId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createGame(player1: Client, player2: Client): GameInstance {
  const gameId = generateGameId();
  const game: GameInstance = {
    id: gameId,
    player1,
    player2,
    board: createInitialBoard(),
    currentPlayer: 1,
    turnCount: 1,
    winner: null,
    skips: { 1: false, 2: false },
  };

  player1.gameId = gameId;
  player1.playerNumber = 1;
  player2.gameId = gameId;
  player2.playerNumber = 2;

  games.set(gameId, game);
  return game;
}

function broadcastGameState(game: GameInstance) {
  const gameState = {
    type: 'GAME_STATE',
    gameId: game.id,
    board: game.board,
    currentPlayer: game.currentPlayer,
    turnCount: game.turnCount,
    winner: game.winner,
    skips: game.skips,
  };

  [game.player1, game.player2].forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        ...gameState,
        yourPlayerNumber: client.playerNumber,
      }));
    }
  });
}

function handleMatchmaking(client: Client) {
  if (matchingPool.length === 0) {
    matchingPool.push(client);
    client.ws.send(JSON.stringify({
      type: 'MATCHING',
      message: 'Searching for opponent...',
    }));
  } else {
    const opponent = matchingPool.shift()!;
    const game = createGame(opponent, client);

    opponent.ws.send(JSON.stringify({
      type: 'MATCHED',
      gameId: game.id,
      playerNumber: 1,
    }));

    client.ws.send(JSON.stringify({
      type: 'MATCHED',
      gameId: game.id,
      playerNumber: 2,
    }));

    setTimeout(() => {
      broadcastGameState(game);
    }, 100);
  }
}

function handleGameAction(game: GameInstance, client: Client, action: any) {
  if (game.winner) return;
  if (game.currentPlayer !== client.playerNumber) return;
  if (game.skips[game.currentPlayer]) return;

  const heroPos = getHeroPosition(game.board, game.currentPlayer);
  if (!heroPos) return;

  if (action.type === 'MOVE') {
    const { from, to } = action;
    if (!isValidMove(game.board, from, to, game.currentPlayer)) {
      return;
    }
    const newBoard = game.board.map(row => row.map(cell => ({ ...cell })));
    newBoard[from.y][from.x].heroOwner = null;
    newBoard[to.y][to.x].heroOwner = game.currentPlayer;
    game.board = newBoard;
    checkWinAndEndTurn(game, to);
  } else if (action.type === 'BUILD') {
    const { position } = action;
    if (!isValidBuild(game.board, heroPos, position)) {
      return;
    }
    const newBoard = game.board.map(row => row.map(cell => ({ ...cell })));
    newBoard[position.y][position.x].campOwner = game.currentPlayer;
    game.board = newBoard;
    game.skips[game.currentPlayer] = true;
    endTurn(game);
  } else if (action.type === 'DESTROY') {
    const { position } = action;
    if (!isValidDestroy(game.board, heroPos, position, game.currentPlayer)) {
      return;
    }
    const newBoard = game.board.map(row => row.map(cell => ({ ...cell })));
    newBoard[position.y][position.x].campOwner = null;
    game.board = newBoard;
    endTurn(game);
  }

  broadcastGameState(game);
}

function checkWinAndEndTurn(game: GameInstance, currentPos: { x: number; y: number }) {
  const enemyPlayer = game.currentPlayer === 1 ? 2 : 1;
  const enemyPos = getHeroPosition(game.board, enemyPlayer);

  if (enemyPos) {
    const dx = Math.abs(currentPos.x - enemyPos.x);
    const dy = Math.abs(currentPos.y - enemyPos.y);
    if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
      game.winner = game.currentPlayer;
    }
  }

  if (!game.winner) {
    endTurn(game);
  }
}

function endTurn(game: GameInstance) {
  if (game.skips[game.currentPlayer]) {
    game.skips[game.currentPlayer] = false;
  }
  game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
  game.turnCount += 1;
  
  setTimeout(() => {
    if (game.skips[game.currentPlayer]) {
      endTurn(game);
      broadcastGameState(game);
    }
  }, 100);
}


wss.on('connection', (ws: WebSocket) => {
  const playerId = generatePlayerId();
  const client: Client = { ws, playerId };
  clients.set(playerId, client);

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'SEARCH_GAME') {
        handleMatchmaking(client);
      } else if (data.type === 'GAME_ACTION' && client.gameId) {
        const game = games.get(client.gameId);
        if (game) {
          handleGameAction(game, client, data.action);
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(playerId);
    const poolIndex = matchingPool.indexOf(client);
    if (poolIndex !== -1) {
      matchingPool.splice(poolIndex, 1);
    }
    if (client.gameId) {
      const game = games.get(client.gameId);
      if (game) {
        const otherPlayer = game.player1 === client ? game.player2 : game.player1;
        if (otherPlayer.ws.readyState === WebSocket.OPEN) {
          otherPlayer.ws.send(JSON.stringify({
            type: 'OPPONENT_DISCONNECTED',
          }));
        }
        games.delete(client.gameId);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

