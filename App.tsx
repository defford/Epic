import React, { useState, useEffect, useRef } from 'react';
import { BoardState, Player, Position } from './types';
import { createInitialBoard, getHeroPosition, isValidMove, isValidBuild, isValidDestroy, hasValidActions, BOARD_SIZE } from './utils/gameLogic';
import { BoardCell } from './components/BoardCell';
import { MainMenu } from './components/MainMenu';
import { wsService } from './services/websocketService';
import { RefreshCw, Tent, Trophy, MousePointer2 } from 'lucide-react';

const App: React.FC = () => {
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [playerNumber, setPlayerNumber] = useState<Player | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardState>(createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [turnCount, setTurnCount] = useState<number>(1);
  const [winner, setWinner] = useState<Player | null>(null);
  const [skips, setSkips] = useState<{1: boolean, 2: boolean}>({1: false, 2: false});
  const skipsRef = useRef<{1: boolean, 2: boolean}>({1: false, 2: false});

  // Keep ref in sync with state
  useEffect(() => {
    skipsRef.current = skips;
  }, [skips]);

  // Derived state
  const heroPos = getHeroPosition(board, currentPlayer);

  const handleGameStart = (playerNum: Player, gId: string) => {
    setIsMultiplayer(true);
    setPlayerNumber(playerNum);
    setGameId(gId);
  };

  const handleReturnToMenu = () => {
    setIsMultiplayer(false);
    setPlayerNumber(null);
    setGameId(null);
    setBoard(createInitialBoard());
    setCurrentPlayer(1);
    setTurnCount(1);
    setWinner(null);
    setSkips({ 1: false, 2: false });
    wsService.disconnect();
  };

  // WebSocket multiplayer setup
  useEffect(() => {
    if (!isMultiplayer) return;

    const handleGameState = (data: {
      board: BoardState;
      currentPlayer: Player;
      turnCount: number;
      winner: Player | null;
      skips: { 1: boolean; 2: boolean };
    }) => {
      setBoard(data.board);
      setCurrentPlayer(data.currentPlayer);
      setTurnCount(data.turnCount);
      setWinner(data.winner);
      setSkips(data.skips);
    };

    const handleOpponentDisconnected = () => {
      alert('Opponent disconnected. Returning to main menu.');
      handleReturnToMenu();
    };

    wsService.on('GAME_STATE', handleGameState);
    wsService.on('OPPONENT_DISCONNECTED', handleOpponentDisconnected);

    return () => {
      wsService.off('GAME_STATE', handleGameState);
      wsService.off('OPPONENT_DISCONNECTED', handleOpponentDisconnected);
    };
  }, [isMultiplayer]);

  // Handle Turn Skipping Logic (only for local/single-player mode)
  useEffect(() => {
    if (isMultiplayer || winner) return;

    // 1. Check Exhaustion (Prioritized)
    if (skips[currentPlayer]) {
      // Player is exhausted. Skip turn immediately.
      setSkips(prev => ({ ...prev, [currentPlayer]: false }));
      endTurn();
      return;
    }

    // 2. Check No Legal Moves
    // Only check if not already skipping due to exhaustion
    if (!hasValidActions(board, currentPlayer)) {
      // Player has no legal moves. Automatically skip.
      // 500ms delay to make the skip noticeable but fast.
      const timer = setTimeout(() => {
        endTurn();
      }, 500);
      return () => clearTimeout(timer);
    }

  }, [currentPlayer, skips, winner, board, isMultiplayer]);

  // Early return after all hooks
  if (!isMultiplayer) {
    return <MainMenu onGameStart={handleGameStart} />;
  }

  // Left Click: Move Hero
  const handleCellClick = (x: number, y: number) => {
    if (winner || !heroPos || skips[currentPlayer]) return;
    if (isMultiplayer && currentPlayer !== playerNumber) return;

    const targetPos = { x, y };
    
    // Attempt to Move
    if (isValidMove(board, heroPos, targetPos, currentPlayer)) {
      if (isMultiplayer) {
        wsService.send({
          type: 'GAME_ACTION',
          action: {
            type: 'MOVE',
            from: heroPos,
            to: targetPos,
          },
        });
      } else {
        executeMove(targetPos);
      }
    }
  };

  // Right Click: Build or Destroy Camp
  const handleCellContext = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault(); // Prevent default browser context menu
    if (winner || !heroPos || skips[currentPlayer]) return;
    if (isMultiplayer && currentPlayer !== playerNumber) return;

    const targetPos = { x, y };

    // Attempt to Build
    if (isValidBuild(board, heroPos, targetPos)) {
      if (isMultiplayer) {
        wsService.send({
          type: 'GAME_ACTION',
          action: {
            type: 'BUILD',
            position: targetPos,
          },
        });
      } else {
        executeBuild(targetPos);
      }
      return;
    }

    // Attempt to Destroy
    if (isValidDestroy(board, heroPos, targetPos, currentPlayer)) {
      if (isMultiplayer) {
        wsService.send({
          type: 'GAME_ACTION',
          action: {
            type: 'DESTROY',
            position: targetPos,
          },
        });
      } else {
        executeDestroy(targetPos);
      }
      return;
    }
  };

  const executeMove = (to: Position) => {
    if (!heroPos) return;
    
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    
    // Clear old position
    newBoard[heroPos.y][heroPos.x].heroOwner = null;
    // Set new position
    newBoard[to.y][to.x].heroOwner = currentPlayer;

    setBoard(newBoard);
    checkWinAndEndTurn(newBoard, to);
  };

  const executeBuild = (at: Position) => {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    newBoard[at.y][at.x].campOwner = currentPlayer;
    
    setBoard(newBoard);
    
    // Mark current player as exhausted for their NEXT turn
    setSkips(prev => ({ ...prev, [currentPlayer]: true }));
    
    endTurn();
  };

  const executeDestroy = (at: Position) => {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    newBoard[at.y][at.x].campOwner = null; // Remove the camp
    
    setBoard(newBoard);
    // Destruction does not cause exhaustion, just ends the turn.
    endTurn();
  };

  const checkWinAndEndTurn = (newBoard: BoardState, currentPos: Position) => {
     // Check Win
    const enemyPlayer = currentPlayer === 1 ? 2 : 1;
    const enemyPos = getHeroPosition(newBoard, enemyPlayer);
    
    let isWin = false;
    if (enemyPos) {
       const dx = Math.abs(currentPos.x - enemyPos.x);
       const dy = Math.abs(currentPos.y - enemyPos.y);
       if (dx <= 1 && dy <= 1 && !(dx===0 && dy===0)) {
         isWin = true;
       }
    }

    if (isWin) {
      setWinner(currentPlayer);
    } else {
      endTurn();
    }
  }

  const endTurn = () => {
    // Switch to next player
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    setCurrentPlayer(nextPlayer);
    setTurnCount(prev => prev + 1);
    
    // Check if the next player should be skipped (matching server behavior)
    // Use setTimeout to allow state to settle, then check skip flag
    setTimeout(() => {
      // Check the current skip state via ref to avoid stale closure
      if (skipsRef.current[nextPlayer]) {
        // Clear the skip flag and skip their turn by calling endTurn again
        setSkips(prev => ({ ...prev, [nextPlayer]: false }));
        // Recursively skip to the next player
        const nextNextPlayer = nextPlayer === 1 ? 2 : 1;
        setCurrentPlayer(nextNextPlayer);
        setTurnCount(prev => prev + 1);
      }
    }, 100);
  };

  const resetGame = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer(1);
    setTurnCount(1);
    setWinner(null);
    setSkips({1: false, 2: false});
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex flex-col items-center select-none">
      
      {/* Header */}
      <div className="max-w-4xl w-full flex flex-col items-center mb-8 text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
          <Tent className="w-10 h-10 text-orange-600" />
          Camp Connect
        </h1>
        <p className="text-slate-600 max-w-xl">
          Build camps to extend your supply lines. Move your Hero to capture the enemy. 
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start justify-center w-full max-w-6xl">
        
        {/* Game Board Section */}
        <div className="flex flex-col items-center gap-6 relative">
          
          {/* Status Bar */}
          <div className="flex items-center justify-between w-full max-w-md bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className={`flex items-center gap-2 ${currentPlayer === 1 ? 'font-bold text-red-600' : 'text-slate-400'}`}>
              <div className="w-3 h-3 rounded-full bg-red-500"></div> Player 1
              {isMultiplayer && playerNumber === 1 && <span className="text-xs text-slate-500">(You)</span>}
            </div>
            <div className="font-mono text-slate-500 text-sm bg-slate-100 px-3 py-1 rounded-full">
              Turn {turnCount}
            </div>
            <div className={`flex items-center gap-2 ${currentPlayer === 2 ? 'font-bold text-blue-600' : 'text-slate-400'}`}>
              {isMultiplayer && playerNumber === 2 && <span className="text-xs text-slate-500">(You)</span>}
              Player 2 <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            </div>
          </div>
          {isMultiplayer && currentPlayer !== playerNumber && (
            <div className="text-center text-slate-600 text-sm font-medium bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
              Waiting for opponent's turn...
            </div>
          )}

          {/* Grid */}
          <div className={`bg-white p-2 rounded-lg shadow-xl border-4 border-slate-200 transition-opacity duration-300 ${skips[currentPlayer] || (isMultiplayer && currentPlayer !== playerNumber) ? 'opacity-50 pointer-events-none' : ''}`}>
            <div 
              className="grid gap-0.5 bg-slate-300" 
              style={{ 
                gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                width: 'min(90vw, 500px)',
                height: 'min(90vw, 500px)'
              }}
            >
              {board.map((row, y) => (
                row.map((cell, x) => (
                  <BoardCell 
                    key={`${x}-${y}`} 
                    cell={cell}
                    isCurrentPlayerHero={cell.heroOwner === currentPlayer}
                    isValidMoveTarget={
                      !!heroPos && isValidMove(board, heroPos, {x, y}, currentPlayer) && !skips[currentPlayer]
                    }
                    isValidBuildTarget={
                       !!heroPos && isValidBuild(board, heroPos, {x, y}) && !skips[currentPlayer]
                    }
                    isValidDestroyTarget={
                        !!heroPos && isValidDestroy(board, heroPos, {x, y}, currentPlayer) && !skips[currentPlayer]
                    }
                    isExhausted={cell.heroOwner !== null && skips[cell.heroOwner]}
                    onClick={() => handleCellClick(x, y)}
                    onContextMenu={(e) => handleCellContext(e, x, y)}
                  />
                ))
              ))}
            </div>
          </div>

          {/* Helper Text for Interaction */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm font-medium text-slate-600 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 items-center">
             <div className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 fill-slate-400 text-slate-400" />
                <span>Left-click: <span className="text-indigo-600 font-bold">Move Hero</span></span>
             </div>
             <div className="hidden sm:block w-px h-5 bg-slate-300"></div>
             <div className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 fill-orange-400 text-orange-400" />
                <span>Right-click: <span className="text-orange-600 font-bold">Build</span> / <span className="text-red-600 font-bold">Destroy</span></span>
             </div>
          </div>

          {/* Winner Overlay / Reset */}
          {winner && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center transform scale-110">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                  Player {winner} Wins!
                </h2>
                <p className="text-slate-600 mb-6">
                  Great strategy! The enemy hero has been captured.
                </p>
                <button 
                  onClick={isMultiplayer ? handleReturnToMenu : resetGame}
                  className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  {isMultiplayer ? 'Return to Menu' : 'Play Again'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Rules of Engagement</h3>
               <ul className="text-sm text-slate-600 space-y-3">
                 <li className="flex gap-2">
                    <span className="font-bold text-indigo-600 shrink-0">1.</span>
                    <span><span className="font-semibold text-slate-800">Goal:</span> Move your Hero adjacent to the enemy Hero to capture them.</span>
                 </li>
                 <li className="flex gap-2">
                    <span className="font-bold text-indigo-600 shrink-0">2.</span>
                    <span><span className="font-semibold text-slate-800">Movement:</span> You can move 1 square if you are currently connected to (adjacent or on) a Camp. You <span className="text-red-600 font-medium">cannot move onto</span> a square that already has a Camp.</span>
                 </li>
                 <li className="flex gap-2">
                    <span className="font-bold text-indigo-600 shrink-0">3.</span>
                    <span><span className="font-semibold text-slate-800">Building:</span> Right-click an empty adjacent square to build a new Camp. This <span className="text-red-600 font-bold">skips your next turn</span>.</span>
                 </li>
                 <li className="flex gap-2">
                    <span className="font-bold text-indigo-600 shrink-0">4.</span>
                    <span><span className="font-semibold text-slate-800">Destroying:</span> Right-click an adjacent <span className="text-red-600 font-bold">enemy camp</span> to destroy it. This takes a turn but does not skip the next one.</span>
                 </li>
               </ul>
            </div>

            {/* Debug Reset (if no winner yet) */}
            {!winner && !isMultiplayer && (
              <button 
                onClick={resetGame}
                className="mt-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-sm transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" /> Reset Game
              </button>
            )}
            {isMultiplayer && (
              <button 
                onClick={handleReturnToMenu}
                className="mt-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 text-sm transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" /> Leave Game
              </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default App;